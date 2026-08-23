import type { ExtractClass, FactProposal, FoxIntakeDraft } from "./types";
import {
  DECLINING_INCOME_CAUTION,
  DECLINING_YEAR_RATIO,
  SUGGESTED_INCOME_NOTE,
  YTD_CONFLICT_CAUTION,
  k1OrdinaryMonthly,
  laterYearIsMateriallyLower,
  monthlyFromAnnual,
  monthsThroughPeriodEnd,
  periodsPerYear,
  scheduleCAnnual,
  stableOrDecliningAnnual,
  suggestScheduleCIncome,
  suggestWageIncome,
  yearNumber,
  type QualifyingMethod,
  type ScheduleCYearInput,
  type WageSuggestInput,
  type WageYearInput,
} from "@/lib/income/suggest";

export {
  DECLINING_INCOME_CAUTION,
  DECLINING_YEAR_RATIO,
  SUGGESTED_INCOME_NOTE,
  YTD_CONFLICT_CAUTION,
  k1OrdinaryMonthly,
  monthlyFromAnnual,
  monthsThroughPeriodEnd,
  periodsPerYear,
  scheduleCAnnual,
  stableOrDecliningAnnual,
  suggestScheduleCIncome,
  suggestWageIncome,
  yearNumber,
};
export type { QualifyingMethod, ScheduleCYearInput, WageSuggestInput, WageYearInput };

export const QUALIFYING_INCOME_FIELD = "qualifying_income";
export const TAX_CASHFLOWS_FIELD = "tax_cashflows";

export type TaxReturnKind = "schedule_c" | "k1" | "1065" | "1120s" | "";
export type QualifyingBasis = "schedule_c" | "wage" | "k1";

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

function wagePriorYear(draft: FoxIntakeDraft, extractYear: number | null): WageYearInput | null {
  const draftYear = yearFromWageField(factValue(draft, "tax_year"));
  if (draftYear == null || extractYear == null || draftYear === extractYear) return null;
  const wages = parseExtractMoney(factValue(draft, "wages"));
  const overtime = parseExtractMoney(factValue(draft, "overtime"));
  const bonus = parseExtractMoney(factValue(draft, "bonus"));
  const commission = parseExtractMoney(factValue(draft, "commission"));
  if (wages == null && overtime == null && bonus == null && commission == null) return null;
  return { taxYear: draftYear, wages, overtime, bonus, commission };
}

function wageSuggestInput(draft: FoxIntakeDraft, fields: Record<string, string>): WageSuggestInput {
  const extractYear =
    yearFromWageField(String(fields.tax_year ?? "").trim()) ??
    yearFromWageField(String(fields.pay_period_end ?? factValue(draft, "pay_period_end") ?? "").trim());
  const priorYear = wagePriorYear(draft, extractYear);
  const currentOrDraft = (key: string) =>
    parseExtractMoney(fields[key] || (priorYear ? "" : factValue(draft, key)));
  return {
    payPeriodEnd: pickWageField(fields, draft, "pay_period_end") || null,
    grossPeriod: parseExtractMoney(pickWageField(fields, draft, "gross_period")),
    ytdGross: parseExtractMoney(pickWageField(fields, draft, "ytd_gross")),
    payFrequency: pickWageField(fields, draft, "pay_frequency") || null,
    w2Wages: parseExtractMoney(fields.wages || factValue(draft, "wages")),
    overtime: currentOrDraft("overtime"),
    bonus: currentOrDraft("bonus"),
    commission: currentOrDraft("commission"),
    priorYear,
  };
}

export function wageIncomeFromDraft(
  draft: FoxIntakeDraft,
  fields: Record<string, string> = {},
) {
  return suggestWageIncome(wageSuggestInput(draft, fields));
}

export function wageIncomeCaution(draft: FoxIntakeDraft): string | undefined {
  return wageIncomeFromDraft(draft)?.caution;
}

export function monthlyQualifyingFromExtract(
  draft: FoxIntakeDraft,
  extractClass: ExtractClass,
  fields: Record<string, string>,
): QualifyingIncomeResult | null {
  if (extractClass === "paystub" || extractClass === "w2") {
    const wage = suggestWageIncome(wageSuggestInput(draft, fields));
    if (wage == null || wage.monthly === 0) return null;
    return { monthly: wage.monthly, basis: "wage", method: wage.method, caution: wage.caution };
  }
  if (extractClass !== "tax_return") return null;
  const incoming = cashflowFromExtract(fields);
  const years = mergeTaxCashflows(readTaxCashflows(draft), incoming);
  const scheduleC = suggestScheduleCIncome(scheduleCYearsFromCashflows(years));
  if (scheduleC != null) {
    return {
      monthly: scheduleC.monthly,
      basis: "schedule_c",
      method: scheduleC.method,
      caution: scheduleC.caution,
    };
  }
  const entity = k1Monthly(years);
  if (entity != null) return { monthly: entity, basis: "k1" };
  return null;
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

export function qualifyingIncomeProposal(monthly: number): FactProposal {
  return {
    field: QUALIFYING_INCOME_FIELD,
    value: String(monthly),
    label: "qualifying income",
    kind: "computed",
    note: SUGGESTED_INCOME_NOTE,
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
  if (existing && valuesMatch(existing.value, monthly)) return draft;
  if (existing?.via === QUALIFYING_INCOME_FIELD && extractClass === "tax_return") {
    return {
      ...draft,
      pendingConflict: null,
      pendingProposal: qualifyingIncomeProposal(computed.monthly),
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
    pendingProposal: qualifyingIncomeProposal(computed.monthly),
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
  if (draft.pendingConflict && !(extractClass === "tax_return" && existingMonthlyIncome(draft)?.via === QUALIFYING_INCOME_FIELD)) {
    return next;
  }
  return withQualifyingIncomeProposal(next, computed, extractClass);
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

export function qualifyingIncomeDisplay(draft: FoxIntakeDraft): { value: string; note: string } | null {
  const proposal =
    draft.pendingProposal?.field === QUALIFYING_INCOME_FIELD ? draft.pendingProposal : null;
  if (proposal) {
    return {
      value: displayMoney(proposal.value),
      note: proposal.note ?? SUGGESTED_INCOME_NOTE,
    };
  }
  const stored = factValue(draft, QUALIFYING_INCOME_FIELD);
  if (stored) {
    return {
      value: displayMoney(stored),
      note: SUGGESTED_INCOME_NOTE,
    };
  }
  return null;
}
