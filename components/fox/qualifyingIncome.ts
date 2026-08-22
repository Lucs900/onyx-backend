import type { ExtractClass, FactProposal, FoxIntakeDraft } from "./types";

export const QUALIFYING_INCOME_FIELD = "qualifying_income";
export const TAX_CASHFLOWS_FIELD = "tax_cashflows";
export const SUGGESTED_INCOME_NOTE = "Suggested qualifying income · not underwritten";

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

export function periodsPerYear(raw?: string | null): number | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (!v) return null;
  if (/(biweekly|every2weeks|fortnight)/.test(v)) return 26;
  if (/(semimonth|twiceamonth)/.test(v)) return 24;
  if (/weekly/.test(v)) return 52;
  if (/month/.test(v)) return 12;
  if (/quarter/.test(v)) return 4;
  if (/(annual|yearly)/.test(v)) return 1;
  return null;
}

export function monthsThroughPeriodEnd(raw?: string | null): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (iso) {
    const month = Number(iso[2]);
    return month >= 1 && month <= 12 ? month : null;
  }
  const us = text.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (us) {
    const month = Number(us[1]);
    return month >= 1 && month <= 12 ? month : null;
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  const month = new Date(parsed).getUTCMonth() + 1;
  return month >= 1 && month <= 12 ? month : null;
}

export function scheduleCAnnual(input: {
  netProfit: number | null;
  depreciation?: number | null;
  depletion?: number | null;
  businessUseOfHome?: number | null;
  nonrecurringOtherIncome?: number | null;
  amortization?: number | null;
  casualtyLoss?: number | null;
  mileageDepreciation?: number | null;
}): number | null {
  if (input.netProfit == null) return null;
  return (
    input.netProfit +
    (input.depreciation ?? 0) +
    (input.depletion ?? 0) +
    (input.businessUseOfHome ?? 0) +
    (input.amortization ?? 0) +
    (input.casualtyLoss ?? 0) +
    (input.mileageDepreciation ?? 0) -
    (input.nonrecurringOtherIncome ?? 0)
  );
}

/** Two-year self-employed: average unless the later year is lower. */
export function stableOrDecliningAnnual(earlier: number, later: number): number {
  return later < earlier ? later : (earlier + later) / 2;
}

export const DECLINING_YEAR_RATIO = 0.9;
export const DECLINING_INCOME_CAUTION = "Income is lower this year. I’m using the later year.";

function scheduleCUsableYears(years: TaxYearCashflow[]) {
  return years
    .map((row) => ({
      year: yearNumber(row.tax_year) ?? 0,
      kind:
        row.return_kind === "schedule_c" || (!row.return_kind && row.schedule_c_net_profit)
          ? "schedule_c"
          : row.return_kind,
      annual: annualFromCashflow(row),
    }))
    .filter((row) => row.kind === "schedule_c" && row.annual != null)
    .sort((a, b) => a.year - b.year) as { year: number; kind: "schedule_c"; annual: number }[];
}

/** Later Sch C year is at least 10% below the earlier year. Quiet caution only — not a denial. */
export function laterYearIncomeLower(draft: FoxIntakeDraft): boolean {
  const usable = scheduleCUsableYears(readTaxCashflows(draft));
  if (usable.length < 2) return false;
  const earlier = usable[usable.length - 2];
  const later = usable[usable.length - 1];
  if (earlier.annual <= 0) return false;
  return later.annual / earlier.annual <= DECLINING_YEAR_RATIO;
}

export function decliningIncomeCaution(draft: FoxIntakeDraft): string | undefined {
  return laterYearIncomeLower(draft) ? DECLINING_INCOME_CAUTION : undefined;
}

export function monthlyFromAnnual(annual: number): number {
  return Math.round(annual / 12);
}

export function formatIncomeMoney(value: number): string {
  const shown = `$${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
  return value < 0 ? `-${shown}` : shown;
}

export function scheduleCYearViews(draft: FoxIntakeDraft): { year: number; annual: number }[] {
  return scheduleCUsableYears(readTaxCashflows(draft));
}

function yearNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 2) {
    const n = Number(digits);
    return Number.isFinite(n) ? 2000 + n : null;
  }
  if (digits.length === 4) {
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

function annualFromCashflow(row: TaxYearCashflow): number | null {
  return scheduleCAnnual({
    netProfit: parseExtractMoney(row.schedule_c_net_profit),
    depreciation: parseExtractMoney(row.depreciation),
    depletion: parseExtractMoney(row.depletion),
    businessUseOfHome: parseExtractMoney(row.business_use_of_home),
    nonrecurringOtherIncome: parseExtractMoney(row.nonrecurring_other_income),
    amortization: parseExtractMoney(row.amortization),
    casualtyLoss: parseExtractMoney(row.casualty_loss),
    mileageDepreciation: parseExtractMoney(row.mileage_depreciation),
  });
}

function scheduleCMonthly(years: TaxYearCashflow[]): number | null {
  const usable = scheduleCUsableYears(years);
  if (!usable.length) return null;
  if (usable.length === 1) return monthlyFromAnnual(usable[0].annual);
  const earlier = usable[usable.length - 2];
  const later = usable[usable.length - 1];
  return monthlyFromAnnual(stableOrDecliningAnnual(earlier.annual, later.annual));
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
  return monthlyFromAnnual(latest.ordinary);
}

export function k1OrdinaryMissingDistributions(draft: FoxIntakeDraft): boolean {
  return readTaxCashflows(draft).some(
    (row) => String(row.k1_ordinary_income ?? "").trim() && !String(row.k1_distributions ?? "").trim(),
  );
}

export function hasScheduleCCashflow(draft: FoxIntakeDraft): boolean {
  return readTaxCashflows(draft).some((row) => String(row.schedule_c_net_profit ?? "").trim());
}

export function wageMonthly(fields: Record<string, string>): number | null {
  const ytd = parseExtractMoney(fields.ytd_gross);
  const months = monthsThroughPeriodEnd(fields.pay_period_end);
  if (ytd != null && ytd !== 0 && months != null && months > 0) {
    return Math.round(ytd / months);
  }
  const period = parseExtractMoney(fields.gross_period);
  const freq = periodsPerYear(fields.pay_frequency);
  if (period != null && period !== 0 && freq != null) {
    return Math.round((period * freq) / 12);
  }
  const wages = parseExtractMoney(fields.wages);
  if (wages != null && wages !== 0) return monthlyFromAnnual(wages);
  return null;
}

export function monthlyQualifyingFromExtract(
  draft: FoxIntakeDraft,
  extractClass: ExtractClass,
  fields: Record<string, string>,
): QualifyingIncomeResult | null {
  if (extractClass === "paystub" || extractClass === "w2") {
    const monthly = wageMonthly(fields);
    if (monthly == null || monthly === 0) return null;
    return { monthly, basis: "wage" };
  }
  if (extractClass !== "tax_return") return null;
  const incoming = cashflowFromExtract(fields);
  const years = mergeTaxCashflows(readTaxCashflows(draft), incoming);
  const scheduleC = scheduleCMonthly(years);
  if (scheduleC != null) return { monthly: scheduleC, basis: "schedule_c" };
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
): FoxIntakeDraft {
  if (!computed) return draft;
  const monthly = String(computed.monthly);
  const existing = existingMonthlyIncome(draft);
  if (existing && valuesMatch(existing.value, monthly)) return draft;
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
  if (draft.pendingConflict) return next;
  return withQualifyingIncomeProposal(next, computed);
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
