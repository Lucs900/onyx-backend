/**
 * BankingBridge Rateflow mapping and safe quote shaping.
 * Server and Fox share this. Never log or return secrets.
 */

export const RATEFLOW_HOST = "https://api.bankingbridge.com";
export const RATEFLOW_PATH = "/rateflow";
export const RATEFLOW_URL = `${RATEFLOW_HOST}${RATEFLOW_PATH}`;
export const RATEFLOW_TIMEOUT_MS = 12_000;
export const TARGET_PRICE = 100;

export const RATEFLOW_LOAN_TYPES = [
  "conventional",
  "va",
  "fha",
  "usda",
  "jumbo",
  "arm",
  "arm_va",
  "arm_fha",
  "arm_usda",
  "nonqm",
] as const;

export const RATEFLOW_PURPOSES = ["purchase", "refinance"] as const;

export const RATEFLOW_RESIDENCY = [
  "primary_home",
  "second_home",
  "rental_home",
] as const;

/** QuoteInfo property_type enums we may send. Do not invent others. */
export const RATEFLOW_PROPERTY_TYPES = [
  "single_family_home",
  "condo",
  "condominium",
  "home_2_units",
  "home_3_units",
  "home_4_units",
] as const;

export type RateflowPurpose = (typeof RATEFLOW_PURPOSES)[number];
export type RateflowResidency = (typeof RATEFLOW_RESIDENCY)[number];
export type RateflowPropertyType = (typeof RATEFLOW_PROPERTY_TYPES)[number];

export type RateflowClientBody = {
  loan_purpose: RateflowPurpose;
  residency_type: RateflowResidency;
  list_price: number;
  loan_amount: number;
  credit_score: number;
  property_type: RateflowPropertyType;
  zipcode: string;
  city?: string;
};

export type RateflowProductRow = {
  rate?: number;
  price?: number;
  pts?: number;
  principalAndInterest?: number;
  loanTerm?: number;
  amortizationTerm?: number;
  amortizationType?: string;
  productName?: string;
  bbLoanType?: string;
  loanType?: string;
  lastUpdate?: number;
  term?: number;
  label?: string;
  pi_monthly?: number;
  points?: number;
};

export type SafeLiveQuote = {
  rate: number;
  asOf: string;
  principalAndInterest?: number;
  pts?: number;
  /** Years. Omitted on conventional 30 so the Structure line stays the default live form. */
  term?: number;
};

/** Conventional 30 row kept from the same search. Never a visible rate table. */
export type SafeCouponRow = {
  rate: number;
  pts?: number;
  principalAndInterest?: number;
  price?: number;
};

export type RateflowQuoteReport = {
  env: {
    BANKINGBRIDGE_API_KEY: boolean;
    BANKINGBRIDGE_BRAND_ID: boolean;
    BANKINGBRIDGE_RATEFLOW_ID: boolean;
    BANKINGBRIDGE_LOID: boolean;
  };
  bbHttpStatus: number | null;
  resultCount: number;
  sent: {
    property_type: string;
    loan_purpose: string;
    residency_type: string;
    loan_type: string;
    state: string;
    zip: string;
  };
  first?: {
    rate?: number;
    term: number | null;
    label?: string;
  };
  pickedRate?: number;
  eligibleNoPoints?: number;
  sample?: { rate?: number; pts?: number; term: number | null }[];
  /** Conventional 30 rows the picker sees. Rate + points only. Never secrets. */
  book?: { rate: number; pts?: number }[];
};

export type SafeQuoteResponse =
  | { ok: true; quote: SafeLiveQuote }
  | { ok: false };

export function creditScoreFloor(band: string | null | undefined): number | undefined {
  const raw = String(band ?? "").trim();
  if (!raw || raw === "not-sure") return undefined;
  if (/^\d{3}$/.test(raw)) {
    const score = Number(raw);
    if (score >= 300 && score <= 850) return score;
    return undefined;
  }
  const plus = raw.match(/^(\d{3})\+$/);
  if (plus) return Number(plus[1]);
  const range = raw.match(/^(\d{3})\s*[-–]\s*\d{3}$/);
  if (range) return Number(range[1]);
  return undefined;
}

export function mapResidency(occupancy: string | null | undefined): RateflowResidency | undefined {
  const raw = String(occupancy ?? "").trim().toLowerCase();
  if (raw === "primary" || raw === "primary-residence" || raw === "primary_home") {
    return "primary_home";
  }
  if (raw === "second-home" || raw === "second" || raw === "second_home") {
    return "second_home";
  }
  if (raw === "investment" || raw === "rental" || raw === "rental_home") {
    return "rental_home";
  }
  return undefined;
}

export function mapPropertyType(
  propertyType: string | null | undefined,
  unitCount?: string | number | null,
): RateflowPropertyType | undefined {
  const raw = String(propertyType ?? "").trim().toLowerCase();
  if (raw === "sfr" || raw === "house" || raw === "single_family_home") {
    return "single_family_home";
  }
  if (raw === "condo" || raw === "condominium") return "condo";
  if (raw === "two_to_four" || raw === "2-4" || raw === "2–4") {
    const units = Number(String(unitCount ?? "").replace(/[^\d]/g, ""));
    if (units === 3) return "home_3_units";
    if (units === 4) return "home_4_units";
    return "home_2_units";
  }
  if (raw === "home_2_units" || raw === "home_3_units" || raw === "home_4_units") {
    return raw;
  }
  return undefined;
}

export function parseZipcode(value: string | null | undefined): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const exact = raw.match(/^(\d{5})(?:-\d{4})?$/);
  if (exact) return exact[1];
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 5 || digits.length === 9) {
    const embedded = raw.match(/\b(\d{5})(?:-\d{4})?\b/);
    return embedded?.[1];
  }
  return undefined;
}

export function zipFromTypedAddress(address: string | null | undefined): string | undefined {
  const match = String(address ?? "").match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1];
}

export function cityFromTypedAddress(address: string | null | undefined): string | undefined {
  const match = String(address ?? "").match(/,\s*([^,]+?),\s*[A-Za-z]{2}\b/);
  const city = match?.[1]?.replace(/\s+/g, " ").trim();
  if (!city || city.length < 2 || city.length > 40) return undefined;
  if (/\d/.test(city)) return undefined;
  return city;
}

export function zipFromSources(input: {
  propertyZip?: string | null;
  address?: string | null;
  scenarioZip?: string | null;
}): string | undefined {
  return (
    parseZipcode(input.propertyZip) ??
    zipFromTypedAddress(input.address) ??
    parseZipcode(input.scenarioZip)
  );
}

export function rateflowScenarioKey(body: RateflowClientBody): string {
  return [
    body.loan_purpose,
    body.residency_type,
    body.property_type,
    String(body.list_price),
    String(body.loan_amount),
    String(body.credit_score),
    body.zipcode ?? "",
  ].join("|");
}

export function parseClientBody(input: unknown): RateflowClientBody | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const purpose = String(raw.loan_purpose ?? "");
  const residency = String(raw.residency_type ?? "");
  const propertyType = String(raw.property_type ?? "");
  const listPrice = Number(raw.list_price);
  const loanAmount = Number(raw.loan_amount);
  const credit = Number(raw.credit_score);
  if (!RATEFLOW_PURPOSES.includes(purpose as RateflowPurpose)) return null;
  if (!RATEFLOW_RESIDENCY.includes(residency as RateflowResidency)) return null;
  if (!RATEFLOW_PROPERTY_TYPES.includes(propertyType as RateflowPropertyType)) return null;
  if (!Number.isFinite(listPrice) || listPrice <= 0) return null;
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) return null;
  if (!Number.isFinite(credit) || credit < 300 || credit > 850) return null;
  const zip = parseZipcode(typeof raw.zipcode === "string" ? raw.zipcode : "");
  if (!zip) return null;
  const cityRaw = typeof raw.city === "string" ? raw.city.replace(/\s+/g, " ").trim() : "";
  const city = cityRaw && cityRaw.length >= 2 && cityRaw.length <= 40 && !/\d/.test(cityRaw) ? cityRaw : undefined;
  return {
    loan_purpose: purpose as RateflowPurpose,
    residency_type: residency as RateflowResidency,
    property_type: propertyType as RateflowPropertyType,
    list_price: Math.round(listPrice),
    loan_amount: Math.round(loanAmount),
    credit_score: Math.round(credit),
    zipcode: zip,
    ...(city ? { city } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isRateflowFailure(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const status = String(payload.status ?? "").toLowerCase();
  if (!status) return false;
  if (asProductRows(payload).length) return false;
  return /error|fail/.test(status);
}

function rawRowsFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  for (const key of ["results", "products", "quotes", "data", "rows"] as const) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

/** Refinance often nests coupons under results[].rates / products / options. */
function collectProductRows(
  value: unknown,
  acc: RateflowProductRow[],
  depth = 0,
): RateflowProductRow[] {
  if (depth > 8 || value == null) return acc;
  if (Array.isArray(value)) {
    for (const item of value) collectProductRows(item, acc, depth + 1);
    return acc;
  }
  if (!isRecord(value)) return acc;
  const row = normalizeProductRow(value);
  if (Number.isFinite(Number(row.rate))) acc.push(row);
  for (const child of Object.values(value)) {
    if (Array.isArray(child) || isRecord(child)) {
      collectProductRows(child, acc, depth + 1);
    }
  }
  return acc;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Rateflow refinance often uses results/term/label/pi_monthly instead of an engine array. */
export function normalizeProductRow(raw: RateflowProductRow | Record<string, unknown>): RateflowProductRow {
  const rate = firstNumber(
    raw.rate,
    (raw as { interestRate?: unknown }).interestRate,
    (raw as { noteRate?: unknown }).noteRate,
    (raw as { note_rate?: unknown }).note_rate,
    (raw as { interest_rate?: unknown }).interest_rate,
  );
  const pts = firstNumber(
    raw.pts,
    (raw as { points?: unknown }).points,
    (raw as { discountPoints?: unknown }).discountPoints,
    (raw as { discount_points?: unknown }).discount_points,
  );
  const price = firstNumber(raw.price, (raw as { targetPrice?: unknown }).targetPrice);
  const pi = firstNumber(
    raw.principalAndInterest,
    (raw as { pi_monthly?: unknown }).pi_monthly,
    (raw as { piMonthly?: unknown }).piMonthly,
    (raw as { monthly_payment?: unknown }).monthly_payment,
    (raw as { monthlyPayment?: unknown }).monthlyPayment,
  );
  const term = firstNumber(raw.loanTerm, raw.amortizationTerm, raw.term);
  const name = firstString(raw.productName, raw.label, (raw as { title?: unknown }).title);
  const type = firstString(raw.bbLoanType, raw.loanType, (raw as { loan_type?: unknown }).loan_type);
  const amort = firstString(
    raw.amortizationType,
    (raw as { amortization_type?: unknown }).amortization_type,
    (raw as { amortization?: unknown }).amortization,
  );
  return {
    ...raw,
    ...(rate != null ? { rate } : {}),
    ...(pts != null ? { pts } : {}),
    ...(price != null ? { price } : {}),
    ...(pi != null ? { principalAndInterest: pi } : {}),
    ...(term != null ? { loanTerm: term } : {}),
    ...(name ? { productName: name } : {}),
    ...(type ? { bbLoanType: type } : {}),
    ...(amort ? { amortizationType: amort } : {}),
  };
}

export function asProductRows(payload: unknown): RateflowProductRow[] {
  const deep = collectProductRows(payload, []);
  if (deep.length) return deep;
  return rawRowsFromPayload(payload)
    .filter((row): row is Record<string, unknown> => isRecord(row))
    .map(normalizeProductRow);
}

function looksExcludedProduct(text: string): boolean {
  return /fha|va\b|usda|heloc|heloan|non-?qm|jumbo|\barm\b|adjustable/.test(text);
}

/** Years. Engines sometimes send months (360 → 30). Rateflow uses `term`. */
export function termYearsFromRow(row: RateflowProductRow): number | undefined {
  const raw = firstNumber(row.loanTerm, row.amortizationTerm, row.term);
  if (raw != null && raw > 0) {
    if (raw >= 120 && raw <= 480 && raw % 12 === 0) return raw / 12;
    if (raw <= 50) return raw;
  }
  const named = String(row.productName ?? row.label ?? "").match(/\b(15|20|25|30|40)\s*(?:yr|year)\b/i);
  if (named) return Number(named[1]);
  return undefined;
}

function isConventional(row: RateflowProductRow): boolean {
  if (!Number.isFinite(Number(row.rate))) return false;
  const type = String(row.bbLoanType ?? row.loanType ?? "").toLowerCase();
  const name = String(row.productName ?? row.label ?? "").toLowerCase();
  const amort = String(row.amortizationType ?? "").toLowerCase();
  if (looksExcludedProduct(type) || looksExcludedProduct(name)) return false;
  if (amort && amort !== "fixed") return false;
  // Refinance rows often send loanType "Fixed" (or nothing), not "conventional".
  // The request already asks for conventional. Only drop known other programs.
  return true;
}

/** pts when present; otherwise 100 − price. Missing both → unknown. */
export function pointsFromRow(row: RateflowProductRow): number | undefined {
  const pts = Number(row.pts);
  if (Number.isFinite(pts)) return pts;
  const price = Number(row.price);
  if (Number.isFinite(price)) return TARGET_PRICE - price;
  return undefined;
}

function hasNoPointsCost(row: RateflowProductRow): boolean {
  const pts = pointsFromRow(row);
  return pts != null && pts <= 0;
}

function lowestNoPointsSort(left: RateflowProductRow, right: RateflowProductRow): number {
  const rateDiff = Number(left.rate) - Number(right.rate);
  if (rateDiff !== 0) return rateDiff;
  return (pointsFromRow(left) ?? 0) - (pointsFromRow(right) ?? 0);
}

/**
 * One conventional 30: among rows with points <= 0, the lowest note rate.
 * Never lead with a row that charges points. Do not take max rebate or
 * closest-to-par if a lower coupon is par or has a credit. No 30 with
 * points <= 0 → null (Pricing when the file is ready). Other terms do
 * not fill in.
 */
export function pickConventional30LowestNoPoints(
  rows: RateflowProductRow[],
): RateflowProductRow | null {
  const eligible = rows.filter(
    (row) => isConventional(row) && termYearsFromRow(row) === 30 && hasNoPointsCost(row),
  );
  if (!eligible.length) return null;
  return [...eligible].sort(lowestNoPointsSort)[0] ?? null;
}

/**
 * Refinance lead: lowest conventional 30 with credit >= 1.00 (pts <= -1.00).
 * If none, the best credit (most negative points). Par is not a credit.
 */
export function pickConventional30NoCost(rows: RateflowProductRow[]): RateflowProductRow | null {
  const conv30 = rows.filter(
    (row) => isConventional(row) && termYearsFromRow(row) === 30 && Number.isFinite(Number(row.rate)),
  );
  const withPts = conv30.filter((row) => pointsFromRow(row) != null);
  const bigCredit = withPts.filter((row) => (pointsFromRow(row) ?? 0) <= -1);
  if (bigCredit.length) {
    return [...bigCredit].sort(lowestNoPointsSort)[0] ?? null;
  }
  const anyCredit = withPts.filter((row) => (pointsFromRow(row) ?? 0) < 0);
  if (!anyCredit.length) return null;
  return [...anyCredit].sort((left, right) => {
    const ptsDiff = (pointsFromRow(left) ?? 0) - (pointsFromRow(right) ?? 0);
    if (ptsDiff !== 0) return ptsDiff;
    return Number(left.rate) - Number(right.rate);
  })[0] ?? null;
}

export function pickLeadRow(
  rows: RateflowProductRow[],
  purpose: RateflowPurpose,
): RateflowProductRow | null {
  if (purpose === "refinance") {
    return pickConventional30NoCost(rows) ?? pickConventional30LowestNoPoints(rows);
  }
  return pickConventional30LowestNoPoints(rows);
}

/** `ok: false` without `empty: true` is a flake — retry. Ready line only on a real empty book. */
export function parseRateflowQuoteMiss(input: unknown): "empty" | "retryable" | null {
  if (!input || typeof input !== "object") return "retryable";
  const raw = input as Record<string, unknown>;
  if (raw.ok === true) return null;
  if (raw.empty === true) return "empty";
  return "retryable";
}

export function safeCouponRowsFromProducts(rows: RateflowProductRow[]): SafeCouponRow[] {
  const out: SafeCouponRow[] = [];
  for (const row of rows) {
    if (!isConventional(row) || termYearsFromRow(row) !== 30) continue;
    const rate = Number(row.rate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 25) continue;
    const pts = pointsFromRow(row);
    const pi = Number(row.principalAndInterest);
    const price = Number(row.price);
    out.push({
      rate,
      ...(pts != null ? { pts } : {}),
      ...(Number.isFinite(pi) && pi > 0 ? { principalAndInterest: pi } : {}),
      ...(Number.isFinite(price) ? { price } : {}),
    });
  }
  return out;
}

function couponPts(row: SafeCouponRow): number | undefined {
  return pointsFromRow(row);
}

/** One-point quotes often print as 1.044. Do not cap under 0.50. */
export const LOWER_PAYMENT_MAX_PTS = 1.05;

/** Lowest note rate among conventional 30 rows with points <= 1.00 (1.05 to include 1.044). */
export function pickLowerPaymentFromRows(rows: SafeCouponRow[]): SafeCouponRow | null {
  const eligible = rows.filter((row) => {
    const pts = couponPts(row);
    return Number.isFinite(row.rate) && pts != null && pts <= LOWER_PAYMENT_MAX_PTS;
  });
  if (!eligible.length) return null;
  return [...eligible].sort((left, right) => {
    const rateDiff = left.rate - right.rate;
    if (rateDiff !== 0) return rateDiff;
    return (couponPts(left) ?? 0) - (couponPts(right) ?? 0);
  })[0] ?? null;
}

/**
 * Prefer credit >= 1.00 (points <= -1.00), lowest coupon among those.
 * If none, the best credit (most negative points). Par is not a credit.
 */
export function pickNoCostFromRows(rows: SafeCouponRow[]): SafeCouponRow | null {
  const withPts = rows.filter((row) => Number.isFinite(row.rate) && couponPts(row) != null);
  const bigCredit = withPts.filter((row) => (couponPts(row) ?? 0) <= -1);
  if (bigCredit.length) {
    return [...bigCredit].sort((left, right) => {
      const rateDiff = left.rate - right.rate;
      if (rateDiff !== 0) return rateDiff;
      return (couponPts(left) ?? 0) - (couponPts(right) ?? 0);
    })[0] ?? null;
  }
  const anyCredit = withPts.filter((row) => (couponPts(row) ?? 0) < 0);
  if (!anyCredit.length) return null;
  return [...anyCredit].sort((left, right) => {
    const ptsDiff = (couponPts(left) ?? 0) - (couponPts(right) ?? 0);
    if (ptsDiff !== 0) return ptsDiff;
    return left.rate - right.rate;
  })[0] ?? null;
}

export function sameCouponNumbers(
  left: { rate?: number; pts?: number } | null | undefined,
  right: { rate?: number; pts?: number } | null | undefined,
): boolean {
  if (!left || !right) return false;
  if (Number(left.rate) !== Number(right.rate)) return false;
  return Math.abs((left.pts ?? 0) - (right.pts ?? 0)) < 0.0005;
}

export function liveQuoteFromCouponRow(
  row: SafeCouponRow,
  key: string,
  asOf: string,
): { key: string; rate: number; asOf: string; principalAndInterest?: number; pts?: number } {
  const pts = couponPts(row);
  return {
    key,
    rate: row.rate,
    asOf,
    ...(row.principalAndInterest != null ? { principalAndInterest: row.principalAndInterest } : {}),
    ...(pts != null ? { pts } : {}),
  };
}

export function parseSafeCouponRows(input: unknown): SafeCouponRow[] {
  if (!input || typeof input !== "object") return [];
  const raw = (input as Record<string, unknown>).rows;
  if (!Array.isArray(raw)) return [];
  const out: SafeCouponRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const rate = Number(row.rate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 25) continue;
    const pts = Number(row.pts);
    const pi = Number(row.principalAndInterest);
    const price = Number(row.price);
    out.push({
      rate,
      ...(Number.isFinite(pts) ? { pts } : {}),
      ...(Number.isFinite(pi) && pi > 0 ? { principalAndInterest: pi } : {}),
      ...(Number.isFinite(price) ? { price } : {}),
    });
  }
  return out;
}

export function firstResultSummary(rows: RateflowProductRow[]): RateflowQuoteReport["first"] | undefined {
  const row = rows[0];
  if (!row) return undefined;
  const rate = Number(row.rate);
  const label = String(row.productName ?? "").trim().slice(0, 80);
  return {
    ...(Number.isFinite(rate) ? { rate } : {}),
    term: termYearsFromRow(row) ?? null,
    ...(label ? { label } : {}),
  };
}

export function eligibleNoPointsCount(rows: RateflowProductRow[]): number {
  return rows.filter(
    (row) => isConventional(row) && termYearsFromRow(row) === 30 && hasNoPointsCost(row),
  ).length;
}

export function quoteRowSample(rows: RateflowProductRow[]): RateflowQuoteReport["sample"] {
  return rows.slice(0, 12).map((row) => {
    const rate = Number(row.rate);
    const pts = pointsFromRow(row);
    return {
      ...(Number.isFinite(rate) ? { rate } : {}),
      ...(pts != null ? { pts } : {}),
      term: termYearsFromRow(row) ?? null,
    };
  });
}

/** Every conventional 30 the lead picker can see. Note rate + points only. */
export function conventional30Book(rows: RateflowProductRow[]): { rate: number; pts?: number }[] {
  const book: { rate: number; pts?: number }[] = [];
  for (const row of rows) {
    if (!isConventional(row) || termYearsFromRow(row) !== 30) continue;
    const rate = Number(row.rate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 25) continue;
    const pts = pointsFromRow(row);
    book.push({ rate, ...(pts != null ? { pts } : {}) });
  }
  return book.sort((left, right) => {
    const rateDiff = left.rate - right.rate;
    if (rateDiff !== 0) return rateDiff;
    return (left.pts ?? 99) - (right.pts ?? 99);
  });
}

export function lowestNoPointsFromBook(
  book: { rate: number; pts?: number }[],
): { rate: number; pts?: number } | null {
  const eligible = book.filter((row) => row.pts != null && row.pts <= 0);
  if (!eligible.length) return null;
  return [...eligible].sort((left, right) => {
    const rateDiff = left.rate - right.rate;
    if (rateDiff !== 0) return rateDiff;
    return (left.pts ?? 0) - (right.pts ?? 0);
  })[0] ?? null;
}

export function safeQuoteFromRow(row: RateflowProductRow, now = new Date()): SafeLiveQuote | null {
  const rate = Number(row.rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 25) return null;
  const pi = Number(row.principalAndInterest);
  const pts = Number(row.pts);
  const term = termYearsFromRow(row);
  return {
    rate,
    asOf: now.toISOString(),
    ...(Number.isFinite(pi) && pi > 0 ? { principalAndInterest: pi } : {}),
    ...(Number.isFinite(pts) ? { pts } : {}),
    ...(term && term !== 30 ? { term } : {}),
  };
}

export function formatRatePercent(rate: number): string {
  return `${rate.toFixed(3)}%`;
}

export function formatAsOfPacific(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${time} PT`;
}

export function formatPiMonthly(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatPts(pts: number): string {
  const rounded = Math.round(pts * 1000) / 1000;
  return `${rounded} pts`;
}

export function liveRateLine(quote: SafeLiveQuote): string {
  const asOf = formatAsOfPacific(quote.asOf);
  const when = asOf ? `Live as of ${asOf}` : "Live";
  const term = quote.term != null && quote.term !== 30 ? `${quote.term}-year · ` : "";
  return `${formatRatePercent(quote.rate)} · ${term}${when} · not a lock`;
}

/** Spoken File line after address Use this. One Fox bubble. */
export function liveLoanNowCopy(quote: SafeLiveQuote): string {
  const rate = formatRatePercent(quote.rate);
  const clock = formatAsOfPacific(quote.asOf).replace(/\s*PT$/, "");
  const bits = [`This loan right now: ${rate}.`];
  if (quote.principalAndInterest != null) {
    bits.push(`P&I ${formatPiMonthly(quote.principalAndInterest)}.`);
  }
  if (quote.pts != null) {
    const pts = Math.round(quote.pts * 1000) / 1000;
    bits.push(`${pts} pts.`);
  }
  bits.push("Not a lock.");
  if (clock) bits.push(`As of ${clock} PT.`);
  return bits.join(" ");
}

export function liveRateSecondLine(quote: SafeLiveQuote): string | undefined {
  const bits: string[] = [];
  if (quote.principalAndInterest != null) {
    bits.push(`P&I ${formatPiMonthly(quote.principalAndInterest)}`);
  }
  if (quote.pts != null) {
    bits.push(formatPts(quote.pts));
  }
  return bits.length ? bits.join(" · ") : undefined;
}

export function liveRateExplain(quote: SafeLiveQuote): string {
  const second = liveRateSecondLine(quote);
  return second
    ? `${liveRateLine(quote)}. ${second}. I cannot set, lock, or invent a live rate.`
    : `${liveRateLine(quote)}. I cannot set, lock, or invent a live rate.`;
}

export function parseSafeQuoteResponse(input: unknown): SafeLiveQuote | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (raw.ok !== true) return null;
  const quote = raw.quote && typeof raw.quote === "object" ? (raw.quote as Record<string, unknown>) : raw;
  const rate = Number(quote.rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 25) return null;
  const asOf = typeof quote.asOf === "string" ? quote.asOf : "";
  const pi = Number(quote.principalAndInterest);
  const pts = Number(quote.pts);
  const term = Number(quote.term);
  return {
    rate,
    asOf,
    ...(Number.isFinite(pi) && pi > 0 ? { principalAndInterest: pi } : {}),
    ...(Number.isFinite(pts) ? { pts } : {}),
    ...(Number.isFinite(term) && term > 0 && term !== 30 ? { term } : {}),
  };
}
