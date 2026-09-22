/**
 * Account side door on the first question. Email magic link or phone code.
 * Not now stays a browser sketch. Same File once they have an account.
 * Never print the token, magic-link URL, or phone code in the borrower thread.
 */
import {
  createAccountRecord,
  looksLikeAccountCode,
  looksLikeAccountEmail,
  looksLikeAccountPhone,
  magicLinkFor,
  persistAccountRecord,
  snapshotOf,
  type AccountChannel,
  type AccountRecord,
  type AccountSnapshot,
  type AccountStore,
} from "@/lib/account/core";
import type { Capture, FoxAction, FoxIntakeDraft, FoxMessage } from "./types";

export type AccountAsk = "offer" | "channel" | "email" | "phone" | "sent" | "code";

export const CREATE_ACCOUNT_LABEL = "Create account";
export const LOGIN_LABEL = "Log in";
export const NOT_NOW_LABEL = "Not now";
export const SAVE_THIS_FILE_LABEL = "Save this File";
export const ACCOUNT_WHY_SENTENCE =
  "This desk can come back — save so the File isn’t only this browser.";
export const ACCOUNT_CHANNEL_ASK = ACCOUNT_WHY_SENTENCE;
export const ACCOUNT_EMAIL_ASK = "What’s a good email? I’ll send a link for this File.";
export const ACCOUNT_PHONE_ASK = "What’s a good phone? I’ll send a code for this File.";
export const ACCOUNT_CODE_ASK = "What’s the 6-digit code from your phone?";
export const ACCOUNT_LOGIN_ASK =
  "Enter the 6-digit code from your phone, or open the link we emailed.";
export const ACCOUNT_SKIPPED_LINE = "Sketch stays on this browser. Create account anytime.";
export const ACCOUNT_SAVE_ASK =
  "Save this File so it isn’t only this browser. Then I can send it to review.";
export const ACCOUNT_EMAIL_SENT = "Check your email for a link to this File. Open it on any browser.";
export const ACCOUNT_PHONE_SENT = "I sent a code to your phone. Enter it here when it arrives.";

export function accountAskOf(draft: FoxIntakeDraft): AccountAsk | undefined {
  return draft.accountAsk;
}

export function hasLinkedAccount(draft: FoxIntakeDraft) {
  return Boolean(draft.accountId?.trim());
}

export function accountSaveAskOpen(draft: FoxIntakeDraft) {
  return Boolean(draft.accountSaveAsk) && !hasLinkedAccount(draft);
}

export function withLinkedAccount(draft: FoxIntakeDraft, accountId = "acct_leftover"): FoxIntakeDraft {
  return draft.accountId ? draft : { ...draft, accountId };
}

export function accountOfferOpen(draft: FoxIntakeDraft) {
  if (hasLinkedAccount(draft)) return false;
  const ask = accountAskOf(draft);
  if (accountSaveAskOpen(draft) && (!ask || ask === "offer")) return true;
  if (draft.accountSkipped) return false;
  return !ask || ask === "offer";
}

export function accountSideActions(draft: FoxIntakeDraft): FoxAction[] {
  if (hasLinkedAccount(draft) && accountAskOf(draft) !== "sent" && accountAskOf(draft) !== "code") {
    return [];
  }
  const ask = accountAskOf(draft);
  if (ask === "channel") {
    return [
      { id: "account-email", label: "Email", event: "bubble", capture: { field: "account-channel", value: "email" } },
      { id: "account-phone", label: "Phone", event: "bubble", capture: { field: "account-channel", value: "phone" } },
      {
        id: "skip-account",
        label: NOT_NOW_LABEL,
        event: "bubble",
        capture: { field: "skip-account" },
        quiet: true,
      },
    ];
  }
  if (ask === "email" || ask === "phone" || ask === "code") {
    return [
      {
        id: "skip-account",
        label: NOT_NOW_LABEL,
        event: "bubble",
        capture: { field: "skip-account" },
        quiet: true,
      },
    ];
  }
  if (ask === "sent") return [];
  if (!accountOfferOpen(draft)) return [];
  return [
    {
      id: "create-account",
      label: CREATE_ACCOUNT_LABEL,
      event: "bubble",
      capture: { field: "create-account" },
      quiet: true,
    },
    {
      id: "login-account",
      label: LOGIN_LABEL,
      event: "bubble",
      capture: { field: "login-account" },
      quiet: true,
    },
    {
      id: "skip-account",
      label: NOT_NOW_LABEL,
      event: "bubble",
      capture: { field: "skip-account" },
      quiet: true,
    },
  ];
}

export function applyAccountCapture(
  draft: FoxIntakeDraft,
  capture: Capture,
): FoxIntakeDraft {
  if (capture.field === "create-account" || capture.field === "save-this-file") {
    return {
      ...draft,
      accountAsk: "channel",
      accountSkipped: false,
      accountSaveAsk: draft.accountSaveAsk,
    };
  }
  if (capture.field === "login-account") {
    return { ...draft, accountAsk: "code", accountSkipped: false };
  }
  if (capture.field === "skip-account") {
    return { ...draft, accountAsk: undefined, accountSkipped: true };
  }
  if (capture.field === "account-channel") {
    const channel = capture.value === "phone" ? "phone" : "email";
    return { ...draft, accountAsk: channel, accountChannel: channel, accountSkipped: false };
  }
  if (capture.field === "account-email") {
    return { ...draft, accountAsk: "sent", accountChannel: "email", accountSkipped: false };
  }
  if (capture.field === "account-phone") {
    return { ...draft, accountAsk: "code", accountChannel: "phone", accountSkipped: false };
  }
  return draft;
}

export function accountWorkspaceReply(
  text: string,
  draft: FoxIntakeDraft,
): { text: string; actions?: FoxAction[]; capture?: Capture } | null {
  const q = text.trim();
  const lower = q.toLowerCase();
  const ask = accountAskOf(draft);
  if (/^create account$/i.test(q) || /^keep this file$/i.test(q) || /^save this file$/i.test(q)) {
    const next = { ...draft, accountAsk: "channel" as const };
    return {
      text: ACCOUNT_WHY_SENTENCE,
      actions: accountSideActions(next),
      capture: /^save this file$/i.test(q) ? { field: "save-this-file" } : { field: "create-account" },
    };
  }
  if (/^log in$/i.test(q)) {
    const next = { ...draft, accountAsk: "code" as const };
    return {
      text: ACCOUNT_LOGIN_ASK,
      actions: accountSideActions(next),
      capture: { field: "login-account" },
    };
  }
  if (
    (ask === "channel" || accountOfferOpen(draft) || ask === "email" || ask === "phone" || ask === "code") &&
    (/^not now$/i.test(q) || /^skip account$/i.test(q))
  ) {
    return {
      text: ACCOUNT_SKIPPED_LINE,
      capture: { field: "skip-account" },
    };
  }
  if (ask === "channel" && /^email$/i.test(q)) {
    return {
      text: ACCOUNT_EMAIL_ASK,
      actions: accountSideActions({ ...draft, accountAsk: "email" }),
      capture: { field: "account-channel", value: "email" },
    };
  }
  if (ask === "channel" && /^phone$/i.test(q)) {
    return {
      text: ACCOUNT_PHONE_ASK,
      actions: accountSideActions({ ...draft, accountAsk: "phone" }),
      capture: { field: "account-channel", value: "phone" },
    };
  }
  if (ask === "email" && looksLikeAccountEmail(q)) {
    return {
      text: accountSentCopy({ channel: "email" }),
      capture: { field: "account-email", value: q.trim() },
    };
  }
  if (ask === "phone" && looksLikeAccountPhone(q)) {
    return {
      text: accountSentCopy({ channel: "phone" }),
      capture: { field: "account-phone", value: q.trim() },
    };
  }
  if (ask === "code" && looksLikeAccountCode(q)) {
    return {
      text: "I’ll open that File.",
      capture: { field: "account-code", value: q.trim() },
    };
  }
  if (ask === "email" && !looksLikeAccountEmail(q) && !/^not now$/i.test(q)) {
    return { text: ACCOUNT_EMAIL_ASK, actions: accountSideActions(draft) };
  }
  if (ask === "phone" && !looksLikeAccountPhone(q) && !/^not now$/i.test(q)) {
    return { text: ACCOUNT_PHONE_ASK, actions: accountSideActions(draft) };
  }
  if (/google|ssn|social security|bntouch/i.test(lower) && (ask || accountOfferOpen(draft))) {
    return {
      text: "Email link or phone code. No Google. No SSN. This File is the source of truth.",
    };
  }
  return null;
}

export function accountSentCopy(input: { channel: AccountChannel; magicLink?: string; code?: string }) {
  void input.magicLink;
  void input.code;
  return input.channel === "phone" ? ACCOUNT_PHONE_SENT : ACCOUNT_EMAIL_SENT;
}

export function foxLineLeaksAccountSecret(text: string) {
  return (
    /\/start\?account=/i.test(text) ||
    /\/start\?code=/i.test(text) ||
    /account=[a-z0-9]{8,}/i.test(text) ||
    /\bCode \d{6}\b/.test(text)
  );
}

export function lastFoxLine(messages: FoxMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "fox" && messages[i]?.text?.trim()) return messages[i]!.text;
  }
  return "";
}

export function composerPlaceholderForAccount(draft: FoxIntakeDraft) {
  const ask = accountAskOf(draft);
  if (ask === "email") return "Email for this File";
  if (ask === "phone") return "Phone for this File";
  if (ask === "code") return "6-digit code";
  return "";
}

function withFileId(draft: FoxIntakeDraft): FoxIntakeDraft {
  const existing = draft.fileId?.trim();
  if (existing) return existing === draft.fileId ? draft : { ...draft, fileId: existing };
  return {
    ...draft,
    fileId: `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
  };
}

export function openAccountOnFile(
  store: AccountStore,
  draft: FoxIntakeDraft,
  messages: FoxMessage[],
  input: { email?: string; phone?: string },
): { draft: FoxIntakeDraft; record: AccountRecord; snapshot: AccountSnapshot } {
  const withId = withFileId(draft);
  const record = createAccountRecord({
    draft: withId,
    messages,
    fileId: withId.fileId!,
    email: input.email,
    phone: input.phone,
  });
  const nextDraft: FoxIntakeDraft = {
    ...withId,
    accountId: record.accountId,
    accountAsk: input.phone ? "code" : "sent",
    accountChannel: input.phone ? "phone" : "email",
    accountSkipped: false,
    accountSaveAsk: false,
  };
  const stored = persistAccountRecord(record, nextDraft, messages);
  store.put(stored);
  return { draft: nextDraft, record: stored, snapshot: snapshotOf(stored) };
}

export function writeAccountFile(
  store: AccountStore,
  token: string,
  draft: FoxIntakeDraft,
  messages: FoxMessage[],
) {
  const existing = store.getByToken(token);
  if (!existing) return undefined;
  const next = persistAccountRecord(existing, draft, messages);
  store.put(next);
  return snapshotOf(next);
}

export function applyAccountSaveAsk(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (hasLinkedAccount(draft)) return draft;
  return {
    ...draft,
    accountSaveAsk: true,
    accountAsk: "offer",
    pendingFinish: "proceed",
    docsOpen: false,
    correcting: null,
  };
}

export { magicLinkFor };
