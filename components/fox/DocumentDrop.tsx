"use client";

import { useEffect, useRef } from "react";
import {
  documentForSlot,
  getFoxDraft,
  receiveDocument,
  setDocumentStatus,
} from "./store";
import { DOC_SLOTS, type DocSlot, type FoxIntakeDraft } from "./types";

export function useDocumentReads(draft: FoxIntakeDraft) {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    draft.documents.forEach((doc) => {
      const key = `${doc.slot}:${doc.receivedAt}`;
      if (doc.status !== "received" || seen.current.has(key)) return;
      seen.current.add(key);
      window.setTimeout(() => {
        const live = getFoxDraft().documents.find((item) => item.slot === doc.slot);
        if (!live || live.receivedAt !== doc.receivedAt) return;
        setDocumentStatus(doc.slot, "reading");
        window.setTimeout(() => {
          const again = getFoxDraft().documents.find((item) => item.slot === doc.slot);
          if (!again || again.receivedAt !== doc.receivedAt) return;
          if (again.size < 32) {
            setDocumentStatus(
              doc.slot,
              "needs better copy",
              "Fox could not read this file. Type a note or skip. No dollar amounts were invented.",
            );
            return;
          }
          setDocumentStatus(
            doc.slot,
            "extracted",
            "File recorded. Dollar amounts were not extracted in this preview.",
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
  draft: FoxIntakeDraft;
  compact?: boolean;
}) {
  const onFile = (slot: DocSlot, file: File | undefined) => {
    if (!file) return;
    receiveDocument({
      slot,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      receivedAt: new Date().toISOString(),
    });
  };

  return (
    <section
      className={compact ? "workspace-docs" : "intake-card"}
      id="fox-documents"
      aria-labelledby="docs-title"
    >
      <h2 id="docs-title" className={compact ? "type-eyebrow" : "type-card-title"}>
        Documents
      </h2>
      {compact ? null : (
        <p className="type-legal">
          Documents stay with this preview session. They are not uploaded, not
          stored in a vault, and have no public URL. Only the filename and status
          are kept.
        </p>
      )}
      <ul className={compact ? "workspace-docs__list" : "intake-docs"}>
        {DOC_SLOTS.map((slot) => {
          const received = documentForSlot(draft, slot.id);
          return (
            <li key={slot.id} className={compact ? "workspace-docs__item" : "intake-doc"}>
              <div>
                <p className={compact ? "workspace-docs__label" : "type-card-title"}>
                  {slot.label}
                </p>
                <p className="type-legal">
                  {received ? `Received · ${received.name}` : "Waiting"}
                </p>
              </div>
              <label className="btn btn--secondary fox-chip">
                {received ? "Replace" : "Add"}
                <input
                  className="visually-hidden"
                  type="file"
                  onChange={(event) => {
                    onFile(slot.id, event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
