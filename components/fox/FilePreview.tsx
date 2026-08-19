"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DocumentDrop } from "./DocumentDrop";
import { getFoxDraft, getServerDraft, subscribeFoxDraft } from "./store";
import { previewFacts, workspacePrompt } from "./workspace";

function PreviewRows({ facts }: { facts: ReturnType<typeof previewFacts> }) {
  return (
    <dl className="file-preview__rows">
      {facts.map((fact) => (
        <div key={fact.id} className="file-preview__row">
          <dt>{fact.label}</dt>
          <dd>
            <span>{fact.value}</span>
            {fact.note ? <small>{fact.note}</small> : null}
          </dd>
        </div>
      ))}
    </dl>
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
    return <aside className="file-preview file-preview--empty" aria-hidden="true" />;
  }

  const summary = facts
    .filter((fact) => fact.id === "path" || fact.id === "product")
    .map((fact) => fact.value)
    .join(" · ");

  return (
    <aside className={open ? "file-preview is-open" : "file-preview"}>
      <div className="file-preview__desktop">
        <p className="type-eyebrow">File</p>
        <h2 className="type-card-title">Preview</h2>
        <PreviewRows facts={facts} />
      </div>
      <div className="file-preview__mobile">
        <button
          type="button"
          className="file-preview__toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>File{summary ? ` · ${summary}` : " / Preview"}</span>
          <span className="file-preview__toggle-mark">{open ? "Hide" : "Show"}</span>
        </button>
        {open ? (
          <div className="file-preview__sheet">
            <PreviewRows facts={facts} />
          </div>
        ) : null}
      </div>
      {showDocs ? <DocumentDrop draft={draft} compact /> : null}
    </aside>
  );
}
