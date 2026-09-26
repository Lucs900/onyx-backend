/**
 * Preview account. Email magic link or phone code.
 * Same person, same file_id on a second browser. Not Google. Not SSN. Not BNTouch.
 */
import { stripHelocLineFromOtherLoans } from "@/components/fox/calculators";
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
  email?: string;
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
    messages: stripWalkTestMessages(record.messages),
    magicLink: magicLinkFor(record.token),
    code: record.code,
    email: record.email,
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

function hasAmount(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function pickAmount(existing?: number | null, incoming?: number | null) {
  if (hasAmount(incoming)) return incoming ?? undefined;
  if (hasAmount(existing)) return existing ?? undefined;
  return undefined;
}

function pickText(existing?: string | null, incoming?: string | null) {
  const next = incoming?.trim();
  if (next) return next;
  const keep = existing?.trim();
  return keep || undefined;
}

/** Stale mid-file persist must not blank Lien / Line / Credit already on the File. */
export function mergeFileDraft(existing: FoxIntakeDraft, incoming: FoxIntakeDraft): FoxIntakeDraft {
  const firstLienAmount = pickAmount(existing.firstLienAmount, incoming.firstLienAmount);
  const loanAmountValue = pickAmount(existing.loanAmountValue, incoming.loanAmountValue);
  const propertyValueAmount = pickAmount(existing.propertyValueAmount, incoming.propertyValueAmount);
  const creditBand = pickText(existing.creditBand, incoming.creditBand);
  const propertyType = pickText(existing.propertyType, incoming.propertyType);
  const propertyZip = pickText(existing.propertyZip, incoming.propertyZip);
  const whoOnLoan = pickText(existing.whoOnLoan, incoming.whoOnLoan);
  const productIntent = incoming.productIntent || existing.productIntent;
  const occupancyValue = incoming.occupancyChoice?.value || existing.occupancyChoice?.value;
  const liveQuote = incoming.liveQuote ?? existing.liveQuote;
  const merged: FoxIntakeDraft = {
    ...existing,
    ...incoming,
    productIntent,
    propertyValueAmount,
    firstLienAmount,
    firstLienAsked: Boolean(incoming.firstLienAsked || existing.firstLienAsked || hasAmount(firstLienAmount)),
    loanAmountValue,
    amountAsked: Boolean(incoming.amountAsked || existing.amountAsked || hasAmount(loanAmountValue)),
    helocLineAsked: Boolean(incoming.helocLineAsked || existing.helocLineAsked || hasAmount(loanAmountValue)),
    creditBand,
    creditAsked: Boolean(incoming.creditAsked || existing.creditAsked || creditBand),
    propertyType: propertyType as FoxIntakeDraft["propertyType"],
    propertyTypeAsked: Boolean(incoming.propertyTypeAsked || existing.propertyTypeAsked || propertyType),
    propertyZip,
    propertyZipAsked: Boolean(incoming.propertyZipAsked || existing.propertyZipAsked || propertyZip),
    whoOnLoan: whoOnLoan as FoxIntakeDraft["whoOnLoan"],
    whoOnLoanAsked: Boolean(incoming.whoOnLoanAsked || existing.whoOnLoanAsked || whoOnLoan),
    occupancyChoice: occupancyValue
      ? { ...(incoming.occupancyChoice ?? existing.occupancyChoice), value: occupancyValue }
      : incoming.occupancyChoice ?? existing.occupancyChoice,
    liveQuote,
    liveQuoteKey: incoming.liveQuoteKey ?? existing.liveQuoteKey,
    liveQuoteStatus: incoming.liveQuoteStatus ?? existing.liveQuoteStatus,
    liveCouponSettled: Boolean(incoming.liveCouponSettled || existing.liveCouponSettled),
    incomeType: incoming.incomeType?.value ? incoming.incomeType : existing.incomeType,
    incomeAsked: Boolean(incoming.incomeAsked || existing.incomeAsked),
  };
  return stripHelocLineFromOtherLoans(merged);
}

export const STAFF_DESK_FACT_ID = "staff-desk";

export function staffDeskMessageFact() {
  return { id: STAFF_DESK_FACT_ID, label: "staff", value: "desk" };
}

function foxLineKey(message: FoxMessage) {
  return `${message.role}:${message.text.trim()}`;
}

export function isWalkTestFoxLine(text: string) {
  const line = text.trim();
  if (!line) return false;
  if (line === "Refresh must paint this staff line.") return true;
  return /\(mufw[a-z0-9]+\)$/i.test(line);
}

export function stripWalkTestMessages(messages: FoxMessage[]) {
  return messages.filter((item) => !isWalkTestFoxLine(item.text));
}

export function isStaffDeskMessage(message: FoxMessage, draft?: FoxIntakeDraft | null) {
  if (message.role !== "fox") return false;
  if (message.facts?.some((fact) => fact.id === STAFF_DESK_FACT_ID)) return true;
  const text = message.text.trim();
  if (!text) return false;
  return (draft?.events ?? []).some(
    (event) =>
      event.kind === "staff-desk" &&
      (event.text.trim() === text || (event.summary ?? "").trim() === text),
  );
}

function isLoginDoorFoxLine(text: string) {
  const line = text.trim();
  return (
    line === "Welcome back. Email or phone for a code?" ||
    line === "Where should I send the sign-in link?" ||
    line === "What’s a good phone? I’ll send a code for this File." ||
    line === "What’s the 6-digit code from your phone?" ||
    line === "Sketch stays on this browser. Create account anytime."
  );
}

function isSignedInThreadLeftoverFoxLine(text: string) {
  const line = text.trim();
  if (!line) return false;
  if (/check your email for a link to this file/i.test(line)) return true;
  if (/you can leave and come back/i.test(line)) return true;
  return false;
}

function isLoginDoorClientLine(text: string) {
  const line = text.trim();
  if (!line) return false;
  if (/^log in$/i.test(line) || /^email$/i.test(line) || /^phone$/i.test(line)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line)) return true;
  if (/^\d{6}$/.test(line)) return true;
  if (line.replace(/\D/g, "").length >= 10) return true;
  return false;
}

function withoutLoginDoorFoxLines(messages: FoxMessage[]) {
  return messages.filter((item) => {
    if (item.role === "fox") {
      return !isLoginDoorFoxLine(item.text) && !isSignedInThreadLeftoverFoxLine(item.text);
    }
    if (item.role === "client") return !isLoginDoorClientLine(item.text);
    return true;
  });
}

function threadHasFileYours(messages: FoxMessage[]) {
  return messages.some((item) => item.role === "fox" && item.text.trim() === "This File is yours.");
}

/** Stale desk persist must not drop staff foxLines. Staff lines are append-only. */
export function mergeAccountMessages(
  existing: FoxMessage[],
  incoming: FoxMessage[],
  draft?: FoxIntakeDraft | null,
) {
  const liveFile = fileHasResumeFacts(draft) || threadHasFileYours(existing) || threadHasFileYours(incoming);
  const keptExisting = stripWalkTestMessages(existing);
  const keptIncoming = stripWalkTestMessages(
    liveFile ? withoutLoginDoorFoxLines(incoming) : incoming,
  );
  if (!keptIncoming.length) return keptExisting.map((item) => ({ ...item }));
  if (!keptExisting.length) return keptIncoming.map((item) => ({ ...item }));
  const seenId = new Set(keptIncoming.map((item) => item.id).filter(Boolean));
  const seenKey = new Set(keptIncoming.map(foxLineKey));
  const extra = (liveFile ? withoutLoginDoorFoxLines(keptExisting) : keptExisting).filter((item) => {
    if (item.id && seenId.has(item.id)) return false;
    if (seenKey.has(foxLineKey(item))) return false;
    return true;
  });
  const staff = extra.filter((item) => isStaffDeskMessage(item, draft));
  const other = extra.filter((item) => !isStaffDeskMessage(item, draft));
  const merged = [...keptIncoming, ...other, ...staff];
  return merged.map((item) => ({ ...item }));
}

export function persistLiveAccountRecord(
  record: AccountRecord,
  draft: FoxIntakeDraft,
  messages: FoxMessage[],
  now = new Date(),
): AccountRecord {
  if (shouldKeepLiveAccountDraft(record.draft, draft)) {
    const cleaned = stripWalkTestMessages(record.messages);
    if (cleaned.length === record.messages.length) return record;
    return persistAccountRecord(record, record.draft, cleaned, now);
  }
  return persistAccountRecord(
    record,
    mergeFileDraft(record.draft, draft),
    mergeAccountMessages(record.messages, messages, record.draft),
    now,
  );
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
