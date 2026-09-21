/**
 * HELOC finish chips after Looks right / Proceed. Composer is never empty.
 * 500/400/50 → This one → W-2 skip path → Looks right strip → Proceed Ask Fox strip.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { canLooksRight, isLooksRightAskText } from "../components/fox/completeness";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import {
  applyLooksRightMotion,
  applyProceedMotion,
  finishLineActions,
  MOTION_COPY,
} from "../components/fox/motion";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
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
import type { FoxMessage } from "../components/fox/types";
import { calculateHelocQuote } from "../lib/calculateHelocQuote";
import type { FoxIntakeDraft } from "../components/fox/types";

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

function afterThisOneWageSkip(file: FoxIntakeDraft): FoxIntakeDraft {
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
  return draft;
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
  assert.equal(file.loanAmountValue, 50_000);
  assert.equal(helocQuoteFromDraft(file)?.finalRate, tool.finalRate);
  const quoteAsk = nextFoxAsk(file);
  assert.match(quoteAsk.text, /This HELOC right now:/);
  assert.deepEqual(labels(quoteAsk.actions), ["This one"]);

  const gate = afterThisOneWageSkip(file);
  assert.equal(gate.productIntent, "heloc");
  assert.equal(gate.loanAmountValue, 50_000);
  assert.equal(workspacePrompt(gate), "review");
  assert.ok(isLooksRightAskText(nextFoxAsk(gate).text), `gate — ${nextFoxAsk(gate).text}`);
  assert.ok((nextFoxAsk(gate).text ?? "").trim(), "Looks right gate cannot be empty");
  assert.deepEqual(labels(nextFoxAsk(gate).actions), ["Looks right", "Needs a correction"]);
  assert.equal(canLooksRight(gate), true);

  const chip = workspaceReply("Looks right", gate);
  assert.ok((chip?.text ?? "").trim(), "Looks right cannot leave an empty composer");
  assert.match(chip?.text ?? "", /I can send this to review/);
  assert.deepEqual(labels(chip?.actions).slice(0, 3), ["Proceed", "Not yet", "Upload more"]);
  assert.equal(labels(chip?.actions).at(-1), "Request human");

  const afterLooks = applyLooksRightMotion(gate);
  assert.equal(afterLooks.sampleAccepted, true);
  assert.ok((nextFoxAsk(afterLooks).text ?? "").trim());
  assert.match(nextFoxAsk(afterLooks).text, /I can send this to review/);
  assert.deepEqual(labels(nextFoxAsk(afterLooks).actions).slice(0, 3), ["Proceed", "Not yet", "Upload more"]);
  assert.equal(labels(finishLineActions(afterLooks)).at(-1), "Request human");

  const typedLooks = workspaceReply("looks right", gate);
  assert.ok((typedLooks?.text ?? "").trim(), "typed looks right cannot empty the composer");
  assert.deepEqual(labels(typedLooks?.actions).slice(0, 3), labels(chip?.actions).slice(0, 3));

  const proceed = workspaceReply("Proceed", afterLooks);
  assert.match(proceed?.text ?? "", /ONYX has this for review/);
  assert.deepEqual(labels(proceed?.actions).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(proceed?.actions).at(-1), "Request human");

  const queued = applyProceedMotion(afterLooks);
  assert.equal(queued.motion, "in_queue");
  assert.equal(queued.nextActor, "ONYX");
  assert.deepEqual(labels(nextFoxAsk(queued).actions).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(nextFoxAsk(queued).actions).at(-1), "Request human");

  const typedProceed = workspaceReply("proceed", afterLooks);
  assert.deepEqual(labels(typedProceed?.actions), labels(proceed?.actions));
  assert.ok((typedProceed?.text ?? "").trim());

  const gateThread: FoxMessage[] = [{ id: "gate", role: "fox", text: nextFoxAsk(gate).text }];
  assert.deepEqual(labels(deskStripActions(gateThread, gate)), ["Looks right", "Needs a correction"]);
  assert.ok(gateThread[0]?.text?.trim(), "Looks right gate speech cannot be empty");

  const afterLooksThread: FoxMessage[] = [
    { id: "client-looks", role: "client", text: "Looks right" },
    { id: "fox-finish", role: "fox", text: nextFoxAsk(afterLooks).text },
  ];
  assert.deepEqual(labels(deskStripActions(afterLooksThread, afterLooks)).slice(0, 3), [
    "Proceed",
    "Not yet",
    "Upload more",
  ]);
  assert.equal(labels(deskStripActions(afterLooksThread, afterLooks)).at(-1), "Request human");

  const swallowedLooks: FoxMessage[] = [
    { id: "gate", role: "fox", text: nextFoxAsk(gate).text },
    { id: "client-looks", role: "client", text: "Looks right" },
  ];
  assert.deepEqual(
    labels(deskStripActions(swallowedLooks, afterLooks)).slice(0, 3),
    ["Proceed", "Not yet", "Upload more"],
    "typed Looks right cannot leave an empty strip",
  );

  const afterProceedThread: FoxMessage[] = [
    { id: "client-proceed", role: "client", text: "Proceed" },
    { id: "fox-queue", role: "fox", text: MOTION_COPY.in_queue },
  ];
  assert.deepEqual(labels(deskStripActions(afterProceedThread, queued)).slice(0, 2), [
    "Ask Fox",
    "Upload more",
  ]);
  assert.equal(labels(deskStripActions(afterProceedThread, queued)).at(-1), "Request human");

  const swallowedProceed: FoxMessage[] = [
    { id: "fox-finish", role: "fox", text: nextFoxAsk(afterLooks).text },
    { id: "client-proceed", role: "client", text: "proceed" },
  ];
  assert.deepEqual(
    labels(deskStripActions(swallowedProceed, queued)).slice(0, 2),
    ["Ask Fox", "Upload more"],
    "typed proceed cannot swallow Ask Fox",
  );

  assert.equal(fact(queued, "line")?.value, "$50,000");
  assert.equal(fact(queued, "product")?.value, "HELOC");
  assert.equal(fact(queued, "status")?.value, "in_queue");
  assert.equal(fact(queued, "next")?.value, "ONYX");
  assert.equal(queued.liveQuote?.interestOnly, tool.monthlyPayment);

  console.log(
    `assert-heloc-finish-chips: Looks right → Proceed · Not yet · Upload more; Proceed → Ask Fox · Upload more · Request human; line $50,000 / $${tool.monthlyPayment}`,
  );
}

main();
