/**
 * Account chapter. Create account on the first question.
 * Second browser (empty draft + link/code) resumes the same file_id.
 * Notepad + last Fox line match. Proceed still works → in_queue.
 * Hub opens that file_id. Not now stays a browser sketch.
 */
import assert from "node:assert/strict";
import { emptyDraft, ensureFileId } from "../components/fox/store";
import { applyLooksRightMotion, applyProceedMotion, finishLineActions } from "../components/fox/motion";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { borrowersFileValue, writeWhoOnLoan } from "../components/fox/whoOnLoan";
import {
  withHelocToolQuote,
  writeFirstLien,
  writeHelocLine,
} from "../components/fox/heloc";
import {
  deskStripActions,
  nextFoxAsk,
  previewFacts,
  workspaceGreeting,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import {
  ACCOUNT_CHANNEL_ASK,
  ACCOUNT_SKIPPED_LINE,
  CREATE_ACCOUNT_LABEL,
  NOT_NOW_LABEL,
  accountSideActions,
  applyAccountCapture,
  lastFoxLine,
  openAccountOnFile,
  writeAccountFile,
} from "../components/fox/account";
import {
  applyStaffDeskSend,
  processingHubView,
  STAFF_W2_FOX_LINE,
  staffDeskKeepsFinishChips,
} from "../components/fox/processingHub";
import { skipWhoOnLoanName, whoOnLoanNameWasSkipped } from "../components/fox/whoOnLoan";
import { memoryAccountStore, resumeFromStore } from "../lib/account/core";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function firstQuestion(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    workspaceFlow: true,
  };
}

function houseReady(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    productIntent: "heloc",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
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
  return applyProceedMotion(applyLooksRightMotion(draft));
}

function main() {
  const first = firstQuestion();
  const greet = workspaceGreeting(first);
  assert.match(greet.text, /relationship file|Start a relationship|Buy/i);
  assert.deepEqual(labels(greet.actions), ["Buy", "Refinance", "HELOC", "Jumbo", "Other"]);
  assert.deepEqual(labels(accountSideActions(first)), [CREATE_ACCOUNT_LABEL, NOT_NOW_LABEL]);
  assert.ok(!labels(deskStripActions([{ id: "g", role: "fox", text: greet.text }], first)).includes(CREATE_ACCOUNT_LABEL));

  const create = workspaceReply("Create account", first);
  assert.equal(create?.capture?.field, "create-account");
  assert.equal(create?.text, ACCOUNT_CHANNEL_ASK);
  const afterCreate = applyAccountCapture(first, { field: "create-account" });
  assert.equal(afterCreate.accountAsk, "channel");
  assert.deepEqual(labels(accountSideActions(afterCreate)).slice(0, 2), ["Email", "Phone"]);

  const skip = workspaceReply("Not now", first);
  assert.equal(skip?.capture?.field, "skip-account");
  assert.equal(skip?.text, ACCOUNT_SKIPPED_LINE);
  const skipped = applyAccountCapture(first, { field: "skip-account" });
  assert.equal(skipped.accountSkipped, true);
  assert.deepEqual(labels(accountSideActions(skipped)), []);

  const store = memoryAccountStore();
  const messages: FoxMessage[] = [{ id: "fox-1", role: "fox", text: greet.text }];
  const opened = openAccountOnFile(store, first, messages, { email: "borrower@example.com" });
  assert.ok(opened.draft.fileId);
  assert.ok(opened.draft.accountId);
  assert.match(opened.snapshot.magicLink, /^\/start\?account=/);
  assert.equal(opened.snapshot.fileId, opened.draft.fileId);

  const second = resumeFromStore(store, { token: opened.record.token });
  assert.ok(second);
  assert.equal(second.fileId, opened.draft.fileId);
  assert.equal(JSON.stringify(previewFacts(second.draft)), JSON.stringify(previewFacts(opened.draft)));
  assert.equal(lastFoxLine(second.messages), lastFoxLine(messages));

  const phoneStore = memoryAccountStore();
  const phone = openAccountOnFile(phoneStore, first, messages, { phone: "4155551212" });
  assert.ok(phone.snapshot.code);
  assert.match(phone.snapshot.code ?? "", /^\d{6}$/);
  const byCode = resumeFromStore(phoneStore, { code: phone.snapshot.code });
  assert.equal(byCode?.fileId, phone.draft.fileId);

  const emptySecond: FoxIntakeDraft = emptyDraft();
  assert.notEqual(emptySecond.fileId, opened.draft.fileId);
  const resumedEmpty = resumeFromStore(store, { token: opened.record.token });
  assert.equal(resumedEmpty?.fileId, opened.draft.fileId);

  const heloc = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(opened.draft, 500_000), 400_000), 50_000),
  );
  const queued = justMeSkipProceed(heloc);
  assert.equal(queued.motion, "in_queue");
  assert.equal(borrowersFileValue(queued), "1");
  const linked = { ...queued, accountId: opened.draft.accountId, fileId: opened.draft.fileId };
  const queueMessages: FoxMessage[] = [
    ...messages,
    { id: "fox-q", role: "fox", text: "ONYX has this for review. I’m still here." },
  ];
  const persisted = writeAccountFile(store, opened.record.token, linked, queueMessages);
  assert.equal(persisted?.fileId, opened.draft.fileId);
  const afterProceed = resumeFromStore(store, { token: opened.record.token });
  assert.equal(afterProceed?.draft.motion, "in_queue");
  assert.equal(lastFoxLine(afterProceed?.messages ?? []), "ONYX has this for review. I’m still here.");
  assert.ok(staffDeskKeepsFinishChips(afterProceed!.draft));
  assert.deepEqual(labels(finishLineActions(afterProceed!.draft)).slice(0, 2), ["Ask Fox", "Upload more"]);

  const sent = applyStaffDeskSend(afterProceed!.draft, { foxLine: STAFF_W2_FOX_LINE });
  const afterSendMessages = [
    ...queueMessages,
    { id: "fox-w2", role: "fox", text: sent.threadLine },
  ];
  writeAccountFile(store, opened.record.token, sent.draft, afterSendMessages);
  const returned = resumeFromStore(store, { token: opened.record.token });
  assert.equal(lastFoxLine(returned?.messages ?? []), STAFF_W2_FOX_LINE);
  const hub = processingHubView(returned!.draft);
  assert.equal(hub.fileId, opened.draft.fileId);
  assert.match(hub.path, new RegExp(opened.draft.fileId!));

  const skipName = skipWhoOnLoanName({
    ...heloc,
    whoOnLoan: "yes",
    whoOnLoanAsked: true,
    whoOnLoanNameAsked: true,
  });
  assert.equal(whoOnLoanNameWasSkipped(skipName), true);
  assert.equal(borrowersFileValue(skipName), "1");

  const blob = JSON.stringify({ hub, opened, returned });
  assert.doesNotMatch(blob, /Google-required|SSN login|BNTouch as source|invite-reward/i);

  const notNowStore = memoryAccountStore();
  assert.equal(notNowStore.getByFileId(first.fileId ?? "none"), undefined);

  console.log(
    `assert-account-chapter: first-question account → second browser same file_id ${opened.draft.fileId}; foxLine returns; Proceed in_queue`,
  );
}

main();
