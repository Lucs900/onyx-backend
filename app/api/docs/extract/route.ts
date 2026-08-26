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

function isBlobRef(value: string) {
  if (!value || value.includes("..")) return false;
  if (/^https?:\/\//i.test(value)) return /\.blob\.vercel-storage\.com\b/i.test(value);
  return !value.startsWith("http");
}

async function bytesFromMultipart(request: Request): Promise<{
  bytes: Uint8Array;
  name: string;
  type: string;
  source: "file" | "blob";
} | null> {
  const form = await request.formData();
  const uploaded = form.get("file");
  const name = String(form.get("name") ?? (uploaded instanceof File ? uploaded.name : "")).trim();
  const type = String(form.get("type") ?? (uploaded instanceof File ? uploaded.type : "")).trim();
  const bytesRef = String(form.get("bytesRef") ?? "").trim();
  if (uploaded instanceof Blob && uploaded.size > 0) {
    return {
      bytes: new Uint8Array(await uploaded.arrayBuffer()),
      name,
      type,
      source: "file",
    };
  }
  if (isBlobRef(bytesRef)) {
    const stored = await readPrivateBytes(bytesRef);
    return {
      bytes: stored.bytes,
      name: name || stored.pathname,
      type: type || stored.contentType,
      source: "blob",
    };
  }
  return null;
}

async function bytesFromJson(body: {
  bytesRef?: string;
  name?: string;
  type?: string;
  bytes?: string;
}): Promise<{
  bytes: Uint8Array;
  name: string;
  type: string;
  source: "file" | "inline" | "blob";
} | null> {
  const inline = decodeInlineBytes(body.bytes);
  const name = typeof body.name === "string" ? body.name : "";
  const type = typeof body.type === "string" ? body.type : "";
  if (inline) {
    return { bytes: inline, name, type, source: "inline" };
  }
  const bytesRef = typeof body.bytesRef === "string" ? body.bytesRef.trim() : "";
  if (!isBlobRef(bytesRef)) return null;
  const stored = await readPrivateBytes(bytesRef);
  return {
    bytes: stored.bytes,
    name: name || stored.pathname,
    type: type || stored.contentType,
    source: "blob",
  };
}

function extractJson(
  extracted: Awaited<ReturnType<typeof classifyAndExtract>>,
  source: "file" | "inline" | "blob",
) {
  const failed = Boolean(extracted.failed || extracted.warnings.includes("failed"));
  const extractClass = extracted.extractClass;
  return {
    class: extractClass,
    confidence: extracted.confidence,
    fields: extracted.fields,
    warnings: extracted.warnings,
    slot: slotForExtractClass(extractClass),
    source,
    note: failed
      ? FAILED_READ_NOTE
      : extracted.extractClass === "other" || !Object.keys(extracted.fields).length
        ? RECEIVED_NOTE
        : undefined,
    failed,
  };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  try {
    let loaded: { bytes: Uint8Array; name: string; type: string; source: "file" | "inline" | "blob" } | null =
      null;
    if (contentType.includes("multipart/form-data")) {
      loaded = await bytesFromMultipart(request);
    } else {
      let body: { bytesRef?: string; name?: string; type?: string; bytes?: string };
      try {
        body = (await request.json()) as { bytesRef?: string; name?: string; type?: string; bytes?: string };
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
      loaded = await bytesFromJson(body);
    }
    if (!loaded) {
      if (storageStatus().storage === "blocked" && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
        return NextResponse.json(
          { error: STORAGE_BLOCKED, code: "STORAGE_BLOCKED" },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const mediaType = mediaTypeOf(loaded.name, loaded.type);
    const extracted = await classifyAndExtract(loaded.bytes, mediaType, grokExtractAdapter);
    return NextResponse.json(extractJson(extracted, loaded.source));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extract failed";
    console.error("[docs/extract] route failed:", message, error);
    if (/not found|token|blob|store|empty/i.test(message) && !/xAI|grok|vision|model/i.test(message)) {
      return NextResponse.json(
        { error: STORAGE_BLOCKED, code: "STORAGE_BLOCKED", source: "blob" },
        { status: 503 },
      );
    }
    return NextResponse.json({
      class: "other",
      confidence: 0,
      fields: {},
      warnings: ["failed"],
      slot: slotForExtractClass("other"),
      source: "failed",
      note: FAILED_READ_NOTE,
      failed: true,
    });
  }
}
