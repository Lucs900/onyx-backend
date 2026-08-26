"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { pathFromQuery, rememberStartPath } from "@/components/products/startPath";
import { AlwaysOnFox } from "./AlwaysOnFox";
import { FilePreview } from "./FilePreview";
import {
  applyPreviewMotionControls,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPath = pathFromQuery(searchParams.get("path"));
  const homepageFresh = searchParams.get("fresh") === "1";
  if (typeof window !== "undefined") hydrateFoxDraft();
  if (queryPath) rememberStartPath(queryPath);
  const startPath =
    queryPath ??
    (homepageFresh
      ? rememberStartPath(null)
      : shouldResumeWorkspaceEntry()
        ? getFoxDraft().path ?? rememberStartPath(null)
        : rememberStartPath(null));
  const startIntent =
    productIntentFromQuery(searchParams.get("intent")) ??
    productIntentFromSlug(searchParams.get("product"));
  const booted = useRef(false);
  if (typeof window !== "undefined" && !booted.current) {
    booted.current = true;
    continueWorkspaceFromEntry(startPath, startIntent, { fresh: homepageFresh });
  }
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);

  const lastPath = useRef(startPath);
  const previewSuggestKey = useRef("");
  useEffect(() => {
    if (!homepageFresh) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("fresh");
    const qs = next.toString();
    router.replace(qs ? `/start?${qs}` : "/start", { scroll: false });
  }, [homepageFresh, router, searchParams]);
  useEffect(() => {
    if (lastPath.current !== startPath) {
      lastPath.current = startPath;
      if (shouldResumeWorkspaceEntry()) {
        if (startPath && !getFoxDraft().path) setDraftPath(startPath);
      } else {
        resetWorkspaceForEntry(startPath, startIntent);
        previewSuggestKey.current = "";
      }
    } else if (startIntent) {
      setDraftProductIntent(startIntent);
    }
    const suggest = searchParams.get("suggest");
    const key = suggest ?? "";
    if (previewSuggestKey.current !== key) {
      previewSuggestKey.current = key;
      applyPreviewMotionControls({ suggest });
    }
  }, [searchParams, startIntent, startPath]);

  useEffect(() => {
    if (!draft.workspaceFlow) return;
    if (draft.workspaceDraftStatus === "preparing") {
      prepareWorkspaceDraft();
    }
  }, [draft.workspaceDraftStatus, draft.workspaceFlow]);

  const factsExist =
    Boolean(draft.path) ||
    Boolean(draft.productIntent) ||
    Boolean(draft.pendingProposal) ||
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
