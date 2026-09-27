/**
 * 63 — signed-in Proceed restore.
 * Guest Proceed stays gathering. Resume on that File speaks yours once, then
 * "I can send this to review." with Proceed · Not yet · Request human.
 * Signed-in Proceed is the only send. Never-Proceeded keeps 8d22636 resume.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import {
  applyLooksRightMotion,
  applyNotYetMotion,
  applyProceedMotion,
  MOTION_COPY,
  nextActorOf,
  openReviewWorkItem,
} from "../components/fox/motion";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writeFirstLien, writeHelocLine, withHelocToolQuote } from "../components/fox/heloc";
import {
  deskLineAfterAccountConsume,
  deskStripActions,
  statusCopy,
  withDeskLineAfterAccountConsume,
  workspacePromptCopy,
  workspaceUpdateCopy,
  writePurchasePrice,
} from "../components/fox/workspace";
import {
  ACCOUNT_FILE_YOURS,
  ACCOUNT_SAVE_ASK,
  ACCOUNT_SKIPPED_LINE,
  ACCOUNT_WHY_SENTENCE,
  applyAccountCreated,
  applyAccountLetterOpened,
  fileHitGuestProceed,
  hasLinkedAccount,
  hasStoredReviewSend,
  signedInReviewStripActions,
  signedInReviewStripOpen,
} from "../components/fox/account";
import {
  createAccountRecord,
  persistLiveAccountRecord,
} from "../lib/account/core";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function fox(id: string, text: string): FoxMessage {
  return { id, role: "fox", text };
}

function lastFox(messages: FoxMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "fox" && messages[i]?.text?.trim()) return messages[i]!.text;
  }
  return "";
}

function reviewCount(draft: FoxIntakeDraft) {
  return (draft.workItems ?? []).filter(
    (item) => item.kind === "review" && (item.state === "open" || item.state === "nudged"),
  ).length;
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
    fileId: "file_63_heloc",
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

function main() {
  const looks = helocLooks();
  assert.equal(fileHitGuestProceed(looks), false);
  assert.equal(signedInReviewStripOpen(looks), false);

  const guest = applyProceedMotion(looks);
  assert.equal(fileHitGuestProceed(guest), true);
  assert.equal(guest.guestProceeded, true);
  assert.equal(guest.motion, "gathering");
  assert.equal(reviewCount(guest), 0);
  assert.ok(!hasStoredReviewSend(guest));

  const opened = applyAccountLetterOpened(
    applyAccountCreated(guest, { accountId: "acct_63", channel: "email", fileId: guest.fileId }),
  );
  assert.equal(hasLinkedAccount(opened), true);
  assert.equal(fileHitGuestProceed(opened), true);
  assert.equal(opened.guestProceeded, true);
  assert.equal(opened.motion, "gathering");
  assert.equal(signedInReviewStripOpen(opened), true);
  const desk = deskLineAfterAccountConsume(opened);
  assert.equal(desk.text, MOTION_COPY.ready);
  assert.deepEqual(labels(desk.actions), ["Proceed", "Not yet", "Request human"]);
  assert.equal(labels(desk.actions).at(-1), "Request human");
  assert.ok(!labels(desk.actions).includes("Ask Fox"));
  assert.deepEqual(labels(signedInReviewStripActions(opened)), ["Proceed", "Not yet", "Request human"]);

  const longReady = `${MOTION_COPY.ready} Still useful: Government ID, Last year's W-2, and last year's tax return (Form 1040). Skip is fine.`;
  const history: FoxMessage[] = [
    fox("long-ready", longReady),
    fox("why", ACCOUNT_WHY_SENTENCE),
    fox("save", ACCOUNT_SAVE_ASK),
    { id: "client-not-now", role: "client", text: "Not now" },
    fox("sketch", ACCOUNT_SKIPPED_LINE),
  ];
  const resumed = withDeskLineAfterAccountConsume(history, desk, opened);
  assert.equal(resumed.filter((item) => item.role === "fox" && item.text === ACCOUNT_FILE_YOURS).length, 1);
  assert.equal(lastFox(resumed), MOTION_COPY.ready);
  assert.ok(resumed.some((item) => item.text === ACCOUNT_WHY_SENTENCE));
  assert.ok(resumed.some((item) => item.text === ACCOUNT_SAVE_ASK));
  assert.ok(resumed.some((item) => item.text === ACCOUNT_SKIPPED_LINE));
  const yoursAt = resumed.findIndex((item) => item.role === "fox" && item.text === ACCOUNT_FILE_YOURS);
  const sketchAt = resumed.findIndex((item) => item.text === ACCOUNT_SKIPPED_LINE);
  assert.ok(sketchAt >= 0 && yoursAt > sketchAt, "Sketch stays is guest history above yours");
  assert.equal(resumed.filter((item) => item.role === "fox" && item.text === MOTION_COPY.ready).length, 1);
  assert.equal(resumed.filter((item) => item.text === longReady).length, 1);
  assert.deepEqual(labels(deskStripActions(resumed, opened)), ["Proceed", "Not yet", "Request human"]);

  const notYet = applyNotYetMotion(opened);
  assert.equal(notYet.motion, "gathering");
  assert.equal(statusCopy(notYet), "gathering");
  assert.equal(nextActorOf(notYet), "You");
  assert.equal(reviewCount(notYet), 0);
  assert.ok(!openReviewWorkItem(notYet));
  assert.equal(workspacePromptCopy("done", notYet).text, MOTION_COPY.ready);
  assert.equal(workspaceUpdateCopy({ field: "not-yet" }, notYet), MOTION_COPY.ready);
  assert.deepEqual(labels(deskStripActions(resumed, notYet)), ["Proceed", "Not yet", "Request human"]);
  assert.equal(lastFox(resumed), MOTION_COPY.ready);

  const sent = applyProceedMotion(opened);
  assert.equal(sent.motion, "in_queue");
  assert.equal(statusCopy(sent), "in_queue");
  assert.equal(nextActorOf(sent), "ONYX");
  assert.equal(reviewCount(sent), 1);
  assert.equal(signedInReviewStripOpen(sent), false);
  assert.equal(workspacePromptCopy("done", sent).text, MOTION_COPY.in_queue);
  assert.match(workspacePromptCopy("done", sent).text, /ONYX has this for review/);
  assert.equal(workspaceUpdateCopy({ field: "proceed" }, sent), MOTION_COPY.in_queue);
  const sentDesk = deskLineAfterAccountConsume(sent);
  assert.notEqual(sentDesk.text, MOTION_COPY.ready);
  assert.deepEqual(labels(deskStripActions([fox("queue", MOTION_COPY.in_queue)], sent)).slice(0, 2), [
    "Ask Fox",
    "Upload more",
  ]);
  const again = applyProceedMotion(sent);
  assert.equal(reviewCount(again), 1);

  const never = applyAccountLetterOpened(
    applyAccountCreated(looks, { accountId: "acct_63_never", channel: "email", fileId: looks.fileId }),
  );
  assert.equal(fileHitGuestProceed(never), false);
  assert.equal(signedInReviewStripOpen(never), false);
  const neverDesk = deskLineAfterAccountConsume(never);
  assert.notEqual(neverDesk.text, MOTION_COPY.ready);
  assert.ok(!labels(neverDesk.actions).includes("Proceed"));

  const record = createAccountRecord({
    draft: guest,
    messages: [],
    fileId: guest.fileId ?? "file_63_heloc",
    email: "63walk@onyxlending.com",
  });
  const persisted = persistLiveAccountRecord(record, opened, resumed);
  assert.equal(persisted.draft.guestProceeded, true);
  assert.equal(fileHitGuestProceed(persisted.draft), true);

  const accountSource = readFileSync(new URL("../components/fox/account.ts", import.meta.url), "utf8");
  assert.match(accountSource, /export function fileHitGuestProceed/);
  assert.match(accountSource, /guestProceeded: true/);
  assert.match(accountSource, /export function signedInReviewStripOpen/);
  const coreSource = readFileSync(new URL("../lib/account/core.ts", import.meta.url), "utf8");
  assert.match(coreSource, /guestProceeded: Boolean\(incoming\.guestProceeded \|\| existing\.guestProceeded\)/);
  const workspaceSource = readFileSync(new URL("../components/fox/workspace.ts", import.meta.url), "utf8");
  assert.match(workspaceSource, /signedInReviewStripOpen\(draft\)/);
  assert.match(workspaceSource, /isSignedInGuestHistoryLine/);
  const storeSource = readFileSync(new URL("../components/fox/store.ts", import.meta.url), "utf8");
  assert.match(storeSource, /if \(thisDevice\)/);
  assert.match(storeSource, /applyAccountResume\(\s*created/);
}

main();
console.log("assert-signed-in-proceed-restore: guest Proceed stored · resume review strip · Not yet gathering · send once");
