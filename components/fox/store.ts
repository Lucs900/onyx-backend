import { readScenario, type ExplorerScenario } from "@/components/products/scenario";
import {
  CONFIRMED_STATUS,
  INTAKE_STORAGE_KEY,
  type DocSlot,
  type DraftField,
  type FoxIntakeDraft,
  type LoMark,
  type ReceivedDoc,
  type SectionId,
} from "./types";

function emptyField(field: string): DraftField {
  return { field, value: "", source: "client", confirmed: false };
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
    scenario: null,
    notes: [],
    documents: [],
    documentsSkipped: false,
    preferredAsked: false,
    sections: {
      contact: false,
      scenario: false,
      occupancy: false,
      documents: false,
      notes: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

function isDraft(value: unknown): value is FoxIntakeDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as FoxIntakeDraft;
  return draft.version === 1 && Boolean(draft.contact) && Boolean(draft.sections);
}

function readStored(): FoxIntakeDraft {
  if (typeof window === "undefined") return emptyDraft();
  try {
    const local = window.localStorage.getItem(INTAKE_STORAGE_KEY);
    const session = window.sessionStorage.getItem(INTAKE_STORAGE_KEY);
    const raw = local || session;
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as unknown;
    return isDraft(parsed) ? parsed : emptyDraft();
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
    if (scenario) current = { ...current, scenario, updatedAt: new Date().toISOString() };
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

export function setDraftScenario(scenario: ExplorerScenario | null) {
  if (!scenario) return current;
  return commit({ ...current, scenario });
}

export function setContactField(
  key: keyof FoxIntakeDraft["contact"],
  value: string,
) {
  const field: DraftField = {
    field: key,
    value,
    source: "client",
    confirmed: false,
  };
  return commit({
    ...current,
    phase: current.phase === "confirmed" ? "draft" : current.phase,
    contact: { ...current.contact, [key]: field },
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

export function addDocument(doc: ReceivedDoc) {
  const documents = current.documents.filter((item) => item.slot !== doc.slot);
  documents.push(doc);
  return commit({
    ...current,
    documents,
    documentsSkipped: false,
    phase: current.phase === "context" ? "documents" : current.phase,
    sections: { ...current.sections, documents: false },
  });
}

export function skipDocuments() {
  return commit({
    ...current,
    documentsSkipped: true,
    phase: "draft",
    sections: { ...current.sections, documents: false },
  });
}

export function advancePhase() {
  const { fullName, email, phone } = current.contact;
  if (!fullName.value || !email.value || !phone.value) {
    return commit({ ...current, phase: "context" });
  }
  if (!current.documents.length && !current.documentsSkipped) {
    return commit({ ...current, phase: "documents" });
  }
  if (!allKeySectionsConfirmed(current)) {
    return commit({ ...current, phase: "draft" });
  }
  return current;
}

export function confirmSection(id: SectionId) {
  const sections = { ...current.sections, [id]: true };
  const next: FoxIntakeDraft = { ...current, sections, phase: "draft" };
  if (allKeySectionsConfirmed(next) && hasRequiredContact(next) && next.scenario) {
    next.phase = "confirmed";
    next.status = CONFIRMED_STATUS;
    next.confirmedAt = new Date().toISOString();
    next.loStatus = next.loStatus ?? "in review";
  }
  return commit(next);
}

export function editSection(id: SectionId) {
  return commit({
    ...current,
    phase: id === "contact" ? "context" : "draft",
    sections: { ...current.sections, [id]: false },
    status: undefined,
    confirmedAt: undefined,
  });
}

export function setLoStatus(loStatus: LoMark) {
  return commit({ ...current, loStatus });
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
    draft.sections.scenario &&
    draft.sections.occupancy &&
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
