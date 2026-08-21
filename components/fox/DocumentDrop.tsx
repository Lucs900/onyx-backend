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
import { slotFromFilename } from "./workspace";
import {
  emitDocIntake,
  missingExtractClasses,
  rejectIncomingFile,
  stillUsefulAskKey,
  stillUsefulLabels,
} from "./fileWrite";
import { fileExists } from "./motion";

export { slotFromFilename };

function emitFailedRead() {
  const after = getFoxDraft();
  const key = stillUsefulAskKey(after);
  const askMissing = Boolean(key) && after.missingAskKey !== key;
  if (askMissing) markMissingAsked(key);
  emitDocIntake({
    quietLines: [FAILED_READ_NOTE],
    missing: askMissing && !fileExists(after) ? missingExtractClasses(after) : [],
    refreshStillUseful: askMissing && fileExists(after),
  });
}

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
  const hint = stillUsefulLabels(live).join(" · ");
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
        emitFailedRead();
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
          emitFailedRead();
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
        const key = stillUsefulAskKey(after);
        const askStillUseful =
          !applied.conflict && Boolean(key) && after.missingAskKey !== key;
        if (askStillUseful) markMissingAsked(key);
        emitDocIntake({
          quietLines: applied.quietLines.length
            ? applied.quietLines
            : data.failed
              ? [FAILED_READ_NOTE]
              : [],
          conflict: applied.conflict,
          missing:
            askStillUseful && !after.pendingProposal && !fileExists(after)
              ? missingExtractClasses(after)
              : [],
          refreshStillUseful:
            askStillUseful && (fileExists(after) || Boolean(after.pendingProposal)),
        });
      } catch {
        patchReceivedDoc(
          (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
          { status: "failed", note: FAILED_READ_NOTE },
        );
        emitFailedRead();
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
      {hint ? <p className="structure-drop__hint">{hint}</p> : null}
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
