/**
 * Rental suggest helper. Cites B3-3.8-01 (Schedule E) and B3-3.6-05 (lease)
 * internally only — never quote those section numbers to the borrower.
 * Suggested · not underwritten. Never call this qualifying income.
 * Do not apply 75% to Schedule E. Lease vacancy factor is the only 0.75.
 */

export const RENTAL_INTERNAL_CITES = ["B3-3.8-01", "B3-3.6-05"] as const;
export const LEASE_VACANCY_FACTOR = 0.75;
export const RENTAL_INCOME_FIELD = "rental_income";
export const SUGGESTED_RENTAL_NOTE = "Suggested rental income · not underwritten";
export const RENTAL_STILL_USEFUL = "A Schedule E or a current lease would help.";
export const RENTAL_UNSUPPORTED_CAUTION =
  "I don’t have a rental path for that yet. I’ll keep gathering.";

export type RentalMethod = "schedule_e" | "lease_75";

export type ScheduleERentalInput = {
  rentalIncomeOrLoss?: number | null;
  months?: number | null;
  depreciation?: number | null;
  interest?: number | null;
  hoa?: number | null;
  taxes?: number | null;
  insurance?: number | null;
  /** Unclear non-recurring stays in (conservative). Do not subtract. */
  nonrecurring?: number | null;
};

export type LeaseRentalInput = {
  grossMonthlyRent: number;
  twoMonthsDeposits?: boolean;
};

export type RentalSuggestResult = {
  monthly: number;
  method: RentalMethod;
  thinner?: boolean;
};

const UNSUPPORTED_RENTAL =
  /\b(airbnb|vrbo|short[-\s]?term|str\b|8825|form\s*8825|schedule\s*f|sch\.?\s*f|boarder|room(er|mate) rent|subject adu|adu to qualify|ytd p&l|ytd pnl|profit and loss)\b/i;

export function rentalConfirmCopy(method: RentalMethod): string {
  const using = method === "schedule_e" ? "Schedule E" : "75% of the lease";
  return `${SUGGESTED_RENTAL_NOTE}. I’m using ${using}. Use this?`;
}

export function unsupportedRentalNamed(text?: string | null): boolean {
  if (!text) return false;
  return UNSUPPORTED_RENTAL.test(text);
}

/** Stated monthly lease / rent / tenant payment. No dollar → no invent. Not Schedule E. */
export function parseStatedMonthlyLease(
  text: string,
  opts?: { occupancy?: string | null },
): number | null {
  const trimmed = text.trim();
  if (!trimmed || unsupportedRentalNamed(trimmed)) return null;
  if (/\bschedule\s*e\b|\bsch\.?\s*e\b|\bform\s*8825\b|\b8825\b/i.test(trimmed)) return null;
  const occupancy = opts?.occupancy ?? "";
  const investment = occupancy === "investment";
  const leaseOrTenant = /\b(lease|tenant)\b/i.test(trimmed);
  const rentCue = /\brent\b/i.test(trimmed);
  if (!leaseOrTenant && !(investment && rentCue)) return null;
  const amounts: { value: number; index: number }[] = [];
  const money = /\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = money.exec(trimmed))) {
    const n = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 100 || n > 100_000) continue;
    const nearby = trimmed.slice(match.index, match.index + 28);
    if (n >= 1900 && n <= 2100 && !/\b(month|mo\b|rent|lease)\b/i.test(nearby)) continue;
    amounts.push({ value: n, index: match.index });
  }
  if (!amounts.length) return null;
  const monthly = amounts.find((item) =>
    /\b(a\s+month|\/\s*mo|monthly)\b/i.test(trimmed.slice(item.index, item.index + 28)),
  );
  return Math.round((monthly ?? amounts[0]).value);
}

/** 12-month average of rental income/loss; add back depreciation, interest, HOA, taxes, insurance. */
export function suggestScheduleERental(input: ScheduleERentalInput): RentalSuggestResult | null {
  if (input.rentalIncomeOrLoss == null || !Number.isFinite(input.rentalIncomeOrLoss)) return null;
  const months = input.months != null && input.months > 0 ? input.months : 12;
  const annual =
    input.rentalIncomeOrLoss +
    (input.depreciation ?? 0) +
    (input.interest ?? 0) +
    (input.hoa ?? 0) +
    (input.taxes ?? 0) +
    (input.insurance ?? 0);
  return {
    monthly: Math.round(annual / months),
    method: "schedule_e",
  };
}

/** suggested monthly = 0.75 * grossMonthlyRent. Thinner if no two months of deposits. */
export function suggestLeaseRental(input: LeaseRentalInput): RentalSuggestResult | null {
  if (!Number.isFinite(input.grossMonthlyRent) || input.grossMonthlyRent <= 0) return null;
  return {
    monthly: Math.round(input.grossMonthlyRent * LEASE_VACANCY_FACTOR),
    method: "lease_75",
    thinner: input.twoMonthsDeposits !== true,
  };
}
