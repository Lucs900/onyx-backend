/**
 * 61b — signed-in thread leftovers. Drop email-link and leave-and-come-back.
 * Last line chips after resume. Create account under Proceed is past when linked.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writeFirstLien, writeHelocLine, withHelocToolQuote } from "../components/fox/heloc";
import {
  deskLineAfterAccountConsume,
  deskStripActions,
  withDeskLineAfterAccountConsume,
  withoutAccountResumeLeftovers,
  withoutSignedInThreadLeftovers,
  writePurchasePrice,
} from "../components/fox/workspace";
import {
  ACCOUNT_EMAIL_SENT,
  ACCOUNT_FILE_YOURS,
  ACCOUNT_FIRST_OFFER,
  ACCOUNT_SAVE_ASK,
  CREATE_ACCOUNT_LABEL,
  accountResumeLastActions,
  accountSaveWallActions,
  accountWorkspaceReply,
  applyAccountCapture,
  applyAccountCreated,
  applyAccountLetterOpened,
  hasLinkedAccount,
  isSignedInPastCreateAccountLine,
  isSignedInThreadLeftoverLine,
} from "../components/fox/account";
import { mergeAccountMessages } from "../lib/account/core";
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

function helocProceedGuest(): FoxIntakeDraft {
  let draft = {
    ...emptyDraft(),
    path: "acr" as const,
    productIntent: "heloc" as const,
    workspaceFlow: true,
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
  draft = writeHelocLine(writeFirstLien(writePurchasePrice(draft, 500_000), 400_000), 50_000);
  draft = applyCouponChoice(withHelocToolQuote(draft), "this");
  draft = { ...draft, incomeAsked: true, incomeType: { ...emptyDraft().incomeType, value: "w2" } };
  draft = writeWhoOnLoan(draft, "just-me");
  draft = skipMonthlyDebts(draft);
  draft = skipWageDocs(draft);
  draft = skipCurrentInvite(draft);
  return applyProceedMotion(applyLooksRightMotion(draft));
}

function main() {
  assert.equal(isSignedInThreadLeftoverLine(ACCOUNT_EMAIL_SENT), true);
  assert.equal(isSignedInThreadLeftoverLine("Check your email for a link to this File"), true);
  assert.equal(isSignedInThreadLeftoverLine(ACCOUNT_FIRST_OFFER), true);
  assert.equal(isSignedInThreadLeftoverLine("You can leave and come back."), true);
  assert.equal(isSignedInThreadLeftoverLine(ACCOUNT_FILE_YOURS), false);
  assert.equal(isSignedInPastCreateAccountLine(ACCOUNT_SAVE_ASK), true);

  const guest = helocProceedGuest();
  assert.equal(hasLinkedAccount(guest), false);
  const guestThread: FoxMessage[] = [
    fox("offer", ACCOUNT_FIRST_OFFER),
    fox("save", ACCOUNT_SAVE_ASK),
    fox("mail", ACCOUNT_EMAIL_SENT),
  ];
  const guestKept = withoutSignedInThreadLeftovers(guestThread, guest);
  assert.equal(guestKept.length, 3);
  assert.deepEqual(labels(accountSaveWallActions(guest)), [
    CREATE_ACCOUNT_LABEL,
    "Log in",
    "Not now",
    "Request human",
  ]);
  const guestCreate = accountWorkspaceReply("Create account", guest);
  assert.equal(guestCreate?.capture?.field, "create-account");

  const opened = applyAccountLetterOpened(
    applyAccountCreated(guest, { accountId: "acct_61b", channel: "email", fileId: "file_61b" }),
  );
  assert.equal(hasLinkedAccount(opened), true);
  const reprints: FoxMessage[] = [
    fox("offer", ACCOUNT_FIRST_OFFER),
    fox("offer-2", "You can leave and come back to this desk."),
    fox("save", ACCOUNT_SAVE_ASK),
    fox("mail", ACCOUNT_EMAIL_SENT),
    fox("mail-2", "Check your email for a link to this File"),
    fox("yours", ACCOUNT_FILE_YOURS),
  ];
  const cleaned = withoutAccountResumeLeftovers(reprints, opened);
  assert.equal(cleaned.some((item) => isSignedInThreadLeftoverLine(item.text)), false);
  assert.equal(cleaned.some((item) => item.text === ACCOUNT_FILE_YOURS), true);
  assert.equal(cleaned.some((item) => item.text === ACCOUNT_SAVE_ASK), true);
  assert.equal(lastFox(cleaned), ACCOUNT_FILE_YOURS);
  assert.deepEqual(labels(deskStripActions(cleaned, opened)), [
    "Ask Fox",
    "Upload more",
    "Request human",
  ]);
  assert.deepEqual(labels(accountResumeLastActions(opened)), [
    "Ask Fox",
    "Upload more",
    "Request human",
  ]);

  const desk = deskLineAfterAccountConsume(opened);
  const resumed = withDeskLineAfterAccountConsume(reprints, desk, opened);
  assert.equal(resumed.some((item) => isSignedInThreadLeftoverLine(item.text)), false);
  assert.equal(lastFox(resumed), ACCOUNT_FILE_YOURS);
  assert.deepEqual(labels(deskStripActions(resumed, opened)), [
    "Ask Fox",
    "Upload more",
    "Request human",
  ]);

  const persisted = mergeAccountMessages(reprints, reprints, opened);
  assert.equal(persisted.some((item) => isSignedInThreadLeftoverLine(item.text)), false);

  assert.equal(accountWorkspaceReply("Create account", opened), null);
  const afterClick = applyAccountCapture(opened, { field: "create-account" });
  assert.equal(afterClick.accountAsk, opened.accountAsk);
  assert.equal(afterClick.accountSaveAsk, opened.accountSaveAsk);

  const threadSource = readFileSync(new URL("../components/fox/AlwaysOnFox.tsx", import.meta.url), "utf8");
  assert.match(threadSource, /isSignedInPastCreateAccountLine/);
  assert.match(threadSource, /aria-disabled="true"/);
  assert.match(threadSource, /fox-chip is-past/);
  assert.match(threadSource, /data-history-chip="create-account"/);
  assert.doesNotMatch(
    threadSource.slice(threadSource.indexOf("isSignedInPastCreateAccountLine"), threadSource.indexOf("isSignedInPastCreateAccountLine") + 800),
    /onClick=\{\(\) => onAction/,
  );

  const css = readFileSync(new URL("../styles/fox.css", import.meta.url), "utf8");
  assert.match(css, /\.fox-chip\.is-past/);
  assert.match(css, /pointer-events:\s*none/);

  const leftover = readFileSync(new URL("../scripts/assert-account-resume-leftover.ts", import.meta.url), "utf8");
  assert.match(leftover, /export function intakeAskAlreadyAnswered/);
  assert.match(leftover, /export function isLoginDoorUserBubble/);
  assert.match(leftover, /export function hasAccountHeader/);
}

main();
console.log("assert-account-signed-in-leftover: signed-in leftover drop + past Create account + resume chips");
