"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { DocumentDrop } from "./DocumentDrop";
import { requestFoxExplain, requestFoxFix } from "./AlwaysOnFox";
import { getFoxDraft, getServerDraft, subscribeFoxDraft } from "./store";
import {
  previewFacts,
  structureExplainCopy,
  structureFixPrompt,
  workspacePrompt,
} from "./workspace";

export function StructureRows({
  facts,
  draft,
}: {
  facts: ReturnType<typeof previewFacts>;
  draft: ReturnType<typeof getFoxDraft>;
}) {
  return (
    <div className="file-preview__rows">
      {facts.map((fact) => {
        const canFix = Boolean(structureFixPrompt(fact.id, draft));
        const canExplain = Boolean(structureExplainCopy(fact.id, draft));
        const deskState = fact.id === "status" || fact.id === "next" || fact.id === "file";
        if (canFix) {
          return (
            <button
              key={fact.id}
              type="button"
              className="file-preview__row file-preview__row--tap"
              aria-label={`Edit ${fact.label}`}
              onClick={() => requestFoxFix(fact.id)}
            >
              <span className="file-preview__label">{fact.label}</span>
              <span className="file-preview__value">
                <span>{fact.value}</span>
                {fact.note ? <small>{fact.note}</small> : null}
                <span className="file-preview__edit">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M8.2 1.7 10.3 3.8 4.1 10H2v-2.1l6.2-6.2Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </span>
              </span>
            </button>
          );
        }
        if (deskState || canExplain) {
          return (
            <button
              key={fact.id}
              type="button"
              className="file-preview__row file-preview__row--explain"
              onClick={() => requestFoxExplain(fact.id)}
            >
              <span className="file-preview__label">{fact.label}</span>
              <span className="file-preview__value">
                <span>{fact.value}</span>
                {fact.note ? <small>{fact.note}</small> : null}
              </span>
            </button>
          );
        }
        return (
          <div key={fact.id} className="file-preview__row">
            <span className="file-preview__label">{fact.label}</span>
            <span className="file-preview__value">
              <span>{fact.value}</span>
              {fact.note ? <small>{fact.note}</small> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function WorkspaceFileDock({ children }: { children: ReactNode }) {
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const facts = previewFacts(draft);
  const showVault = Boolean(draft.docsOpen) && Boolean(draft.sampleAccepted);

  return (
    <div className="fox-workspace-dock">
      <DocumentDrop draft={draft} compact visible={showVault} />
      {facts.length ? (
        <section className="fox-structure-notepad" aria-label="Structure">
          <p className="type-eyebrow">Structure</p>
          <StructureRows facts={facts} draft={draft} />
        </section>
      ) : null}
      <div className="fox-workspace-dock__row">{children}</div>
    </div>
  );
}

export function FilePreview() {
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const facts = previewFacts(draft);
  const ask = workspacePrompt(draft);
  const showDocs =
    !draft.workspaceFlow &&
    (ask === "documents" || draft.phase === "documents");

  if (!facts.length) {
    return null;
  }

  return (
    <aside className="file-preview">
      <div className="file-preview__desktop">
        <p className="type-eyebrow">Structure</p>
        <h2 className="type-card-title">Live file</h2>
        <StructureRows facts={facts} draft={draft} />
      </div>
      {showDocs ? <DocumentDrop draft={draft} compact /> : null}
    </aside>
  );
}
