import { formatDollars } from "@/components/products/scenario";
import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const STATED_MONTHLY_DEBTS_FIELD = "statedMonthlyDebts";
export const SUGGESTED_DEBTS_NOTE = "Suggested · not underwritten";
export const MONTHLY_DEBTS_ASK =
  "About how much are other monthly debts, not counting this mortgage? A number is enough. Skip is fine.";

export type PendingDebtMortgage = {
  included: number;
  mortgage: number;
};

function money(value: number) {
  return `$${formatDollars(value)}`;
}

function factMoney(draft: FoxIntakeDraft, field: string): number | null {
  const raw = draft.facts?.[field]?.value;
  if (!raw) return null;
  const n = Number(String(raw).replace(/[$,]/g, "").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function debtsSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "debts") return false;
  return Boolean(draft.monthlyDebtsAsked || draft.statedMonthlyDebts != null);
}

export function isStatedDebtsConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_MONTHLY_DEBTS_FIELD;
}

/** Composer amounts for the one stated-debt ask: 800, $800, about 800, 800 a month. */
export function parseMonthlyDebtAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/\d\s*(k|m|mm|million|thousand)\b/i.test(trimmed)) return null;
  const match = trimmed.match(/\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 100_000) return null;
  return Math.round(n);
}

export function isSkipMonthlyDebtsText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|none|no|no debts|no other debts|zero|0|n\/a|na)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function mentionsSubjectMortgage(text: string) {
  return (
    /\b(includ(?:e|es|ed|ing)|with|plus|and)\b[\s\S]{0,48}\b(?:this\s+|the\s+|my\s+|our\s+)?(?:mortgage|piti|housing(?:\s+payment)?|house\s+payment|home\s+payment)\b/i.test(
      text,
    ) ||
    /\b(?:mortgage|piti|housing(?:\s+payment)?)\b[\s\S]{0,32}\b(?:includ|in that|in the total|in there)\b/i.test(
      text,
    )
  );
}

export function subjectMortgagePayment(draft: FoxIntakeDraft): number | null {
  return factMoney(draft, "current_pi") ?? factMoney(draft, "current_principal_interest");
}

export function skipMonthlyDebts(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[STATED_MONTHLY_DEBTS_FIELD];
  return {
    ...draft,
    statedMonthlyDebts: undefined,
    monthlyDebtsAsked: true,
    pendingDebtMortgage: null,
    pendingProposal:
      draft.pendingProposal?.field === STATED_MONTHLY_DEBTS_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedMonthlyDebts(draft: FoxIntakeDraft, amount: number): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = String(Math.round(amount));
  return {
    ...draft,
    statedMonthlyDebts: Math.round(amount),
    monthlyDebtsAsked: true,
    pendingDebtMortgage: null,
    pendingProposal: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [STATED_MONTHLY_DEBTS_FIELD]: {
        field: STATED_MONTHLY_DEBTS_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeStatedMonthlyDebts(draft: FoxIntakeDraft, amount: number): FoxIntakeDraft {
  const value = String(Math.round(amount));
  const proposal: FactProposal = {
    field: STATED_MONTHLY_DEBTS_FIELD,
    value,
    label: "Stated monthly debts",
    kind: "computed",
    note: SUGGESTED_DEBTS_NOTE,
  };
  return {
    ...draft,
    pendingDebtMortgage: null,
    pendingProposal: proposal,
  };
}

export function monthlyDebtsConfirmCopy(amount: number) {
  return `That’s ${money(amount)} a month in other debts, not counting this mortgage. ${SUGGESTED_DEBTS_NOTE}. Use this?`;
}

export function monthlyDebtsConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
}

export function monthlyDebtsSkipActions(): FoxAction[] {
  return [
    { id: "skip-monthly-debts", label: "Skip", event: "bubble", capture: { field: "skip-monthly-debts" } },
    { id: "hold-monthly-debts", label: "Not yet", event: "bubble", capture: { field: "skip-monthly-debts" } },
  ];
}

export function mortgageSubtractAsk(included: number, mortgage: number) {
  const other = Math.max(0, included - mortgage);
  if (other <= 0) {
    return `That sounds like it includes this mortgage. Subtract the ${money(mortgage)} payment and leave other debts blank?`;
  }
  return `That sounds like it includes this mortgage. Subtract the ${money(mortgage)} payment and use ${money(other)} for other debts?`;
}

export function mortgageSubtractActions(): FoxAction[] {
  return [
    { id: "subtract-mortgage", label: "Subtract", event: "bubble", capture: { field: "subtract-mortgage" } },
    { id: "skip-monthly-debts", label: "Skip", event: "bubble", capture: { field: "skip-monthly-debts" } },
  ];
}

export function mortgageIncludedAskWithoutPayment() {
  return "That sounds like it includes this mortgage. I need other monthly debts without this mortgage. A number works — or Skip.";
}

export function applyMortgageSubtract(draft: FoxIntakeDraft): FoxIntakeDraft {
  const pending = draft.pendingDebtMortgage;
  if (!pending) return skipMonthlyDebts(draft);
  const other = Math.round(pending.included - pending.mortgage);
  if (other <= 0) return skipMonthlyDebts(draft);
  return writeStatedMonthlyDebts({ ...draft, debtMortgageAsked: true, pendingDebtMortgage: null }, other);
}

export function monthlyDebtsAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  if (draft.pendingDebtMortgage) {
    return {
      text: mortgageSubtractAsk(draft.pendingDebtMortgage.included, draft.pendingDebtMortgage.mortgage),
      actions: mortgageSubtractActions(),
    };
  }
  if (draft.debtMortgageAsked && draft.statedMonthlyDebts == null && !draft.pendingProposal) {
    return {
      text: mortgageIncludedAskWithoutPayment(),
      actions: monthlyDebtsSkipActions(),
    };
  }
  return {
    text: MONTHLY_DEBTS_ASK,
    actions: monthlyDebtsSkipActions(),
  };
}
