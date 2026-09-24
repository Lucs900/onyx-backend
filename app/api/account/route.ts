import { NextResponse } from "next/server";
import {
  createAccountRecord,
  normalizeEmail,
  normalizePhone,
  persistAccountRecord,
  persistLiveAccountRecord,
  snapshotOf,
} from "@/lib/account/core";
import {
  ACCOUNT_RESUME_ORIGIN_LOCKED,
  accountMailEnv,
  accountOrigin,
  isUniquePreviewOrigin,
  letterHasProtectionBypass,
  letterMagicLink,
  letterResumeOrigin,
  sendAccountChannel,
} from "@/lib/account/send";
import {
  loadAccountByCode,
  loadAccountByEmail,
  loadAccountByFileId,
  loadAccountByPhone,
  loadAccountByToken,
  saveAccountRecord,
} from "@/lib/account/server";
import type { FoxIntakeDraft, FoxMessage } from "@/components/fox/types";
import { applyAccountCreated } from "@/components/fox/account";
import { writeThreadAnswersToFile } from "@/components/fox/threadAnswers";

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
    const createOrigin = accountOrigin(request);
    const origin = letterResumeOrigin(createOrigin);
    const sample = origin ? letterMagicLink("probe", origin) : "";
    const letterHasBypass = letterHasProtectionBypass(sample);
    let letterOpensWithoutVercelLogin = false;
    let probeStatus = 0;
    let probeLocationHost = "";
    if (sample.startsWith("http")) {
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
      from: env.resendFrom,
      fromOk: env.fromOk,
      phoneReady: Boolean(env.twilioSid && env.twilioToken && env.twilioFrom),
      createOrigin,
      letterOrigin: origin,
      resumeOrigin: ACCOUNT_RESUME_ORIGIN_LOCKED,
      letterHasBypass,
      letterHostIsUniquePreview: isUniquePreviewOrigin(origin),
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
  const repairedDraft = writeThreadAnswersToFile(record.draft, record.messages);
  if (
    repairedDraft.firstLienAmount !== record.draft.firstLienAmount ||
    repairedDraft.loanAmountValue !== record.draft.loanAmountValue ||
    repairedDraft.creditBand !== record.draft.creditBand ||
    repairedDraft.whoOnLoan !== record.draft.whoOnLoan ||
    repairedDraft.liveQuote?.rate !== record.draft.liveQuote?.rate
  ) {
    const repaired = persistAccountRecord(record, repairedDraft, record.messages);
    await saveAccountRecord(repaired);
    return NextResponse.json(snapshotOf(repaired));
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
    const next = persistLiveAccountRecord(existing, draft, messages);
    const repairedDraft = writeThreadAnswersToFile(next.draft, next.messages);
    const repaired = persistAccountRecord(next, repairedDraft, next.messages);
    await saveAccountRecord(repaired);
    return NextResponse.json(snapshotOf(repaired));
  }
  if (!draft) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  const fileId = draft.fileId?.trim();
  if (!fileId) {
    return NextResponse.json({ error: "file_id_required" }, { status: 400 });
  }
  try {
    const email = body.email ? normalizeEmail(body.email) : undefined;
    const phone = body.phone ? normalizePhone(body.phone) : undefined;
    const existing = email
      ? await loadAccountByEmail(email)
      : phone
        ? await loadAccountByPhone(phone)
        : undefined;
    if (existing) {
      const kept = persistLiveAccountRecord(existing, draft, messages);
      await saveAccountRecord(kept);
      const createOrigin = accountOrigin(request);
      const letterOrigin = letterResumeOrigin(createOrigin);
      const sent = await sendAccountChannel({
        channel: phone ? "phone" : "email",
        email: body.email,
        phone: body.phone,
        token: kept.token,
        code: kept.code,
        origin: letterOrigin,
      });
      return NextResponse.json({
        ...snapshotOf(kept),
        sent: sent.sent,
        sendProvider: sent.provider ?? null,
        sendReason: sent.reason ?? null,
        createOrigin,
        letterOrigin,
        sameFile: true,
        letterHasBypass: letterHasProtectionBypass(letterMagicLink(kept.token, letterOrigin)),
      });
    }
    const record = createAccountRecord({
      draft,
      messages,
      fileId,
      email: body.email,
      phone: body.phone,
    });
    const linked = persistAccountRecord(
      record,
      applyAccountCreated(draft, {
        fileId,
        accountId: record.accountId,
        channel: body.phone ? "phone" : "email",
      }),
      messages,
    );
    await saveAccountRecord(linked);
    const createOrigin = accountOrigin(request);
    const letterOrigin = letterResumeOrigin(createOrigin);
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
      createOrigin,
      letterOrigin,
      sameFile: false,
      letterHasBypass: letterHasProtectionBypass(letterMagicLink(linked.token, letterOrigin)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
