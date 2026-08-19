"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { pathFromQuery, rememberStartPath } from "@/components/products/startPath";
import { useDocumentReads } from "./DocumentDrop";
import { FilePreview } from "./FilePreview";
import {
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  prepareWorkspaceDraft,
  setDraftPath,
  setDraftProductIntent,
  setWorkspaceFlow,
  subscribeFoxDraft,
} from "./store";
import { starterText, productIntentFromQuery, productIntentFromSlug } from "./workspace";
import { PRODUCT_INTENT_BUBBLES } from "./types";

export function StartWorkspace() {
  const searchParams = useSearchParams();
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);

  useDocumentReads(draft);

  useEffect(() => {
    hydrateFoxDraft();
    setWorkspaceFlow(true);
    const path = rememberStartPath(searchParams.get("path"));
    if (path) setDraftPath(path);
    const intent =
      productIntentFromQuery(searchParams.get("intent")) ??
      productIntentFromSlug(searchParams.get("product"));
    if (intent) setDraftProductIntent(intent);
  }, [searchParams]);

  useEffect(() => {
    if (!draft.workspaceFlow) return;
    if (draft.workspaceDraftStatus === "preparing") {
      prepareWorkspaceDraft();
      return;
    }
    if (draft.workspaceDraftStatus) return;
    if (draft.documents.length > 0 || draft.documentsSkipped) {
      prepareWorkspaceDraft();
    }
  }, [
    draft.documents.length,
    draft.documentsSkipped,
    draft.workspaceDraftStatus,
    draft.workspaceFlow,
  ]);

  const path = pathFromQuery(searchParams.get("path"));

  return (
    <section className="start-workspace page-pad">
      <div className="page-inner start-workspace__inner">
        <FilePreview />
        <div className="start-workspace__fox-wrap">
          <div className="fox-stage fox-stage--workspace start-workspace__fox-fallback">
            <div className="fox-bar__head">
              <span className="fox-bar__title">ONYX Fox</span>
            </div>
            <div className="fox-panel__thread">
              <article className="fox-bubble fox-bubble--fox">
                <p>{starterText(path)}</p>
                <div className="fox-bubble__actions">
                  {PRODUCT_INTENT_BUBBLES.map((item) => (
                    <span key={item.value} className="btn btn--secondary fox-chip">
                      {item.label}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </div>
          <div id="fox-start-stage" className="start-workspace__fox" />
        </div>
      </div>
    </section>
  );
}
