import { NextResponse } from "next/server";
import { slotForExtractClass } from "@/components/fox/fileWrite";
import { FAILED_READ_NOTE, RECEIVED_NOTE, mediaTypeOf } from "@/lib/docs/accept";
import { classifyAndExtract, grokExtractAdapter } from "@/lib/docs/extract";
import { readPrivateBytes, storageStatus, STORAGE_BLOCKED } from "@/lib/docs/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const INLINE_BYTES_MAX = 4_000_000;

function decodeInlineBytes(raw?: string): Uint8Array | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!cleaned || cleaned.length > 8_000_000) return null;
  try {
    const buf = Buffer.from(cleaned, "base64");
    if (!buf.length || buf.length > INLINE_BYTES_MAX) return null;
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { bytesRef?: string; name?: string; type?: string; bytes?: string };
  try {
    body = (await request.json()) as { bytesRef?: string; name?: string; type?: string; bytes?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inline = decodeInlineBytes(body.bytes);
  const bytesRef = typeof body.bytesRef === "string" ? body.bytesRef.trim() : "";
  if (!inline) {
    if (storageStatus().storage === "blocked" && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      return NextResponse.json(
        { error: STORAGE_BLOCKED, code: "STORAGE_BLOCKED" },
        { status: 503 },
      );
    }
    if (!bytesRef || bytesRef.includes("..") || bytesRef.startsWith("http")) {
      return NextResponse.json({ error: "Missing bytesRef" }, { status: 400 });
    }
  }

  try {
    const stored = inline
      ? null
      : await readPrivateBytes(bytesRef);
    const bytes = inline ?? stored?.bytes;
    if (!bytes) {
      return NextResponse.json({ error: "Missing bytesRef" }, { status: 400 });
    }
    const mediaType = mediaTypeOf(body.name ?? stored?.pathname ?? "", body.type ?? stored?.contentType);
    const extracted = await classifyAndExtract(
      bytes,
      mediaType,
      grokExtractAdapter,
    );
    const failed = Boolean(extracted.failed || extracted.warnings.includes("failed"));
    const extractClass = extracted.extractClass;
    return NextResponse.json({
      class: extractClass,
      confidence: extracted.confidence,
      fields: extracted.fields,
      warnings: extracted.warnings,
      slot: slotForExtractClass(extractClass),
      note: failed
        ? FAILED_READ_NOTE
        : extracted.extractClass === "other" || !Object.keys(extracted.fields).length
          ? RECEIVED_NOTE
          : undefined,
      failed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extract failed";
    console.error("[docs/extract] route failed:", message, error);
    if (/not found|token|blob|store/i.test(message) && !/xAI|grok|vision|model/i.test(message)) {
      return NextResponse.json(
        { error: STORAGE_BLOCKED, code: "STORAGE_BLOCKED" },
        { status: 503 },
      );
    }
    return NextResponse.json({
      class: "other",
      confidence: 0,
      fields: {},
      warnings: ["failed"],
      slot: slotForExtractClass("other"),
      note: FAILED_READ_NOTE,
      failed: true,
    });
  }
}
