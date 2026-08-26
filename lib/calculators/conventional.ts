/**
 * Conventional calculators v1.5. Fox math only.
 * Estimated · not final. Stated · not from credit. Sample · indicative · not live.
 * Does not replace Guidelines v1. Does not invent MI dollars, reserve months, or project review.
 */

import {
  HIGH_PURCHASE_LTV,
  HIGH_STATED_DTI_CAUTION,
  type FileFacts,
} from "@/lib/guidelines/conventional";
import {
  rentalConfirmCopy,
  suggestLeaseRental,
  suggestScheduleERental,
  type LeaseRentalInput,
  type RentalSuggestResult,
  type ScheduleERentalInput,
} from "@/lib/income/rental";

export const SAMPLE_NOTE_RATE = 0.0675;
export const SAMPLE_TERM_MONTHS = 360;
export const TAX_ANNUAL_RATE = 0.0125;
export const HOI_ANNUAL_RATE = 0.0035;
export const LARGE_DEPOSIT_SHARE = 0.5;
export const HIGH_STATED_DTI = 1;

export const ESTIMATED_NOT_FINAL = "Estimated · not final";
export const STATED_NOT_FROM_CREDIT = "Stated · not from credit";
export const SAMPLE_INDICATIVE_NOT_LIVE = "Sample · indicative · not live";
export const PI_SAMPLE_LINE =
  "Sample payment at 6.750% for 30 years. Indicative · not live. Estimated · not final.";
export const MI_APPLIES_LABEL = "MI · applies, amount waits.";
export const HOA_FROM_FILE_LABEL = "HOA · from File";
export { HIGH_STATED_DTI_CAUTION };
export const STATED_DTI_ASK =
  "About how much do you pay each month on other debts, not counting this house?";

export const LTV_FIELD = "ltv";
export const CLTV_FIELD = "cltv";
export const SUBORDINATE_FIELD = "subordinate_balance";
export const ESTIMATED_HOUSING_FIELD = "estimated_housing";
export const STATED_DTI_FIELD = "stated_dti";
export const MI_APPLIES_FIELD = "mi_applies";
export const RESERVES_NOTE_FIELD = "reserves_note";
export const LARGE_DEPOSIT_FIELD = "large_deposit";
export const GIFT_FUNDS_FIELD = "gift_funds_noted";

export type LtvCltvInput = {
  purpose?: "purchase" | "refi";
  loanAmount?: number | null;
  purchasePrice?: number | null;
  propertyValue?: number | null;
  subordinateBalance?: number | null;
};

export type LtvCltvResult = {
  ltv: number;
  cltv: number;
  basis: number;
  loanAmount: number;
  subordinateBalance: number;
};

export type HousingEstimateInput = {
  purpose?: "purchase" | "refi";
  loanAmount?: number | null;
  purchasePrice?: number | null;
  propertyValue?: number | null;
  hoaMonthly?: number | null;
  ltv?: number | null;
};

export type HousingEstimate = {
  principalAndInterest: number;
  taxes: number;
  hoi: number;
  hoa: number;
  miApplies: boolean;
  monthlyMI: number | null;
  estimatedHousing: number;
  value: number;
  loanAmount: number;
};

export type AssetNotesInput = {
  occupancy?: string | null;
  propertyType?: string | null;
  qualifyingIncome?: number | null;
  extractedDeposit?: number | null;
  giftNamed?: boolean;
};

export type AssetNotes = {
  reservesNote: "no_minimum_1unit_primary" | "reserves_review";
  largeDepositFlag: boolean;
  giftFundsNoted: boolean;
};

export function moneyShown(value: number) {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString("en-US");
  return rounded < 0 ? `-$${abs}` : `$${abs}`;
}

export function formatRatioPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatWholePercent(ratio: number) {
  return `${Math.round(ratio * 100)}%`;
}

function positive(value?: number | null): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function basisValue(input: LtvCltvInput | HousingEstimateInput) {
  const purchase = input.purpose !== "refi";
  return purchase ? positive(input.purchasePrice) ?? positive(input.propertyValue) : positive(input.propertyValue) ?? positive(input.purchasePrice);
}

export function ltvCltv(input: LtvCltvInput): LtvCltvResult | null {
  const loan = positive(input.loanAmount);
  const basis = basisValue(input);
  if (loan == null || basis == null) return null;
  const subordinate = Math.max(0, input.subordinateBalance ?? 0);
  const ltv = loan / basis;
  const cltv = subordinate > 0 ? (loan + subordinate) / basis : ltv;
  return { ltv, cltv, basis, loanAmount: loan, subordinateBalance: subordinate };
}

export function ltvCltvFromFile(file: FileFacts): LtvCltvResult | null {
  const purchase = file.purposeHint === "purchase" || file.product === "buy";
  return ltvCltv({
    purpose: purchase ? "purchase" : "refi",
    loanAmount: file.loanAmount,
    purchasePrice: file.purchasePrice,
    propertyValue: file.propertyValue,
    subordinateBalance: file.subordinateBalance,
  });
}

/** P&I at 6.750% / 360 months. Round nearest dollar. */
export function monthlyPrincipalAndInterest(loan: number) {
  const r = SAMPLE_NOTE_RATE / 12;
  const n = SAMPLE_TERM_MONTHS;
  const growth = (1 + r) ** n;
  return Math.round((loan * r * growth) / (growth - 1));
}

export function housingEstimate(input: HousingEstimateInput): HousingEstimate | null {
  const loan = positive(input.loanAmount);
  const value = basisValue(input);
  if (loan == null || value == null) return null;
  const ratios = ltvCltv(input);
  const ltv = input.ltv ?? ratios?.ltv ?? loan / value;
  const principalAndInterest = monthlyPrincipalAndInterest(loan);
  const taxes = Math.round((value * TAX_ANNUAL_RATE) / 12);
  const hoi = Math.round((value * HOI_ANNUAL_RATE) / 12);
  const hoa = Math.max(0, Math.round(input.hoaMonthly ?? 0));
  const miApplies = ltv > HIGH_PURCHASE_LTV;
  const monthlyMI = miApplies ? null : 0;
  const estimatedHousing = principalAndInterest + taxes + hoi + hoa + (monthlyMI ?? 0);
  return {
    principalAndInterest,
    taxes,
    hoi,
    hoa,
    miApplies,
    monthlyMI,
    estimatedHousing,
    value,
    loanAmount: loan,
  };
}

export function housingConfirmCopy(total: number) {
  return `Estimated housing is about ${moneyShown(total)} a month at the sample rate. ${ESTIMATED_NOT_FINAL}. Use this?`;
}

export function statedDti(
  estimatedHousing?: number | null,
  statedMonthlyDebts?: number | null,
  qualifyingIncome?: number | null,
): number | null {
  const housing = positive(estimatedHousing);
  const income = positive(qualifyingIncome);
  if (housing == null || income == null) return null;
  if (statedMonthlyDebts == null || !Number.isFinite(statedMonthlyDebts) || statedMonthlyDebts < 0) {
    return null;
  }
  return (housing + statedMonthlyDebts) / income;
}

export function rentalSuggest(
  scheduleE?: ScheduleERentalInput | null,
  lease?: LeaseRentalInput | null,
): RentalSuggestResult | null {
  return (scheduleE ? suggestScheduleERental(scheduleE) : null) ?? (lease ? suggestLeaseRental(lease) : null);
}

export { rentalConfirmCopy };

export function qualifyingIncomeConfirmCopy(monthly: number) {
  return `Suggested monthly income is ${moneyShown(monthly)}. Use this?`;
}

export function assetNotes(input: AssetNotesInput): AssetNotes {
  const occupancy = input.occupancy ?? "";
  const primary = occupancy === "primary" || occupancy === "primary-residence";
  const oneUnit = !input.propertyType || input.propertyType === "sfr" || input.propertyType === "condo";
  const reservesNote =
    primary && oneUnit && input.propertyType !== "two_to_four"
      ? "no_minimum_1unit_primary"
      : "reserves_review";
  const income = positive(input.qualifyingIncome);
  const deposit = positive(input.extractedDeposit);
  const largeDepositFlag = Boolean(income && deposit && deposit > income * LARGE_DEPOSIT_SHARE);
  return {
    reservesNote,
    largeDepositFlag,
    giftFundsNoted: Boolean(input.giftNamed),
  };
}
