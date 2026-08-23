/**
 * Internal Fannie/Freddie completeness + income/doc patterns.
 * Queryable store for Fox — not a public page and not a product surface.
 * Conventional only. Does not replace the short-list / Proceed operator.
 */

export const CONVENTIONAL_GUIDELINE_VERSION = "2026.08";

export type ConventionalAgency = "fannie" | "freddie";
export type ConventionalTopic = "completeness" | "income" | "docs";

export type ConventionalGuideline = {
  id: string;
  version: string;
  agency: ConventionalAgency;
  topic: ConventionalTopic;
  key: string;
  pattern: string;
  rules?: Record<string, string>;
};

export type ConventionalGuidelineQuery = {
  agency?: ConventionalAgency;
  topic?: ConventionalTopic;
  key?: string;
};

const SHARED = {
  version: CONVENTIONAL_GUIDELINE_VERSION,
} as const;

function bothAgencies(
  topic: ConventionalTopic,
  key: string,
  pattern: string,
  rules?: Record<string, string>,
): ConventionalGuideline[] {
  return (["fannie", "freddie"] as const).map((agency) => ({
    id: `${agency}-${topic}-${key}-${CONVENTIONAL_GUIDELINE_VERSION}`,
    version: SHARED.version,
    agency,
    topic,
    key,
    pattern,
    ...(rules ? { rules } : {}),
  }));
}

const CONVENTIONAL_GUIDELINES: ConventionalGuideline[] = [
  ...bothAgencies(
    "completeness",
    "purchase",
    "government ID, income docs for that type, property address, purchase contract, bank statement",
  ),
  ...bothAgencies(
    "completeness",
    "refinance",
    "government ID, income docs for that type, property address, mortgage statement; bank statement if cash-out",
  ),
  ...bothAgencies("completeness", "income-docs-w2", "income docs (latest paystub and W-2)"),
  ...bothAgencies(
    "completeness",
    "income-docs-both",
    "income docs (latest paystub, W-2, latest return, and prior-year)",
  ),
  ...bothAgencies(
    "completeness",
    "income-docs-self-employed",
    "income docs (latest return, prior-year, and a YTD P&L if you have it)",
  ),
  ...bothAgencies("completeness", "income-docs", "income docs"),
  ...bothAgencies(
    "income",
    "w2",
    "period × frequency, or YTD / months; flag YTD vs run-rate or W-2 mismatch and use the lower — never blend. Variable overtime / bonus / commission only when extracted; two-year average when stable or rising, later year when declining; one-year is Partial. Second job only from a second document with two-year history. Never invent.",
    {
      base: "period-frequency-or-ytd-months",
      ytdConflict: "flag-lower",
      variable: "extracted-two-year-average-or-later",
      secondJob: "two-documents-two-year",
      blend: "never",
    },
  ),
  ...bothAgencies(
    "income",
    "schedule-c",
    "one year → that year / 12; two years average unless later is lower; material drop uses later year plus the declining caution",
    { declining: "later-year-lower" },
  ),
  ...bothAgencies(
    "income",
    "k1",
    "ordinary / 12 suggested only — not confirmed cash flow",
    { basis: "ordinary-over-12" },
  ),
  ...bothAgencies(
    "income",
    "combined",
    "confirmed wage monthly plus confirmed Schedule C or K-1 ordinary monthly; disclose both methods; confirm before write",
    { basis: "confirmed-sum" },
  ),
  ...bothAgencies("docs", "government_id", "A government ID puts a name on this file."),
  ...bothAgencies("docs", "paystub", "That’s current income on paper."),
  ...bothAgencies("docs", "w2", "That’s last year’s wages on paper."),
  ...bothAgencies("docs", "tax_return", "That’s how I estimate qualifying income. Suggested, not underwritten."),
  ...bothAgencies("docs", "prior_year_return", "It helps me see if last year was stable."),
  ...bothAgencies("docs", "purchase_contract", "The purchase contract is the property on paper."),
  ...bothAgencies("docs", "bank_statement", "A bank statement shows funds on paper."),
  ...bothAgencies("docs", "mortgage_statement", "The mortgage statement is the current loan on paper."),
];

export function queryConventionalGuidelines(
  filter: ConventionalGuidelineQuery = {},
): ConventionalGuideline[] {
  return CONVENTIONAL_GUIDELINES.filter((row) => {
    if (filter.agency && row.agency !== filter.agency) return false;
    if (filter.topic && row.topic !== filter.topic) return false;
    if (filter.key && row.key !== filter.key) return false;
    return true;
  });
}

export function conventionalGuidelinePattern(
  topic: ConventionalTopic,
  key: string,
  fallback: string,
): string {
  return queryConventionalGuidelines({ topic, key })[0]?.pattern ?? fallback;
}

export function conventionalIncomeRules(key: string): Record<string, string> {
  return { ...(queryConventionalGuidelines({ topic: "income", key })[0]?.rules ?? {}) };
}

/* Conventional knowledge store v1 (23 Aug 2026). Extends this file. Never recalculates income. */

export const CONVENTIONAL_KNOWLEDGE_STORE = "v1";
export const CONVENTIONAL_KNOWLEDGE_STORE_AS_OF = "2026-08-23";
export const FHFA_HIGH_COST_CEILING_2026 = 1_249_125;
export const HIGH_PURCHASE_LTV = 0.97;

export type GuidelineStatus = "supported" | "partial" | "unsupported";
export type GuidelineAction = "stay" | "escalate";
export type CompletenessLayer = "sketch" | "documented" | "agency_partial";

export type AgencyCite = {
  agency: "fnma" | "freddie" | "fhfa";
  id: string;
  title: string;
  url: string;
  asOf: string;
  verified: true;
};

export type Topic = {
  id: string;
  status: GuidelineStatus;
  cites: AgencyCite[];
  collect: string[];
  suggest: string;
  caution: string;
  stay: string;
  escalate: string;
  borrowerLine: string;
  neverSay: string[];
};

export type FileFacts = {
  product?: string;
  occupancy?: string;
  purposeHint?: string;
  state?: string;
  purchasePrice?: number;
  downPayment?: number;
  loanAmount?: number;
  propertyValue?: number;
  statedCreditBand?: string;
  incomeType?: string;
  namedGovvie?: boolean;
  namedDistress?: boolean;
  wantsCreditDecision?: boolean;
  requestedHuman?: boolean;
  commitmentRequired?: boolean;
  unresolvedConflict?: boolean;
  askedWillIQualify?: boolean;
};

export type CompletenessFile = FileFacts & {
  received?: string[];
  w2Count?: number;
  taxReturnCount?: number;
  twoYearWageHistory?: boolean;
  variableExtracted?: boolean;
  hasPnl?: boolean;
  k1OrdinaryOnly?: boolean;
  hasScheduleC?: boolean;
};

export const LANGUAGE_LOCK = [
  "approved",
  "eligible",
  "ineligible",
  "you qualify",
  "you don’t qualify",
  "you will qualify",
  "DU",
  "LPA",
  "AUS",
  "Approve",
  "Eligible",
  "agency-ready",
  "underwritten",
  "LO will contact you",
  "we pulled your credit",
  "FICO",
  "representative score",
  "620",
  "DTI",
  "80% cash-out LTV",
] as const;

export const NEVER_SAY = [
  ...LANGUAGE_LOCK,
  "agency_ready",
  "matrix cells",
  "county limits",
] as const;

const NEVER_SAY_LIST = [...NEVER_SAY];

export const INVESTMENT_CAUTION = "Investment occupancy. Pricing waits.";
export const CASH_OUT_CAUTION =
  "You want cash from the refinance. I can keep preparing this file. Pricing waits.";
export const CASH_OUT_FLAG_CAUTION = "You want cash from the refinance. Pricing waits.";
export const HIGH_LTV_CAUTION = "This loan is a large share of the price. I’ll keep gathering.";
export const JUMBO_CEILING_LINE =
  "This loan is above the 2026 high-cost ceiling. I can treat it as jumbo if you want.";
export const GOVVIE_LINE =
  "That’s a government program. I can keep the sketch. A licensed originator can take that path.";
export const DISTRESS_LINE = "I can keep preparing this file. Pricing waits.";
export const LOW_CREDIT_CAUTION = "I’ll keep gathering. Pricing waits.";
export const WILL_I_QUALIFY_LINE =
  "I can prepare a file. I cannot approve or say you qualify. Here’s what still helps, and what’s missing.";
export const COST_LINE =
  "I don’t have a live fee quote. The preview rate is not live. I won’t invent a closing-cost number.";
export const ACR_BENEFITS_LINE =
  "Fox keeps working after close. On-time payments earn a calculated reward. When the numbers are strong, Fox can help save more, use equity, or prepare another property. When the timing is wrong, Fox waits.";
export const TIMELINE_LINE = "No close date yet. Sketch now, documents next, review after Proceed.";
export const PHONE_LINE = "Yes. Same file on your phone — type below or tap a reply.";
export const LOAN_OVER_PRICE_TEMPLATE =
  "The loan is {loanAmount} on a {purchasePrice} price. That usually means the price or the loan amount is wrong. I can edit either one.";
export const ESCALATE_LINE =
  "A licensed originator is on this exception. I stay here. I’ll put their result in this thread.";
export const STAY_LINE = "I stay on this file.";
export const NOTHING_URGENT_MISSING = "Nothing urgent missing.";
export const LTV_NOT_A_DECISION = "Not a decision";
export const EMPLOYER_MISMATCH_LINE =
  "The stub employer and the W-2 employer don’t match. I didn’t invent a second job. Confirm if these are two jobs.";
export const KEEP_BOTH_LINE =
  "You want both conflicting numbers kept. A licensed originator is on this exception. I stay here.";

const CITE_FNMA_OCCUPANCY: AgencyCite = {
  agency: "fnma",
  id: "B2-1.1-01",
  title: "Occupancy Types",
  url: "https://selling-guide.fanniemae.com/sel/b2-1.1-01/occupancy-types",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_LTV: AgencyCite = {
  agency: "fnma",
  id: "B2-1.2-01",
  title: "Loan-to-Value (LTV) Ratios",
  url: "https://selling-guide.fanniemae.com/sel/b2-1.2-01/loan-value-ltv-ratios",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_PURCHASE: AgencyCite = {
  agency: "fnma",
  id: "B2-1.3-01",
  title: "Purchase Transactions",
  url: "https://selling-guide.fanniemae.com/sel/b2-1.3-01/purchase-transactions",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_LCOR: AgencyCite = {
  agency: "fnma",
  id: "B2-1.3-02",
  title: "Limited Cash-Out Refinance Transactions",
  url: "https://selling-guide.fanniemae.com/sel/b2-1.3-02/limited-cash-out-refinance-transactions",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_CASH_OUT: AgencyCite = {
  agency: "fnma",
  id: "B2-1.3-03",
  title: "Cash-Out Refinance Transactions",
  url: "https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_INCOME: AgencyCite = {
  agency: "fnma",
  id: "B3-3.1-01",
  title: "General Income Information",
  url: "https://selling-guide.fanniemae.com/sel/b3-3.1-01/general-income-information",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_WAGE_DOCS: AgencyCite = {
  agency: "fnma",
  id: "B3-3.2-01",
  title: "Standards for Employment and Income Documentation",
  url: "https://selling-guide.fanniemae.com/sel/b3-3.2-01/standards-employment-and-income-documentation",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_WAGE_INCOME: AgencyCite = {
  agency: "fnma",
  id: "B3-3.2-02",
  title: "Standards for Employment-Related Income",
  url: "https://selling-guide.fanniemae.com/sel/b3-3.2-02/standards-employment-related-income",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FHFA_2026: AgencyCite = {
  agency: "fhfa",
  id: "2026-CLL",
  title: "FHFA Announces Conforming Loan Limit Values for 2026",
  url: "https://www.fhfa.gov/news/news-release/fhfa-announces-conforming-loan-limit-values-for-2026",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const INCOME_NUMBERS_STAY = "Income numbers stay in the income module. This store never recalculates income.";
const PREPARE_ONLY = "I can prepare a file. I cannot say you qualify.";

function topic(
  id: string,
  status: GuidelineStatus,
  cites: AgencyCite[],
  collect: string[],
  suggest: string,
  caution: string,
  borrowerLine: string,
  extraNever: string[] = [],
): Topic {
  return {
    id,
    status,
    cites,
    collect,
    suggest,
    caution,
    stay: STAY_LINE,
    escalate: ESCALATE_LINE,
    borrowerLine,
    neverSay: extraNever.length ? [...NEVER_SAY_LIST, ...extraNever] : NEVER_SAY_LIST,
  };
}

const LOCKED_REMAINDER = [
  "ID",
  "income docs",
  "address",
  "contract",
  "mortgage statement",
  "bank statement",
  "employer/business",
  "SE years",
] as const;

export const TOPICS: Record<string, Topic> = {
  "purpose.purchase": topic(
    "purpose.purchase",
    "supported",
    [CITE_FNMA_PURCHASE],
    ["ID", "income docs", "address", "contract", "bank statement"],
    "Prepare a purchase file. Pricing waits until the sketch is ready.",
    "",
    "I can prepare a purchase file.",
  ),
  "purpose.lcor": topic(
    "purpose.lcor",
    "supported",
    [CITE_FNMA_LCOR],
    ["ID", "income docs", "address", "mortgage statement"],
    "Prepare a refinance file without cash out.",
    "",
    "I can prepare this refinance file.",
  ),
  "purpose.cash_out": topic(
    "purpose.cash_out",
    "partial",
    [CITE_FNMA_CASH_OUT],
    ["ID", "income docs", "address", "mortgage statement", "bank statement"],
    "Prepare the refinance file. Pricing waits.",
    CASH_OUT_CAUTION,
    CASH_OUT_CAUTION,
  ),
  "occupancy.primary": topic(
    "occupancy.primary",
    "supported",
    [CITE_FNMA_OCCUPANCY],
    ["occupancy"],
    "Primary use. Keep gathering.",
    "",
    "Primary occupancy. I can keep preparing this file.",
  ),
  "occupancy.second": topic(
    "occupancy.second",
    "partial",
    [CITE_FNMA_OCCUPANCY],
    ["occupancy"],
    "Second-home use. Keep gathering.",
    "",
    "Second-home occupancy. I can keep preparing this file.",
  ),
  "occupancy.investment": topic(
    "occupancy.investment",
    "partial",
    [CITE_FNMA_OCCUPANCY],
    ["occupancy"],
    "Investment use. Pricing waits.",
    INVESTMENT_CAUTION,
    INVESTMENT_CAUTION,
  ),
  "income.w2_base": topic(
    "income.w2_base",
    "supported",
    [CITE_FNMA_INCOME, CITE_FNMA_WAGE_DOCS],
    ["income docs", "employer/business"],
    INCOME_NUMBERS_STAY,
    "",
    "W-2 income stays on the income module.",
  ),
  "income.w2_variable": topic(
    "income.w2_variable",
    "partial",
    [CITE_FNMA_INCOME, CITE_FNMA_WAGE_INCOME],
    ["income docs", "employer/business"],
    INCOME_NUMBERS_STAY,
    "",
    "Variable income stays on the income module.",
  ),
  "income.second_job": topic(
    "income.second_job",
    "partial",
    [CITE_FNMA_INCOME, CITE_FNMA_WAGE_INCOME],
    ["income docs", "employer/business"],
    INCOME_NUMBERS_STAY,
    "",
    "Second-job income stays on the income module.",
  ),
  "income.se_schedule_c": topic(
    "income.se_schedule_c",
    "partial",
    [CITE_FNMA_INCOME],
    ["income docs", "employer/business", "SE years"],
    INCOME_NUMBERS_STAY,
    "",
    "Self-employed income stays on the income module.",
  ),
  "income.k1_ordinary": topic(
    "income.k1_ordinary",
    "partial",
    [CITE_FNMA_INCOME],
    ["income docs", "employer/business", "SE years"],
    INCOME_NUMBERS_STAY,
    "",
    "K-1 ordinary stays on the income module.",
  ),
  "income.w2_plus_se": topic(
    "income.w2_plus_se",
    "partial",
    [CITE_FNMA_INCOME, CITE_FNMA_WAGE_DOCS],
    ["income docs", "employer/business", "SE years"],
    INCOME_NUMBERS_STAY,
    "",
    "Combined income stays on the income module.",
  ),
  "credit.stated_range": topic(
    "credit.stated_range",
    "partial",
    [],
    ["stated credit range"],
    "A stated range for the sketch. Not a pull.",
    LOW_CREDIT_CAUTION,
    "That’s a stated range. I can keep gathering.",
  ),
  "ltv.sketch": topic(
    "ltv.sketch",
    "partial",
    [CITE_FNMA_LTV, CITE_FNMA_PURCHASE],
    ["purchase price", "down payment", "loan amount"],
    "Sketch LTV only. Not a decision.",
    HIGH_LTV_CAUTION,
    HIGH_LTV_CAUTION,
  ),
  "loan_limits.2026": topic(
    "loan_limits.2026",
    "partial",
    [CITE_FHFA_2026],
    ["loan amount"],
    "Above the 2026 high-cost ceiling, offer jumbo once.",
    JUMBO_CEILING_LINE,
    JUMBO_CEILING_LINE,
  ),
  "flags.distress": topic(
    "flags.distress",
    "unsupported",
    [],
    [],
    "Keep preparing. Pricing waits.",
    DISTRESS_LINE,
    DISTRESS_LINE,
  ),
  "flags.govvie": topic(
    "flags.govvie",
    "unsupported",
    [],
    [],
    "Keep the conventional sketch. No government-program rules in this store.",
    GOVVIE_LINE,
    GOVVIE_LINE,
  ),
  "language.will_i_qualify": topic(
    "language.will_i_qualify",
    "unsupported",
    [],
    LOCKED_REMAINDER.slice(),
    PREPARE_ONLY,
    "",
    WILL_I_QUALIFY_LINE,
  ),
  "language.cost": topic(
    "language.cost",
    "unsupported",
    [],
    [],
    "No invented fee, rate, or closing-cost number.",
    "",
    COST_LINE,
  ),
  "language.acr_benefits": topic(
    "language.acr_benefits",
    "unsupported",
    [],
    [],
    "Relationship-start copy stays locked.",
    "",
    ACR_BENEFITS_LINE,
  ),
  "language.timeline": topic(
    "language.timeline",
    "unsupported",
    [],
    [],
    "No invented close date.",
    "",
    TIMELINE_LINE,
  ),
  "language.phone": topic(
    "language.phone",
    "unsupported",
    [],
    [],
    "Same file on the phone.",
    "",
    PHONE_LINE,
  ),
  "flags.loan_over_price": topic(
    "flags.loan_over_price",
    "partial",
    [CITE_FNMA_PURCHASE],
    ["purchase price", "loan amount"],
    "Write both numbers. This usually means the price or the loan amount is wrong. Offer an edit. Escalate only if they confirm it is intentional.",
    "",
    LOAN_OVER_PRICE_TEMPLATE,
    ["a number under the purchase price works"],
  ),
};

export function topicById(topicId: string): Topic | undefined {
  return TOPICS[topicId];
}

function purchaseLoan(file: FileFacts): number | null {
  if (file.loanAmount != null && file.loanAmount > 0) return file.loanAmount;
  if (file.purchasePrice != null && file.downPayment != null && file.purchasePrice > 0) {
    const implied = Math.round(file.purchasePrice - file.downPayment);
    return implied > 0 ? implied : null;
  }
  return null;
}

export function sketchedPurchaseLtvFromFacts(file: FileFacts): number | null {
  const purchase = file.purposeHint === "purchase" || file.product === "buy";
  if (!purchase) return null;
  const price = file.purchasePrice ?? file.propertyValue;
  const loan = purchaseLoan(file);
  if (price == null || price <= 0 || loan == null || loan <= 0) return null;
  return loan / price;
}

function lowestCreditBand(band?: string) {
  return band === "680-719";
}

function conventionalPurchaseOrRefi(file: FileFacts) {
  if (file.product === "jumbo" || file.product === "heloc" || file.product === "other") return false;
  if (file.product === "buy" || file.product === "refinance") return true;
  return file.purposeHint === "purchase" || file.purposeHint === "lcor" || file.purposeHint === "cash_out";
}

function loanAboveCeiling(file: FileFacts) {
  const loan = file.loanAmount ?? purchaseLoan(file);
  return loan != null && loan > FHFA_HIGH_COST_CEILING_2026;
}

export function loanExceedsPrice(file: FileFacts) {
  const purchase = file.purposeHint === "purchase" || file.product === "buy";
  if (!purchase || file.loanAmount == null || file.purchasePrice == null) return false;
  return file.loanAmount > file.purchasePrice;
}

export function formatStoreMoney(value?: number) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** Fill {loanAmount} / {purchasePrice} from File. Never invent a number the File does not have. */
export function renderStoreLine(template: string, file: FileFacts) {
  const loan = formatStoreMoney(file.loanAmount) || "the loan";
  const price = formatStoreMoney(file.purchasePrice) || "the price";
  return template.replaceAll("{loanAmount}", loan).replaceAll("{purchasePrice}", price);
}

export function flags(file: FileFacts): { caution?: string; previewRateAllowed: boolean } {
  const ltv = sketchedPurchaseLtvFromFacts(file);
  let caution: string | undefined;
  if (file.occupancy === "investment") caution = INVESTMENT_CAUTION;
  else if (file.purposeHint === "cash_out") caution = CASH_OUT_CAUTION;
  else if (ltv != null && ltv > HIGH_PURCHASE_LTV && ltv <= 1) caution = HIGH_LTV_CAUTION;
  else if (loanAboveCeiling(file)) caution = JUMBO_CEILING_LINE;
  else if (file.namedGovvie) caution = GOVVIE_LINE;
  else if (file.namedDistress) caution = DISTRESS_LINE;
  else if (lowestCreditBand(file.statedCreditBand)) caution = LOW_CREDIT_CAUTION;

  const previewRateAllowed =
    conventionalPurchaseOrRefi(file) &&
    file.occupancy !== "investment" &&
    file.purposeHint !== "cash_out" &&
    !file.namedGovvie &&
    !file.namedDistress &&
    !lowestCreditBand(file.statedCreditBand) &&
    !loanAboveCeiling(file) &&
    (!file.state || file.state === "CA");

  return { ...(caution ? { caution } : {}), previewRateAllowed };
}

export function escalate(
  file: FileFacts,
  _event?: string,
): { action: GuidelineAction; reason: string; borrowerLine: string } {
  if (file.requestedHuman) {
    return { action: "escalate", reason: "requestedHuman", borrowerLine: ESCALATE_LINE };
  }
  if (file.commitmentRequired) {
    return { action: "escalate", reason: "commitmentRequired", borrowerLine: ESCALATE_LINE };
  }
  if (file.namedGovvie) {
    return { action: "escalate", reason: "namedGovvie", borrowerLine: ESCALATE_LINE };
  }
  if (file.namedDistress && file.wantsCreditDecision) {
    return { action: "escalate", reason: "namedDistress", borrowerLine: ESCALATE_LINE };
  }
  if (file.unresolvedConflict) {
    return { action: "escalate", reason: "unresolvedConflict", borrowerLine: ESCALATE_LINE };
  }
  if (loanExceedsPrice(file) && file.commitmentRequired) {
    return { action: "escalate", reason: "loanExceedsPrice", borrowerLine: ESCALATE_LINE };
  }
  return { action: "stay", reason: "stay", borrowerLine: STAY_LINE };
}

export function lookup(
  topicId: string,
  file: FileFacts,
): { topic: Topic; action: GuidelineAction; caution?: string; borrowerLine: string } {
  const found = TOPICS[topicId];
  const decision = escalate(file);
  if (!found) {
    return {
      topic: topic(
        topicId,
        "unsupported",
        [],
        [],
        "I can prepare a file.",
        "",
        STAY_LINE,
      ),
      action: decision.action,
      borrowerLine: decision.action === "escalate" ? ESCALATE_LINE : STAY_LINE,
    };
  }
  const flagged = flags(file);
  const caution = found.caution || flagged.caution;
  const rendered = renderStoreLine(found.borrowerLine, file);
  const languageTopic = topicId.startsWith("language.");
  const borrowerLine = languageTopic
    ? rendered
    : decision.action === "escalate" && topicId !== "flags.govvie"
      ? ESCALATE_LINE
      : rendered;
  return {
    topic: found,
    action: languageTopic ? "stay" : decision.action,
    ...(caution ? { caution } : {}),
    borrowerLine,
  };
}

function wageLike(incomeType?: string) {
  return (
    incomeType === "w2" ||
    incomeType === "w2_base" ||
    incomeType === "w2_variable" ||
    incomeType === "w2_plus_se" ||
    incomeType === "both"
  );
}

function seLike(incomeType?: string) {
  return (
    incomeType === "se_schedule_c" ||
    incomeType === "k1_ordinary" ||
    incomeType === "self-employed" ||
    incomeType === "w2_plus_se" ||
    incomeType === "both" ||
    incomeType === "other"
  );
}

function incomeDocsReceived(incomeType: string | undefined, received: Set<string>) {
  if (incomeType === "se_schedule_c" || incomeType === "k1_ordinary" || incomeType === "self-employed") {
    return received.has("tax_return");
  }
  if (incomeType === "w2_plus_se" || incomeType === "both") {
    return received.has("paystub") && received.has("w2") && received.has("tax_return");
  }
  if (incomeType === "other") return received.has("tax_return");
  return received.has("paystub") && received.has("w2");
}

function wantsSeYears(incomeType?: string) {
  return seLike(incomeType);
}

/** Documented-layer Still useful ids. Drop when that class is received. */
export const DOCUMENTED_STILL_USEFUL = {
  government_id: "ID",
  paystub: "latest paystub",
  w2: "W-2",
  "second-year-w2": "second-year W-2",
  tax_return: "latest return",
  "prior-year-return": "prior-year return",
  "k1-distributions": "K-1 distributions",
  "ytd-pnl": "YTD P&L",
  "property-address": "address",
  purchase_contract: "contract",
  mortgage_statement: "mortgage statement",
  bank_statement: "bank statement",
} as const;

export type DocumentedStillUsefulId = keyof typeof DOCUMENTED_STILL_USEFUL;

function documentedIncomeItems(file: CompletenessFile, received: Set<string>): DocumentedStillUsefulId[] {
  const items: DocumentedStillUsefulId[] = [];
  const w2 = wageLike(file.incomeType);
  const se = seLike(file.incomeType);
  const unknown = !file.incomeType;
  const w2Count = file.w2Count ?? (received.has("w2") ? 1 : 0);
  const taxReturns = file.taxReturnCount ?? (received.has("tax_return") ? 1 : 0);
  const twoYear = Boolean(file.twoYearWageHistory);
  if (w2 || unknown) {
    if (!received.has("paystub")) items.push("paystub");
    if (w2Count < 1) items.push("w2");
    if (w2Count === 1 && !twoYear) items.push("second-year-w2");
  }
  if (se || (unknown && !w2)) {
    if (taxReturns < 1) items.push("tax_return");
    if (taxReturns === 1) {
      if (file.k1OrdinaryOnly && !file.hasScheduleC) items.push("k1-distributions");
      else items.push("prior-year-return");
    }
    if (taxReturns >= 1 && !file.hasPnl && !received.has("ytd_pnl")) items.push("ytd-pnl");
  }
  return items;
}

export function completeness(
  product: string,
  file: CompletenessFile,
): { layer: CompletenessLayer; stillUseful: string[] } {
  const received = new Set(file.received ?? []);
  const purchase = product === "buy" || product === "purchase" || file.purposeHint === "purchase";
  const refi =
    product === "refinance" || file.purposeHint === "lcor" || file.purposeHint === "cash_out";
  const stillUseful: string[] = [];
  if (!received.has("government_id")) stillUseful.push(DOCUMENTED_STILL_USEFUL.government_id);
  for (const id of documentedIncomeItems(file, received)) {
    stillUseful.push(DOCUMENTED_STILL_USEFUL[id]);
  }
  if ((purchase || refi) && !received.has("property_address")) {
    stillUseful.push(DOCUMENTED_STILL_USEFUL["property-address"]);
  }
  if (purchase && !received.has("purchase_contract")) {
    stillUseful.push(DOCUMENTED_STILL_USEFUL.purchase_contract);
  }
  if (refi && !received.has("mortgage_statement")) {
    stillUseful.push(DOCUMENTED_STILL_USEFUL.mortgage_statement);
  }
  if ((purchase || file.purposeHint === "cash_out") && !received.has("bank_statement")) {
    stillUseful.push(DOCUMENTED_STILL_USEFUL.bank_statement);
  }
  if (!received.has("employer_business")) stillUseful.push("employer/business");
  if (wantsSeYears(file.incomeType) && !received.has("se_years")) stillUseful.push("SE years");

  const hasSketch = Boolean(file.purchasePrice || file.loanAmount || file.propertyValue);
  const incomeReady = incomeDocsReceived(file.incomeType, received);
  const propertyPaper = received.has("purchase_contract") || received.has("mortgage_statement");
  let layer: CompletenessLayer = "sketch";
  if (hasSketch && received.has("government_id") && incomeReady && propertyPaper) {
    layer = "documented";
  } else if (hasSketch && (received.has("government_id") || incomeReady || propertyPaper)) {
    layer = "agency_partial";
  }

  return { layer, stillUseful };
}

export function documentedStillUsefulIds(
  product: string,
  file: CompletenessFile,
): DocumentedStillUsefulId[] {
  const received = new Set(file.received ?? []);
  const purchase = product === "buy" || product === "purchase" || file.purposeHint === "purchase";
  const refi =
    product === "refinance" || file.purposeHint === "lcor" || file.purposeHint === "cash_out";
  const ids: DocumentedStillUsefulId[] = [];
  if (!received.has("government_id")) ids.push("government_id");
  ids.push(...documentedIncomeItems(file, received));
  if ((purchase || refi) && !received.has("property_address")) ids.push("property-address");
  if (purchase && !received.has("purchase_contract")) ids.push("purchase_contract");
  if (refi && !received.has("mortgage_statement")) ids.push("mortgage_statement");
  if ((purchase || file.purposeHint === "cash_out") && !received.has("bank_statement")) {
    ids.push("bank_statement");
  }
  return ids;
}
