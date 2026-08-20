"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { ACCEPT_ATTR, FAILED_READ_NOTE, RECEIVED_NOTE, mediaTypeOf } from "@/lib/docs/accept";
import {
  applyExtractWrite,
  applyCapture,
  getFoxDraft,
  markMissingAsked,
  patchReceivedDoc,
  receiveDocument,
} from "./store";
import type { ExtractClass, FoxIntakeDraft } from "./types";
import { docsRequestForIncome, slotFromFilename } from "./workspace";
import {
  emitDocIntake,
  missingAskKey,
  missingExtractClasses,
  rejectIncomingFile,
} from "./fileWrite";

export { slotFromFilename };

async function storeBytes(file: File) {
  const blob = await upload(`fox-intake/${file.name}`, file, {
    access: "private",
    handleUploadUrl: "/api/docs/upload",
  });
  return blob.pathname;
}

export function DocumentDrop({
  draft,
  compact,
}: {
  draft?: FoxIntakeDraft;
  compact?: boolean;
}) {
  const live = draft ?? getFoxDraft();
  const request = docsRequestForIncome(live.incomeType.value);
  const [reject, setReject] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    void ingestFiles(Array.from(files));
  };

  const ingestFiles = async (files: File[]) => {
    setBusy(true);
    for (const file of files) {
      const type = mediaTypeOf(file.name, file.type);
      const blocked = rejectIncomingFile(getFoxDraft(), file.name, type, file.size);
      if (blocked) {
        setReject(blocked);
        emitDocIntake({ reject: blocked });
        continue;
      }
      setReject(null);
      const receivedAt = new Date().toISOString();
      const slot = slotFromFilename(file.name);
      if (file.size < 32) {
        receiveDocument({
          slot,
          name: file.name,
          type,
          size: file.size,
          receivedAt,
        });
        patchReceivedDoc(
          (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
          { status: "needs better copy", note: FAILED_READ_NOTE },
        );
        emitDocIntake({ quietLines: [] });
        continue;
      }

      receiveDocument({
        slot,
        name: file.name,
        type,
        size: file.size,
        receivedAt,
      });

      try {
        const bytesRef = await storeBytes(file);
        patchReceivedDoc(
          (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
          { bytesRef, status: "reading" },
        );
        const response = await fetch("/api/docs/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bytesRef, name: file.name, type }),
        });
        const data = (await response.json()) as {
          class?: string;
          confidence?: number;
          fields?: Record<string, string>;
          note?: string;
          failed?: boolean;
          code?: string;
          error?: string;
        };
        if (!response.ok) {
          patchReceivedDoc(
            (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
            {
              status: "failed",
              bytesRef,
              note: data.code === "STORAGE_BLOCKED" ? data.error : FAILED_READ_NOTE,
            },
          );
          emitDocIntake({ quietLines: [] });
          continue;
        }
        const applied = applyExtractWrite(
          receivedAt,
          file.name,
          {
            extractClass: (data.class as ExtractClass) ?? "other",
            confidence: typeof data.confidence === "number" ? data.confidence : 0,
            fields: data.fields ?? {},
          },
          data.failed ? FAILED_READ_NOTE : data.note ?? RECEIVED_NOTE,
          Boolean(data.failed),
        );
        const after = applied.draft;
        const missing = missingExtractClasses(after);
        const key = missingAskKey(missing);
        const askMissing = !applied.conflict && missing.length > 0 && after.missingAskKey !== key;
        if (askMissing) markMissingAsked(key);
        emitDocIntake({
          quietLines: applied.quietLines,
          conflict: applied.conflict,
          missing: askMissing ? missing : [],
        });
      } catch {
        patchReceivedDoc(
          (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
          { status: "failed", note: FAILED_READ_NOTE },
        );
        emitDocIntake({ quietLines: [] });
      }
    }
    setBusy(false);
  };

  const shown = (draft ?? getFoxDraft()).documents;

  return (
    <section
      className={compact ? "structure-drop" : "structure-drop structure-drop--thread"}
      id="fox-documents"
      aria-labelledby="docs-drop-title"
    >
      <h2 id="docs-drop-title" className="type-eyebrow">
        Documents
      </h2>
      {request.labels.length ? (
        <p className="structure-drop__hint">{request.labels.join(" · ")}</p>
      ) : (
        <p className="structure-drop__hint">Any file you have</p>
      )}
      {reject ? <p className="structure-drop__reject">{reject}</p> : null}
      <div className="structure-drop__row">
        <label className="structure-drop__zone">
          <span>{busy ? "Reading…" : "Drop a file here, or browse"}</span>
          <input
            className="visually-hidden"
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            disabled={busy}
            onChange={(event) => {
              onFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="structure-drop__skip"
          onClick={() => applyCapture({ field: "skip-docs" })}
        >
          Skip
        </button>
      </div>
      {shown.length ? (
        <ul className="structure-drop__files">
          {shown.map((doc) => (
            <li key={`${doc.receivedAt}:${doc.name}`}>
              {doc.name} · {doc.status}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
