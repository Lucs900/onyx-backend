import {
  readScenario,
  writeScenario,
  type CreditRange,
  type ExplorerScenario,
} from "@/components/products/scenario";
import {
  CONFIRMED_STATUS,
  INTAKE_STORAGE_KEY,
  type Capture,
  type DocSlot,
  type DocStatus,
  type DraftField,
  type FoxIntakeDraft,
  type FoxPrompt,
  type IntakePath,
  type LoMark,
  type ProductIntent,
  type ReceivedDoc,
  type SectionId,
} from "./types";
import { purposeForIntent, slugForIntent, workspacePrompt } from "./workspace";

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function emptyField(field: string, value = "", source: DraftField["source"] = "client"): DraftField {
  return { field, value, source, confirmed: false };
}

export function emptyDraft(): FoxIntakeDraft {
  return {
    version: 1,
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
    scenario: null,
    notes: [],
    documents: [],
    documentsSkipped: false,
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
  if (raw.version !== 1 || !raw.contact) return base;
  return {
    ...base,
    ...raw,
    contact: { ...base.contact, ...raw.contact },
    incomeType: raw.incomeType ?? base.incomeType,
    occupancyChoice: raw.occupancyChoice ?? base.occupancyChoice,
    timelineChoice: raw.timelineChoice ?? base.timelineChoice,
    occupancyAsked: Boolean(raw.occupancyAsked),
    timelineAsked: Boolean(raw.timelineAsked),
    preferredAsked: Boolean(raw.preferredAsked),
    correcting: raw.correcting ?? null,
    path: raw.path === "acr" || raw.path === "loan-only" ? raw.path : undefined,
    productIntent:
      raw.productIntent === "buy" ||
      raw.productIntent === "refinance" ||
      raw.productIntent === "use-equity"
        ? raw.productIntent
        : undefined,
    loanAmountValue: numberOrUndefined(raw.loanAmountValue),
    propertyValueAmount: numberOrUndefined(raw.propertyValueAmount),
    amountAsked: Boolean(raw.amountAsked),
    valueAsked: Boolean(raw.valueAsked),
    creditBand: raw.creditBand,
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
    })),
    sections: { ...base.sections, ...raw.sections },
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
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function hydrateFoxDraft() {
  if (hydrated || typeof window === "undefined") return current;
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

/** Overlay URL path/intent on the live draft. Safe to call during /start first paint. */
export function applyWorkspaceEntry(
  path: IntakePath | null,
  intent: ProductIntent | null,
) {
  hydrateFoxDraft();
  setWorkspaceFlow(true);
  if (path) setDraftPath(path);
  if (intent) setDraftProductIntent(intent);
  return current;
}

/** Desktop hero CTA: lock the path and start at the product question. */
export function beginWorkspaceFromHero(path: IntakePath) {
  hydrateFoxDraft();
  const next: FoxIntakeDraft = {
    ...emptyDraft(),
    path,
    workspaceFlow: true,
  };
  current = { ...next, updatedAt: new Date().toISOString() };
  hydrated = true;
  persist(current);
  emit();
  return current;
}

function withProductIntent(draft: FoxIntakeDraft, intent: ProductIntent): FoxIntakeDraft {
  const scenario = draft.scenario
    ? {
        ...draft.scenario,
        purpose: purposeForIntent(intent),
        productSlug: slugForIntent(intent),
        productName:
          intent === "buy" ? "Buy" : intent === "refinance" ? "Refinance" : "Use equity",
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
    purpose: draft.productIntent ? purposeForIntent(draft.productIntent) : scenario.purpose,
    productSlug: draft.productIntent ? slugForIntent(draft.productIntent) : scenario.productSlug,
    occupancy:
      (draft.occupancyChoice.value as ExplorerScenario["occupancy"]) || scenario.occupancy,
    timeline:
      (draft.timelineChoice.value as ExplorerScenario["timeline"]) || scenario.timeline,
    loanAmount: draft.loanAmountValue ?? scenario.loanAmount,
    propertyValue: draft.propertyValueAmount ?? scenario.propertyValue,
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

export function receiveDocument(input: Omit<ReceivedDoc, "status" | "note">) {
  const documents = current.documents.filter((item) => item.slot !== input.slot);
  documents.push({ ...input, status: "received" });
  const next = commit({
    ...current,
    documents,
    documentsSkipped: false,
    correcting: current.workspaceFlow ? null : current.correcting,
    phase: current.phase === "context" ? "documents" : current.phase,
    sections: { ...current.sections, documents: false },
  });
  if (
    next.workspaceFlow &&
    next.sampleAccepted &&
    next.workspaceDraftStatus !== "with-originator"
  ) {
    return confirmDraft();
  }
  return next;
}

export function setDocumentStatus(slot: DocSlot, status: DocStatus, note?: string) {
  return commit({
    ...current,
    documents: current.documents.map((doc) =>
      doc.slot === slot ? { ...doc, status, note } : doc,
    ),
  });
}

export function skipDocuments() {
  return commit({
    ...current,
    documentsSkipped: true,
    phase: "draft",
    correcting: null,
    sections: { ...current.sections, documents: false },
  });
}

export function advancePhase() {
  if (!hasRequiredContact(current)) {
    return commit({ ...current, phase: "context" });
  }
  if (!current.incomeType.value || !current.occupancyAsked || !current.timelineAsked) {
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
    workspaceDraftStatus: current.workspaceFlow ? "with-originator" : current.workspaceDraftStatus,
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

export function applyCapture(capture: Capture) {
  if (capture.field === "fullName" || capture.field === "email" || capture.field === "phone" || capture.field === "preferredContact") {
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
    const knownDocs =
      capture.value === "w2" ||
      capture.value === "self-employed" ||
      capture.value === "both";
    const skipDocs = current.workspaceFlow && capture.value === "other";
    commit({
      ...current,
      incomeType: clientField("incomeType", capture.value),
      documentsSkipped: skipDocs
        ? true
        : current.workspaceFlow && knownDocs && !current.documents.length
          ? false
          : current.documentsSkipped,
      correcting: null,
      sections: { ...current.sections, income: false },
      status: undefined,
      confirmedAt: undefined,
    });
    if (current.workspaceFlow) {
      if (skipDocs && current.sampleAccepted) return confirmDraft();
      return current;
    }
    return advancePhase();
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
    if (current.workspaceFlow && current.sampleAccepted) return confirmDraft();
    if (current.workspaceFlow) return current;
    return advancePhase();
  }
  if (capture.field === "open-docs") {
    return commit({ ...current, phase: "documents" });
  }
  if (capture.field === "confirm-draft") {
    if (current.workspaceFlow && !current.sampleAccepted) {
      commit({
        ...current,
        sampleAccepted: true,
        workspaceDraftStatus:
          current.workspaceDraftStatus === "with-originator" ? "with-originator" : "ready",
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
  if (capture.field === "correct") {
    return commit({
      ...current,
      correcting: capture.value as FoxPrompt,
      sections: unsetForPrompt(current.sections, capture.value),
    });
  }
  if (capture.field === "note") {
    return addNote(capture.value);
  }
  if (capture.field === "path") {
    return commit({ ...current, path: capture.value });
  }
  if (capture.field === "productIntent") {
    return commit(
    withWorkspaceScenario(withProductIntent({ ...current, correcting: null }, capture.value)),
  );
  }
  if (capture.field === "loanAmount") {
    const [loanRaw, valueRaw] = capture.value.split(":");
    const loan = Number(loanRaw.replace(/,/g, ""));
    const value = valueRaw ? Number(valueRaw.replace(/,/g, "")) : undefined;
    const hasLoan = Number.isFinite(loan) && loan > 0;
    const hasValue = value != null && Number.isFinite(value) && value > 0;
    return commit(
      withWorkspaceScenario({
        ...current,
        amountAsked: true,
        correcting: null,
        valueAsked: hasValue ? true : current.valueAsked,
        loanAmountValue: hasLoan ? loan : current.loanAmountValue,
        propertyValueAmount: hasValue ? value : current.propertyValueAmount,
      }),
    );
  }
  if (capture.field === "propertyValue") {
    const value = Number(capture.value.replace(/,/g, ""));
    return commit(
      withWorkspaceScenario({
        ...current,
        valueAsked: true,
        correcting: null,
        propertyValueAmount:
          Number.isFinite(value) && value > 0 ? value : current.propertyValueAmount,
      }),
    );
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
    draft.occupancyAsked &&
    draft.timelineAsked
  );
}

export function canConfirmDraft(draft: FoxIntakeDraft) {
  return (
    questionsComplete(draft) &&
    (draft.documents.length > 0 || draft.documentsSkipped)
  );
}

export const SAMPLE_SCENARIO: ExplorerScenario = {
  zip: "94129",
  purpose: "purchase",
  propertyValue: 1_200_000,
  amountMode: "loan",
  loanAmount: 960_000,
  downPayment: 240_000,
  creditRange: "760+",
  occupancy: "primary",
  timeline: "30-90",
  productSlug: "conventional-purchase",
  productName: "Conventional Purchase",
};

export function seedPreviewSample(mode: "intake" | "confirmed") {
  const now = new Date().toISOString();
  const contact = {
    fullName: emptyField("fullName", "Alex Rivera"),
    email: emptyField("email", "alex@example.com"),
    phone: emptyField("phone", "415-555-0100"),
    preferredContact: emptyField("preferredContact", "email"),
  };
  const base: FoxIntakeDraft = {
    ...emptyDraft(),
    previewSample: true,
    preferredAsked: true,
    scenario: SAMPLE_SCENARIO,
    contact,
    occupancyChoice: emptyField("occupancy", "primary", "scenario"),
    timelineChoice: emptyField("timeline", "30-90", "scenario"),
  };

  const next: FoxIntakeDraft =
    mode === "confirmed"
      ? {
          ...base,
          phase: "confirmed",
          status: CONFIRMED_STATUS,
          confirmedAt: now,
          loStatus: "in review",
          occupancyAsked: true,
          timelineAsked: true,
          documentsSkipped: true,
          incomeType: {
            ...emptyField("incomeType", "w2"),
            confirmed: true,
            confirmedAt: now,
          },
          occupancyChoice: {
            ...emptyField("occupancy", "primary", "scenario"),
            confirmed: true,
            confirmedAt: now,
          },
          timelineChoice: {
            ...emptyField("timeline", "30-90", "scenario"),
            confirmed: true,
            confirmedAt: now,
          },
          contact: {
            fullName: { ...contact.fullName, confirmed: true, confirmedAt: now },
            email: { ...contact.email, confirmed: true, confirmedAt: now },
            phone: { ...contact.phone, confirmed: true, confirmedAt: now },
            preferredContact: {
              ...contact.preferredContact,
              confirmed: true,
              confirmedAt: now,
            },
          },
          sections: {
            contact: true,
            scenario: true,
            occupancy: true,
            income: true,
            documents: true,
            notes: true,
          },
        }
      : { ...base, phase: "context" };

  current = { ...next, updatedAt: now };
  hydrated = true;
  persist(current);
  writeScenario(SAMPLE_SCENARIO);
  emit();
  return current;
}
