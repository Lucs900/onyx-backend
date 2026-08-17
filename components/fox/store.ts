import {
  readScenario,
  writeScenario,
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
  type LoMark,
  type ReceivedDoc,
  type SectionId,
} from "./types";

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
  return commit({
    ...current,
    documents,
    documentsSkipped: false,
    phase: current.phase === "context" ? "documents" : current.phase,
    sections: { ...current.sections, documents: false },
  });
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
    commit({
      ...current,
      incomeType: clientField("incomeType", capture.value),
      correcting: null,
      sections: { ...current.sections, income: false },
      status: undefined,
      confirmedAt: undefined,
    });
    return advancePhase();
  }
  if (capture.field === "occupancy") {
    commit({
      ...current,
      occupancyChoice: clientField("occupancy", capture.value),
      occupancyAsked: true,
      correcting: null,
      sections: { ...current.sections, occupancy: false },
      status: undefined,
      confirmedAt: undefined,
    });
    return advancePhase();
  }
  if (capture.field === "timeline") {
    commit({
      ...current,
      timelineChoice: clientField("timeline", capture.value),
      timelineAsked: true,
      correcting: null,
    });
    return advancePhase();
  }
  if (capture.field === "skip-docs") {
    skipDocuments();
    return advancePhase();
  }
  if (capture.field === "open-docs") {
    return commit({ ...current, phase: "documents" });
  }
  if (capture.field === "confirm-draft") {
    return confirmDraft();
  }
  if (capture.field === "needs-correction") {
    return commit({
      ...current,
      phase: "draft",
      correcting: "correct",
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
