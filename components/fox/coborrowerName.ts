import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";
import { displayBorrowerName, parseBorrowerName } from "./borrowerName";
import { primaryDocsInMotion } from "./household";

export const COBORROWER_NAME_FIELD = "coborrowerName";
export const COBORROWER_NAME_FACT = "coborrower_name";
export const SPOUSE_NAME_FACT = "spouse_name";
export const SUGGESTED_COBORROWER_NOTE = "Suggested · not underwritten";
export const COBORROWER_NAME_ASK = "What’s their name?";
export const COBORROWER_CONFIRM_ASK = "The file already has a name for the other borrower.";

export function coborrowerNameFromFile(draft: FoxIntakeDraft) {
  const raw = (
    draft.coborrowerName ||
    draft.facts?.[COBORROWER_NAME_FACT]?.value ||
    draft.facts?.[SPOUSE_NAME_FACT]?.value ||
    ""
  ).trim();
  return raw ? displayBorrowerName(raw) : "";
}

export function coborrowerNameOnFile(draft: FoxIntakeDraft) {
  return coborrowerNameFromFile(draft);
}

export function coborrowerNameSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "coborrower-name") return false;
  if (draft.statedHousehold !== "with_someone") return true;
  if (!primaryDocsInMotion(draft)) return true;
  return Boolean(draft.coborrowerNameAsked || draft.coborrowerName);
}

export function isCoborrowerNameConfirmPending(draft: FoxIntakeDraft) {
  const field = draft.pendingProposal?.field;
  return field === COBORROWER_NAME_FIELD || field === COBORROWER_NAME_FACT || field === SPOUSE_NAME_FACT;
}

export function isCoborrowerNameField(field: string) {
  return field === COBORROWER_NAME_FIELD || field === COBORROWER_NAME_FACT || field === SPOUSE_NAME_FACT;
}

export function isSkipCoborrowerNameText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function parseCoborrowerName(text: string): string | null {
  return parseBorrowerName(text);
}

export function skipCoborrowerName(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[COBORROWER_NAME_FIELD];
  return {
    ...draft,
    coborrowerName: undefined,
    coborrowerNameAsked: true,
    pendingProposal: isCoborrowerNameConfirmPending(draft) ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeCoborrowerName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = displayBorrowerName(name);
  return {
    ...draft,
    coborrowerName: value,
    coborrowerNameAsked: true,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [COBORROWER_NAME_FIELD]: {
        field: COBORROWER_NAME_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      [COBORROWER_NAME_FACT]: {
        field: COBORROWER_NAME_FACT,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeCoborrowerName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const value = displayBorrowerName(name);
  const proposal: FactProposal = {
    field: COBORROWER_NAME_FIELD,
    value,
    label: "Other borrower",
    kind: "document",
    note: SUGGESTED_COBORROWER_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function coborrowerNameConfirmCopy(name: string) {
  return `The file already has ${displayBorrowerName(name)}. ${SUGGESTED_COBORROWER_NOTE}. Use this for the other borrower?`;
}

export function coborrowerNameConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
}

export function coborrowerNameSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-coborrower-name",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-coborrower-name" },
    },
    {
      id: "hold-coborrower-name",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-coborrower-name" },
    },
  ];
}

export function coborrowerNameAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  const fromFile = coborrowerNameFromFile(draft);
  if (fromFile && !draft.coborrowerName && !draft.coborrowerNameAsked && draft.correcting !== "coborrower-name") {
    return {
      text: coborrowerNameConfirmCopy(fromFile),
      actions: [
        {
          id: "use-coborrower-name",
          label: "Use this",
          event: "bubble",
          capture: { field: "coborrowerName", value: fromFile },
        },
        {
          id: "change-coborrower-name",
          label: "Change",
          event: "bubble",
          capture: { field: "correct", value: "coborrower-name" },
        },
      ],
    };
  }
  return {
    text: COBORROWER_NAME_ASK,
    actions: coborrowerNameSkipActions(),
  };
}
