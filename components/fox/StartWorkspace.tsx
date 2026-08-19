"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { pathFromQuery, rememberStartPath } from "@/components/products/startPath";
import { AlwaysOnFox } from "./AlwaysOnFox";
import { useDocumentReads } from "./DocumentDrop";
import { FilePreview } from "./FilePreview";
import {
  getFoxDraft,
  getServerDraft,
  prepareWorkspaceDraft,
  resetWorkspaceForEntry,
  subscribeFoxDraft,
} from "./store";
import { productIntentFromQuery, productIntentFromSlug } from "./workspace";

export function StartWorkspace() {
  const searchParams = useSearchParams();
  const startPath = rememberStartPath(searchParams.get("path")) ?? pathFromQuery(searchParams.get("path"));
  const startIntent =
    productIntentFromQuery(searchParams.get("intent")) ??
    productIntentFromSlug(searchParams.get("product"));
  const booted = useRef(false);
  if (typeof window !== "undefined" && !booted.current) {
    booted.current = true;
    resetWorkspaceForEntry(startPath);
  }
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);

  useDocumentReads(draft);

  const lastPath = useRef(startPath);
  useEffect(() => {
    if (lastPath.current === startPath) return;
    lastPath.current = startPath;
    resetWorkspaceForEntry(startPath);
  }, [startPath]);

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
