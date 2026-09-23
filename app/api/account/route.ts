import { NextResponse } from "next/server";
import {
  createAccountRecord,
  persistAccountRecord,
  snapshotOf,
} from "@/lib/account/core";
import {
  accountMailEnv,
  accountOrigin,
  letterHasProtectionBypass,
  letterMagicLink,
  sendAccountChannel,
} from "@/lib/account/send";
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
  if (url.searchParams.get("mailer") === "1") {
    const env = accountMailEnv();
    const origin = accountOrigin(request);
    const sample = origin ? letterMagicLink("probe", origin) : "";
    const letterHasBypass = letterHasProtectionBypass(sample);
    let letterOpensWithoutVercelLogin = false;
    let probeStatus = 0;
    let probeLocationHost = "";
    if (letterHasBypass && sample.startsWith("http")) {
      try {
        const probe = await fetch(sample, {
          redirect: "manual",
          signal: AbortSignal.timeout(8000),
        });
        probeStatus = probe.status;
        const loc = probe.headers.get("location") || "";
        try {
          probeLocationHost = loc ? new URL(loc).hostname : "";
        } catch {
          probeLocationHost = loc ? "unparsed" : "";
        }
        letterOpensWithoutVercelLogin =
          probe.status !== 401 &&
          probe.status !== 403 &&
          !/vercel\.com$/i.test(probeLocationHost);
      } catch {
        letterOpensWithoutVercelLogin = false;
      }
    }
    return NextResponse.json({
      emailReady: Boolean(env.resendKey && env.fromOk),
      fromOk: env.fromOk,
      phoneReady: Boolean(env.twilioSid && env.twilioToken && env.twilioFrom),
      letterHasBypass,
      letterOpensWithoutVercelLogin,
      probeStatus,
      probeLocationHost,
    });
  }
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
    const letterOrigin = accountOrigin(request);
    const sent = await sendAccountChannel({
      channel: body.phone ? "phone" : "email",
      email: body.email,
      phone: body.phone,
      token: linked.token,
      code: linked.code,
      origin: letterOrigin,
    });
    return NextResponse.json({
      ...snapshotOf(linked),
      sent: sent.sent,
      sendProvider: sent.provider ?? null,
      sendReason: sent.reason ?? null,
      letterOrigin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
