/**
 * Schedule E Part I printed lines → rents and cash operating expenses.
 * Locked cash: (rents − cash operating) / 12.
 * Cash operating includes taxes (line 16). Excludes mortgage interest (1003 / PITIA),
 * insurance, HOA, depreciation, line 20 total expenses, and line 21 IRS net.
 * A labeled "cash operating expenses" / "cash expenses" line wins when printed.
 */

import { looksLikeFormLineNumber } from "./suggest";

function parsePrintedMoney(raw?: string | null): number | null {
  const n = Number(String(raw ?? "").replace(/[$,]/g, "").trim());
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function moneyDigits(raw: string): string {
  const text = String(raw ?? "").trim();
  const paren = /^\((.+)\)$/.test(text);
  const digits = text.replace(/[$,()\s]/g, "");
  if (!digits || /[a-z]/i.test(digits)) return "";
  const n = Number(digits);
  if (!Number.isFinite(n) || n === 0) return "";
  return paren ? String(-Math.abs(n)) : String(n);
}

function plausibleAmount(raw: string): number | null {
  const digits = moneyDigits(raw);
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n === 0) return null;
  if (looksLikeFormLineNumber(Math.abs(n)) && !/,/.test(raw) && !/\.\d/.test(raw)) return null;
  if (Math.abs(n) < 100 && !/,/.test(raw)) return null;
  return n;
}

function amountsInSpan(text: string): number[] {
  const moneyRe = /(-?\$?\s*\d[\d,]*(?:\.\d+)?|\(\s*\$?\s*\d[\d,]*(?:\.\d+)?\s*\))/g;
  const out: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = moneyRe.exec(text))) {
    const n = plausibleAmount(match[0] ?? "");
    if (n == null) continue;
    out.push(n);
  }
  return out;
}

const NEXT_PART1_FIELD =
  /cash (?:operating )?expenses|advertising|auto and travel|cleaning|commissions|insurance|legal|management|mortgage interest|other interest|repairs|supplies|taxes|utilities|depreciation|total expenses|income or \(loss\)|(?:^|\b)(?:line\s*)?(?:4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|26|32)\s+(?=[A-Za-z])/i;

function sumNearLabel(blob: string, label: RegExp): string {
  const match = blob.match(label);
  if (!match || match.index == null) return "";
  const after = blob.slice(match.index + match[0].length);
  const lineEnd = after.search(/\n/);
  const sameLine = after.slice(0, lineEnd < 0 ? after.length : lineEnd);
  const nextAt = sameLine.search(NEXT_PART1_FIELD);
  const window = sameLine.slice(0, nextAt >= 0 ? nextAt : sameLine.length);
  const lineStart = blob.lastIndexOf("\n", match.index) + 1;
  const before = blob.slice(lineStart, match.index).slice(-48);
  const found = amountsInSpan(window).length ? amountsInSpan(window) : amountsInSpan(before);
  if (found.length) return String(found.reduce((sum, n) => sum + n, 0));
  const nextStart = match.index + match[0].length + (lineEnd < 0 ? 0 : lineEnd) + 1;
  const nextEnd = blob.indexOf("\n", nextStart);
  const nextLine = blob.slice(nextStart, nextEnd < 0 ? nextStart + 80 : nextEnd).trim();
  if (/^(?:line\s*)?(?:4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|26|32)\b/i.test(nextLine)) {
    return "";
  }
  const nextAmounts = amountsInSpan(nextLine);
  if (nextAmounts.length) return String(nextAmounts.reduce((sum, n) => sum + n, 0));
  return "";
}

const LABELED_CASH = [
  /cash operating expenses[ \t]*:?[ \t]*/i,
  /cash expenses(?:[ \t]*\([ \t]*ex-?depreciation[ \t]*\))?[ \t]*:?[ \t]*/i,
];

const RENTS_LABELS = [
  /(?:^|\n)\s*(?:line\s*)?3\b[\s\S]{0,80}?rents received[ \t]*:?[ \t]*/i,
  /rents received[ \t]*:?[ \t]*/i,
];

/** IRS cash operating lines. Taxes (16) in. Mortgage (12), insurance (9), depreciation (18) out. */
const CASH_OPERATING_LABELS = [
  /(?:^|\n|\s)(?:line\s*)?5\b[\s\S]{0,40}?advertising[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?6\b[\s\S]{0,40}?auto and travel[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?7\b[\s\S]{0,40}?cleaning and maintenance[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?8\b[\s\S]{0,40}?commissions[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?10\b[\s\S]{0,40}?legal[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?11\b[\s\S]{0,40}?management[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?13\b[\s\S]{0,40}?other interest[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?14\b[\s\S]{0,40}?repairs[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?15\b[\s\S]{0,40}?supplies[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?16\b[\s\S]{0,48}?taxes\b[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?17\b[\s\S]{0,40}?utilities[ \t]*:?[ \t]*/i,
  /(?:^|\n|\s)(?:line\s*)?19\b[\s\S]{0,40}?other[ \t]*:?[ \t]*/i,
];

const TOTAL_EXPENSES = /(?:^|\n|\s)(?:line\s*)?20\b[\s\S]{0,40}?total expenses[ \t]*:?[ \t]*/i;
const MORTGAGE_INTEREST = /(?:^|\n|\s)(?:line\s*)?12\b[\s\S]{0,60}?mortgage interest[ \t]*:?[ \t]*/i;
const DEPRECIATION = /(?:^|\n|\s)(?:line\s*)?18\b[\s\S]{0,40}?depreciation[ \t]*:?[ \t]*/i;
const INSURANCE = /(?:^|\n|\s)(?:line\s*)?9\b[\s\S]{0,40}?insurance[ \t]*:?[ \t]*/i;

function labeledCashExpenses(blob: string): string {
  for (const pattern of LABELED_CASH) {
    const amount = sumNearLabel(blob, pattern);
    if (amount) return amount;
  }
  return "";
}

function rentsFromPrinted(blob: string): string {
  for (const pattern of RENTS_LABELS) {
    const amount = sumNearLabel(blob, pattern);
    if (amount) return amount;
  }
  return "";
}

function sumCashOperatingLines(blob: string): string {
  let total = 0;
  let saw = false;
  for (const pattern of CASH_OPERATING_LABELS) {
    const amount = sumNearLabel(blob, pattern);
    const n = parsePrintedMoney(amount);
    if (n == null) continue;
    total += n;
    saw = true;
  }
  return saw ? String(total) : "";
}

function cashFromTotalMinusNonCash(blob: string): string {
  const total = parsePrintedMoney(sumNearLabel(blob, TOTAL_EXPENSES));
  if (total == null) return "";
  const mortgage = parsePrintedMoney(sumNearLabel(blob, MORTGAGE_INTEREST)) ?? 0;
  const dep = parsePrintedMoney(sumNearLabel(blob, DEPRECIATION)) ?? 0;
  const insurance = parsePrintedMoney(sumNearLabel(blob, INSURANCE)) ?? 0;
  const cash = total - mortgage - dep - insurance;
  if (!Number.isFinite(cash) || cash === 0) return "";
  if (looksLikeFormLineNumber(Math.abs(cash))) return "";
  return String(cash);
}

export function scheduleEPart1FromPrintedText(text: string): { rents?: string; cash?: string } {
  const blob = String(text ?? "").replace(/\u00a0/g, " ");
  if (!blob.trim()) return {};
  const rents = rentsFromPrinted(blob);
  const cash = labeledCashExpenses(blob) || sumCashOperatingLines(blob) || cashFromTotalMinusNonCash(blob);
  const out: { rents?: string; cash?: string } = {};
  if (rents) out.rents = rents;
  if (cash) out.cash = cash;
  return out;
}
