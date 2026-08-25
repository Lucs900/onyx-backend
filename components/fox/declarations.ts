import type { FactProposal, FoxAction, FoxIntakeDraft, NamedCreditEvent } from "./types";

export const STATED_DECLARATION_FIELD = "statedDeclaration";
export const SUGGESTED_DECLARATION_NOTE = "Suggested · not underwritten";
export const DECLARATIONS_ASK =
  "Any bankruptcy, foreclosure, or short sale I should know about? Skip is fine if none.";
export const DECLARATION_TIMING_ASK = "About how long ago?";
export const DECLARATION_TIMING_FIELD = "declarationTiming";

export type StatedDeclaration = "none" | "event";

export function isStatedDeclaration(value: string): value is StatedDeclaration {
  return value === "none" || value === "event";
}

export function declarationsLabel(value: StatedDeclaration) {
  return value === "event" ? "Something to review" : "None";
}

export function needsDeclarationTiming(draft: FoxIntakeDraft) {
  if (draft.correcting === "declarations") return false;
  if (draft.correcting === "declaration-timing") return true;
  return (
    draft.statedDeclaration === "event" &&
    !draft.declarationTimingAsked &&
    !draft.declarationTiming
  );
}

export function declarationsSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "declarations" || draft.correcting === "declaration-timing") {
    return false;
  }
  if (!(draft.declarationAsked || draft.statedDeclaration)) return false;
  return !needsDeclarationTiming(draft);
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

export function isSkipDeclarationTimingText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

/** Year, month+year, or the best they give. No guideline sermon. */
export function parseDeclarationTiming(text: string): string | undefined {
  const trimmed = text.trim().replace(/[?.!]+$/g, "");
  if (!trimmed) return undefined;
  if (isSkipDeclarationTimingText(trimmed)) return undefined;
  if (/^(yes|yeah|yep|y|no|none|nope|n\/a|na)$/i.test(trimmed)) return undefined;
  if (/^(bankruptcy|foreclosure|short sale|shortsale|bk)$/i.test(trimmed)) return undefined;
  return trimmed.replace(/\s+/g, " ").slice(0, 80);
}

export function extractDeclarationTiming(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const monthYear = trimmed.match(
    /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(?:19|20)\d{2})\b/i,
  );
  if (monthYear) return monthYear[1].replace(/\s+/g, " ");
  const aboutYears = trimmed.match(/\b((?:about|around|roughly)\s+\d+(?:\.\d+)?\s+years?(?:\s+ago)?)\b/i);
  if (aboutYears) return aboutYears[1];
  const yearsAgo = trimmed.match(/\b(\d+(?:\.\d+)?\s+years?\s+ago)\b/i);
  if (yearsAgo) return yearsAgo[1];
  const year = trimmed.match(/\b((?:19|20)\d{2})\b/);
  if (year) return year[1];
  return undefined;
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
    declarationTiming: undefined,
    declarationTimingAsked: undefined,
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
  const timing =
    value === "event" ? extractDeclarationTiming(note ?? "") : undefined;
  const facts = { ...(draft.facts ?? {}) };
  facts[STATED_DECLARATION_FIELD] = {
    field: STATED_DECLARATION_FIELD,
    value,
    source: "suggested",
    confirmed: true,
    confirmedAt: now,
  };
  if (timing) {
    facts[DECLARATION_TIMING_FIELD] = {
      field: DECLARATION_TIMING_FIELD,
      value: timing,
      source: "suggested",
      confirmed: true,
      confirmedAt: now,
    };
  } else {
    delete facts[DECLARATION_TIMING_FIELD];
  }
  return {
    ...draft,
    statedDeclaration: value,
    declarationAsked: true,
    declarationNote: value === "event" ? note : undefined,
    declarationTiming: timing,
    declarationTimingAsked: value === "event" ? Boolean(timing) : undefined,
    creditEvent: value === "event" ? creditEvent : undefined,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function skipDeclarationTiming(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[DECLARATION_TIMING_FIELD];
  return {
    ...draft,
    declarationTiming: undefined,
    declarationTimingAsked: true,
    pendingProposal: null,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeDeclarationTiming(draft: FoxIntakeDraft, timing: string): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = timing.trim().replace(/\s+/g, " ").slice(0, 80);
  return {
    ...draft,
    declarationTiming: value,
    declarationTimingAsked: true,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [DECLARATION_TIMING_FIELD]: {
        field: DECLARATION_TIMING_FIELD,
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
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
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
  return {
    text: DECLARATIONS_ASK,
    actions: declarationsAskActions(),
  };
}

export function declarationTimingSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-declaration-timing",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-declaration-timing" },
    },
    {
      id: "hold-declaration-timing",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-declaration-timing" },
    },
  ];
}

export function declarationTimingAskCopy(): {
  text: string;
  actions?: FoxAction[];
} {
  return {
    text: DECLARATION_TIMING_ASK,
    actions: declarationTimingSkipActions(),
  };
}
