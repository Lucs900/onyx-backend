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
    "income docs (latest paystub, W-2, and latest return)",
  ),
  ...bothAgencies(
    "completeness",
    "income-docs-self-employed",
    "income docs (latest return)",
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
/** Sketch high-LTV flag when LTV > 80%. Not a max LTV cell. Do not restore 97%. */
export const HIGH_PURCHASE_LTV = 0.8;
export const HIGH_SKETCH_LTV = HIGH_PURCHASE_LTV;

export type GuidelineStatus = "working" | "partial" | "empty-as-thin";
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
  manufactured?: boolean;
  coop?: boolean;
  pud?: boolean;
  condoNewOrConverted?: boolean;
  condoDeveloperControl?: boolean;
  condoHasProjectFacts?: boolean;
  condoHasHoaDocs?: boolean;
  condoIneligibleNamed?: boolean;
  rentalNamed?: boolean;
  hasScheduleE?: boolean;
  hasLease?: boolean;
  unsupportedRental?: boolean;
  subordinateBalance?: number;
  citizenship?: "us_citizen" | "permanent_resident" | "other";
  subjectAddress?: string;
  statedTimeOnJob?: number;
  statedCurrentHousing?: number;
  statedDeclaration?: "none" | "event";
  declarationTiming?: string;
  statedHousehold?: "alone" | "with_someone";
  coborrowerName?: string;
  borrowerName?: string;
  statedOtherReo?: "none" | "yes";
  suggestedMonthlyIncome?: number;
  docsSkipped?: boolean;
  obviousHighDti?: boolean;
  estimatedHousing?: number;
  statedDti?: number;
  hoaMonthly?: number;
  miApplies?: boolean;
  suggestedNetRental?: number;
  rentalNetRole?: "income" | "liability" | "none" | "thin";
  rentalNeedsStatement?: boolean;
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
export const CASH_OUT_CAUTION = "You want cash from the refinance. Pricing waits.";
export const CASH_OUT_FLAG_CAUTION = CASH_OUT_CAUTION;
export const HIGH_LTV_CAUTION = "This loan is a large share of the price. I’ll keep gathering.";
export const JUMBO_CEILING_LINE =
  "This loan is above the 2026 high-cost ceiling. I can treat it as jumbo if you want.";
export const GOVVIE_LINE =
  "That’s a government loan. I can keep this sketch. Pricing waits.";
export const DISTRESS_LINE = "I can keep preparing this file. Pricing waits.";
export const LOW_CREDIT_CAUTION = "I’ll keep gathering. Pricing waits.";
export const SECOND_HOME_CAUTION = "Second home. I’ll keep gathering.";
export const TWO_TO_FOUR_CAUTION = "Two-to-four unit. I’ll keep gathering.";
export const MANUFACTURED_CAUTION = "Manufactured home. I’ll keep gathering.";
export const CONDO_NON_WARRANTABLE_CAUTION =
  "This condo looks like it needs a licensed review. I can keep preparing the file.";
export const RENTAL_UNSUPPORTED_CAUTION =
  "I don’t have a rental path for that yet. I’ll keep gathering.";
export const HIGH_STATED_DTI_CAUTION =
  "This stated payment is a large share of the income I have. I’ll keep gathering.";
export const RENTAL_NET_COST_CAUTION =
  "This rental looks like a monthly cost. I’ll keep gathering.";
export const READINESS_STRONG =
  "This file looks conventionally strong enough to keep moving. Final underwriting still decides.";
export const READINESS_UW_REVIEW = "I can run this past underwriting before we go further.";
export const READINESS_THIN_PREFIX = "This file is still thin. ";
export const READINESS_NOT_READY_PREFIX = "Not ready yet — ";
export const LOAN_OVER_PRICE_LINE =
  "The loan is larger than the purchase price. Want to change the price, the down payment, or the loan?";
export const BANK_STATEMENT_WOULD_HELP = "A recent bank statement would help.";
export const LAST_YEAR_RETURN_WOULD_HELP = "Last year’s tax return would help.";
export const RENTAL_DOCS_WOULD_HELP = "A Schedule E or a current lease would help.";
export const CONDO_NEW_CONSTRUCTION_ACK = "Noted. This is a new-construction condo.";
export const CONFLICT_NOT_READY = "The File has a conflict on this number.";
export const COST_LINE =
  "I don’t have a live fee quote. The preview rate is not live. I won’t invent a closing-cost number.";
export const ACR_BENEFITS_LINE =
  "Fox keeps working after close. On-time payments earn a calculated reward. When the numbers are strong, Fox can help save more, use equity, or prepare another property. When the timing is wrong, Fox waits.";
export const TIMELINE_LINE = "No close date yet. Sketch now, documents next, review after Proceed.";
export const PHONE_LINE = "Yes. Same file on your phone — type below or tap a reply.";
export const LOAN_OVER_PRICE_TEMPLATE = LOAN_OVER_PRICE_LINE;
export const ESCALATE_LINE =
  "A licensed originator is on this exception. I stay here. I’ll put their result in this thread.";
export const STAY_LINE = "I stay on this file.";
export const NOTHING_URGENT_MISSING = "Nothing urgent missing.";
export const OTHER_REO_MORTGAGE_STATEMENTS = "Mortgage statements for all properties owned.";
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

const CITE_FNMA_RENTAL_E: AgencyCite = {
  agency: "fnma",
  id: "B3-3.8-01",
  title: "Rental Income",
  url: "https://selling-guide.fanniemae.com/sel/b3-3.8-01/rental-income",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_LEASE: AgencyCite = {
  agency: "fnma",
  id: "B3-3.6-05",
  title: "Documentation Requirements for Current Housing Expense",
  url: "https://selling-guide.fanniemae.com/sel/b3-3.6-05/documentation-requirements",
  asOf: CONVENTIONAL_KNOWLEDGE_STORE_AS_OF,
  verified: true,
};

const CITE_FNMA_CONDO: AgencyCite = {
  agency: "fnma",
  id: "B4-2.1-01",
  title: "General Information on Project Standards",
  url: "https://selling-guide.fanniemae.com/sel/b4-2.1-01/general-information-project-standards",
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
    "working",
    [CITE_FNMA_PURCHASE],
    ["ID", "income docs", "address", "contract", "bank statement"],
    "Prepare a purchase file. Pricing waits until the sketch is ready.",
    "",
    "I can prepare a purchase file.",
  ),
  "purpose.lcor": topic(
    "purpose.lcor",
    "working",
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
    "working",
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
    SECOND_HOME_CAUTION,
    SECOND_HOME_CAUTION,
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
    "working",
    [CITE_FNMA_INCOME, CITE_FNMA_WAGE_DOCS],
    ["income docs", "employer/business"],
    INCOME_NUMBERS_STAY,
    "",
    "W-2 income stays on the income module.",
  ),
  "income.w2": topic(
    "income.w2",
    "working",
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
  "income.se_1084": topic(
    "income.se_1084",
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
  "income.rental_sche": topic(
    "income.rental_sche",
    "partial",
    [CITE_FNMA_RENTAL_E],
    ["Schedule E"],
    "Schedule E 12-month average plus add-backs. Confirm before write. Not qualifying income.",
    "",
    RENTAL_DOCS_WOULD_HELP,
  ),
  "income.rental_lease": topic(
    "income.rental_lease",
    "partial",
    [CITE_FNMA_LEASE],
    ["lease"],
    "75% of gross monthly rent. Confirm before write. Not qualifying income.",
    "",
    RENTAL_DOCS_WOULD_HELP,
  ),
  "income.rental_thin": topic(
    "income.rental_thin",
    "empty-as-thin",
    [CITE_FNMA_RENTAL_E, CITE_FNMA_LEASE],
    ["Schedule E", "lease"],
    "Wait. A Schedule E or a current lease would help.",
    RENTAL_UNSUPPORTED_CAUTION,
    RENTAL_UNSUPPORTED_CAUTION,
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
  "credit.stated": topic(
    "credit.stated",
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
    ["purchase price", "down payment", "loan amount", "property value"],
    "Sketch LTV only — loan/price or loan/value. Not a decision.",
    "",
    LTV_NOT_A_DECISION,
  ),
  "ltv.high": topic(
    "ltv.high",
    "partial",
    [CITE_FNMA_LTV],
    ["purchase price", "loan amount"],
    "Sketch LTV above 80%. Label, not a decision.",
    HIGH_LTV_CAUTION,
    HIGH_LTV_CAUTION,
  ),
  "ltv.ceiling": topic(
    "ltv.ceiling",
    "partial",
    [CITE_FHFA_2026],
    ["loan amount"],
    "Above the 2026 high-cost ceiling, offer jumbo once.",
    JUMBO_CEILING_LINE,
    JUMBO_CEILING_LINE,
  ),
  "ltv.loan_over_price": topic(
    "ltv.loan_over_price",
    "partial",
    [CITE_FNMA_PURCHASE],
    ["purchase price", "loan amount"],
    "Number-check first. Escalate only if intentional.",
    "",
    LOAN_OVER_PRICE_LINE,
    ["a number under the purchase price works"],
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
  "assets.summary": topic(
    "assets.summary",
    "partial",
    [],
    ["bank statement"],
    "Confirmed assets vs down. Empty-as-thin if no statement.",
    "",
    BANK_STATEMENT_WOULD_HELP,
  ),
  "declarations.late": topic(
    "declarations.late",
    "empty-as-thin",
    [],
    [],
    "Declarations stay late. Citizenship is a late File value only.",
    "",
    STAY_LINE,
  ),
  "declarations.distress": topic(
    "declarations.distress",
    "empty-as-thin",
    [],
    [],
    "Volunteer BK / FC is a quiet flag only. No clocks.",
    DISTRESS_LINE,
    DISTRESS_LINE,
  ),
  "property.1unit": topic(
    "property.1unit",
    "working",
    [],
    ["property type"],
    "One-unit. Keep gathering.",
    "",
    STAY_LINE,
  ),
  "property.2to4": topic(
    "property.2to4",
    "partial",
    [],
    ["property type"],
    "Two-to-four unit. Keep gathering.",
    TWO_TO_FOUR_CAUTION,
    TWO_TO_FOUR_CAUTION,
  ),
  "property.manufactured": topic(
    "property.manufactured",
    "partial",
    [],
    ["property type"],
    "Manufactured home. Keep gathering.",
    MANUFACTURED_CAUTION,
    MANUFACTURED_CAUTION,
  ),
  "condo.warrantable": topic(
    "condo.warrantable",
    "working",
    [CITE_FNMA_CONDO],
    [],
    "Internal only. Do not announce warrantable or approved.",
    "",
    "",
  ),
  "condo.needs_review": topic(
    "condo.needs_review",
    "empty-as-thin",
    [CITE_FNMA_CONDO],
    [],
    "Internal only. Project review is processor-side, not a borrower collect.",
    "",
    CONDO_NEW_CONSTRUCTION_ACK,
  ),
  "condo.non_warrantable": topic(
    "condo.non_warrantable",
    "partial",
    [CITE_FNMA_CONDO],
    [],
    "Named ineligible signal. Stay. Not a denial.",
    CONDO_NON_WARRANTABLE_CAUTION,
    CONDO_NON_WARRANTABLE_CAUTION,
  ),
  "overlay.cashout": topic(
    "overlay.cashout",
    "partial",
    [CITE_FNMA_CASH_OUT],
    ["ID", "income docs", "address", "mortgage statement", "bank statement"],
    "Prepare the refinance file. Pricing waits.",
    CASH_OUT_CAUTION,
    CASH_OUT_CAUTION,
  ),
  "overlay.investment": topic(
    "overlay.investment",
    "partial",
    [CITE_FNMA_OCCUPANCY],
    ["occupancy"],
    "Investment use. Pricing waits. Rental income does not clear this flag.",
    INVESTMENT_CAUTION,
    INVESTMENT_CAUTION,
  ),
  "overlay.high_ltv": topic(
    "overlay.high_ltv",
    "partial",
    [CITE_FNMA_LTV],
    ["purchase price", "loan amount"],
    "Sketch LTV above 80%. Label, not a decision.",
    HIGH_LTV_CAUTION,
    HIGH_LTV_CAUTION,
  ),
  "flags.distress": topic(
    "flags.distress",
    "empty-as-thin",
    [],
    [],
    "Keep preparing. Pricing waits.",
    DISTRESS_LINE,
    DISTRESS_LINE,
  ),
  "flags.govvie": topic(
    "flags.govvie",
    "empty-as-thin",
    [],
    [],
    "Keep the conventional sketch. No government-program rules in this store.",
    GOVVIE_LINE,
    GOVVIE_LINE,
  ),
  "language.will_i_qualify": topic(
    "language.will_i_qualify",
    "empty-as-thin",
    [],
    LOCKED_REMAINDER.slice(),
    READINESS_SUGGEST,
    "",
    READINESS_STRONG,
  ),
  "language.cost": topic(
    "language.cost",
    "empty-as-thin",
    [],
    [],
    "No invented fee, rate, or closing-cost number.",
    "",
    COST_LINE,
  ),
  "language.acr_benefits": topic(
    "language.acr_benefits",
    "empty-as-thin",
    [],
    [],
    "Relationship-start copy stays locked.",
    "",
    ACR_BENEFITS_LINE,
  ),
  "language.timeline": topic(
    "language.timeline",
    "empty-as-thin",
    [],
    [],
    "No invented close date.",
    "",
    TIMELINE_LINE,
  ),
  "language.phone": topic(
    "language.phone",
    "empty-as-thin",
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
    "Number-check first. Escalate only if they confirm it is intentional.",
    "",
    LOAN_OVER_PRICE_LINE,
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
  return sketchedLtvFromFacts(file);
}

/** Formula only: loan/price or loan/value. Label, not a decision. */
export function sketchedLtvFromFacts(file: FileFacts): number | null {
  const value = file.purchasePrice ?? file.propertyValue;
  const loan = file.loanAmount ?? purchaseLoan(file);
  if (value == null || value <= 0 || loan == null || loan <= 0) return null;
  return loan / value;
}

/** Typed hook only. Do not invent a CLTV decision. */
export function sketchedCltvFromFacts(file: FileFacts): number | null {
  if (file.subordinateBalance == null || file.subordinateBalance <= 0) return null;
  const value = file.purchasePrice ?? file.propertyValue;
  const loan = file.loanAmount ?? purchaseLoan(file);
  if (value == null || value <= 0 || loan == null || loan <= 0) return null;
  return (loan + file.subordinateBalance) / value;
}

export type CondoFlag = "warrantable" | "needs_review" | "non_warrantable";

const CONDO_INELIGIBLE =
  /\b(hotel|condotel|resort|timeshare|fractional|houseboat|continuing care|rental pooling|critical repairs?|evacuation|insolvency)\b/i;

export function namedCondoIneligible(text?: string | null): boolean {
  return Boolean(text && CONDO_INELIGIBLE.test(text));
}

export function namedNewOrConvertedCondo(text?: string | null): boolean {
  if (!text) return false;
  return /\b(new(ly)?\s+converted|new\s+construction(\s+condo)?|new\s+condo|newly\s+built\s+condo|developer control)\b/i.test(
    text,
  );
}

export function namedCondoLanguage(text?: string | null): boolean {
  return Boolean(text && /\b(condo|condominium|condotel)\b/i.test(text));
}

/** Three values only. No project-review engine. No CPM/PERS. */
export function condoFlag(file: FileFacts): CondoFlag | undefined {
  if (file.coop) return "needs_review";
  if (file.pud && file.propertyType !== "condo") return undefined;
  if (file.propertyType !== "condo" && !file.condoIneligibleNamed) return undefined;
  if (file.condoIneligibleNamed) return "non_warrantable";
  if (file.propertyType !== "condo") return undefined;
  if (
    file.condoNewOrConverted ||
    file.condoDeveloperControl ||
    file.condoHasProjectFacts === false ||
    file.condoHasHoaDocs === false ||
    (!file.condoHasHoaDocs && !file.condoHasProjectFacts)
  ) {
    return "needs_review";
  }
  return "warrantable";
}

function lowestCreditBand(band?: string) {
  if (!band) return false;
  if (
    band === "700-719" ||
    band === "680-699" ||
    band === "680-719" ||
    band === "660-679" ||
    band === "640-659" ||
    band === "640-679" ||
    band === "620-639" ||
    band === "below-640"
  ) {
    return true;
  }
  const score = Number(band);
  return Number.isFinite(score) && score < 720;
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
  const ltv = sketchedLtvFromFacts(file);
  const condo = condoFlag(file);
  let caution: string | undefined;
  if (lowestCreditBand(file.statedCreditBand)) caution = LOW_CREDIT_CAUTION;
  else if (file.namedGovvie || file.govProgram) caution = GOVVIE_LINE;
  else if (file.purposeHint === "cash_out") caution = CASH_OUT_CAUTION;
  else if (file.occupancy === "investment") caution = INVESTMENT_CAUTION;
  else if (file.occupancy === "second" || file.occupancy === "second-home") caution = SECOND_HOME_CAUTION;
  else if (ltv != null && ltv > HIGH_PURCHASE_LTV && ltv <= 1) caution = HIGH_LTV_CAUTION;
  else if (loanAboveCeiling(file)) caution = JUMBO_CEILING_LINE;
  else if (file.namedDistress || file.statedDeclaration === "event") caution = DISTRESS_LINE;
  else if (file.propertyType === "two_to_four") caution = TWO_TO_FOUR_CAUTION;
  else if (file.manufactured) caution = MANUFACTURED_CAUTION;
  else if (condo === "non_warrantable") caution = CONDO_NON_WARRANTABLE_CAUTION;
  else if (file.unsupportedRental) caution = RENTAL_UNSUPPORTED_CAUTION;
  else if (file.suggestedNetRental != null && file.suggestedNetRental < 0) {
    caution = RENTAL_NET_COST_CAUTION;
  }
  else if (file.statedDti != null && file.statedDti >= 1) caution = HIGH_STATED_DTI_CAUTION;

  const previewRateAllowed =
    conventionalPurchaseOrRefi(file) &&
    file.occupancy !== "investment" &&
    file.purposeHint !== "cash_out" &&
    !file.namedGovvie &&
    !file.govProgram &&
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
        "empty-as-thin",
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
  const taxReturns = file.taxReturnCount ?? (received.has("tax_return") ? 1 : 0);
  if (wageLike(file.incomeType) && !seLike(file.incomeType) && taxReturns < 1) {
    const primaryW2In = received.has("paystub") && (file.w2Count ?? 0) >= 1;
    if (primaryW2In) stillUseful.push(DOCUMENTED_STILL_USEFUL.tax_return);
  }
  if (file.statedHousehold === "with_someone") stillUseful.push("other borrower details");
  if (file.incomeType && !file.statedOtherReo) stillUseful.push("other real estate");
  if (file.statedOtherReo === "yes") {
    stillUseful.push("other property details");
    if (!received.has("mortgage_statement")) stillUseful.push(OTHER_REO_MORTGAGE_STATEMENTS);
  } else if (file.rentalNeedsStatement) {
    stillUseful.push(OTHER_REO_MORTGAGE_STATEMENTS);
  }
  if (seLike(file.incomeType) && taxReturns < 1) {
    const idx = stillUseful.indexOf(DOCUMENTED_STILL_USEFUL.tax_return);
    if (idx >= 0) stillUseful[idx] = LAST_YEAR_RETURN_WOULD_HELP;
    else stillUseful.push(LAST_YEAR_RETURN_WOULD_HELP);
  }
  if (fundsShortOfDown(file) && !received.has("bank_statement")) {
    const idx = stillUseful.indexOf(DOCUMENTED_STILL_USEFUL.bank_statement);
    if (idx >= 0) stillUseful[idx] = BANK_STATEMENT_WOULD_HELP;
    else stillUseful.push(BANK_STATEMENT_WOULD_HELP);
  }
  if ((file.rentalNamed || file.occupancy === "investment") && !file.hasScheduleE && !file.hasLease) {
    stillUseful.push(RENTAL_DOCS_WOULD_HELP);
  }

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

function notReadyLine(reason: string): string {
  const cited = reason.replace(/\.$/, "");
  return `${READINESS_NOT_READY_PREFIX}${cited}.`;
}

function oneStillUseful(file: CompletenessFile): string {
  const list = completeness(file.product ?? "", file).stillUseful;
  if (!list.length) return NOTHING_URGENT_MISSING;
  const first = list[0];
  return first.endsWith(".") ? first : `${first}.`;
}

function thinLine(file: CompletenessFile): string {
  return `${READINESS_THIN_PREFIX}${oneStillUseful(file)}`;
}

function strongEligible(file: CompletenessFile) {
  if (!californiaFile(file)) return false;
  if (!conventionalPurchaseOrLcor(file)) return false;
  if (!layer1SketchPresent(file)) return false;
  if (!incomeDocumentedEnough(file)) return false;
  if (file.occupancy === "investment") return false;
  if (file.occupancy === "second" || file.occupancy === "second-home") return false;
  if (file.propertyType === "two_to_four" || file.manufactured) return false;
  const condo = condoFlag(file);
  if (condo === "needs_review" || condo === "non_warrantable") return false;
  if (file.statedTimeOnJob != null && file.statedTimeOnJob < 24) return false;
  if (file.purposeHint === "cash_out") return false;
  if (file.namedGovvie || file.govProgram) return false;
  if (file.namedDistress || file.statedDeclaration === "event") return false;
  if (file.unsupportedRental) return false;
  if (file.unresolvedConflict) return false;
  if (loanExceedsPrice(file)) return false;
  const ltv = sketchedLtvFromFacts(file);
  if (ltv != null && ltv > HIGH_PURCHASE_LTV) return false;
  if (lowestCreditBand(file.statedCreditBand)) return false;
  if (loanAboveCeiling(file)) return false;
  return true;
}

function flagAsNotReadyReason(file: FileFacts): string | undefined {
  const flagged = flags(file).caution;
  return flagged;
}

/** File-based will-I-qualify / readiness pick. Three shapes only. Never recalculates income. */
export function readinessFromFile(file: FileFacts): ReadinessRead {
  const complete: CompletenessFile = file;
  if (file.unresolvedConflict) {
    return { kind: "not_ready", line: notReadyLine(CONFLICT_NOT_READY), reason: "unresolvedConflict" };
  }
  if (loanExceedsPrice(file)) {
    return {
      kind: "not_ready",
      line: notReadyLine("The loan is larger than the purchase price."),
      reason: file.commitmentRequired ? "loanExceedsPrice-intentional" : "loanExceedsPrice",
    };
  }

  const mismatch = productMismatchReason(file);
  if (mismatch) {
    return { kind: "not_ready", line: notReadyLine(mismatch), reason: mismatch };
  }

  if (!layer1SketchPresent(complete)) {
    return { kind: "thin", line: thinLine(complete), reason: "thin-file" };
  }

  if (
    file.incomeType &&
    !incomeDocumentedEnough(complete) &&
    missingRequiredIncomeDocs(complete).length
  ) {
    const reason = missingIncomeDocReason(complete) ?? "Income docs for this path are still missing.";
    return { kind: "not_ready", line: notReadyLine(reason), reason };
  }

  const fundsShort = fundsShortLine(file);
  if (fundsShort) {
    return { kind: "not_ready", line: fundsShort, reason: "funds-short" };
  }

  if (file.obviousHighDti || obviouslyLargeStatedDebts(file)) {
    return {
      kind: "not_ready",
      line: notReadyLine("Debts on this file look high."),
      reason: "high-dti",
    };
  }

  const condo = condoFlag(complete);
  if (condo === "needs_review") {
    return { kind: "thin", line: thinLine(complete), reason: "condo-needs-review" };
  }

  const caution = flagAsNotReadyReason(file);
  if (caution) {
    return { kind: "not_ready", line: notReadyLine(caution), reason: caution };
  }

  if (file.statedTimeOnJob != null && file.statedTimeOnJob < 24) {
    return {
      kind: "not_ready",
      line: notReadyLine("Time on this job is under two years."),
      reason: "time-on-job",
    };
  }

  if (strongEligible(complete)) {
    return { kind: "strong", line: READINESS_STRONG };
  }

  return { kind: "thin", line: thinLine(complete), reason: "thin-file" };
}
