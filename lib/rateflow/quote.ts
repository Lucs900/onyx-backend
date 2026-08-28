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
};

export type SafeLiveQuote = {
  rate: number;
  asOf: string;
  principalAndInterest?: number;
  pts?: number;
  /** Years. Omitted on conventional 30 so the Structure line stays the default live form. */
  term?: number;
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
  return isRecord(payload) && "status" in payload;
}

export function asProductRows(payload: unknown): RateflowProductRow[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter((row): row is RateflowProductRow => isRecord(row));
}

function looksExcludedProduct(text: string): boolean {
  return /fha|va\b|usda|heloc|heloan|non-?qm|jumbo|\barm\b|adjustable/.test(text);
}

/** Years. Engines sometimes send months (360 → 30). */
export function termYearsFromRow(row: RateflowProductRow): number | undefined {
  const raw = Number(row.loanTerm ?? row.amortizationTerm);
  if (Number.isFinite(raw) && raw > 0) {
    if (raw >= 120 && raw <= 480 && raw % 12 === 0) return raw / 12;
    if (raw <= 50) return raw;
  }
  const named = String(row.productName ?? "").match(/\b(15|20|25|30|40)\s*(?:yr|year)\b/i);
  if (named) return Number(named[1]);
  return undefined;
}

function isConventional(row: RateflowProductRow): boolean {
  if (!Number.isFinite(Number(row.rate))) return false;
  const type = String(row.bbLoanType ?? row.loanType ?? "").toLowerCase();
  const name = String(row.productName ?? "").toLowerCase();
  const amort = String(row.amortizationType ?? "").toLowerCase();
  if (looksExcludedProduct(type) || looksExcludedProduct(name)) return false;
  if (amort && amort !== "fixed") return false;
  if (type && !/conventional|conv|conforming|fnma|fhlmc|fannie|freddie/.test(type)) return false;
  return true;
}

function nearParSort(left: RateflowProductRow, right: RateflowProductRow): number {
  const leftGap = Math.abs(Number(left.price ?? TARGET_PRICE) - TARGET_PRICE);
  const rightGap = Math.abs(Number(right.price ?? TARGET_PRICE) - TARGET_PRICE);
  if (leftGap !== rightGap) return leftGap - rightGap;
  const leftPts = Math.abs(Number(left.pts ?? 0));
  const rightPts = Math.abs(Number(right.pts ?? 0));
  if (leftPts !== rightPts) return leftPts - rightPts;
  return Number(left.rate) - Number(right.rate);
}

/**
 * Prefer conventional 30 closest to par. If the only conventional rows are
 * other terms, take the closest-to-par conventional and keep its term.
 * Empty array or no conventional rows → null (honest fallback).
 */
export function pickConventional30NearPar(rows: RateflowProductRow[]): RateflowProductRow | null {
  const conventional = rows.filter(isConventional);
  if (!conventional.length) return null;
  const thirty = conventional.filter((row) => termYearsFromRow(row) === 30);
  const pool = thirty.length ? thirty : conventional;
  return [...pool].sort(nearParSort)[0] ?? null;
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
