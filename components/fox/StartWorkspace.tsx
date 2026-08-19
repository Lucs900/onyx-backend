"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { rememberStartPath } from "@/components/products/startPath";
import { AlwaysOnFox } from "./AlwaysOnFox";
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
import { productIntentFromQuery, productIntentFromSlug } from "./workspace";

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

  return (
    <section className="start-workspace page-pad">
      <div className="page-inner start-workspace__inner">
        <FilePreview />
        <div className="start-workspace__fox-wrap">
          {/* Live engine — same AlwaysOnFox as every other Fox surface. Not a fallback shell. */}
          <AlwaysOnFox />
        </div>
      </div>
    </section>
  );
}
