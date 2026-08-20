import type { CreditRange, ExplorerScenario, LoanPurpose } from "./scenario";

/**
 * PRIVATE v1 membership reward estimate.
 *
 * Do not render this method, the base rate, product/credit factors,
 * or any percent in the UI, Fox copy, or public docs.
 * Callers may show only a rounded dollar range, or nothing.
 *
 * Internal method (never display):
 *   Base = LoanAmount * 0.005
 *   Adjusted = Base * ProductFactor * CreditBandFactor
 *   RangeLow = Adjusted * 0.85
 *   RangeHigh = min(Adjusted * 1.15, 8000)
 */

export type RewardRange = {
  low: number;
  high: number;
};

function loanAmountForEstimate(scenario: ExplorerScenario): number | null {
  if (scenario.loanAmount != null && scenario.loanAmount > 0) {
    return scenario.loanAmount;
  }
  if (scenario.propertyValue > 0 && scenario.downPayment != null) {
    const derived = scenario.propertyValue - scenario.downPayment;
    if (derived > 0) return derived;
  }
  return null;
}

function productFactor(scenario: ExplorerScenario): number | null {
  const slug = scenario.productSlug ?? "";
  const purpose: LoanPurpose = scenario.purpose;

  if (slug === "heloc-heloan" || purpose === "heloc-heloan") return 0.7;
  if (purpose === "rate-term-refi" || purpose === "cash-out") return 0.85;
  if (slug.includes("refinance") || slug.includes("refi")) return 0.85;
  if (purpose === "purchase") return 1;
  return null;
}

function creditBandFactor(range: CreditRange): number | null {
  if (range === "760+") return 1;
  if (range === "720-759" || range === "680-719") return 0.9;
  return null;
}

export function estimateRewardRange(
  scenario: ExplorerScenario,
): RewardRange | null {
  const loanAmount = loanAmountForEstimate(scenario);
  const product = productFactor(scenario);
  const credit = creditBandFactor(scenario.creditRange);
  if (loanAmount == null || product == null || credit == null) return null;

  const adjusted = loanAmount * 0.005 * product * credit;
  if (!Number.isFinite(adjusted) || adjusted <= 0) return null;

  return {
    low: Math.round(adjusted * 0.85),
    high: Math.round(Math.min(adjusted * 1.15, 8000)),
  };
}

export function formatRewardRange(range: RewardRange) {
  const fmt = (value: number) =>
    `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `${fmt(range.low)} to ${fmt(range.high)}`;
}
