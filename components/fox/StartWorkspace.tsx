"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { pathFromQuery, rememberStartPath } from "@/components/products/startPath";
import { AlwaysOnFox } from "./AlwaysOnFox";
import { FilePreview } from "./FilePreview";
import {
  continueWorkspaceFromEntry,
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  prepareWorkspaceDraft,
  resetWorkspaceForEntry,
  setDraftPath,
  setDraftProductIntent,
  shouldResumeWorkspaceEntry,
  subscribeFoxDraft,
} from "./store";
import { productIntentFromQuery, productIntentFromSlug } from "./workspace";

export function StartWorkspace() {
  const searchParams = useSearchParams();
  const queryPath = pathFromQuery(searchParams.get("path"));
  if (typeof window !== "undefined") hydrateFoxDraft();
  if (queryPath) rememberStartPath(queryPath);
  const startPath =
    queryPath ??
    (shouldResumeWorkspaceEntry() ? getFoxDraft().path ?? rememberStartPath(null) : rememberStartPath(null));
  const startIntent =
    productIntentFromQuery(searchParams.get("intent")) ??
    productIntentFromSlug(searchParams.get("product"));
  const booted = useRef(false);
  if (typeof window !== "undefined" && !booted.current) {
    booted.current = true;
    continueWorkspaceFromEntry(startPath, startIntent);
  }
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);

  const lastPath = useRef(startPath);
  useEffect(() => {
    if (lastPath.current !== startPath) {
      lastPath.current = startPath;
      if (shouldResumeWorkspaceEntry()) {
        if (startPath && !getFoxDraft().path) setDraftPath(startPath);
        return;
      }
      resetWorkspaceForEntry(startPath, startIntent);
      return;
    }
    if (startIntent) setDraftProductIntent(startIntent);
  }, [startIntent, startPath]);

  useEffect(() => {
    if (!draft.workspaceFlow) return;
    if (draft.workspaceDraftStatus === "preparing") {
      prepareWorkspaceDraft();
    }
  }, [draft.workspaceDraftStatus, draft.workspaceFlow]);

  const factsExist =
    Boolean(draft.path) ||
    Boolean(draft.productIntent) ||
    Boolean(draft.occupancyChoice.value) ||
    Boolean(draft.timelineChoice.value) ||
    draft.loanAmountValue != null ||
    draft.propertyValueAmount != null ||
    draft.downPaymentAmount != null ||
    draft.documents.length > 0 ||
    draft.documentsSkipped;

  return (
    <section className="start-workspace page-pad">
      <div
        className={
          factsExist
            ? "page-inner start-workspace__inner"
            : "page-inner start-workspace__inner start-workspace__inner--solo"
        }
      >
        <div className="start-workspace__fox-wrap">
          <AlwaysOnFox startPath={startPath} startIntent={startIntent} inWorkspace />
        </div>
        <FilePreview />
      </div>
    </section>
  );
}
