import { formatDollars } from "@/components/products/scenario";
import { safeAccountLast4, type BankAssetAccount } from "@/lib/docs/bankLast4";
import { citizenshipSettled } from "./citizenship";
import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const STATED_AVAILABLE_ASSETS_FIELD = "statedAvailableAssets";
export const SUGGESTED_ASSETS_NOTE = "Suggested · not underwritten";
export const AVAILABLE_ASSETS_ASK =
  "About how much cash or available funds do you have for this purchase? A number is enough. Skip is fine.";
export const SUGGESTED_ASSETS_EXTRACT_NOTE = "Suggested · not underwritten as available assets";
export const BANK_STATEMENT_ASK =
  "I need two recent bank statements to show funds for the down payment. Drop them here, or Skip.";

function money(value: number) {
  return `$${formatDollars(value)}`;
}

export function statementExtractConfirmed(draft: FoxIntakeDraft) {
  return Boolean(draft.facts?.institution?.confirmed || draft.facts?.ending_balance?.confirmed);
}

export function assetsSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "assets") return false;
  return Boolean(draft.bankStatementAsked || statementExtractConfirmed(draft));
}

export function assetsNeeded(draft: FoxIntakeDraft) {
  if (assetsSettled(draft)) return false;
  if (!citizenshipSettled(draft)) return false;
  if (draft.sampleAccepted) return false;
  if (draft.motion === "in_queue" || draft.motion === "escalated") return false;
  return true;
}

/** Late walk after citizenship: extract-first bank statement line, not the cash form. */
export function isLateWalkBankStatementAsk(draft: FoxIntakeDraft) {
  return !draft.sampleAccepted && citizenshipSettled(draft) && draft.correcting !== "assets";
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
    bankStatementAsked: isLateWalkBankStatementAsk(draft) ? true : draft.bankStatementAsked,
    looksRightHold: isLateWalkBankStatementAsk(draft) ? false : draft.looksRightHold,
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
    bankStatementAsked: isLateWalkBankStatementAsk(draft) ? true : draft.bankStatementAsked,
    looksRightHold: isLateWalkBankStatementAsk(draft) ? false : draft.looksRightHold,
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
      value: String(amount),
      label: "Stated available assets",
      kind: "computed",
      note: SUGGESTED_ASSETS_NOTE,
      extras,
    },
  };
}

export function availableAssetsConfirmCopy(amount: number) {
  return `That’s ${money(amount)} in available funds. ${SUGGESTED_ASSETS_NOTE}. Use this?`;
}

/** Speak / File institution. All-caps page text becomes title case. Never last4. */
export function displayInstitution(name?: string | null) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "";
  if (/\b(?:4412|4419|2281)\b|\*{2,}|x{4,}/i.test(trimmed)) return "";
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

export function proposalBankLast4(proposal?: FactProposal | null) {
  if (!proposal) return "";
  return safeAccountLast4(String(proposal.extras?.find((item) => item.field === "account_last4")?.value ?? ""));
}

export function availableAssetsExtractCopy(amount: number, institution?: string, last4?: string) {
  const who = displayInstitution(institution);
  const shownLast4 = safeAccountLast4(String(last4 ?? "").split(/[·,;]/)[0]?.trim() ?? "");
  const bits = [who, shownLast4, money(amount)].filter(Boolean);
  const shown = bits.length
    ? `The statement shows ${bits.join(" · ")}.`
    : `The statement shows about ${money(amount)}.`;
  return `${shown} ${SUGGESTED_ASSETS_NOTE}. Use this?`;
}

function accountKey(row: BankAssetAccount) {
  return `${(row.institution || "").trim().toLowerCase()}|${(row.last4 || "").trim()}`;
}

function definedAccount(row: BankAssetAccount): BankAssetAccount {
  return {
    ...(row.institution?.trim() ? { institution: row.institution.trim() } : {}),
    ...(row.last4?.trim() ? { last4: row.last4.trim() } : {}),
    ...(row.balance?.trim() ? { balance: row.balance.trim() } : {}),
    ...(row.type?.trim() ? { type: row.type.trim() } : {}),
  };
}

/** Same bank + different last4 is a second row. Blank last4 updates the institution row. */
export function writeAssetAccount(draft: FoxIntakeDraft, incoming: BankAssetAccount): FoxIntakeDraft {
  const nextRow = definedAccount({
    ...incoming,
    last4: incoming.last4 ? safeAccountLast4(incoming.last4) : incoming.last4,
    institution: incoming.institution ? displayInstitution(incoming.institution) || incoming.institution.trim() : incoming.institution,
  });
  if (!nextRow.institution && !nextRow.last4 && !nextRow.balance && !nextRow.type) return draft;
  const list = [...(draft.assetAccounts ?? [])];
  const incomingKey = accountKey(nextRow);
  let idx = list.findIndex((row) => accountKey(row) === incomingKey);
  if (idx < 0 && nextRow.last4) {
    const inst = (nextRow.institution || "").trim().toLowerCase();
    idx = list.findIndex((row) => {
      if (row.last4) return false;
      const rowInst = (row.institution || "").trim().toLowerCase();
      if (inst) return rowInst === inst;
      return list.length === 1;
    });
  }
  if (idx < 0 && !nextRow.last4) {
    const inst = (nextRow.institution || "").trim().toLowerCase();
    if (inst) {
      idx = list.findIndex((row) => !(row.last4) && (row.institution || "").trim().toLowerCase() === inst);
      if (idx < 0) idx = list.findIndex((row) => (row.institution || "").trim().toLowerCase() === inst);
    } else if (list.length === 1) {
      idx = 0;
    }
  }
  if (idx >= 0) {
    list[idx] = definedAccount({ ...list[idx], ...nextRow });
  } else {
    list.push(nextRow);
  }
  return { ...draft, assetAccounts: list };
}

export function availableAssetsConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
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

export function bankStatementAskActions(): FoxAction[] {
  return [
    {
      id: "skip-available-assets",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-available-assets" },
    },
  ];
}

export function bankStatementAskCopy(): { text: string; actions?: FoxAction[] } {
  return {
    text: BANK_STATEMENT_ASK,
    actions: bankStatementAskActions(),
  };
}

export function availableAssetsAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
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
