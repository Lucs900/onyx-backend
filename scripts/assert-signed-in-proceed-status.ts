/**
 * 62 — signed-in Proceed status.
 * Row A: guest Proceed + Not now stays gathering.
 * Attach writes the account link only (77111ad). Proceed stays live until a signed-in send.
 * Row B: Proceed on a linked File writes draft.motion = in_queue once and opens one review WorkItem.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  applyLooksRightMotion,
  applyNudgeMotion,
  applyProceedMotion,
  finishLineActions,
  MOTION_COPY,
  motionStatusCopy,
  nextActorOf,
  openReviewWorkItem,
  restripeGatheringOrReady,
  waitingOnCopy,
  waitingOnOf,
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
  previewFacts,
  statusCopy,
  writePurchasePrice,
} from "../components/fox/workspace";
import {
  ACCOUNT_FILE_YOURS,
  ACCOUNT_SAVE_ASK,
  CREATE_ACCOUNT_LABEL,
  applyAccountCreated,
  applyAccountLetterOpened,
  applyAccountSaveAsk,
  hasLinkedAccount,
  hasStoredReviewSend,
  isOnyxHandoffLine,
  withLinkedAccount,
  withoutGuestHandoffLines,
} from "../components/fox/account";
import { mergeFileDraft, persistAccountRecord, createAccountRecord } from "../lib/account/core";
import { processingHubView } from "../components/fox/processingHub";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function fox(id: string, text: string): FoxMessage {
  return { id, role: "fox", text };
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
    fileId: "file_62_heloc",
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

function padOf(draft: FoxIntakeDraft) {
  const facts = previewFacts(draft);
  return {
    status: facts.find((item) => item.id === "status"),
    next: facts.find((item) => item.id === "next"),
    waiting: facts.find((item) => item.id === "waiting"),
  };
}

function reviewCount(draft: FoxIntakeDraft) {
  return (draft.workItems ?? []).filter(
    (item) => item.kind === "review" && (item.state === "open" || item.state === "nudged"),
  ).length;
}

function main() {
  const looks = helocLooks();
  const guest = applyProceedMotion(looks);
  assert.equal(hasLinkedAccount(guest), false);
  assert.equal(guest.guestProceeded, true);
  assert.equal(guest.motion, "gathering");
  assert.equal(statusCopy(guest), "gathering");
  assert.equal(nextActorOf(guest), "You");
  assert.equal(waitingOnOf(guest), "borrower");
  const guestPad = padOf(guest);
  assert.equal(guestPad.status?.label, "Status");
  assert.equal(guestPad.status?.value, "gathering");
  assert.equal(guestPad.next?.label, "Next");
  assert.equal(guestPad.next?.value, "You");
  assert.equal(guestPad.waiting?.label, "Waiting on");
  assert.equal(guestPad.waiting?.value, "borrower");
  assert.equal(reviewCount(guest), 0);
  assert.ok(!hasStoredReviewSend(guest));
  const guestThread: FoxMessage[] = [fox("save", ACCOUNT_SAVE_ASK)];
  assert.deepEqual(labels(deskStripActions(guestThread, guest)), [
    CREATE_ACCOUNT_LABEL,
    "Log in",
    "Not now",
    "Request human",
  ]);
  assert.ok(!labels(deskStripActions(guestThread, guest)).includes("Proceed"));
  const guestNudge = applyNudgeMotion(guest, { force: true });
  assert.equal(guestNudge.threadLine, null);
  assert.ok(!isOnyxHandoffLine(ACCOUNT_SAVE_ASK));
  assert.ok(isOnyxHandoffLine(MOTION_COPY.in_queue));
  assert.ok(isOnyxHandoffLine(MOTION_COPY.nudge));
  const sneak: FoxMessage[] = [
    fox("save", ACCOUNT_SAVE_ASK),
    fox("push", MOTION_COPY.nudge),
    fox("queue", MOTION_COPY.in_queue),
  ];
  const cleaned = withoutGuestHandoffLines(sneak, guest);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0]?.text, ACCOUNT_SAVE_ASK);

  const created = applyAccountCreated(guest, {
    accountId: "acct_62",
    channel: "email",
    fileId: guest.fileId,
  });
  assert.equal(created.fileId, guest.fileId);
  assert.equal(created.accountId, "acct_62");
  assert.equal(created.motion, "gathering");
  assert.equal(statusCopy(created), "gathering");
  assert.notEqual(created.motion, "in_queue");
  assert.equal(reviewCount(created), 0);

  const attached = applyAccountLetterOpened(created);
  assert.equal(attached.fileId, guest.fileId);
  assert.equal(attached.motion, "gathering");
  assert.equal(statusCopy(attached), "gathering");
  assert.equal(nextActorOf(attached), "You");
  assert.equal(waitingOnCopy(attached), "borrower");
  assert.ok(!hasStoredReviewSend(attached));
  const attachedDesk = deskLineAfterAccountConsume(attached);
  assert.equal(attachedDesk.text, ACCOUNT_FILE_YOURS);
  assert.ok(labels(attachedDesk.actions).includes("Proceed"));
  assert.ok(!labels(attachedDesk.actions).includes(CREATE_ACCOUNT_LABEL));
  const attachedThread: FoxMessage[] = [fox("yours", ACCOUNT_FILE_YOURS)];
  assert.deepEqual(labels(deskStripActions(attachedThread, attached)), [
    "Proceed",
    "Not yet",
    "Upload more",
    "Request human",
  ]);

  const injected = applyAccountLetterOpened({
    ...attached,
    motion: "in_queue",
    nextActor: "ONYX",
    waitingOn: "onyx",
  });
  assert.equal(injected.motion, "gathering", "77111ad: letter consume without a stored send stays gathering");
  assert.ok(!hasStoredReviewSend(injected));

  const sent = applyProceedMotion(attached);
  assert.equal(sent.fileId, attached.fileId);
  assert.equal(sent.motion, "in_queue");
  assert.equal(motionStatusCopy(sent), "in_queue");
  assert.equal(statusCopy(sent), "in_queue");
  assert.equal(nextActorOf(sent), "ONYX");
  assert.equal(waitingOnOf(sent), "onyx");
  assert.equal(waitingOnCopy(sent), "ONYX");
  assert.ok(hasStoredReviewSend(sent));
  assert.equal(reviewCount(sent), 1);
  assert.equal(openReviewWorkItem(sent)?.kind, "review");
  const sentPad = padOf(sent);
  assert.equal(sentPad.status?.label, "Status");
  assert.equal(sentPad.status?.value, "in_queue");
  assert.equal(sentPad.next?.label, "Next");
  assert.equal(sentPad.next?.value, "ONYX");
  assert.equal(sentPad.waiting?.label, "Waiting on");
  assert.equal(sentPad.waiting?.value, "ONYX");
  const hub = processingHubView(sent);
  assert.equal(hub.fileId, sent.fileId);
  assert.equal(hub.state.status, "in_queue");
  assert.equal(hub.state.next, "ONYX");
  assert.equal(hub.grid.find((row) => row.id === "status")?.value, "in_queue");
  assert.equal(hub.grid.find((row) => row.id === "status")?.label, "Status");
  assert.equal(hub.grid.find((row) => row.id === "next")?.label, "Next");
  assert.equal(hub.grid.find((row) => row.id === "waiting")?.label, "Waiting");
  const sentThread: FoxMessage[] = [fox("queue", MOTION_COPY.in_queue)];
  assert.deepEqual(labels(deskStripActions(sentThread, sent)).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(deskStripActions(sentThread, sent)).at(-1), "Request human");
  assert.ok(!labels(deskStripActions(sentThread, sent)).includes("Proceed"));
  assert.deepEqual(labels(finishLineActions(sent)).slice(0, 2), ["Ask Fox", "Upload more"]);

  const again = applyProceedMotion(sent);
  assert.equal(again.motion, "in_queue");
  assert.equal(reviewCount(again), 1);
  assert.equal(openReviewWorkItem(again)?.id, openReviewWorkItem(sent)?.id);
  assert.equal((again.events ?? []).filter((event) => event.kind === "proceed").length, 1);

  const kept = applyAccountLetterOpened({ ...sent, accountAsk: "sent" });
  assert.equal(kept.motion, "in_queue");
  assert.equal(kept.nextActor, "ONYX");
  assert.equal(reviewCount(kept), 1);

  const afterUpload = restripeGatheringOrReady(sent);
  assert.equal(afterUpload.motion, "in_queue");
  assert.equal(nextActorOf(afterUpload), "ONYX");

  const record = createAccountRecord({
    draft: sent,
    messages: sentThread,
    fileId: sent.fileId ?? "file_62_heloc",
    email: "62walk@onyxlending.com",
  });
  const wiped = mergeFileDraft(sent, {
    ...sent,
    motion: "gathering",
    nextActor: "You",
    waitingOn: "borrower",
    workItems: [],
  });
  assert.equal(wiped.motion, "in_queue");
  assert.equal(wiped.nextActor, "ONYX");
  assert.equal(reviewCount(wiped), 1);

  const persisted = persistAccountRecord(record, attached, [
    ...guestThread,
    fox("push", MOTION_COPY.nudge),
  ]);
  assert.ok(!persisted.messages.some((item) => isOnyxHandoffLine(item.text)));
  assert.equal(persisted.draft.fileId, sent.fileId);

  const guestPersisted = persistAccountRecord(record, guest, [
    fox("save", ACCOUNT_SAVE_ASK),
    fox("push", MOTION_COPY.nudge),
  ]);
  assert.ok(!guestPersisted.messages.some((item) => isOnyxHandoffLine(item.text)));

  const linkedLooks = withLinkedAccount(looks, "acct_62_direct");
  const direct = applyProceedMotion(linkedLooks);
  assert.equal(direct.motion, "in_queue");
  assert.equal(reviewCount(direct), 1);
  const saveAsk = applyAccountSaveAsk(looks);
  assert.equal(saveAsk.motion, "gathering");
  assert.equal(reviewCount(saveAsk), 0);

  console.log(
    "assert-signed-in-proceed-status: guest row A · attach stays gathering + Proceed · signed-in write in_queue once",
  );
}

main();
