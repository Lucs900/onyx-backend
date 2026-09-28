/**
 * 64 — Ask Fox reads this File.
 * Mirror of 38f1b63c: signed-in HELOC 500/400/50, in_queue, Still useful, staff W-2 foxLine.
 * Do not write 38f1b63c or afdb0ecf. Never the Proceed / in_queue mantra.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import {
  applyLooksRightMotion,
  applyProceedMotion,
  finishLineActions,
  MOTION_COPY,
} from "../components/fox/motion";
import { skipCurrentInvite, stillUsefulSpokenItems } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writeFirstLien, writeHelocLine, withHelocToolQuote } from "../components/fox/heloc";
import {
  isAskFoxFreeQuestion,
  workspaceAskFoxFileReply,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import {
  applyAccountCreated,
  applyAccountLetterOpened,
} from "../components/fox/account";
import {
  ASK_FOX_NO_APPROVAL_LINE,
  ASK_FOX_NO_CLOSE_LINE,
  ASK_FOX_W2_OPEN_LINE,
  answerAskFoxFromFile,
  askFoxAnswerIsClean,
  lastStaffFoxLine,
  openPapersOnFile,
} from "../components/fox/askFoxFile";
import { applyStaffDeskSend, STAFF_W2_FOX_LINE } from "../components/fox/processingHub";
import type { FoxIntakeDraft, ReceivedDoc } from "../components/fox/types";

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function helocLooks(): FoxIntakeDraft {
  let draft = {
    ...emptyDraft(),
    path: "acr" as const,
    productIntent: "heloc" as const,
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    propertyType: "sfr" as const,
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectCity: "San Francisco",
    subjectState: "CA",
    fileId: "file_64_mirror",
  };
  draft = writeHelocLine(writeFirstLien(writePurchasePrice(draft, 500_000), 400_000), 50_000);
  draft = applyCouponChoice(withHelocToolQuote(draft), "this");
  draft = { ...draft, incomeAsked: true, incomeType: { ...emptyDraft().incomeType, value: "w2" } };
  draft = writeWhoOnLoan(draft, "just-me");
  draft = skipMonthlyDebts(draft);
  draft = skipWageDocs(draft);
  draft = skipCurrentInvite(draft);
  return applyLooksRightMotion(draft);
}

function signedInQueued(fileId: string) {
  const looks = { ...helocLooks(), fileId };
  const guest = applyProceedMotion(looks);
  const opened = applyAccountLetterOpened(
    applyAccountCreated(guest, { accountId: "acct_64", channel: "email", fileId }),
  );
  return applyProceedMotion(opened);
}

function withStaffW2(draft: FoxIntakeDraft) {
  const sent = applyStaffDeskSend(draft, { foxLine: STAFF_W2_FOX_LINE });
  assert.equal(sent.error, undefined);
  return sent.draft;
}

function receivedW2(draft: FoxIntakeDraft): FoxIntakeDraft {
  const doc: ReceivedDoc = {
    slot: "w2",
    name: "w2-2024.pdf",
    type: "application/pdf",
    size: 1200,
    receivedAt: new Date().toISOString(),
    status: "extracted",
    extractClass: "w2",
  };
  return { ...draft, documents: [...draft.documents, doc] };
}

/** Live W-2 extract writes a name. Name-only must not drop Government ID. */
function receivedNamedW2(draft: FoxIntakeDraft): FoxIntakeDraft {
  const next = receivedW2(draft);
  return {
    ...next,
    borrowerName: "Harbor Studio",
    contact: {
      ...next.contact,
      fullName: { ...next.contact.fullName, value: "Harbor Studio", confirmed: true },
    },
    facts: {
      ...next.facts,
      full_name: { field: "full_name", value: "Harbor Studio", confirmed: true, source: "document" },
      borrowerName: { field: "borrowerName", value: "Harbor Studio", confirmed: true, source: "document" },
    },
  };
}

function chips(draft: FoxIntakeDraft) {
  return labels(finishLineActions(draft));
}

function main() {
  const queued = signedInQueued("file_64_mirror");
  assert.equal(queued.motion, "in_queue");
  assert.equal(queued.loanAmountValue, 50_000);
  assert.ok((queued.liveQuote?.interestOnly ?? 0) > 0);
  const mirror = withStaffW2(queued);
  assert.equal(lastStaffFoxLine(mirror), STAFF_W2_FOX_LINE);
  const spoken = stillUsefulSpokenItems(mirror).map((item) => item.label);
  assert.ok(spoken.some((label) => /W-2/i.test(label)));
  assert.ok(spoken.some((label) => /Government ID/i.test(label)));
  assert.ok(spoken.some((label) => /1040/i.test(label)));
  const open = openPapersOnFile(mirror);
  assert.equal(open[0]?.extractClass, "w2");
  assert.match(open.map((item) => item.label).join(" · "), /W-2/i);
  assert.match(open.map((item) => item.label).join(" · "), /Government ID/);
  assert.match(open.map((item) => item.label).join(" · "), /1040/);

  const before = JSON.stringify({
    motion: mirror.motion,
    loan: mirror.loanAmountValue,
    notes: mirror.notes,
    docs: mirror.documents.length,
  });

  const q1 = "What do you still need on this file?";
  const q2 = "Do you still need last year's W-2 on this file?";
  assert.equal(isAskFoxFreeQuestion(q1, mirror), true);
  assert.equal(isAskFoxFreeQuestion(q2, mirror), true);

  const need = answerAskFoxFromFile(q1, mirror);
  assert.match(need.text, /W-2/i);
  const named = need.text;
  assert.ok(named.indexOf("W-2") < named.indexOf("Government ID"));
  assert.ok(named.indexOf("Government ID") < named.indexOf("1040"));
  assert.ok(askFoxAnswerIsClean(need.text));
  assert.doesNotMatch(need.text, /I pushed this/);
  assert.doesNotMatch(need.text, /ONYX has this for review/);
  assert.doesNotMatch(need.text, /review after Proceed/);
  assert.equal(need.log.wroteFile, false);
  assert.ok(need.log.factsUsed.includes("staff.foxLine"));
  assert.ok(need.log.openPapers.some((label) => /W-2/i.test(label)));

  const yes = answerAskFoxFromFile(q2, mirror);
  assert.equal(yes.text, ASK_FOX_W2_OPEN_LINE);
  assert.doesNotMatch(yes.text, /Government ID|1040|I pushed this|ONYX has this/);
  assert.equal(yes.log.wroteFile, false);

  const viaReply = workspaceReply(q2, mirror);
  assert.equal(viaReply?.text, ASK_FOX_W2_OPEN_LINE);
  assert.deepEqual(labels(viaReply?.actions).slice(0, 3), ["Ask Fox", "Upload more", "Request human"]);
  assert.equal(viaReply?.capture, undefined);

  const close = workspaceAskFoxFileReply("When will I close?", mirror);
  assert.equal(close.text, ASK_FOX_NO_CLOSE_LINE);
  assert.ok(askFoxAnswerIsClean(close.text));
  assert.deepEqual(labels(close.actions).slice(0, 3), ["Ask Fox", "Upload more", "Request human"]);

  const approved = workspaceAskFoxFileReply("Am I approved?", mirror);
  assert.equal(approved.text, ASK_FOX_NO_APPROVAL_LINE);
  assert.doesNotMatch(approved.text, /I pushed this|ONYX has this|you are approved/i);

  const pay = workspaceAskFoxFileReply("What's my payment?", mirror);
  assert.match(pay.text, /\$367/);
  assert.match(pay.text, /\$50,000/);
  assert.match(pay.text, /8\.80%/);
  assert.match(pay.text, /Not a lock/);
  assert.doesNotMatch(pay.text, /I pushed this|ONYX has this|review after Proceed/);

  const received = receivedNamedW2(mirror);
  const afterUseful = stillUsefulSpokenItems(received).map((item) => item.label).join(" · ");
  assert.match(afterUseful, /Government ID/);
  assert.match(afterUseful, /1040/);
  assert.doesNotMatch(afterUseful, /W-2/i);
  const afterW2 = answerAskFoxFromFile(q1, received);
  assert.doesNotMatch(afterW2.text, /W-2/i);
  assert.match(afterW2.text, /Government ID/);
  assert.match(afterW2.text, /1040/);
  const w2Ask = answerAskFoxFromFile(q2, received);
  assert.match(w2Ask.text, /^No\./);
  assert.match(w2Ask.text, /already on this File/);
  assert.doesNotMatch(w2Ask.text, /still open/);

  assert.equal(
    JSON.stringify({
      motion: mirror.motion,
      loan: mirror.loanAmountValue,
      notes: mirror.notes,
      docs: mirror.documents.length,
    }),
    before,
    "Ask Fox must not write File fields",
  );
  assert.deepEqual(chips(mirror), ["Ask Fox", "Upload more", "Request human"]);

  const askFoxSrc = readFileSync(new URL("../components/fox/askFoxFile.ts", import.meta.url), "utf8");
  assert.match(askFoxSrc, /MANTRA_BANNED/);
  assert.doesNotMatch(askFoxSrc, /MOTION_COPY\.(in_queue|nudge|askFox)/);
  assert.doesNotMatch(askFoxSrc, /return MOTION_COPY/);
  assert.match(askFoxSrc, /askFoxAnswerIsClean/);
  const workspaceSrc = readFileSync(new URL("../components/fox/workspace.ts", import.meta.url), "utf8");
  assert.match(workspaceSrc, /isAskFoxFreeQuestion\(q, draft\)/);
  assert.match(workspaceSrc, /workspaceAskFoxFileReply\(q, draft\)/);
  assert.doesNotMatch(
    workspaceSrc.slice(
      workspaceSrc.indexOf("export function workspaceAskFoxFileReply"),
      workspaceSrc.indexOf("export function persistGuidelineNote"),
    ),
    /I pushed this|MOTION_COPY\.nudge|MOTION_COPY\.in_queue/,
  );
  const apiSrc = readFileSync(new URL("../app/api/ask-fox/route.ts", import.meta.url), "utf8");
  assert.match(apiSrc, /loadAccountByToken/);
  assert.match(apiSrc, /Never writes/);
  assert.doesNotMatch(apiSrc, /saveAccountRecord|persistLiveAccountRecord/);
  const alwaysSrc = readFileSync(new URL("../components/fox/AlwaysOnFox.tsx", import.meta.url), "utf8");
  assert.match(alwaysSrc, /\/api\/ask-fox/);
  assert.match(alwaysSrc, /session\.fileId !== ownedId/);
  assert.match(alwaysSrc, /holdAskFoxPaint/);
  assert.match(alwaysSrc, /isAskFoxFileSpokenLine/);
  const fileWriteSrc = readFileSync(new URL("../components/fox/fileWrite.ts", import.meta.url), "utf8");
  const completenessFn = fileWriteSrc.slice(
    fileWriteSrc.indexOf("export function completenessFileFromDraft"),
    fileWriteSrc.indexOf("if (draft.facts?.property_address?.confirmed"),
  );
  assert.match(completenessFn, /receivedClassCount\(draft, "government_id"\)/);
  assert.doesNotMatch(completenessFn, /draft\.borrowerName \|\|/);
  assert.doesNotMatch(completenessFn, /contact\.fullName\.confirmed/);
  const coreSrc = readFileSync(new URL("../lib/account/core.ts", import.meta.url), "utf8");
  assert.match(coreSrc, /export function draftHasConfirmedFileWrite/);
  assert.match(coreSrc, /export function accountFileHasStoredContent/);
  assert.equal(coreSrc.includes("export function draftHasConfirmedFileWrite"), true);
  assert.ok(coreSrc.indexOf("export function draftHasConfirmedFileWrite") < coreSrc.indexOf("export function accountFileHasStoredContent"));
  const restoreSrc = readFileSync(new URL("../components/fox/account.ts", import.meta.url), "utf8");
  assert.match(restoreSrc, /export function threadHasGuestProceedReply/);
  assert.match(restoreSrc, /Derive only/);
}

main();
console.log("assert-ask-fox-reads-file: File papers · exact W-2 yes · no mantra · received W-2 dropped · A guard closed");
