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
  sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario));
}

export function readScenario(): ExplorerScenario | null {
  try {
    const raw = sessionStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExplorerScenario;
  } catch {
    return null;
  }
}

export function scenarioToQuery(scenario: ExplorerScenario) {
  const params = new URLSearchParams();
  if (scenario.productSlug) params.set("product", scenario.productSlug);
  params.set("zip", scenario.zip);
  params.set("purpose", scenario.purpose);
  params.set("propertyValue", String(scenario.propertyValue));
  params.set("amountMode", scenario.amountMode);
  if (scenario.loanAmount != null) params.set("loanAmount", String(scenario.loanAmount));
  if (scenario.downPayment != null) params.set("downPayment", String(scenario.downPayment));
  params.set("creditRange", scenario.creditRange);
  params.set("occupancy", scenario.occupancy);
  if (scenario.timeline) params.set("timeline", scenario.timeline);
  return params;
}

export function scenarioFromQuery(
  params: URLSearchParams,
): ExplorerScenario | null {
  const zip = params.get("zip") ?? "";
  const purpose = params.get("purpose") as LoanPurpose | null;
  const propertyValue = Number(params.get("propertyValue"));
  const amountMode = params.get("amountMode") as AmountMode | null;
  const creditRange = params.get("creditRange") as CreditRange | null;
  const occupancy = params.get("occupancy") as Occupancy | null;
  if (!zip || !purpose || !amountMode || !creditRange || !occupancy) return null;
  if (!Number.isFinite(propertyValue) || propertyValue <= 0) return null;

  const productSlug = params.get("product") || undefined;
  const product = productSlug ? getProduct(productSlug) : undefined;
  const loanAmount = params.get("loanAmount");
  const downPayment = params.get("downPayment");
  const timeline = (params.get("timeline") as Timeline | null) || undefined;

  return {
    productSlug: product?.slug,
    productName: product?.name,
    zip,
    purpose,
    propertyValue,
    amountMode,
    loanAmount: loanAmount ? Number(loanAmount) : undefined,
    downPayment: downPayment ? Number(downPayment) : undefined,
    creditRange,
    occupancy,
    timeline,
  };
}
