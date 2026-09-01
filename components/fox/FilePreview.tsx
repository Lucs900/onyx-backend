"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DocumentDrop } from "./DocumentDrop";
import { requestFoxExplain, requestFoxFix } from "./AlwaysOnFox";
import { FOX_KEYBOARD_EVENT } from "./askReveal";
import { NOTHING_URGENT, stillUsefulSection } from "./fileWrite";
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

export function StillUsefulSection({
  draft,
}: {
  draft: ReturnType<typeof getFoxDraft>;
}) {
  const section = stillUsefulSection(draft);
  if (!section) return null;
  return (
    <section className="fox-still-useful" aria-label="Still useful">
      <p className="type-eyebrow">Still useful</p>
      {section.empty ? (
        <p className="fox-still-useful__empty">{NOTHING_URGENT}</p>
      ) : (
        <div className="file-preview__rows">
          {section.items.map((item) => (
            <div key={item.id} className="file-preview__row">
              <span className="file-preview__label">{item.label}</span>
              <span className="file-preview__value" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function WorkspaceFileDock({ children }: { children: ReactNode }) {
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const facts = previewFacts(draft);
  const showVault = false;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const close = () => setSheetOpen(false);
    window.addEventListener(FOX_KEYBOARD_EVENT, close);
    return () => window.removeEventListener(FOX_KEYBOARD_EVENT, close);
  }, []);

  return (
    <div className="fox-workspace-dock">
      <DocumentDrop draft={draft} compact visible={showVault} />
      <div className="fox-workspace-dock__row">
        {children}
        {facts.length ? (
          <button
            type="button"
            className="fox-file-chip"
            aria-expanded={sheetOpen}
            aria-controls="fox-file-sheet"
            onClick={() => setSheetOpen(true)}
          >
            File
          </button>
        ) : null}
      </div>
      {mounted && sheetOpen
        ? createPortal(
            <div className="file-sheet" id="fox-file-sheet" role="dialog" aria-label="File">
              <button
                type="button"
                className="file-sheet__backdrop"
                aria-label="Close file"
                onClick={() => setSheetOpen(false)}
              />
              <div className="file-sheet__panel">
                <div className="file-sheet__head">
                  <div className="file-sheet__heading">
                    <p className="type-eyebrow">File</p>
                    <p className="file-sheet__path">Structure</p>
                  </div>
                  <button
                    type="button"
                    className="file-sheet__close"
                    onClick={() => setSheetOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <StructureRows facts={facts} draft={draft} />
                <StillUsefulSection draft={draft} />
              </div>
            </div>,
            document.body,
          )
        : null}
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
        <StillUsefulSection draft={draft} />
      </div>
      {showDocs ? <DocumentDrop draft={draft} compact /> : null}
    </aside>
  );
}
