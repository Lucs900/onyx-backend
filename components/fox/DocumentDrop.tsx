"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { ACCEPT_ATTR, FAILED_READ_NOTE, RECEIVED_NOTE, mediaTypeOf } from "@/lib/docs/accept";
export { unreadDropBytesCopy } from "@/lib/docs/accept";
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

export function filesFromDataTransfer(data: DataTransfer | null | undefined): File[] {
  if (!data?.files?.length) return [];
  return Array.from(data.files);
}

export function filesFromClipboard(data: DataTransfer | null | undefined): File[] {
  return filesFromDataTransfer(data);
}

function emitFailedRead(emptyRead?: { name: string; size: number }) {
  const after = getFoxDraft();
  const key = stillUsefulRefreshKey(after);
  const askMissing = after.missingAskKey !== key;
  emitDocIntake({
    quietLines: [FAILED_READ_NOTE],
    ...(emptyRead ? { emptyRead } : {}),
    missing: askMissing && !fileExists(after) ? missingExtractClasses(after) : [],
    refreshStillUseful: askMissing && fileExists(after),
  });
}

async function storeBytes(file: File) {
  const blob = await upload(`fox-intake/${file.name}`, file, {
    access: "private",
    handleUploadUrl: "/api/docs/upload",
  });
  return blob.url || blob.pathname;
}

/** Thread / composer / attach. Reads the dropped File bytes — not a fixture. */
export async function ingestDroppedFiles(files: File[]) {
  for (const file of files) {
    const type = mediaTypeOf(file.name, file.type);
    const blocked = rejectIncomingFile(getFoxDraft(), file.name, type, file.size);
    if (blocked) {
      emitDocIntake({ reject: blocked });
      continue;
    }
    const receivedAt = new Date().toISOString();
    const slot = slotFromFilename(file.name);
    const emptyRead = { name: file.name, size: file.size };
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
        { status: "received", note: FAILED_READ_NOTE },
      );
      emitFailedRead(emptyRead);
      continue;
    }

    receiveDocument({
      slot,
      name: file.name,
      type,
      size: file.size,
      receivedAt,
    });
    patchReceivedDoc(
      (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
      { status: "reading" },
    );

    try {
      const snapshot = new Blob([await file.arrayBuffer()], { type: file.type || type });
      const keep = new File([snapshot], file.name, { type: file.type || type });
      const postExtract = async () => {
        const form = new FormData();
        form.append("file", snapshot, file.name);
        form.append("name", file.name);
        form.append("type", type);
        return fetch("/api/docs/extract", {
          method: "POST",
          body: form,
        });
      };
      let response = await postExtract();
      let data = (await response.json()) as {
        class?: string;
        confidence?: number;
        fields?: Record<string, string>;
        note?: string;
        failed?: boolean;
        code?: string;
        error?: string;
        source?: string;
        textLayerChars?: number;
      };
      if (
        type === "application/pdf" &&
        (data.failed || !response.ok) &&
        data.code !== "STORAGE_BLOCKED"
      ) {
        response = await postExtract();
        data = (await response.json()) as typeof data;
      }
      void storeBytes(keep)
        .then((bytesRef) => {
          patchReceivedDoc(
            (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
            { bytesRef },
          );
        })
        .catch(() => undefined);
      const textEmpty = Boolean(data.failed) && (data.textLayerChars ?? 0) === 0;
      if (!response.ok) {
        patchReceivedDoc(
          (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
          {
            status: "received",
            note: data.code === "STORAGE_BLOCKED" ? data.error : FAILED_READ_NOTE,
          },
        );
        emitFailedRead(textEmpty ? emptyRead : undefined);
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
        ...(textEmpty ? { emptyRead } : {}),
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
      try {
        const snapshot = new Blob([await file.arrayBuffer()], { type: file.type || type });
        void storeBytes(new File([snapshot], file.name, { type: file.type || type }))
          .then((bytesRef) => {
            patchReceivedDoc(
              (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
              { bytesRef },
            );
          })
          .catch(() => undefined);
      } catch {
        /* keep the received row even if bytes cannot be re-read */
      }
      patchReceivedDoc(
        (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
        { status: "received", note: FAILED_READ_NOTE },
      );
      emitFailedRead(emptyRead);
    }
  }
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
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onPick = () => inputRef.current?.click();
    window.addEventListener(FOX_PICK_FILE_EVENT, onPick);
    return () => window.removeEventListener(FOX_PICK_FILE_EVENT, onPick);
  }, []);

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    void ingestDroppedFiles(Array.from(files)).finally(() => setBusy(false));
  };

  const shown = (draft ?? getFoxDraft()).documents;
  const fileInput = (
    <input
      ref={inputRef}
      id="docs-handoff"
      data-docs-handoff="true"
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
