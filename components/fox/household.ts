import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const STATED_HOUSEHOLD_FIELD = "statedHousehold";
export const SUGGESTED_HOUSEHOLD_NOTE = "Suggested · not underwritten";
export const HOUSEHOLD_ASK = "Are you buying this on your own, or with someone? Skip is fine.";

export type StatedHousehold = "alone" | "with_someone";

export function isStatedHousehold(value: string): value is StatedHousehold {
  return value === "alone" || value === "with_someone";
}

export function householdLabel(value: StatedHousehold) {
  return value === "with_someone" ? "With someone" : "On my own";
}

export function householdSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "household") return false;
  return Boolean(draft.householdAsked || draft.statedHousehold);
}

export function isHouseholdConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_HOUSEHOLD_FIELD;
}

/** just me / on my own / me and my spouse / with my partner. No name or income. */
export function parseHousehold(text: string): StatedHousehold | undefined {
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
    /\b(my spouse|my partner|co-?borrower|both of us)\b/.test(lower)
  ) {
    return "with_someone";
  }
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
      id: "household-alone",
      label: "On my own",
      event: "bubble",
      capture: { field: "statedHousehold", value: "alone" },
    },
    {
      id: "household-with-someone",
      label: "With someone",
      event: "bubble",
      capture: { field: "statedHousehold", value: "with_someone" },
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
