import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const PROPERTY_TYPE_FIELD = "propertyType";
export const SUBJECT_ADDRESS_FIELD = "subjectAddress";
export const PROPERTY_ADDRESS_FACT = "property_address";
export const SUGGESTED_PROPERTY_NOTE = "Suggested · not underwritten";
export const PROPERTY_TYPE_ASK =
  "What kind of home is this? House, condo, or 2–4 unit is enough. Skip is fine.";

export type PropertyTypeValue = "sfr" | "condo" | "two_to_four";

export function isPropertyTypeValue(value: string): value is PropertyTypeValue {
  return value === "sfr" || value === "condo" || value === "two_to_four";
}

export function propertyTypeLabel(value: PropertyTypeValue) {
  if (value === "condo") return "Condo";
  if (value === "two_to_four") return "2–4 unit";
  return "House";
}

export function propertyTypeSpoken(value: PropertyTypeValue) {
  if (value === "condo") return "a condo";
  if (value === "two_to_four") return "a 2–4 unit";
  return "a single-family house";
}

export function propertyTypeSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "property-type") return false;
  return Boolean(draft.propertyTypeAsked || draft.propertyType);
}

export function isPropertyTypeConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === PROPERTY_TYPE_FIELD;
}

export function isSubjectAddressConfirmPending(draft: FoxIntakeDraft) {
  return (
    draft.pendingProposal?.field === PROPERTY_ADDRESS_FACT ||
    draft.pendingProposal?.field === SUBJECT_ADDRESS_FIELD
  );
}

export function isPropertyAddressField(field: string) {
  return field === PROPERTY_ADDRESS_FACT || field === SUBJECT_ADDRESS_FIELD;
}

/** House / condo / 2–4. Synonyms: single family, sfr, duplex, 2 unit, fourplex. */
export function parsePropertyType(text: string): PropertyTypeValue | null {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  if (!lower) return null;
  if (/\b(condo|condominium)\b/.test(lower)) return "condo";
  if (
    /\b(2\s*[-–to]{1,3}\s*4|two\s*[-–to]{1,3}\s*four|duplex|triplex|fourplex|2\s*-?\s*unit|3\s*-?\s*unit|4\s*-?\s*unit|two\s+unit|three\s+unit|four\s+unit)\b/.test(
      lower,
    )
  ) {
    return "two_to_four";
  }
  if (/\b(house|home|sfr|sfh|single[-\s]?family)\b/.test(lower)) return "sfr";
  return null;
}

export function isSkipPropertyTypeText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|none|no|n\/a|na)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

/** Volunteer only: "the address is 1840 Valencia". Never invent ZIP or county. */
export function parseVolunteeredAddress(text: string): string | null {
  const trimmed = text.trim().replace(/[?.!]+$/g, "");
  if (!trimmed) return null;
  const labeled = trimmed.match(
    /^(?:the\s+)?(?:property\s+)?address(?:\s+is|\s*[:=])\s+(.+)$/i,
  );
  const at = trimmed.match(/^(?:it(?:'s| is)|we(?:'re| are)|i(?:'m| am))?\s*(?:at|on)\s+(\d+\s+.+)$/i);
  const raw = (labeled?.[1] ?? at?.[1] ?? "").trim();
  const street = raw || (/^\d{1,6}\s+[A-Za-z]/.test(trimmed) ? trimmed : "");
  if (!street) return null;
  if (parsePropertyType(street)) return null;
  const cleaned = street.replace(/\s+/g, " ").replace(/[.,;]+$/g, "").trim();
  if (cleaned.length < 5 || cleaned.length > 80) return null;
  if (!/\d/.test(cleaned) || !/[A-Za-z]/.test(cleaned)) return null;
  return cleaned;
}

export function skipPropertyType(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[PROPERTY_TYPE_FIELD];
  return {
    ...draft,
    propertyType: undefined,
    propertyTypeAsked: true,
    pendingProposal:
      draft.pendingProposal?.field === PROPERTY_TYPE_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writePropertyType(draft: FoxIntakeDraft, value: PropertyTypeValue): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    propertyType: value,
    propertyTypeAsked: true,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [PROPERTY_TYPE_FIELD]: {
        field: PROPERTY_TYPE_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function writeSubjectAddress(draft: FoxIntakeDraft, address: string): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = address.trim();
  return {
    ...draft,
    subjectAddress: value,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [PROPERTY_ADDRESS_FACT]: {
        field: PROPERTY_ADDRESS_FACT,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposePropertyType(draft: FoxIntakeDraft, value: PropertyTypeValue): FoxIntakeDraft {
  return {
    ...draft,
    pendingProposal: {
      field: PROPERTY_TYPE_FIELD,
      value,
      label: "Property type",
      kind: "computed",
      note: SUGGESTED_PROPERTY_NOTE,
    },
  };
}

export function proposeSubjectAddress(draft: FoxIntakeDraft, address: string): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: PROPERTY_ADDRESS_FACT,
    value: address.trim(),
    label: "Property",
    kind: "computed",
    note: SUGGESTED_PROPERTY_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function propertyTypeConfirmCopy(value: PropertyTypeValue) {
  return `That’s ${propertyTypeSpoken(value)}. ${SUGGESTED_PROPERTY_NOTE}. Use this?`;
}

export function contractAddressConfirmCopy(address: string) {
  return `The contract shows ${address}. ${SUGGESTED_PROPERTY_NOTE}. Use this?`;
}

export function typedAddressConfirmCopy(address: string) {
  return `That’s ${address}. ${SUGGESTED_PROPERTY_NOTE}. Use this?`;
}

export function propertyTypeConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "decline-proposal", label: "Leave blank", event: "bubble", capture: { field: "decline-proposal" } },
  ];
}

export function propertyTypeSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-property-type",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-property-type" },
    },
    {
      id: "hold-property-type",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-property-type" },
    },
  ];
}

export function propertyTypeAskActions(): FoxAction[] {
  return [
    {
      id: "property-sfr",
      label: "House",
      event: "bubble",
      capture: { field: "propose-property-type", value: "sfr" },
    },
    {
      id: "property-condo",
      label: "Condo",
      event: "bubble",
      capture: { field: "propose-property-type", value: "condo" },
    },
    {
      id: "property-two-to-four",
      label: "2–4",
      event: "bubble",
      capture: { field: "propose-property-type", value: "two_to_four" },
    },
    ...propertyTypeSkipActions(),
  ];
}

export function propertyTypeAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  const prior = draft.propertyType;
  if (prior && draft.correcting === "property-type") {
    return {
      text: `Property type in the file is ${propertyTypeLabel(prior)}. Still right?`,
      actions: [
        { id: "keep-line", label: "Keep this", event: "bubble", capture: { field: "keep-line" } },
        ...propertyTypeAskActions(),
      ],
    };
  }
  return {
    text: PROPERTY_TYPE_ASK,
    actions: propertyTypeAskActions(),
  };
}

export function propertyAddressConflictActions(): FoxAction[] {
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
