/**
 * Preview File store for account resume. Blob when provisioned; memory for leftover / local.
 * Not BNTouch. Not a public domain cutover.
 */
import { get, list, put } from "@vercel/blob";
import { serverBlobReady } from "@/lib/docs/storage";
import type { AccountRecord, AccountStore } from "./core";
import {
  accountFileHasStoredContent,
  memoryAccountStore,
  normalizeEmail,
  normalizePhone,
  shouldKeepLiveAccountDraft,
} from "./core";

const memory = memoryAccountStore();

declare global {
  // eslint-disable-next-line no-var
  var __onyxAccountMemory: AccountStore | undefined;
}

function processStore(): AccountStore {
  if (!globalThis.__onyxAccountMemory) {
    globalThis.__onyxAccountMemory = memory;
  }
  return globalThis.__onyxAccountMemory;
}

function tokenPath(token: string) {
  return `account/token/${token}.json`;
}

function codePath(code: string) {
  return `account/code/${code}.json`;
}

function filePath(fileId: string) {
  return `account/file/${fileId}.json`;
}

function emailPath(email: string) {
  return `account/email/${encodeURIComponent(normalizeEmail(email))}.json`;
}

function phonePath(phone: string) {
  return `account/phone/${normalizePhone(phone)}.json`;
}

export type AccountLocateReason =
  | "memory"
  | "exact_key"
  | "prefix_list"
  | "account_scan"
  | "listed_no_parse"
  | "not_in_blob"
  | "blob_not_ready";

export type AccountWageHit = {
  pathname: string;
  fileId: string;
  borrowerName?: string;
  w2_box5?: unknown;
  qualifying_income?: unknown;
};

export type AccountLocate = {
  record?: AccountRecord;
  exactPath: string;
  listed: string[];
  docsListed: string[];
  storedAt?: string;
  reason: AccountLocateReason;
  storeReady: boolean;
  prefixCounts: Record<string, number>;
  listError?: string;
  wageHits: AccountWageHit[];
};

function wageHitFrom(record: AccountRecord, pathname: string): AccountWageHit | undefined {
  const name = String(
    record.draft.borrowerName ??
      record.draft.contact?.fullName?.value ??
      record.draft.facts?.full_name?.value ??
      "",
  ).trim();
  const box5 = record.draft.facts?.w2_box5;
  const qi = record.draft.facts?.qualifying_income;
  if (!box5 && !qi && !/raymond/i.test(name)) return undefined;
  return {
    pathname,
    fileId: record.fileId,
    borrowerName: name || undefined,
    w2_box5: box5,
    qualifying_income: qi,
  };
}

function asAccountRecord(parsed: unknown, expectedFileId?: string): AccountRecord | undefined {
  if (!parsed || typeof parsed !== "object") return undefined;
  const rec = parsed as Partial<AccountRecord>;
  const draft = rec.draft;
  if (!draft || typeof draft !== "object") return undefined;
  const fileId = String(rec.fileId ?? draft.fileId ?? "").trim();
  if (!fileId) return undefined;
  if (expectedFileId && fileId !== expectedFileId) return undefined;
  return {
    accountId: String(rec.accountId ?? draft.accountId ?? ""),
    fileId,
    email: rec.email,
    phone: rec.phone,
    token: String(rec.token ?? ""),
    code: rec.code,
    draft,
    messages: Array.isArray(rec.messages) ? rec.messages : [],
    updatedAt: String(rec.updatedAt ?? ""),
  };
}

async function listPathnames(prefix: string): Promise<{ pathnames: string[]; error?: string }> {
  if (!serverBlobReady()) return { pathnames: [] };
  const pathnames: string[] = [];
  let cursor: string | undefined;
  try {
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const blob of page.blobs) {
        if (blob.pathname) pathnames.push(blob.pathname);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (error) {
    return { pathnames, error: error instanceof Error ? error.message : String(error) };
  }
  return { pathnames };
}

async function readBlobRecord(pathname: string, expectedFileId?: string): Promise<AccountRecord | undefined> {
  if (!serverBlobReady()) return undefined;
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return undefined;
    const text = await new Response(result.stream).text();
    return asAccountRecord(JSON.parse(text), expectedFileId);
  } catch {
    return undefined;
  }
}

async function writeBlobRecord(record: AccountRecord) {
  if (!serverBlobReady()) return;
  const currentToken = record.token ? await readBlobRecord(tokenPath(record.token)) : undefined;
  if (
    currentToken &&
    accountFileHasStoredContent(currentToken.draft) &&
    currentToken.fileId !== record.fileId
  ) {
    return;
  }
  const body = JSON.stringify(record);
  const opts = {
    access: "private" as const,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  };
  await put(tokenPath(record.token), body, opts);
  await put(filePath(record.fileId), body, opts);
  if (record.email) {
    const current = await readBlobRecord(emailPath(record.email));
    if (!current || !shouldKeepLiveAccountDraft(current.draft, record.draft)) {
      await put(emailPath(record.email), body, opts);
    }
  }
  if (record.phone) {
    const current = await readBlobRecord(phonePath(record.phone));
    if (!current || !shouldKeepLiveAccountDraft(current.draft, record.draft)) {
      await put(phonePath(record.phone), body, opts);
    }
  }
  if (record.code) await put(codePath(record.code), body, opts);
}

export async function saveAccountRecord(record: AccountRecord) {
  const current =
    (record.token ? processStore().getByToken(record.token) : undefined) ??
    (record.token ? await loadAccountByToken(record.token) : undefined);
  if (current && accountFileHasStoredContent(current.draft) && current.fileId !== record.fileId) {
    return;
  }
  processStore().put(record);
  await writeBlobRecord(record);
}

export async function loadAccountByToken(token: string) {
  return processStore().getByToken(token) ?? (await readBlobRecord(tokenPath(token)));
}

export async function loadAccountByCode(code: string) {
  return processStore().getByCode(code) ?? (await readBlobRecord(codePath(code)));
}

export async function locateAccountByFileId(fileId: string): Promise<AccountLocate> {
  const wanted = fileId.trim();
  const exactPath = filePath(wanted);
  const storeReady = serverBlobReady();
  const prefixCounts: Record<string, number> = {};
  const wageHits: AccountWageHit[] = [];
  const empty = (
    reason: AccountLocateReason,
    listed: string[] = [],
    docsListed: string[] = [],
    listError?: string,
  ): AccountLocate => ({
    exactPath,
    listed,
    docsListed,
    reason,
    storeReady,
    prefixCounts,
    listError,
    wageHits,
  });

  const memoryHit = processStore().getByFileId(wanted);
  if (memoryHit) {
    return {
      record: memoryHit,
      exactPath,
      listed: [],
      docsListed: [],
      storedAt: "memory",
      reason: "memory",
      storeReady,
      prefixCounts,
      wageHits,
    };
  }
  if (!storeReady) return empty("blob_not_ready");

  const exact = await readBlobRecord(exactPath, wanted);
  if (exact) {
    return {
      record: exact,
      exactPath,
      listed: [exactPath],
      docsListed: [],
      storedAt: exactPath,
      reason: "exact_key",
      storeReady,
      prefixCounts,
      wageHits,
    };
  }

  const named = new Set<string>();
  let listError: string | undefined;
  for (const prefix of [`account/file/${wanted}`, "account/file/", "account/"]) {
    const page = await listPathnames(prefix);
    prefixCounts[prefix] = page.pathnames.length;
    if (page.error && !listError) listError = `${prefix}: ${page.error}`;
    for (const pathname of page.pathnames) {
      if (pathname.includes(wanted)) named.add(pathname);
    }
  }
  const listed = Array.from(named);
  const docsPage = await listPathnames("fox-intake/");
  prefixCounts["fox-intake/"] = docsPage.pathnames.length;
  if (docsPage.error && !listError) listError = `fox-intake/: ${docsPage.error}`;
  const docsListed = docsPage.pathnames.filter((pathname) => pathname.includes(wanted));

  for (const pathname of listed) {
    const record = await readBlobRecord(pathname, wanted);
    if (record) {
      return {
        record,
        exactPath,
        listed,
        docsListed,
        storedAt: pathname,
        reason: "prefix_list",
        storeReady,
        prefixCounts,
        listError,
        wageHits,
      };
    }
  }

  const seenHit = new Set<string>();
  for (const prefix of ["account/email/", "account/phone/", "account/token/", "account/code/", "account/file/"]) {
    const page = await listPathnames(prefix);
    prefixCounts[prefix] = page.pathnames.length;
    if (page.error && !listError) listError = `${prefix}: ${page.error}`;
    for (const pathname of page.pathnames) {
      const record = await readBlobRecord(pathname);
      if (!record) continue;
      if (record.fileId === wanted) {
        return {
          record,
          exactPath,
          listed: listed.concat(named.has(pathname) ? [] : [pathname]),
          docsListed,
          storedAt: pathname,
          reason: "account_scan",
          storeReady,
          prefixCounts,
          listError,
          wageHits,
        };
      }
      const hit = wageHitFrom(record, pathname);
      if (hit && !seenHit.has(hit.fileId)) {
        seenHit.add(hit.fileId);
        wageHits.push(hit);
      }
    }
  }

  return empty(listed.length ? "listed_no_parse" : "not_in_blob", listed, docsListed, listError);
}

export async function loadAccountByFileId(fileId: string) {
  return (await locateAccountByFileId(fileId)).record;
}

export async function loadAccountByEmail(email: string) {
  const key = normalizeEmail(email);
  if (!key) return undefined;
  return processStore().getByEmail(key) ?? (await readBlobRecord(emailPath(key)));
}

export async function loadAccountByPhone(phone: string) {
  const key = normalizePhone(phone);
  if (!key) return undefined;
  return processStore().getByPhone(key) ?? (await readBlobRecord(phonePath(key)));
}

export function previewAccountStore(): AccountStore {
  return processStore();
}

export function accountFilePath(fileId: string) {
  return filePath(fileId);
}
