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
    "period × frequency, or YTD / months; flag YTD vs run-rate or W-2 mismatch and use the lower — never blend. Variable overtime / bonus / commission only when extracted; two-year lower only; never invent.",
    {
      base: "period-frequency-or-ytd-months",
      ytdConflict: "flag-lower",
      variable: "extracted-two-year-only",
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
