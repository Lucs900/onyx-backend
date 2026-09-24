/**
 * Preview account. Email magic link or phone code.
 * Same person, same file_id on a second browser. Not Google. Not SSN. Not BNTouch.
 */
import type { FoxIntakeDraft, FoxMessage } from "@/components/fox/types";

export type AccountChannel = "email" | "phone";

export type AccountRecord = {
  accountId: string;
  fileId: string;
  email?: string;
  phone?: string;
  token: string;
  code?: string;
  draft: FoxIntakeDraft;
  messages: FoxMessage[];
  updatedAt: string;
};

export type AccountSnapshot = {
  fileId: string;
  accountId: string;
  draft: FoxIntakeDraft;
  messages: FoxMessage[];
  magicLink: string;
  code?: string;
};

export type AccountStore = {
  put(record: AccountRecord): void;
  getByToken(token: string): AccountRecord | undefined;
  getByCode(code: string): AccountRecord | undefined;
  getByFileId(fileId: string): AccountRecord | undefined;
  getByEmail(email: string): AccountRecord | undefined;
  getByPhone(phone: string): AccountRecord | undefined;
};

export const ACCOUNT_QUERY = "account";
export const CODE_QUERY = "code";
export const START_ACCOUNT_PATH = "/start";

export function magicLinkFor(token: string) {
  return `${START_ACCOUNT_PATH}?${ACCOUNT_QUERY}=${encodeURIComponent(token)}`;
}

export function phoneCodeLink(code: string) {
  return `${START_ACCOUNT_PATH}?${CODE_QUERY}=${encodeURIComponent(code)}`;
}

export function newAccountId() {
  return `acct_${randomToken(10)}`;
}

export function newMagicToken() {
  return randomToken(24);
}

export function newPhoneCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

function randomToken(bytes: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < bytes; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function looksLikeAccountEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function looksLikeAccountPhone(value: string) {
  return normalizePhone(value).length >= 10;
}

export function looksLikeAccountCode(value: string) {
  return /^\d{6}$/.test(value.trim());
}

export function snapshotOf(record: AccountRecord): AccountSnapshot {
  return {
    fileId: record.fileId,
    accountId: record.accountId,
    draft: record.draft,
    messages: record.messages,
    magicLink: magicLinkFor(record.token),
    code: record.code,
  };
}

export function createAccountRecord(input: {
  draft: FoxIntakeDraft;
  messages: FoxMessage[];
  fileId: string;
  email?: string;
  phone?: string;
  now?: Date;
}): AccountRecord {
  const email = input.email ? normalizeEmail(input.email) : undefined;
  const phone = input.phone ? normalizePhone(input.phone) : undefined;
  if (!email && !phone) {
    throw new Error("email or phone required");
  }
  return {
    accountId: newAccountId(),
    fileId: input.fileId,
    email,
    phone,
    token: newMagicToken(),
    code: phone ? newPhoneCode() : undefined,
    draft: { ...input.draft, fileId: input.fileId, accountId: undefined },
    messages: input.messages.map((item) => ({ ...item })),
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
}

export function persistAccountRecord(
  record: AccountRecord,
  draft: FoxIntakeDraft,
  messages: FoxMessage[],
  now = new Date(),
): AccountRecord {
  return {
    ...record,
    fileId: draft.fileId?.trim() || record.fileId,
    draft: { ...draft, fileId: draft.fileId?.trim() || record.fileId },
    messages: messages.map((item) => ({ ...item })),
    updatedAt: now.toISOString(),
  };
}

/** Written borrower facts — not a guest sketch or login tab. */
export function fileHasResumeFacts(draft?: FoxIntakeDraft | null) {
  if (!draft) return false;
  return Boolean(
    draft.productIntent ||
      (draft.propertyValueAmount ?? 0) > 0 ||
      (draft.firstLienAmount ?? 0) > 0 ||
      (draft.loanAmountValue ?? 0) > 0 ||
      draft.occupancyChoice?.value ||
      draft.propertyType ||
      draft.propertyZip ||
      Object.keys(draft.facts ?? {}).length > 0,
  );
}

/** Other-browser login must not replace the live File with an empty guest draft. */
export function shouldKeepLiveAccountDraft(
  existing: FoxIntakeDraft,
  incoming?: FoxIntakeDraft | null,
) {
  if (!incoming) return true;
  const existingId = existing.fileId?.trim();
  const incomingId = incoming.fileId?.trim();
  if (existingId && incomingId && existingId !== incomingId) return true;
  return fileHasResumeFacts(existing) && !fileHasResumeFacts(incoming);
}

function foxLineKey(message: FoxMessage) {
  return `${message.role}:${message.text.trim()}`;
}

/** Stale desk persist on refresh must not drop a staff foxLine the File already has. */
export function mergeAccountMessages(existing: FoxMessage[], incoming: FoxMessage[]) {
  if (!incoming.length) return existing.map((item) => ({ ...item }));
  if (!existing.length) return incoming.map((item) => ({ ...item }));
  const seen = new Set(incoming.map(foxLineKey));
  const extra = existing.filter((item) => !seen.has(foxLineKey(item)));
  if (!extra.length) return incoming.map((item) => ({ ...item }));
  return [...incoming, ...extra].map((item) => ({ ...item }));
}

export function persistLiveAccountRecord(
  record: AccountRecord,
  draft: FoxIntakeDraft,
  messages: FoxMessage[],
  now = new Date(),
): AccountRecord {
  if (shouldKeepLiveAccountDraft(record.draft, draft)) return record;
  return persistAccountRecord(record, draft, mergeAccountMessages(record.messages, messages), now);
}

export function memoryAccountStore(seed: AccountRecord[] = []): AccountStore {
  const byToken = new Map<string, AccountRecord>();
  const byCode = new Map<string, AccountRecord>();
  const byFile = new Map<string, AccountRecord>();
  const byEmail = new Map<string, AccountRecord>();
  const byPhone = new Map<string, AccountRecord>();
  function index(record: AccountRecord) {
    byToken.set(record.token, record);
    if (record.code) byCode.set(record.code, record);
    byFile.set(record.fileId, record);
    if (record.email) byEmail.set(record.email, record);
    if (record.phone) byPhone.set(record.phone, record);
  }
  for (const row of seed) index(row);
  return {
    put(record) {
      const prev = byToken.get(record.token);
      if (prev?.code && prev.code !== record.code) byCode.delete(prev.code);
      if (prev?.fileId && prev.fileId !== record.fileId) byFile.delete(prev.fileId);
      if (prev?.email && prev.email !== record.email) byEmail.delete(prev.email);
      if (prev?.phone && prev.phone !== record.phone) byPhone.delete(prev.phone);
      index(record);
    },
    getByToken(token) {
      return byToken.get(token.trim());
    },
    getByCode(code) {
      return byCode.get(code.trim());
    },
    getByFileId(fileId) {
      return byFile.get(fileId.trim());
    },
    getByEmail(email) {
      return byEmail.get(normalizeEmail(email));
    },
    getByPhone(phone) {
      return byPhone.get(normalizePhone(phone));
    },
  };
}

export function resumeFromStore(
  store: AccountStore,
  input: { token?: string; code?: string; fileId?: string; email?: string; phone?: string },
): AccountSnapshot | undefined {
  const record = input.token
    ? store.getByToken(input.token)
    : input.code
      ? store.getByCode(input.code)
      : input.fileId
        ? store.getByFileId(input.fileId)
        : input.email
          ? store.getByEmail(input.email)
          : input.phone
            ? store.getByPhone(input.phone)
            : undefined;
  return record ? snapshotOf(record) : undefined;
}
