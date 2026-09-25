/**
 * Preview File store for account resume. Blob when provisioned; memory for leftover / local.
 * Not BNTouch. Not a public domain cutover.
 */
import { get, list, put } from "@vercel/blob";
import { serverBlobReady } from "@/lib/docs/storage";
import type { AccountRecord, AccountStore } from "./core";
import { memoryAccountStore, normalizeEmail, normalizePhone, shouldKeepLiveAccountDraft } from "./core";

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

export type AccountLocate = {
  record?: AccountRecord;
  exactPath: string;
  listed: string[];
  docsListed: string[];
  storedAt?: string;
  reason: AccountLocateReason;
  storeReady: boolean;
};

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

async function listPathnames(prefix: string): Promise<string[]> {
  if (!serverBlobReady()) return [];
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
  } catch {
    return pathnames;
  }
  return pathnames;
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
  const empty = (reason: AccountLocateReason, listed: string[] = [], docsListed: string[] = []): AccountLocate => ({
    exactPath,
    listed,
    docsListed,
    reason,
    storeReady,
  });

  const memoryHit = processStore().getByFileId(wanted);
  if (memoryHit) {
    return { record: memoryHit, exactPath, listed: [], docsListed: [], storedAt: "memory", reason: "memory", storeReady };
  }
  if (!storeReady) return empty("blob_not_ready");

  const exact = await readBlobRecord(exactPath, wanted);
  if (exact) {
    return { record: exact, exactPath, listed: [exactPath], docsListed: [], storedAt: exactPath, reason: "exact_key", storeReady };
  }

  const named = new Set<string>();
  for (const prefix of [`account/file/${wanted}`, "account/file/", "account/"]) {
    for (const pathname of await listPathnames(prefix)) {
      if (pathname.includes(wanted)) named.add(pathname);
    }
  }
  const listed = Array.from(named);
  const docsListed = (await listPathnames("fox-intake/")).filter((pathname) => pathname.includes(wanted));

  for (const pathname of listed) {
    const record = await readBlobRecord(pathname, wanted);
    if (record) {
      return { record, exactPath, listed, docsListed, storedAt: pathname, reason: "prefix_list", storeReady };
    }
  }

  for (const prefix of ["account/email/", "account/phone/", "account/token/", "account/code/", "account/file/"]) {
    for (const pathname of await listPathnames(prefix)) {
      if (named.has(pathname)) continue;
      const record = await readBlobRecord(pathname, wanted);
      if (record) {
        return {
          record,
          exactPath,
          listed: [...listed, pathname],
          docsListed,
          storedAt: pathname,
          reason: "account_scan",
          storeReady,
        };
      }
    }
  }

  return empty(listed.length ? "listed_no_parse" : "not_in_blob", listed, docsListed);
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
