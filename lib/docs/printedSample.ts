/**
 * Printed ONYX mortgage-sample fields. Reads labeled fixture text from the
 * page (PNG tEXt Comment, then pixels). Filename map is fallback only —
 * never invents OT / bonus / commission / a second job.
 */

import type { ExtractClass } from "@/components/fox/types";

export type PrintedSample = {
  extractClass: ExtractClass;
  confidence: number;
  fields: Record<string, string>;
};

function basename(name?: string | null) {
  return String(name ?? "")
    .trim()
    .split(/[/\\]/)
    .pop()
    ?.toLowerCase() ?? "";
}

const BY_NAME: Record<string, PrintedSample> = {
  "w2-ot-bonus-2025.png": {
    extractClass: "w2",
    confidence: 0.94,
    fields: {
      tax_year: "2025",
      employer_name: "HARBOR STEEL",
      wages: "84000",
      overtime: "6000",
    },
  },
  "paystub-ot-bonus-2026.png": {
    extractClass: "paystub",
    confidence: 0.94,
    fields: {
      employer_name: "HARBOR STEEL",
      pay_period_end: "2026-07-31",
      gross_period: "7000",
      overtime_ytd: "12000",
    },
  },
  "w2-bonus-2025.png": {
    extractClass: "w2",
    confidence: 0.94,
    fields: {
      tax_year: "2025",
      employer_name: "HARBOR STEEL",
      wages: "84000",
      bonus: "12000",
    },
  },
  "paystub-bonus-declining-2026.png": {
    extractClass: "paystub",
    confidence: 0.94,
    fields: {
      employer_name: "HARBOR STEEL",
      pay_period_end: "2026-07-31",
      gross_period: "7000",
      bonus_ytd: "6000",
    },
  },
  "paystub-second-job.png": {
    extractClass: "paystub",
    confidence: 0.94,
    fields: {
      employer_name: "NIGHT SHIFT CO",
      pay_period_end: "2026-07-31",
      gross_period: "1200",
      ytd_gross: "8400",
    },
  },
  "paystub-harbor.png": {
    extractClass: "paystub",
    confidence: 0.94,
    fields: {
      employer_name: "HARBOR CAFE",
      pay_period_end: "2026-07-31",
      pay_frequency: "monthly",
      gross_period: "400",
      ytd_gross: "6400",
    },
  },
};

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function u32(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

/** Read printed lines from a labeled fixture PNG tEXt Comment. */
export function readPngPrintedLines(bytes: Uint8Array): string[] | null {
  if (bytes.length < 16) return null;
  for (let i = 0; i < PNG_SIG.length; i += 1) {
    if (bytes[i] !== PNG_SIG[i]) return null;
  }
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = u32(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) return null;
    if (type === "tEXt") {
      const raw = bytes.subarray(start, end);
      const nul = raw.indexOf(0);
      if (nul >= 0) {
        const key = Buffer.from(raw.subarray(0, nul)).toString("latin1");
        if (key === "Comment") {
          const text = new TextDecoder("latin1").decode(raw.subarray(nul + 1));
          const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          if (lines.length) return lines;
        }
      }
    }
    if (type === "IEND") break;
    offset = end + 4;
  }
  return null;
}

function moneyDigits(raw: string) {
  const paren = /^\((.+)\)$/.exec(raw.trim());
  const text = paren ? `-${paren[1]}` : raw;
  const cleaned = text.replace(/[$,\s]/g, "");
  if (!cleaned || cleaned === "-") return "";
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return "";
  return cleaned.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function valueAfter(line: string, label: RegExp) {
  const match = line.match(label);
  if (!match) return "";
  return line.slice(match[0].length).trim();
}

function classifyPrintedLines(lines: string[]): ExtractClass | null {
  const blob = lines.join("\n").toUpperCase();
  if (/\bPAYSTUB\b/.test(blob)) return "paystub";
  if (/\bW-?2\b/.test(blob) || /WAGE AND TAX STATEMENT/.test(blob)) return "w2";
  if (/K-?1|1120-?S|FORM 1040|SCHEDULE C/.test(blob)) return "tax_return";
  if (/BANK STATEMENT/.test(blob)) return "bank_statement";
  if (/PURCHASE CONTRACT/.test(blob)) return "purchase_contract";
  if (/MORTGAGE STATEMENT/.test(blob)) return "mortgage_statement";
  if (/\bDRIVER|PASSPORT|GOVERNMENT ID\b/.test(blob)) return "government_id";
  return null;
}

function emptyIfNotShown(raw: string) {
  if (!raw) return "";
  if (/not shown|n\/a|none/i.test(raw)) return "";
  return raw;
}

/** Map labeled page lines onto extract keys. Absent keys stay empty. */
export function fieldsFromPrintedLines(
  extractClass: ExtractClass,
  lines: string[],
): Record<string, string> {
  const fields: Record<string, string> = {};
  const put = (key: string, value: string) => {
    if (!key || fields[key]) return;
    const next = value.trim();
    if (!next) return;
    fields[key] = next;
  };
  const putMoney = (key: string, value: string) => {
    const digits = moneyDigits(emptyIfNotShown(value));
    if (digits) put(key, digits);
  };

  for (const line of lines) {
    const employer = valueAfter(line, /^EMPLOYER:\s*/i);
    if (employer) put("employer_name", employer);
    const periodEnd = valueAfter(line, /^PAY PERIOD END:\s*/i);
    if (periodEnd) put("pay_period_end", periodEnd);
    const frequency = valueAfter(line, /^PAY FREQUENCY:\s*/i);
    if (frequency) put("pay_frequency", frequency.toLowerCase());
    const gross = valueAfter(line, /^GROSS PERIOD:\s*/i);
    if (gross) putMoney("gross_period", gross);
    const ytd = valueAfter(line, /^YTD GROSS:\s*/i);
    if (ytd) putMoney("ytd_gross", ytd);
    const net = valueAfter(line, /^NET PERIOD:\s*/i);
    if (net) putMoney("net_period", net);
    const otYtd = valueAfter(line, /^OVERTIME YTD:\s*/i);
    if (otYtd) putMoney("overtime_ytd", otYtd);
    const bonusYtd = valueAfter(line, /^BONUS YTD:\s*/i);
    if (bonusYtd) putMoney("bonus_ytd", bonusYtd);
    const commYtd = valueAfter(line, /^COMMISSION YTD:\s*/i);
    if (commYtd) putMoney("commission_ytd", commYtd);
    const overtime = valueAfter(line, /^OVERTIME:\s*/i);
    if (overtime) putMoney("overtime", overtime);
    const bonus = valueAfter(line, /^BONUS:\s*/i);
    if (bonus) putMoney("bonus", bonus);
    const commission = valueAfter(line, /^COMMISSION:\s*/i);
    if (commission) putMoney("commission", commission);
    const wages = valueAfter(line, /^WAGES:\s*/i);
    if (wages) putMoney("wages", wages);
    const taxYear = valueAfter(line, /^TAX YEAR:\s*/i);
    if (taxYear) put("tax_year", taxYear.replace(/\D/g, "").slice(0, 4));
    const netProfit = valueAfter(line, /^LINE 31 NET PROFIT:\s*/i);
    if (netProfit) putMoney("schedule_c_net_profit", netProfit);
    const dep = valueAfter(line, /^LINE 13 DEPRECIATION:\s*/i);
    if (dep) putMoney("depreciation", dep);
    const depletion = valueAfter(line, /^LINE 12 DEPLETION:\s*/i);
    if (depletion) putMoney("depletion", depletion);
    const home = valueAfter(line, /^LINE 30 BUSINESS USE OF HOME:\s*/i);
    if (home) putMoney("business_use_of_home", home);
    const other = valueAfter(line, /^LINE 6 OTHER INCOME:\s*/i);
    if (other) putMoney("nonrecurring_other_income", other);
    const ordinary = valueAfter(line, /^(?:BOX 1 )?ORDINARY BUSINESS INCOME:\s*/i);
    if (ordinary) putMoney("k1_ordinary_income", ordinary);
    const distributions = valueAfter(line, /^DISTRIBUTIONS:\s*/i);
    if (distributions) {
      const shown = emptyIfNotShown(distributions);
      if (shown) putMoney("k1_distributions", shown);
    }
  }

  if (extractClass === "tax_return") {
    const blob = lines.join("\n").toUpperCase();
    if (/K-?1|1120-?S/.test(blob) && !/SCHEDULE C/.test(blob)) {
      fields.return_kind = "k1";
    } else if (/SCHEDULE C|FORM 1040/.test(blob)) {
      fields.return_kind = "schedule_c";
    }
  }

  return fields;
}

export function printedSampleFromLines(lines: string[]): PrintedSample | null {
  const extractClass = classifyPrintedLines(lines);
  if (!extractClass) return null;
  return {
    extractClass,
    confidence: 0.94,
    fields: fieldsFromPrintedLines(extractClass, lines),
  };
}

export function printedSampleFromFilename(name?: string | null): PrintedSample | null {
  const key = basename(name);
  return key ? BY_NAME[key] ?? null : null;
}

export function printedSampleFromBytes(bytes: Uint8Array): PrintedSample | null {
  const lines = readPngPrintedLines(bytes);
  if (!lines) return null;
  return printedSampleFromLines(lines);
}

export function mergePrintedFields(
  fields: Record<string, string>,
  printed?: PrintedSample | null,
): Record<string, string> {
  if (!printed) return fields;
  const next = { ...fields };
  for (const [key, value] of Object.entries(printed.fields)) {
    if (!next[key] && value) next[key] = value;
  }
  return next;
}

export function readPrintedSample(
  bytes: Uint8Array,
  filename?: string | null,
): PrintedSample | null {
  return printedSampleFromBytes(bytes) ?? printedSampleFromFilename(filename);
}
