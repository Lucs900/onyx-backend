import {
  readScenario,
  writeScenario,
  type CreditRange,
  type ExplorerScenario,
} from "@/components/products/scenario";
import {
  CONFIRMED_STATUS,
  FOX_MESSAGES_KEY,
  INTAKE_DRAFT_VERSION,
  INTAKE_STORAGE_KEY,
  type Capture,
  type DocSlot,
  type DocStatus,
  type DraftField,
  type ExtractClass,
  type FactConflict,
  type FactProposal,
  type FileEvent,
  type FoxIntakeDraft,
  type FoxMessage,
  type FoxPrompt,
  type IntakePath,
  type LoMark,
  type PreviewOutboxItem,
  type JumboPurpose,
  type ProductIntent,
  type ReceivedDoc,
  type SectionId,
  type WorkItem,
} from "./types";
import {
  applyEmailThenFinish,
  applyEscalateMotion,
  applyLooksRightMotion,
  applyNotYetMotion,
  applyNudgeMotion,
  applyProceedMotion,
  applyReturnToFoxMotion,
  applyUploadMoreMotion,
  expireOpenReview,
  fileExists,
  isFileMotion,
  isFileNext,
  looksLikeEmail,
  parsePreviewSla,
  restripeGatheringOrReady,
} from "./motion";
import {
  applyExtractedFields,
  preferFilenameClass,
  promoteExtractClass,
  resolveFactConflict,
  resolveReceivedSlot,
  offeringDocStart,
  skipCurrentInvite,
  skipRemainingClasses,
  type ExtractApplyInput,
} from "./fileWrite";
import {
  applyProductChange,
  applyStarterSketch,
  migrateRestoredFoxMessages,
  normalizeProductIntent,
  productIntentLabel,
  purposeForIntent,
  slugForIntent,
  withMatrixAfterAmount,
  workspacePrompt,
} from "./workspace";
import {
  START_PATH_KEY,
  consumeHomepageFreshStart,
  homepageFreshEntryPending,
  markHomepageFreshStart,
  writeStartPath,
} from "@/components/products/startPath";
import {
  applyStubEmployerSuggestion,
  canLooksRight,
  proposePublicSuggestion,
  proposeFundsPair,
  resolveProposal,
  skipYearsInBusiness,
  withComputedCompanion,
  writeYearsInBusiness,
} from "./completeness";

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function emptyField(field: string, value = "", source: DraftField["source"] = "client"): DraftField {
  return { field, value, source, confirmed: false };
}

export function emptyDraft(): FoxIntakeDraft {
  return {
    version: INTAKE_DRAFT_VERSION,
    phase: "context",
    contact: {
      fullName: emptyField("fullName"),
      email: emptyField("email"),
      phone: emptyField("phone"),
      preferredContact: emptyField("preferredContact"),
    },
    incomeType: emptyField("incomeType"),
    occupancyChoice: emptyField("occupancy"),
    timelineChoice: emptyField("timeline"),
    occupancyAsked: false,
    timelineAsked: false,
    preferredAsked: false,
    correcting: null,
    correctingLine: null,
    scenario: null,
    notes: [],
    documents: [],
    documentsSkipped: false,
    docsStarted: false,
    priorYearSkipped: false,
    yearsInBusinessAsked: false,
    awaitingYearsInBusiness: false,
    facts: {},
    pendingConflict: null,
    skippedClasses: [],
    missingAskKey: "",
    sections: {
      contact: false,
      scenario: false,
      occupancy: false,
      income: false,
      documents: false,
      notes: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

function normalize(value: unknown): FoxIntakeDraft {
  const base = emptyDraft();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<FoxIntakeDraft>;
  if (
    typeof raw.version !== "number" ||
    raw.version < 1 ||
    raw.version > INTAKE_DRAFT_VERSION ||
    !raw.contact
  ) {
    return base;
  }
  return {
    ...base,
    ...raw,
    version: INTAKE_DRAFT_VERSION,
    contact: { ...base.contact, ...raw.contact },
    incomeType: raw.incomeType ?? base.incomeType,
    occupancyChoice: raw.occupancyChoice ?? base.occupancyChoice,
    timelineChoice: raw.timelineChoice ?? base.timelineChoice,
    occupancyAsked: Boolean(raw.occupancyAsked),
    timelineAsked: Boolean(raw.timelineAsked),
    preferredAsked: Boolean(raw.preferredAsked),
    correcting: raw.correcting ?? null,
    correctingLine: typeof raw.correctingLine === "string" && raw.correctingLine
      ? raw.correctingLine
      : null,
    path: raw.path === "acr" || raw.path === "loan-only" ? raw.path : undefined,
    productIntent: normalizeProductIntent(raw.productIntent),
    jumboPurpose: raw.jumboPurpose === "buy" || raw.jumboPurpose === "refinance"
      ? raw.jumboPurpose
      : undefined,
    jumboOffered: Boolean(raw.jumboOffered),
    helocOffered: Boolean(raw.helocOffered),
    pendingOffer: raw.pendingOffer === "jumbo" || raw.pendingOffer === "heloc"
      ? raw.pendingOffer
      : undefined,
    outOfState: Boolean(raw.outOfState),
    govProgram:
      raw.govProgram === "fha" || raw.govProgram === "va" || raw.govProgram === "usda"
        ? raw.govProgram
        : undefined,
    creditEvent:
      raw.creditEvent === "bankruptcy" || raw.creditEvent === "foreclosure"
        ? raw.creditEvent
        : undefined,
    cashOut: Boolean(raw.cashOut),
    loanAmountValue: numberOrUndefined(raw.loanAmountValue),
    propertyValueAmount: numberOrUndefined(raw.propertyValueAmount),
    downPaymentAmount: numberOrUndefined(raw.downPaymentAmount),
    amountAsked: Boolean(raw.amountAsked),
    valueAsked: Boolean(raw.valueAsked),
    downAsked: Boolean(raw.downAsked),
    amountPurposeLabel:
      typeof raw.amountPurposeLabel === "string" && raw.amountPurposeLabel.trim()
        ? raw.amountPurposeLabel.trim()
        : undefined,
    creditBand: raw.creditBand,
    creditAsked: Boolean(raw.creditAsked || raw.creditBand),
    incomeAsked: Boolean(raw.incomeAsked || raw.incomeType?.value),
    docsOpen: Boolean(raw.docsOpen),
    docsStarted: Boolean(raw.docsStarted),
    originatorRequested: Boolean(raw.originatorRequested),
    motion: isFileMotion(raw.motion) ? raw.motion : undefined,
    nextActor: isFileNext(raw.nextActor) ? raw.nextActor : undefined,
    workItems: normalizeWorkItems(raw.workItems),
    events: normalizeEvents(raw.events),
    previewOutbox: normalizeOutbox(raw.previewOutbox),
    pendingFinish: raw.pendingFinish === "proceed" || raw.pendingFinish === "not-yet"
      ? raw.pendingFinish
      : undefined,
    emailCaptureAsked: Boolean(raw.emailCaptureAsked),
    reviewSlaMs:
      typeof raw.reviewSlaMs === "number" && raw.reviewSlaMs > 0 ? raw.reviewSlaMs : undefined,
    termYears: numberOrUndefined(raw.termYears),
    termAsked: Boolean(raw.termAsked),
    workspaceFlow: Boolean(raw.workspaceFlow),
    sampleAccepted: Boolean(raw.sampleAccepted),
    workspaceDraftStatus:
      raw.workspaceDraftStatus === "preparing" ||
      raw.workspaceDraftStatus === "ready" ||
      raw.workspaceDraftStatus === "with-originator"
        ? raw.workspaceDraftStatus
        : undefined,
    previewSample: Boolean(raw.previewSample),
    documents: (raw.documents ?? []).map((doc) => ({
      ...doc,
      status: doc.status ?? "received",
      bytesRef: typeof doc.bytesRef === "string" ? doc.bytesRef : undefined,
      extractClass: doc.extractClass,
    })),
    facts: normalizeFacts(raw.facts),
    pendingConflict: normalizeConflict(raw.pendingConflict),
    pendingProposal: normalizeProposal(raw.pendingProposal),
    skippedClasses: Array.isArray(raw.skippedClasses)
      ? raw.skippedClasses.filter((item): item is ExtractClass => typeof item === "string")
      : [],
    priorYearSkipped: Boolean(raw.priorYearSkipped),
    yearsInBusinessAsked: Boolean(raw.yearsInBusinessAsked),
    awaitingYearsInBusiness: Boolean(raw.awaitingYearsInBusiness),
    missingAskKey: typeof raw.missingAskKey === "string" ? raw.missingAskKey : "",
    sections: { ...base.sections, ...raw.sections },
  };
}

function normalizeFacts(value: FoxIntakeDraft["facts"]): Record<string, DraftField> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, DraftField> = {};
  for (const [key, field] of Object.entries(value)) {
    if (!field || typeof field !== "object" || typeof field.value !== "string") continue;
    next[key] = {
      field: field.field || key,
      value: field.value,
      source:
        field.source === "document" ||
        field.source === "scenario" ||
        field.source === "extracted-unconfirmed" ||
        field.source === "suggested" ||
        field.source === "computed"
          ? field.source
          : "client",
      confirmed: Boolean(field.confirmed),
      confirmedAt: field.confirmedAt,
    };
  }
  return next;
}

function normalizeWorkItems(value: FoxIntakeDraft["workItems"]): WorkItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WorkItem => {
    if (!item || typeof item !== "object") return false;
    return item.kind === "review" && typeof item.id === "string" && typeof item.openedAt === "string";
  });
}

function normalizeEvents(value: FoxIntakeDraft["events"]): FileEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FileEvent => {
    if (!item || typeof item !== "object") return false;
    return typeof item.id === "string" && typeof item.kind === "string" && typeof item.text === "string";
  });
}

function normalizeOutbox(value: FoxIntakeDraft["previewOutbox"]): PreviewOutboxItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PreviewOutboxItem => {
    if (!item || typeof item !== "object") return false;
    return typeof item.to === "string" && typeof item.body === "string";
  });
}

function normalizeConflict(value: FoxIntakeDraft["pendingConflict"]): FactConflict | null {
  if (!value || typeof value !== "object") return null;
  if (!value.field || !value.fileValue || !value.documentValue) return null;
  return {
    field: value.field,
    fileValue: value.fileValue,
    documentValue: value.documentValue,
    label: value.label || value.field,
    kind: value.kind === "public" || value.kind === "computed" || value.kind === "document"
      ? value.kind
      : "document",
  };
}

function normalizeProposal(value: FoxIntakeDraft["pendingProposal"]): FactProposal | null {
  if (!value || typeof value !== "object") return null;
  if (!value.field || !value.value) return null;
  if (value.kind !== "public" && value.kind !== "computed" && value.kind !== "document") return null;
  return {
    field: value.field,
    value: value.value,
    label: value.label || value.field,
    kind: value.kind,
    note: typeof value.note === "string" ? value.note : undefined,
    companion:
      value.companion && value.companion.field && value.companion.value
        ? {
            field: value.companion.field,
            value: value.companion.value,
            label: value.companion.label || value.companion.field,
          }
        : undefined,
  };
}

function readStored(): FoxIntakeDraft {
  if (typeof window === "undefined") return emptyDraft();
  try {
    const local = window.localStorage.getItem(INTAKE_STORAGE_KEY);
    const session = window.sessionStorage.getItem(INTAKE_STORAGE_KEY);
    const raw = local || session;
    if (!raw) return emptyDraft();
    return normalize(JSON.parse(raw) as unknown);
  } catch {
    return emptyDraft();
  }
}

function persist(draft: FoxIntakeDraft) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(draft);
  try {
    window.sessionStorage.setItem(INTAKE_STORAGE_KEY, raw);
    window.localStorage.setItem(INTAKE_STORAGE_KEY, raw);
  } catch {
    // Preview storage can be blocked; keep the in-memory copy.
  }
}

let current = emptyDraft();
let hydrated = false;
let foxMessages: FoxMessage[] = [];
let messagesHydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

let workspaceEntryKey: string | null = null;

function workspaceEntryToken(path?: IntakePath | null) {
  return path ?? "";
}

function isClosedDraft(draft: FoxIntakeDraft) {
  return (
    Boolean(draft.sampleAccepted) ||
    draft.phase === "confirmed" ||
    draft.workspaceDraftStatus === "with-originator"
  );
}

function readStoredMessages(): FoxMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.sessionStorage.getItem(FOX_MESSAGES_KEY) ||
      window.localStorage.getItem(FOX_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FoxMessage => {
      if (!item || typeof item !== "object") return false;
      const role = (item as FoxMessage).role;
      return role === "fox" || role === "client" || role === "system";
    });
  } catch {
    return [];
  }
}

function persistMessages(messages: FoxMessage[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(messages);
  try {
    window.sessionStorage.setItem(FOX_MESSAGES_KEY, raw);
    window.localStorage.setItem(FOX_MESSAGES_KEY, raw);
  } catch {
    // Preview storage can be blocked; keep the in-memory copy.
  }
}

function persistMigratedMessages(messages: FoxMessage[]) {
  foxMessages = migrateRestoredFoxMessages(messages);
  messagesHydrated = true;
  persistMessages(foxMessages);
  return foxMessages;
}

function hydrateFoxMessages() {
  if (messagesHydrated || typeof window === "undefined") return foxMessages;
  return persistMigratedMessages(readStoredMessages());
}

export function getFoxMessages() {
  hydrateFoxMessages();
  return foxMessages;
}

export function setFoxMessages(messages: FoxMessage[]) {
  return persistMigratedMessages(messages);
}

export function clearFoxMessages() {
  return setFoxMessages([]);
}

/** Client already talked, or product/intent is already on the draft. */
export function workspaceSessionStarted(
  draft: FoxIntakeDraft = current,
  messages: FoxMessage[] = getFoxMessages(),
) {
  if (isClosedDraft(draft)) return false;
  if (draft.productIntent) return true;
  if (draft.occupancyChoice.value || draft.timelineChoice.value) return true;
  if (draft.propertyValueAmount != null || draft.downPaymentAmount != null || draft.loanAmountValue != null) {
    return true;
  }
  if (draft.pendingProposal || draft.documents.length > 0) return true;
  return messages.some((message) => message.role === "client");
}

/** Same File is already past Looks right / finish-line. URL path is not a fresh start. */
export function shouldResumeWorkspaceEntry(
  draft: FoxIntakeDraft = current,
  messages: FoxMessage[] = getFoxMessages(),
) {
  return fileExists(draft) || workspaceSessionStarted(draft, messages);
}

function resumeWorkspaceEntry(path?: IntakePath | null, intent: ProductIntent | null = null) {
  markWorkspaceEntry(current.path ?? path);
  if (!current.workspaceFlow) {
    commit({ ...current, workspaceFlow: true });
  }
  if (path && !current.path) setDraftPath(path);
  if (intent && !current.productIntent) setDraftProductIntent(intent);
  return current;
}

function markWorkspaceEntry(path?: IntakePath | null) {
  workspaceEntryKey = workspaceEntryToken(path);
  hydrated = true;
}

const PREVIEW_STORAGE_KEYS = [INTAKE_STORAGE_KEY, FOX_MESSAGES_KEY, START_PATH_KEY];

export function clearPreviewWorkspaceStorage() {
  if (typeof window === "undefined") return;
  for (const key of PREVIEW_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Private mode / quota.
    }
  }
}

/** Explicit Start over. Same wipe as homepage CTA, plus the three preview storage keys. */
export function startOverWorkspace(path: IntakePath | null = null) {
  clearPreviewWorkspaceStorage();
  foxMessages = [];
  messagesHydrated = true;
  hydrated = false;
  workspaceEntryKey = null;
  current = emptyDraft();
  const next = resetWorkspaceForEntry(path, null);
  if (path) writeStartPath(path);
  return next;
}

/** Wipe the prior file. Keep the new path and honor intent without a second reset. */
export function resetWorkspaceForEntry(
  path: IntakePath | null,
  intent: ProductIntent | null = null,
) {
  markWorkspaceEntry(path);
  current = {
    ...emptyDraft(),
    path: path ?? undefined,
    productIntent: intent ?? undefined,
    workspaceFlow: true,
    updatedAt: new Date().toISOString(),
  };
  clearFoxMessages();
  persist(current);
  emit();
  return current;
}

/** Keep a live homepage thread or an in-motion File. Fresh start is homepage CTA only. */
export function continueWorkspaceFromEntry(
  path: IntakePath | null,
  intent: ProductIntent | null = null,
  entry?: { fresh?: boolean },
) {
  if (!hydrated) hydrateFoxDraft();
  hydrateFoxMessages();
  const fresh = Boolean(entry?.fresh) || homepageFreshEntryPending();
  if (fresh) {
    consumeHomepageFreshStart();
    const next = startOverWorkspace(path);
    return intent ? setDraftProductIntent(intent) : next;
  }
  if (shouldResumeWorkspaceEntry()) {
    return resumeWorkspaceEntry(path, intent);
  }
  return resetWorkspaceForEntry(path, intent);
}

export function ensureWorkspaceDraft() {
  if (!hydrated) hydrateFoxDraft();
  hydrateFoxMessages();
  if (shouldResumeWorkspaceEntry()) {
    return resumeWorkspaceEntry(current.path);
  }
  if (!current.workspaceFlow) {
    commit({ ...current, workspaceFlow: true });
  }
  markWorkspaceEntry(current.path);
  return current;
}

export function hydrateFoxDraft() {
  if (typeof window === "undefined") return current;
  hydrateFoxMessages();
  if (hydrated) return current;
  if (workspaceEntryKey != null) {
    hydrated = true;
    return current;
  }
  current = readStored();
  if (!current.scenario) {
    const scenario = readScenario();
    if (scenario) current = withScenario(current, scenario);
  }
  hydrated = true;
  persist(current);
  emit();
  return current;
}

export function getFoxDraft() {
  return current;
}

export function subscribeFoxDraft(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getServerDraft() {
  return emptyDraft();
}

function commit(next: FoxIntakeDraft) {
  current = { ...next, updatedAt: new Date().toISOString() };
  persist(current);
  emit();
  return current;
}

function withScenario(draft: FoxIntakeDraft, scenario: ExplorerScenario): FoxIntakeDraft {
  return {
    ...draft,
    scenario,
    occupancyChoice: draft.occupancyChoice.value
      ? draft.occupancyChoice
      : emptyField("occupancy", scenario.occupancy, "scenario"),
    timelineChoice: draft.timelineChoice.value
      ? draft.timelineChoice
      : emptyField("timeline", scenario.timeline ?? "", "scenario"),
  };
}

export function setDraftScenario(scenario: ExplorerScenario | null) {
  if (!scenario) return current;
  return commit(withScenario(current, scenario));
}

export function setDraftPath(path: IntakePath | null) {
  if (!path) return current;
  if (current.path === path) return current;
  return commit({ ...current, path });
}

/** /start URL seed. Resume an operating File; do not treat path=acr|loan as a fresh CTA. */
export function applyWorkspaceEntry(
  path: IntakePath | null,
  intent: ProductIntent | null = null,
) {
  if (!hydrated) hydrateFoxDraft();
  hydrateFoxMessages();
  if (shouldResumeWorkspaceEntry()) {
    return resumeWorkspaceEntry(path, intent);
  }
  const key = workspaceEntryToken(path);
  if (hydrated && workspaceEntryKey === key && current.workspaceFlow) {
    if (intent && current.productIntent !== intent) {
      return setDraftProductIntent(intent);
    }
    return current;
  }
  return resetWorkspaceForEntry(path, intent);
}

/** Homepage CTA: always a new file. Return to Fox / refresh must not call this. */
export function beginWorkspaceFromHero(path: IntakePath) {
  markHomepageFreshStart();
  return startOverWorkspace(path);
}

function withProductIntent(draft: FoxIntakeDraft, intent: ProductIntent): FoxIntakeDraft {
  const scenario = draft.scenario
    ? {
        ...draft.scenario,
        purpose: purposeForIntent(intent, draft.jumboPurpose),
        productSlug: slugForIntent(intent),
        productName: productIntentLabel(intent),
      }
    : draft.scenario;
  return { ...draft, productIntent: intent, scenario };
}

export function setWorkspaceFlow(on = true) {
  if (current.workspaceFlow === on) return current;
  if (on && !current.workspaceDraftStatus && !current.documents.length) {
    return commit({ ...current, workspaceFlow: true, documentsSkipped: false });
  }
  return commit({ ...current, workspaceFlow: on });
}

let prepareTimer: number | undefined;

export function prepareWorkspaceDraft() {
  if (current.workspaceDraftStatus === "ready" || current.workspaceDraftStatus === "with-originator") {
    return current;
  }
  if (current.workspaceDraftStatus !== "preparing") {
    commit({
      ...current,
      phase: current.phase === "confirmed" ? current.phase : "draft",
      workspaceDraftStatus: "preparing",
      correcting: null,
    });
  }
  if (typeof window === "undefined") {
    return commit({ ...current, workspaceDraftStatus: "ready" });
  }
  window.clearTimeout(prepareTimer);
  prepareTimer = window.setTimeout(() => {
    if (current.workspaceDraftStatus !== "preparing") return;
    commit({ ...current, workspaceDraftStatus: "ready" });
  }, 700);
  return current;
}

export function setDraftProductIntent(intent: ProductIntent | null) {
  if (!intent) return current;
  if (current.productIntent === intent) return current;
  return commit(withProductIntent(current, intent));
}

function withWorkspaceScenario(draft: FoxIntakeDraft): FoxIntakeDraft {
  const scenario = draft.scenario;
  if (!scenario) return draft;
  const next: ExplorerScenario = {
    ...scenario,
    purpose: draft.productIntent
      ? purposeForIntent(draft.productIntent, draft.jumboPurpose)
      : scenario.purpose,
    productSlug: draft.productIntent ? slugForIntent(draft.productIntent) : scenario.productSlug,
    occupancy:
      (draft.occupancyChoice.value as ExplorerScenario["occupancy"]) || scenario.occupancy,
    timeline:
      (draft.timelineChoice.value as ExplorerScenario["timeline"]) || scenario.timeline,
    loanAmount: draft.loanAmountValue ?? scenario.loanAmount,
    propertyValue: draft.propertyValueAmount ?? scenario.propertyValue,
    downPayment: draft.downPaymentAmount ?? scenario.downPayment,
    creditRange: draft.creditBand ?? scenario.creditRange,
  };
  writeScenario(next);
  return { ...draft, scenario: next };
}

function clientField(field: string, value: string): DraftField {
  return { field, value, source: "client", confirmed: false };
}

export function setContactField(
  key: keyof FoxIntakeDraft["contact"],
  value: string,
) {
  return commit({
    ...current,
    phase: current.phase === "confirmed" ? "draft" : current.phase,
    contact: { ...current.contact, [key]: clientField(key, value) },
    sections: { ...current.sections, contact: false },
    status: undefined,
    confirmedAt: undefined,
  });
}

export function markPreferredAsked() {
  return commit({ ...current, preferredAsked: true });
}

export function addNote(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return current;
  return commit({
    ...current,
    notes: [...current.notes, trimmed],
    sections: { ...current.sections, notes: false },
  });
}

export function receiveDocument(input: Omit<ReceivedDoc, "status" | "note"> & { status?: DocStatus; note?: string }) {
  const documents = [
    ...current.documents,
    { ...input, status: input.status ?? "received", note: input.note },
  ];
  const keepPhase =
    current.workspaceFlow &&
    (current.sampleAccepted || current.phase === "confirmed" || Boolean(current.motion));
  const next = commit(
    restripeGatheringOrReady({
      ...current,
      documents,
      documentsSkipped: false,
      docsStarted: true,
      docsOpen: false,
      correcting: current.workspaceFlow ? null : current.correcting,
      phase: keepPhase
        ? current.phase
        : current.phase === "context"
          ? "documents"
          : current.phase,
      sections: { ...current.sections, documents: false },
    }),
  );
  if (next.workspaceFlow && next.sampleAccepted && next.phase !== "confirmed") {
    return confirmDraft();
  }
  return next;
}

export function setDocumentStatus(
  slot: DocSlot,
  status: DocStatus,
  note?: string,
  receivedAt?: string,
) {
  return patchReceivedDoc(
    (doc) => (receivedAt ? doc.receivedAt === receivedAt : doc.slot === slot),
    { status, note },
  );
}

export function patchReceivedDoc(
  match: (doc: ReceivedDoc) => boolean,
  patch: Partial<ReceivedDoc>,
) {
  return commit({
    ...current,
    documents: current.documents.map((doc) => (match(doc) ? { ...doc, ...patch } : doc)),
  });
}

export function applyExtractWrite(
  receivedAt: string,
  name: string,
  input: ExtractApplyInput,
  note?: string,
  failed?: boolean,
) {
  const match = current.documents.some((doc) => doc.receivedAt === receivedAt && doc.name === name);
  if (!match) {
    return { draft: current, writes: [], conflict: null, quietLines: [], extractClass: input.extractClass };
  }
  const extractClass = preferFilenameClass(
    promoteExtractClass(input.extractClass, input.fields),
    name,
  );
  const applied = failed
    ? { draft: current, writes: [], conflict: null, quietLines: note ? [note] : [] }
    : applyExtractedFields(current, { ...input, extractClass });
  const nextDocs = applied.draft.documents.map((doc) => {
    if (doc.receivedAt !== receivedAt || doc.name !== name) return doc;
    const slot = resolveReceivedSlot(doc.slot, name, extractClass);
    return {
      ...doc,
      slot,
      extractClass,
      status: (failed ? "failed" : "extracted") as DocStatus,
      note,
    };
  });
  commit({
    ...applied.draft,
    documents: nextDocs,
    documentsSkipped: false,
    sections: { ...applied.draft.sections, documents: false },
  });
  return { ...applied, draft: current, extractClass };
}

export function markMissingAsked(key: string) {
  return commit({ ...current, missingAskKey: key });
}

export function skipDocuments() {
  if (current.workspaceFlow && !current.sampleAccepted) {
    if (offeringDocStart(current)) {
      return commit(skipRemainingClasses(current));
    }
    return commit(skipCurrentInvite(current));
  }
  const prepared =
    current.sampleAccepted ||
    current.phase === "confirmed" ||
    Boolean(current.motion);
  const skipped = skipRemainingClasses(current);
  return commit(
    restripeGatheringOrReady({
      ...skipped,
      phase: prepared && current.phase === "confirmed" ? "confirmed" : prepared ? current.phase : "draft",
      workspaceDraftStatus: prepared
        ? current.workspaceDraftStatus ?? "ready"
        : current.workspaceDraftStatus,
      sections: { ...current.sections, documents: false },
    }),
  );
}

export function advancePhase() {
  if (!hasRequiredContact(current)) {
    return commit({ ...current, phase: "context" });
  }
  if (!current.incomeType.value || !current.occupancyAsked) {
    return commit({ ...current, phase: "context" });
  }
  if (!current.documents.length && !current.documentsSkipped) {
    return commit({ ...current, phase: "documents" });
  }
  if (current.phase !== "confirmed") {
    return commit({ ...current, phase: "draft" });
  }
  return current;
}

export function confirmDraft() {
  const now = new Date().toISOString();
  const mark = (field: DraftField): DraftField =>
    field.value ? { ...field, confirmed: true, confirmedAt: now } : field;
  const sections = {
    contact: hasRequiredContact(current),
    scenario: Boolean(current.scenario),
    occupancy: Boolean(current.occupancyChoice.value || current.scenario),
    income: Boolean(current.incomeType.value),
    documents: Boolean(current.documents.length || current.documentsSkipped),
    notes: true,
  };
  return commit({
    ...current,
    phase: "confirmed",
    status: CONFIRMED_STATUS,
    workspaceDraftStatus: current.workspaceFlow
      ? current.workspaceDraftStatus ?? "ready"
      : current.workspaceDraftStatus,
    confirmedAt: now,
    loStatus: current.loStatus ?? "in review",
    correcting: null,
    contact: {
      fullName: mark(current.contact.fullName),
      email: mark(current.contact.email),
      phone: mark(current.contact.phone),
      preferredContact: mark(current.contact.preferredContact),
    },
    incomeType: mark(current.incomeType),
    occupancyChoice: mark(current.occupancyChoice),
    timelineChoice: mark(current.timelineChoice),
    sections,
  });
}

export function confirmSection(id: SectionId) {
  if (id) {
    const sections = { ...current.sections, [id]: true };
    const next = { ...current, sections, phase: "draft" as const };
    return commit(next);
  }
  return current;
}

export function editSection(id: SectionId) {
  return commit({
    ...current,
    phase: "draft",
    correcting: sectionToPrompt(id),
    sections: { ...current.sections, [id]: false },
    status: undefined,
    confirmedAt: undefined,
  });
}

export function setLoStatus(loStatus: LoMark) {
  return commit({ ...current, loStatus });
}

export const FOX_THREAD_LINE_EVENT = "onyx:fox-thread-line";

export function appendFoxThreadLine(
  text: string,
  extras: Partial<Pick<FoxMessage, "followUp" | "actions" | "facts">> = {},
) {
  const message: FoxMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "fox",
    text,
    ...extras,
  };
  persistMigratedMessages([...getFoxMessages(), message]);
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FOX_THREAD_LINE_EVENT, { detail: message }));
  }
  return message;
}

export function returnToFox(input: { note: string; needsDoc?: boolean }) {
  const applied = applyReturnToFoxMotion(current, input);
  commit(applied.draft);
  appendFoxThreadLine(applied.threadLine);
  return { draft: current, threadLine: applied.threadLine };
}

export function nudgeReview(input: { force?: boolean; now?: Date } = {}) {
  const applied = applyNudgeMotion(current, input);
  if (!applied.threadLine) return { draft: current, threadLine: null as string | null };
  commit(applied.draft);
  appendFoxThreadLine(applied.threadLine);
  return { draft: current, threadLine: applied.threadLine };
}

export function sitExpireReview(now = new Date()) {
  return commit(expireOpenReview(current, now));
}

export function applyPublicSuggestion(field = "employer_name", value?: string) {
  const applied = value
    ? proposePublicSuggestion(current, field, value)
    : applyStubEmployerSuggestion(current);
  return commit(applied.draft);
}

export function applyPreviewMotionControls(input: {
  nudge?: string | null;
  sla?: string | null;
  suggest?: string | null;
}) {
  const sla = parsePreviewSla(input.sla);
  if (sla && current.reviewSlaMs !== sla) {
    commit({ ...current, reviewSlaMs: sla });
  }
  if (input.suggest === "employer" && !current.pendingProposal && !current.facts?.employer_name?.value) {
    applyPublicSuggestion("employer_name");
  }
  if (input.nudge === "now") {
    if (!openReviewOnFile(current)) return current;
    return nudgeReview({ force: true }).draft;
  }
  if (input.nudge === "expire") {
    sitExpireReview();
    return nudgeReview({ force: false }).draft;
  }
  return current;
}

function openReviewOnFile(draft: FoxIntakeDraft) {
  return (draft.workItems ?? []).some(
    (item) => item.kind === "review" && (item.state === "open" || item.state === "nudged"),
  );
}

export function applyCapture(capture: Capture) {
  if (capture.field === "fullName" || capture.field === "email" || capture.field === "phone" || capture.field === "preferredContact") {
    if (capture.field === "email" && current.workspaceFlow && (current.pendingFinish || current.sampleAccepted)) {
      if (current.pendingFinish && looksLikeEmail(capture.value)) {
        return commit(applyEmailThenFinish(current, capture.value));
      }
      return commit({
        ...current,
        contact: { ...current.contact, email: clientField("email", capture.value) },
      });
    }
    setContactField(capture.field, capture.value);
    if (capture.field === "preferredContact") markPreferredAsked();
    return advancePhase();
  }
  if (capture.field === "preferred-asked") {
    if (capture.value) setContactField("preferredContact", capture.value);
    markPreferredAsked();
    return advancePhase();
  }
  if (capture.field === "incomeType") {
    commit({
      ...current,
      incomeType: clientField("incomeType", capture.value),
      incomeAsked: true,
      correcting: null,
      sections: { ...current.sections, income: false },
      status: undefined,
      confirmedAt: undefined,
    });
    return current.workspaceFlow ? current : advancePhase();
  }
  if (capture.field === "occupancy") {
    commit(
      withWorkspaceScenario({
        ...current,
        occupancyChoice: clientField("occupancy", capture.value),
        occupancyAsked: true,
        correcting: null,
        sections: { ...current.sections, occupancy: false },
        status: undefined,
        confirmedAt: undefined,
      }),
    );
    return current.workspaceFlow ? current : advancePhase();
  }
  if (capture.field === "timeline") {
    commit(
      withWorkspaceScenario({
        ...current,
        timelineChoice: clientField("timeline", capture.value),
        timelineAsked: true,
        correcting: null,
      }),
    );
    return current.workspaceFlow ? current : advancePhase();
  }
  if (capture.field === "skip-docs") {
    skipDocuments();
    if (current.workspaceFlow) return current;
    return advancePhase();
  }
  if (capture.field === "start-docs") {
    return commit({
      ...current,
      docsStarted: true,
      docsOpen: false,
      correcting: null,
    });
  }
  if (capture.field === "keep-file-fact") {
    return commit(resolveFactConflict(current, "file"));
  }
  if (capture.field === "use-document-fact") {
    return commit(resolveFactConflict(current, "document"));
  }
  if (capture.field === "accept-proposal") {
    return commit(resolveProposal(current, "accept"));
  }
  if (capture.field === "decline-proposal") {
    return commit(resolveProposal(current, "decline"));
  }
  if (capture.field === "yearsInBusiness") {
    return commit(writeYearsInBusiness(current, capture.value));
  }
  if (capture.field === "skip-years-in-business") {
    return commit(skipYearsInBusiness(current));
  }
  if (capture.field === "open-docs") {
    if (current.workspaceFlow) {
      return commit({
        ...current,
        docsOpen: true,
        correcting: null,
      });
    }
    return commit({ ...current, phase: "documents" });
  }
  if (capture.field === "upload-more") {
    return commit(applyUploadMoreMotion(current));
  }
  if (capture.field === "proceed") {
    return commit(applyProceedMotion(current));
  }
  if (capture.field === "not-yet") {
    return commit(applyNotYetMotion(current));
  }
  if (capture.field === "confirm-draft") {
    if (current.workspaceFlow && !canLooksRight(current) && !current.sampleAccepted) {
      return current;
    }
    if (current.workspaceFlow && !current.sampleAccepted) {
      commit({
        ...applyLooksRightMotion(current),
        correcting: null,
      });
      if (workspacePrompt(current) === "done") return confirmDraft();
      return current;
    }
    return confirmDraft();
  }
  if (capture.field === "needs-correction") {
    return commit({
      ...current,
      phase: "draft",
      correcting: "correct",
      workspaceDraftStatus: current.workspaceFlow ? "ready" : current.workspaceDraftStatus,
      status: undefined,
      confirmedAt: undefined,
    });
  }
  if (capture.field === "keep-path") {
    return commit({ ...current, correcting: null });
  }
  if (capture.field === "keep-line") {
    return commit({ ...current, correcting: null, correctingLine: null });
  }
  if (capture.field === "what-acr" || capture.field === "what-happens-next" || capture.field === "ask-fox") {
    return current;
  }
  if (capture.field === "talk-originator") {
    return commit({
      ...applyEscalateMotion(current),
      loStatus: current.loStatus ?? "in review",
    });
  }
  if (capture.field === "correct") {
    return commit({
      ...current,
      correcting: capture.value as FoxPrompt,
      correctingLine: capture.line ?? null,
      sections: unsetForPrompt(current.sections, capture.value),
    });
  }
  if (capture.field === "propose-funds") {
    const [downRaw, loanRaw] = capture.value.split(":");
    const down = Number(downRaw);
    const loan = Number(loanRaw);
    if (!Number.isFinite(down) || !Number.isFinite(loan) || down <= 0 || loan <= 0) return current;
    return commit({
      ...proposeFundsPair(current, down, loan),
      correcting: null,
      correctingLine: null,
    });
  }
  if (capture.field === "note") {
    return addNote(capture.value);
  }
  if (capture.field === "path") {
    return commit({ ...current, path: capture.value, correcting: null });
  }
  if (capture.field === "productIntent") {
    return commit(withWorkspaceScenario(applyProductChange(current, capture.value)));
  }
  if (capture.field === "starter") {
    const price = capture.price ? Number(capture.price.replace(/,/g, "")) : null;
    return commit(
      withWorkspaceScenario(
        applyStarterSketch(current, capture.value, Number.isFinite(price) ? price : null),
      ),
    );
  }
  if (capture.field === "jumboPurpose") {
    return commit(
      withWorkspaceScenario({
        ...current,
        jumboPurpose: capture.value,
        correcting: null,
      }),
    );
  }
  if (capture.field === "accept-jumbo") {
    const purpose: JumboPurpose =
      current.productIntent === "refinance" || current.jumboPurpose === "refinance"
        ? "refinance"
        : "buy";
    return commit(
      withWorkspaceScenario(
        applyProductChange(
          {
            ...current,
            jumboPurpose: purpose,
            jumboOffered: true,
            pendingOffer: undefined,
            correcting: null,
          },
          "jumbo",
        ),
      ),
    );
  }
  if (capture.field === "decline-jumbo") {
    return commit({
      ...current,
      jumboOffered: true,
      pendingOffer: undefined,
      correcting: null,
    });
  }
  if (capture.field === "accept-heloc") {
    return commit(
      withWorkspaceScenario(
        applyProductChange(
          {
            ...current,
            helocOffered: true,
            pendingOffer: undefined,
            correcting: null,
          },
          "heloc",
        ),
      ),
    );
  }
  if (capture.field === "decline-heloc") {
    return commit({
      ...current,
      helocOffered: true,
      pendingOffer: undefined,
      correcting: null,
    });
  }
  if (capture.field === "pending-offer") {
    return commit({
      ...current,
      pendingOffer: capture.value,
      correcting: null,
    });
  }
  if (capture.field === "out-of-state") {
    return commit({ ...current, outOfState: true, correcting: null });
  }
  if (capture.field === "in-state") {
    return commit({ ...current, outOfState: false, correcting: null });
  }
  if (capture.field === "govProgram") {
    return commit({ ...current, govProgram: capture.value, correcting: null });
  }
  if (capture.field === "creditEvent") {
    return commit({ ...current, creditEvent: capture.value, correcting: null });
  }
  if (capture.field === "cashOut") {
    return commit({ ...current, cashOut: true, correcting: null });
  }
  if (capture.field === "amountPurpose") {
    const named = capture.value.trim();
    if (!named || /^(amount|numbers|rough amount)$/i.test(named)) return current;
    return commit({
      ...current,
      amountPurposeLabel: named,
      correcting: null,
    });
  }
  if (capture.field === "loanAmount") {
    const [loanRaw, valueRaw] = capture.value.split(":");
    const loan = Number(loanRaw.replace(/,/g, ""));
    const value = valueRaw ? Number(valueRaw.replace(/,/g, "")) : undefined;
    const hasLoan = Number.isFinite(loan) && loan > 0;
    const hasValue = value != null && Number.isFinite(value) && value > 0;
    return commit(
      withWorkspaceScenario(
        withComputedCompanion(
          withMatrixAfterAmount({
            ...current,
            amountAsked: true,
            correcting: null,
            correctingLine: null,
            valueAsked: hasValue ? true : current.valueAsked,
            loanAmountValue: hasLoan ? loan : current.loanAmountValue,
            propertyValueAmount: hasValue ? value : current.propertyValueAmount,
          }),
          current.downPaymentAmount != null && current.downPaymentAmount > 0 ? "loan" : undefined,
        ),
      ),
    );
  }
  if (capture.field === "propertyValue") {
    const value = Number(capture.value.replace(/,/g, ""));
    return commit(
      withWorkspaceScenario(
        withComputedCompanion(
          withMatrixAfterAmount({
            ...current,
            valueAsked: true,
            correcting: null,
            correctingLine: null,
            propertyValueAmount:
              Number.isFinite(value) && value > 0 ? value : current.propertyValueAmount,
          }),
        ),
      ),
    );
  }
  if (capture.field === "downPayment") {
    const value = Number(capture.value.replace(/,/g, ""));
    return commit(
      withWorkspaceScenario(
        withComputedCompanion(
          {
            ...current,
            downAsked: true,
            correcting: null,
            correctingLine: null,
            downPaymentAmount:
              Number.isFinite(value) && value > 0 ? value : current.downPaymentAmount,
          },
          current.loanAmountValue != null && current.loanAmountValue > 0 ? "down" : undefined,
        ),
      ),
    );
  }
  if (capture.field === "skip-down") {
    return commit({ ...current, downAsked: true, correcting: null, correctingLine: null });
  }
  if (capture.field === "skip-amount") {
    return commit({
      ...current,
      amountAsked: true,
      correcting: null,
      loanAmountValue: undefined,
      scenario: current.scenario
        ? { ...current.scenario, loanAmount: undefined }
        : current.scenario,
    });
  }
  if (capture.field === "skip-value") {
    return commit({
      ...current,
      valueAsked: true,
      correcting: null,
      propertyValueAmount: undefined,
    });
  }
  if (capture.field === "creditRange") {
    return commit(
      withWorkspaceScenario({
        ...current,
        creditBand: capture.value as CreditRange,
        creditAsked: true,
        correcting: null,
      }),
    );
  }
  if (capture.field === "termYears") {
    const years = Number(capture.value);
    return commit({
      ...current,
      termYears: Number.isFinite(years) && years > 0 ? years : undefined,
      termAsked: true,
      correcting: null,
    });
  }
  if (capture.field === "skip-term") {
    return commit({ ...current, termAsked: true, termYears: undefined, correcting: null });
  }
  return current;
}

function sectionToPrompt(id: SectionId): FoxPrompt {
  if (id === "contact") return "name";
  if (id === "income") return "income";
  if (id === "occupancy") return "occupancy";
  if (id === "documents") return "documents";
  return "review";
}

function unsetForPrompt(
  sections: FoxIntakeDraft["sections"],
  prompt: string,
): FoxIntakeDraft["sections"] {
  if (prompt === "name" || prompt === "email" || prompt === "phone") {
    return { ...sections, contact: false };
  }
  if (prompt === "income") return { ...sections, income: false };
  if (prompt === "occupancy") return { ...sections, occupancy: false };
  if (prompt === "documents") return { ...sections, documents: false };
  return sections;
}

export function hasRequiredContact(draft: FoxIntakeDraft) {
  return Boolean(
    draft.contact.fullName.value &&
      draft.contact.email.value &&
      draft.contact.phone.value,
  );
}

export function allKeySectionsConfirmed(draft: FoxIntakeDraft) {
  return (
    draft.sections.contact &&
    draft.sections.occupancy &&
    draft.sections.income &&
    draft.sections.documents &&
    draft.sections.notes
  );
}

export function documentForSlot(draft: FoxIntakeDraft, slot: DocSlot) {
  return draft.documents.find((doc) => doc.slot === slot);
}

export function contactComplete(draft: FoxIntakeDraft) {
  return hasRequiredContact(draft);
}

export function questionsComplete(draft: FoxIntakeDraft) {
  return (
    hasRequiredContact(draft) &&
    Boolean(draft.incomeType.value) &&
    draft.occupancyAsked
  );
}

export function canConfirmDraft(draft: FoxIntakeDraft) {
  return (
    questionsComplete(draft) &&
    (draft.documents.length > 0 || draft.documentsSkipped)
  );
}

