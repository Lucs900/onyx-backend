/**
 * 61 — account resume leftover. Yours once. No why / first-question reprint.
 * Last line always has chips. Header A when linked. Sign out clears browser only.
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
  PATH_ASK_TEXT,
  statusCopy,
  withDeskLineAfterAccountConsume,
  withoutAccountResumeLeftovers,
  writePurchasePrice,
} from "../components/fox/workspace";
import { HELOC_FIRST_LIEN_ASK, HELOC_VALUE_ASK } from "../components/fox/heloc";
import {
  ACCOUNT_EMAIL_ASK,
  ACCOUNT_EMAIL_SENT,
  ACCOUNT_FILE_YOURS,
  ACCOUNT_FIRST_OFFER,
  ACCOUNT_FIRST_WHY,
  ACCOUNT_LOGIN_ASK,
  ACCOUNT_SAVE_ASK,
  ACCOUNT_WHY_SENTENCE,
  CREATE_ACCOUNT_LABEL,
  LOGIN_LABEL,
  NOT_NOW_LABEL,
  accountHeaderInitial,
  accountResumeLastActions,
  accountSaveWallActions,
  applyAccountCreated,
  applyAccountLetterOpened,
  hasAccountHeader,
  hasLinkedAccount,
  isLoginDoorUserBubble,
} from "../components/fox/account";
import {
  createAccountRecord,
  mergeAccountMessages,
  persistLiveAccountRecord,
} from "../lib/account/core";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function fox(id: string, text: string): FoxMessage {
  return { id, role: "fox", text };
}

function client(id: string, text: string): FoxMessage {
  return { id, role: "client", text };
}

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

function helocProceedGuest(): FoxIntakeDraft {
  let draft = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
  );
  draft = applyCouponChoice(withHelocToolQuote(draft), "this");
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

function countLine(messages: FoxMessage[], text: string) {
  return messages.filter((item) => item.role === "fox" && item.text === text).length;
}

function lastFox(messages: FoxMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "fox" && messages[i]?.text?.trim()) return messages[i]!.text;
  }
  return "";
}

function main() {
  const guest = helocProceedGuest();
  assert.equal(guest.guestProceeded, true);
  assert.equal(hasLinkedAccount(guest), false);
  assert.equal(statusCopy(guest), "gathering");
  assert.equal(guest.nextActor, "You");
  const wall = accountSaveWallActions(guest);
  assert.deepEqual(labels(wall), [CREATE_ACCOUNT_LABEL, LOGIN_LABEL, NOT_NOW_LABEL, "Request human"]);
  assert.equal(labels(wall).at(-1), "Request human");
  const reprints: FoxMessage[] = [
    fox("path-1", PATH_ASK_TEXT),
    fox("why-1", ACCOUNT_WHY_SENTENCE),
    fox("save", ACCOUNT_SAVE_ASK),
    fox("mail", ACCOUNT_EMAIL_SENT),
    fox("yours-1", ACCOUNT_FILE_YOURS),
    fox("yours-2", ACCOUNT_FILE_YOURS),
    fox("yours-3", ACCOUNT_FILE_YOURS),
    fox("why-2", ACCOUNT_WHY_SENTENCE),
    fox("path-2", PATH_ASK_TEXT),
    fox("first-why", ACCOUNT_FIRST_WHY),
  ];
  const cleaned = withoutAccountResumeLeftovers(reprints, guest);
  assert.equal(countLine(cleaned, ACCOUNT_FILE_YOURS), 1);
  assert.equal(countLine(cleaned, ACCOUNT_WHY_SENTENCE), 1);
  assert.equal(countLine(cleaned, PATH_ASK_TEXT), 1);
  assert.equal(countLine(cleaned, ACCOUNT_FIRST_WHY), 0);
  assert.ok(cleaned.some((item) => item.text === ACCOUNT_SAVE_ASK));

  const opened = applyAccountLetterOpened(
    applyAccountCreated(guest, { accountId: "acct_61", channel: "email", fileId: "file_61" }),
  );
  assert.equal(opened.guestProceeded, true);
  assert.equal(opened.accountId, "acct_61");
  assert.equal(opened.motion, "gathering");
  assert.equal(statusCopy(opened), "gathering");
  assert.equal(opened.nextActor, "You");
  const desk = deskLineAfterAccountConsume(opened);
  assert.equal(desk.text, ACCOUNT_FILE_YOURS);
  assert.deepEqual(labels(desk.actions), ["Ask Fox", "Upload more", "Request human"]);
  assert.deepEqual(labels(accountResumeLastActions(opened)), [
    "Ask Fox",
    "Upload more",
    "Request human",
  ]);

  const waiting: FoxMessage[] = [
    fox("path", PATH_ASK_TEXT),
    fox("why", ACCOUNT_WHY_SENTENCE),
    fox("save", ACCOUNT_SAVE_ASK),
    fox("mail", ACCOUNT_EMAIL_SENT),
  ];
  const advanced = withDeskLineAfterAccountConsume(waiting, desk, opened);
  assert.equal(countLine(advanced, ACCOUNT_FILE_YOURS), 1);
  assert.equal(countLine(advanced, ACCOUNT_WHY_SENTENCE), 1);
  assert.equal(countLine(advanced, PATH_ASK_TEXT), 1);
  assert.equal(lastFox(advanced), ACCOUNT_FILE_YOURS);
  assert.deepEqual(labels(deskStripActions(advanced, opened)), [
    "Ask Fox",
    "Upload more",
    "Request human",
  ]);

  const tripled = withDeskLineAfterAccountConsume(
    [...advanced, fox("yours-again", ACCOUNT_FILE_YOURS), fox("why-again", ACCOUNT_WHY_SENTENCE), fox("path-again", PATH_ASK_TEXT)],
    desk,
    opened,
  );
  assert.equal(countLine(tripled, ACCOUNT_FILE_YOURS), 1);
  assert.equal(countLine(tripled, ACCOUNT_WHY_SENTENCE), 1);
  assert.equal(countLine(tripled, PATH_ASK_TEXT), 1);
  assert.ok(labels(deskStripActions(tripled, opened)).length > 0);

  const mid = applyAccountLetterOpened({
    ...houseReady(writePurchasePrice(afterPrimary(), 500_000)),
    accountId: "acct_61_mid",
    accountAsk: "sent",
    guestProceeded: true,
  });
  const midDesk = deskLineAfterAccountConsume(mid);
  assert.notEqual(midDesk.text, ACCOUNT_FILE_YOURS);
  assert.notEqual(midDesk.text, PATH_ASK_TEXT);
  assert.notEqual(midDesk.text, ACCOUNT_WHY_SENTENCE);
  assert.ok((midDesk.actions ?? []).length > 0);
  const midThread = withDeskLineAfterAccountConsume(
    [fox("path", PATH_ASK_TEXT), fox("mail", ACCOUNT_EMAIL_SENT)],
    midDesk,
    mid,
  );
  assert.equal(countLine(midThread, ACCOUNT_FILE_YOURS), 1);
  assert.equal(countLine(midThread, PATH_ASK_TEXT), 1);
  assert.equal(lastFox(midThread), midDesk.text);
  assert.ok(labels(deskStripActions(midThread, mid)).length > 0);

  const loginPollute: FoxMessage[] = [
    ...advanced,
    fox("welcome", ACCOUNT_LOGIN_ASK),
    fox("email-ask", ACCOUNT_EMAIL_ASK),
  ];
  const afterLogin = withDeskLineAfterAccountConsume(loginPollute, desk, opened);
  assert.equal(countLine(afterLogin, ACCOUNT_FILE_YOURS), 1);
  assert.equal(countLine(afterLogin, ACCOUNT_LOGIN_ASK), 0);
  assert.equal(countLine(afterLogin, ACCOUNT_EMAIL_ASK), 0);
  assert.equal(lastFox(afterLogin), ACCOUNT_FILE_YOURS);
  assert.deepEqual(labels(deskStripActions(afterLogin, opened)), [
    "Ask Fox",
    "Upload more",
    "Request human",
  ]);

  const mergedLogin = mergeAccountMessages(
    [fox("welcome-local", ACCOUNT_LOGIN_ASK), fox("email-local", ACCOUNT_EMAIL_ASK)],
    advanced,
    opened,
  );
  assert.equal(countLine(mergedLogin, ACCOUNT_LOGIN_ASK), 0);
  assert.equal(countLine(mergedLogin, ACCOUNT_EMAIL_ASK), 0);
  assert.equal(countLine(mergedLogin, ACCOUNT_FILE_YOURS), 1);

  const liveRecord = createAccountRecord({
    draft: opened,
    messages: advanced,
    fileId: "file_61_login",
    email: "61walk@onyxlending.com",
  });
  const persistedLogin = persistLiveAccountRecord(liveRecord, opened, [
    ...advanced,
    fox("welcome-in", ACCOUNT_LOGIN_ASK),
    fox("email-in", ACCOUNT_EMAIL_ASK),
  ]);
  assert.equal(countLine(persistedLogin.messages, ACCOUNT_LOGIN_ASK), 0);
  assert.equal(countLine(persistedLogin.messages, ACCOUNT_EMAIL_ASK), 0);
  assert.equal(persistedLogin.draft.propertyValueAmount, 500_000);
  assert.equal(persistedLogin.draft.loanAmountValue, 50_000);

  const emptyLinked: FoxIntakeDraft = {
    ...emptyDraft(),
    path: "acr",
    workspaceFlow: true,
    accountId: "acct_empty",
  };
  const emptyDesk = deskLineAfterAccountConsume(emptyLinked);
  assert.equal(emptyDesk.text, ACCOUNT_FILE_YOURS);
  assert.deepEqual(labels(emptyDesk.actions), ["Buy", "Refinance", "HELOC", "Jumbo", "Other"]);
  const emptyThread = withDeskLineAfterAccountConsume([fox("mail", ACCOUNT_EMAIL_SENT)], emptyDesk, emptyLinked);
  assert.equal(countLine(emptyThread, ACCOUNT_FILE_YOURS), 1);
  assert.equal(lastFox(emptyThread), ACCOUNT_FILE_YOURS);
  assert.deepEqual(labels(deskStripActions(emptyThread, emptyLinked)), [
    "Buy",
    "Refinance",
    "HELOC",
    "Jumbo",
    "Other",
  ]);

  const reprintedIntake: FoxMessage[] = [
    ...advanced,
    client("login-chip", LOGIN_LABEL),
    client("login-email", "61walk@onyxlending.com"),
    fox("occ-reprint", "How will the property be used?"),
    fox("val-reprint", HELOC_VALUE_ASK),
    fox("lien-reprint", HELOC_FIRST_LIEN_ASK),
  ];
  const intakeClean = withoutAccountResumeLeftovers(reprintedIntake, opened);
  assert.equal(countLine(intakeClean, ACCOUNT_FILE_YOURS), 1);
  assert.equal(countLine(intakeClean, "How will the property be used?"), 0);
  assert.equal(countLine(intakeClean, HELOC_VALUE_ASK), 0);
  assert.equal(countLine(intakeClean, HELOC_FIRST_LIEN_ASK), 0);
  assert.ok(!intakeClean.some((item) => item.role === "client" && item.text === LOGIN_LABEL));
  assert.ok(!intakeClean.some((item) => item.role === "client" && item.text === "61walk@onyxlending.com"));
  assert.equal(lastFox(intakeClean), ACCOUNT_FILE_YOURS);
  assert.ok(isLoginDoorUserBubble(LOGIN_LABEL));
  const afterIntake = withDeskLineAfterAccountConsume(reprintedIntake, desk, opened);
  assert.equal(lastFox(afterIntake), ACCOUNT_FILE_YOURS);
  assert.deepEqual(labels(deskStripActions(afterIntake, opened)), [
    "Ask Fox",
    "Upload more",
    "Request human",
  ]);

  assert.equal(hasLinkedAccount(opened), true);
  assert.equal(hasAccountHeader(opened, undefined), false);
  assert.equal(hasAccountHeader(opened, ""), false);
  assert.equal(hasAccountHeader(opened, "q1kw8sleujv7x0h3uyg8anif"), true);
  assert.equal(hasAccountHeader({ ...emptyDraft(), accountId: "acct_stale" }, ""), false);
  assert.equal(accountHeaderInitial(""), "Y");
  assert.equal(accountHeaderInitial("you@onyxlending.com"), "Y");

  const consumeSource = readFileSync(new URL("../components/fox/workspace.ts", import.meta.url), "utf8");
  assert.match(consumeSource, /export function withoutAccountResumeLeftovers/);
  assert.match(consumeSource, /function isLoginDoorLine/);
  assert.match(consumeSource, /export function intakeAskAlreadyAnswered/);
  assert.match(consumeSource, /ACCOUNT_LOGIN_ASK/);
  assert.doesNotMatch(
    consumeSource,
    /alreadySpoken && ask\.text !== ACCOUNT_FILE_YOURS \? ACCOUNT_FILE_YOURS/,
  );
  const persistSource = readFileSync(new URL("../lib/account/core.ts", import.meta.url), "utf8");
  assert.match(persistSource, /withoutLoginDoorFoxLines/);
  assert.match(persistSource, /Welcome back\. Email or phone for a code\?/);

  const accountSource = readFileSync(new URL("../components/fox/account.ts", import.meta.url), "utf8");
  assert.match(accountSource, /guestProceeded: true/);
  assert.match(accountSource, /export function hasAccountHeader/);
  assert.match(accountSource, /export function isLoginDoorUserBubble/);
  assert.match(accountSource, /export function accountResumeLastActions/);
  assert.match(accountSource, /SIGN_OUT_SAVE_FAILED/);

  const storeSource = readFileSync(new URL("../components/fox/store.ts", import.meta.url), "utf8");
  assert.match(storeSource, /export const SIGN_OUT_STORAGE_KEYS/);
  assert.match(storeSource, /onyx\.foxIntake\.draft/);
  assert.match(storeSource, /onyx\.fox\.messages/);
  assert.match(storeSource, /onyx\.fox\.account/);
  assert.match(storeSource, /onyx\.fox\.panelOpen/);
  assert.match(storeSource, /onyx\.fox\.sawLegal/);
  assert.match(storeSource, /onyx\.startPath/);
  assert.match(storeSource, /onyx\.homepageFresh/);
  assert.match(storeSource, /export const SIGN_OUT_COOKIE_NAMES/);
  assert.match(storeSource, /export const SIGN_OUT_SENTINEL_KEY = "onyx\.fox\.signedOut"/);
  assert.match(storeSource, /export async function persistLinkedAccountFileNow/);
  assert.match(storeSource, /export async function signOutLinkedAccount/);
  assert.match(storeSource, /SIGN_OUT_SAVE_FAILED/);
  assert.doesNotMatch(storeSource, /action:\s*"delete"/);
  assert.doesNotMatch(storeSource, /del\(|deleteAccount|removeAccountRecord/);

  const headerSource = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
  assert.match(headerSource, /Relationship desk/);
  assert.match(headerSource, /Sign out/);
  assert.match(headerSource, /hasAccountHeader/);
  assert.match(headerSource, /getAccountSessionToken/);
  assert.match(headerSource, /site-header--account/);
  assert.match(headerSource, /signOutLinkedAccount/);
  assert.match(headerSource, /site-header__initial/);
  assert.match(headerSource, /Log in/);
  assert.match(headerSource, /Start your relationship/);
  const headerCss = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");
  assert.match(headerCss, /\.site-header--account \.site-header__actions/);
  assert.doesNotMatch(headerCss, /:has\(\.site-header__initial\)/);

  const firstScreen = readFileSync(new URL("../components/fox/account.ts", import.meta.url), "utf8");
  assert.match(firstScreen, /export const ACCOUNT_FIRST_OFFER = "You can leave and come back to this desk\. Or keep going\."/);
  assert.equal(ACCOUNT_FIRST_OFFER, "You can leave and come back to this desk. Or keep going.");
  assert.equal(
    ACCOUNT_SAVE_ASK,
    "Save so this desk is yours on the next phone. Then I can send it to review.",
  );

  const hubUi = readFileSync(new URL("../components/fox/ProcessingHub.tsx", import.meta.url), "utf8");
  const hubLogic = readFileSync(new URL("../components/fox/processingHub.ts", import.meta.url), "utf8");
  const locate = readFileSync(new URL("../lib/account/server.ts", import.meta.url), "utf8");
  void hubUi;
  void hubLogic;
  void locate;
}

main();
