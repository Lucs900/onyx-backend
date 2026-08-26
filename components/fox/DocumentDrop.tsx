"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
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
import { shouldDeferStillUsefulAsk, slotFromFilename } from "./workspace";
import {
  emitDocIntake,
  missingExtractClasses,
  rejectIncomingFile,
  stillUsefulRefreshKey,
} from "./fileWrite";
import { fileExists } from "./motion";

export { slotFromFilename };

export const FOX_PICK_FILE_EVENT = "onyx:fox-pick-file";

export function requestFoxPickFile() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FOX_PICK_FILE_EVENT));
}

function emitFailedRead() {
  const after = getFoxDraft();
  const key = stillUsefulRefreshKey(after);
  const askMissing = after.missingAskKey !== key;
  if (askMissing) markMissingAsked(key);
  emitDocIntake({
    quietLines: [FAILED_READ_NOTE],
    missing: askMissing && !fileExists(after) ? missingExtractClasses(after) : [],
    refreshStillUseful: askMissing && fileExists(after),
  });
}

const INLINE_EXTRACT_MAX = 1_500_000;

async function storeBytes(file: File) {
  const blob = await upload(`fox-intake/${file.name}`, file, {
    access: "private",
    handleUploadUrl: "/api/docs/upload",
  });
  return blob.pathname;
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    let piece = "";
    for (let j = 0; j < slice.length; j += 1) piece += String.fromCharCode(slice[j] ?? 0);
    binary += piece;
  }
  return btoa(binary);
}

export function DocumentDrop({
  draft,
  compact,
  visible = true,
}: {
  draft?: FoxIntakeDraft;
  compact?: boolean;
  visible?: boolean;
}) {
  const [reject, setReject] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onPick = () => inputRef.current?.click();
    window.addEventListener(FOX_PICK_FILE_EVENT, onPick);
    return () => window.removeEventListener(FOX_PICK_FILE_EVENT, onPick);
  }, []);

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
        let bytesRef = "";
        try {
          bytesRef = await storeBytes(file);
        } catch {
          bytesRef = "";
        }
        patchReceivedDoc(
          (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
          { ...(bytesRef ? { bytesRef } : {}), status: "reading" },
        );
        const inlineBytes = file.size <= INLINE_EXTRACT_MAX ? await fileToBase64(file) : undefined;
        if (!bytesRef && !inlineBytes) {
          patchReceivedDoc(
            (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
            { status: "failed", note: FAILED_READ_NOTE },
          );
          emitFailedRead();
          continue;
        }
        const response = await fetch("/api/docs/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(bytesRef ? { bytesRef } : {}),
            name: file.name,
            type,
            bytes: inlineBytes,
          }),
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
        const key = stillUsefulRefreshKey(after);
        const askStillUseful = !applied.conflict && after.missingAskKey !== key;
        if (askStillUseful) markMissingAsked(key);
        emitDocIntake({
          extractClass: applied.extractClass,
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
            askStillUseful &&
            (fileExists(after) || Boolean(after.pendingProposal)) &&
            !shouldDeferStillUsefulAsk(after),
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
  const fileInput = (
    <input
      ref={inputRef}
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
  );

  if (!visible) {
    return <div className="visually-hidden">{fileInput}</div>;
  }

  return (
    <section
      className={compact ? "structure-drop" : "structure-drop structure-drop--thread"}
      id="fox-documents"
      aria-label="Upload"
    >
      {reject ? <p className="structure-drop__reject">{reject}</p> : null}
      <div className="structure-drop__row">
        <label className="structure-drop__zone">
          <span>{busy ? "Reading…" : "Drop a file here, or browse"}</span>
          {fileInput}
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
