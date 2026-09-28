import { NextResponse } from "next/server";
import { answerAskFoxFromFile, sessionOwnsFile } from "@/components/fox/askFoxFile";
import { loadAccountByToken } from "@/lib/account/server";

export const runtime = "nodejs";

/** Read-only. Answers from the session's File. Never writes File fields or Status. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { question?: string; fileId?: string; token?: string }
    | null;
  const question = String(body?.question ?? "").trim();
  const fileId = String(body?.fileId ?? "").trim();
  const token = String(body?.token ?? "").trim();
  if (!question || !fileId || !token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const record = await loadAccountByToken(token);
  if (!record?.fileId?.trim()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (record.fileId.trim() !== fileId) {
    return NextResponse.json({ error: "wrong_file" }, { status: 403 });
  }
  if (!sessionOwnsFile(record.draft, { fileId: record.fileId, token })) {
    return NextResponse.json({ error: "wrong_file" }, { status: 403 });
  }
  const answered = answerAskFoxFromFile(question, record.draft, record.messages);
  return NextResponse.json({
    text: answered.text,
    log: answered.log,
    fileId: record.fileId,
    wroteFile: false,
  });
}
