import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const STATED_HOUSEHOLD_FIELD = "statedHousehold";
export const SUGGESTED_HOUSEHOLD_NOTE = "Suggested · not underwritten";
export const HOUSEHOLD_ASK = "Is there another borrower on this file?";

export type StatedHousehold = "alone" | "with_someone";

export function isStatedHousehold(value: string): value is StatedHousehold {
  return value === "alone" || value === "with_someone";
}

export function householdLabel(value: StatedHousehold) {
  return value === "with_someone" ? "Yes" : "None";
}

/** Primary sketch + docs path has started. Household waits until then. */
export function primaryDocsInMotion(draft: FoxIntakeDraft) {
  return Boolean(
    draft.docsStarted ||
      draft.documentsSkipped ||
      draft.sampleAccepted ||
      (draft.skippedClasses?.length ?? 0) > 0 ||
      draft.documents.some(
        (doc) =>
          doc.status === "received" ||
          doc.status === "reading" ||
          doc.status === "extracted",
      ),
  );
}

export function householdSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "household") return false;
  return Boolean(draft.householdAsked || draft.statedHousehold);
}

export function isHouseholdConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_HOUSEHOLD_FIELD;
}

/** just me / on my own / me and my spouse / with my partner. No name or income. */
export function parseHousehold(
  text: string,
  opts?: { allowBare?: boolean },
): StatedHousehold | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase().replace(/[?.!]+$/g, "");
  if (
    /^(just me|on my own|by myself|myself|alone|only me|buying alone|solo|me only)$/i.test(lower) ||
    /\b(just me|on my own|by myself|buying alone|only me)\b/.test(lower)
  ) {
    return "alone";
  }
  if (
    /with someone/.test(lower) ||
    /\bme and my (spouse|partner|wife|husband|fiancé|fiance)\b/.test(lower) ||
    /\bwith my (spouse|partner|wife|husband|fiancé|fiance)\b/.test(lower) ||
    /\b(my spouse|my partner|co-?borrower|both of us|another borrower)\b/.test(lower)
  ) {
    return "with_someone";
  }
  if (opts?.allowBare && /^(yes|yeah|yep|y)$/i.test(lower)) return "with_someone";
  if (opts?.allowBare && /^(no|none|nope)$/i.test(lower)) return "alone";
  return undefined;
}

export function isSkipHouseholdText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipHousehold(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[STATED_HOUSEHOLD_FIELD];
  return {
    ...draft,
    statedHousehold: undefined,
    householdAsked: true,
    pendingProposal:
      draft.pendingProposal?.field === STATED_HOUSEHOLD_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedHousehold(draft: FoxIntakeDraft, value: StatedHousehold): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    statedHousehold: value,
    householdAsked: true,
    coborrowerName: value === "with_someone" ? draft.coborrowerName : undefined,
    coborrowerNameAsked: value === "with_someone" ? draft.coborrowerNameAsked : undefined,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [STATED_HOUSEHOLD_FIELD]: {
        field: STATED_HOUSEHOLD_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeStatedHousehold(draft: FoxIntakeDraft, value: StatedHousehold): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: STATED_HOUSEHOLD_FIELD,
    value,
    label: "Household",
    kind: "computed",
    note: SUGGESTED_HOUSEHOLD_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function householdConfirmCopy(value: StatedHousehold) {
  if (value === "with_someone") {
    return `I’ll note more than one borrower. ${SUGGESTED_HOUSEHOLD_NOTE}. Use this?`;
  }
  return `This file is just you. ${SUGGESTED_HOUSEHOLD_NOTE}. Use this?`;
}

export function householdConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
}

export function householdSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-household",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-household" },
    },
    {
      id: "hold-household",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-household" },
    },
  ];
}

export function householdAskActions(): FoxAction[] {
  return [
    {
      id: "household-with-someone",
      label: "Yes",
      event: "bubble",
      capture: { field: "statedHousehold", value: "with_someone" },
    },
    {
      id: "household-alone",
      label: "None",
      event: "bubble",
      capture: { field: "statedHousehold", value: "alone" },
    },
    ...householdSkipActions(),
  ];
}

export function householdAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  return {
    text: HOUSEHOLD_ASK,
    actions: householdAskActions(),
  };
}
