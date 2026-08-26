import type { FactProposal, FoxAction, FoxIntakeDraft, OtherReoRow } from "./types";
import {
  FILE_NET_ROLE_FIELD,
  SUGGESTED_FILE_NET_FIELD,
  SUGGESTED_FILE_NET_NOTE,
  fileNetConfirmCopy,
  netOtherPropertyFile,
  rentalNetRoleOf,
} from "@/lib/income/rental";

export {
  FILE_NET_ROLE_FIELD,
  SUGGESTED_FILE_NET_FIELD,
  SUGGESTED_FILE_NET_NOTE,
  fileNetConfirmCopy,
};

export const STATED_OTHER_REO_FIELD = "statedOtherReo";
export const SUGGESTED_OTHER_REO_NOTE = "Suggested · not underwritten";
export const OTHER_REO_ASK = "Do you own any other real estate besides this one? Skip is fine.";

export type StatedOtherReo = "none" | "yes";

export function isStatedOtherReo(value: string): value is StatedOtherReo {
  return value === "none" || value === "yes";
}

export function otherReoLabel(value: StatedOtherReo) {
  return value === "yes" ? "Yes" : "None";
}

export function otherReoSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "other-reo") return false;
  return Boolean(draft.otherReoAsked || draft.statedOtherReo);
}

export function isOtherReoConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_OTHER_REO_FIELD;
}

/** no / just this / I have a rental. No address, value, rent, or HOA. */
export function parseOtherReo(
  text: string,
  opts?: { allowBare?: boolean },
): StatedOtherReo | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase().replace(/[?.!]+$/g, "");
  if (
    /^(just this|only this|just this one|only this one)$/i.test(lower) ||
    /\bjust this\b/.test(lower) ||
    /\bonly this (one|house|home|property)\b/.test(lower) ||
    /\bno other (real estate|propert(?:y|ies)|home|house)\b/.test(lower)
  ) {
    return "none";
  }
  if (opts?.allowBare && /^(no|none|nope|n\/a|na|neither|nothing)$/i.test(lower)) {
    return "none";
  }
  if (
    /i have a rental/.test(lower) ||
    /\b(rental|investment property|another (home|house|property)|other (real estate|propert(?:y|ies))|second (home|house|property))\b/.test(
      lower,
    )
  ) {
    return "yes";
  }
  if (opts?.allowBare && /^(yes|yeah|yep|y)$/i.test(lower)) return "yes";
  return undefined;
}

export function isSkipOtherReoText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipOtherReo(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[STATED_OTHER_REO_FIELD];
  delete facts[SUGGESTED_FILE_NET_FIELD];
  delete facts[FILE_NET_ROLE_FIELD];
  return {
    ...draft,
    statedOtherReo: undefined,
    otherReoAsked: true,
    suggestedFileNet: undefined,
    fileNetRole: undefined,
    fileNetAsked: undefined,
    skippedFileNet: undefined,
    pendingOtherReo: null,
    pendingProposal:
      draft.pendingProposal?.field === STATED_OTHER_REO_FIELD || isFileNetConfirmPending(draft)
        ? null
        : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedOtherReo(draft: FoxIntakeDraft, value: StatedOtherReo): FoxIntakeDraft {
  const now = new Date().toISOString();
  const facts = { ...(draft.facts ?? {}) };
  facts[STATED_OTHER_REO_FIELD] = {
    field: STATED_OTHER_REO_FIELD,
    value,
    source: "suggested",
    confirmed: true,
    confirmedAt: now,
  };
  if (value === "none") {
    delete facts[SUGGESTED_FILE_NET_FIELD];
    delete facts[FILE_NET_ROLE_FIELD];
  }
  return {
    ...draft,
    statedOtherReo: value,
    otherReoAsked: true,
    otherProperties: value === "none" ? [] : draft.otherProperties,
    suggestedFileNet: value === "none" ? undefined : draft.suggestedFileNet,
    fileNetRole: value === "none" ? undefined : draft.fileNetRole,
    fileNetAsked: value === "none" ? undefined : draft.fileNetAsked,
    skippedFileNet: value === "none" ? undefined : draft.skippedFileNet,
    pendingOtherReo: null,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function proposeStatedOtherReo(draft: FoxIntakeDraft, value: StatedOtherReo): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: STATED_OTHER_REO_FIELD,
    value,
    label: "Other real estate",
    kind: "computed",
    note: SUGGESTED_OTHER_REO_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function proposeExtractedOtherReo(draft: FoxIntakeDraft): FoxIntakeDraft {
  return proposeStatedOtherReo(draft, "yes");
}

function normalizeAddr(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isSubjectAddress(draft: FoxIntakeDraft, address?: string) {
  const incoming = normalizeAddr(address);
  if (!incoming) return false;
  const subject = normalizeAddr(draft.subjectAddress || draft.facts?.property_address?.value);
  return Boolean(subject && incoming === subject);
}

/** Other-property mortgage after Other REO Yes. Subject statements never count. */
export function isOtherPropertyMortgageExtract(
  draft: FoxIntakeDraft,
  row: { address?: string },
) {
  if (draft.statedOtherReo !== "yes") return false;
  if (isSubjectAddress(draft, row.address)) return false;
  return true;
}

export const OTHER_REO_PAYMENT_FIELD = "otherReoPayment";
export const SUGGESTED_OTHER_PROPERTY_PAYMENT_NOTE = "Suggested · not underwritten";

export function otherPropertyPaymentConfirmCopy(amount: number) {
  const money = `$${Math.round(amount).toLocaleString("en-US")}`;
  return `That’s ${money} a month on the other property. ${SUGGESTED_OTHER_PROPERTY_PAYMENT_NOTE}. Use this?`;
}

export function proposeExtractedOtherPropertyPayment(
  draft: FoxIntakeDraft,
  amount: number,
): FoxIntakeDraft {
  return {
    ...draft,
    pendingProposal: {
      field: OTHER_REO_PAYMENT_FIELD,
      value: String(Math.round(amount)),
      label: "Other property payment",
      kind: "computed",
      note: SUGGESTED_OTHER_PROPERTY_PAYMENT_NOTE,
    },
  };
}

export function otherReoRows(draft: FoxIntakeDraft): OtherReoRow[] {
  if (draft.statedOtherReo !== "yes") return [];
  return (draft.otherProperties ?? []).filter((row) => !isSubjectAddress(draft, row.address));
}

function parseRowMoney(value?: string | null): number | null {
  if (!value) return null;
  const cleaned = String(value)
    .replace(/[$,]/g, "")
    .replace(/\s/g, "")
    .replace(/[–—−]/g, "-");
  if (!cleaned || /[a-z]/i.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function otherReoRowRent(row: OtherReoRow): number | null {
  return parseRowMoney(row.leaseGross);
}

export function otherReoRowPiti(row: OtherReoRow): number | null {
  return parseRowMoney(row.pitia) ?? parseRowMoney(row.payment);
}

export function draftOtherPropertyFileNet(draft: FoxIntakeDraft) {
  if (draft.statedOtherReo !== "yes") {
    return netOtherPropertyFile([]);
  }
  return netOtherPropertyFile(
    otherReoRows(draft).map((row) => ({
      id: row.id,
      rent: otherReoRowRent(row),
      piti: otherReoRowPiti(row),
    })),
  );
}

export function isFileNetField(field?: string | null) {
  return field === SUGGESTED_FILE_NET_FIELD;
}

export function isFileNetConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === SUGGESTED_FILE_NET_FIELD;
}

function mergeOtherReoRow(base: OtherReoRow, incoming: Omit<OtherReoRow, "id"> & { id?: string }): OtherReoRow {
  return {
    ...base,
    occupancy: incoming.occupancy?.trim() || base.occupancy,
    address: incoming.address?.trim() || base.address,
    unpaidPrincipal: incoming.unpaidPrincipal?.trim() || base.unpaidPrincipal,
    payment: incoming.payment?.trim() || base.payment,
    pitia: incoming.pitia?.trim() || base.pitia,
    leaseGross: incoming.leaseGross?.trim() || base.leaseGross,
  };
}

function findOtherReoMatch(
  existing: OtherReoRow[],
  row: Omit<OtherReoRow, "id"> & { id?: string },
): OtherReoRow | undefined {
  const address = normalizeAddr(row.address);
  const unpaid = (row.unpaidPrincipal ?? "").trim();
  return existing.find((item) => {
    const sameAddress = Boolean(address && normalizeAddr(item.address) === address);
    const sameBalance = Boolean(unpaid && (item.unpaidPrincipal ?? "").trim() === unpaid);
    return sameAddress || sameBalance;
  });
}

export function appendOtherReoRow(
  draft: FoxIntakeDraft,
  row: Omit<OtherReoRow, "id"> & { id?: string },
): FoxIntakeDraft {
  if (draft.statedOtherReo === "none") return { ...draft, otherProperties: [] };
  if (draft.statedOtherReo !== "yes") return draft;
  if (isSubjectAddress(draft, row.address)) return draft;
  const existing = draft.otherProperties ?? [];
  const incoming: OtherReoRow = {
    id: row.id || `reo-${existing.length + 1}`,
    occupancy: row.occupancy?.trim() || undefined,
    address: row.address?.trim() || undefined,
    unpaidPrincipal: row.unpaidPrincipal?.trim() || undefined,
    payment: row.payment?.trim() || undefined,
    pitia: row.pitia?.trim() || undefined,
    leaseGross: row.leaseGross?.trim() || undefined,
  };
  if (!incoming.address && !incoming.unpaidPrincipal && !incoming.payment && !incoming.leaseGross) {
    return draft;
  }
  const match = findOtherReoMatch(existing, incoming);
  if (match) {
    return {
      ...draft,
      otherProperties: existing.map((item) => (item.id === match.id ? mergeOtherReoRow(item, incoming) : item)),
    };
  }
  if (!incoming.address && !incoming.unpaidPrincipal && incoming.leaseGross) {
    const rentless = existing.filter((item) => otherReoRowRent(item) == null);
    if (rentless.length === 1) {
      const target = rentless[0];
      return {
        ...draft,
        otherProperties: existing.map((item) => (item.id === target.id ? mergeOtherReoRow(item, incoming) : item)),
      };
    }
  }
  return { ...draft, otherProperties: [...existing, incoming] };
}

export function otherReoFileNetProposal(net: number): FactProposal | null {
  const copy = fileNetConfirmCopy(net);
  if (!copy) return null;
  const role = rentalNetRoleOf(net);
  return {
    field: SUGGESTED_FILE_NET_FIELD,
    value: String(net),
    label: "File net",
    kind: "computed",
    note: SUGGESTED_FILE_NET_NOTE,
    extras: [{ field: FILE_NET_ROLE_FIELD, value: role, label: "File net role" }],
  };
}

function canProposeFileNet(draft: FoxIntakeDraft) {
  if (draft.pendingConflict) return false;
  const field = draft.pendingProposal?.field;
  if (!field) return true;
  return field === SUGGESTED_FILE_NET_FIELD || field === OTHER_REO_PAYMENT_FIELD;
}

export function maybeProposeOtherReoFileNet(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (draft.statedOtherReo !== "yes") {
    if (!draft.suggestedFileNet && !draft.facts?.[SUGGESTED_FILE_NET_FIELD] && !isFileNetConfirmPending(draft)) {
      return draft;
    }
    const facts = { ...(draft.facts ?? {}) };
    delete facts[SUGGESTED_FILE_NET_FIELD];
    delete facts[FILE_NET_ROLE_FIELD];
    return {
      ...draft,
      suggestedFileNet: undefined,
      fileNetRole: undefined,
      fileNetAsked: undefined,
      skippedFileNet: undefined,
      pendingProposal: isFileNetConfirmPending(draft) ? null : draft.pendingProposal,
      facts,
    };
  }
  const result = draftOtherPropertyFileNet(draft);
  if (result.fileNet == null || result.completeCount < 1) return draft;
  if (draft.facts?.[SUGGESTED_FILE_NET_FIELD]?.confirmed && draft.suggestedFileNet === result.fileNet) {
    return draft;
  }
  if (draft.fileNetAsked && draft.skippedFileNet === result.fileNet) return draft;
  if (!canProposeFileNet(draft)) return draft;
  if (isFileNetConfirmPending(draft) && Number(draft.pendingProposal?.value) === result.fileNet) {
    return draft;
  }
  const proposal = otherReoFileNetProposal(result.fileNet);
  if (!proposal) return draft;
  return { ...draft, pendingProposal: proposal, fileNetAsked: undefined };
}

export function skipOtherReoFileNet(draft: FoxIntakeDraft): FoxIntakeDraft {
  const pending = draft.pendingProposal;
  const skipped =
    pending?.field === SUGGESTED_FILE_NET_FIELD ? Number(pending.value) : draftOtherPropertyFileNet(draft).fileNet;
  return {
    ...draft,
    pendingProposal: pending?.field === SUGGESTED_FILE_NET_FIELD ? null : draft.pendingProposal,
    fileNetAsked: true,
    skippedFileNet: Number.isFinite(skipped) ? Math.round(skipped as number) : draft.skippedFileNet,
  };
}

export function otherReoConfirmCopy(value: StatedOtherReo) {
  if (value === "yes") {
    return `I’ll note other real estate. ${SUGGESTED_OTHER_REO_NOTE}. Use this?`;
  }
  return `No other real estate on the file. ${SUGGESTED_OTHER_REO_NOTE}. Use this?`;
}

export function otherReoConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
}

export function otherReoSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-other-reo",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-other-reo" },
    },
    {
      id: "hold-other-reo",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-other-reo" },
    },
  ];
}

export function otherReoAskActions(): FoxAction[] {
  return [
    {
      id: "other-reo-none",
      label: "None",
      event: "bubble",
      capture: { field: "statedOtherReo", value: "none" },
    },
    {
      id: "other-reo-yes",
      label: "Yes",
      event: "bubble",
      capture: { field: "statedOtherReo", value: "yes" },
    },
    ...otherReoSkipActions(),
  ];
}

export function otherReoAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  return {
    text: OTHER_REO_ASK,
    actions: otherReoAskActions(),
  };
}
