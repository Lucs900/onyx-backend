/**
 * Processing hub v0 — 1008 analog on the same File as /start.
 * Send posts foxLine. Silent notes stay off the borrower thread.
 * Never credit pull, lock, AU, SSN, BNTouch, LO-will-contact, green approved.
 */
import { condoNeedsReviewPersisted, stillUsefulSpokenItems } from "./fileWrite";
import { fileCompleteness, showsAgencyCompleteness } from "./completeness";
import {
  appendFileEvent,
  finishLineActions,
  inQueueEnding,
  motionOf,
  motionStatusCopy,
  nextActorOf,
  waitingOnOf,
} from "./motion";
import type {
  FileCondition,
  FileEvent,
  FoxIntakeDraft,
  FoxMessage,
  ReceivedDoc,
} from "./types";
import { CREDIT_STATED_NOTE } from "./types";
import { previewFacts, productIntentLabel } from "./workspace";

export const STAFF_HUB_PATH = "/staff/hub";
export const STAFF_W2_FOX_LINE = "I still need last year’s W-2 when you have it.";
export const SILENT_DESK_ERROR = "Send needs a foxLine the borrower can hear.";
export const COMPLETENESS_SIGNAL_COPY = "Completeness is a signal, not a blocker.";

export type HubRow = {
  id: string;
  label: string;
  value: string;
  note?: string;
};

export type StaffDeskInput = {
  foxLine?: string;
  condition?: string;
  silentNote?: string;
};

export type ProcessingHubView = {
  fileId?: string;
  path: string;
  drawerOpen: false;
  loud: HubRow[];
  pay: HubRow[];
  state: {
    status: string;
    next: string;
    waitingOn: string;
    completeness: string;
    stillUseful: string[];
    docs: { name: string; status: string }[];
    quietFlags: string[];
  };
};

export function staffHubPath(fileId?: string) {
  const id = fileId?.trim();
  return id ? `${STAFF_HUB_PATH}?file=${encodeURIComponent(id)}` : STAFF_HUB_PATH;
}

function factRow(
  facts: ReturnType<typeof previewFacts>,
  id: string,
): HubRow | undefined {
  const found = facts.find((item) => item.id === id);
  if (!found) return undefined;
  return {
    id: found.id,
    label: found.label,
    value: found.value,
    note: found.note,
  };
}

const LOUD_IDS = [
  "product",
  "purpose",
  "occupancy",
  "property-type",
  "home",
  "first-lien",
  "line",
  "ltv",
  "cltv",
  "rate",
  "borrowers",
  "borrower",
  "coborrower-name",
  "credit",
  "address",
] as const;

export function hubLoudRows(draft: FoxIntakeDraft): HubRow[] {
  const facts = previewFacts(draft);
  const rows: HubRow[] = [];
  for (const id of LOUD_IDS) {
    const row = factRow(facts, id);
    if (row) rows.push(row);
  }
  if (!rows.some((row) => row.id === "product") && draft.productIntent) {
    rows.unshift({
      id: "product",
      label: "Product",
      value: productIntentLabel(draft.productIntent),
    });
  }
  return rows;
}

export function hubLoudText(draft: FoxIntakeDraft) {
  return hubLoudRows(draft)
    .map((row) => [row.label, row.value, row.note].filter(Boolean).join(" "))
    .join(" · ");
}

const PAY_IDS = [
  "qualifying",
  "debts",
  "current-housing",
  "housing",
  "suggestedNetRental",
  "suggestedFileNet",
] as const;

export function hubPayRows(draft: FoxIntakeDraft): HubRow[] {
  const facts = previewFacts(draft);
  const rows: HubRow[] = [];
  for (const id of PAY_IDS) {
    const row = factRow(facts, id);
    if (row && row.value && row.value !== "—") rows.push(row);
  }
  return rows;
}

export function hubQuietFlags(draft: FoxIntakeDraft): string[] {
  const flags: string[] = [];
  if (condoNeedsReviewPersisted(draft)) flags.push("Condo needs review");
  const caution = previewFacts(draft).find((item) => item.id === "income-caution");
  if (caution?.value) flags.push(caution.value);
  if (draft.outOfState) flags.push("Out of state");
  if (draft.documentsSkipped) flags.push("Papers skipped");
  if (draft.priorYearSkipped) flags.push("Prior-year papers skipped");
  return flags;
}

export function hubDocs(draft: FoxIntakeDraft): { name: string; status: string }[] {
  return (draft.documents ?? [])
    .filter((doc: ReceivedDoc) => doc.name?.trim())
    .map((doc) => ({
      name: doc.name,
      status: [doc.status, doc.extractClass].filter(Boolean).join(" · "),
    }));
}

export function hubCompletenessSignal(draft: FoxIntakeDraft) {
  if (!showsAgencyCompleteness(draft)) return COMPLETENESS_SIGNAL_COPY;
  return fileCompleteness(draft)?.copy || COMPLETENESS_SIGNAL_COPY;
}

export function processingHubView(draft: FoxIntakeDraft): ProcessingHubView {
  return {
    fileId: draft.fileId?.trim() || undefined,
    path: staffHubPath(draft.fileId),
    drawerOpen: false,
    loud: hubLoudRows(draft),
    pay: hubPayRows(draft),
    state: {
      status: motionStatusCopy(draft),
      next: nextActorOf(draft),
      waitingOn: waitingOnOf(draft),
      completeness: hubCompletenessSignal(draft),
      stillUseful: stillUsefulSpokenItems(draft)
        .slice(0, 3)
        .map((item) => item.label),
      docs: hubDocs(draft),
      quietFlags: hubQuietFlags(draft),
    },
  };
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function staffCondition(title: string, foxLine: string): FileCondition {
  return {
    id: newId("cond"),
    title,
    foxLine,
    waitingOn: "onyx",
    needed: "doc",
    status: "open",
    stillUseful: false,
  };
}

/** Keep in_queue. Do not close the review WorkItem. Silent notes stay off the thread. */
export function applyStaffDeskSend(
  draft: FoxIntakeDraft,
  input: StaffDeskInput,
  now = new Date(),
): { draft: FoxIntakeDraft; threadLine: string; error?: string } {
  const foxLine = (input.foxLine ?? "").trim();
  if (!foxLine) {
    return { draft, threadLine: "", error: SILENT_DESK_ERROR };
  }
  const at = now.toISOString();
  let next = draft;
  const title = (input.condition ?? "").trim();
  if (title) {
    next = {
      ...next,
      conditions: [...(next.conditions ?? []), staffCondition(title, foxLine)],
    };
  }
  next = appendFileEvent(next, "staff-desk", foxLine, at, {
    actor: "onyx",
    summary: foxLine,
  });
  const silent = (input.silentNote ?? "").trim();
  if (silent) {
    next = appendFileEvent(next, "staff-note", silent, at, {
      actor: "onyx",
      summary: silent,
    });
  }
  return { draft: next, threadLine: foxLine };
}

export function staffDeskKeepsFinishChips(draft: FoxIntakeDraft) {
  return (
    inQueueEnding(draft) &&
    motionOf(draft) === "in_queue" &&
    finishLineActions(draft).some((item) => item.label === "Ask Fox") &&
    finishLineActions(draft).some((item) => item.label === "Upload more") &&
    finishLineActions(draft).some((item) => item.label === "Request human")
  );
}

export function nextBorrowerLine(messages: FoxMessage[], threadLine: string): FoxMessage {
  return {
    id: `staff-${Date.now()}`,
    role: "fox",
    text: threadLine,
  };
}

export function hubHasForbidden(text: string) {
  return (
    /credit pull/i.test(text) ||
    /\bSSN\b/.test(text) ||
    /BNTouch/i.test(text) ||
    /LO will contact you/i.test(text) ||
    /green approved/i.test(text) ||
    /Desktop Underwriter/i.test(text) ||
    /\bDU says\b/i.test(text)
  );
}

export function staffNoteEvents(draft: FoxIntakeDraft): FileEvent[] {
  return (draft.events ?? []).filter((item) => item.kind === "staff-note");
}

export { CREDIT_STATED_NOTE };
