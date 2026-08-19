"use client";

import { useEffect, useRef } from "react";
import { applyCapture, getFoxDraft, receiveDocument, setDocumentStatus } from "./store";
import type { FoxIntakeDraft } from "./types";
import { docsRequestForIncome, slotFromFilename } from "./workspace";

export { slotFromFilename };

export function useDocumentReads(draft: FoxIntakeDraft) {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    draft.documents.forEach((doc) => {
      const key = `${doc.slot}:${doc.receivedAt}:${doc.name}`;
      if (doc.status !== "received" || seen.current.has(key)) return;
      seen.current.add(key);
      window.setTimeout(() => {
        const live = getFoxDraft().documents.find(
          (item) => item.receivedAt === doc.receivedAt && item.name === doc.name,
        );
        if (!live) return;
        setDocumentStatus(doc.slot, "reading", undefined, doc.receivedAt);
        window.setTimeout(() => {
          const again = getFoxDraft().documents.find(
            (item) => item.receivedAt === doc.receivedAt && item.name === doc.name,
          );
          if (!again) return;
          if (again.size < 32) {
            setDocumentStatus(
              doc.slot,
              "needs better copy",
              "Fox could not read this file. Type a note or skip. No dollar amounts were invented.",
              doc.receivedAt,
            );
            return;
          }
          setDocumentStatus(
            doc.slot,
            "extracted",
            "File recorded. Dollar amounts were not extracted in this preview.",
            doc.receivedAt,
          );
        }, 1100);
      }, 400);
    });
  }, [draft.documents]);
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
  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      receiveDocument({
        slot: slotFromFilename(file.name),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        receivedAt: new Date().toISOString(),
      });
    });
  };

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
      <div className="structure-drop__row">
        <label className="structure-drop__zone">
          <span>Drop a file here, or browse</span>
          <input
            className="visually-hidden"
            type="file"
            multiple
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
    </section>
  );
}
