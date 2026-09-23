/**
 * Account chapter. Create account · Log in · Not now on the first question.
 * Why-sentence before Email / Phone. Real send — never print token/URL in Fox speech.
 * Second browser resumes the same file_id. Proceed without account is not in_queue.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft, ensureFileId, getFoxDraft, loadIntakeDraft, startOverWorkspace } from "../components/fox/store";
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
  ACCOUNT_EMAIL_ASK,
  ACCOUNT_EMAIL_SENT,
  ACCOUNT_LOGIN_ASK,
  ACCOUNT_SEND_FAILED,
  ACCOUNT_PHONE_SENT,
  ACCOUNT_SAVE_ASK,
  ACCOUNT_SKIPPED_LINE,
  ACCOUNT_WHY_SENTENCE,
  CREATE_ACCOUNT_LABEL,
  LOGIN_LABEL,
  NOT_NOW_LABEL,
  SAVE_THIS_FILE_LABEL,
  accountHeaderActions,
  accountHomeActions,
  accountSaveAskOpen,
  accountSaveWallActions,
  accountSentCopy,
  accountSideActions,
  applyAccountCapture,
  applyAccountSaveAsk,
  foxLineLeaksAccountSecret,
  lastFoxLine,
  openAccountOnFile,
  withLinkedAccount,
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
import {
  ONYX_MAIL_FROM,
  PROTECTION_BYPASS_QUERY,
  SET_BYPASS_COOKIE_QUERY,
  SET_BYPASS_COOKIE_VALUE,
  absoluteMagicLink,
  accountMailEnv,
  accountOrigin,
  accountTokenFromLocation,
  isProtectedPreviewOrigin,
  isUniquePreviewOrigin,
  letterHasProtectionBypass,
  letterMagicLink,
  letterResumeOrigin,
  resolveMailFrom,
  sendAccountChannel,
} from "../lib/account/send";
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

async function main() {
  const first = firstQuestion();
  const greet = workspaceGreeting(first);
  assert.match(greet.text, /relationship file|Start a relationship|Buy/i);
  assert.deepEqual(labels(greet.actions), ["Buy", "Refinance", "HELOC", "Jumbo", "Other"]);
  assert.deepEqual(labels(accountSideActions(first)), [CREATE_ACCOUNT_LABEL, LOGIN_LABEL, NOT_NOW_LABEL]);
  assert.deepEqual(labels(accountHeaderActions(first)), [CREATE_ACCOUNT_LABEL, LOGIN_LABEL]);
  assert.deepEqual(labels(accountHomeActions(first)), [CREATE_ACCOUNT_LABEL, LOGIN_LABEL]);
  assert.ok(!labels(accountHeaderActions(first)).includes(NOT_NOW_LABEL));
  assert.ok(!labels(deskStripActions([{ id: "g", role: "fox", text: greet.text }], first)).includes(CREATE_ACCOUNT_LABEL));
  const midWalk = houseReady(writePurchasePrice(firstQuestion(), 500_000));
  assert.deepEqual(labels(accountSideActions(midWalk)), []);
  assert.deepEqual(labels(accountHeaderActions(midWalk)), [CREATE_ACCOUNT_LABEL, LOGIN_LABEL]);
  assert.ok(!labels(accountHeaderActions(midWalk)).includes(NOT_NOW_LABEL));
  assert.ok(!labels(deskStripActions([{ id: "v", role: "fox", text: "What’s the property value?" }], midWalk)).includes(CREATE_ACCOUNT_LABEL));

  const create = workspaceReply("Create account", first);
  assert.equal(create?.capture?.field, "create-account");
  assert.equal(create?.text, "So this File can find you on another phone — not stuck in this tab.");
  assert.equal(create?.text, ACCOUNT_WHY_SENTENCE);
  assert.ok(!foxLineLeaksAccountSecret(create?.text ?? ""));
  const afterCreate = applyAccountCapture(first, { field: "create-account" });
  assert.equal(afterCreate.accountAsk, "channel");
  assert.deepEqual(labels(accountSideActions(afterCreate)), ["Email", "Phone", NOT_NOW_LABEL]);

  const login = workspaceReply("Log in", first);
  assert.equal(login?.capture?.field, "login-account");
  assert.equal(login?.text, "Welcome back. Email or phone for a code?");
  assert.equal(login?.text, ACCOUNT_LOGIN_ASK);
  assert.ok(!foxLineLeaksAccountSecret(login?.text ?? ""));
  const afterLogin = applyAccountCapture(first, { field: "login-account" });
  assert.equal(afterLogin.accountAsk, "channel");
  assert.deepEqual(labels(accountSideActions(afterLogin)), ["Email", "Phone", NOT_NOW_LABEL]);

  const skip = workspaceReply("Not now", first);
  assert.equal(skip?.capture?.field, "skip-account");
  assert.equal(skip?.text, ACCOUNT_SKIPPED_LINE);
  const skipped = applyAccountCapture(first, { field: "skip-account" });
  assert.equal(skipped.accountSkipped, true);
  assert.deepEqual(labels(accountSideActions(skipped)), []);

  const afterEmail = applyAccountCapture(afterCreate, { field: "account-channel", value: "email" });
  assert.equal(afterEmail.accountAsk, "email");
  const emailAsk = workspaceReply("Email", afterCreate);
  assert.equal(emailAsk?.text, "Where should I send the sign-in link?");
  assert.equal(emailAsk?.text, ACCOUNT_EMAIL_ASK);
  assert.deepEqual(labels(accountSideActions(afterEmail)), ["Phone", NOT_NOW_LABEL]);
  assert.ok(labels(accountSideActions(afterEmail)).includes("Phone"));
  assert.notEqual(labels(accountSideActions(afterEmail)), [NOT_NOW_LABEL]);
  const emailTyped = workspaceReply("borrower@example.com", afterEmail);
  assert.equal(emailTyped?.capture?.field, "account-email");
  assert.equal(emailTyped?.text, ACCOUNT_EMAIL_SENT);
  assert.ok(!foxLineLeaksAccountSecret(emailTyped?.text ?? ""));
  assert.doesNotMatch(emailTyped?.text ?? "", /\/start\?account=/);

  const spokenEmail = accountSentCopy({
    channel: "email",
    magicLink: "/start?account=secret-token-must-not-print",
    code: "123456",
  });
  const spokenPhone = accountSentCopy({ channel: "phone", magicLink: "/start?account=nope", code: "654321" });
  assert.equal(spokenEmail, ACCOUNT_EMAIL_SENT);
  assert.equal(spokenPhone, ACCOUNT_PHONE_SENT);
  assert.ok(!foxLineLeaksAccountSecret(spokenEmail));
  assert.ok(!foxLineLeaksAccountSecret(spokenPhone));

  const store = memoryAccountStore();
  const messages: FoxMessage[] = [{ id: "fox-1", role: "fox", text: greet.text }];
  const opened = openAccountOnFile(store, first, messages, { email: "borrower@example.com" });
  assert.ok(opened.draft.fileId);
  assert.ok(opened.draft.accountId);
  assert.match(opened.snapshot.magicLink, /^\/start\?account=/);
  assert.equal(opened.snapshot.fileId, opened.draft.fileId);
  const threadAfterOpen = lastFoxLine(messages);
  assert.ok(!foxLineLeaksAccountSecret(threadAfterOpen));

  const second = resumeFromStore(store, { token: opened.record.token });
  assert.ok(second);
  assert.equal(second.fileId, opened.draft.fileId);
  assert.equal(JSON.stringify(previewFacts(second.draft)), JSON.stringify(previewFacts(opened.draft)));
  assert.equal(lastFoxLine(second.messages), lastFoxLine(messages));

  const phoneStore = memoryAccountStore();
  const phone = openAccountOnFile(phoneStore, first, messages, { phone: "4155551212" });
  assert.ok(phone.snapshot.code);
  assert.match(phone.snapshot.code ?? "", /^\d{6}$/);
  assert.ok(!foxLineLeaksAccountSecret(accountSentCopy({ channel: "phone", code: phone.snapshot.code })));
  const byCode = resumeFromStore(phoneStore, { code: phone.snapshot.code });
  assert.equal(byCode?.fileId, phone.draft.fileId);

  const emptySecond: FoxIntakeDraft = emptyDraft();
  assert.notEqual(emptySecond.fileId, opened.draft.fileId);
  const resumedEmpty = resumeFromStore(store, { token: opened.record.token });
  assert.equal(resumedEmpty?.fileId, opened.draft.fileId);

  const prevApp = process.env.NEXT_PUBLIC_APP_URL;
  const prevProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const prevResume = process.env.ACCOUNT_RESUME_ORIGIN;
  const prevResumeAlt = process.env.ONYX_RESUME_ORIGIN;
  const prevFrom = process.env.RESEND_FROM;
  process.env.NEXT_PUBLIC_APP_URL = "https://onyx-backend-ten.vercel.app";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "onyx-backend-ten.vercel.app";
  delete process.env.ACCOUNT_RESUME_ORIGIN;
  delete process.env.ONYX_RESUME_ORIGIN;
  const uniqueHost = "https://onyx-backend-cgbg9w71v-onyx-direct.vercel.app";
  const fromOrigin = accountOrigin(
    new Request(`${uniqueHost}/api/account`, { headers: { origin: uniqueHost } }),
  );
  const fromForward = accountOrigin(
    new Request("https://onyx-backend-ten.vercel.app/api/account", {
      headers: {
        "x-forwarded-host": "onyx-backend-cgbg9w71v-onyx-direct.vercel.app",
        "x-forwarded-proto": "https",
      },
    }),
  );
  assert.equal(fromOrigin, uniqueHost);
  assert.equal(fromForward, uniqueHost);
  assert.doesNotMatch(fromOrigin, /onyx-backend-ten/);
  assert.doesNotMatch(absoluteMagicLink("tok", fromOrigin), /onyx-backend-ten/);
  assert.match(absoluteMagicLink("tok", fromOrigin), /^https:\/\/onyx-backend-cgbg9w71v-onyx-direct\.vercel\.app\/start\?account=tok$/);
  const prevBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const prevBypassAlt = process.env.VERCEL_PROTECTION_BYPASS_SECRET;
  delete process.env.VERCEL_PROTECTION_BYPASS_SECRET;
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET = "leftover-bypass-secret";
  const letter = letterMagicLink("tok", fromOrigin);
  assert.ok(letterHasProtectionBypass(letter));
  assert.match(letter, new RegExp(`[?&]${PROTECTION_BYPASS_QUERY}=leftover-bypass-secret`));
  assert.match(letter, new RegExp(`[?&]${SET_BYPASS_COOKIE_QUERY}=${SET_BYPASS_COOKIE_VALUE}`));
  const letterUrl = new URL(letter);
  assert.equal(accountTokenFromLocation(letterUrl.search, letterUrl.hash), "tok");
  assert.equal(
    accountTokenFromLocation("x-vercel-protection-bypass=nope&x-vercel-set-bypass-cookie=true&account=kept-token", ""),
    "kept-token",
  );
  assert.equal(accountTokenFromLocation("x-vercel-protection-bypass=nope", "#account=from-hash"), "from-hash");
  assert.doesNotMatch(absoluteMagicLink("tok", fromOrigin), /x-vercel-protection-bypass/);
  assert.doesNotMatch(absoluteMagicLink("tok", fromOrigin), /x-vercel-set-bypass-cookie/);
  assert.equal(opened.snapshot.magicLink, `/start?account=${opened.record.token}`);
  assert.doesNotMatch(opened.snapshot.magicLink, /x-vercel-protection-bypass/);
  assert.doesNotMatch(opened.snapshot.magicLink, /x-vercel-set-bypass-cookie/);
  assert.ok(foxLineLeaksAccountSecret(letter));
  assert.ok(foxLineLeaksAccountSecret(`Open ${letter}`));
  assert.ok(!foxLineLeaksAccountSecret(ACCOUNT_EMAIL_SENT));
  assert.ok(!foxLineLeaksAccountSecret(spokenEmail));
  assert.doesNotMatch(letter, /onyx-backend-ten/);
  assert.ok(isUniquePreviewOrigin(fromOrigin));
  assert.ok(isProtectedPreviewOrigin(fromOrigin));
  assert.equal(letterResumeOrigin(fromOrigin), fromOrigin);
  assert.doesNotMatch(letterResumeOrigin(fromOrigin), /onyx-backend-ten/);
  process.env.ACCOUNT_RESUME_ORIGIN = "https://desk.onyxdirect.com";
  const publicResume = letterResumeOrigin(fromOrigin);
  assert.equal(publicResume, "https://desk.onyxdirect.com");
  assert.ok(!isProtectedPreviewOrigin(publicResume));
  const publicLetter = letterMagicLink("tok", publicResume);
  assert.equal(publicLetter, "https://desk.onyxdirect.com/start?account=tok");
  assert.ok(!letterHasProtectionBypass(publicLetter));
  assert.doesNotMatch(publicLetter, /x-vercel-protection-bypass|x-vercel-set-bypass-cookie|vercel\.app|onyx-backend-ten/);
  delete process.env.ACCOUNT_RESUME_ORIGIN;
  assert.equal(ONYX_MAIL_FROM, "ONYX Direct <lucas@onyxdirect.com>");
  process.env.RESEND_FROM = "ONYX <james.b@example.com>";
  assert.equal(resolveMailFrom(process.env.RESEND_FROM), ONYX_MAIL_FROM);
  assert.equal(accountMailEnv().resendFrom, ONYX_MAIL_FROM);
  assert.equal(resolveMailFrom("ONYX Direct <lucas@onyxdirect.com>"), ONYX_MAIL_FROM);
  delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const letterDark = letterMagicLink("tok", fromOrigin);
  assert.equal(letterDark, absoluteMagicLink("tok", fromOrigin));
  assert.ok(!letterHasProtectionBypass(letterDark));
  if (prevBypass === undefined) delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  else process.env.VERCEL_AUTOMATION_BYPASS_SECRET = prevBypass;
  if (prevBypassAlt === undefined) delete process.env.VERCEL_PROTECTION_BYPASS_SECRET;
  else process.env.VERCEL_PROTECTION_BYPASS_SECRET = prevBypassAlt;
  if (prevApp === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = prevApp;
  if (prevProd === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = prevProd;
  if (prevResume === undefined) delete process.env.ACCOUNT_RESUME_ORIGIN;
  else process.env.ACCOUNT_RESUME_ORIGIN = prevResume;
  if (prevResumeAlt === undefined) delete process.env.ONYX_RESUME_ORIGIN;
  else process.env.ONYX_RESUME_ORIGIN = prevResumeAlt;
  if (prevFrom === undefined) delete process.env.RESEND_FROM;
  else process.env.RESEND_FROM = prevFrom;

  const sendDry = await sendAccountChannel({
    channel: "email",
    email: "borrower@example.com",
    token: opened.record.token,
    origin: "https://preview.example",
  });
  assert.equal(typeof sendDry.sent, "boolean");
  if (!process.env.RESEND_API_KEY) {
    assert.equal(sendDry.sent, false);
    assert.ok(sendDry.reason === "no_resend" || sendDry.reason === "no_provider" || sendDry.reason === "bad_from");
  }
  assert.ok(!foxLineLeaksAccountSecret(ACCOUNT_SEND_FAILED));
  assert.doesNotMatch(ACCOUNT_SEND_FAILED, /check your email/i);

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

  const sketch = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(ensureFileId(firstQuestion()), 500_000), 400_000), 50_000),
  );
  const notNow = applyAccountCapture(sketch, { field: "skip-account" });
  const unsaved = justMeSkipProceed(notNow);
  assert.notEqual(unsaved.motion, "in_queue");
  assert.equal(accountSaveAskOpen(unsaved), true);
  assert.equal(unsaved.accountSaveAsk, true);
  assert.equal(
    ACCOUNT_SAVE_ASK,
    "Save so this desk is yours on the next phone. Then I can send it to review.",
  );
  assert.doesNotMatch(ACCOUNT_SAVE_ASK, /isn’t only this browser|isn.t only this browser/);
  assert.equal(nextFoxAsk(unsaved).text, ACCOUNT_SAVE_ASK);
  assert.deepEqual(labels(accountSaveWallActions(unsaved)), [
    CREATE_ACCOUNT_LABEL,
    LOGIN_LABEL,
    NOT_NOW_LABEL,
    "Request human",
  ]);
  assert.deepEqual(labels(finishLineActions(unsaved)), [
    CREATE_ACCOUNT_LABEL,
    LOGIN_LABEL,
    NOT_NOW_LABEL,
    "Request human",
  ]);
  assert.deepEqual(
    labels(deskStripActions([{ id: "save", role: "fox", text: ACCOUNT_SAVE_ASK }], unsaved)),
    [CREATE_ACCOUNT_LABEL, LOGIN_LABEL, NOT_NOW_LABEL, "Request human"],
  );
  assert.ok(!labels(finishLineActions(unsaved)).includes("Proceed"));
  assert.ok(!labels(finishLineActions(unsaved)).includes("Not yet"));
  assert.ok(!labels(finishLineActions(unsaved)).includes("Upload more"));
  assert.ok(!labels(accountHeaderActions(unsaved)).includes(NOT_NOW_LABEL));
  assert.ok(labels(accountSideActions(unsaved)).includes(CREATE_ACCOUNT_LABEL));
  assert.ok(labels(accountSideActions(unsaved)).includes(LOGIN_LABEL));
  assert.ok(labels(accountSideActions(unsaved)).includes(NOT_NOW_LABEL));
  const savePad = applyAccountCapture(unsaved, { field: "save-this-file" });
  assert.equal(savePad.accountAsk, "channel");
  assert.equal(savePad.motion, unsaved.motion);
  assert.notEqual(savePad.motion, "in_queue");
  assert.equal(SAVE_THIS_FILE_LABEL, "Save this File");
  const padSource = readFileSync(new URL("../components/fox/FilePreview.tsx", import.meta.url), "utf8");
  assert.match(padSource, /SAVE_THIS_FILE_LABEL/);
  assert.doesNotMatch(padSource, /accountSaveWallActions|CREATE_ACCOUNT_LABEL|Create account/);
  assert.doesNotMatch(padSource, /LOGIN_LABEL|NOT_NOW_LABEL/);
  const parked = applyAccountSaveAsk(notNow);
  assert.notEqual(parked.motion, "in_queue");
  assert.deepEqual(labels(accountHomeActions(unsaved)), [CREATE_ACCOUNT_LABEL, LOGIN_LABEL]);
  const looksOnly = applyLooksRightMotion(
    skipCurrentInvite(
      skipWageDocs(
        skipMonthlyDebts(
          writeWhoOnLoan(
            {
              ...applyCouponChoice(
                withHelocToolQuote(sketch),
                "this",
              ),
              incomeAsked: true,
              incomeType: { ...emptyDraft().incomeType, value: "w2" },
            },
            "just-me",
          ),
        ),
      ),
    ),
  );
  const saveReply = workspaceReply("Proceed", looksOnly);
  assert.equal(saveReply?.text, ACCOUNT_SAVE_ASK);
  assert.deepEqual(labels(saveReply?.actions), [
    CREATE_ACCOUNT_LABEL,
    LOGIN_LABEL,
    NOT_NOW_LABEL,
    "Request human",
  ]);
  const keepTalking = applyAccountCapture(unsaved, { field: "skip-account" });
  assert.equal(keepTalking.accountSkipped, true);
  assert.equal(keepTalking.accountSaveAsk, false);
  assert.notEqual(keepTalking.motion, "in_queue");
  const hubUnsaved = processingHubView(unsaved);
  assert.notEqual(hubUnsaved.state.status, "gathering");
  assert.equal(hubUnsaved.state.rows.find((row) => row.id === "status")?.value, "preparing");
  loadIntakeDraft(withLinkedAccount(unsaved, opened.draft.accountId));
  const oldFileId = getFoxDraft().fileId;
  const wiped = startOverWorkspace("acr");
  assert.equal(wiped.accountId, opened.draft.accountId);
  assert.notEqual(wiped.fileId, oldFileId);
  assert.equal(wiped.productIntent, undefined);
  const accounted = justMeSkipProceed(withLinkedAccount(notNow));
  assert.equal(accounted.motion, "in_queue");

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

  const blob = JSON.stringify({ hub, opened: { fileId: opened.draft.fileId }, returned: { fileId: returned?.fileId } });
  assert.doesNotMatch(blob, /Google-required|SSN login|BNTouch as source|invite-reward/i);
  assert.doesNotMatch(spokenEmail + spokenPhone + (emailTyped?.text ?? ""), /\/start\?account=/);

  const notNowStore = memoryAccountStore();
  assert.equal(notNowStore.getByFileId(first.fileId ?? "none"), undefined);

  console.log(
    `assert-account-chapter: first chips Create account · Log in · Not now; why-sentence; no token in thread; save-ask not in_queue; with account in_queue ${opened.draft.fileId}`,
  );
}

void main();
