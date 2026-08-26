import type { FactProposal, FoxAction, FoxIntakeDraft, OtherReoRow } from "./types";

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
  return {
    ...draft,
    statedOtherReo: undefined,
    otherReoAsked: true,
    pendingOtherReo: null,
    pendingProposal:
      draft.pendingProposal?.field === STATED_OTHER_REO_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedOtherReo(draft: FoxIntakeDraft, value: StatedOtherReo): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    statedOtherReo: value,
    otherReoAsked: true,
    otherProperties: value === "none" ? [] : draft.otherProperties,
    pendingOtherReo: null,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [STATED_OTHER_REO_FIELD]: {
        field: STATED_OTHER_REO_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
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

export function appendOtherReoRow(
  draft: FoxIntakeDraft,
  row: Omit<OtherReoRow, "id"> & { id?: string },
): FoxIntakeDraft {
  if (draft.statedOtherReo === "none") return { ...draft, otherProperties: [] };
  if (draft.statedOtherReo !== "yes") return draft;
  if (isSubjectAddress(draft, row.address)) return draft;
  const existing = draft.otherProperties ?? [];
  const address = normalizeAddr(row.address);
  const unpaid = (row.unpaidPrincipal ?? "").trim();
  const dup = existing.some((item) => {
    const sameAddress = address && normalizeAddr(item.address) === address;
    const sameBalance = unpaid && (item.unpaidPrincipal ?? "").trim() === unpaid;
    return Boolean(sameAddress || sameBalance);
  });
  if (dup) return draft;
  const next: OtherReoRow = {
    id: row.id || `reo-${existing.length + 1}`,
    occupancy: row.occupancy,
    address: row.address?.trim() || undefined,
    unpaidPrincipal: row.unpaidPrincipal?.trim() || undefined,
    payment: row.payment?.trim() || undefined,
    pitia: row.pitia?.trim() || undefined,
    leaseGross: row.leaseGross?.trim() || undefined,
  };
  if (!next.address && !next.unpaidPrincipal && !next.payment) return draft;
  return { ...draft, otherProperties: [...existing, next] };
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
