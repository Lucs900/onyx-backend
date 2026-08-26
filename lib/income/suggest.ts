/**
 * Internal income suggest: Schedule C, K-1 ordinary, and W-2 / paystub.
 * Fox calls this. No 1084 UI. Borrower never sees a form.
 * W-2 is part of this module — do not keep a parallel wage engine on Fox.
 *
 * Schedule C monthly = (net + depreciation + depletion + home office − nonrecurring
 *            + any extracted add-backs) / 12
 */

import { conventionalIncomeRules } from "@/lib/guidelines/conventional";

export const SUGGESTED_INCOME_NOTE = "Suggested qualifying income · not underwritten";
export const DECLINING_INCOME_CAUTION = "Income is lower this year. I’m using the later year.";
export const DECLINING_YEAR_RATIO = 0.9;
export const YTD_CONFLICT_CAUTION =
  "YTD and the run-rate don’t match. I’m using the lower number — not a blend.";
export const YTD_CONFLICT_GAP = 50;
export const K1_ORDINARY_NOTE = "Ordinary is not confirmed cash flow.";
export const FREQUENCY_MATCH_SLACK = 0.55;
export const VARIABLE_THIN_NOTE = "History is thin.";
export const SECOND_JOB_THIN_NOTE = "Second-job history is thin.";
export const SECOND_JOB_SAME_STUB_NOTE = "A second employer name on one stub is not enough.";
export const VARIABLE_DECLINING_CAUTION = "Variable income is lower this year. I’m using the later year.";

export type QualifyingMethod =
  | "one-year"
  | "two-year-average"
  | "later-year-lower"
  | "period-frequency"
  | "ytd-months"
  | "w2-annual"
  | "ytd-conflict-lower"
  | "combined";

/** Extracted Schedule C add-backs. Extra lines stay unused unless printed. */
export type ScheduleCAddBacks = {
  depreciation?: number | null;
  depletion?: number | null;
  businessUseOfHome?: number | null;
  nonrecurringOtherIncome?: number | null;
  amortization?: number | null;
  casualtyLoss?: number | null;
  mileageDepreciation?: number | null;
};

export type ScheduleCYearInput = {
  taxYear: string;
  netProfit: number | null;
} & ScheduleCAddBacks;

export type IncomeSuggestResult = {
  monthly: number;
  method: QualifyingMethod;
  caution?: string;
  methodNote?: string;
  needsFrequency?: boolean;
  partialNotes?: string[];
  parts?: { wage?: number; scheduleC?: number; k1?: number };
};

export type WageYearInput = {
  taxYear?: number | string | null;
  wages?: number | null;
  overtime?: number | null;
  bonus?: number | null;
  commission?: number | null;
  overtimeYtd?: number | null;
  bonusYtd?: number | null;
  commissionYtd?: number | null;
  payPeriodEnd?: string | null;
};

export type SecondJobInput = {
  documentedSeparately: boolean;
  employerName?: string | null;
  priorYear?: WageYearInput | null;
  payPeriodEnd?: string | null;
  grossPeriod?: number | null;
  ytdGross?: number | null;
  payFrequency?: string | null;
  w2Wages?: number | null;
  overtime?: number | null;
  bonus?: number | null;
  commission?: number | null;
  overtimeYtd?: number | null;
  bonusYtd?: number | null;
  commissionYtd?: number | null;
};

export type WageSuggestInput = {
  payPeriodEnd?: string | null;
  grossPeriod?: number | null;
  ytdGross?: number | null;
  payFrequency?: string | null;
  w2Wages?: number | null;
  overtime?: number | null;
  bonus?: number | null;
  commission?: number | null;
  overtimeYtd?: number | null;
  bonusYtd?: number | null;
  commissionYtd?: number | null;
  priorYear?: WageYearInput | null;
  sameStubSecondEmployer?: boolean;
  secondJob?: SecondJobInput | null;
};

export function monthlyFromAnnual(annual: number): number {
  return Math.round(annual / 12);
}

/** (net + dep + depletion + home office − nonrecurring + extracted add-backs). */
export function scheduleCAnnual(input: {
  netProfit: number | null;
} & ScheduleCAddBacks): number | null {
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

export function yearNumber(raw: string): number | null {
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

function usableScheduleCYears(years: ScheduleCYearInput[]) {
  return years
    .map((row) => ({
      year: yearNumber(row.taxYear) ?? 0,
      annual: scheduleCAnnual(row),
    }))
    .filter((row): row is { year: number; annual: number } => row.annual != null)
    .sort((a, b) => a.year - b.year);
}

export function laterYearIsMateriallyLower(earlier: number, later: number): boolean {
  if (earlier <= 0) return false;
  return later / earlier <= DECLINING_YEAR_RATIO;
}

/**
 * Schedule C path. Inputs are tax year + Schedule C lines + extracted add-backs.
 * Outputs monthly, method, and the one declining caution when it applies.
 */
export function suggestScheduleCIncome(years: ScheduleCYearInput[]): IncomeSuggestResult | null {
  const usable = usableScheduleCYears(years);
  if (!usable.length) return null;
  if (usable.length === 1) {
    return { monthly: monthlyFromAnnual(usable[0].annual), method: "one-year" };
  }
  const earlier = usable[usable.length - 2];
  const later = usable[usable.length - 1];
  const laterLower = later.annual < earlier.annual;
  const materialDrop = laterYearIsMateriallyLower(earlier.annual, later.annual);
  if (laterLower || materialDrop) {
    return {
      monthly: monthlyFromAnnual(later.annual),
      method: "later-year-lower",
      caution: materialDrop ? DECLINING_INCOME_CAUTION : undefined,
    };
  }
  return {
    monthly: monthlyFromAnnual((earlier.annual + later.annual) / 2),
    method: "two-year-average",
  };
}

/** K-1 ordinary / 12. Suggested only — not confirmed cash flow. */
export function k1OrdinaryMonthly(ordinaryIncome: number): number {
  return monthlyFromAnnual(ordinaryIncome);
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

function usableMonthly(value: number | null | undefined): number | null {
  if (value == null || value === 0 || !Number.isFinite(value)) return null;
  return value;
}

export type ConventionalPayFrequency = {
  periods: 12 | 24 | 26 | 52;
  key: "monthly" | "semimonthly" | "biweekly" | "weekly";
  label: string;
};

const CONVENTIONAL_FREQUENCIES: ConventionalPayFrequency[] = [
  { periods: 26, key: "biweekly", label: "biweekly" },
  { periods: 24, key: "semimonthly", label: "semi-monthly" },
  { periods: 12, key: "monthly", label: "monthly" },
  { periods: 52, key: "weekly", label: "weekly" },
];

export function frequencyMethodNote(periods: number, label?: string): string {
  const named =
    label ??
    CONVENTIONAL_FREQUENCIES.find((row) => row.periods === periods)?.label ??
    `${periods}-period`;
  return `${named} period × ${periods} / 12`;
}

function parsePeriodEndDate(raw?: string | null): Date | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }
  const us = text.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (us) {
    const year = Number(us[3].length === 2 ? `20${us[3]}` : us[3]);
    return new Date(Date.UTC(year, Number(us[1]) - 1, Number(us[2])));
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayOfYearUtc(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000) + 1;
}

function expectedPeriodsThrough(freq: ConventionalPayFrequency, periodEnd: Date): number {
  const month = periodEnd.getUTCMonth() + 1;
  const day = periodEnd.getUTCDate();
  const doy = dayOfYearUtc(periodEnd);
  if (freq.periods === 26) return doy / 14;
  if (freq.periods === 52) return doy / 7;
  if (freq.periods === 24) return (month - 1) * 2 + (day >= 15 ? 2 : 1);
  return day >= 25 ? month : Math.max(month - 1, 1);
}

function ytdPeriodCount(ytd: number, period: number): number | null {
  if (period <= 0) return null;
  const count = ytd / period;
  if (!Number.isFinite(count) || count <= 0) return null;
  return count;
}

function nearIntegerPeriodCount(count: number): number | null {
  const rounded = Math.round(count);
  if (rounded < 1) return null;
  if (Math.abs(count - rounded) <= 0.02 || Math.abs(count - rounded) / count <= 0.01) return rounded;
  return null;
}

/** Infer 26 / 24 / 12 / 52 from YTD ÷ period + pay-period-end. Never guess when two counts fit. */
export function inferPayFrequency(
  input: WageSuggestInput,
): ConventionalPayFrequency | "ambiguous" | null {
  const period = usableMonthly(input.grossPeriod);
  const ytd = usableMonthly(input.ytdGross);
  const periodEnd = parsePeriodEndDate(input.payPeriodEnd);
  if (period == null || ytd == null || !periodEnd) return null;
  const observed = ytdPeriodCount(ytd, period);
  if (observed == null) return null;
  const matches = CONVENTIONAL_FREQUENCIES.filter((freq) => {
    const expected = expectedPeriodsThrough(freq, periodEnd);
    return Math.abs(observed - expected) <= FREQUENCY_MATCH_SLACK;
  });
  if (matches.length > 1) return "ambiguous";
  if (matches.length === 1) return matches[0];
  const whole = nearIntegerPeriodCount(observed);
  if (whole == null) return null;
  const wholeMatches = CONVENTIONAL_FREQUENCIES.filter((freq) => {
    const expected = expectedPeriodsThrough(freq, periodEnd);
    return Math.abs(whole - expected) <= FREQUENCY_MATCH_SLACK;
  });
  if (wholeMatches.length > 1) return "ambiguous";
  return wholeMatches[0] ?? null;
}

function resolvePayFrequency(input: WageSuggestInput): {
  freq: ConventionalPayFrequency | null;
  ask: boolean;
} {
  const inferred = inferPayFrequency(input);
  if (inferred && inferred !== "ambiguous") return { freq: inferred, ask: false };
  if (inferred === "ambiguous") return { freq: null, ask: true };
  const labeled = periodsPerYear(input.payFrequency);
  const fromLabel = CONVENTIONAL_FREQUENCIES.find((row) => row.periods === labeled) ?? null;
  if (fromLabel) return { freq: fromLabel, ask: false };
  if (usableMonthly(input.grossPeriod) != null) return { freq: null, ask: true };
  return { freq: null, ask: false };
}

function periodFrequencyMonthly(period: number, periods: number): number {
  return Math.round((period * periods) / 12);
}

function ytdMonthsMonthly(input: WageSuggestInput): number | null {
  const ytd = usableMonthly(input.ytdGross);
  const months = monthsThroughPeriodEnd(input.payPeriodEnd);
  if (ytd == null || months == null || months <= 0) return null;
  return Math.round(ytd / months);
}

function w2AnnualMonthly(input: WageSuggestInput): number | null {
  const wages = usableMonthly(input.w2Wages);
  if (wages == null) return null;
  return monthlyFromAnnual(wages);
}

function materialMonthlyDiff(left: number, right: number): boolean {
  return Math.abs(left - right) >= YTD_CONFLICT_GAP;
}

const VARIABLE_KEYS = ["overtime", "bonus", "commission"] as const;

function variableLabel(key: (typeof VARIABLE_KEYS)[number]): string {
  if (key === "overtime") return "Overtime";
  if (key === "bonus") return "Bonus";
  return "Commission";
}

function variableThinNote(key: (typeof VARIABLE_KEYS)[number]): string {
  return `${variableLabel(key)} history is thin.`;
}

function variableDecliningCaution(key: (typeof VARIABLE_KEYS)[number]): string {
  return `${variableLabel(key)} is lower this year. I’m using the later year.`;
}

type VariableExtra = {
  monthly: number;
  caution?: string;
  partialNotes: string[];
  methodNotes: string[];
};

function variableMethodLabel(key: (typeof VARIABLE_KEYS)[number]): string {
  if (key === "overtime") return "OT";
  if (key === "bonus") return "bonus";
  return "commission";
}

function ytdKey(key: (typeof VARIABLE_KEYS)[number]): "overtimeYtd" | "bonusYtd" | "commissionYtd" {
  if (key === "overtime") return "overtimeYtd";
  if (key === "bonus") return "bonusYtd";
  return "commissionYtd";
}

/** Annual / 12, or YTD / months through period-end. Never invent a year. */
export function variableMonthlyAmount(
  annual: number | null | undefined,
  ytd: number | null | undefined,
  periodEnd?: string | null,
): number | null {
  const ytdAmt = usableMonthly(ytd);
  if (ytdAmt != null) {
    const months = monthsThroughPeriodEnd(periodEnd);
    if (months == null || months <= 0) return null;
    return Math.round(ytdAmt / months);
  }
  const yearly = usableMonthly(annual);
  if (yearly == null) return null;
  return monthlyFromAnnual(yearly);
}

/** OT / bonus / commission: two-year average when stable or rising; later year when declining; one-year is Partial. */
function extractedVariableExtra(input: WageSuggestInput): VariableExtra {
  const rules = conventionalIncomeRules("w2");
  const mode = rules.variable ?? "extracted-two-year-average-or-later";
  if (mode === "never") return { monthly: 0, partialNotes: [], methodNotes: [] };
  const prior = input.priorYear;
  let extra = 0;
  let caution: string | undefined;
  const partialNotes: string[] = [];
  const methodNotes: string[] = [];
  for (const key of VARIABLE_KEYS) {
    const current = variableMonthlyAmount(input[key], input[ytdKey(key)], input.payPeriodEnd);
    const last = prior
      ? variableMonthlyAmount(prior[key], prior[ytdKey(key)], prior.payPeriodEnd ?? input.payPeriodEnd)
      : null;
    if (current == null && last == null) continue;
    if (current == null) continue;
    if (last == null) {
      partialNotes.push(variableThinNote(key));
      continue;
    }
    const named = variableMethodLabel(key);
    if (current >= last) {
      extra += Math.round((current + last) / 2);
      methodNotes.push(`two-year ${named} average`);
      continue;
    }
    extra += current;
    methodNotes.push(`later-year ${named}`);
    caution = caution ?? variableDecliningCaution(key);
  }
  return { monthly: extra, caution, partialNotes, methodNotes };
}

function secondJobExtra(input: WageSuggestInput): VariableExtra {
  const rules = conventionalIncomeRules("w2");
  if ((rules.secondJob ?? "two-documents-two-year") === "never") {
    return { monthly: 0, partialNotes: [], methodNotes: [] };
  }
  if (input.sameStubSecondEmployer) {
    return { monthly: 0, partialNotes: [SECOND_JOB_SAME_STUB_NOTE], methodNotes: [] };
  }
  const job = input.secondJob;
  if (!job) return { monthly: 0, partialNotes: [], methodNotes: [] };
  if (!job.documentedSeparately) {
    return { monthly: 0, partialNotes: [SECOND_JOB_SAME_STUB_NOTE], methodNotes: [] };
  }
  const nested: WageSuggestInput = {
    payPeriodEnd: job.payPeriodEnd,
    grossPeriod: job.grossPeriod,
    ytdGross: job.ytdGross,
    payFrequency: job.payFrequency,
    w2Wages: job.w2Wages,
    overtime: job.overtime,
    bonus: job.bonus,
    commission: job.commission,
    overtimeYtd: job.overtimeYtd,
    bonusYtd: job.bonusYtd,
    commissionYtd: job.commissionYtd,
    priorYear: job.priorYear,
  };
  const wage = suggestWageIncome(nested);
  if (!wage || wage.needsFrequency) return { monthly: 0, partialNotes: [SECOND_JOB_THIN_NOTE], methodNotes: [] };
  const thin = !job.priorYear;
  return {
    monthly: wage.monthly,
    caution: thin ? undefined : wage.caution,
    partialNotes: thin ? [SECOND_JOB_THIN_NOTE, ...(wage.partialNotes ?? [])] : wage.partialNotes ?? [],
    methodNotes: ["second job"],
  };
}

/**
 * W-2 / paystub path. Base is period × frequency (inferred from YTD/period +
 * period-end when that is a near-exact conventional count), or YTD / months,
 * or W-2 / 12. Do not invent frequency. When two counts fit, ask once.
 * YTD vs run-rate / W-2 mismatch is flagged — never blended.
 */
export function suggestWageIncome(input: WageSuggestInput): IncomeSuggestResult | null {
  const rules = conventionalIncomeRules("w2");
  const resolved = resolvePayFrequency(input);
  if (resolved.ask) {
    return { monthly: 0, method: "period-frequency", needsFrequency: true };
  }

  const period = usableMonthly(input.grossPeriod);
  const periodMonthly =
    period != null && resolved.freq != null
      ? periodFrequencyMonthly(period, resolved.freq.periods)
      : null;
  const periodEnd = parsePeriodEndDate(input.payPeriodEnd);
  const ytdCount =
    period != null && usableMonthly(input.ytdGross) != null
      ? ytdPeriodCount(input.ytdGross as number, period)
      : null;
  const ytdConsistent =
    resolved.freq != null &&
    periodEnd != null &&
    ytdCount != null &&
    Math.abs(ytdCount - expectedPeriodsThrough(resolved.freq, periodEnd)) <= FREQUENCY_MATCH_SLACK;
  const ytdMonthly =
    periodMonthly == null || !ytdConsistent ? ytdMonthsMonthly(input) : null;
  const w2Monthly = w2AnnualMonthly(input);

  const candidates: { monthly: number; method: QualifyingMethod; note?: string }[] = [];
  if (periodMonthly != null && resolved.freq) {
    candidates.push({
      monthly: periodMonthly,
      method: "period-frequency",
      note: frequencyMethodNote(resolved.freq.periods, resolved.freq.label),
    });
  }
  if (ytdMonthly != null) candidates.push({ monthly: ytdMonthly, method: "ytd-months", note: "YTD / months" });
  if (w2Monthly != null) candidates.push({ monthly: w2Monthly, method: "w2-annual", note: "W-2 / 12" });
  if (!candidates.length) return null;

  const conflict =
    (rules.ytdConflict ?? "flag-lower") === "flag-lower" &&
    candidates.some((row, index) =>
      candidates.slice(index + 1).some((other) => materialMonthlyDiff(row.monthly, other.monthly)),
    );

  let chosen = candidates[0];
  let method: QualifyingMethod = chosen.method;
  let caution: string | undefined;
  if (conflict) {
    const lower = Math.min(...candidates.map((row) => row.monthly));
    chosen = candidates.find((row) => row.monthly === lower) ?? chosen;
    method = "ytd-conflict-lower";
    caution = YTD_CONFLICT_CAUTION;
  } else if (periodMonthly != null) {
    chosen = candidates.find((row) => row.method === "period-frequency") ?? chosen;
    method = "period-frequency";
  } else if (ytdMonthly != null) {
    chosen = candidates.find((row) => row.method === "ytd-months") ?? chosen;
    method = "ytd-months";
  } else {
    method = "w2-annual";
  }

  const variable = extractedVariableExtra(input);
  const second = secondJobExtra(input);
  const partialNotes = [...variable.partialNotes, ...second.partialNotes];
  const methodBits = [chosen.note, ...variable.methodNotes, ...second.methodNotes].filter(
    (row): row is string => Boolean(row),
  );
  return {
    monthly: chosen.monthly + variable.monthly + second.monthly,
    method,
    caution: caution ?? variable.caution ?? second.caution,
    methodNote: methodBits.join(" plus ") || chosen.note,
    partialNotes: partialNotes.length ? partialNotes : undefined,
  };
}

function scheduleCMethodNote(method: QualifyingMethod): string {
  if (method === "one-year") return "Schedule C one-year";
  if (method === "two-year-average") return "Schedule C two-year average";
  if (method === "later-year-lower") return "Schedule C later year";
  return "Schedule C";
}

/**
 * Confirmed wage monthly + confirmed Schedule C or K-1 ordinary monthly.
 * Disclose both methods. Never invent a blend of unconfirmed parts.
 */
export function suggestCombinedIncome(input: {
  wage?: IncomeSuggestResult | null;
  scheduleC?: IncomeSuggestResult | null;
  k1Monthly?: number | null;
}): IncomeSuggestResult | null {
  const wage = input.wage && !input.wage.needsFrequency ? input.wage : null;
  const scheduleC = input.scheduleC;
  const k1 = input.k1Monthly != null && Number.isFinite(input.k1Monthly) ? input.k1Monthly : null;
  const parts = {
    ...(wage ? { wage: wage.monthly } : {}),
    ...(scheduleC ? { scheduleC: scheduleC.monthly } : {}),
    ...(k1 != null ? { k1 } : {}),
  };
  const filled = [parts.wage, parts.scheduleC, parts.k1].filter((n) => n != null).length;
  if (filled < 2) return null;
  const monthly = (parts.wage ?? 0) + (parts.scheduleC ?? 0) + (parts.k1 ?? 0);
  const notes = [
    wage?.methodNote ?? (wage ? "W-2" : null),
    scheduleC ? scheduleCMethodNote(scheduleC.method) : null,
    k1 != null ? "K-1 ordinary / 12" : null,
  ].filter((row): row is string => Boolean(row));
  const named =
    parts.wage != null && parts.scheduleC != null
      ? "combined wage + Schedule C"
      : parts.wage != null && parts.k1 != null
        ? "combined wage + K-1"
        : "combined Schedule C + K-1";
  const caution = wage?.caution ?? scheduleC?.caution ?? (k1 != null ? K1_ORDINARY_NOTE : undefined);
  return {
    monthly,
    method: "combined",
    methodNote: `${named} · ${notes.join(" plus ")}`,
    caution,
    partialNotes: wage?.partialNotes,
    parts,
  };
}
