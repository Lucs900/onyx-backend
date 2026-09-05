"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { ACCEPT_ATTR, FAILED_READ_NOTE, RECEIVED_NOTE, isUnreadNote, mediaTypeOf } from "@/lib/docs/accept";
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
  extractHintFromDraft,
  missingExtractClasses,
  rejectIncomingFile,
  stillUsefulRefreshKey,
} from "./fileWrite";
import { fileExists } from "./motion";

export { slotFromFilename };

export const FOX_PICK_FILE_EVENT = "onyx:fox-pick-file";
export const COMPOSER_ATTACH_ID = "composer-attach";

/** Composer attach first. Hidden #docs-handoff is vault-only, not the walk door. */
export function requestFoxPickFile() {
  if (typeof window === "undefined") return;
  const composer = document.getElementById(COMPOSER_ATTACH_ID);
  if (composer instanceof HTMLInputElement && !composer.disabled) {
    composer.click();
    return;
  }
  window.dispatchEvent(new Event(FOX_PICK_FILE_EVENT));
}

export function filesFromDataTransfer(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const seen = new Map<string, File>();
  const add = (file: File | null | undefined) => {
    if (!file) return;
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    if (!seen.has(key)) seen.set(key, file);
  };
  if (data.files?.length) {
    for (const file of Array.from(data.files)) add(file);
  }
  const items = data.items;
  if (items?.length) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item?.kind === "file") add(item.getAsFile());
    }
  }
  return Array.from(seen.values());
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

/** Thread / composer drop or composer attach. Reads those File bytes — not a fixture. */
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
      const hint = extractHintFromDraft(getFoxDraft(), file.name);
      const snapshot = new Blob([await file.arrayBuffer()], { type });
      const keep = new File([snapshot], file.name, { type });
      const postExtract = async () => {
        const form = new FormData();
        form.append("file", keep, file.name);
        form.append("name", file.name);
        form.append("type", type);
        if (hint) form.append("hint", hint);
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
      if (!response.ok) {
        patchReceivedDoc(
          (doc) => doc.receivedAt === receivedAt && doc.name === file.name,
          {
            status: "received",
            note: data.code === "STORAGE_BLOCKED" ? data.error : FAILED_READ_NOTE,
          },
        );
        emitFailedRead(emptyRead);
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
      const spokeUnread =
        Boolean(data.failed) || applied.quietLines.some((line) => isUnreadNote(line));
      emitDocIntake({
        extractClass: applied.extractClass,
        quietLines: applied.quietLines.length
          ? applied.quietLines
          : data.failed
            ? [FAILED_READ_NOTE]
            : [],
        ...(spokeUnread ? { emptyRead } : {}),
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

/** Visible composer attach. Posts the chosen File through ingestDroppedFiles. */
export function ComposerAttach() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    void ingestDroppedFiles(Array.from(files)).finally(() => setBusy(false));
  };

  return (
    <>
      <input
        ref={inputRef}
        id={COMPOSER_ATTACH_ID}
        data-composer-attach="true"
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
      <button
        type="button"
        className="fox-bar__attach"
        aria-label="Attach"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M13.2 8.15 8.02 13.33a3.3 3.3 0 0 1-4.67-4.67l5.18-5.18a2.2 2.2 0 1 1 3.11 3.11L6.46 11.77a1.1 1.1 0 1 1-1.56-1.56l4.8-4.8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
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
