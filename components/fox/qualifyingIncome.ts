import type { ExtractClass, FactProposal, FieldSource, FoxIntakeDraft } from "./types";
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
  proposeBothMonthlyIncome,
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
  proposeBothMonthlyIncome,
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
export type { BothMonthlyReason, QualifyingMethod, ScheduleCYearInput, WageSuggestInput, WageYearInput };

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
  stubMonthly?: number;
  w2Monthly?: number;
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
  return bothMonthlyMethodNote(pair.stub, pair.w2);
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
  const proposed = proposeBothMonthlyIncome(pair.stub, pair.w2, reason);
  const next = writeConfirmedIncomeFact(
    {
      ...draft,
      awaitingBothMonthlyReason: false,
      bothMonthlyReason: reason,
      pendingConflict: null,
    },
    INCOME_CAUTION_FIELD,
    proposed.caution ?? bothMonthlyReasonNote(reason),
    "suggested",
  );
  return withQualifyingIncomeProposal(next, {
    monthly: proposed.monthly,
    basis: "wage",
    method: proposed.method,
    methodNote: proposed.methodNote,
    caution: proposed.caution,
    stubMonthly: pair.stub,
    w2Monthly: pair.w2,
    parts: { wage: proposed.monthly },
  });
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
    { ...next, awaitingPayFrequency: false, awaitingBothMonthlyReason: false, pendingConflict: existingMonthlyIncome(draft)?.via === QUALIFYING_INCOME_FIELD ? null : next.pendingConflict },
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
  if (draft.awaitingBothMonthlyReason) return null;
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
