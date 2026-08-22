"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
              onClick={() => requestFoxFix(fact.id)}
            >
              <span className="file-preview__label">{fact.label}</span>
              <span className="file-preview__value">
                <span>{fact.value}</span>
                {fact.note ? <small>{fact.note}</small> : null}
              </span>
            </button>
          );
        }
        if (deskState || canExplain) {
          return (
            <button
              key={fact.id}
              type="button"
              className={
                deskState
                  ? "file-preview__row file-preview__row--tap"
                  : "file-preview__row file-preview__row--explain"
              }
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const newest =
    [...facts].reverse().find((fact) => fact.id !== "status") ?? facts[facts.length - 1];
  const peek = newest ? `${newest.label} · ${newest.value}` : "";
  const chip =
    facts.length > 1 ? `Structure · ${facts.length} facts` : peek || "Structure";
  const pathFact = facts.find((fact) => fact.id === "path");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const close = () => setSheetOpen(false);
    window.addEventListener("onyx:fox-fix", close);
    window.addEventListener("onyx:fox-explain", close);
    return () => {
      window.removeEventListener("onyx:fox-fix", close);
      window.removeEventListener("onyx:fox-explain", close);
    };
  }, []);

  const sheet =
    mounted && sheetOpen && facts.length
      ? createPortal(
          <div className="file-sheet" role="dialog" aria-label="File">
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
                  {pathFact ? (
                    <p className="file-sheet__path">
                      {pathFact.label} · {pathFact.value}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="file-sheet__close"
                  onClick={() => setSheetOpen(false)}
                >
                  Hide
                </button>
              </div>
              <StructureRows facts={facts} draft={draft} />
            </div>
          </div>,
          document.body,
        )
      : null;

  const showDrop =
    draft.docsOpen ||
    workspacePrompt(draft) === "documents" ||
    draft.phase === "documents";

  return (
    <div className="fox-workspace-dock">
      {showDrop ? <DocumentDrop draft={draft} compact /> : null}
      {facts.length ? (
        <button
          type="button"
          className="fox-structure-chip"
          onClick={() => setSheetOpen(true)}
        >
          {chip}
        </button>
      ) : null}
      <div className="fox-workspace-dock__row">
        {children}
      </div>
      {sheet}
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
