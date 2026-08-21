import {
  askClassLabel,
  missingExtractClasses,
  missingListCopy,
} from "./fileWrite";
import type {
  Capture,
  FileEvent,
  FileMotion,
  FileNext,
  FoxAction,
  FoxIntakeDraft,
  PendingFinish,
  PreviewOutboxItem,
  WorkItem,
} from "./types";

export const REVIEW_SLA_MS = 4 * 60 * 60 * 1000;
export const PREVIEW_SLA_MS = 30 * 1000;

export const MOTION_COPY = {
  gatheringPrefix: "Still useful:",
  gatheringSuffix: "Skip is fine.",
  ready: "This file can move. Proceed, upload more, or not yet.",
  in_queue:
    "ONYX has this for review. I’m on it — I’ll nudge if it sits and I’ll bring the result back here.",
  whatHappensNext:
    "This is the wait. ONYX has the file for review. I stay in this thread — I’ll nudge if it sits and I’ll bring the result back here.",
  askFox: "I’m here. Type below — I stay on this file while ONYX reviews.",
  on_hold: "Holding. I’ll keep the file. Say when to proceed.",
  escalated:
    "A licensed originator is on this exception. I stay here. I’ll put their result in this thread.",
  nudge: "I nudged this. ONYX still has it — I’ll bring the result back here.",
  emailAsk: "What’s a good email? I’ll remind you.",
  remind: "I’ll remind you.",
} as const;

const MOTIONS: FileMotion[] = [
  "confirmed",
  "gathering",
  "ready",
  "in_queue",
  "needs_you",
  "on_hold",
  "escalated",
];

const NEXT_ACTORS: FileNext[] = ["You", "Fox", "ONYX", "Outside"];

export function isFileMotion(value: unknown): value is FileMotion {
  return typeof value === "string" && MOTIONS.includes(value as FileMotion);
}

export function isFileNext(value: unknown): value is FileNext {
  return typeof value === "string" && NEXT_ACTORS.includes(value as FileNext);
}

export function fileExists(draft: FoxIntakeDraft) {
  return Boolean(
    draft.sampleAccepted ||
      draft.phase === "confirmed" ||
      draft.motion ||
      draft.workspaceDraftStatus === "with-originator",
  );
}

export function nextForMotion(motion: FileMotion | null | undefined): FileNext {
  if (motion === "in_queue") return "ONYX";
  if (motion === "escalated") return "Outside";
  if (motion === "confirmed") return "Fox";
  return "You";
}

export function inferMotionAfterLooks(draft: FoxIntakeDraft): FileMotion {
  return missingExtractClasses(draft).length ? "gathering" : "ready";
}

export function restripeGatheringOrReady(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (!fileExists(draft)) return draft;
  if (draft.motion === "on_hold" || draft.motion === "escalated" || draft.motion === "needs_you") {
    return draft;
  }
  if (draft.motion === "in_queue") {
    if (inferMotionAfterLooks(draft) !== "gathering") return draft;
    return { ...draft, motion: "gathering", nextActor: nextForMotion("gathering") };
  }
  const motion = inferMotionAfterLooks(draft);
  return { ...draft, motion, nextActor: nextForMotion(motion) };
}

export function motionOf(draft: FoxIntakeDraft): FileMotion | null {
  if (isFileMotion(draft.motion)) return draft.motion;
  if (!fileExists(draft)) return null;
  return inferMotionAfterLooks(draft);
}

export function nextActorOf(draft: FoxIntakeDraft): FileNext {
  if (isFileNext(draft.nextActor)) return draft.nextActor;
  return nextForMotion(motionOf(draft));
}

export function motionStatusCopy(draft: FoxIntakeDraft) {
  const motion = motionOf(draft);
  if (motion) return motion;
  if (draft.workspaceDraftStatus === "ready") return "Ready for you";
  return "Preparing";
}

export function contactEmail(draft: FoxIntakeDraft) {
  return draft.contact.email.value.trim();
}

export function emailMissing(draft: FoxIntakeDraft) {
  return !contactEmail(draft);
}

export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendFileEvent(
  draft: FoxIntakeDraft,
  kind: FileEvent["kind"],
  text: string,
  at = new Date().toISOString(),
): FoxIntakeDraft {
  const event: FileEvent = { id: newId("evt"), at, kind, text };
  return { ...draft, events: [...(draft.events ?? []), event] };
}

export function openReviewItem(draft: FoxIntakeDraft, now = new Date()): WorkItem {
  return {
    id: newId("review"),
    kind: "review",
    state: "open",
    openedAt: now.toISOString(),
  };
}

export function openReviewWorkItem(draft: FoxIntakeDraft, now = new Date()): WorkItem | undefined {
  return (draft.workItems ?? []).find(
    (item) => item.kind === "review" && (item.state === "open" || item.state === "nudged"),
  );
}

function replaceReviewItem(draft: FoxIntakeDraft, next: WorkItem): FoxIntakeDraft {
  const items = draft.workItems ?? [];
  const index = items.findIndex((item) => item.id === next.id);
  if (index < 0) return { ...draft, workItems: [...items, next] };
  return { ...draft, workItems: items.map((item) => (item.id === next.id ? next : item)) };
}

export function gatheringList(draft: FoxIntakeDraft) {
  return missingListCopy(missingExtractClasses(draft)).replace(/\.$/, "");
}

export function returnedReviewNote(draft: FoxIntakeDraft) {
  const returned = [...(draft.workItems ?? [])]
    .reverse()
    .find((item) => item.kind === "review" && item.state === "returned" && item.note?.trim());
  return returned?.note?.trim() || "";
}

export function needsYouThing(draft: FoxIntakeDraft) {
  const note = returnedReviewNote(draft);
  if (note) return note;
  const missing = missingExtractClasses(draft);
  if (missing[0]) return askClassLabel(missing[0]);
  return "a document";
}

export function needsYouCopy(draft: FoxIntakeDraft) {
  const note = returnedReviewNote(draft);
  if (note) return note;
  return `I need ${needsYouThing(draft)} from you.`;
}

export function gatheringCopy(draft: FoxIntakeDraft) {
  const list = gatheringList(draft);
  return list
    ? `${MOTION_COPY.gatheringPrefix} ${list}. ${MOTION_COPY.gatheringSuffix}`
    : MOTION_COPY.ready;
}

export function inQueueEnding(draft: FoxIntakeDraft) {
  const motion = motionOf(draft);
  if (motion === "escalated" || motion === "needs_you" || motion === "on_hold") return false;
  if (motion === "in_queue") return true;
  return Boolean(openReviewWorkItem(draft));
}

export function motionAskText(draft: FoxIntakeDraft) {
  if (draft.pendingFinish && emailMissing(draft)) return MOTION_COPY.emailAsk;
  const motion = motionOf(draft);
  if (inQueueEnding(draft)) {
    if ((draft.docsOpen || motion === "gathering") && missingExtractClasses(draft).length) {
      return gatheringCopy(draft);
    }
    return MOTION_COPY.in_queue;
  }
  if (motion === "on_hold") return MOTION_COPY.on_hold;
  if (motion === "escalated") return MOTION_COPY.escalated;
  if (motion === "needs_you") return needsYouCopy(draft);
  if (motion === "ready") return MOTION_COPY.ready;
  if (motion === "gathering" || motion === "confirmed") return gatheringCopy(draft);
  return gatheringCopy(draft);
}

function sideDoorActions(draft: FoxIntakeDraft): FoxAction[] {
  const actions: FoxAction[] = [];
  if (!draft.originatorRequested && draft.motion !== "escalated") {
    actions.push({
      id: "request-human",
      label: "Request human",
      event: "bubble",
      capture: { field: "talk-originator" },
      quiet: true,
    });
  }
  if (draft.path === "loan-only") {
    actions.push({
      id: "what-acr",
      label: "What is ACR?",
      event: "bubble",
      capture: { field: "what-acr" },
      quiet: true,
    });
  }
  return actions;
}

function inQueueActions(draft: FoxIntakeDraft): FoxAction[] {
  return [
    {
      id: "what-happens-next",
      label: "What happens next?",
      event: "bubble",
      capture: { field: "what-happens-next" },
    },
    {
      id: "upload-more",
      label: "Upload more",
      event: "open-docs",
      capture: { field: "upload-more" },
    },
    {
      id: "ask-fox",
      label: "Ask Fox",
      event: "bubble",
      capture: { field: "ask-fox" },
    },
    ...sideDoorActions(draft),
  ];
}

export function finishLineActions(draft: FoxIntakeDraft): FoxAction[] {
  if (draft.pendingFinish && emailMissing(draft)) return [];
  const motion = motionOf(draft);
  if (inQueueEnding(draft)) return inQueueActions(draft);
  if (motion === "escalated") {
    return [
      {
        id: "upload-more",
        label: "Upload more",
        event: "open-docs",
        capture: { field: "upload-more" },
      },
      ...sideDoorActions(draft),
    ];
  }
  const missing = missingExtractClasses(draft);
  const actions: FoxAction[] = [
    { id: "proceed", label: "Proceed", event: "bubble", capture: { field: "proceed" } },
    {
      id: "upload-more",
      label: "Upload more",
      event: "open-docs",
      capture: { field: "upload-more" },
    },
    { id: "not-yet", label: "Not yet", event: "bubble", capture: { field: "not-yet" } },
  ];
  if (missing.length && !draft.documentsSkipped && motion !== "on_hold") {
    actions.push({
      id: "skip-docs",
      label: "Skip for now",
      event: "bubble",
      capture: { field: "skip-docs" },
    });
  }
  actions.push(...sideDoorActions(draft));
  return actions;
}

export function applyLooksRightMotion(draft: FoxIntakeDraft): FoxIntakeDraft {
  const motion = inferMotionAfterLooks(draft);
  return appendFileEvent(
    {
      ...draft,
      sampleAccepted: true,
      motion,
      nextActor: nextForMotion(motion),
      docsOpen: false,
      pendingFinish: undefined,
      workspaceDraftStatus: draft.workspaceDraftStatus === "with-originator"
        ? draft.workspaceDraftStatus
        : "ready",
    },
    "looks-right",
    "Looks right — file confirmed. Originator assigned.",
  );
}

function withOutbox(
  draft: FoxIntakeDraft,
  finish: PendingFinish,
  email: string,
  now = new Date(),
): FoxIntakeDraft {
  if (!email) return draft;
  const item: PreviewOutboxItem = {
    to: email,
    subject: finish === "proceed" ? "File in review" : "File on hold",
    body:
      finish === "proceed"
        ? "ONYX has this for review. I’ll nudge if it sits and I’ll bring the result back here."
        : "Holding. I’ll keep the file. Say when to proceed.",
    createdAt: now.toISOString(),
  };
  return {
    ...draft,
    previewOutbox: [...(draft.previewOutbox ?? []), item],
  };
}

export function applyProceedMotion(draft: FoxIntakeDraft, now = new Date()): FoxIntakeDraft {
  if (emailMissing(draft)) {
    return {
      ...draft,
      pendingFinish: "proceed",
      emailCaptureAsked: true,
      docsOpen: false,
      correcting: null,
    };
  }
  const item = openReviewWorkItem(draft) ?? openReviewItem(draft, now);
  const withItem = appendFileEvent(
    {
      ...draft,
      motion: "in_queue",
      nextActor: "ONYX",
      pendingFinish: undefined,
      docsOpen: false,
      correcting: null,
      workItems: [...(draft.workItems ?? []).filter((row) => row.id !== item.id), item],
      reviewSlaMs: draft.reviewSlaMs ?? REVIEW_SLA_MS,
    },
    "proceed",
    "Proceed — review work item opened. Next = ONYX.",
    now.toISOString(),
  );
  return withOutbox(withItem, "proceed", contactEmail(withItem), now);
}

export function applyNotYetMotion(draft: FoxIntakeDraft, now = new Date()): FoxIntakeDraft {
  if (emailMissing(draft)) {
    return {
      ...draft,
      pendingFinish: "not-yet",
      emailCaptureAsked: true,
      docsOpen: false,
      correcting: null,
    };
  }
  const next = appendFileEvent(
    {
      ...draft,
      motion: "on_hold",
      nextActor: "You",
      pendingFinish: undefined,
      docsOpen: false,
      correcting: null,
    },
    "not-yet",
    "Not yet — holding. Same file.",
    now.toISOString(),
  );
  return withOutbox(next, "not-yet", contactEmail(next), now);
}

export function applyUploadMoreMotion(draft: FoxIntakeDraft): FoxIntakeDraft {
  const held = draft.motion === "on_hold" || draft.motion === "needs_you" || draft.motion === "ready";
  const motion: FileMotion = held || !draft.motion ? inferMotionAfterLooks(draft) : draft.motion === "in_queue" || draft.motion === "escalated"
    ? draft.motion
    : "gathering";
  return appendFileEvent(
    {
      ...draft,
      motion,
      nextActor: nextForMotion(motion),
      docsOpen: true,
      correcting: null,
    },
    "upload-more",
    "Upload more — same missing list.",
  );
}

export function applyEscalateMotion(draft: FoxIntakeDraft): FoxIntakeDraft {
  return appendFileEvent(
    {
      ...draft,
      originatorRequested: true,
      motion: "escalated",
      nextActor: "Outside",
      pendingFinish: undefined,
      correcting: null,
    },
    "request-human",
    "Request human — escalated. Fox stays.",
  );
}

export function applyEmailThenFinish(
  draft: FoxIntakeDraft,
  email: string,
  now = new Date(),
): FoxIntakeDraft {
  const pending = draft.pendingFinish;
  const withEmail = appendFileEvent(
    {
      ...draft,
      contact: {
        ...draft.contact,
        email: {
          field: "email",
          value: email.trim(),
          source: "client",
          confirmed: false,
        },
      },
      emailCaptureAsked: true,
    },
    "email",
    "Email captured for a reminder.",
    now.toISOString(),
  );
  if (pending === "proceed") return applyProceedMotion(withEmail, now);
  if (pending === "not-yet") return applyNotYetMotion(withEmail, now);
  return withEmail;
}

export function applyReturnToFoxMotion(
  draft: FoxIntakeDraft,
  input: { note: string; needsDoc?: boolean },
  now = new Date(),
): { draft: FoxIntakeDraft; threadLine: string } {
  const note = input.note.trim();
  const open = openReviewWorkItem(draft);
  const returned: WorkItem = open
    ? {
        ...open,
        state: "returned",
        returnedAt: now.toISOString(),
        note: note || open.note,
        needsDoc: Boolean(input.needsDoc),
      }
    : {
        id: newId("review"),
        kind: "review",
        state: "returned",
        openedAt: now.toISOString(),
        returnedAt: now.toISOString(),
        note,
        needsDoc: Boolean(input.needsDoc),
      };
  const motion: FileMotion = input.needsDoc
    ? "needs_you"
    : inferMotionAfterLooks(draft);
  const striped: FoxIntakeDraft = {
    ...draft,
    motion,
    nextActor: nextForMotion(motion),
    pendingFinish: undefined,
    docsOpen: Boolean(input.needsDoc),
    correcting: null,
  };
  const withItem = replaceReviewItem(striped, returned);
  const threadLine =
    note ||
    (input.needsDoc ? needsYouCopy(withItem) : "ONYX returned this file. I stay here.");
  const next = appendFileEvent(withItem, "return-to-fox", threadLine, now.toISOString());
  return { draft: next, threadLine };
}

export function reviewSlaMsOf(draft: FoxIntakeDraft) {
  return draft.reviewSlaMs && draft.reviewSlaMs > 0 ? draft.reviewSlaMs : REVIEW_SLA_MS;
}

export function reviewIsSitting(
  draft: FoxIntakeDraft,
  now = new Date(),
  slaMs = reviewSlaMsOf(draft),
) {
  if (motionOf(draft) !== "in_queue") return false;
  const item = openReviewWorkItem(draft);
  if (!item) return false;
  const start = Date.parse(item.nudgedAt || item.openedAt);
  if (!Number.isFinite(start)) return false;
  return now.getTime() - start >= slaMs;
}

export function applyNudgeMotion(
  draft: FoxIntakeDraft,
  input: { force?: boolean; now?: Date } = {},
): { draft: FoxIntakeDraft; threadLine: string | null } {
  const now = input.now ?? new Date();
  const item = openReviewWorkItem(draft);
  if (!item) return { draft, threadLine: null };
  if (!input.force && !reviewIsSitting(draft, now)) return { draft, threadLine: null };
  const nudged: WorkItem = {
    ...item,
    state: "nudged",
    nudgedAt: now.toISOString(),
  };
  const next = replaceReviewItem(
    appendFileEvent(
      {
        ...draft,
        motion: "in_queue",
        nextActor: "ONYX",
      },
      "nudge",
      MOTION_COPY.nudge,
      now.toISOString(),
    ),
    nudged,
  );
  return { draft: next, threadLine: MOTION_COPY.nudge };
}

export function expireOpenReview(draft: FoxIntakeDraft, now = new Date()): FoxIntakeDraft {
  const item = openReviewWorkItem(draft);
  if (!item) return draft;
  const openedAt = new Date(now.getTime() - reviewSlaMsOf(draft) - 1000).toISOString();
  return replaceReviewItem(draft, { ...item, openedAt, nudgedAt: undefined, state: "open" });
}

export function latestOutbox(draft: FoxIntakeDraft) {
  const items = draft.previewOutbox ?? [];
  return items[items.length - 1] ?? null;
}

export function remindLine(draft: FoxIntakeDraft) {
  const item = latestOutbox(draft);
  if (!item) return "";
  return `${MOTION_COPY.remind} ${item.to}`;
}

export function parsePreviewSla(value: string | null | undefined) {
  if (!value) return null;
  if (value === "30" || value === "30s" || value === "preview") return PREVIEW_SLA_MS;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function finishCaptureFromText(text: string): Capture | null {
  const lower = text.trim().toLowerCase();
  if (/^proceed\b/.test(lower) || lower === "go ahead" || lower === "move it") {
    return { field: "proceed" };
  }
  if (/^not yet\b/.test(lower) || lower === "hold" || lower === "hold this") {
    return { field: "not-yet" };
  }
  if (/^upload more\b/.test(lower) || lower === "upload") {
    return { field: "upload-more" };
  }
  return null;
}
