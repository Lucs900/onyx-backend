/**
 * Preview File store for account resume. Blob when provisioned; memory for leftover / local.
 * Not BNTouch. Not a public domain cutover.
 */
import { get, put } from "@vercel/blob";
import { serverBlobReady } from "@/lib/docs/storage";
import type { AccountRecord, AccountStore } from "./core";
import { memoryAccountStore, normalizeEmail, normalizePhone } from "./core";

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

async function readBlobRecord(pathname: string): Promise<AccountRecord | undefined> {
  if (!serverBlobReady()) return undefined;
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return undefined;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as AccountRecord;
    if (!parsed?.token || !parsed.fileId || !parsed.draft) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

async function writeBlobRecord(record: AccountRecord) {
  if (!serverBlobReady()) return;
  const body = JSON.stringify(record);
  const opts = { access: "private" as const, addRandomSuffix: false, contentType: "application/json" };
  await put(tokenPath(record.token), body, opts);
  await put(filePath(record.fileId), body, opts);
  if (record.email) await put(emailPath(record.email), body, opts);
  if (record.phone) await put(phonePath(record.phone), body, opts);
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

export async function loadAccountByFileId(fileId: string) {
  return processStore().getByFileId(fileId) ?? (await readBlobRecord(filePath(fileId)));
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
