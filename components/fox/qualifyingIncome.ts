import type { ExtractClass, FactProposal, FieldSource, FoxIntakeDraft } from "./types";
import { writeCurrentEmploymentHistory } from "./fileHistory";
import {
  DECLINING_INCOME_CAUTION,
  DECLINING_YEAR_RATIO,
  SUGGESTED_INCOME_NOTE,
  W2_BOX1_MONTHLY_NOTE,
  BOTH_MONTHLY_SKIP_NOTE,
  BOTH_MONTHLY_RAISE_NOTE,
  BOTH_MONTHLY_OT_NOTE,
  BOTH_MONTHLY_SECOND_JOB_NOTE,
  YTD_CONFLICT_CAUTION,
  K1_ORDINARY_NOTE,
  SECOND_JOB_SAME_STUB_NOTE,
  SECOND_JOB_THIN_NOTE,
  bothMonthlyAskCopy,
  bothMonthlyMethodNote,
  bothMonthlyReasonNote,
  parseBothMonthlyReason,
  parseRaiseWhen,
  proposeBothMonthlyIncome,
  proposeRaiseWeightedIncome,
  raiseYtdFarAskCopy,
  RAISE_WHEN_ASK,
  RAISE_YTD_MISSING_NOTE,
  RAISE_WHEN_UNKNOWN_NOTE,
  k1OrdinaryMonthly,
  laterYearIsMateriallyLower,
  monthlyFromAnnual,
  monthsThroughPeriodEnd,
  periodsPerYear,
  scheduleCAnnual,
  stableOrDecliningAnnual,
  suggestCombinedIncome,
  suggestScheduleCIncome,
  suggestWageIncome,
  yearNumber,
  type BothMonthlyReason,
  type QualifyingMethod,
  type RaiseWhen,
  type ScheduleCYearInput,
  type WageSuggestInput,
  type WageYearInput,
} from "@/lib/income/suggest";

export {
  DECLINING_INCOME_CAUTION,
  DECLINING_YEAR_RATIO,
  SUGGESTED_INCOME_NOTE,
  W2_BOX1_MONTHLY_NOTE,
  BOTH_MONTHLY_SKIP_NOTE,
  BOTH_MONTHLY_RAISE_NOTE,
  BOTH_MONTHLY_OT_NOTE,
  BOTH_MONTHLY_SECOND_JOB_NOTE,
  YTD_CONFLICT_CAUTION,
  K1_ORDINARY_NOTE,
  SECOND_JOB_SAME_STUB_NOTE,
  SECOND_JOB_THIN_NOTE,
  bothMonthlyAskCopy,
  bothMonthlyMethodNote,
  bothMonthlyReasonNote,
  parseBothMonthlyReason,
  parseRaiseWhen,
  proposeBothMonthlyIncome,
  proposeRaiseWeightedIncome,
  raiseYtdFarAskCopy,
  RAISE_WHEN_ASK,
  RAISE_YTD_MISSING_NOTE,
  RAISE_WHEN_UNKNOWN_NOTE,
  k1OrdinaryMonthly,
  monthlyFromAnnual,
  monthsThroughPeriodEnd,
  periodsPerYear,
  scheduleCAnnual,
  stableOrDecliningAnnual,
  suggestCombinedIncome,
  suggestScheduleCIncome,
  suggestWageIncome,
  yearNumber,
};
export type { BothMonthlyReason, QualifyingMethod, RaiseWhen, ScheduleCYearInput, WageSuggestInput, WageYearInput };

export const QUALIFYING_INCOME_FIELD = "qualifying_income";
export const TAX_CASHFLOWS_FIELD = "tax_cashflows";

export type TaxReturnKind = "schedule_c" | "k1" | "1065" | "1120s" | "";
export type QualifyingBasis = "schedule_c" | "wage" | "k1" | "combined";

export const WAGE_MONTHLY_FIELD = "wage_monthly";
export const SE_MONTHLY_FIELD = "se_monthly";
export const K1_MONTHLY_FIELD = "k1_monthly";
export const WAGE_JOBS_FIELD = "wage_jobs";
export const PAYSTUB_MONTHLY_FIELD = "paystub_monthly";
export const W2_MONTHLY_FIELD = "w2_monthly";
export const INCOME_CAUTION_FIELD = "income_caution";

export type TaxYearCashflow = {
  tax_year: string;
  return_kind: TaxReturnKind;
  schedule_c_net_profit: string;
  depreciation: string;
  depletion: string;
  business_use_of_home: string;
  nonrecurring_other_income: string;
  amortization: string;
  casualty_loss: string;
  mileage_depreciation: string;
  k1_ordinary_income: string;
  k1_distributions: string;
};

export type QualifyingIncomeResult = {
  monthly: number;
  basis: QualifyingBasis;
  method?: QualifyingMethod;
  caution?: string;
  methodNote?: string;
  needsFrequency?: boolean;
  needsBothReason?: boolean;
  needsRaiseWhen?: boolean;
  needsRaiseYtdFar?: boolean;
  stubMonthly?: number;
  w2Monthly?: number;
  expectedYtd?: number;
  weightNote?: string;
  partialNotes?: string[];
  parts?: { wage?: number; scheduleC?: number; k1?: number };
};

const ENTITY_KINDS = new Set<TaxReturnKind>(["k1", "1065", "1120s"]);

function factValue(draft: FoxIntakeDraft, field: string) {
  return draft.facts?.[field]?.value ?? "";
}

function valuesMatch(left: string, right: string) {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) return false;
  const an = parseExtractMoney(a);
  const bn = parseExtractMoney(b);
  if (an != null && bn != null) return Math.abs(an - bn) < 0.51;
  return a.toLowerCase().replace(/\s+/g, " ") === b.toLowerCase().replace(/\s+/g, " ");
}

function displayMoney(value: string) {
  const n = parseExtractMoney(value);
  if (n == null) return value;
  const shown = `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
  return n < 0 ? `-${shown}` : shown;
}

function incomeFactLabel(field: string) {
  if (field === QUALIFYING_INCOME_FIELD) return "qualifying income";
  if (field === "income") return "income";
  return field.replace(/_/g, " ");
}

export function parseExtractMoney(value?: string | null): number | null {
  let cleaned = String(value ?? "")
    .replace(/[$,]/g, "")
    .replace(/\s/g, "")
    .replace(/[–—−]/g, "-");
  if (!cleaned || /[a-z]/i.test(cleaned)) return null;
  const paren = cleaned.match(/^\((.+)\)$/);
  if (paren) cleaned = `-${paren[1]}`;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function normalizeReturnKind(raw?: string | null): TaxReturnKind {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (!v) return "";
  if (v.includes("schedulec") || v === "c" || v.includes("1040c")) return "schedule_c";
  if (v.includes("k1")) return "k1";
  if (v.includes("1065") || v.includes("partnership")) return "1065";
  if (v.includes("1120s") || v.includes("scorp")) return "1120s";
  return "";
}

function cashflowToScheduleCYear(row: TaxYearCashflow): ScheduleCYearInput | null {
  const kind =
    row.return_kind === "schedule_c" || (!row.return_kind && row.schedule_c_net_profit)
      ? "schedule_c"
      : row.return_kind;
  if (kind !== "schedule_c") return null;
  const netProfit = parseExtractMoney(row.schedule_c_net_profit);
  if (netProfit == null && !row.schedule_c_net_profit) return null;
  return {
    taxYear: row.tax_year,
    netProfit,
    depreciation: parseExtractMoney(row.depreciation),
    depletion: parseExtractMoney(row.depletion),
    businessUseOfHome: parseExtractMoney(row.business_use_of_home),
    nonrecurringOtherIncome: parseExtractMoney(row.nonrecurring_other_income),
    amortization: parseExtractMoney(row.amortization),
    casualtyLoss: parseExtractMoney(row.casualty_loss),
    mileageDepreciation: parseExtractMoney(row.mileage_depreciation),
  };
}

function scheduleCYearsFromCashflows(years: TaxYearCashflow[]): ScheduleCYearInput[] {
  return years.flatMap((row) => {
    const mapped = cashflowToScheduleCYear(row);
    return mapped ? [mapped] : [];
  });
}

function scheduleCUsableYears(years: TaxYearCashflow[]) {
  return scheduleCYearsFromCashflows(years)
    .map((row) => ({
      year: yearNumber(row.taxYear) ?? 0,
      kind: "schedule_c" as const,
      annual: scheduleCAnnual(row),
    }))
    .filter((row): row is { year: number; kind: "schedule_c"; annual: number } => row.annual != null)
    .sort((a, b) => a.year - b.year);
}

/** Later Sch C year is at least 10% below the earlier year. Quiet caution only — not a denial. */
export function laterYearIncomeLower(draft: FoxIntakeDraft): boolean {
  const usable = scheduleCUsableYears(readTaxCashflows(draft));
  if (usable.length < 2) return false;
  return laterYearIsMateriallyLower(usable[usable.length - 2].annual, usable[usable.length - 1].annual);
}

export function decliningIncomeCaution(draft: FoxIntakeDraft): string | undefined {
  return suggestScheduleCIncome(scheduleCYearsFromCashflows(readTaxCashflows(draft)))?.caution;
}

export function formatIncomeMoney(value: number): string {
  const shown = `$${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
  return value < 0 ? `-${shown}` : shown;
}

export function scheduleCYearViews(draft: FoxIntakeDraft): { year: number; annual: number }[] {
  return scheduleCUsableYears(readTaxCashflows(draft));
}

export function readTaxCashflows(draft: FoxIntakeDraft): TaxYearCashflow[] {
  const raw = factValue(draft, TAX_CASHFLOWS_FIELD);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Partial<TaxYearCashflow>;
      const tax_year = String(row.tax_year ?? "").trim();
      if (!tax_year) return [];
      return [
        {
          tax_year,
          return_kind: normalizeReturnKind(row.return_kind),
          schedule_c_net_profit: String(row.schedule_c_net_profit ?? ""),
          depreciation: String(row.depreciation ?? ""),
          depletion: String(row.depletion ?? ""),
          business_use_of_home: String(row.business_use_of_home ?? ""),
          nonrecurring_other_income: String(row.nonrecurring_other_income ?? ""),
          amortization: String(row.amortization ?? ""),
          casualty_loss: String(row.casualty_loss ?? ""),
          mileage_depreciation: String(row.mileage_depreciation ?? ""),
          k1_ordinary_income: String(row.k1_ordinary_income ?? ""),
          k1_distributions: String(row.k1_distributions ?? ""),
        },
      ];
    });
  } catch {
    return [];
  }
}

export function cashflowFromExtract(fields: Record<string, string>): TaxYearCashflow | null {
  const tax_year = String(fields.tax_year ?? "").trim();
  const schedule_c_net_profit = String(fields.schedule_c_net_profit ?? "").trim();
  const k1_ordinary_income = String(fields.k1_ordinary_income ?? "").trim();
  const return_kind = inferReturnKind(fields);
  if (!tax_year && !schedule_c_net_profit && !k1_ordinary_income && !return_kind) return null;
  return {
    tax_year,
    return_kind,
    schedule_c_net_profit,
    depreciation: String(fields.depreciation ?? "").trim(),
    depletion: String(fields.depletion ?? "").trim(),
    business_use_of_home: String(fields.business_use_of_home ?? "").trim(),
    nonrecurring_other_income: String(fields.nonrecurring_other_income ?? "").trim(),
    amortization: String(fields.amortization ?? "").trim(),
    casualty_loss: String(fields.casualty_loss ?? "").trim(),
    mileage_depreciation: String(fields.mileage_depreciation ?? "").trim(),
    k1_ordinary_income,
    k1_distributions: String(fields.k1_distributions ?? "").trim(),
  };
}

export function inferReturnKind(fields: Record<string, string>): TaxReturnKind {
  const named = normalizeReturnKind(fields.return_kind);
  if (named) return named;
  if (String(fields.k1_ordinary_income ?? "").trim() && !String(fields.schedule_c_net_profit ?? "").trim()) {
    return "k1";
  }
  if (String(fields.schedule_c_net_profit ?? "").trim()) return "schedule_c";
  return "";
}

export function mergeTaxCashflows(existing: TaxYearCashflow[], incoming: TaxYearCashflow | null): TaxYearCashflow[] {
  if (!incoming) return existing;
  const key = incoming.tax_year || `unknown-${existing.length}`;
  const next = existing.filter((row) => (row.tax_year || "") !== key);
  next.push({ ...incoming, tax_year: incoming.tax_year || key });
  return next.sort((a, b) => (yearNumber(a.tax_year) ?? 0) - (yearNumber(b.tax_year) ?? 0));
}

function k1Monthly(years: TaxYearCashflow[]): number | null {
  const usable = years
    .map((row) => ({
      year: yearNumber(row.tax_year) ?? 0,
      kind: ENTITY_KINDS.has(row.return_kind) ? row.return_kind : "",
      ordinary: parseExtractMoney(row.k1_ordinary_income),
    }))
    .filter((row) => row.kind && row.ordinary != null)
    .sort((a, b) => a.year - b.year);
  if (!usable.length) return null;
  const latest = usable[usable.length - 1];
  if (latest.ordinary == null) return null;
  return k1OrdinaryMonthly(latest.ordinary);
}

export function k1OrdinaryMissingDistributions(draft: FoxIntakeDraft): boolean {
  return readTaxCashflows(draft).some(
    (row) => String(row.k1_ordinary_income ?? "").trim() && !String(row.k1_distributions ?? "").trim(),
  );
}

export function hasScheduleCCashflow(draft: FoxIntakeDraft): boolean {
  return readTaxCashflows(draft).some((row) => String(row.schedule_c_net_profit ?? "").trim());
}

function pickWageField(fields: Record<string, string>, draft: FoxIntakeDraft, key: string) {
  return String(fields[key] ?? "").trim() || factValue(draft, key);
}

function yearFromWageField(raw: string): number | null {
  const iso = raw.trim().match(/^(\d{4})\b/);
  if (iso) {
    const n = Number(iso[1]);
    return Number.isFinite(n) ? n : null;
  }
  return yearNumber(raw);
}

export type WageJobCashflow = {
  employer_name: string;
  tax_year: string;
  wages: string;
  overtime: string;
  bonus: string;
  commission: string;
  overtime_ytd: string;
  bonus_ytd: string;
  commission_ytd: string;
  pay_period_end: string;
  gross_period: string;
  ytd_gross: string;
  pay_frequency: string;
};

function normalizeEmployer(raw?: string | null) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function readWageJobs(draft: FoxIntakeDraft): WageJobCashflow[] {
  const raw = factValue(draft, WAGE_JOBS_FIELD);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Partial<WageJobCashflow>;
      const employer_name = String(row.employer_name ?? "").trim();
      if (!employer_name) return [];
      return [
        {
          employer_name,
          tax_year: String(row.tax_year ?? "").trim(),
          wages: String(row.wages ?? "").trim(),
          overtime: String(row.overtime ?? "").trim(),
          bonus: String(row.bonus ?? "").trim(),
          commission: String(row.commission ?? "").trim(),
          overtime_ytd: String(row.overtime_ytd ?? "").trim(),
          bonus_ytd: String(row.bonus_ytd ?? "").trim(),
          commission_ytd: String(row.commission_ytd ?? "").trim(),
          pay_period_end: String(row.pay_period_end ?? "").trim(),
          gross_period: String(row.gross_period ?? "").trim(),
          ytd_gross: String(row.ytd_gross ?? "").trim(),
          pay_frequency: String(row.pay_frequency ?? "").trim(),
        },
      ];
    });
  } catch {
    return [];
  }
}

export function jobFromExtract(fields: Record<string, string>): WageJobCashflow | null {
  const employer_name = String(fields.employer_name ?? "").trim();
  const tax_year =
    String(fields.tax_year ?? "").trim() ||
    (yearFromWageField(String(fields.pay_period_end ?? "").trim()) != null
      ? String(yearFromWageField(String(fields.pay_period_end ?? "").trim()))
      : "");
  if (!employer_name && !fields.wages && !fields.gross_period && !fields.ytd_gross) return null;
  return {
    employer_name: employer_name || "unknown",
    tax_year,
    wages: String(fields.wages ?? "").trim(),
    overtime: String(fields.overtime ?? "").trim(),
    bonus: String(fields.bonus ?? "").trim(),
    commission: String(fields.commission ?? "").trim(),
    overtime_ytd: String(fields.overtime_ytd ?? "").trim(),
    bonus_ytd: String(fields.bonus_ytd ?? "").trim(),
    commission_ytd: String(fields.commission_ytd ?? "").trim(),
    pay_period_end: String(fields.pay_period_end ?? "").trim(),
    gross_period: String(fields.gross_period ?? "").trim(),
    ytd_gross: String(fields.ytd_gross ?? "").trim(),
    pay_frequency: String(fields.pay_frequency ?? "").trim(),
  };
}

export function mergeWageJobs(existing: WageJobCashflow[], incoming: WageJobCashflow | null): WageJobCashflow[] {
  if (!incoming) return existing;
  const employer = normalizeEmployer(incoming.employer_name);
  const year = incoming.tax_year || "";
  const next = existing.filter(
    (row) => !(normalizeEmployer(row.employer_name) === employer && (row.tax_year || "") === year),
  );
  next.push(incoming);
  return next;
}

function writeWageJobs(draft: FoxIntakeDraft, jobs: WageJobCashflow[]): FoxIntakeDraft {
  if (!jobs.length) return draft;
  const now = new Date().toISOString();
  return {
    ...draft,
    facts: {
      ...(draft.facts ?? {}),
      [WAGE_JOBS_FIELD]: {
        field: WAGE_JOBS_FIELD,
        value: JSON.stringify(jobs),
        source: "extracted-unconfirmed",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

function jobToPriorYear(row: WageJobCashflow): WageYearInput {
  return {
    taxYear: row.tax_year || row.pay_period_end || null,
    wages: parseExtractMoney(row.wages),
    overtime: parseExtractMoney(row.overtime),
    bonus: parseExtractMoney(row.bonus),
    commission: parseExtractMoney(row.commission),
    overtimeYtd: parseExtractMoney(row.overtime_ytd),
    bonusYtd: parseExtractMoney(row.bonus_ytd),
    commissionYtd: parseExtractMoney(row.commission_ytd),
    payPeriodEnd: row.pay_period_end || null,
  };
}

function jobToWageInput(row: WageJobCashflow, priorYear?: WageYearInput | null): WageSuggestInput {
  return {
    payPeriodEnd: row.pay_period_end || null,
    grossPeriod: parseExtractMoney(row.gross_period),
    ytdGross: parseExtractMoney(row.ytd_gross),
    payFrequency: row.pay_frequency || null,
    w2Wages: parseExtractMoney(row.wages),
    overtime: parseExtractMoney(row.overtime),
    bonus: parseExtractMoney(row.bonus),
    commission: parseExtractMoney(row.commission),
    overtimeYtd: parseExtractMoney(row.overtime_ytd),
    bonusYtd: parseExtractMoney(row.bonus_ytd),
    commissionYtd: parseExtractMoney(row.commission_ytd),
    priorYear: priorYear ?? null,
  };
}

function jobsForEmployer(jobs: WageJobCashflow[], employer: string) {
  const key = normalizeEmployer(employer);
  return jobs
    .filter((row) => normalizeEmployer(row.employer_name) === key)
    .sort((a, b) => (yearFromWageField(a.tax_year || a.pay_period_end) ?? 0) - (yearFromWageField(b.tax_year || b.pay_period_end) ?? 0));
}

export function hasTwoYearWageHistory(draft: FoxIntakeDraft): boolean {
  const years = new Set<number>();
  for (const row of readWageJobs(draft)) {
    const year = yearFromWageField(row.tax_year || row.pay_period_end);
    if (year != null) years.add(year);
  }
  return years.size >= 2;
}

function wageSuggestInput(draft: FoxIntakeDraft, fields: Record<string, string>): WageSuggestInput {
  const incoming = jobFromExtract(fields);
  const jobs = mergeWageJobs(readWageJobs(draft), incoming);
  const incomingEmployer = String(fields.employer_name ?? incoming?.employer_name ?? "").trim();
  const primaryEmployer = String(factValue(draft, "employer_name") ?? "").trim();
  const incomingIsSecond = Boolean(
    incomingEmployer &&
      primaryEmployer &&
      normalizeEmployer(incomingEmployer) !== normalizeEmployer(primaryEmployer),
  );
  const employer = incomingIsSecond ? primaryEmployer : incomingEmployer || primaryEmployer;
  const sameEmployer = jobsForEmployer(jobs, employer);
  const later = sameEmployer.length ? sameEmployer[sameEmployer.length - 1] : incomingIsSecond ? null : incoming;
  const earlier = sameEmployer.length > 1 ? sameEmployer[sameEmployer.length - 2] : null;
  const laterInput = later ? jobToWageInput(later, earlier ? jobToPriorYear(earlier) : null) : null;
  const currentKey = normalizeEmployer(employer);
  const otherEmployers: string[] = [];
  for (const row of jobs) {
    const name = normalizeEmployer(row.employer_name);
    if (!name || name === currentKey || otherEmployers.includes(name)) continue;
    otherEmployers.push(name);
  }
  const other = otherEmployers[0] ? jobsForEmployer(jobs, otherEmployers[0]) : [];
  const otherCurrent = other.length ? other[other.length - 1] : null;
  const otherPrior = other.length > 1 ? jobToPriorYear(other[other.length - 2]) : null;
  const documentedSeparately = otherCurrent != null;
  const secondJob =
    documentedSeparately && otherCurrent
      ? {
          ...jobToWageInput(otherCurrent, otherPrior),
          documentedSeparately: true,
          employerName: otherCurrent.employer_name,
          priorYear: otherPrior,
        }
      : null;
  const sameStubSecondEmployer = Boolean(
    String(fields.second_employer_name ?? factValue(draft, "second_employer_name") ?? "").trim(),
  );
  if (laterInput) {
    return {
      ...laterInput,
      payFrequency:
        laterInput.payFrequency ||
        (incomingIsSecond ? factValue(draft, "pay_frequency") || null : pickWageField(fields, draft, "pay_frequency") || null),
      w2Wages:
        laterInput.w2Wages ??
        parseExtractMoney(incomingIsSecond ? factValue(draft, "wages") : fields.wages || factValue(draft, "wages")),
      sameStubSecondEmployer,
      secondJob,
    };
  }
  return {
    payPeriodEnd: incomingIsSecond ? factValue(draft, "pay_period_end") || null : pickWageField(fields, draft, "pay_period_end") || null,
    grossPeriod: parseExtractMoney(incomingIsSecond ? factValue(draft, "gross_period") : pickWageField(fields, draft, "gross_period")),
    ytdGross: parseExtractMoney(incomingIsSecond ? factValue(draft, "ytd_gross") : pickWageField(fields, draft, "ytd_gross")),
    payFrequency: incomingIsSecond ? factValue(draft, "pay_frequency") || null : pickWageField(fields, draft, "pay_frequency") || null,
    w2Wages: parseExtractMoney(incomingIsSecond ? factValue(draft, "wages") : fields.wages || factValue(draft, "wages")),
    overtime: incomingIsSecond ? parseExtractMoney(factValue(draft, "overtime")) : parseExtractMoney(fields.overtime),
    bonus: incomingIsSecond ? parseExtractMoney(factValue(draft, "bonus")) : parseExtractMoney(fields.bonus),
    commission: incomingIsSecond ? parseExtractMoney(factValue(draft, "commission")) : parseExtractMoney(fields.commission),
    overtimeYtd: incomingIsSecond ? parseExtractMoney(factValue(draft, "overtime_ytd")) : parseExtractMoney(fields.overtime_ytd),
    bonusYtd: incomingIsSecond ? parseExtractMoney(factValue(draft, "bonus_ytd")) : parseExtractMoney(fields.bonus_ytd),
    commissionYtd: incomingIsSecond ? parseExtractMoney(factValue(draft, "commission_ytd")) : parseExtractMoney(fields.commission_ytd),
    sameStubSecondEmployer,
    secondJob,
  };
}

export function wageIncomeFromDraft(
  draft: FoxIntakeDraft,
  fields: Record<string, string> = {},
) {
  return suggestWageIncome(wageSuggestInput(draft, fields));
}

export function wageIncomeCaution(draft: FoxIntakeDraft): string | undefined {
  const wage = wageIncomeFromDraft(draft);
  if (!wage || wage.needsFrequency || wage.needsBothReason) return undefined;
  const notes = [...(wage.caution ? [wage.caution] : []), ...(wage.partialNotes ?? [])];
  return notes.length ? notes.join(" ") : undefined;
}

export function wageMethodNote(draft: FoxIntakeDraft): string | undefined {
  const wage = wageIncomeFromDraft(draft);
  return wage?.needsFrequency ? undefined : wage?.methodNote;
}

function confirmedMonthly(draft: FoxIntakeDraft, field: string): number | null {
  return parseExtractMoney(factValue(draft, field));
}

function wageSuggestFromFile(draft: FoxIntakeDraft, fields: Record<string, string> = {}) {
  const wage = suggestWageIncome(wageSuggestInput(draft, fields));
  if (!wage || wage.needsFrequency || wage.needsBothReason || wage.monthly === 0) return null;
  return wage;
}

function scheduleCSuggestFromYears(years: TaxYearCashflow[]) {
  return suggestScheduleCIncome(scheduleCYearsFromCashflows(years));
}

function toQualifyingResult(
  result: {
    monthly: number;
    method?: QualifyingMethod;
    caution?: string;
    methodNote?: string;
    needsFrequency?: boolean;
    needsBothReason?: boolean;
    stubMonthly?: number;
    w2Monthly?: number;
    partialNotes?: string[];
    parts?: { wage?: number; scheduleC?: number; k1?: number };
  },
  basis: QualifyingBasis,
): QualifyingIncomeResult {
  return {
    monthly: result.monthly,
    basis,
    method: result.method,
    caution: result.caution,
    methodNote: result.methodNote,
    needsFrequency: result.needsFrequency,
    needsBothReason: result.needsBothReason,
    stubMonthly: result.stubMonthly,
    w2Monthly: result.w2Monthly,
    partialNotes: result.partialNotes,
    parts: result.parts,
  };
}

function maybeCombine(
  draft: FoxIntakeDraft,
  incoming: QualifyingIncomeResult,
  years: TaxYearCashflow[],
): QualifyingIncomeResult {
  const wage =
    incoming.basis === "wage"
      ? {
          monthly: incoming.monthly,
          method: incoming.method ?? "w2-annual",
          methodNote: incoming.methodNote,
          caution: incoming.caution,
          partialNotes: incoming.partialNotes,
        }
      : wageSuggestFromFile(draft) ??
        (confirmedMonthly(draft, WAGE_MONTHLY_FIELD) != null
          ? {
              monthly: confirmedMonthly(draft, WAGE_MONTHLY_FIELD) as number,
              method: "period-frequency" as const,
              methodNote: wageMethodNote(draft) ?? "W-2",
            }
          : null);
  const scheduleC =
    incoming.basis === "schedule_c"
      ? {
          monthly: incoming.monthly,
          method: incoming.method ?? "one-year",
          caution: incoming.caution,
          methodNote: incoming.methodNote,
        }
      : scheduleCSuggestFromYears(years.length ? years : readTaxCashflows(draft)) ??
        (confirmedMonthly(draft, SE_MONTHLY_FIELD) != null
          ? {
              monthly: confirmedMonthly(draft, SE_MONTHLY_FIELD) as number,
              method: "one-year" as const,
            }
          : null);
  const k1 =
    incoming.basis === "k1"
      ? incoming.monthly
      : k1Monthly(years.length ? years : readTaxCashflows(draft)) ??
        confirmedMonthly(draft, K1_MONTHLY_FIELD);
  const combined = suggestCombinedIncome({
    wage,
    scheduleC,
    k1Monthly: k1,
  });
  if (!combined) return incoming;
  return toQualifyingResult(combined, "combined");
}

export function monthlyQualifyingFromExtract(
  draft: FoxIntakeDraft,
  extractClass: ExtractClass,
  fields: Record<string, string>,
): QualifyingIncomeResult | null {
  if (extractClass === "paystub" || extractClass === "w2") {
    const wage = suggestWageIncome(wageSuggestInput(draft, fields));
    if (wage == null) return null;
    if (wage.needsFrequency) {
      return { monthly: 0, basis: "wage", method: wage.method, needsFrequency: true };
    }
    if (wage.needsBothReason) {
      return {
        monthly: 0,
        basis: "wage",
        method: wage.method,
        needsBothReason: true,
        stubMonthly: wage.stubMonthly,
        w2Monthly: wage.w2Monthly,
        methodNote: wage.methodNote,
        partialNotes: wage.partialNotes,
      };
    }
    if (wage.monthly === 0) return null;
    return maybeCombine(
      draft,
      {
        monthly: wage.monthly,
        basis: "wage",
        method: wage.method,
        caution: wage.caution,
        methodNote: wage.methodNote,
        partialNotes: wage.partialNotes,
        stubMonthly: wage.stubMonthly,
        w2Monthly: wage.w2Monthly,
        parts: { wage: wage.monthly },
      },
      readTaxCashflows(draft),
    );
  }
  if (extractClass !== "tax_return") return null;
  const incoming = cashflowFromExtract(fields);
  const years = mergeTaxCashflows(readTaxCashflows(draft), incoming);
  const scheduleC = suggestScheduleCIncome(scheduleCYearsFromCashflows(years));
  if (scheduleC != null) {
    return maybeCombine(
      draft,
      {
        monthly: scheduleC.monthly,
        basis: "schedule_c",
        method: scheduleC.method,
        caution: scheduleC.caution,
        methodNote:
          scheduleC.method === "one-year"
            ? "Schedule C one-year"
            : scheduleC.method === "two-year-average"
              ? "Schedule C two-year average"
              : scheduleC.method === "later-year-lower"
                ? "Schedule C later year"
                : "Schedule C",
        parts: { scheduleC: scheduleC.monthly },
      },
      years,
    );
  }
  const entity = k1Monthly(years);
  if (entity != null) {
    return maybeCombine(
      draft,
      {
        monthly: entity,
        basis: "k1",
        methodNote: "ordinary / 12",
        caution: K1_ORDINARY_NOTE,
        parts: { k1: entity },
      },
      years,
    );
  }
  return null;
}

export function hasK1Ordinary(draft: FoxIntakeDraft): boolean {
  return readTaxCashflows(draft).some((row) => String(row.k1_ordinary_income ?? "").trim());
}

function writeConfirmedIncomeFact(
  draft: FoxIntakeDraft,
  field: string,
  value: string,
  source: FieldSource,
): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    facts: {
      ...(draft.facts ?? {}),
      [field]: {
        field,
        value,
        source,
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

function writeBothMonthlies(
  draft: FoxIntakeDraft,
  computed: QualifyingIncomeResult | null,
): FoxIntakeDraft {
  const stub = computed?.stubMonthly;
  const w2 = computed?.w2Monthly;
  if (stub == null && w2 == null) return draft;
  let next = draft;
  if (stub != null) next = writeConfirmedIncomeFact(next, PAYSTUB_MONTHLY_FIELD, String(stub), "computed");
  if (w2 != null) next = writeConfirmedIncomeFact(next, W2_MONTHLY_FIELD, String(w2), "computed");
  return next;
}

function clearQualifyingIncome(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (!draft.facts?.[QUALIFYING_INCOME_FIELD]) return draft;
  const facts = { ...draft.facts };
  delete facts[QUALIFYING_INCOME_FIELD];
  return { ...draft, facts };
}

export function enterBothMonthlyAsk(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...clearQualifyingIncome(draft),
    awaitingBothMonthlyReason: true,
    awaitingRaiseWhen: false,
    awaitingRaiseYtdFar: false,
    awaitingPayFrequency: false,
    pendingProposal: null,
    pendingConflict: existingMonthlyIncome(draft)?.via === QUALIFYING_INCOME_FIELD ? null : draft.pendingConflict,
  };
}

export function enterRaiseWhenAsk(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...clearQualifyingIncome(draft),
    awaitingBothMonthlyReason: false,
    awaitingRaiseWhen: true,
    awaitingRaiseYtdFar: false,
    awaitingPayFrequency: false,
    pendingProposal: null,
    pendingConflict: existingMonthlyIncome(draft)?.via === QUALIFYING_INCOME_FIELD ? null : draft.pendingConflict,
  };
}

function holdPayOnBothAsk(
  draft: FoxIntakeDraft,
  heldPay: { field: string; value: string; label: string }[],
): FoxIntakeDraft {
  let next = draft;
  for (const item of heldPay) {
    if (!item.field || !item.value) continue;
    next = writeConfirmedIncomeFact(next, item.field, item.value, "extracted-unconfirmed");
  }
  return enterBothMonthlyAsk(next);
}

export function bothMonthlyPair(draft: FoxIntakeDraft): { stub: number; w2: number } | null {
  const storedStub = confirmedMonthly(draft, PAYSTUB_MONTHLY_FIELD);
  const storedW2 = confirmedMonthly(draft, W2_MONTHLY_FIELD);
  if (storedStub != null && storedW2 != null) return { stub: storedStub, w2: storedW2 };
  const wage = wageIncomeFromDraft(draft);
  const stub = storedStub ?? wage?.stubMonthly;
  const w2 = storedW2 ?? wage?.w2Monthly;
  if (stub == null || w2 == null) return null;
  return { stub, w2 };
}

export function bothMonthlyDisplay(draft: FoxIntakeDraft): string | null {
  const pair = bothMonthlyPair(draft);
  if (!pair) return null;
  return bothMonthlyMethodNoteForDraft(draft, pair.stub, pair.w2);
}

function stubYtdGross(draft: FoxIntakeDraft): number | null {
  const fromFact = parseExtractMoney(factValue(draft, "ytd_gross"));
  if (fromFact != null) return fromFact;
  for (const job of readWageJobs(draft)) {
    const ytd = parseExtractMoney(job.ytd_gross);
    if (ytd != null) return ytd;
  }
  const extra = draft.pendingProposal?.extras?.find((item) => item.field === "ytd_gross");
  return extra ? parseExtractMoney(extra.value) : null;
}

function stubPeriodEnd(draft: FoxIntakeDraft): string | null {
  const fromFact = factValue(draft, "pay_period_end");
  if (fromFact) return fromFact;
  for (const job of readWageJobs(draft)) {
    if (job.pay_period_end) return job.pay_period_end;
  }
  const extra = draft.pendingProposal?.extras?.find((item) => item.field === "pay_period_end");
  return extra?.value || null;
}

function applyRaiseProposal(
  draft: FoxIntakeDraft,
  proposed: ReturnType<typeof proposeRaiseWeightedIncome>,
  pair: { stub: number; w2: number },
  raiseWhenRaw: string,
): FoxIntakeDraft {
  const next = writeConfirmedIncomeFact(
    {
      ...draft,
      awaitingBothMonthlyReason: false,
      awaitingRaiseWhen: false,
      awaitingRaiseYtdFar: Boolean(proposed.needsRaiseYtdFar),
      bothMonthlyReason: "raise",
      raiseWhenRaw,
      pendingConflict: null,
      pendingProposal: proposed.needsRaiseYtdFar ? null : draft.pendingProposal,
    },
    INCOME_CAUTION_FIELD,
    proposed.caution ?? RAISE_YTD_MISSING_NOTE,
    "suggested",
  );
  if (proposed.needsRaiseYtdFar) {
    return { ...next, pendingProposal: null };
  }
  return withQualifyingIncomeProposal(next, {
    monthly: proposed.monthly,
    basis: "wage",
    method: proposed.method,
    methodNote: proposed.methodNote,
    caution: proposed.caution,
    stubMonthly: pair.stub,
    w2Monthly: pair.w2,
    expectedYtd: proposed.expectedYtd,
    weightNote: proposed.weightNote,
    parts: { wage: proposed.monthly },
  });
}

export function applyBothMonthlyReasonAnswer(
  draft: FoxIntakeDraft,
  raw: string,
): FoxIntakeDraft {
  const reason = parseBothMonthlyReason(raw);
  if (!reason) return draft;
  const pair = bothMonthlyPair(draft);
  if (!pair) {
    return { ...draft, awaitingBothMonthlyReason: false };
  }
  if (reason === "raise") {
    return enterRaiseWhenAsk({
      ...draft,
      bothMonthlyReason: "raise",
      raiseWhenRaw: undefined,
      pendingConflict: null,
    });
  }
  if (wageExtractBothOnFile(draft) && reason === "skip") {
    return {
      ...draft,
      awaitingBothMonthlyReason: false,
      awaitingRaiseWhen: false,
      awaitingRaiseYtdFar: false,
      bothMonthlyReason: "skip",
      looksRightHold: false,
      pendingProposal: null,
      pendingConflict: null,
    };
  }
  if (wageExtractBothOnFile(draft) && reason === "second-job") {
    return proposeStubJobAsk({
      ...draft,
      awaitingBothMonthlyReason: false,
      bothMonthlyReason: "second-job",
      looksRightHold: true,
    });
  }
  const proposed = proposeBothMonthlyIncome(pair.stub, pair.w2, reason);
  const caution = box5WageCopy(draft, proposed.caution ?? bothMonthlyReasonNote(reason));
  const methodNote = bothMonthlyMethodNoteForDraft(draft, pair.stub, pair.w2);
  const next = writeConfirmedIncomeFact(
    {
      ...draft,
      awaitingBothMonthlyReason: false,
      awaitingRaiseWhen: false,
      awaitingRaiseYtdFar: false,
      bothMonthlyReason: reason,
      pendingConflict: null,
    },
    INCOME_CAUTION_FIELD,
    caution,
    "suggested",
  );
  return withQualifyingIncomeProposal(next, {
    monthly: proposed.monthly,
    basis: "wage",
    method: proposed.method,
    methodNote,
    caution,
    stubMonthly: pair.stub,
    w2Monthly: pair.w2,
    parts: { wage: proposed.monthly },
  });
}

export function applyRaiseWhenAnswer(draft: FoxIntakeDraft, raw: string): FoxIntakeDraft {
  const when = parseRaiseWhen(raw);
  if (!when) return draft;
  const pair = bothMonthlyPair(draft);
  if (!pair) {
    return { ...draft, awaitingRaiseWhen: false, awaitingRaiseYtdFar: false };
  }
  const proposed = proposeRaiseWeightedIncome({
    stubMonthly: pair.stub,
    w2Monthly: pair.w2,
    when,
    ytdGross: stubYtdGross(draft),
    stubMonth: monthsThroughPeriodEnd(stubPeriodEnd(draft)),
  });
  return applyRaiseProposal(draft, proposed, pair, raw);
}

export function applyRaiseYtdFarAnswer(draft: FoxIntakeDraft, raw: string): FoxIntakeDraft {
  const when = parseRaiseWhen(raw);
  if (when && (when.kind === "month" || when.kind === "this-year" || when.kind === "last-year")) {
    return applyRaiseWhenAnswer(draft, raw);
  }
  const reason = parseBothMonthlyReason(raw);
  if (when?.kind === "not-sure" || reason === "skip") {
    const pair = bothMonthlyPair(draft);
    if (!pair) {
      return { ...draft, awaitingRaiseYtdFar: false, awaitingRaiseWhen: false };
    }
    const next = writeConfirmedIncomeFact(
      {
        ...draft,
        awaitingRaiseYtdFar: false,
        awaitingRaiseWhen: false,
        pendingConflict: null,
      },
      INCOME_CAUTION_FIELD,
      draft.facts?.[INCOME_CAUTION_FIELD]?.value || RAISE_WHEN_UNKNOWN_NOTE,
      "suggested",
    );
    return withQualifyingIncomeProposal(next, {
      monthly: pair.w2,
      basis: "wage",
      method: "w2-annual",
      methodNote: bothMonthlyMethodNoteForDraft(draft, pair.stub, pair.w2),
      caution: box5WageCopy(draft, next.facts?.[INCOME_CAUTION_FIELD]?.value || RAISE_WHEN_UNKNOWN_NOTE),
      stubMonthly: pair.stub,
      w2Monthly: pair.w2,
      parts: { wage: pair.w2 },
    });
  }
  if (reason && reason !== "raise") {
    return applyBothMonthlyReasonAnswer(
      { ...draft, awaitingRaiseWhen: false, awaitingRaiseYtdFar: false },
      reason,
    );
  }
  return draft;
}

export function applyPayFrequencyAnswer(draft: FoxIntakeDraft, raw: string): FoxIntakeDraft {
  const value = String(raw ?? "").trim().toLowerCase();
  const now = new Date().toISOString();
  const heldPay = draft.pendingProposal
    ? [
        {
          field: draft.pendingProposal.field,
          value: draft.pendingProposal.value,
          label: draft.pendingProposal.label,
        },
        ...(draft.pendingProposal.extras ?? []),
      ].filter(
        (item) =>
          item.field &&
          item.value &&
          item.field !== QUALIFYING_INCOME_FIELD &&
          item.field !== "pay_frequency",
      )
    : [];
  const heldFields: Record<string, string> = {};
  for (const item of heldPay) heldFields[item.field] = item.value;
  const next: FoxIntakeDraft = {
    ...draft,
    awaitingPayFrequency: false,
    pendingProposal: null,
    facts: {
      ...(draft.facts ?? {}),
      pay_frequency: {
        field: "pay_frequency",
        value,
        source: "client",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
  const storedJob = readWageJobs(next)[0];
  const computed = monthlyQualifyingFromExtract(next, lastWageClass(next), {
    ...(storedJob ?? {}),
    ...heldFields,
    pay_frequency: value,
  });
  if (!computed || computed.needsFrequency) {
    return heldPay.length ? { ...next, pendingProposal: draft.pendingProposal } : next;
  }
  if (computed.needsBothReason) {
    return holdPayOnBothAsk(writeBothMonthlies(next, computed), heldPay);
  }
  if (computed.monthly === 0) {
    return heldPay.length ? { ...next, pendingProposal: draft.pendingProposal } : next;
  }
  const proposed = withQualifyingIncomeProposal(writeBothMonthlies(next, computed), computed, lastWageClass(next));
  if (proposed.pendingProposal && heldPay.length) {
    return {
      ...proposed,
      pendingProposal: {
        ...proposed.pendingProposal,
        extras: [...(proposed.pendingProposal.extras ?? []), ...heldPay],
      },
    };
  }
  return proposed;
}

function lastWageClass(draft: FoxIntakeDraft): ExtractClass {
  const docs = draft.documents;
  for (let i = docs.length - 1; i >= 0; i -= 1) {
    const cls = docs[i]?.extractClass;
    if (cls === "paystub" || cls === "w2") return cls;
  }
  return "paystub";
}

function writeTaxCashflows(draft: FoxIntakeDraft, years: TaxYearCashflow[]): FoxIntakeDraft {
  if (!years.length) return draft;
  const now = new Date().toISOString();
  return {
    ...draft,
    facts: {
      ...(draft.facts ?? {}),
      [TAX_CASHFLOWS_FIELD]: {
        field: TAX_CASHFLOWS_FIELD,
        value: JSON.stringify(years),
        source: "extracted-unconfirmed",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

function serializeParts(parts?: { wage?: number; scheduleC?: number; k1?: number }) {
  if (!parts) return undefined;
  const next: FactProposal["parts"] = {
    ...(parts.wage != null ? { wage: String(parts.wage) } : {}),
    ...(parts.scheduleC != null ? { scheduleC: String(parts.scheduleC) } : {}),
    ...(parts.k1 != null ? { k1: String(parts.k1) } : {}),
  };
  return next.wage || next.scheduleC || next.k1 ? next : undefined;
}

export function qualifyingIncomeProposal(computed: QualifyingIncomeResult): FactProposal {
  return {
    field: QUALIFYING_INCOME_FIELD,
    value: String(computed.monthly),
    label: "qualifying income",
    kind: "computed",
    note: SUGGESTED_INCOME_NOTE,
    methodNote: computed.methodNote,
    caution: computed.caution,
    partialNotes: computed.partialNotes,
    parts: serializeParts(computed.parts),
  };
}

function existingMonthlyIncome(draft: FoxIntakeDraft): { value: string; via: "qualifying_income" | "income" } | null {
  const suggested = factValue(draft, QUALIFYING_INCOME_FIELD);
  if (suggested) return { value: suggested, via: "qualifying_income" };
  const typed = factValue(draft, "income");
  if (typed && parseExtractMoney(typed) != null) return { value: typed, via: "income" };
  return null;
}

export function withQualifyingIncomeProposal(
  draft: FoxIntakeDraft,
  computed: QualifyingIncomeResult | null,
  extractClass?: ExtractClass,
): FoxIntakeDraft {
  if (!computed) return draft;
  const monthly = String(computed.monthly);
  const existing = existingMonthlyIncome(draft);
  const showBothMonthly =
    computed.method === "both-ask" ||
    Boolean(computed.stubMonthly != null && computed.w2Monthly != null) ||
    Boolean(computed.methodNote?.includes("W-2 Box 1"));
  if (existing && valuesMatch(existing.value, monthly) && !showBothMonthly) {
    return {
      ...draft,
      pendingConflict: null,
      pendingProposal:
        draft.pendingProposal?.field === QUALIFYING_INCOME_FIELD
          ? qualifyingIncomeProposal(computed)
          : draft.pendingProposal,
    };
  }
  if (existing?.via === QUALIFYING_INCOME_FIELD) {
    return {
      ...draft,
      pendingConflict: null,
      pendingProposal: qualifyingIncomeProposal(computed),
    };
  }
  if (existing && !draft.pendingConflict) {
    return {
      ...draft,
      pendingConflict: {
        field: existing.via,
        fileValue: existing.value,
        documentValue: monthly,
        label: incomeFactLabel(existing.via),
        kind: "document",
      },
    };
  }
  if (existing) return draft;
  if (draft.pendingProposal && draft.pendingProposal.field !== QUALIFYING_INCOME_FIELD) {
    return draft;
  }
  return {
    ...draft,
    pendingProposal: qualifyingIncomeProposal(computed),
  };
}

export function applyQualifyingIncomeFromExtract(
  draft: FoxIntakeDraft,
  extractClass: ExtractClass,
  fields: Record<string, string>,
  computed: QualifyingIncomeResult | null,
): FoxIntakeDraft {
  let next = draft;
  if (extractClass === "tax_return") {
    next = writeTaxCashflows(next, mergeTaxCashflows(readTaxCashflows(next), cashflowFromExtract(fields)));
  }
  if (extractClass === "paystub" || extractClass === "w2") {
    next = writeWageJobs(next, mergeWageJobs(readWageJobs(next), jobFromExtract(fields)));
  }
  if (computed?.needsFrequency) {
    if (next.pendingConflict) return next;
    return { ...next, awaitingPayFrequency: true, pendingProposal: null };
  }
  if (computed?.needsBothReason) {
    if (next.pendingConflict && existingMonthlyIncome(draft)?.via === "income") return next;
    if (draft.bothMonthlyReason === "raise" && draft.raiseWhenRaw) {
      return applyRaiseWhenAnswer(writeBothMonthlies(next, computed), draft.raiseWhenRaw);
    }
    if (draft.bothMonthlyReason === "raise") {
      return enterRaiseWhenAsk(writeBothMonthlies(next, computed));
    }
    if (draft.bothMonthlyReason) {
      return applyBothMonthlyReasonAnswer(writeBothMonthlies(next, computed), draft.bothMonthlyReason);
    }
    return enterBothMonthlyAsk(writeBothMonthlies(next, computed));
  }
  if (
    draft.pendingConflict &&
    existingMonthlyIncome(draft)?.via !== QUALIFYING_INCOME_FIELD
  ) {
    return next;
  }
  next = writeBothMonthlies(next, computed);
  return withQualifyingIncomeProposal(
    { ...next, awaitingPayFrequency: false, awaitingBothMonthlyReason: false, awaitingRaiseWhen: false, awaitingRaiseYtdFar: false, pendingConflict: existingMonthlyIncome(draft)?.via === QUALIFYING_INCOME_FIELD ? null : next.pendingConflict },
    computed,
    extractClass,
  );
}

export function qualifyingIncomeNote(draft: FoxIntakeDraft): string | undefined {
  const proposal = draft.pendingProposal;
  if (proposal?.field === QUALIFYING_INCOME_FIELD) {
    return proposal.note ?? SUGGESTED_INCOME_NOTE;
  }
  const stored = draft.facts?.[QUALIFYING_INCOME_FIELD];
  if (stored?.value) return SUGGESTED_INCOME_NOTE;
  return undefined;
}

function structureQualifyingValue(amount: string, methodNote?: string) {
  if (!methodNote) return amount;
  if (
    methodNote.includes(W2_BOX1_MONTHLY_NOTE) ||
    methodNote.includes("W-2 Box 1") ||
    methodNote.includes("Paystub $")
  ) {
    return `${amount} · ${methodNote}`;
  }
  return amount;
}

export function qualifyingIncomeDisplay(draft: FoxIntakeDraft): { value: string; note: string } | null {
  if (draft.awaitingBothMonthlyReason || draft.awaitingRaiseWhen || draft.awaitingRaiseYtdFar) return null;
  const proposal =
    draft.pendingProposal?.field === QUALIFYING_INCOME_FIELD ? draft.pendingProposal : null;
  if (proposal) {
    return {
      value: structureQualifyingValue(displayMoney(proposal.value), proposal.methodNote),
      note: proposal.note ?? SUGGESTED_INCOME_NOTE,
    };
  }
  const stored = factValue(draft, QUALIFYING_INCOME_FIELD);
  if (stored) {
    const pair = bothMonthlyDisplay(draft);
    return {
      value: pair ? structureQualifyingValue(displayMoney(stored), pair) : displayMoney(stored),
      note: SUGGESTED_INCOME_NOTE,
    };
  }
  return null;
}

export const W2_BOX5_ASK =
  "What is Box 5 on that W-2? Medicare wages and tips. That is last year’s gross.";
export const W2_PAY_FREQUENCY_ASK = "How often are you paid?";
export const WAGE_DOCS_ASK = "Drop last year’s W-2 and a recent paystub. Skip if you want to type it.";
export const WAGE_STUB_DROP_ASK = "Drop a recent paystub. Skip if you want to type it.";
export const PAYSTUB_MONTHLY_ASK = "What's the amount on the latest stub?";
export const PAYSTUB_AMOUNT_FIELD = "paystub_amount";
export const WAGE_EXTRACT_FIELD = "wage_extract";
export const STUB_EXTRACT_FIELD = "stub_extract";
export const STUB_JOB_FIELD = "stub_job";
export const STUB_JOB_ASK = "Same job or two jobs?";
export const W2_BOX5_MONTHLY_NOTE = "Box 5 monthly";
export const BOTH_MONTHLY_SKIP_NOTE_BOX5 = "Using W-2 Box 5 until we know why they differ.";

export function typedBox5OnFile(draft: FoxIntakeDraft): boolean {
  return Boolean(parseExtractMoney(factValue(draft, "w2_box5")));
}

/** Extract Use this wrote Box 5. Typed Box 5 stays on the amount ask. */
export function wageW2ExtractAccepted(draft: FoxIntakeDraft): boolean {
  const fact = draft.facts?.w2_box5 ?? draft.facts?.medicare_wages;
  return Boolean(fact?.confirmed && fact.source === "document" && parseExtractMoney(fact.value));
}

export function bothMonthlyMethodNoteForDraft(
  draft: FoxIntakeDraft,
  stubMonthly: number,
  w2Monthly: number,
): string {
  const note = bothMonthlyMethodNote(stubMonthly, w2Monthly);
  return typedBox5OnFile(draft) ? note.replace(/W-2 Box 1/g, "W-2 Box 5") : note;
}

export function bothMonthlyAskCopyForDraft(
  draft: FoxIntakeDraft,
  stubMonthly: number,
  w2Monthly: number,
): string {
  const copy = bothMonthlyAskCopy(stubMonthly, w2Monthly);
  return typedBox5OnFile(draft) ? copy.replace(/W-2 Box 1/g, "W-2 Box 5") : copy;
}

function box5WageCopy(draft: FoxIntakeDraft, text: string): string {
  return typedBox5OnFile(draft) ? text.replace(/W-2 Box 1/g, "W-2 Box 5") : text;
}

export const STUB_MONTHLY_NOTE = "Latest stub monthly";
/** After stub Use this: Box 5 and stub monthly are close, not the same. One line. */
export const WAGE_BOX5_STUB_DIFFER_ASK = "Last year and this stub are close, not the same month.";
/** Gap 10%+ lower. One line. Skip allowed. No qualifying math. */
export const WAGE_STUB_LOWER_CAUTION = "This stub is lower than last year.";
/** |stub monthly − Box 5/12| ÷ Box 5/12. Under this, UW does not need a story. */
export const BOX5_STUB_MATERIAL_RATIO = 0.1;

const VARIABLE_PAY_KEYS = [
  "overtime",
  "bonus",
  "commission",
  "overtime_ytd",
  "bonus_ytd",
  "commission_ytd",
] as const;

function moneyOnPage(raw?: string | null): boolean {
  const n = parseExtractMoney(raw);
  return n != null && n > 0;
}

export function fieldsHaveVariablePay(fields?: Record<string, string | null | undefined> | null): boolean {
  return VARIABLE_PAY_KEYS.some((key) => moneyOnPage(fields?.[key]));
}

function stubVariablePayOnPage(draft: FoxIntakeDraft): boolean {
  if (draft.pendingWageExtract?.variablePay) return true;
  if (VARIABLE_PAY_KEYS.some((key) => moneyOnPage(factValue(draft, key)))) return true;
  return readWageJobs(draft).some((job) => VARIABLE_PAY_KEYS.some((key) => moneyOnPage(job[key])));
}

export function box5StubMonthlyGapRatio(stubMonthly: number, box5Monthly: number): number {
  if (!(box5Monthly > 0)) return 0;
  return Math.abs(stubMonthly - box5Monthly) / box5Monthly;
}

function wageExtractAfterStubDecision(
  draft: FoxIntakeDraft,
  stubMonthly: number,
  mode: "same" | "two" | "only",
): { kind: "quiet" } | { kind: "lower"; w2Monthly: number } | { kind: "chips"; w2Monthly: number } {
  if (mode === "two") return { kind: "quiet" };
  if (!wageW2ExtractAccepted(draft) || stubMonthly <= 0) return { kind: "quiet" };
  const box5 = readWageBox5(draft);
  if (box5 == null || box5 <= 0) return { kind: "quiet" };
  const w2Monthly = monthlyFromAnnual(box5);
  if (w2Monthly <= 0) return { kind: "quiet" };
  const gap = box5StubMonthlyGapRatio(stubMonthly, w2Monthly);
  if (gap < BOX5_STUB_MATERIAL_RATIO) return { kind: "quiet" };
  if (stubMonthly + 1e-9 < w2Monthly) return { kind: "lower", w2Monthly };
  if (stubVariablePayOnPage(draft)) return { kind: "chips", w2Monthly };
  return { kind: "quiet" };
}

function wageExtractBothOnFile(draft: FoxIntakeDraft): boolean {
  return wageW2ExtractAccepted(draft) && Boolean(draft.stubExtractAccepted);
}

export function speakPayFrequency(raw?: string | null): string {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (/(biweekly|every2weeks|fortnight)/.test(v)) return "biweekly";
  if (/(semimonth|twiceamonth)/.test(v)) return "semimonthly";
  if (/weekly/.test(v)) return "weekly";
  if (/month/.test(v)) return "monthly";
  return "";
}

export function speakWageMoney(value: number): string {
  const abs = Math.abs(value);
  const cents = Math.round(abs * 100);
  if (cents % 100 !== 0) {
    return `$${(cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${Math.round(abs).toLocaleString("en-US")}`;
}

export function wageExtractConfirmCopy(box5: number, stub: number, frequency: string): string {
  const spoken = speakPayFrequency(frequency) || frequency.trim().toLowerCase();
  return `Box 5 ${speakWageMoney(box5)}. Stub ${speakWageMoney(stub)} ${spoken}. Use this?`;
}

export function wageW2ConfirmCopy(box5: number, employer: string): string {
  const name = String(employer ?? "").trim();
  return `Box 5 ${speakWageMoney(box5)}. ${name}. Use this?`;
}

/** File Employment after Use this: employer and Box 5. Stub Use this adds pay on the same row. Not Box 1. */
export function wageEmploymentFileLine(draft: FoxIntakeDraft): string {
  if (!wageW2ExtractAccepted(draft)) return "";
  if (isWageExtractProposal(draft.pendingProposal)) return "";
  const employer = factValue(draft, "employer_name").trim();
  const box5 = readWageBox5(draft);
  const stub =
    parseExtractMoney(factValue(draft, PAYSTUB_AMOUNT_FIELD)) ??
    parseExtractMoney(factValue(draft, "gross_period"));
  const frequency = speakPayFrequency(factValue(draft, "pay_frequency"));
  const monthly = parseExtractMoney(factValue(draft, PAYSTUB_MONTHLY_FIELD));
  if (draft.stubExtractAccepted && stub != null && stub > 0 && frequency) {
    if (stubTwoJobsOnFile(draft)) {
      if (!employer || box5 == null || box5 <= 0) return "";
      return `${employer}, Box 5 ${speakWageMoney(box5)}`;
    }
    const monthlyBit = monthly != null && monthly > 0 ? `, ${speakWageMoney(monthly)} a month` : "";
    const stubBit = `${frequency}, ${speakWageMoney(stub)}${monthlyBit}`;
    if (employer && box5 != null && box5 > 0) {
      return `${employer}, Box 5 ${speakWageMoney(box5)}, ${stubBit}`;
    }
    return `${employer}, ${stubBit}`;
  }
  if (stub != null && stub > 0) return "";
  if (parseExtractMoney(factValue(draft, PAYSTUB_MONTHLY_FIELD))) return "";
  if (!employer || box5 == null || box5 <= 0) return "";
  return `${employer}, Box 5 ${speakWageMoney(box5)}`;
}

export function isWageExtractProposal(proposal?: { field?: string } | null): boolean {
  return proposal?.field === WAGE_EXTRACT_FIELD;
}

export function isStubExtractProposal(proposal?: { field?: string } | null): boolean {
  return proposal?.field === STUB_EXTRACT_FIELD;
}

export function isStubJobProposal(proposal?: { field?: string } | null): boolean {
  return proposal?.field === STUB_JOB_FIELD;
}

export function normalizeEmployerName(value?: string | null): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b(inc|llc|l\.l\.c|corp|corporation|ltd|limited|company|co)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Harbor Pacific Design Inc / Harbor Pacific / Harbor Pacific Design are the same job. */
export function employersClose(left?: string | null, right?: string | null): boolean {
  const a = normalizeEmployerName(left);
  const b = normalizeEmployerName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const leftTokens = a.split(/\s+/).filter((token) => token.length > 2);
  const rightTokens = b.split(/\s+/).filter((token) => token.length > 2);
  const shared = leftTokens.filter((token) => rightTokens.includes(token));
  return shared.length >= 2;
}

export function stubTwoJobsOnFile(draft: FoxIntakeDraft): boolean {
  const jobs = draft.employmentHistory ?? [];
  if (jobs.length < 2) return false;
  const labels = jobs
    .map((item) => String(item.label ?? "").trim())
    .filter(Boolean);
  if (labels.length < 2) return false;
  const first = labels[0] ?? "";
  return labels.some((label) => !employersClose(first, label));
}

/** File Employment / Employer stay empty until Use this or Change. */
export function wageEmploymentUnconfirmed(draft: FoxIntakeDraft): boolean {
  return wageThreadOpen(draft) && !draft.sampleAccepted && isWageExtractProposal(draft.pendingProposal);
}

export function isWageW2OnlyProposal(proposal?: { field?: string; extras?: { field: string; value: string }[] } | null): boolean {
  if (!isWageExtractProposal(proposal) || !proposal) return false;
  const extras = proposal.extras ?? [];
  const box5 = Number(extras.find((item) => item.field === "w2_box5")?.value ?? 0);
  const employer = (extras.find((item) => item.field === "employer_name")?.value ?? "").trim();
  const stub = Number(extras.find((item) => item.field === PAYSTUB_AMOUNT_FIELD)?.value ?? 0);
  const frequency = extras.find((item) => item.field === "pay_frequency")?.value ?? "";
  return box5 > 0 && Boolean(employer) && !(stub > 0 && frequency);
}

/** Box 5 Medicare wages only. Never Box 1 `wages`. */
export function readWageBox5(draft: FoxIntakeDraft, fields?: Record<string, string>): number | null {
  const fromFields = parseExtractMoney(fields?.medicare_wages) ?? parseExtractMoney(fields?.box5);
  if (fromFields != null && fromFields > 0) return fromFields;
  if (draft.pendingWageExtract?.box5 && draft.pendingWageExtract.box5 > 0) {
    return draft.pendingWageExtract.box5;
  }
  return parseExtractMoney(factValue(draft, "w2_box5")) ?? parseExtractMoney(factValue(draft, "medicare_wages"));
}

export function readStubAmount(draft: FoxIntakeDraft, fields?: Record<string, string>): number | null {
  const fromFields = parseExtractMoney(fields?.gross_period) ?? parseExtractMoney(fields?.paystub_amount);
  if (fromFields != null && fromFields > 0) return fromFields;
  if (draft.pendingWageExtract?.stub && draft.pendingWageExtract.stub > 0) {
    return draft.pendingWageExtract.stub;
  }
  return parseExtractMoney(factValue(draft, PAYSTUB_AMOUNT_FIELD)) ?? parseExtractMoney(factValue(draft, "gross_period"));
}

export function readWageFrequency(draft: FoxIntakeDraft, fields?: Record<string, string>): string {
  const fromFields = speakPayFrequency(fields?.pay_frequency);
  if (fromFields) return fromFields;
  if (draft.pendingWageExtract?.frequency) return draft.pendingWageExtract.frequency;
  return speakPayFrequency(factValue(draft, "pay_frequency"));
}

export function mergePendingWageExtract(
  draft: FoxIntakeDraft,
  fields?: Record<string, string>,
  extractClass?: ExtractClass,
): FoxIntakeDraft {
  const prev = draft.pendingWageExtract ?? {};
  const box5 = parseExtractMoney(fields?.medicare_wages) ?? parseExtractMoney(fields?.box5);
  const stub =
    extractClass === "w2" ? undefined : parseExtractMoney(fields?.gross_period);
  const frequency =
    extractClass === "w2" ? undefined : speakPayFrequency(fields?.pay_frequency);
  const employer = String(fields?.employer_name ?? "").trim();
  const next = {
    ...prev,
    ...(extractClass === "w2" ? { w2In: true } : {}),
    ...(extractClass === "paystub" ? { stubIn: true } : {}),
    ...(box5 != null && box5 > 0 ? { box5 } : {}),
    ...(stub != null && stub > 0 ? { stub } : {}),
    ...(frequency ? { frequency } : {}),
    ...(employer ? { employer } : {}),
  };
  if (!next.box5 && !next.stub && !next.frequency && !next.employer && !next.w2In && !next.stubIn) {
    return draft;
  }
  return { ...draft, pendingWageExtract: next };
}

export function wageExtractCanConfirm(draft: FoxIntakeDraft, fields?: Record<string, string>): boolean {
  const box5 = readWageBox5(draft, fields);
  const stub = readStubAmount(draft, fields);
  const frequency = readWageFrequency(draft, fields);
  return box5 != null && box5 > 0 && stub != null && stub > 0 && Boolean(frequency);
}

export function wageExtractPairReceived(draft: FoxIntakeDraft): boolean {
  const w2 =
    Boolean(draft.pendingWageExtract?.w2In) ||
    (draft.documents ?? []).some((doc) => {
      const cls = doc.extractClass;
      return cls === "w2" || doc.slot === "w2";
    });
  const stub =
    Boolean(draft.pendingWageExtract?.stubIn) ||
    (draft.documents ?? []).some((doc) => {
      const cls = doc.extractClass;
      return cls === "paystub" || doc.slot === "paystubs";
    });
  return w2 && stub;
}

/** Both files in, Box 5 absent, and stub / frequency was not actually read. Not Box 1. */
export function wageExtractFailedRead(draft: FoxIntakeDraft): boolean {
  if (!isWageExtractFirstPath(draft)) return false;
  if (isWageExtractProposal(draft.pendingProposal)) return false;
  if (readWageBox5(draft) != null) return false;
  return wageExtractPairReceived(draft) && !wageExtractCanConfirm(draft);
}

export function isWageExtractFirstPath(draft: FoxIntakeDraft): boolean {
  return wageThreadOpen(draft) && !draft.sampleAccepted && !draft.wageDocsAsked;
}

export function wageThreadOpen(draft: FoxIntakeDraft) {
  const type = draft.incomeType.value;
  return type === "w2" || type === "both";
}

export function skipWageDocs(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    awaitingPayFrequency: false,
    pendingProposal: isWageExtractProposal(draft.pendingProposal) ? null : draft.pendingProposal,
    pendingWageExtract: undefined,
    looksRightHold: false,
    awaitingUnreadNote: false,
  };
}

export function skipWageBox5(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, wageBox5Asked: true, pendingProposal: null };
}

export function skipWageFrequency(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, wageFrequencyAsked: true };
}

export function skipWageStub(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, wageStubAsked: true, pendingProposal: null, looksRightHold: false };
}

export function writeWagePayFrequency(draft: FoxIntakeDraft, raw: string): FoxIntakeDraft {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return { ...draft, wageFrequencyAsked: true };
  const now = new Date().toISOString();
  return {
    ...draft,
    wageFrequencyAsked: true,
    awaitingPayFrequency: false,
    facts: {
      ...(draft.facts ?? {}),
      pay_frequency: {
        field: "pay_frequency",
        value,
        source: "client",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

/** Box 5 is last year’s gross. Do not invent a monthly or open Use this. */
export function writeWageBox5(draft: FoxIntakeDraft, annual: number): FoxIntakeDraft {
  const now = new Date().toISOString();
  const next: FoxIntakeDraft = {
    ...draft,
    wageBox5Asked: true,
    pendingProposal: null,
  };
  if (!Number.isFinite(annual) || annual <= 0) return next;
  return {
    ...next,
    facts: {
      ...(draft.facts ?? {}),
      w2_box5: {
        field: "w2_box5",
        value: String(Math.round(annual)),
        source: "client",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

/** They typed the stub amount. Fox converts to monthly. Both numbers stay. Do not ask Use this again. */
export function writeTypedStubMonthly(draft: FoxIntakeDraft, stubAmount: number): FoxIntakeDraft {
  const now = new Date().toISOString();
  const asked: FoxIntakeDraft = {
    ...draft,
    wageStubAsked: true,
    wageDocsAsked: true,
    pendingProposal: null,
  };
  if (!Number.isFinite(stubAmount) || stubAmount <= 0) return asked;
  const stubValue = String(Math.round(stubAmount));
  const periods = periodsPerYear(factValue(draft, "pay_frequency"));
  const monthly = periods != null && periods > 0 ? Math.round((stubAmount * periods) / 12) : null;
  const box5 = parseExtractMoney(factValue(asked, "w2_box5"));
  const w2Monthly = box5 != null && box5 > 0 ? monthlyFromAnnual(box5) : null;
  let next: FoxIntakeDraft = {
    ...asked,
    facts: {
      ...(draft.facts ?? {}),
      [PAYSTUB_AMOUNT_FIELD]: {
        field: PAYSTUB_AMOUNT_FIELD,
        value: stubValue,
        source: "client",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
  if (monthly == null || monthly <= 0) return next;
  const monthlyValue = String(monthly);
  next = {
    ...next,
    facts: {
      ...(next.facts ?? {}),
      [PAYSTUB_MONTHLY_FIELD]: {
        field: PAYSTUB_MONTHLY_FIELD,
        value: monthlyValue,
        source: "client",
        confirmed: true,
        confirmedAt: now,
      },
      [WAGE_MONTHLY_FIELD]: {
        field: WAGE_MONTHLY_FIELD,
        value: monthlyValue,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      [QUALIFYING_INCOME_FIELD]: {
        field: QUALIFYING_INCOME_FIELD,
        value: monthlyValue,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
  if (w2Monthly != null && Math.abs(monthly - w2Monthly) >= 50) {
    return enterBothMonthlyAsk({
      ...next,
      facts: {
        ...(next.facts ?? {}),
        [W2_MONTHLY_FIELD]: {
          field: W2_MONTHLY_FIELD,
          value: String(w2Monthly),
          source: "computed",
          confirmed: true,
          confirmedAt: now,
        },
      },
    });
  }
  return next;
}

export function proposeWageW2Extract(draft: FoxIntakeDraft, box5: number, employer: string): FoxIntakeDraft {
  const name = String(employer ?? "").trim();
  if (box5 <= 0 || !name) return draft;
  return {
    ...draft,
    awaitingPayFrequency: false,
    looksRightHold: true,
    pendingProposal: {
      field: WAGE_EXTRACT_FIELD,
      value: Number.isInteger(box5) ? String(box5) : String(Math.round(box5 * 100) / 100),
      label: "wage extract",
      kind: "computed",
      extras: [
        { field: "w2_box5", value: Number.isInteger(box5) ? String(box5) : String(Math.round(box5 * 100) / 100), label: "Box 5" },
        { field: "employer_name", value: name, label: "employer" },
      ],
    },
  };
}

export function proposeWageExtract(draft: FoxIntakeDraft, box5: number, stub: number, frequency: string): FoxIntakeDraft {
  const spoken = speakPayFrequency(frequency);
  const periods = periodsPerYear(spoken || frequency);
  if (!spoken || periods == null || box5 <= 0 || stub <= 0) return draft;
  const monthly = Math.round((stub * periods) / 12);
  if (monthly <= 0) return draft;
  return {
    ...draft,
    awaitingPayFrequency: false,
    looksRightHold: true,
    pendingProposal: {
      field: WAGE_EXTRACT_FIELD,
      value: String(monthly),
      label: "wage extract",
      kind: "computed",
      extras: [
        { field: "w2_box5", value: Number.isInteger(box5) ? String(box5) : String(Math.round(box5 * 100) / 100), label: "Box 5" },
        { field: PAYSTUB_AMOUNT_FIELD, value: Number.isInteger(stub) ? String(stub) : String(Math.round(stub * 100) / 100), label: "stub amount" },
        { field: "pay_frequency", value: spoken, label: "pay frequency" },
        { field: PAYSTUB_MONTHLY_FIELD, value: String(monthly), label: "stub monthly" },
        { field: WAGE_MONTHLY_FIELD, value: String(monthly), label: "wage monthly" },
        { field: QUALIFYING_INCOME_FIELD, value: String(monthly), label: "qualifying income" },
      ],
    },
  };
}

export function maybeProposeWageExtract(
  draft: FoxIntakeDraft,
  fields?: Record<string, string>,
  extractClass?: ExtractClass,
): FoxIntakeDraft {
  if (draft.sampleAccepted || !wageThreadOpen(draft)) return draft;
  if (wageW2ExtractAccepted(draft)) return draft;
  if (draft.pendingConflict) return draft;
  const held = mergePendingWageExtract(draft, fields, extractClass);
  if (wageExtractCanConfirm(held, fields)) {
    const box5 = readWageBox5(held, fields);
    const stub = readStubAmount(held, fields);
    const frequency = readWageFrequency(held, fields);
    if (box5 == null || stub == null || !frequency) return held;
    return proposeWageExtract(held, box5, stub, frequency);
  }
  const box5 = readWageBox5(held, fields);
  const employer = String(fields?.employer_name ?? held.pendingWageExtract?.employer ?? "").trim();
  if (box5 != null && box5 > 0 && employer) {
    return proposeWageW2Extract(held, box5, employer);
  }
  return held;
}

export function acceptWageExtract(draft: FoxIntakeDraft): FoxIntakeDraft {
  const proposal = draft.pendingProposal;
  if (!isWageExtractProposal(proposal) || !proposal) {
    return {
      ...draft,
      wageDocsAsked: true,
      wageBox5Asked: true,
      wageFrequencyAsked: true,
      wageStubAsked: true,
      pendingWageExtract: undefined,
    };
  }
  const now = new Date().toISOString();
  const w2Only = isWageW2OnlyProposal(proposal);
  let next: FoxIntakeDraft = {
    ...draft,
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: !w2Only,
    awaitingPayFrequency: false,
    pendingProposal: null,
    pendingWageExtract: w2Only ? { ...draft.pendingWageExtract, w2In: true } : undefined,
    looksRightHold: w2Only,
  };
  const extras = proposal.extras ?? [];
  const facts = { ...(draft.facts ?? {}) };
  const w2OnlyWrite = new Set(["w2_box5", "employer_name", "medicare_wages"]);
  for (const extra of extras) {
    if (w2Only && !w2OnlyWrite.has(extra.field)) continue;
    facts[extra.field] = {
      field: extra.field,
      value: extra.value,
      source: extra.field === QUALIFYING_INCOME_FIELD || extra.field === WAGE_MONTHLY_FIELD ? "suggested" : "document",
      confirmed: true,
      confirmedAt: now,
    };
  }
  const box5 = extras.find((item) => item.field === "w2_box5")?.value ?? "";
  const stub = w2Only ? "" : extras.find((item) => item.field === PAYSTUB_AMOUNT_FIELD)?.value ?? "";
  if (box5 && !facts.medicare_wages?.value) {
    facts.medicare_wages = {
      field: "medicare_wages",
      value: box5,
      source: "document",
      confirmed: true,
      confirmedAt: now,
    };
  }
  if (stub && !facts.gross_period?.value) {
    facts.gross_period = {
      field: "gross_period",
      value: stub,
      source: "document",
      confirmed: true,
      confirmedAt: now,
    };
  }
  const employer = (
    extras.find((item) => item.field === "employer_name")?.value ??
    draft.pendingWageExtract?.employer ??
    ""
  ).trim();
  if (employer) {
    facts.employer_name = {
      field: "employer_name",
      value: employer,
      source: "document",
      confirmed: true,
      confirmedAt: now,
    };
  }
  if (w2Only) {
    delete facts.wages;
    delete facts.gross_period;
    delete facts.paystub_amount;
    delete facts.pay_frequency;
  }
  next = { ...next, facts };
  if (employer) next = writeCurrentEmploymentHistory(next, employer);
  return next;
}

export function changeWageExtract(draft: FoxIntakeDraft): FoxIntakeDraft {
  const proposal = draft.pendingProposal;
  if (!isWageExtractProposal(proposal) || !proposal) return draft;
  const extras = proposal.extras ?? [];
  const box5 = Number(extras.find((item) => item.field === "w2_box5")?.value ?? draft.pendingWageExtract?.box5 ?? 0);
  const employer = (
    extras.find((item) => item.field === "employer_name")?.value ??
    draft.pendingWageExtract?.employer ??
    ""
  ).trim();
  const stub = Number(extras.find((item) => item.field === PAYSTUB_AMOUNT_FIELD)?.value ?? 0);
  const frequency = extras.find((item) => item.field === "pay_frequency")?.value ?? "";
  const cleared: FoxIntakeDraft = {
    ...draft,
    pendingProposal: null,
    correcting: null,
    correctingLine: null,
    wageDocsAsked: false,
    wageStubAsked: false,
    looksRightHold: true,
  };
  if (stub > 0 && frequency && box5 > 0) {
    return proposeWageExtract(cleared, box5, stub, frequency);
  }
  if (box5 > 0 && employer) {
    return proposeWageW2Extract(cleared, box5, employer);
  }
  return { ...cleared, pendingWageExtract: undefined };
}

function moneyFieldValue(value: number): string {
  const cents = Math.round(value * 100);
  if (cents % 100 === 0) return String(cents / 100);
  return (cents / 100).toFixed(2);
}

export function conventionalStubMonthly(stub: number, frequency: string): number | null {
  const spoken = speakPayFrequency(frequency) || String(frequency ?? "").trim().toLowerCase();
  const periods = periodsPerYear(spoken);
  if (periods == null || periods <= 0 || stub <= 0) return null;
  return Math.round((stub * periods * 100) / 12) / 100;
}

export function stubExtractConfirmCopy(
  employer: string,
  stub: number,
  frequency: string,
  monthly: number,
  _employee?: string,
): string {
  const name = String(employer ?? "").trim();
  const spoken = speakPayFrequency(frequency) || String(frequency ?? "").trim().toLowerCase();
  return `${name}. ${speakWageMoney(stub)} ${spoken}. ${speakWageMoney(monthly)} a month. Use this?`;
}

function stubEmployeeName(fields?: Record<string, string>, draft?: FoxIntakeDraft): string {
  return String(
    fields?.full_name ?? fields?.employee_name ?? draft?.pendingWageExtract?.employee ?? "",
  ).trim();
}

function stubEmployerName(fields?: Record<string, string>, draft?: FoxIntakeDraft): string {
  return String(
    fields?.employer_name ??
      draft?.pendingWageExtract?.employer ??
      (draft ? factValue(draft, "employer_name") : ""),
  ).trim();
}

/** After W-2 Use this / Skip W-2, waiting for stub confirm. Not extract-first. */
export function stubExtractAskOpen(draft: FoxIntakeDraft): boolean {
  if (draft.sampleAccepted || draft.wageStubAsked || draft.stubExtractAccepted) return false;
  if (!wageThreadOpen(draft)) return false;
  if (isWageExtractFirstPath(draft)) return false;
  return wageW2ExtractAccepted(draft) || Boolean(draft.wageDocsAsked);
}

export function canSpeakStubExtract(
  draft: FoxIntakeDraft,
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  const stub =
    parseExtractMoney(fields?.gross_period) ??
    parseExtractMoney(fields?.paystub_amount) ??
    parseExtractMoney(String(fields?.gross_period ?? ""));
  const frequency = speakPayFrequency(String(fields?.pay_frequency ?? ""));
  const employer = stubEmployerName(
    {
      employer_name: String(fields?.employer_name ?? ""),
    },
    draft,
  );
  return stub != null && stub > 0 && Boolean(frequency) && Boolean(employer);
}

export function shouldProposeStubExtract(
  draft: FoxIntakeDraft,
  extractClass?: ExtractClass,
): boolean {
  if (extractClass && extractClass !== "paystub" && extractClass !== "other") return false;
  return stubExtractAskOpen(draft);
}

export function proposeStubExtract(
  draft: FoxIntakeDraft,
  stub: number,
  frequency: string,
  employer: string,
  employee?: string,
  variablePay?: boolean,
): FoxIntakeDraft {
  const spoken = speakPayFrequency(frequency);
  const monthly = conventionalStubMonthly(stub, spoken || frequency);
  const name = String(employer ?? "").trim();
  if (!spoken || monthly == null || monthly <= 0 || stub <= 0 || !name) return draft;
  const who = String(employee ?? "").trim();
  const variable = Boolean(variablePay || draft.pendingWageExtract?.variablePay);
  return {
    ...draft,
    awaitingPayFrequency: false,
    looksRightHold: true,
    pendingWageExtract: {
      ...(draft.pendingWageExtract ?? {}),
      stub,
      frequency: spoken,
      employer: name,
      ...(who ? { employee: who } : {}),
      monthly,
      stubIn: true,
      ...(variable ? { variablePay: true } : {}),
    },
    pendingProposal: {
      field: STUB_EXTRACT_FIELD,
      value: moneyFieldValue(monthly),
      label: "stub extract",
      kind: "computed",
      extras: [
        { field: "employer_name", value: name, label: "employer" },
        ...(who ? [{ field: "full_name", value: who, label: "employee" }] : []),
        { field: PAYSTUB_AMOUNT_FIELD, value: moneyFieldValue(stub), label: "stub amount" },
        { field: "pay_frequency", value: spoken, label: "pay frequency" },
        { field: PAYSTUB_MONTHLY_FIELD, value: moneyFieldValue(monthly), label: "stub monthly" },
      ],
    },
  };
}

export function maybeProposeStubExtract(
  draft: FoxIntakeDraft,
  fields?: Record<string, string>,
  extractClass?: ExtractClass,
): FoxIntakeDraft {
  if (!shouldProposeStubExtract(draft, extractClass)) return draft;
  const stub = parseExtractMoney(fields?.gross_period) ?? parseExtractMoney(fields?.paystub_amount);
  const frequency = speakPayFrequency(fields?.pay_frequency);
  const employer = stubEmployerName(fields, draft);
  const employee = stubEmployeeName(fields, draft);
  if (stub == null || stub <= 0 || !frequency || !employer) return draft;
  return proposeStubExtract(draft, stub, frequency, employer, employee, fieldsHaveVariablePay(fields));
}

function stubExtractParts(draft: FoxIntakeDraft): {
  stub: number;
  frequency: string;
  employer: string;
  employee: string;
  monthly: number;
} | null {
  const proposal = draft.pendingProposal;
  const extras = proposal?.extras ?? [];
  const stub =
    Number(extras.find((item) => item.field === PAYSTUB_AMOUNT_FIELD)?.value ?? 0) ||
    draft.pendingWageExtract?.stub ||
    0;
  const frequency =
    extras.find((item) => item.field === "pay_frequency")?.value ||
    draft.pendingWageExtract?.frequency ||
    "";
  const employer = (
    extras.find((item) => item.field === "employer_name")?.value ||
    draft.pendingWageExtract?.employer ||
    ""
  ).trim();
  const employee = (
    extras.find((item) => item.field === "full_name")?.value ||
    draft.pendingWageExtract?.employee ||
    ""
  ).trim();
  const spoken = speakPayFrequency(frequency);
  const monthly =
    Number(extras.find((item) => item.field === PAYSTUB_MONTHLY_FIELD)?.value ?? 0) ||
    draft.pendingWageExtract?.monthly ||
    conventionalStubMonthly(stub, spoken || frequency) ||
    0;
  if (stub <= 0 || !spoken || monthly <= 0 || !employer) return null;
  return { stub, frequency: spoken, employer, employee, monthly };
}

function writeStubPayLine(
  draft: FoxIntakeDraft,
  parts: { stub: number; frequency: string; employer: string; monthly: number },
  mode: "same" | "two" | "only",
): FoxIntakeDraft {
  const now = new Date().toISOString();
  const facts = { ...(draft.facts ?? {}) };
  const fileEmployer = factValue(draft, "employer_name").trim();
  if (mode === "only" && parts.employer && !fileEmployer) {
    facts.employer_name = {
      field: "employer_name",
      value: parts.employer,
      source: "document",
      confirmed: true,
      confirmedAt: now,
    };
  }
  facts[PAYSTUB_AMOUNT_FIELD] = {
    field: PAYSTUB_AMOUNT_FIELD,
    value: moneyFieldValue(parts.stub),
    source: "document",
    confirmed: true,
    confirmedAt: now,
  };
  facts.gross_period = {
    field: "gross_period",
    value: moneyFieldValue(parts.stub),
    source: "document",
    confirmed: true,
    confirmedAt: now,
  };
  facts.pay_frequency = {
    field: "pay_frequency",
    value: parts.frequency,
    source: "document",
    confirmed: true,
    confirmedAt: now,
  };
  facts[PAYSTUB_MONTHLY_FIELD] = {
    field: PAYSTUB_MONTHLY_FIELD,
    value: moneyFieldValue(parts.monthly),
    source: "document",
    confirmed: true,
    confirmedAt: now,
  };
  let next: FoxIntakeDraft = {
    ...draft,
    wageDocsAsked: true,
    wageStubAsked: true,
    stubExtractAccepted: true,
    awaitingPayFrequency: false,
    pendingProposal: null,
    looksRightHold: false,
    facts,
  };
  if (mode === "two") {
    next = writeCurrentEmploymentHistory(next, parts.employer);
  } else if (mode === "only" && parts.employer && !fileEmployer) {
    next = writeCurrentEmploymentHistory(next, parts.employer);
  }
  const decision = wageExtractAfterStubDecision(next, parts.monthly, mode);
  if (decision.kind === "chips") {
    next = writeConfirmedIncomeFact(next, W2_MONTHLY_FIELD, String(decision.w2Monthly), "computed");
    return { ...enterBothMonthlyAsk(next), looksRightHold: true };
  }
  if (decision.kind === "lower") {
    next = writeConfirmedIncomeFact(next, W2_MONTHLY_FIELD, String(decision.w2Monthly), "computed");
    next = writeConfirmedIncomeFact(next, INCOME_CAUTION_FIELD, WAGE_STUB_LOWER_CAUTION, "suggested");
    return { ...enterBothMonthlyAsk(next), looksRightHold: true };
  }
  return next;
}

function proposeStubJobAsk(draft: FoxIntakeDraft): FoxIntakeDraft {
  const parts = stubExtractParts(draft);
  if (!parts) return draft;
  return {
    ...draft,
    looksRightHold: true,
    pendingProposal: {
      field: STUB_JOB_FIELD,
      value: "",
      label: "stub job",
      kind: "computed",
      extras: [
        { field: "employer_name", value: parts.employer, label: "employer" },
        ...(parts.employee ? [{ field: "full_name", value: parts.employee, label: "employee" }] : []),
        { field: PAYSTUB_AMOUNT_FIELD, value: moneyFieldValue(parts.stub), label: "stub amount" },
        { field: "pay_frequency", value: parts.frequency, label: "pay frequency" },
        { field: PAYSTUB_MONTHLY_FIELD, value: moneyFieldValue(parts.monthly), label: "stub monthly" },
      ],
    },
  };
}

export function acceptStubExtract(draft: FoxIntakeDraft): FoxIntakeDraft {
  const proposal = draft.pendingProposal;
  if (!isStubExtractProposal(proposal) && !isStubJobProposal(proposal)) return draft;
  const parts = stubExtractParts(draft);
  if (!parts) return draft;
  const fileEmployer = factValue(draft, "employer_name").trim();
  if (fileEmployer && !employersClose(fileEmployer, parts.employer)) {
    return proposeStubJobAsk(draft);
  }
  return writeStubPayLine(draft, parts, fileEmployer ? "same" : "only");
}

export function acceptStubJob(draft: FoxIntakeDraft, answer: "same" | "two"): FoxIntakeDraft {
  const parts = stubExtractParts(draft);
  if (!parts) return draft;
  if (draft.stubExtractAccepted) {
    let next: FoxIntakeDraft = {
      ...draft,
      pendingProposal: null,
      awaitingBothMonthlyReason: false,
      looksRightHold: false,
      bothMonthlyReason: answer === "two" ? "second-job" : draft.bothMonthlyReason,
    };
    if (answer === "two") next = writeCurrentEmploymentHistory(next, parts.employer);
    return next;
  }
  return writeStubPayLine(draft, parts, answer);
}

export function changeStubExtract(draft: FoxIntakeDraft): FoxIntakeDraft {
  const parts = stubExtractParts({
    ...draft,
    pendingProposal: isStubExtractProposal(draft.pendingProposal) || isStubJobProposal(draft.pendingProposal)
      ? draft.pendingProposal
      : draft.pendingProposal,
  });
  const held = parts ?? {
    stub: draft.pendingWageExtract?.stub ?? 0,
    frequency: draft.pendingWageExtract?.frequency ?? "",
    employer: draft.pendingWageExtract?.employer ?? "",
    employee: draft.pendingWageExtract?.employee ?? "",
    monthly: draft.pendingWageExtract?.monthly ?? 0,
  };
  const cleared: FoxIntakeDraft = {
    ...draft,
    pendingProposal: null,
    correcting: null,
    correctingLine: null,
    wageStubAsked: false,
    stubExtractAccepted: false,
    looksRightHold: true,
  };
  if (held.stub > 0 && held.frequency && held.employer) {
    return proposeStubExtract(cleared, held.stub, held.frequency, held.employer, held.employee);
  }
  return cleared;
}

/** @deprecated Use writeTypedStubMonthly — typed stub is a write, not a confirm. */
export function proposeStubMonthly(draft: FoxIntakeDraft, monthly: number): FoxIntakeDraft {
  return writeTypedStubMonthly(draft, monthly);
}
