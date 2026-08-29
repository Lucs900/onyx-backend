import type { FoxIntakeDraft, ProductIntent } from "@/components/fox/types";
import { addressLineReadyForQuote } from "@/components/fox/propertyType";
import { FHFA_HIGH_COST_CEILING_2026 } from "@/lib/guidelines/conventional";
import {
  cityFromTypedAddress,
  creditScoreFloor,
  mapPropertyType,
  mapResidency,
  parseClientBody,
  rateflowScenarioKey,
  zipFromSources,
  type RateflowClientBody,
  type SafeCouponRow,
} from "./quote";

function loanAmountFromDraft(draft: FoxIntakeDraft): number | undefined {
  if (draft.loanAmountValue != null && draft.loanAmountValue > 0) {
    return draft.loanAmountValue;
  }
  if (!draft.amountAsked && draft.scenario?.loanAmount != null && draft.scenario.loanAmount > 0) {
    return draft.scenario.loanAmount;
  }
  if (
    draft.productIntent === "buy" &&
    draft.propertyValueAmount != null &&
    draft.downPaymentAmount != null
  ) {
    const implied = Math.round(draft.propertyValueAmount - draft.downPaymentAmount);
    return implied > 0 ? implied : undefined;
  }
  return undefined;
}

const BLOCKED_INTENTS = new Set<ProductIntent>(["heloc", "jumbo", "other"]);

export type LiveQuoteOnFile = {
  key: string;
  rate: number;
  asOf: string;
  principalAndInterest?: number;
  pts?: number;
  term?: number;
  rows?: SafeCouponRow[];
};

function listPriceFromDraft(draft: FoxIntakeDraft): number | undefined {
  if (draft.propertyValueAmount != null && draft.propertyValueAmount > 0) {
    return draft.propertyValueAmount;
  }
  const fromScenario = draft.scenario?.propertyValue;
  if (fromScenario != null && fromScenario > 0) return fromScenario;
  return undefined;
}

function loanPurposeFromDraft(draft: FoxIntakeDraft): "purchase" | "refinance" | undefined {
  if (draft.cashOut || draft.govProgram) return undefined;
  if (draft.productIntent === "buy") return "purchase";
  if (draft.productIntent === "refinance") return "refinance";
  return undefined;
}

export function addressConfirmPending(draft: FoxIntakeDraft) {
  if (draft.pendingAddress?.line?.trim()) return true;
  const field = draft.pendingProposal?.field;
  return field === "property_address" || field === "subjectAddress";
}

export function rateflowBlockedReason(draft: FoxIntakeDraft): string | null {
  const intent = draft.productIntent;
  if (!intent || BLOCKED_INTENTS.has(intent)) return "product";
  if (draft.outOfState) return "state";
  if (draft.govProgram) return "program";
  if (draft.cashOut) return "cash-out";
  if (addressConfirmPending(draft)) return "address-confirm";
  if (!addressLineReadyForQuote(draft)) return "address";
  if (!loanPurposeFromDraft(draft)) return "purpose";
  if (!mapResidency(draft.occupancyChoice.value || draft.scenario?.occupancy)) return "occupancy";
  if (listPriceFromDraft(draft) == null) return "value";
  const loanAmount = loanAmountFromDraft(draft);
  if (loanAmount == null) return "loan";
  if (loanAmount > FHFA_HIGH_COST_CEILING_2026) return "jumbo";
  if (!mapPropertyType(draft.propertyType, draft.propertyUnits)) return "property-type";
  if (creditScoreFloor(draft.creditBand) == null) return "credit";
  if (!zipFromDraft(draft)) return "zip";
  return null;
}

export function zipFromDraft(draft: FoxIntakeDraft): string | undefined {
  if (addressConfirmPending(draft) || !addressLineReadyForQuote(draft)) return undefined;
  const factAddress =
    typeof draft.facts?.property_address?.value === "string" ? draft.facts.property_address.value : "";
  return zipFromSources({
    propertyZip: draft.propertyZip,
    address: draft.subjectAddress || factAddress,
  });
}

export function cityFromDraft(draft: FoxIntakeDraft): string | undefined {
  if (draft.subjectState === "CA" && draft.subjectCity?.trim()) {
    const city = draft.subjectCity.replace(/\s+/g, " ").trim();
    if (city.length >= 2 && city.length <= 40 && !/\d/.test(city)) return city;
  }
  const factAddress =
    typeof draft.facts?.property_address?.value === "string" ? draft.facts.property_address.value : "";
  return cityFromTypedAddress(draft.subjectAddress || factAddress);
}

export function rateflowClientBodyFromDraft(draft: FoxIntakeDraft): RateflowClientBody | null {
  if (rateflowBlockedReason(draft)) return null;
  const purpose = loanPurposeFromDraft(draft);
  const residency = mapResidency(draft.occupancyChoice.value || draft.scenario?.occupancy);
  const propertyType = mapPropertyType(draft.propertyType, draft.propertyUnits);
  const listPrice = listPriceFromDraft(draft);
  const loanAmount = loanAmountFromDraft(draft);
  const credit = creditScoreFloor(draft.creditBand);
  if (!purpose || !residency || !propertyType || listPrice == null || loanAmount == null || credit == null) {
    return null;
  }
  const zipcode = zipFromDraft(draft);
  if (!zipcode) return null;
  const city = cityFromDraft(draft);
  return parseClientBody({
    loan_purpose: purpose,
    residency_type: residency,
    property_type: propertyType,
    list_price: listPrice,
    loan_amount: loanAmount,
    credit_score: credit,
    zipcode,
    ...(city ? { city } : {}),
  });
}

export function liveQuoteMatchesDraft(
  draft: FoxIntakeDraft,
  quote?: Pick<LiveQuoteOnFile, "key"> | null,
): boolean {
  const body = rateflowClientBodyFromDraft(draft);
  if (!body || !quote?.key) return false;
  return quote.key === rateflowScenarioKey(body);
}

export function searchedKeyFor(draft: FoxIntakeDraft): string | undefined {
  const body = rateflowClientBodyFromDraft(draft);
  return body ? rateflowScenarioKey(body) : undefined;
}
