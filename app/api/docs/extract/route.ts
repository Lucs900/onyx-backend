import { NextResponse } from "next/server";
import { extractClassFromFilename, slotForExtractClass } from "@/components/fox/fileWrite";
import { FAILED_READ_NOTE, RECEIVED_NOTE, mediaTypeOf } from "@/lib/docs/accept";
import { classifyAndExtract } from "@/lib/docs/extract";
import { readPrivateBytes, storageStatus, STORAGE_BLOCKED } from "@/lib/docs/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (storageStatus().storage === "blocked" && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json(
      { error: STORAGE_BLOCKED, code: "STORAGE_BLOCKED" },
      { status: 503 },
    );
  }

  let body: { bytesRef?: string; name?: string; type?: string };
  try {
    body = (await request.json()) as { bytesRef?: string; name?: string; type?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bytesRef = typeof body.bytesRef === "string" ? body.bytesRef.trim() : "";
  if (!bytesRef || bytesRef.includes("..") || bytesRef.startsWith("http")) {
    return NextResponse.json({ error: "Missing bytesRef" }, { status: 400 });
  }

  const hinted = extractClassFromFilename(body.name ?? "");

  try {
    const stored = await readPrivateBytes(bytesRef);
    const mediaType = mediaTypeOf(body.name ?? stored.pathname, body.type ?? stored.contentType);
    const extracted = await classifyAndExtract(stored.bytes, mediaType);
    const failed = Boolean(extracted.failed || extracted.warnings.includes("failed"));
    const extractClass =
      failed && extracted.extractClass === "other" && hinted ? hinted : extracted.extractClass;
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
      class: hinted ?? "other",
      confidence: 0,
      fields: {},
      warnings: ["failed"],
      slot: slotForExtractClass(hinted ?? "other"),
      note: FAILED_READ_NOTE,
      failed: true,
    });
  }
}
