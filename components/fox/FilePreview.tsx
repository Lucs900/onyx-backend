"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DocumentDrop } from "./DocumentDrop";
import { requestFoxFix } from "./AlwaysOnFox";
import { getFoxDraft, getServerDraft, subscribeFoxDraft } from "./store";
import { previewFacts, structureFixPrompt, workspacePrompt } from "./workspace";

function StructureRows({
  facts,
}: {
  facts: ReturnType<typeof previewFacts>;
}) {
  return (
    <div className="file-preview__rows">
      {facts.map((fact) => {
        const canFix = Boolean(structureFixPrompt(fact.id));
        if (!canFix) {
          return (
            <div key={fact.id} className="file-preview__row">
              <span className="file-preview__label">{fact.label}</span>
              <span className="file-preview__value">
                <span>{fact.value}</span>
                {fact.note ? <small>{fact.note}</small> : null}
              </span>
            </div>
          );
        }
        return (
          <button
            key={fact.id}
            type="button"
            className="file-preview__row file-preview__row--tap"
            onClick={() => requestFoxFix(fact.id)}
          >
            <span className="file-preview__label">{fact.label}</span>
            <span className="file-preview__value">
              <span>{fact.value}</span>
              {fact.note ? <small>{fact.note}</small> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FilePreview() {
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const facts = previewFacts(draft);
  const [open, setOpen] = useState(false);
  const ask = workspacePrompt(draft);
  const showDocs =
    ask === "documents" || (draft.phase === "documents" && !draft.workspaceFlow);

  useEffect(() => {
    if (showDocs) setOpen(true);
  }, [showDocs]);

  if (!facts.length) {
    return null;
  }

  const newest = facts[facts.length - 1];
  const peek = newest ? `${newest.label} · ${newest.value}` : "";

  return (
    <aside className={open ? "file-preview is-open" : "file-preview"}>
      <div className="file-preview__desktop">
        <p className="type-eyebrow">Structure</p>
        <h2 className="type-card-title">Live file</h2>
        <StructureRows facts={facts} />
      </div>
      <div className="file-preview__mobile">
        <button
          type="button"
          className="file-preview__toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>Structure{peek ? ` · ${peek}` : ""}</span>
          <span className="file-preview__toggle-mark">{open ? "Hide" : "Show"}</span>
        </button>
        {open ? (
          <div className="file-preview__sheet">
            <StructureRows facts={facts} />
          </div>
        ) : null}
      </div>
      {showDocs ? <DocumentDrop draft={draft} compact /> : null}
    </aside>
  );
}
