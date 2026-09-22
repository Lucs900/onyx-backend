/**
 * Account side door on the first question. Email magic link or phone code.
 * Not now stays a browser sketch. Same File once they have an account.
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
export const NOT_NOW_LABEL = "Not now";
export const ACCOUNT_CHANNEL_ASK = "Email or phone? Same File on another browser.";
export const ACCOUNT_EMAIL_ASK = "What’s a good email? I’ll send a link for this File.";
export const ACCOUNT_PHONE_ASK = "What’s a good phone? I’ll send a code for this File.";
export const ACCOUNT_CODE_ASK = "What’s the 6-digit code?";
export const ACCOUNT_SKIPPED_LINE = "Sketch stays on this browser. Create account anytime.";

export function accountAskOf(draft: FoxIntakeDraft): AccountAsk | undefined {
  return draft.accountAsk;
}

export function accountOfferOpen(draft: FoxIntakeDraft) {
  if (draft.accountId) return false;
  if (draft.accountSkipped) return false;
  const ask = accountAskOf(draft);
  return !ask || ask === "offer";
}

export function accountSideActions(draft: FoxIntakeDraft): FoxAction[] {
  if (draft.accountId && accountAskOf(draft) !== "sent") return [];
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
  if (capture.field === "create-account") {
    return { ...draft, accountAsk: "channel", accountSkipped: false };
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
    return { ...draft, accountAsk: "sent", accountChannel: "phone", accountSkipped: false };
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
  if (/^create account$/i.test(q) || /^keep this file$/i.test(q)) {
    return {
      text: ACCOUNT_CHANNEL_ASK,
      actions: applyAccountCapture(draft, { field: "create-account" })
        ? accountSideActions({ ...draft, accountAsk: "channel" })
        : [],
      capture: { field: "create-account" },
    };
  }
  if (
    (ask === "channel" || accountOfferOpen(draft) || ask === "email" || ask === "phone") &&
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
      capture: { field: "account-channel", value: "email" },
    };
  }
  if (ask === "channel" && /^phone$/i.test(q)) {
    return {
      text: ACCOUNT_PHONE_ASK,
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
    return { text: ACCOUNT_EMAIL_ASK };
  }
  if (ask === "phone" && !looksLikeAccountPhone(q) && !/^not now$/i.test(q)) {
    return { text: ACCOUNT_PHONE_ASK };
  }
  if (/google|ssn|social security|bntouch/i.test(lower) && (ask || accountOfferOpen(draft))) {
    return {
      text: "Email link or phone code. No Google. No SSN. This File is the source of truth.",
    };
  }
  return null;
}

export function accountSentCopy(input: {
  channel: AccountChannel;
  magicLink?: string;
  code?: string;
}) {
  if (input.channel === "phone") {
    return input.code
      ? `Code ${input.code}. Open /start on another browser and enter it. Same file_id.`
      : "I’ll send a code. Open /start on another browser and enter it. Same file_id.";
  }
  return input.magicLink
    ? `Open ${input.magicLink} on another browser. Same file_id.`
    : "I’ll send a link. Open it on another browser. Same file_id.";
}

export function lastFoxLine(messages: FoxMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "fox" && messages[i]?.text?.trim()) return messages[i]!.text;
  }
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
    accountAsk: "sent",
    accountChannel: input.phone ? "phone" : "email",
    accountSkipped: false,
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

export { magicLinkFor };
