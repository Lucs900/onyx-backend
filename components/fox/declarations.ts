import type { FactProposal, FoxAction, FoxIntakeDraft, NamedCreditEvent } from "./types";

export const STATED_DECLARATION_FIELD = "statedDeclaration";
export const SUGGESTED_DECLARATION_NOTE = "Suggested · not underwritten";
export const DECLARATIONS_ASK =
  "Any bankruptcy, foreclosure, or short sale I should know about? Skip is fine if none.";

export type StatedDeclaration = "none" | "event";

export function isStatedDeclaration(value: string): value is StatedDeclaration {
  return value === "none" || value === "event";
}

export function declarationsLabel(value: StatedDeclaration) {
  return value === "event" ? "Something to review" : "None";
}

export function declarationsSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "declarations") return false;
  return Boolean(draft.declarationAsked || draft.statedDeclaration);
}

export function isDeclarationsConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_DECLARATION_FIELD;
}

/** Bankruptcy / foreclosure / short sale / bk. Bare yes only at the ask. */
export function parseDeclarations(
  text: string,
  opts?: { allowBareYes?: boolean },
): StatedDeclaration | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase().replace(/[?.!]+$/g, "");
  if (
    /^(no|none|nope|n\/a|na|neither|nothing)$/i.test(lower) ||
    /^(no|none) (bk|bankruptcy|foreclosure|short sale|credit events?)$/i.test(lower) ||
    /^none of those$/.test(lower) ||
    /^no (bankruptcy|foreclosure|short sale)/.test(lower)
  ) {
    return "none";
  }
  if (
    /bankrupt/.test(lower) ||
    /foreclos/.test(lower) ||
    /short\s*sale|shortsale/.test(lower) ||
    /\bbk\b/.test(lower)
  ) {
    return "event";
  }
  if (opts?.allowBareYes && /^(yes|yeah|yep|y)$/i.test(lower)) return "event";
  return undefined;
}

export function isSkipDeclarationsText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function volunteeredDeclarationNote(text: string, value: StatedDeclaration) {
  const trimmed = text.trim().replace(/[?.!]+$/g, "");
  if (!trimmed) return undefined;
  if (/^(yes|yeah|yep|y|no|none|nope|n\/a|na|neither|nothing)$/i.test(trimmed)) {
    return undefined;
  }
  if (value === "none" && /^(no|none) /.test(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

export function creditEventFromDeclaration(text: string): NamedCreditEvent | undefined {
  const lower = text.toLowerCase();
  if (/bankrupt/.test(lower) || /\bbk\b/.test(lower)) return "bankruptcy";
  if (/foreclos/.test(lower)) return "foreclosure";
  return undefined;
}

export function skipDeclarations(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[STATED_DECLARATION_FIELD];
  return {
    ...draft,
    statedDeclaration: undefined,
    declarationNote: undefined,
    creditEvent: undefined,
    declarationAsked: true,
    pendingProposal:
      draft.pendingProposal?.field === STATED_DECLARATION_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedDeclaration(
  draft: FoxIntakeDraft,
  value: StatedDeclaration,
  note?: string,
): FoxIntakeDraft {
  const now = new Date().toISOString();
  const creditEvent =
    value === "event" ? creditEventFromDeclaration(note ?? "") : undefined;
  return {
    ...draft,
    statedDeclaration: value,
    declarationAsked: true,
    declarationNote: value === "event" ? note : undefined,
    creditEvent: value === "event" ? creditEvent : undefined,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [STATED_DECLARATION_FIELD]: {
        field: STATED_DECLARATION_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeStatedDeclaration(
  draft: FoxIntakeDraft,
  value: StatedDeclaration,
  note?: string,
): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: STATED_DECLARATION_FIELD,
    value,
    label: "Declarations",
    kind: "computed",
    note: SUGGESTED_DECLARATION_NOTE,
    methodNote: note,
  };
  return { ...draft, pendingProposal: proposal };
}

export function declarationsConfirmCopy(value: StatedDeclaration) {
  if (value === "event") {
    return `I’ll note a credit event for underwriting. ${SUGGESTED_DECLARATION_NOTE}. Use this?`;
  }
  return `No bankruptcy, foreclosure, or short sale on the file. ${SUGGESTED_DECLARATION_NOTE}. Use this?`;
}

export function declarationsConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "decline-proposal", label: "Leave blank", event: "bubble", capture: { field: "decline-proposal" } },
  ];
}

export function declarationsSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-declarations",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-declarations" },
    },
    {
      id: "hold-declarations",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-declarations" },
    },
  ];
}

export function declarationsAskActions(): FoxAction[] {
  return [
    {
      id: "declarations-none",
      label: "None",
      event: "bubble",
      capture: { field: "statedDeclaration", value: "none" },
    },
    {
      id: "declarations-event",
      label: "Yes",
      event: "bubble",
      capture: { field: "statedDeclaration", value: "event" },
    },
    ...declarationsSkipActions(),
  ];
}

export function declarationsAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  const prior = draft.statedDeclaration;
  if (prior && draft.correcting === "declarations") {
    return {
      text: `Declarations in the file is ${declarationsLabel(prior)}. Still right?`,
      actions: [
        { id: "keep-line", label: "Keep this", event: "bubble", capture: { field: "keep-line" } },
        ...declarationsAskActions(),
      ],
    };
  }
  return {
    text: DECLARATIONS_ASK,
    actions: declarationsAskActions(),
  };
}
