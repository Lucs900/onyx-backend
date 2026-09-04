import {
  askClassLabel,
  labelListCopy,
  missingExtractClasses,
  missingListCopy,
  nextDocInvite,
  receivedTaxReturnCount,
  stillUsefulLabels,
  stillUsefulSection,
} from "./fileWrite";
import { canLooksRight, shouldEscalate } from "./completeness";
import { maybeProposeQualifyingFromTaxFile, QUALIFYING_INCOME_FIELD } from "./qualifyingIncome";
import type {
  Capture,
  FileCondition,
  FileEvent,
  FileEventActor,
  FileMotion,
  FileNext,
  FoxAction,
  FoxIntakeDraft,
  PendingFinish,
  PreviewOutboxItem,
  WaitingOn,
  WorkItem,
  WorkItemKind,
} from "./types";

export const REVIEW_SLA_HOURS = 4;
export const EXCEPTION_SLA_HOURS = 1;
export const PROCESSING_SLA_HOURS = 8;
export const REVIEW_SLA_MS = REVIEW_SLA_HOURS * 60 * 60 * 1000;
export const EXCEPTION_SLA_MS = EXCEPTION_SLA_HOURS * 60 * 60 * 1000;
export const PROCESSING_SLA_MS = PROCESSING_SLA_HOURS * 60 * 60 * 1000;
export const PREVIEW_SLA_MS = 30 * 1000;
export const IGNORED_NUDGE_LIMIT = 3;
export const SILENT_RETURN_ERROR = "Return needs a foxLine the borrower can hear.";
export const PAYSTUB_RETURN_LINE =
  "ONYX reviewed. They need a clearer paystub. I’m asking you for that.";
export const FILE_CAN_MOVE_LINE = "ONYX reviewed. File can move.";
export const WAITING_OUT_LINE =
  "Appraisal is ordered. That’s outside ONYX. I’ll update this thread.";

export const MOTION_COPY = {
  gatheringPrefix: "These docs help next:",
  gatheringSuffix: "Upload docs, proceed, or say not yet.",
  ready: "I can send this to review.",
  in_queue: "ONYX has this for review. I’m still here.",
  whatHappensNext:
    "This is the wait. ONYX has the file for review. I stay in this thread — I’ll nudge if it sits and I’ll bring the result back here.",
  askFox: "I’m here. Type below — I stay on this file while ONYX reviews.",
  on_hold: "Holding. I’ll keep the file. Say when to proceed.",
  waiting_out: "That’s outside ONYX. I’ll update this thread.",
  escalated:
    "A licensed originator is on this exception. I stay here. I’ll put their result in this thread.",
  nudge: "I pushed this. ONYX still has it — I’ll bring the result back here.",
  threeNudges:
    "I pushed this three times. A licensed originator is on this exception. I stay here.",
  emailAsk: "What’s a good email? I’ll remind you.",
  remind: "I’ll remind you.",
} as const;

const MOTIONS: FileMotion[] = [
  "confirmed",
  "gathering",
  "ready",
  "in_queue",
  "needs_you",
  "waiting_out",
  "on_hold",
  "escalated",
];

const LEGAL_TRANSITIONS: Record<string, FileMotion[]> = {
  preparing: ["confirmed", "gathering", "ready", "on_hold", "escalated"],
  confirmed: ["gathering", "ready", "on_hold"],
  gathering: ["ready", "on_hold", "in_queue", "escalated"],
  ready: ["in_queue", "gathering", "on_hold", "escalated"],
  in_queue: ["needs_you", "waiting_out", "escalated", "gathering", "ready"],
  needs_you: ["gathering", "in_queue", "ready", "escalated"],
  on_hold: ["gathering", "ready", "in_queue", "escalated"],
  escalated: ["in_queue", "needs_you", "ready"],
  waiting_out: ["in_queue", "needs_you", "escalated"],
};

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
  if (motion === "in_queue" || motion === "escalated") return "ONYX";
  if (motion === "waiting_out") return "Outside";
  if (motion === "confirmed") return "Fox";
  if (!motion) return "Fox";
  return "You";
}

export function waitingOnForMotion(motion: FileMotion | null | undefined): WaitingOn {
  if (motion === "in_queue" || motion === "escalated") return "onyx";
  if (motion === "waiting_out") return "outside";
  if (motion === "confirmed" || !motion) return "fox";
  return "borrower";
}

export function currentMotionKey(draft: FoxIntakeDraft): FileMotion | "preparing" {
  return motionOf(draft) ?? "preparing";
}

export function canTransition(
  from: FileMotion | "preparing" | null | undefined,
  to: FileMotion,
) {
  if (!from || from === to) return true;
  if (to === "escalated") return true;
  return (LEGAL_TRANSITIONS[from] ?? []).includes(to);
}

export function slaHoursForKind(kind: WorkItemKind) {
  if (kind === "exception") return EXCEPTION_SLA_HOURS;
  if (kind === "processing") return PROCESSING_SLA_HOURS;
  return REVIEW_SLA_HOURS;
}

export function slaMsForKind(kind: WorkItemKind) {
  return slaHoursForKind(kind) * 60 * 60 * 1000;
}

export function waitingOnOf(draft: FoxIntakeDraft): WaitingOn {
  if (draft.waitingOn) return draft.waitingOn;
  return waitingOnForMotion(motionOf(draft));
}

export function inferMotionAfterLooks(draft: FoxIntakeDraft): FileMotion {
  return nextDocInvite({ ...draft, sampleAccepted: true }) ? "gathering" : "ready";
}

export function restripeGatheringOrReady(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (!fileExists(draft)) return draft;
  if (
    draft.motion === "on_hold" ||
    draft.motion === "escalated" ||
    draft.motion === "needs_you" ||
    draft.motion === "waiting_out"
  ) {
    return draft;
  }
  if (draft.motion === "in_queue") {
    if (inferMotionAfterLooks(draft) !== "gathering") return draft;
    return {
      ...draft,
      motion: "gathering",
      nextActor: nextForMotion("gathering"),
      waitingOn: waitingOnForMotion("gathering"),
    };
  }
  const motion = inferMotionAfterLooks(draft);
  return {
    ...draft,
    motion,
    nextActor: nextForMotion(motion),
    waitingOn: waitingOnForMotion(motion),
  };
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
  return "preparing";
}

export function contactEmail(draft: FoxIntakeDraft) {
  return draft.contact.email.value.trim();
}

export function emailMissing(draft: FoxIntakeDraft) {
  return !contactEmail(draft);
}

export function emailSkipped(draft: FoxIntakeDraft) {
  return Boolean(draft.emailSkipped);
}

/** Parked: Proceed / Not yet do not open the email gate. */
export const EMAIL_AFTER_PROCEED_PARKED = true;

export function emailFinishGateOpen(draft: FoxIntakeDraft) {
  if (EMAIL_AFTER_PROCEED_PARKED) return false;
  return emailMissing(draft) && !emailSkipped(draft);
}

export function emailReadyToFinish(draft: FoxIntakeDraft) {
  return !emailFinishGateOpen(draft);
}

export function emailAskActions(): FoxAction[] {
  return [
    {
      id: "skip-email",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-email" },
    },
  ];
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
  extras: { actor?: FileEventActor; summary?: string; facts?: string[] } = {},
): FoxIntakeDraft {
  const event: FileEvent = {
    id: newId("evt"),
    at,
    kind,
    text,
    actor: extras.actor ?? "fox",
    summary: extras.summary ?? text,
    facts: extras.facts,
  };
  return { ...draft, events: [...(draft.events ?? []), event] };
}

export function openReviewItem(draft: FoxIntakeDraft, now = new Date()): WorkItem {
  return {
    id: newId("review"),
    kind: "review",
    state: "open",
    openedAt: now.toISOString(),
    slaHours: REVIEW_SLA_HOURS,
    nudgeCount: 0,
  };
}

export function openBorrowerCondition(
  title: string,
  foxLine: string,
  needed: FileCondition["needed"] = "doc",
): FileCondition {
  return {
    id: newId("cond"),
    title,
    foxLine,
    waitingOn: "borrower",
    needed,
    status: "open",
    stillUseful: true,
  };
}

export function borrowerOpenConditions(draft: FoxIntakeDraft): FileCondition[] {
  return (draft.conditions ?? []).filter(
    (item) => item.waitingOn === "borrower" && item.status === "open" && item.stillUseful,
  );
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
  const labels = stillUsefulLabels(draft);
  if (!labels.length) return missingListCopy(missingExtractClasses(draft)).replace(/\.$/, "");
  const head = labels[0].charAt(0).toUpperCase() + labels[0].slice(1);
  if (labels.length === 1) return head;
  if (labels.length === 2) return `${head} and ${labels[1]}`;
  return `${head}, ${labels.slice(1, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function returnedReviewNote(draft: FoxIntakeDraft) {
  const returned = [...(draft.workItems ?? [])]
    .reverse()
    .find(
      (item) =>
        (item.state === "done" || item.state === "returned") &&
        (item.result?.foxLine?.trim() || item.note?.trim()),
    );
  return returned?.result?.foxLine?.trim() || returned?.note?.trim() || "";
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
  return docsHandoffCopy(draft);
}

/** After Looks right: send-to-review. Chat names the next 1–3 only. Skip is fine. */
export function afterLooksRightAskCopy(draft: FoxIntakeDraft) {
  const items = (stillUsefulSection(draft)?.items ?? []).slice(0, 3);
  if (!items.length) return MOTION_COPY.ready;
  return `${MOTION_COPY.ready} Still useful: ${labelListCopy(items.map((item) => item.label))} Skip is fine.`;
}

/** After Looks right, Fox does not dump the vault. One-at-a-time invites happen before Looks right. */
export function docsHandoffCopy(draft: FoxIntakeDraft) {
  return afterLooksRightAskCopy(draft);
}

/** Bureau pull is allowed only after Proceed into licensed review. Never on browse, sketch, Looks right, or docs. */
export function creditPullPermitted(draft: FoxIntakeDraft) {
  const motion = motionOf(draft);
  return motion === "in_queue" || motion === "escalated";
}

export function inQueueEnding(draft: FoxIntakeDraft) {
  const motion = motionOf(draft);
  if (motion === "escalated" || motion === "needs_you" || motion === "on_hold") return false;
  if (motion === "in_queue" || motion === "waiting_out") return true;
  return Boolean(openReviewWorkItem(draft));
}

export function motionAskText(draft: FoxIntakeDraft) {
  const motion = motionOf(draft);
  if (inQueueEnding(draft)) {
    return MOTION_COPY.in_queue;
  }
  if (draft.pendingFinish && emailFinishGateOpen(draft)) {
    return MOTION_COPY.emailAsk;
  }
  if (motion === "on_hold") return MOTION_COPY.on_hold;
  if (motion === "waiting_out") return returnedReviewNote(draft) || MOTION_COPY.waiting_out;
  if (motion === "escalated") return MOTION_COPY.escalated;
  if (motion === "needs_you") return needsYouCopy(draft);
  if (motion === "ready") return docsHandoffCopy(draft);
  if (motion === "gathering" || motion === "confirmed") return gatheringCopy(draft);
  return gatheringCopy(draft);
}

export function afterLooksRightDocActions(draft: FoxIntakeDraft): FoxAction[] {
  return [
    { id: "upload-this", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } },
    { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
    { id: "proceed", label: "Proceed", event: "bubble", capture: { field: "proceed" } },
    { id: "not-yet-docs", label: "Not yet", event: "bubble", capture: { field: "hold-docs" } },
    ...sideDoorActions(draft),
  ];
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
      id: "ask-fox",
      label: "Ask Fox",
      event: "bubble",
      capture: { field: "ask-fox" },
    },
    {
      id: "upload-more",
      label: "Upload more",
      event: "open-docs",
      capture: { field: "upload-more" },
    },
    ...sideDoorActions(draft).filter((item) => item.id === "request-human"),
  ];
}

export function finishLineActions(draft: FoxIntakeDraft): FoxAction[] {
  const motion = motionOf(draft);
  if (inQueueEnding(draft)) return inQueueActions(draft);
  if (draft.pendingFinish && emailFinishGateOpen(draft)) {
    return emailAskActions();
  }
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
  return [
    { id: "proceed", label: "Proceed", event: "bubble", capture: { field: "proceed" } },
    { id: "not-yet", label: "Not yet", event: "bubble", capture: { field: "not-yet" } },
    ...sideDoorActions(draft),
  ];
}

export function applyLooksRightMotion(draft: FoxIntakeDraft): FoxIntakeDraft {
  const held = maybeProposeQualifyingFromTaxFile(draft);
  if (held.pendingProposal?.field === QUALIFYING_INCOME_FIELD) return held;
  if (!canLooksRight(held) && !held.sampleAccepted) return held;
  draft = held;
  if (shouldEscalate(draft)) {
    return applyEscalateMotion(
      appendFileEvent(
        {
      ...draft,
      sampleAccepted: true,
      phase: "confirmed",
      docsOpen: false,
      pendingFinish: undefined,
      workspaceDraftStatus: "ready",
    },
        "looks-right",
        "Looks right — file confirmed.",
      ),
    );
  }
  const motion = inferMotionAfterLooks(draft);
  return appendFileEvent(
    {
      ...draft,
      sampleAccepted: true,
      phase: "confirmed",
      motion,
      nextActor: nextForMotion(motion),
      waitingOn: waitingOnForMotion(motion),
      docsOpen: false,
      pendingFinish: undefined,
      workspaceDraftStatus: "ready",
    },
    "looks-right",
    "Looks right — file confirmed.",
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
        ? "ONYX has this."
        : "Holding. I’ll keep the file. Say when to proceed.",
    createdAt: now.toISOString(),
  };
  return {
    ...draft,
    previewOutbox: [...(draft.previewOutbox ?? []), item],
  };
}

export function applyProceedMotion(draft: FoxIntakeDraft, now = new Date()): FoxIntakeDraft {
  const held = maybeProposeQualifyingFromTaxFile(draft);
  if (held.pendingProposal?.field === QUALIFYING_INCOME_FIELD) return held;
  draft = held;
  if (emailFinishGateOpen(draft)) {
    return {
      ...draft,
      pendingFinish: "proceed",
      emailCaptureAsked: true,
      docsOpen: false,
      correcting: null,
    };
  }
  const from = currentMotionKey(draft);
  if (!canTransition(from, "in_queue")) return draft;
  const item = openReviewWorkItem(draft) ?? openReviewItem(draft, now);
  const withItem = appendFileEvent(
    {
      ...draft,
      motion: "in_queue",
      nextActor: "ONYX",
      waitingOn: "onyx",
      pendingFinish: undefined,
      emailCaptureAsked: draft.emailCaptureAsked,
      docsOpen: false,
      correcting: null,
      workItems: [...(draft.workItems ?? []).filter((row) => row.id !== item.id), item],
      reviewSlaMs: draft.reviewSlaMs ?? slaMsForKind(item.kind),
    },
    "proceed",
    "Proceed — review work item opened. Next = ONYX.",
    now.toISOString(),
    { actor: "borrower", summary: "Proceed — one review WorkItem open." },
  );
  return withOutbox(withItem, "proceed", contactEmail(withItem), now);
}

export function applyNotYetMotion(draft: FoxIntakeDraft, now = new Date()): FoxIntakeDraft {
  if (emailFinishGateOpen(draft)) {
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
      waitingOn: "borrower",
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
      waitingOn: waitingOnForMotion(motion),
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
      nextActor: nextForMotion("escalated"),
      waitingOn: "onyx",
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
      emailSkipped: false,
    },
    "email",
    "Email captured for a reminder.",
    now.toISOString(),
  );
  if (pending === "proceed") return applyProceedMotion(withEmail, now);
  if (pending === "not-yet") return applyNotYetMotion(withEmail, now);
  return withEmail;
}

export function applySkipEmailThenFinish(draft: FoxIntakeDraft, now = new Date()): FoxIntakeDraft {
  const pending = draft.pendingFinish;
  const skipped: FoxIntakeDraft = {
    ...draft,
    contact: {
      ...draft.contact,
      email: {
        field: "email",
        value: "",
        source: "client",
        confirmed: true,
      },
    },
    emailCaptureAsked: true,
    emailSkipped: true,
  };
  if (pending === "proceed") return applyProceedMotion(skipped, now);
  if (pending === "not-yet") return applyNotYetMotion(skipped, now);
  return skipped;
}

export type ReturnToFoxInput = {
  foxLine?: string;
  note?: string;
  next?: FileMotion;
  needsDoc?: boolean;
  condition?: Partial<FileCondition> & { title?: string };
};

function conditionTitleFromLine(foxLine: string, needed: FileCondition["needed"]) {
  if (/paystub/i.test(foxLine)) return "Clearer paystub";
  if (/appraisal/i.test(foxLine)) return "Appraisal";
  if (needed === "outside_event") return "Outside item";
  return foxLine.slice(0, 48).trim() || "Needed from you";
}

export function applyReturnToFoxMotion(
  draft: FoxIntakeDraft,
  input: ReturnToFoxInput,
  now = new Date(),
): { draft: FoxIntakeDraft; threadLine: string; error?: string } {
  const foxLine = (input.foxLine ?? input.note ?? "").trim();
  if (!foxLine) {
    return { draft, threadLine: "", error: SILENT_RETURN_ERROR };
  }
  const requestedNext: FileMotion =
    input.next ??
    (input.needsDoc || input.condition?.waitingOn === "borrower"
      ? "needs_you"
      : input.condition?.waitingOn === "outside"
        ? "waiting_out"
        : inferMotionAfterLooks(draft) === "gathering"
          ? "ready"
          : inferMotionAfterLooks(draft));
  const missingDocsOutside =
    requestedNext === "waiting_out" &&
    (input.needsDoc ||
      input.condition?.waitingOn === "borrower" ||
      input.condition?.needed === "doc");
  const nextMotion: FileMotion = missingDocsOutside ? "needs_you" : requestedNext;
  if (!canTransition(currentMotionKey(draft), nextMotion)) {
    return { draft, threadLine: "", error: SILENT_RETURN_ERROR };
  }
  const open = openReviewWorkItem(draft);
  const returned: WorkItem = {
    ...(open ?? {
      id: newId("review"),
      kind: "review" as const,
      state: "open" as const,
      openedAt: now.toISOString(),
      slaHours: REVIEW_SLA_HOURS,
      nudgeCount: 0,
    }),
    state: "done",
    returnedAt: now.toISOString(),
    note: foxLine,
    needsDoc: Boolean(input.needsDoc || nextMotion === "needs_you"),
    result: {
      summary: foxLine,
      factsChanged: [],
      next: nextMotion,
      foxLine,
    },
  };
  const needed = input.condition?.needed ?? (nextMotion === "waiting_out" ? "outside_event" : "doc");
  const waitingOn = nextMotion === "waiting_out" ? "outside" : waitingOnForMotion(nextMotion);
  const conditionWaiting: FileCondition["waitingOn"] =
    waitingOn === "fox" ? "onyx" : waitingOn === "borrower" || waitingOn === "outside" || waitingOn === "onyx"
      ? waitingOn
      : "borrower";
  const shouldWriteCondition =
    nextMotion === "needs_you" ||
    nextMotion === "waiting_out" ||
    Boolean(input.condition?.title) ||
    Boolean(input.needsDoc);
  const condition: FileCondition | null = shouldWriteCondition
    ? {
        id: input.condition?.id ?? newId("cond"),
        title: input.condition?.title ?? conditionTitleFromLine(foxLine, needed),
        foxLine: input.condition?.foxLine ?? foxLine,
        waitingOn: input.condition?.waitingOn ?? (nextMotion === "waiting_out" ? "outside" : "borrower"),
        needed,
        status: input.condition?.status ?? "open",
        stillUseful:
          (input.condition?.waitingOn ?? conditionWaiting) === "borrower" &&
          (input.condition?.status ?? "open") === "open",
      }
    : null;
  const striped: FoxIntakeDraft = {
    ...draft,
    motion: nextMotion,
    nextActor: nextForMotion(nextMotion),
    waitingOn: waitingOnForMotion(nextMotion),
    pendingFinish: undefined,
    docsOpen: nextMotion === "needs_you",
    correcting: null,
    conditions: condition ? [...(draft.conditions ?? []), condition] : draft.conditions,
  };
  const withItem = replaceReviewItem(striped, returned);
  const next = appendFileEvent(withItem, "return-to-fox", foxLine, now.toISOString(), {
    actor: "onyx",
    summary: foxLine,
  });
  return { draft: next, threadLine: foxLine };
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
  const nudgeCount = (item.nudgeCount ?? 0) + 1;
  if (nudgeCount >= IGNORED_NUDGE_LIMIT) {
    const escalated = replaceReviewItem(
      appendFileEvent(
        {
          ...draft,
          originatorRequested: true,
          motion: "escalated",
          nextActor: "ONYX",
          waitingOn: "onyx",
        },
        "nudge",
        MOTION_COPY.threeNudges,
        now.toISOString(),
        { actor: "fox", summary: MOTION_COPY.threeNudges },
      ),
      {
        ...item,
        state: "blocked",
        nudgedAt: now.toISOString(),
        nudgeCount,
      },
    );
    return { draft: escalated, threadLine: MOTION_COPY.threeNudges };
  }
  const nudged: WorkItem = {
    ...item,
    state: "nudged",
    nudgedAt: now.toISOString(),
    nudgeCount,
  };
  const next = replaceReviewItem(
    appendFileEvent(
      {
        ...draft,
        motion: "in_queue",
        nextActor: "ONYX",
        waitingOn: "onyx",
      },
      "nudge",
      MOTION_COPY.nudge,
      now.toISOString(),
      { actor: "fox", summary: MOTION_COPY.nudge },
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
  if (/^upload more\b/.test(lower) || /^upload docs\b/.test(lower) || lower === "upload") {
    return { field: "upload-more" };
  }
  return null;
}
