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

export type NamedDebt = {
  name: string;
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
  govProgram?: "fha" | "va" | "usda";
  wantsCreditDecision?: boolean;
  requestedHuman?: boolean;
  commitmentRequired?: boolean;
  unresolvedConflict?: boolean;
  askedWillIQualify?: boolean;
  debts?: NamedDebt[];
  statedMonthlyDebts?: number;
  statedAvailableAssets?: number;
  propertyType?: "sfr" | "condo" | "two_to_four";
  subjectAddress?: string;
  statedTimeOnJob?: number;
  statedCurrentHousing?: number;
  statedDeclaration?: "none" | "event";
  statedHousehold?: "alone" | "with_someone";
  borrowerName?: string;
  statedOtherReo?: "none" | "yes";
  suggestedMonthlyIncome?: number;
  docsSkipped?: boolean;
  obviousHighDti?: boolean;
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
  fundsInPlay?: boolean;
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
export const READINESS_STRONG =
  "Based on everything so far, this looks like it would qualify under conventional guidelines. Final underwriting still decides.";
export const READINESS_UW_REVIEW = "I can run this past underwriting before we go further.";
export const READINESS_THIN_PREFIX = "Not enough yet to tell. Still useful: ";
export const READINESS_NOT_READY_PREFIX = "This does not look ready yet.";
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
const READINESS_SUGGEST = "Readiness from the File. Final underwriting still decides.";

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
    READINESS_SUGGEST,
    "",
    READINESS_UW_REVIEW,
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
  const rendered =
    topicId === "language.will_i_qualify"
      ? readinessFromFile(file).line
      : renderStoreLine(found.borrowerLine, file);
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
  if ((purchase || file.purposeHint === "cash_out" || file.fundsInPlay) && !received.has("bank_statement")) {
    stillUseful.push(DOCUMENTED_STILL_USEFUL.bank_statement);
  }
  if (!received.has("employer_business")) stillUseful.push("employer/business");
  if (wantsSeYears(file.incomeType) && !received.has("se_years")) stillUseful.push("SE years");
  if (file.incomeType && file.statedMonthlyDebts == null) stillUseful.push("stated monthly debts");
  if (file.incomeType && file.statedAvailableAssets == null) stillUseful.push("stated available assets");
  if (file.incomeType && !file.propertyType) stillUseful.push("property type");
  if (
    (file.incomeType === "w2" ||
      file.incomeType === "w2_base" ||
      file.incomeType === "w2_variable" ||
      file.incomeType === "both" ||
      file.incomeType === "w2_plus_se") &&
    file.statedTimeOnJob == null
  ) {
    stillUseful.push("time on job");
  }
  if (file.incomeType && file.statedCurrentHousing == null) stillUseful.push("current housing");
  if (file.incomeType && !file.statedDeclaration) stillUseful.push("declarations");
  if (file.incomeType && !file.statedHousehold) stillUseful.push("household");
  if (file.statedHousehold === "with_someone") stillUseful.push("other borrower details");
  if (file.incomeType && !file.borrowerName) stillUseful.push("borrower");
  if (file.incomeType && !file.statedOtherReo) stillUseful.push("other real estate");
  if (file.statedOtherReo === "yes") stillUseful.push("other property details");

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
  if (file.statedOtherReo === "yes" && !received.has("mortgage_statement") && !ids.includes("mortgage_statement")) {
    ids.push("mortgage_statement");
  }
  if ((purchase || file.purposeHint === "cash_out" || file.fundsInPlay) && !received.has("bank_statement")) {
    ids.push("bank_statement");
  }
  return ids;
}

export type ReadinessKind = "strong" | "not_ready" | "thin" | "uw_review";

export type ReadinessRead = {
  kind: ReadinessKind;
  line: string;
  reason?: string;
};

function receivedSet(file: CompletenessFile) {
  return new Set(file.received ?? []);
}

function taxReturnsOnFile(file: CompletenessFile) {
  return file.taxReturnCount ?? (receivedSet(file).has("tax_return") ? 1 : 0);
}

function conventionalPurchaseOrLcor(file: FileFacts) {
  if (file.product === "heloc" || file.product === "jumbo" || file.product === "other") return false;
  if (file.purposeHint === "cash_out") return false;
  if (file.product === "buy" || file.purposeHint === "purchase") return true;
  if (file.product === "refinance" || file.purposeHint === "lcor") return true;
  return false;
}

function layer1SketchPresent(file: CompletenessFile) {
  const occupancy = Boolean(file.occupancy);
  const income = Boolean(file.incomeType);
  const credit = Boolean(file.statedCreditBand);
  const purchase = file.purposeHint === "purchase" || file.product === "buy";
  const lcor =
    file.purposeHint === "lcor" || (file.product === "refinance" && file.purposeHint !== "cash_out");
  const purchaseSketch =
    purchase && Boolean(file.purchasePrice) && (Boolean(file.downPayment) || Boolean(file.loanAmount));
  const lcorSketch = Boolean(lcor && file.loanAmount && file.propertyValue);
  return occupancy && income && credit && (purchaseSketch || lcorSketch);
}

function californiaFile(file: FileFacts) {
  return file.state === "CA";
}

function namedDebtOnFile(file: FileFacts): string | undefined {
  const name = file.debts?.find((debt) => debt.name.trim())?.name.trim();
  return name || undefined;
}

/** Other monthly debts that are obviously large vs suggested income. Never a printed DTI. */
export function obviouslyLargeStatedDebts(file: FileFacts) {
  const debts = file.statedMonthlyDebts;
  const income = file.suggestedMonthlyIncome;
  if (debts == null || income == null || debts <= 0 || income <= 0) return false;
  return debts >= income * 0.5;
}

function moneyShown(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** Confirmed assets obviously below purchase cash down. Never invents closing costs or months. */
export function fundsShortOfDown(file: FileFacts) {
  const assets = file.statedAvailableAssets;
  const down = file.downPayment;
  if (assets == null || down == null || down <= 0) return false;
  return assets < down;
}

export function fundsShortLine(file: FileFacts): string | undefined {
  if (!fundsShortOfDown(file) || file.downPayment == null) return undefined;
  return notReadyLine(
    `Available funds look short of the ${moneyShown(file.downPayment)} down payment.`,
    "More cash to close would likely help.",
  );
}

function someIncomeDocsReceived(file: CompletenessFile) {
  const received = receivedSet(file);
  return (
    received.has("paystub") ||
    received.has("w2") ||
    received.has("tax_return") ||
    (file.w2Count ?? 0) > 0 ||
    taxReturnsOnFile(file) > 0
  );
}

/** Path known and the required package for that path is on the File. Does not recalculate income. */
export function incomeDocumentedEnough(file: CompletenessFile): boolean {
  const received = receivedSet(file);
  const returns = taxReturnsOnFile(file);
  const both = file.incomeType === "w2_plus_se" || file.incomeType === "both";
  const se =
    file.incomeType === "se_schedule_c" ||
    file.incomeType === "k1_ordinary" ||
    file.incomeType === "self-employed";
  const w2 =
    file.incomeType === "w2" ||
    file.incomeType === "w2_base" ||
    file.incomeType === "w2_variable";
  if (both) return received.has("paystub") && received.has("w2") && returns >= 1;
  if (se) return returns >= 1;
  if (w2) return received.has("paystub") && received.has("w2");
  return false;
}

function missingRequiredIncomeDocs(file: CompletenessFile): string[] {
  if (!file.incomeType) return [];
  const received = receivedSet(file);
  const returns = taxReturnsOnFile(file);
  const both = file.incomeType === "w2_plus_se" || file.incomeType === "both";
  const se =
    file.incomeType === "se_schedule_c" ||
    file.incomeType === "k1_ordinary" ||
    file.incomeType === "self-employed";
  const w2 =
    file.incomeType === "w2" ||
    file.incomeType === "w2_base" ||
    file.incomeType === "w2_variable";
  const missing: string[] = [];
  if (w2 || both) {
    if (!received.has("paystub")) missing.push("a latest paystub");
    if (!received.has("w2") && (file.w2Count ?? 0) < 1) missing.push("a W-2");
  }
  if (se || both) {
    if (returns < 1) missing.push("a tax return");
  }
  if (file.incomeType === "other" && returns < 1) missing.push("a tax return");
  return missing;
}

function joinMissingDocs(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function capitalizePhrase(phrase: string) {
  return phrase ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : phrase;
}

function missingIncomeDocReason(file: CompletenessFile): string | undefined {
  const missing = missingRequiredIncomeDocs(file);
  if (!missing.length) return undefined;
  const named = joinMissingDocs(missing);
  return missing.length === 1
    ? `${capitalizePhrase(named)} is still missing.`
    : `${capitalizePhrase(named)} are still missing.`;
}

function missingIncomeDocFix(file: CompletenessFile): string {
  const debt = namedDebtOnFile(file);
  if (debt) return `Paying off ${debt} would likely help.`;
  const missing = missingRequiredIncomeDocs(file);
  if (!missing.length) return "Those income docs would likely help.";
  return `${capitalizePhrase(joinMissingDocs(missing))} would likely help.`;
}

function productMismatchReason(file: FileFacts): string | undefined {
  if (file.govProgram === "fha") return "That’s an FHA path.";
  if (file.govProgram === "va") return "That’s a VA path.";
  if (file.govProgram === "usda") return "That’s a USDA path.";
  if (file.namedGovvie) return "That’s a government program.";
  if (file.product === "heloc") return "That’s a HELOC, not a conventional purchase or refinance.";
  if (file.product === "jumbo") return "That’s a jumbo path.";
  if (file.product === "other") return "That product is not a conventional purchase or refinance.";
  return undefined;
}

function readinessFix(file: FileFacts, kind: "ltv" | "docs" | "product" | "dti"): string {
  const debt = namedDebtOnFile(file);
  if (debt) return `Paying off ${debt} would likely help.`;
  if (kind === "ltv" || kind === "dti") return "More down payment would likely help.";
  if (kind === "docs") return "Those income docs would likely help.";
  return "A conventional file would likely help.";
}

function notReadyLine(reason: string, fix: string): string {
  return `${READINESS_NOT_READY_PREFIX} ${reason} ${fix}`;
}

function thinLine(file: CompletenessFile): string {
  const product = file.product ?? "";
  const list = completeness(product, file).stillUseful;
  const shown = (list.length ? list.join(" · ") : NOTHING_URGENT_MISSING).replace(/\.$/, "");
  return `${READINESS_THIN_PREFIX}${shown}.`;
}

function outsideNormalPattern(file: CompletenessFile) {
  if (file.occupancy === "investment") return true;
  if (file.purposeHint === "cash_out") return true;
  if (file.namedDistress || file.statedDeclaration === "event") return true;
  if (file.state && file.state !== "CA") return true;
  if (lowestCreditBand(file.statedCreditBand)) return true;
  if (loanAboveCeiling(file) && file.product !== "jumbo") return true;
  if (file.incomeType === "other" && someIncomeDocsReceived(file)) return true;
  return false;
}

function strongEligible(file: CompletenessFile) {
  if (!californiaFile(file)) return false;
  if (!conventionalPurchaseOrLcor(file)) return false;
  if (!layer1SketchPresent(file)) return false;
  if (!incomeDocumentedEnough(file)) return false;
  if (file.occupancy === "investment") return false;
  if (file.propertyType === "condo" || file.propertyType === "two_to_four") return false;
  if (file.statedTimeOnJob != null && file.statedTimeOnJob < 24) return false;
  if (file.purposeHint === "cash_out") return false;
  if (file.namedGovvie || file.govProgram) return false;
  if (file.namedDistress || file.statedDeclaration === "event") return false;
  if (file.unresolvedConflict) return false;
  if (loanExceedsPrice(file)) return false;
  const ltv = sketchedPurchaseLtvFromFacts(file);
  if (ltv != null && ltv > HIGH_PURCHASE_LTV) return false;
  if (lowestCreditBand(file.statedCreditBand)) return false;
  if (loanAboveCeiling(file)) return false;
  return true;
}

/** File-based will-I-qualify / readiness pick. Never recalculates income. */
export function readinessFromFile(file: FileFacts): ReadinessRead {
  const complete: CompletenessFile = file;
  if (file.unresolvedConflict) {
    return { kind: "uw_review", line: READINESS_UW_REVIEW, reason: "unresolvedConflict" };
  }
  if (loanExceedsPrice(file)) {
    return {
      kind: "uw_review",
      line: READINESS_UW_REVIEW,
      reason: file.commitmentRequired ? "loanExceedsPrice-intentional" : "loanExceedsPrice",
    };
  }
  if (outsideNormalPattern(complete)) {
    return { kind: "uw_review", line: READINESS_UW_REVIEW, reason: "outside-pattern" };
  }

  const mismatch = productMismatchReason(file);
  if (mismatch) {
    return {
      kind: "not_ready",
      line: notReadyLine(mismatch, readinessFix(file, "product")),
      reason: mismatch,
    };
  }

  const ltv = sketchedPurchaseLtvFromFacts(file);
  if (ltv != null && ltv > HIGH_PURCHASE_LTV && ltv <= 1) {
    return {
      kind: "not_ready",
      line: notReadyLine("This loan is a large share of the price.", readinessFix(file, "ltv")),
      reason: "high-ltv",
    };
  }

  const fundsShort = fundsShortLine(file);
  if (fundsShort) {
    return { kind: "not_ready", line: fundsShort, reason: "funds-short" };
  }

  if (file.propertyType === "condo" || file.propertyType === "two_to_four") {
    return { kind: "uw_review", line: READINESS_UW_REVIEW, reason: "property-type" };
  }

  if (file.statedTimeOnJob != null && file.statedTimeOnJob < 24) {
    return { kind: "uw_review", line: READINESS_UW_REVIEW, reason: "time-on-job" };
  }

  if (
    file.incomeType &&
    layer1SketchPresent(complete) &&
    !incomeDocumentedEnough(complete) &&
    missingRequiredIncomeDocs(complete).length
  ) {
    const reason = missingIncomeDocReason(complete) ?? "Income docs for this path are still missing.";
    return {
      kind: "not_ready",
      line: notReadyLine(reason, missingIncomeDocFix(complete)),
      reason,
    };
  }

  if (file.obviousHighDti && namedDebtOnFile(file)) {
    const debt = namedDebtOnFile(file)!;
    return {
      kind: "not_ready",
      line: notReadyLine("Debts on this file look high.", `Paying off ${debt} would likely help.`),
      reason: "high-dti",
    };
  }

  if (obviouslyLargeStatedDebts(file)) {
    const debt = namedDebtOnFile(file);
    if (debt) {
      return {
        kind: "not_ready",
        line: notReadyLine("Debts on this file look high.", `Paying off ${debt} would likely help.`),
        reason: "high-stated-debts",
      };
    }
    if (strongEligible(complete)) {
      return { kind: "uw_review", line: READINESS_UW_REVIEW, reason: "high-stated-debts" };
    }
    return {
      kind: "not_ready",
      line: notReadyLine("Debts on this file look high.", readinessFix(file, "dti")),
      reason: "high-stated-debts",
    };
  }

  if (strongEligible(complete)) {
    return { kind: "strong", line: READINESS_STRONG };
  }

  return { kind: "thin", line: thinLine(complete), reason: "thin-file" };
}
