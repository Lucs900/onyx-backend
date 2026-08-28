import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const PROPERTY_TYPE_FIELD = "propertyType";
export const SUBJECT_ADDRESS_FIELD = "subjectAddress";
export const PROPERTY_ADDRESS_FACT = "property_address";
export const SUGGESTED_PROPERTY_NOTE = "Suggested · not underwritten";
export const PROPERTY_TYPE_ASK =
  "What kind of home is this? House, condo, or 2–4 unit is enough. Skip is fine.";
export const PROPERTY_ADDRESS_ASK = "What is the property address?";
export const PURCHASE_ADDRESS_ASK = "What is the address of the home you are buying?";

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

/** House / condo / 2–4 chosen. Skip and a missing type are not chosen. */
export function propertyTypeChosen(draft: FoxIntakeDraft): draft is FoxIntakeDraft & {
  propertyType: PropertyTypeValue;
} {
  return isPropertyTypeValue(String(draft.propertyType ?? ""));
}

export function propertyTypeSkipped(draft: FoxIntakeDraft) {
  return Boolean(draft.propertyTypeAsked && !draft.propertyType && draft.correcting !== "property-type");
}

export function creditAnswered(draft: FoxIntakeDraft) {
  return Boolean(draft.creditAsked || draft.creditBand);
}

/** Skip → Pricing when the file is ready. House/Condo/2–4 wait for FICO before a rate line. */
export function rateLineReady(draft: FoxIntakeDraft) {
  if (draft.correcting === "property-type") return false;
  if (propertyTypeSkipped(draft)) return true;
  return propertyTypeChosen(draft) && creditAnswered(draft);
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

export function propertyAddressSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "property-address") return false;
  return Boolean(draft.subjectAddressAsked || draft.subjectAddress);
}

function purchaseLike(draft: FoxIntakeDraft) {
  if (draft.productIntent === "buy") return true;
  if (draft.productIntent === "jumbo") return draft.jumboPurpose !== "refinance";
  return false;
}

function refiOrHeloc(draft: FoxIntakeDraft) {
  if (draft.productIntent === "heloc" || draft.productIntent === "refinance") return true;
  if (draft.productIntent === "jumbo") return draft.jumboPurpose === "refinance";
  return false;
}

function primaryOccupancy(draft: FoxIntakeDraft) {
  const occupancy = draft.occupancyChoice?.value;
  return occupancy === "primary" || occupancy === "primary-residence";
}

function purchaseContractOnFile(draft: FoxIntakeDraft) {
  return (draft.documents ?? []).some(
    (doc) =>
      doc.extractClass === "purchase_contract" &&
      (doc.status === "extracted" || doc.status === "received" || doc.status === "reading"),
  );
}

/** Street printed on the government ID. Never invent one. Never read residence history. */
export function idStreetSuggestion(draft: FoxIntakeDraft): string | null {
  const fromFact = String(draft.facts?.present_address?.value ?? "").trim();
  if (fromFact && looksLikeStreet(fromFact)) return fromFact;
  return null;
}

/** Purchase-contract street only. Never an ID or former-residence street. */
export function contractStreetSuggestion(draft: FoxIntakeDraft): string | null {
  if (!purchaseContractOnFile(draft)) return null;
  const fromFact = String(draft.facts?.property_address?.value ?? "").trim();
  if (fromFact && looksLikeStreet(fromFact) && !draft.subjectAddress) return fromFact;
  const pending = draft.pendingProposal;
  if (pending && isPropertyAddressField(pending.field ?? "")) {
    const value = String(pending.value ?? "").trim();
    if (value && looksLikeStreet(value)) return value;
  }
  return null;
}

export function subjectAddressSuggestion(draft: FoxIntakeDraft): {
  street: string;
  source: "contract" | "id";
} | null {
  if (draft.correcting === "property-address") return null;
  if (purchaseLike(draft)) {
    const contract = contractStreetSuggestion(draft);
    return contract ? { street: contract, source: "contract" } : null;
  }
  if (refiOrHeloc(draft) && primaryOccupancy(draft)) {
    const id = idStreetSuggestion(draft);
    return id ? { street: id, source: "id" } : null;
  }
  return null;
}

export function propertyAddressAskText(draft: FoxIntakeDraft) {
  return purchaseLike(draft) ? PURCHASE_ADDRESS_ASK : PROPERTY_ADDRESS_ASK;
}

function looksLikeStreet(value: string) {
  const cleaned = value.replace(/\s+/g, " ").replace(/[.,;]+$/g, "").trim();
  if (cleaned.length < 5 || cleaned.length > 80) return false;
  if (parsePropertyType(cleaned)) return false;
  return /^\d{1,6}\s+[A-Za-z]/.test(cleaned);
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

export function skipSubjectAddress(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    subjectAddressAsked: true,
    pendingProposal:
      isPropertyAddressField(draft.pendingProposal?.field ?? "")
        ? null
        : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
  };
}

export function writeSubjectAddress(draft: FoxIntakeDraft, address: string): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = address.trim();
  return {
    ...draft,
    subjectAddress: value,
    subjectAddressAsked: true,
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

export function idAddressConfirmCopy(address: string) {
  return `The ID shows ${address}. ${SUGGESTED_PROPERTY_NOTE}. Use this?`;
}

export function isSkipPropertyAddressText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|none|no|n\/a|na)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function propertyTypeConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
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
  ];
}

export function propertyTypeAskActions(): FoxAction[] {
  return [
    {
      id: "property-sfr",
      label: "House",
      event: "bubble",
      capture: { field: "propertyType", value: "sfr" },
    },
    {
      id: "property-condo",
      label: "Condo",
      event: "bubble",
      capture: { field: "propertyType", value: "condo" },
    },
    {
      id: "property-two-to-four",
      label: "2–4",
      event: "bubble",
      capture: { field: "propertyType", value: "two_to_four" },
    },
    ...propertyTypeSkipActions(),
  ];
}

export function propertyTypeAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  return {
    text: PROPERTY_TYPE_ASK,
    actions: propertyTypeAskActions(),
  };
}

export function propertyAddressSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-property-address",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-property-address" },
    },
  ];
}

export function propertyAddressAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  const suggestion = subjectAddressSuggestion(draft);
  if (suggestion) {
    return {
      text:
        suggestion.source === "contract"
          ? contractAddressConfirmCopy(suggestion.street)
          : idAddressConfirmCopy(suggestion.street),
      actions: [
        {
          id: "accept-subject-address",
          label: "Use this",
          event: "bubble",
          capture: { field: "subjectAddress", value: suggestion.street },
        },
        {
          id: "change-subject-address",
          label: "Change",
          event: "bubble",
          capture: { field: "change-property-address" },
        },
        ...propertyAddressSkipActions(),
      ],
    };
  }
  return {
    text: propertyAddressAskText(draft),
    actions: propertyAddressSkipActions(),
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
