import { formatDollars } from "@/components/products/scenario";
import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const STATED_AVAILABLE_ASSETS_FIELD = "statedAvailableAssets";
export const SUGGESTED_ASSETS_NOTE = "Suggested · not underwritten";
export const AVAILABLE_ASSETS_ASK =
  "About how much cash or available funds do you have for this purchase? A number is enough. Skip is fine.";
export const SUGGESTED_ASSETS_EXTRACT_NOTE = "Suggested · not underwritten as available assets";

function money(value: number) {
  return `$${formatDollars(value)}`;
}

export function assetsSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "assets") return false;
  return Boolean(draft.availableAssetsAsked || draft.statedAvailableAssets != null);
}

export function isStatedAssetsConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_AVAILABLE_ASSETS_FIELD;
}

/** Composer amounts: 50000, $50,000, 50k, about 50k. */
export function parseAvailableAssetsAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(m|mm|million|k|thousand)?/i,
  );
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const suffix = (match[2] ?? "").toLowerCase();
  let dollars = n;
  if (suffix === "m" || suffix === "mm" || suffix === "million") dollars = n * 1_000_000;
  else if (suffix === "k" || suffix === "thousand") dollars = n * 1_000;
  if (dollars > 100_000_000) return null;
  return Math.round(dollars);
}

export function isSkipAvailableAssetsText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|none|no|no funds|no cash|zero|0|n\/a|na)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipAvailableAssets(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[STATED_AVAILABLE_ASSETS_FIELD];
  return {
    ...draft,
    statedAvailableAssets: undefined,
    availableAssetsAsked: true,
    pendingProposal:
      draft.pendingProposal?.field === STATED_AVAILABLE_ASSETS_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedAvailableAssets(draft: FoxIntakeDraft, amount: number): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = String(Math.round(amount));
  return {
    ...draft,
    statedAvailableAssets: Math.round(amount),
    availableAssetsAsked: true,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [STATED_AVAILABLE_ASSETS_FIELD]: {
        field: STATED_AVAILABLE_ASSETS_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeStatedAvailableAssets(draft: FoxIntakeDraft, amount: number): FoxIntakeDraft {
  const value = String(Math.round(amount));
  const proposal: FactProposal = {
    field: STATED_AVAILABLE_ASSETS_FIELD,
    value,
    label: "Stated available assets",
    kind: "computed",
    note: SUGGESTED_ASSETS_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function proposeExtractedAvailableAssets(
  draft: FoxIntakeDraft,
  amount: number,
  extras: { field: string; value: string; label: string }[],
): FoxIntakeDraft {
  return {
    ...draft,
    pendingProposal: {
      field: STATED_AVAILABLE_ASSETS_FIELD,
      value: String(Math.round(amount)),
      label: "Stated available assets",
      kind: "computed",
      note: SUGGESTED_ASSETS_EXTRACT_NOTE,
      extras,
    },
  };
}

export function availableAssetsConfirmCopy(amount: number) {
  return `That’s ${money(amount)} in available funds. ${SUGGESTED_ASSETS_NOTE}. Use this?`;
}

export function availableAssetsExtractCopy(amount: number) {
  return `The statement shows about ${money(amount)}. ${SUGGESTED_ASSETS_EXTRACT_NOTE}. Use this?`;
}

export function availableAssetsConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "decline-proposal", label: "Leave blank", event: "bubble", capture: { field: "decline-proposal" } },
  ];
}

export function availableAssetsSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-available-assets",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-available-assets" },
    },
    {
      id: "hold-available-assets",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-available-assets" },
    },
  ];
}

export function availableAssetsAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  const prior = draft.statedAvailableAssets;
  if (prior != null && prior > 0 && draft.correcting === "assets") {
    return {
      text: `Stated available assets in the file is ${money(prior)}. Still right?`,
      actions: [
        { id: "keep-line", label: "Keep this", event: "bubble", capture: { field: "keep-line" } },
        ...availableAssetsSkipActions(),
      ],
    };
  }
  return {
    text: AVAILABLE_ASSETS_ASK,
    actions: availableAssetsSkipActions(),
  };
}

export function availableAssetsConflictActions(): FoxAction[] {
  return [
    {
      id: "keep-file-fact",
      label: "Keep the typed number",
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
