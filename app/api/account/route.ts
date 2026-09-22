import { NextResponse } from "next/server";
import {
  createAccountRecord,
  persistAccountRecord,
  snapshotOf,
} from "@/lib/account/core";
import { accountOrigin, sendAccountChannel } from "@/lib/account/send";
import {
  loadAccountByCode,
  loadAccountByFileId,
  loadAccountByToken,
  saveAccountRecord,
} from "@/lib/account/server";
import type { FoxIntakeDraft, FoxMessage } from "@/components/fox/types";

export const runtime = "nodejs";

function asDraft(value: unknown): FoxIntakeDraft | null {
  if (!value || typeof value !== "object") return null;
  return value as FoxIntakeDraft;
}

function asMessages(value: unknown): FoxMessage[] {
  return Array.isArray(value) ? (value as FoxMessage[]) : [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("account")?.trim() || "";
  const code = url.searchParams.get("code")?.trim() || "";
  const fileId = url.searchParams.get("file")?.trim() || "";
  const record = token
    ? await loadAccountByToken(token)
    : code
      ? await loadAccountByCode(code)
      : fileId
        ? await loadAccountByFileId(fileId)
        : undefined;
  if (!record) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(snapshotOf(record));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        email?: string;
        phone?: string;
        token?: string;
        draft?: unknown;
        messages?: unknown;
      }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const draft = asDraft(body.draft);
  const messages = asMessages(body.messages);
  if (body.action === "persist") {
    const token = String(body.token ?? "").trim();
    const existing = token ? await loadAccountByToken(token) : undefined;
    if (!existing || !draft) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const next = persistAccountRecord(existing, draft, messages);
    await saveAccountRecord(next);
    return NextResponse.json(snapshotOf(next));
  }
  if (!draft) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  const fileId = draft.fileId?.trim();
  if (!fileId) {
    return NextResponse.json({ error: "file_id_required" }, { status: 400 });
  }
  try {
    const record = createAccountRecord({
      draft,
      messages,
      fileId,
      email: body.email,
      phone: body.phone,
    });
    const linked = persistAccountRecord(
      record,
      { ...draft, fileId, accountId: record.accountId, accountAsk: "sent", accountSkipped: false },
      messages,
    );
    await saveAccountRecord(linked);
    const sent = await sendAccountChannel({
      channel: body.phone ? "phone" : "email",
      email: body.email,
      phone: body.phone,
      token: linked.token,
      code: linked.code,
      origin: accountOrigin(request),
    });
    return NextResponse.json({
      ...snapshotOf(linked),
      sent: sent.sent,
      sendProvider: sent.provider ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
