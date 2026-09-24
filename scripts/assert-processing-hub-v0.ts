/**
 * Processing hub v0. Same file_id as /start. Loud matches pad.
 * Send foxLine keeps in_queue + Ask Fox · Upload more · Request human.
 * Silent notes stay off the borrower thread. Just me / finish stay locked.
 */
import assert from "node:assert/strict";
import { emptyDraft, ensureFileId } from "../components/fox/store";
import { canLooksRight, isLooksRightAskText } from "../components/fox/completeness";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import {
  applyLooksRightMotion,
  applyProceedMotion,
  applyReturnToFoxMotion,
  finishLineActions,
  MOTION_COPY,
} from "../components/fox/motion";
import { withLinkedAccount } from "../components/fox/account";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { borrowersFileValue, writeWhoOnLoan } from "../components/fox/whoOnLoan";
import {
  helocQuoteFromDraft,
  withHelocToolQuote,
  writeFirstLien,
  writeHelocLine,
} from "../components/fox/heloc";
import {
  deskStripActions,
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import {
  applyStaffDeskSend,
  COMPLETENESS_SIGNAL_COPY,
  CREDIT_STATED_NOTE,
  hubHasForbidden,
  hubLoudText,
  nextBorrowerLine,
  processingHubView,
  SILENT_DESK_ERROR,
  staffDeskKeepsFinishChips,
  staffHubPath,
  staffNoteEvents,
  STAFF_HUB_PATH,
  STAFF_W2_FOX_LINE,
} from "../components/fox/processingHub";
import { calculateHelocQuote } from "../lib/calculateHelocQuote";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function afterPrimary(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "heloc",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  };
}

function houseReady(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectCity: "San Francisco",
    subjectState: "CA",
  };
}

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function fact(draft: FoxIntakeDraft, id: string) {
  return previewFacts(draft).find((item) => item.id === id || item.label === id);
}

function heloc50040050(): FoxIntakeDraft {
  return houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
  );
}

function justMeSkipProceed(file: FoxIntakeDraft): FoxIntakeDraft {
  let draft = applyCouponChoice(withHelocToolQuote(file), "this");
  draft = {
    ...draft,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
  };
  draft = writeWhoOnLoan(draft, "just-me");
  draft = skipMonthlyDebts(draft);
  draft = skipWageDocs(draft);
  draft = skipCurrentInvite(draft);
  const afterLooks = applyLooksRightMotion(draft);
  return applyProceedMotion(withLinkedAccount(afterLooks));
}

function main() {
  const file = heloc50040050();
  const tool = calculateHelocQuote({
    homeValue: 500_000,
    currentMortgage: 400_000,
    desiredLine: 50_000,
    fico: 760,
    occupancy: "Primary",
  });
  assert.equal(file.productIntent, "heloc");
  assert.equal(helocQuoteFromDraft(file)?.finalRate, tool.finalRate);
  assert.equal(tool.monthlyPayment, 367);

  const gate = applyCouponChoice(withHelocToolQuote(file), "this");
  const justMeGate = writeWhoOnLoan(
    {
      ...gate,
      incomeAsked: true,
      incomeType: { ...emptyDraft().incomeType, value: "w2" },
    },
    "just-me",
  );
  assert.equal(borrowersFileValue(justMeGate), "1");
  assert.doesNotMatch(JSON.stringify(justMeGate), /Ying/);

  const ready = skipCurrentInvite(skipWageDocs(skipMonthlyDebts(justMeGate)));
  assert.equal(workspacePrompt(ready), "review");
  assert.ok(isLooksRightAskText(nextFoxAsk(ready).text));
  assert.equal(canLooksRight(ready), true);
  const afterLooks = withLinkedAccount(applyLooksRightMotion(ready));
  const proceed = workspaceReply("Proceed", afterLooks);
  assert.match(proceed?.text ?? "", /ONYX has this for review/);
  assert.deepEqual(labels(proceed?.actions).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(proceed?.actions).at(-1), "Request human");

  const queued = ensureFileId(justMeSkipProceed(file));
  assert.equal(queued.motion, "in_queue");
  assert.equal(queued.nextActor, "ONYX");
  assert.ok(queued.fileId);
  assert.equal(fact(queued, "line")?.value, "$50,000");
  assert.equal(queued.liveQuote?.interestOnly, tool.monthlyPayment);
  assert.equal(borrowersFileValue(queued), "1");
  assert.equal(fact(queued, "borrowers")?.value, "1");
  assert.equal(fact(queued, "credit")?.value, "760+");
  assert.equal(fact(queued, "credit")?.note, CREDIT_STATED_NOTE);

  const hub = processingHubView(queued);
  assert.equal(hub.fileId, queued.fileId);
  assert.equal(hub.path, staffHubPath(queued.fileId));
  assert.match(hub.path, new RegExp(`^${STAFF_HUB_PATH}\\?file=`));
  assert.equal(hub.drawerOpen, false);
  const loud = hubLoudText(queued);
  const padLine = fact(queued, "line")?.value;
  const padRate = fact(queued, "rate")?.value ?? "";
  const padCltv = fact(queued, "cltv")?.value ?? "";
  const padBorrowers = fact(queued, "borrowers")?.value;
  const padCredit = fact(queued, "credit");
  assert.equal(hub.grid.find((row) => row.id === "line")?.label, "Line");
  assert.equal(hub.loud.find((row) => row.id === "line")?.value, padLine);
  assert.equal(hub.grid.find((row) => row.id === "rate")?.label, "Rate");
  assert.match(hub.loud.find((row) => row.id === "rate")?.value ?? "", /%/);
  assert.match(padRate, /%/);
  assert.equal(hub.loud.find((row) => row.id === "cltv")?.label, "CLTV");
  assert.equal(hub.loud.find((row) => row.id === "cltv")?.value, padCltv);
  assert.equal(hub.grid.find((row) => row.id === "borrowers")?.label, "Borrowers");
  assert.equal(hub.grid.find((row) => row.id === "borrowers")?.value, padBorrowers);
  assert.equal(hub.loud.find((row) => row.id === "credit")?.label, "FICO");
  assert.equal(hub.loud.find((row) => row.id === "credit")?.value, padCredit?.value);
  assert.equal(hub.loud.find((row) => row.id === "credit")?.note, CREDIT_STATED_NOTE);
  assert.equal(hub.loud.find((row) => row.id === "io")?.value, `$${tool.monthlyPayment.toLocaleString("en-US")}`);
  assert.match(loud, /\$50,000/);
  assert.match(loud, /\$367/);
  assert.match(loud, /90/);
  assert.match(hub.grid.map((row) => `${row.label} ${row.value}`).join(" · "), /Borrowers 1/);
  assert.match(loud, /760\+/);
  assert.match(loud, /Stated/);
  assert.equal(hub.state.status, "in_queue");
  assert.equal(hub.state.next, "ONYX");
  assert.equal(hub.state.completeness, COMPLETENESS_SIGNAL_COPY);
  assert.equal(hubHasForbidden(JSON.stringify(hub)), false);
  assert.doesNotMatch(JSON.stringify(hub), /SSN|BNTouch|LO will contact you|green approved|credit pull/i);

  const blocked = applyStaffDeskSend(queued, { condition: "W-2", silentNote: "internal only" });
  assert.equal(blocked.threadLine, "");
  assert.equal(blocked.error, SILENT_DESK_ERROR);
  assert.equal(blocked.draft.motion, "in_queue");

  const sent = applyStaffDeskSend(queued, {
    foxLine: STAFF_W2_FOX_LINE,
    condition: "Prior-year W-2",
    silentNote: "internal: thin file, do not speak",
  });
  assert.equal(sent.error, undefined);
  assert.equal(sent.threadLine, STAFF_W2_FOX_LINE);
  assert.equal(sent.draft.motion, "in_queue");
  assert.equal(sent.draft.nextActor, "ONYX");
  assert.equal(sent.draft.fileId, queued.fileId);
  assert.ok(staffDeskKeepsFinishChips(sent.draft));
  assert.deepEqual(labels(finishLineActions(sent.draft)).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(finishLineActions(sent.draft)).at(-1), "Request human");
  assert.ok(sent.draft.conditions?.some((item) => item.title === "Prior-year W-2" && item.stillUseful === false));
  assert.ok(staffNoteEvents(sent.draft).some((item) => /internal: thin file/.test(item.text)));
  assert.doesNotMatch(sent.threadLine, /internal: thin file/);

  const afterProceedThread: FoxMessage[] = [
    { id: "fox-queue", role: "fox", text: MOTION_COPY.in_queue },
    nextBorrowerLine([{ id: "fox-queue", role: "fox", text: MOTION_COPY.in_queue }], sent.threadLine),
  ];
  assert.equal(afterProceedThread.at(-1)?.text, STAFF_W2_FOX_LINE);
  assert.deepEqual(labels(deskStripActions(afterProceedThread, sent.draft)).slice(0, 2), [
    "Ask Fox",
    "Upload more",
  ]);
  assert.equal(labels(deskStripActions(afterProceedThread, sent.draft)).at(-1), "Request human");

  const closed = applyReturnToFoxMotion(queued, { foxLine: STAFF_W2_FOX_LINE });
  assert.notEqual(closed.draft.motion, "in_queue");
  assert.ok(
    (closed.draft.workItems ?? []).some((item) => item.state === "done"),
    "Return to Fox closes review — hub Send must not use it",
  );
  assert.equal(
    (sent.draft.workItems ?? []).some((item) => item.kind === "review" && (item.state === "open" || item.state === "nudged")),
    (queued.workItems ?? []).some((item) => item.kind === "review" && (item.state === "open" || item.state === "nudged")),
  );

  console.log(
    `assert-processing-hub-v0: hub ${staffHubPath(queued.fileId)} loud $50,000 / $367 / 90% / Borrowers 1 / 760+ Stated; Send keeps Ask Fox · Upload more · Request human`,
  );
}

main();
