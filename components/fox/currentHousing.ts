import { formatDollars } from "@/components/products/scenario";
import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const STATED_CURRENT_HOUSING_FIELD = "statedCurrentHousing";
export const CURRENT_PI_FIELD = "current_pi";
export const SUGGESTED_HOUSING_NOTE = "Suggested · not underwritten";
export const CURRENT_HOUSING_ASK =
  "About how much do you pay now for housing? Rent or the current mortgage is enough. Skip is fine.";

function money(value: number) {
  return `$${formatDollars(value)}`;
}

/** Purchase only. Refi / LCOR / HELOC do not get the rent ask. */
export function wantsCurrentHousingAsk(draft: FoxIntakeDraft) {
  if (draft.productIntent === "buy") return true;
  if (draft.productIntent === "jumbo" && draft.jumboPurpose !== "refinance") return true;
  return false;
}

export function currentHousingSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "current-housing") return false;
  if (!wantsCurrentHousingAsk(draft)) return true;
  return Boolean(draft.currentHousingAsked || draft.statedCurrentHousing != null);
}

export function isCurrentHousingConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_CURRENT_HOUSING_FIELD;
}

/** Composer: 2200, $2,200, about 2200. */
export function parseCurrentHousingAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/\d\s*(k|m|mm|million|thousand)\b/i.test(trimmed)) return null;
  const match = trimmed.match(/\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 100_000) return null;
  return Math.round(n);
}

export function isSkipCurrentHousingText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|none|no|n\/a|na)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipCurrentHousing(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[STATED_CURRENT_HOUSING_FIELD];
  return {
    ...draft,
    statedCurrentHousing: undefined,
    currentHousingAsked: true,
    pendingCurrentHousing: null,
    pendingProposal:
      draft.pendingProposal?.field === STATED_CURRENT_HOUSING_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedCurrentHousing(draft: FoxIntakeDraft, amount: number): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = String(Math.round(amount));
  return {
    ...draft,
    statedCurrentHousing: Math.round(amount),
    currentHousingAsked: true,
    pendingCurrentHousing: null,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [STATED_CURRENT_HOUSING_FIELD]: {
        field: STATED_CURRENT_HOUSING_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeStatedCurrentHousing(draft: FoxIntakeDraft, amount: number): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: STATED_CURRENT_HOUSING_FIELD,
    value: String(Math.round(amount)),
    label: "Current housing",
    kind: "computed",
    note: SUGGESTED_HOUSING_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function proposeExtractedCurrentHousing(
  draft: FoxIntakeDraft,
  amount: number,
  extras: { field: string; value: string; label: string }[] = [],
): FoxIntakeDraft {
  return {
    ...draft,
    pendingCurrentHousing: null,
    pendingProposal: {
      field: STATED_CURRENT_HOUSING_FIELD,
      value: String(Math.round(amount)),
      label: "Current housing",
      kind: "computed",
      note: SUGGESTED_HOUSING_NOTE,
      extras,
    },
  };
}

export function currentHousingConfirmCopy(amount: number) {
  return `That’s ${money(amount)} a month for housing now. ${SUGGESTED_HOUSING_NOTE}. Use this?`;
}

export function currentHousingExtractCopy(amount: number) {
  return `The statement shows a current payment of about ${money(amount)}. ${SUGGESTED_HOUSING_NOTE}. Use this?`;
}

export function currentHousingConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
}

export function currentHousingSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-current-housing",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-current-housing" },
    },
    {
      id: "hold-current-housing",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-current-housing" },
    },
  ];
}

export function currentHousingAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  return {
    text: CURRENT_HOUSING_ASK,
    actions: currentHousingSkipActions(),
  };
}

export function currentHousingConflictActions(): FoxAction[] {
  return [
    {
      id: "keep-file-fact",
      label: "Keep the typed one",
      event: "bubble",
      capture: { field: "keep-file-fact" },
    },
    {
      id: "use-document-fact",
      label: "Use document",
      event: "bubble",
      capture: { field: "use-document-fact" },
    },
  ];
}
