import type { FoxIntakeDraft, ProductIntent } from "@/components/fox/types";
import { purchaseSketchMismatch } from "@/components/fox/fileWrite";
import { helocLiveEligible, helocQuoteLine } from "@/components/fox/heloc";
import {
  addressLineReadyForQuote,
  isZipOnlyFileAddress,
} from "@/components/fox/propertyType";
import { isCaliforniaZip } from "@/components/products/scenario";
import { FHFA_HIGH_COST_CEILING_2026, HIGH_PURCHASE_LTV } from "@/lib/guidelines/conventional";
import {
  cityFromTypedAddress,
  creditScoreFloor,
  mapPropertyType,
  mapResidency,
  parseClientBody,
  rateflowCashOutRequest,
  rateflowScenarioKey,
  zipFromSources,
  type RateflowClientBody,
  type SafeCouponRow,
} from "./quote";

function loanAmountFromDraft(draft: FoxIntakeDraft): number | undefined {
  if (draft.productIntent === "heloc") return helocQuoteLine(draft);
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

const BLOCKED_INTENTS = new Set<ProductIntent>(["jumbo", "other"]);

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
  if (draft.govProgram) return undefined;
  if (draft.cashOut && draft.productIntent !== "refinance") return undefined;
  if (draft.productIntent === "buy") return "purchase";
  if (draft.productIntent === "refinance") return "refinance";
  if (draft.productIntent === "heloc") return "refinance";
  return undefined;
}

function sketchedRefiLtv(draft: FoxIntakeDraft): number | null {
  const value = listPriceFromDraft(draft);
  const loan = loanAmountFromDraft(draft);
  if (value == null || value <= 0 || loan == null || loan <= 0) return null;
  return loan / value;
}

/** Cash-out LTV above the conventional primary 1-unit cap (typically 80%). */
export function cashOutLtvOverCap(draft: FoxIntakeDraft): boolean {
  if (!draft.cashOut || draft.productIntent !== "refinance") return false;
  const ltv = sketchedRefiLtv(draft);
  return ltv != null && ltv > HIGH_PURCHASE_LTV;
}

function cashOutHasDistress(draft: FoxIntakeDraft): boolean {
  return Boolean(draft.creditEvent || draft.statedDeclaration === "event");
}

/**
 * Vanilla primary 1-unit House cash-out at conventional-eligible LTV.
 * Investment, 2–4, government, distress, and over-cap LTV stay off the live line.
 */
export function cashOutLiveEligible(draft: FoxIntakeDraft): boolean {
  if (!draft.cashOut || draft.productIntent !== "refinance") return false;
  if (draft.govProgram || cashOutHasDistress(draft) || draft.outOfState) return false;
  const occupancy = draft.occupancyChoice.value || draft.scenario?.occupancy;
  if (occupancy && occupancy !== "primary") return false;
  if (draft.propertyType !== "sfr") return false;
  const ltv = sketchedRefiLtv(draft);
  if (ltv == null || ltv > HIGH_PURCHASE_LTV) return false;
  return true;
}

export function cashOutBlockedReason(draft: FoxIntakeDraft): "cash-out" | "cash-out-ltv" | null {
  if (!draft.cashOut) return null;
  if (cashOutLiveEligible(draft)) return null;
  if (cashOutLtvOverCap(draft)) return "cash-out-ltv";
  return "cash-out";
}

export function addressConfirmPending(draft: FoxIntakeDraft) {
  const line = draft.pendingAddress?.line?.trim();
  if (line && !isZipOnlyFileAddress(line, draft.propertyZip)) return true;
  const field = draft.pendingProposal?.field;
  if (field !== "property_address" && field !== "subjectAddress") return false;
  const value = String(draft.pendingProposal?.value ?? "").trim();
  return Boolean(value && !isZipOnlyFileAddress(value, draft.propertyZip));
}

export function rateflowBlockedReason(draft: FoxIntakeDraft): string | null {
  const intent = draft.productIntent;
  if (!intent || BLOCKED_INTENTS.has(intent)) return "product";
  if (draft.outOfState) return "state";
  const zip = zipFromDraft(draft);
  if (zip && !isCaliforniaZip(zip)) return "state";
  if (draft.govProgram) return "program";
  if (intent === "heloc") {
    if (!helocLiveEligible(draft)) {
      if (draft.occupancyChoice.value === "investment" || draft.occupancyChoice.value === "second-home") {
        return "heloc-occupancy";
      }
      if (draft.propertyType === "two_to_four") return "heloc-units";
      if ((draft.propertyValueAmount ?? 0) <= 0) return "value";
      if ((draft.firstLienAmount ?? 0) <= 0) return "first-lien";
      if (helocQuoteLine(draft) == null) return "line";
      if (draft.propertyType !== "sfr" && draft.propertyType !== "condo") return "property-type";
      return "heloc";
    }
  }
  const cashOutBlock = cashOutBlockedReason(draft);
  if (cashOutBlock) return cashOutBlock;
  if (addressConfirmPending(draft)) return "address-confirm";
  if (!addressLineReadyForQuote(draft)) return "address";
  if (!loanPurposeFromDraft(draft)) return "purpose";
  if (!mapResidency(draft.occupancyChoice.value || draft.scenario?.occupancy)) return "occupancy";
  if (listPriceFromDraft(draft) == null) return "value";
  if (purchaseSketchMismatch(draft)) return "purchase-split";
  const loanAmount = loanAmountFromDraft(draft);
  if (loanAmount == null) return "loan";
  const value = listPriceFromDraft(draft);
  if (draft.productIntent === "refinance" && value != null && loanAmount > value) return "ltv";
  if (draft.productIntent !== "heloc" && loanAmount > FHFA_HIGH_COST_CEILING_2026) return "jumbo";
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
  const heloc = draft.productIntent === "heloc";
  const cashOut = !heloc && draft.cashOut ? rateflowCashOutRequest(loanAmount) : null;
  return parseClientBody({
    loan_purpose: purpose,
    residency_type: residency,
    property_type: propertyType,
    list_price: listPrice,
    loan_amount: cashOut ? cashOut.loan_amount : loanAmount,
    credit_score: credit,
    zipcode,
    ...(city ? { city } : {}),
    ...(cashOut ? { cash_out: cashOut.cash_out } : {}),
    ...(heloc
      ? {
          heloc: true,
          loan_type: "heloc" as const,
          ...(draft.firstLienAmount != null && draft.firstLienAmount > 0
            ? { first_lien: Math.round(draft.firstLienAmount) }
            : {}),
        }
      : {}),
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

/** House + FICO + amounts + address on File: hold the ready line until Rateflow is actually empty. */
export function conventionalReadyHoldsReadyLine(draft: FoxIntakeDraft): boolean {
  if (draft.liveQuoteStatus === "unavailable") return false;
  if (
    draft.productIntent !== "buy" &&
    draft.productIntent !== "refinance" &&
    draft.productIntent !== "heloc"
  ) {
    return false;
  }
  if (draft.govProgram || draft.outOfState) return false;
  if (draft.productIntent === "heloc" && !helocLiveEligible(draft)) return false;
  if (draft.cashOut && !cashOutLiveEligible(draft)) return false;
  const readyZip = zipFromDraft(draft);
  if (readyZip && !isCaliforniaZip(readyZip)) return false;
  if (addressConfirmPending(draft)) return false;
  if (!String(draft.subjectAddress ?? "").trim() && !addressLineReadyForQuote(draft)) return false;
  if (!mapPropertyType(draft.propertyType, draft.propertyUnits)) return false;
  if (creditScoreFloor(draft.creditBand) == null) return false;
  const loanAmount = loanAmountFromDraft(draft);
  const listPrice = listPriceFromDraft(draft);
  if (listPrice == null || loanAmount == null) return false;
  if (draft.productIntent === "refinance" && loanAmount > listPrice) return false;
  if (loanAmount > FHFA_HIGH_COST_CEILING_2026) return false;
  return true;
}
