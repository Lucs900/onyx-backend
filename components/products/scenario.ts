import { getProduct } from "./catalog";

export const SCENARIO_STORAGE_KEY = "onyx.productExplorer.scenario";

export type LoanPurpose =
  | "purchase"
  | "rate-term-refi"
  | "cash-out"
  | "heloc-heloan"
  | "investment"
  | "construction"
  | "other";

export type CreditRange =
  | "760+"
  | "720-759"
  | "680-719"
  | "640-679"
  | "below-640"
  | "not-sure";

export type Occupancy = "primary" | "second-home" | "investment";

export type Timeline = "ready-now" | "30-90" | "exploring";

export type AmountMode = "loan" | "down";

export type ExplorerScenario = {
  productSlug?: string;
  productName?: string;
  zip: string;
  purpose: LoanPurpose;
  propertyValue: number;
  amountMode: AmountMode;
  loanAmount?: number;
  downPayment?: number;
  creditRange: CreditRange;
  occupancy: Occupancy;
  timeline?: Timeline;
};

export const PURPOSE_OPTIONS: { value: LoanPurpose; label: string }[] = [
  { value: "purchase", label: "Purchase" },
  { value: "rate-term-refi", label: "Rate/Term Refi" },
  { value: "cash-out", label: "Cash-Out" },
  { value: "heloc-heloan", label: "HELOC/HELOAN" },
  { value: "investment", label: "Investment" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" },
];

export const CREDIT_OPTIONS: { value: CreditRange; label: string }[] = [
  { value: "760+", label: "760+" },
  { value: "720-759", label: "720–759" },
  { value: "680-719", label: "680–719" },
  { value: "640-679", label: "640–679" },
  { value: "below-640", label: "Below 640" },
  { value: "not-sure", label: "Not sure" },
];

export const OCCUPANCY_OPTIONS: { value: Occupancy; label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "second-home", label: "Second home" },
  { value: "investment", label: "Investment" },
];

export const TIMELINE_OPTIONS: { value: Timeline; label: string }[] = [
  { value: "ready-now", label: "Ready now" },
  { value: "30-90", label: "30–90 days" },
  { value: "exploring", label: "Exploring" },
];

const PURPOSE_FROM_PRODUCT: Record<string, LoanPurpose> = {
  "conventional-purchase": "purchase",
  "conventional-rate-term-refinance": "rate-term-refi",
  "conventional-cash-out-refinance": "cash-out",
  "heloc-heloan": "heloc-heloan",
  "investment-second-home": "investment",
  construction: "construction",
  "private-hard-money": "construction",
  jumbo: "purchase",
  fha: "purchase",
  va: "purchase",
};

export function purposeFromProduct(slug?: string): LoanPurpose | "" {
  if (!slug) return "";
  return PURPOSE_FROM_PRODUCT[slug] ?? "";
}

export function occupancyFromProduct(slug?: string): Occupancy | "" {
  return slug === "investment-second-home" ? "investment" : "";
}

export function isCaliforniaZip(zip: string) {
  if (!/^\d{5}$/.test(zip) || zip === "00000") return false;
  const n = Number(zip);
  return n >= 90001 && n <= 96162;
}

export function parseDollars(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return NaN;
  return Number(digits);
}

export function formatDollars(value: number) {
  return value.toLocaleString("en-US");
}

export function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value?: T,
) {
  return options.find((option) => option.value === value)?.label ?? "";
}

export function scenarioFromProduct(slug?: string): Partial<ExplorerScenario> {
  const product = slug ? getProduct(slug) : undefined;
  const purpose = purposeFromProduct(slug);
  const occupancy = occupancyFromProduct(slug);
  return {
    productSlug: product?.slug,
    productName: product?.name,
    purpose: purpose || undefined,
    occupancy: occupancy || undefined,
  };
}

export function writeScenario(scenario: ExplorerScenario) {
  try {
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario));
  } catch {
    // Private mode / quota — the encoded query string still carries the scenario.
  }
}

function isStoredScenario(value: unknown): value is ExplorerScenario {
  if (!value || typeof value !== "object") return false;
  const s = value as ExplorerScenario;
  if (!isCaliforniaZip(s.zip)) return false;
  if (!PURPOSE_OPTIONS.some((option) => option.value === s.purpose)) return false;
  if (!Number.isFinite(s.propertyValue) || s.propertyValue <= 0) return false;
  if (s.amountMode !== "loan" && s.amountMode !== "down") return false;
  if (!CREDIT_OPTIONS.some((option) => option.value === s.creditRange)) return false;
  if (!OCCUPANCY_OPTIONS.some((option) => option.value === s.occupancy)) return false;
  return true;
}

export function readScenario(): ExplorerScenario | null {
  try {
    const raw = sessionStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredScenario(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Query token for the 760+ band. A raw `+` is treated as a space by URL parsers. */
const CREDIT_760_PLUS_TOKEN = "760-plus";

function creditRangeToQuery(range: CreditRange): string {
  return range === "760+" ? CREDIT_760_PLUS_TOKEN : range;
}

function creditRangeFromQuery(raw: string | null): CreditRange | null {
  if (!raw) return null;
  const token = raw.trim().replace(/\s+/g, "");
  if (token === CREDIT_760_PLUS_TOKEN || token === "760+" || token === "760") {
    return "760+";
  }
  return CREDIT_OPTIONS.some((option) => option.value === token)
    ? (token as CreditRange)
    : null;
}

function appendEncoded(pairs: string[], key: string, value: string) {
  pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
}

export function scenarioToQuery(scenario: ExplorerScenario): string {
  const pairs: string[] = [];
  if (scenario.productSlug) appendEncoded(pairs, "product", scenario.productSlug);
  appendEncoded(pairs, "zip", scenario.zip);
  appendEncoded(pairs, "purpose", scenario.purpose);
  appendEncoded(pairs, "propertyValue", String(scenario.propertyValue));
  appendEncoded(pairs, "amountMode", scenario.amountMode);
  if (scenario.loanAmount != null) {
    appendEncoded(pairs, "loanAmount", String(scenario.loanAmount));
  }
  if (scenario.downPayment != null) {
    appendEncoded(pairs, "downPayment", String(scenario.downPayment));
  }
  appendEncoded(pairs, "creditRange", creditRangeToQuery(scenario.creditRange));
  appendEncoded(pairs, "occupancy", scenario.occupancy);
  if (scenario.timeline) appendEncoded(pairs, "timeline", scenario.timeline);
  return pairs.join("&");
}

type QueryLike = { get: (name: string) => string | null };

export function scenarioFromQuery(params: QueryLike): ExplorerScenario | null {
  const zip = params.get("zip") ?? "";
  const purpose = params.get("purpose");
  const propertyValue = Number(params.get("propertyValue"));
  const amountMode = params.get("amountMode");
  const creditRange = creditRangeFromQuery(params.get("creditRange"));
  const occupancy = params.get("occupancy");

  const purposeValue = PURPOSE_OPTIONS.find((option) => option.value === purpose)?.value;
  const occupancyValue = OCCUPANCY_OPTIONS.find(
    (option) => option.value === occupancy,
  )?.value;

  if (!isCaliforniaZip(zip)) return null;
  if (!purposeValue) return null;
  if (!Number.isFinite(propertyValue) || propertyValue <= 0) return null;
  if (amountMode !== "loan" && amountMode !== "down") return null;
  if (!creditRange) return null;
  if (!occupancyValue) return null;

  const productSlug = params.get("product") || undefined;
  const product = productSlug ? getProduct(productSlug) : undefined;
  const loanAmount = params.get("loanAmount");
  const downPayment = params.get("downPayment");
  const timelineRaw = params.get("timeline");
  const timeline = TIMELINE_OPTIONS.some((option) => option.value === timelineRaw)
    ? (timelineRaw as Timeline)
    : undefined;

  return {
    productSlug: product?.slug,
    productName: product?.name,
    zip,
    purpose: purposeValue,
    propertyValue,
    amountMode,
    loanAmount: loanAmount ? Number(loanAmount) : undefined,
    downPayment: downPayment ? Number(downPayment) : undefined,
    creditRange,
    occupancy: occupancyValue,
    timeline,
  };
}

/** Shareable filled-results query for preview / QA. Not a live quote. */
export const FILLED_RESULTS_PREVIEW_QUERY = scenarioToQuery({
  zip: "94129",
  purpose: "purchase",
  propertyValue: 1_200_000,
  amountMode: "loan",
  loanAmount: 960_000,
  downPayment: 240_000,
  creditRange: "760+",
  occupancy: "primary",
  timeline: "30-90",
  productSlug: "conventional-purchase",
  productName: "Conventional Purchase",
});
