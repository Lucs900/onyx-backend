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
export const W2_BOX1_MONTHLY_NOTE = "Box 1 monthly";
export const BOTH_MONTHLY_SKIP_NOTE = "Using W-2 Box 1 until we know why they differ.";
export const BOTH_MONTHLY_RAISE_NOTE = "Using the current paystub. Last year’s W-2 is lower.";
export const BOTH_MONTHLY_OT_NOTE =
  "Overtime or bonus on the stub. Using W-2 Box 1 until a second year or a split stub is in.";
export const BOTH_MONTHLY_SECOND_JOB_NOTE =
  "They said a second job. Using W-2 Box 1 until that job is documented.";
export const RAISE_WHEN_ASK = "About when did that become base pay?";
export const RAISE_YTD_MISSING_NOTE = "Cannot weight without YTD.";
export const RAISE_WHEN_UNKNOWN_NOTE = "Using W-2 Box 1 until we can weight the raise.";
export const RAISE_MONTH_MISSING_NOTE = "Cannot weight without a raise month.";
export const RAISE_YTD_CLOSE_RATIO = 0.1;
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
  | "both-ask"
  | "combined";

export type BothMonthlyReason = "raise" | "overtime-bonus" | "second-job" | "skip";
export type RaiseWhenKind = "this-year" | "last-year" | "not-sure" | "month";
export type RaiseWhen = {
  kind: RaiseWhenKind;
  month?: number;
  label: string;
};

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

export function formatSuggestMoney(value: number): string {
  const shown = `$${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
  return value < 0 ? `-${shown}` : shown;
}

export function bothMonthlyMethodNote(stubMonthly: number, w2Monthly: number): string {
  return `Paystub ${formatSuggestMoney(stubMonthly)} · W-2 Box 1 ${formatSuggestMoney(w2Monthly)}`;
}

export function bothMonthlyAskCopy(stubMonthly: number, w2Monthly: number): string {
  return `The paystub is ${formatSuggestMoney(stubMonthly)} a month. The W-2 Box 1 is ${formatSuggestMoney(w2Monthly)} a month. Why do they differ?`;
}

export function bothMonthlyReasonNote(reason: BothMonthlyReason): string {
  if (reason === "raise") return BOTH_MONTHLY_RAISE_NOTE;
  if (reason === "overtime-bonus") return BOTH_MONTHLY_OT_NOTE;
  if (reason === "second-job") return BOTH_MONTHLY_SECOND_JOB_NOTE;
  return BOTH_MONTHLY_SKIP_NOTE;
}

/** After the one both-in question. No blend. OT/bonus and Skip keep Box 1 / 12. */
export function proposeBothMonthlyIncome(
  stubMonthly: number,
  w2Monthly: number,
  reason: BothMonthlyReason,
): IncomeSuggestResult {
  const note = bothMonthlyReasonNote(reason);
  if (reason === "raise") {
    return {
      monthly: stubMonthly,
      method: "period-frequency",
      methodNote: bothMonthlyMethodNote(stubMonthly, w2Monthly),
      caution: note,
      stubMonthly,
      w2Monthly,
    };
  }
  return {
    monthly: w2Monthly,
    method: "w2-annual",
    methodNote: bothMonthlyMethodNote(stubMonthly, w2Monthly),
    caution: note,
    stubMonthly,
    w2Monthly,
  };
}

export function parseBothMonthlyReason(raw: string): BothMonthlyReason | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (/\b(skip|later|not sure|idk|pass|don.?t know|no idea|unknown)\b/.test(v)) return "skip";
  if (v === "overtime-bonus" || v === "overtime / bonus" || v === "overtime/bonus") return "overtime-bonus";
  if (v === "second-job" || v === "second job") return "second-job";
  if (v === "raise" || v === "raise / new base" || v === "raise/new base") return "raise";
  if (/\b(overtime|\bot\b|bonus|commission|fat check)\b/.test(v)) return "overtime-bonus";
  if (/\b(second[- ]job|second employer|side job|other job|two jobs)\b/.test(v)) return "second-job";
  if (/\b(raise|new base|promotion|base (pay|now|salary)|that.?s (my )?base|current (base|salary|pay))\b/.test(v)) {
    return "raise";
  }
  return null;
}

const MONTH_ROWS: { n: number; long: string; short: string; aliases: string[] }[] = [
  { n: 1, long: "January", short: "Jan", aliases: ["january", "jan"] },
  { n: 2, long: "February", short: "Feb", aliases: ["february", "feb"] },
  { n: 3, long: "March", short: "Mar", aliases: ["march", "mar"] },
  { n: 4, long: "April", short: "Apr", aliases: ["april", "apr"] },
  { n: 5, long: "May", short: "May", aliases: ["may"] },
  { n: 6, long: "June", short: "Jun", aliases: ["june", "jun"] },
  { n: 7, long: "July", short: "Jul", aliases: ["july", "jul"] },
  { n: 8, long: "August", short: "Aug", aliases: ["august", "aug"] },
  { n: 9, long: "September", short: "Sep", aliases: ["september", "sep", "sept"] },
  { n: 10, long: "October", short: "Oct", aliases: ["october", "oct"] },
  { n: 11, long: "November", short: "Nov", aliases: ["november", "nov"] },
  { n: 12, long: "December", short: "Dec", aliases: ["december", "dec"] },
];

export function monthShortName(month: number): string {
  return MONTH_ROWS.find((row) => row.n === month)?.short ?? String(month);
}

export function monthLongName(month: number): string {
  return MONTH_ROWS.find((row) => row.n === month)?.long ?? String(month);
}

function monthRangeLabel(start: number, end: number): string {
  if (start === end) return monthShortName(start);
  return `${monthShortName(start)}–${monthShortName(end)}`;
}

export function parseMonthNumber(raw: string): number | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  const iso = v.match(/(?:^|[^\d])(?:20\d{2}[-/])?(\d{1,2})(?:[/-]\d{1,2}(?:[/-]\d{2,4})?)?(?:[^\d]|$)/);
  const named = MONTH_ROWS.find((row) => row.aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(v)));
  if (named) return named.n;
  if (iso) {
    const n = Number(iso[1]);
    if (n >= 1 && n <= 12) return n;
  }
  const only = v.match(/^(\d{1,2})$/);
  if (only) {
    const n = Number(only[1]);
    return n >= 1 && n <= 12 ? n : null;
  }
  return null;
}

export function parseRaiseWhen(raw: string): RaiseWhen | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v === "this-year" || v === "this year") return { kind: "this-year", label: "this year" };
  if (v === "last-year" || v === "last year") return { kind: "last-year", label: "last year" };
  if (v === "not-sure" || v === "not sure") return { kind: "not-sure", label: "not sure" };
  if (/\b(skip|later|not sure|idk|pass|don.?t know|no idea|unknown)\b/.test(v)) {
    return { kind: "not-sure", label: "not sure" };
  }
  const month = parseMonthNumber(v);
  if (month != null) {
    if (/\blast year\b/.test(v)) return { kind: "last-year", month, label: "last year" };
    return { kind: "month", month, label: monthLongName(month) };
  }
  if (/\bthis year\b/.test(v)) return { kind: "this-year", label: "this year" };
  if (/\blast year\b/.test(v)) return { kind: "last-year", label: "last year" };
  return null;
}

export function raiseWeightMonths(
  raiseMonth: number,
  stubMonth: number,
): { oldMonths: number; newMonths: number } | null {
  if (raiseMonth < 1 || raiseMonth > 12 || stubMonth < 1 || stubMonth > 12) return null;
  if (raiseMonth > stubMonth) return null;
  return { oldMonths: raiseMonth - 1, newMonths: stubMonth - raiseMonth + 1 };
}

export function expectedRaiseYtd(
  oldMonthly: number,
  newMonthly: number,
  oldMonths: number,
  newMonths: number,
): number {
  return oldMonthly * oldMonths + newMonthly * newMonths;
}

export function raiseWeightNote(
  oldMonthly: number,
  newMonthly: number,
  raiseMonth: number,
  stubMonth: number,
): string | undefined {
  const split = raiseWeightMonths(raiseMonth, stubMonth);
  if (!split) return undefined;
  const bits: string[] = [];
  if (split.oldMonths > 0) {
    bits.push(`${monthRangeLabel(1, split.oldMonths)} at ${formatSuggestMoney(oldMonthly)}`);
  }
  if (split.newMonths > 0) {
    bits.push(`${monthRangeLabel(raiseMonth, stubMonth)} at ${formatSuggestMoney(newMonthly)}`);
  }
  return bits.length ? bits.join(" · ") : undefined;
}

export function raiseYtdIsClose(actual: number, expected: number): boolean {
  if (expected <= 0 || !Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return Math.abs(actual - expected) / expected <= RAISE_YTD_CLOSE_RATIO;
}

export function raiseYtdSupportsNote(whenLabel: string): string {
  return `YTD supports raise as of ${whenLabel}.`;
}

export function raiseYtdFarAskCopy(whenLabel: string): string {
  return `YTD doesn’t support a raise as of ${whenLabel}. What’s on the stub besides the new base?`;
}

export function raiseYtdFarNote(whenLabel: string): string {
  return `YTD doesn’t support a raise as of ${whenLabel}.`;
}

function withBothAndWeight(stubMonthly: number, w2Monthly: number, weightNote?: string): string {
  return [bothMonthlyMethodNote(stubMonthly, w2Monthly), weightNote].filter(Boolean).join(" · ");
}

/** After Raise / new base + when. YTD weight only. No silent lower-of. */
export function proposeRaiseWeightedIncome(input: {
  stubMonthly: number;
  w2Monthly: number;
  when: RaiseWhen;
  ytdGross?: number | null;
  stubMonth?: number | null;
}): IncomeSuggestResult {
  const stubMonthly = input.stubMonthly;
  const w2Monthly = input.w2Monthly;
  const ytd = usableMonthly(input.ytdGross);
  const stubMonth = input.stubMonth ?? null;
  const both = bothMonthlyMethodNote(stubMonthly, w2Monthly);

  if (input.when.kind === "not-sure") {
    return {
      monthly: w2Monthly,
      method: "w2-annual",
      methodNote: both,
      caution: RAISE_WHEN_UNKNOWN_NOTE,
      stubMonthly,
      w2Monthly,
    };
  }

  if (input.when.kind === "last-year") {
    if (ytd == null || stubMonth == null || stubMonth <= 0) {
      return {
        monthly: w2Monthly,
        method: "w2-annual",
        methodNote: both,
        caution: RAISE_YTD_MISSING_NOTE,
        stubMonthly,
        w2Monthly,
      };
    }
    const expected = stubMonthly * stubMonth;
    if (raiseYtdIsClose(ytd, expected)) {
      return {
        monthly: stubMonthly,
        method: "period-frequency",
        methodNote: both,
        caution: raiseYtdSupportsNote(input.when.label),
        stubMonthly,
        w2Monthly,
        expectedYtd: expected,
      };
    }
    return {
      monthly: 0,
      method: "both-ask",
      methodNote: both,
      caution: raiseYtdFarNote(input.when.label),
      needsRaiseYtdFar: true,
      stubMonthly,
      w2Monthly,
      expectedYtd: expected,
    };
  }

  if (input.when.kind === "month" && input.when.month != null && stubMonth != null) {
    const split = raiseWeightMonths(input.when.month, stubMonth);
    const weightNote = raiseWeightNote(w2Monthly, stubMonthly, input.when.month, stubMonth);
    if (!split) {
      if (ytd == null) {
        return {
          monthly: stubMonthly,
          method: "period-frequency",
          methodNote: withBothAndWeight(stubMonthly, w2Monthly, weightNote),
          caution: RAISE_YTD_MISSING_NOTE,
          stubMonthly,
          w2Monthly,
          weightNote,
        };
      }
      return {
        monthly: stubMonthly,
        method: "period-frequency",
        methodNote: withBothAndWeight(stubMonthly, w2Monthly, weightNote),
        caution: RAISE_MONTH_MISSING_NOTE,
        stubMonthly,
        w2Monthly,
        weightNote,
      };
    }
    const expected = expectedRaiseYtd(w2Monthly, stubMonthly, split.oldMonths, split.newMonths);
    if (ytd == null) {
      return {
        monthly: stubMonthly,
        method: "period-frequency",
        methodNote: withBothAndWeight(stubMonthly, w2Monthly, weightNote),
        caution: RAISE_YTD_MISSING_NOTE,
        stubMonthly,
        w2Monthly,
        expectedYtd: expected,
        weightNote,
      };
    }
    if (raiseYtdIsClose(ytd, expected)) {
      return {
        monthly: stubMonthly,
        method: "period-frequency",
        methodNote: withBothAndWeight(stubMonthly, w2Monthly, weightNote),
        caution: raiseYtdSupportsNote(input.when.label),
        stubMonthly,
        w2Monthly,
        expectedYtd: expected,
        weightNote,
      };
    }
    return {
      monthly: 0,
      method: "both-ask",
      methodNote: withBothAndWeight(stubMonthly, w2Monthly, weightNote),
      caution: raiseYtdFarNote(input.when.label),
      needsRaiseYtdFar: true,
      stubMonthly,
      w2Monthly,
      expectedYtd: expected,
      weightNote,
    };
  }

  if (ytd == null) {
    return {
      monthly: stubMonthly,
      method: "period-frequency",
      methodNote: both,
      caution: RAISE_YTD_MISSING_NOTE,
      stubMonthly,
      w2Monthly,
    };
  }
  return {
    monthly: stubMonthly,
    method: "period-frequency",
    methodNote: both,
    caution: RAISE_MONTH_MISSING_NOTE,
    stubMonthly,
    w2Monthly,
  };
}

function confirmedPayFrequency(input: WageSuggestInput): ConventionalPayFrequency | null {
  const labeled = periodsPerYear(input.payFrequency);
  return CONVENTIONAL_FREQUENCIES.find((row) => row.periods === labeled) ?? null;
}

function w2YearAmount(wages?: number | null): boolean {
  return usableMonthly(wages) != null;
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
  const twoW2Years = w2YearAmount(input.w2Wages) && w2YearAmount(prior?.wages);
  if (mode === "second-w2-only" && !twoW2Years) {
    return { monthly: 0, partialNotes: [], methodNotes: [] };
  }
  let extra = 0;
  let caution: string | undefined;
  const partialNotes: string[] = [];
  const methodNotes: string[] = [];
  for (const key of VARIABLE_KEYS) {
    const current =
      mode === "second-w2-only"
        ? variableMonthlyAmount(input[key], null, null)
        : variableMonthlyAmount(input[key], input[ytdKey(key)], input.payPeriodEnd);
    const last = prior
      ? mode === "second-w2-only"
        ? variableMonthlyAmount(prior[key], null, null)
        : variableMonthlyAmount(prior[key], prior[ytdKey(key)], prior.payPeriodEnd ?? input.payPeriodEnd)
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
 * W-2 / paystub path. Locked monthly method:
 * 1. One W-2: Box 1 / 12 only. No two-year OT. No second-year average until a second W-2 is in.
 * 2. Paystub monthly: period × frequency after Biweekly / Semimonthly / Monthly is confirmed.
 * 3. Both in and they differ: show both. Ask why. Do not write qualifying income yet.
 * 4. YTD writes when printed. It does not replace monthly.
 * 5. Confirm-before-write. Invent nothing. No blend.
 */
export function suggestWageIncome(input: WageSuggestInput): IncomeSuggestResult | null {
  const freq = confirmedPayFrequency(input);
  const period = usableMonthly(input.grossPeriod);
  if (period != null && !freq) {
    return { monthly: 0, method: "period-frequency", needsFrequency: true };
  }

  const stubMonthly =
    period != null && freq != null ? periodFrequencyMonthly(period, freq.periods) : null;
  const w2Monthly = w2AnnualMonthly(input);
  if (stubMonthly == null && w2Monthly == null) return null;

  const bothIn = stubMonthly != null && w2Monthly != null;
  const variable = bothIn ? { monthly: 0, partialNotes: [], methodNotes: [] } : extractedVariableExtra(input);
  const second = secondJobExtra(input);
  const extra = variable.monthly + second.monthly;
  const partialNotes = [...variable.partialNotes, ...second.partialNotes];

  if (bothIn && stubMonthly != null && w2Monthly != null) {
    if (materialMonthlyDiff(stubMonthly, w2Monthly)) {
      return {
        monthly: 0,
        method: "both-ask",
        needsBothReason: true,
        stubMonthly,
        w2Monthly,
        methodNote: bothMonthlyMethodNote(stubMonthly, w2Monthly),
        partialNotes: partialNotes.length ? partialNotes : undefined,
      };
    }
    return {
      monthly: stubMonthly + extra,
      method: "period-frequency",
      stubMonthly,
      w2Monthly,
      methodNote: [bothMonthlyMethodNote(stubMonthly, w2Monthly), ...second.methodNotes]
        .filter(Boolean)
        .join(" plus "),
      partialNotes: partialNotes.length ? partialNotes : undefined,
    };
  }

  if (stubMonthly != null && freq) {
    const methodBits = [
      frequencyMethodNote(freq.periods, freq.label),
      ...variable.methodNotes,
      ...second.methodNotes,
    ].filter((row): row is string => Boolean(row));
    return {
      monthly: stubMonthly + extra,
      method: "period-frequency",
      methodNote: methodBits.join(" plus "),
      caution: variable.caution ?? second.caution,
      partialNotes: partialNotes.length ? partialNotes : undefined,
    };
  }

  const methodBits = [W2_BOX1_MONTHLY_NOTE, ...variable.methodNotes, ...second.methodNotes].filter(
    (row): row is string => Boolean(row),
  );
  return {
    monthly: (w2Monthly ?? 0) + extra,
    method: "w2-annual",
    methodNote: methodBits.join(" plus "),
    caution: variable.caution ?? second.caution,
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
