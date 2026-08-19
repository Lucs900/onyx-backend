"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { pathFromQuery, rememberStartPath } from "@/components/products/startPath";
import { AlwaysOnFox } from "./AlwaysOnFox";
import { useDocumentReads } from "./DocumentDrop";
import { FilePreview } from "./FilePreview";
import {
  applyWorkspaceEntry,
  getFoxDraft,
  getServerDraft,
  prepareWorkspaceDraft,
  subscribeFoxDraft,
} from "./store";
import { productIntentFromQuery, productIntentFromSlug } from "./workspace";

export function StartWorkspace() {
  const searchParams = useSearchParams();
  const startPath = rememberStartPath(searchParams.get("path")) ?? pathFromQuery(searchParams.get("path"));
  const startIntent =
    productIntentFromQuery(searchParams.get("intent")) ??
    productIntentFromSlug(searchParams.get("product"));
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);

  if (typeof window !== "undefined") {
    applyWorkspaceEntry(startPath, startIntent);
  }

  useDocumentReads(draft);

  useEffect(() => {
    applyWorkspaceEntry(startPath, startIntent);
  }, [startPath, startIntent]);

  useEffect(() => {
    if (!draft.workspaceFlow) return;
    if (draft.workspaceDraftStatus === "preparing") {
      prepareWorkspaceDraft();
    }
  }, [draft.workspaceDraftStatus, draft.workspaceFlow]);

  return (
    <section className="start-workspace page-pad">
      <div className="page-inner start-workspace__inner">
        <FilePreview />
        <div className="start-workspace__fox-wrap">
          <AlwaysOnFox startPath={startPath} startIntent={startIntent} inWorkspace />
        </div>
      </div>
    </section>
  );
}
