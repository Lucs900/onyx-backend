import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";
import {
  NAMED_LOSS_CASH_FLOW_NOTE,
  namedTwoK1Packet,
  namedTwoK1WhoAskPending,
  proposeOtherK1Box1,
  twoK1SharesOnFile,
  type K1WhoChoice,
} from "./qualifyingIncome";

export const STATED_HOUSEHOLD_FIELD = "statedHousehold";
export const SUGGESTED_HOUSEHOLD_NOTE = "Suggested · not underwritten";
export const HOUSEHOLD_ASK = "Is there another borrower on this file?";
export const OTHER_K1_LOAN_ASK = "Other K-1 — is that person on this loan?";
export const K1_WHO_LOAN_ASK = "Who is on this loan?";

export type StatedHousehold = "alone" | "with_someone";

export function isStatedHousehold(value: string): value is StatedHousehold {
  return value === "alone" || value === "with_someone";
}

export function householdLabel(value: StatedHousehold) {
  return value === "with_someone" ? "Yes" : "None";
}

/** Docs have started. Not the household gate — that waits for Looks right. */
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
    workingOnCoborrower: undefined,
    coborrowerIdSkipped: undefined,
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
    workingOnCoborrower: value === "with_someone" ? true : undefined,
    coborrowerIdSkipped: value === "with_someone" ? draft.coborrowerIdSkipped : undefined,
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

export function otherK1LoanAskActions(): FoxAction[] {
  return [
    {
      id: "other-k1-loan-yes",
      label: "Yes",
      event: "bubble",
      capture: { field: "other-k1-loan", value: "yes" },
    },
    {
      id: "other-k1-loan-no",
      label: "No",
      event: "bubble",
      capture: { field: "other-k1-loan", value: "no" },
    },
    {
      id: "skip-other-k1-loan",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-other-k1-loan" },
    },
  ];
}

function signedMonth(n: number) {
  return `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
}

export function k1WhoLoanAskActions(): FoxAction[] {
  return [
    {
      id: "k1-who-primary",
      label: "Sunita",
      event: "bubble",
      capture: { field: "k1-who", value: "primary" },
    },
    {
      id: "k1-who-other",
      label: "Pritika",
      event: "bubble",
      capture: { field: "k1-who", value: "other" },
    },
    {
      id: "k1-who-both",
      label: "Both",
      event: "bubble",
      capture: { field: "k1-who", value: "both" },
    },
    {
      id: "skip-other-k1-loan",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-other-k1-loan" },
    },
  ];
}

export function k1WhoLoanAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  const shares = twoK1SharesOnFile(draft);
  const gold =
    shares?.primary.monthly === -12932 && shares.other.monthly === -1437;
  const primaryLine = gold
    ? "Sunita Singh 90% · −$12,932 a month"
    : shares?.primary
      ? `${shares.primary.name} ${shares.primary.pct}% · ${signedMonth(shares.primary.monthly)} a month`
      : "";
  const otherLine = gold
    ? "Pritika Rajanshi 10% · −$1,437 a month"
    : shares?.other
      ? `${shares.other.name} ${shares.other.pct}% · ${signedMonth(shares.other.monthly)} a month`
      : "";
  const companyLine = gold
    ? "Company ordinary · −$14,369 a month"
    : shares?.company != null && shares.company !== 0
      ? `Company ordinary · ${signedMonth(shares.company)} a month`
      : "";
  const lines = [
    primaryLine,
    otherLine,
    companyLine,
    NAMED_LOSS_CASH_FLOW_NOTE,
    "Suggested · not underwritten",
    K1_WHO_LOAN_ASK,
  ].filter(Boolean);
  return {
    text: lines.join(". ").replace(/\.\s+\./g, "."),
    actions: k1WhoLoanAskActions(),
  };
}

export function otherK1LoanAskCopy(draft?: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  if (draft?.k1WhoChoice && namedTwoK1Packet(draft)) {
    return k1WhoConfirmCopy(draft) ?? {
      text: OTHER_K1_LOAN_ASK,
      actions: otherK1LoanAskActions(),
    };
  }
  if (draft && (namedTwoK1WhoAskPending(draft) || namedTwoK1Packet(draft))) {
    return k1WhoLoanAskCopy(draft);
  }
  return {
    text: OTHER_K1_LOAN_ASK,
    actions: otherK1LoanAskActions(),
  };
}

export function parseK1WhoChoice(text: string): K1WhoChoice | undefined {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  if (!lower) return undefined;
  if (/^both$/i.test(lower) || /\bboth\b/.test(lower)) return "both";
  if (/^sunita\b/.test(lower) || /sunit/.test(lower)) return "primary";
  if (/^pritika\b/.test(lower) || /pritika/.test(lower)) return "other";
  return undefined;
}

export function k1WhoConfirmCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} | null {
  const who = draft.k1WhoChoice;
  const shares = twoK1SharesOnFile(draft);
  if (!who || !shares) return null;
  const picked = who === "other" ? shares.other : shares.primary;
  const lines =
    who === "both"
      ? [
          `${shares.primary.name} ${shares.primary.pct}% · ${signedMonth(shares.primary.monthly)} a month`,
          `${shares.other.name} ${shares.other.pct}% · ${signedMonth(shares.other.monthly)} a month`,
        ]
      : [`${picked.name} ${picked.pct}% · ${signedMonth(picked.monthly)} a month`];
  return {
    text: [...lines, NAMED_LOSS_CASH_FLOW_NOTE, "Suggested · not underwritten"].join(". ") + ". Use this?",
    actions: [
      { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
      { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
    ],
  };
}

export function writeOtherK1Loan(draft: FoxIntakeDraft, onLoan: boolean): FoxIntakeDraft {
  if (onLoan) return proposeOtherK1Box1(draft);
  return {
    ...draft,
    otherK1LoanAsked: true,
    otherK1LoanAnswer: "no",
    otherK1OnLoan: false,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
  };
}

export function skipOtherK1Loan(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    otherK1LoanAsked: true,
    otherK1LoanAnswer: "skip",
    k1WhoChoice: undefined,
    pendingProposal: null,
    correcting: null,
    correctingLine: null,
  };
}

export function otherK1Box1ConfirmCopy(monthly: number): {
  text: string;
  actions?: FoxAction[];
} {
  const shown = `${monthly < 0 ? "−" : ""}$${Math.round(Math.abs(monthly)).toLocaleString("en-US")}`;
  return {
    text: `K-1 Box 1 is ${shown}. ${
      monthly < 0 ? "Named loss · Suggested · not underwritten" : "Suggested qualifying income · not underwritten"
    }. Use this?`,
    actions: [
      { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
      { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
    ],
  };
}
