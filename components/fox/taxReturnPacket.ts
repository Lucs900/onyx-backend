import { FAILED_READ_NOTE, RECEIVED_NOTE } from "@/lib/docs/accept";
import {
  emitDocIntake,
  taxReturnPacketDoc,
  taxReturnPacketNeedsRead,
} from "./fileWrite";
import { applyExtractWrite, commit, getFoxDraft } from "./store";
import type { ExtractClass } from "./types";

/** After cover Use this, Grok the same stored 1040 pages for Sch E / K-1 / wages. */
export async function continueTaxReturnPacketRead() {
  const draft = getFoxDraft();
  if (!taxReturnPacketNeedsRead(draft)) return;
  const doc = taxReturnPacketDoc(draft);
  if (!doc?.bytesRef) return;
  commit({ ...getFoxDraft(), taxReturnPacketRead: "reading" });
  try {
    const form = new FormData();
    form.append("bytesRef", doc.bytesRef);
    form.append("name", doc.name);
    form.append("type", doc.type || "application/pdf");
    form.append("hint", "tax_return");
    form.append("phase", "packet");
    const response = await fetch("/api/docs/extract", { method: "POST", body: form });
    const data = (await response.json()) as {
      class?: string;
      confidence?: number;
      fields?: Record<string, string>;
      failed?: boolean;
      note?: string;
      code?: string;
      error?: string;
    };
    if (!response.ok) {
      const applied = applyExtractWrite(
        doc.receivedAt,
        doc.name,
        {
          extractClass: "tax_return",
          confidence: 0,
          fields: { packet_read: "empty" },
        },
        RECEIVED_NOTE,
        false,
      );
      emitDocIntake({
        extractClass: "tax_return",
        quietLines: applied.quietLines,
      });
      return;
    }
    const applied = applyExtractWrite(
      doc.receivedAt,
      doc.name,
      {
        extractClass: (data.class as ExtractClass) ?? "tax_return",
        confidence: typeof data.confidence === "number" ? data.confidence : 0.94,
        fields: { ...(data.fields ?? {}), packet_read: data.fields?.packet_read || "empty" },
      },
      data.failed ? FAILED_READ_NOTE : data.note ?? RECEIVED_NOTE,
      false,
    );
    emitDocIntake({
      extractClass: applied.extractClass,
      quietLines: applied.quietLines,
    });
  } catch {
    const applied = applyExtractWrite(
      doc.receivedAt,
      doc.name,
      {
        extractClass: "tax_return",
        confidence: 0,
        fields: { packet_read: "empty" },
      },
      RECEIVED_NOTE,
      false,
    );
    emitDocIntake({
      extractClass: "tax_return",
      quietLines: applied.quietLines,
    });
  }
}
