import type { FoxIntakeDraft, ProductIntent } from "@/components/fox/types";
import { FHFA_HIGH_COST_CEILING_2026 } from "@/lib/guidelines/conventional";
import {
  creditScoreFloor,
  mapPropertyType,
  mapResidency,
  parseClientBody,
  rateflowScenarioKey,
  zipFromTypedAddress,
  type RateflowClientBody,
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

export function rateflowBlockedReason(draft: FoxIntakeDraft): string | null {
  const intent = draft.productIntent;
  if (!intent || BLOCKED_INTENTS.has(intent)) return "product";
  if (draft.outOfState) return "state";
  if (draft.govProgram) return "program";
  if (draft.cashOut) return "cash-out";
  if (!loanPurposeFromDraft(draft)) return "purpose";
  if (!mapResidency(draft.occupancyChoice.value || draft.scenario?.occupancy)) return "occupancy";
  if (listPriceFromDraft(draft) == null) return "value";
  const loanAmount = loanAmountFromDraft(draft);
  if (loanAmount == null) return "loan";
  if (loanAmount > FHFA_HIGH_COST_CEILING_2026) return "jumbo";
  if (!mapPropertyType(draft.propertyType, draft.propertyUnits)) return "property-type";
  if (creditScoreFloor(draft.creditBand) == null) return "credit";
  return null;
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
  const typedZip =
    zipFromTypedAddress(draft.subjectAddress) ??
    (draft.scenario?.zip && /^\d{5}$/.test(draft.scenario.zip) ? draft.scenario.zip : undefined);
  return parseClientBody({
    loan_purpose: purpose,
    residency_type: residency,
    property_type: propertyType,
    list_price: listPrice,
    loan_amount: loanAmount,
    credit_score: credit,
    ...(typedZip ? { zipcode: typedZip } : {}),
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
