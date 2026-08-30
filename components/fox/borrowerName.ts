import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const BORROWER_NAME_FIELD = "borrowerName";
export const FULL_NAME_FACT = "full_name";
export const SUGGESTED_BORROWER_NOTE = "Suggested · not underwritten";
export const BORROWER_NAME_ASK =
  "What name should I put on this file? Skip is fine if you’ll upload an ID.";

export function displayBorrowerName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function borrowerNameOnFile(draft: FoxIntakeDraft) {
  const raw = (draft.borrowerName || draft.contact.fullName.value || "").trim();
  return raw ? displayBorrowerName(raw) : "";
}

export function governmentIdExpected(draft: FoxIntakeDraft) {
  return Boolean(draft.incomeType.value || draft.incomeAsked);
}

export function governmentIdSkipped(draft: FoxIntakeDraft) {
  return (draft.skippedClasses ?? []).includes("government_id");
}

function isThisBorrowerIdDoc(doc: FoxIntakeDraft["documents"][number]) {
  if (doc.party === "coborrower") return false;
  return doc.extractClass === "government_id" || doc.slot === "id";
}

export function governmentIdExtractFailed(draft: FoxIntakeDraft) {
  const idDocs = draft.documents.filter(isThisBorrowerIdDoc);
  if (!idDocs.length) return false;
  const finished = idDocs.some(
    (doc) =>
      doc.status === "extracted" ||
      doc.status === "failed" ||
      doc.status === "needs better copy" ||
      /could not read|no text layer/i.test(doc.note ?? ""),
  );
  if (!finished) return false;
  if (isBorrowerNameConfirmPending(draft)) return false;
  if (draft.borrowerName || draft.contact.fullName.value || draft.facts?.full_name?.value) {
    return false;
  }
  return true;
}

/** ID was successfully read. Failed / unread stays on the ID item — not the name ask. */
export function governmentIdSuccessfullyRead(draft: FoxIntakeDraft) {
  return draft.documents.some(
    (doc) =>
      isThisBorrowerIdDoc(doc) &&
      doc.status === "extracted" &&
      !/could not read|no text layer/i.test(doc.note ?? ""),
  );
}

/** ID is still the next expected document. Typed name is illegal while this is true. */
export function governmentIdOutstanding(draft: FoxIntakeDraft) {
  return Boolean(
    governmentIdExpected(draft) && !governmentIdSkipped(draft) && !governmentIdSuccessfullyRead(draft),
  );
}

export function borrowerNameSettled(draft: FoxIntakeDraft) {
  if (governmentIdOutstanding(draft)) return true;
  if (draft.correcting === "borrower-name") return false;
  if (draft.borrowerNameAsked || draft.borrowerName || draft.contact.fullName.value) return true;
  if (isBorrowerNameConfirmPending(draft)) return true;
  return false;
}

export function isBorrowerNameConfirmPending(draft: FoxIntakeDraft) {
  const field = draft.pendingProposal?.field;
  return field === BORROWER_NAME_FIELD || field === FULL_NAME_FACT;
}

export function isBorrowerNameField(field: string) {
  return field === BORROWER_NAME_FIELD || field === FULL_NAME_FACT;
}

export function isSkipBorrowerNameText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

/** Jordan Hale, it's Jordan. No SSN, no DOB, no second borrower. */
export function parseBorrowerName(text: string): string | null {
  let trimmed = text.trim().replace(/[?.!]+$/g, "");
  if (!trimmed) return null;
  trimmed = trimmed.replace(
    /^(it'?s|it is|my name is|the name is|name is|i'?m|i am|this is|call me)\s+/i,
    "",
  );
  trimmed = trimmed.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 80) return null;
  if (isSkipBorrowerNameText(trimmed)) return null;
  if (/[0-9]/.test(trimmed)) return null;
  if (!/^[A-Za-z][A-Za-z.'\- ]*[A-Za-z.']$/.test(trimmed) && !/^[A-Za-z][A-Za-z.'\-]*$/.test(trimmed)) {
    return null;
  }
  const words = trimmed.split(/\s+/);
  if (words.length < 1 || words.length > 5) return null;
  const lower = trimmed.toLowerCase();
  if (
    /^(skip|yes|no|none|ok|okay|hello|hi|hey|thanks|thank you|will i qualify)$/.test(lower)
  ) {
    return null;
  }
  return displayBorrowerName(trimmed);
}

export function skipBorrowerName(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[BORROWER_NAME_FIELD];
  return {
    ...draft,
    borrowerName: undefined,
    borrowerNameAsked: true,
    pendingProposal: isBorrowerNameConfirmPending(draft) ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeBorrowerName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = displayBorrowerName(name);
  return {
    ...draft,
    borrowerName: value,
    borrowerNameAsked: true,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    contact: {
      ...draft.contact,
      fullName: { field: "fullName", value, source: "suggested", confirmed: true, confirmedAt: now },
    },
    facts: {
      ...(draft.facts ?? {}),
      [BORROWER_NAME_FIELD]: {
        field: BORROWER_NAME_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      [FULL_NAME_FACT]: {
        field: FULL_NAME_FACT,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeBorrowerName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const value = displayBorrowerName(name);
  const proposal: FactProposal = {
    field: BORROWER_NAME_FIELD,
    value,
    label: "Borrower",
    kind: "computed",
    note: SUGGESTED_BORROWER_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function proposeExtractedBorrowerName(
  draft: FoxIntakeDraft,
  name: string,
  extras: { field: string; value: string; label: string }[] = [],
): FoxIntakeDraft {
  const value = displayBorrowerName(name);
  return {
    ...draft,
    pendingProposal: {
      field: BORROWER_NAME_FIELD,
      value,
      label: "Borrower",
      kind: "computed",
      note: SUGGESTED_BORROWER_NOTE,
      extras,
    },
  };
}

export function borrowerNameConfirmCopy(name: string) {
  return `I’ll use ${displayBorrowerName(name)} on this file. ${SUGGESTED_BORROWER_NOTE}. Use this?`;
}

export function borrowerNameExtractCopy(name: string, address?: string) {
  if (address) {
    return `The ID shows ${displayBorrowerName(name)}, ${address}. ${SUGGESTED_BORROWER_NOTE}. Use this?`;
  }
  return `The ID shows ${displayBorrowerName(name)}. ${SUGGESTED_BORROWER_NOTE}. Use this?`;
}

export function borrowerNameConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
}

export function borrowerNameSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-borrower-name",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-borrower-name" },
    },
    {
      id: "hold-borrower-name",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-borrower-name" },
    },
  ];
}

export function borrowerNameAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  return {
    text: BORROWER_NAME_ASK,
    actions: borrowerNameSkipActions(),
  };
}

export function borrowerNameConflictActions(): FoxAction[] {
  return [
    {
      id: "use-document-fact",
      label: "Use document",
      event: "bubble",
      capture: { field: "use-document-fact" },
    },
    {
      id: "keep-file-fact",
      label: "Keep the typed name",
      event: "bubble",
      capture: { field: "keep-file-fact" },
    },
  ];
}
