/**
 * Printed ONYX mortgage-sample fields. Reads labeled fixture text from the
 * visible page pixels. PNG tEXt / comment / EXIF and filename maps are not
 * extract sources.
 */

import { inflateSync } from "node:zlib";
import type { ExtractClass } from "@/components/fox/types";
import { readPdfTextLayer } from "@/lib/docs/pdfText";

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

/** Test helper only. Extract must not call this. */
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

const GLYPHS: Record<string, readonly string[]> = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "11110", "10001", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00100", "00100"],
  ",": ["00000", "00000", "00000", "00000", "00100", "00100", "01000"],
  ":": ["00000", "00100", "00100", "00000", "00100", "00100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
  "(": ["00100", "01000", "10000", "10000", "10000", "01000", "00100"],
  ")": ["00100", "00010", "00001", "00001", "00001", "00010", "00100"],
};

const GLYPH_LIST = Object.entries(GLYPHS).filter(([ch]) => ch !== " ");

function u32(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(filter: number, src: Uint8Array, dest: Uint8Array, prev: Uint8Array, bpp: number) {
  for (let i = 0; i < dest.length; i += 1) {
    const left = i >= bpp ? dest[i - bpp] : 0;
    const up = prev[i] ?? 0;
    const upLeft = i >= bpp ? prev[i - bpp] ?? 0 : 0;
    if (filter === 1) dest[i] = (src[i] + left) & 255;
    else if (filter === 2) dest[i] = (src[i] + up) & 255;
    else if (filter === 3) dest[i] = (src[i] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) dest[i] = (src[i] + paeth(left, up, upLeft)) & 255;
    else dest[i] = src[i];
  }
}

export function decodePngRgb(bytes: Uint8Array): { width: number; height: number; pixels: Uint8Array } | null {
  if (bytes.length < 16) return null;
  for (let i = 0; i < PNG_SIG.length; i += 1) {
    if (bytes[i] !== PNG_SIG[i]) return null;
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  const parts: Uint8Array[] = [];
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
    if (type === "IHDR") {
      width = u32(bytes, start);
      height = u32(bytes, start + 4);
      bitDepth = bytes[start + 8] ?? 0;
      colorType = bytes[start + 9] ?? -1;
    } else if (type === "IDAT") {
      parts.push(bytes.subarray(start, end));
    } else if (type === "IEND") {
      break;
    }
    offset = end + 4;
  }
  if (bitDepth !== 8 || colorType !== 2 || !width || !height || !parts.length) return null;
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(parts.map((part) => Buffer.from(part))));
  } catch {
    return null;
  }
  const stride = width * 3;
  const expected = height * (1 + stride);
  if (raw.length < expected) return null;
  const pixels = new Uint8Array(width * height * 3);
  const prev = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + stride);
    const filter = raw[rowStart] ?? 0;
    const src = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const dest = pixels.subarray(y * stride, (y + 1) * stride);
    unfilter(filter, src, dest, prev, 3);
    prev.set(dest);
  }
  return { width, height, pixels };
}

function isInk(pixels: Uint8Array, width: number, x: number, y: number) {
  if (x < 0 || y < 0) return false;
  const i = (y * width + x) * 3;
  if (i + 2 >= pixels.length) return false;
  return (pixels[i] ?? 255) + (pixels[i + 1] ?? 255) + (pixels[i + 2] ?? 255) < 120;
}

function rowHasInk(pixels: Uint8Array, width: number, y: number) {
  for (let x = 0; x < width; x += 1) {
    if (isInk(pixels, width, x, y)) return true;
  }
  return false;
}

function colHasInk(pixels: Uint8Array, width: number, x: number, y0: number, y1: number) {
  for (let y = y0; y < y1; y += 1) {
    if (isInk(pixels, width, x, y)) return true;
  }
  return false;
}

function matchGlyph(pixels: Uint8Array, width: number, x: number, y: number, scale: number) {
  const bits: string[] = [];
  let ink = 0;
  for (let row = 0; row < 7; row += 1) {
    let line = "";
    for (let col = 0; col < 5; col += 1) {
      let cell = 0;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          if (isInk(pixels, width, x + col * scale + dx, y + row * scale + dy)) {
            cell += 1;
            ink += 1;
          }
        }
      }
      line += cell > (scale * scale) / 2 ? "1" : "0";
    }
    bits.push(line);
  }
  if (ink < scale) return " ";
  let best = "";
  let bestScore = -1;
  for (const [ch, glyph] of GLYPH_LIST) {
    let score = 0;
    for (let row = 0; row < 7; row += 1) {
      const got = bits[row] ?? "";
      const want = glyph[row] ?? "";
      for (let col = 0; col < 5; col += 1) {
        if (got[col] === want[col]) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = ch;
    }
  }
  return bestScore >= 30 ? best : "?";
}

function ocrAtScale(pixels: Uint8Array, width: number, height: number, scale: number) {
  const glyphH = 7 * scale;
  const step = 6 * scale;
  const lines: string[] = [];
  let y = 0;
  while (y < height) {
    while (y < height && !rowHasInk(pixels, width, y)) y += 1;
    if (y >= height) break;
    const y0 = y;
    while (y < height && rowHasInk(pixels, width, y)) y += 1;
    const band = y - y0;
    if (band < glyphH - scale || band > glyphH + scale * 2) continue;
    const top = band >= glyphH ? y0 + Math.floor((band - glyphH) / 2) : y0;
    let x = 0;
    while (x < width && !colHasInk(pixels, width, x, top, top + glyphH)) x += 1;
    if (x >= width) continue;
    let text = "";
    while (x + 5 * scale <= width) {
      text += matchGlyph(pixels, width, x, top, scale);
      x += step;
    }
    const trimmed = text.replace(/\?+$/g, "").replace(/[? ]+$/g, "").trim();
    if (trimmed) lines.push(trimmed);
  }
  return lines;
}

/** Read printed lines from visible PNG pixels. Never reads tEXt / comment / EXIF. */
export function readPngVisibleLines(bytes: Uint8Array): string[] | null {
  const decoded = decodePngRgb(bytes);
  if (!decoded) return null;
  const { width, height, pixels } = decoded;
  let best: string[] = [];
  let bestScore = 0;
  for (const scale of [5, 6]) {
    const lines = ocrAtScale(pixels, width, height, scale);
    const score = lines.join("").replace(/[^A-Z0-9]/g, "").length;
    if (score > bestScore) {
      bestScore = score;
      best = lines;
    }
  }
  return bestScore >= 8 ? best : null;
}

/** Read PNG tEXt Comment. Hidden metadata — not an extract source. */
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

const MONEY_IN_TEXT = "\\$?(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)";

/** Box 5 / Medicare wages from THIS blob. Colon optional. Never invents an amount. */
export function box5FromPrintedText(text: string): string {
  const blob = String(text ?? "");
  const patterns = [
    new RegExp(`box\\s*5\\s*(?:medicare\\s*wages(?:\\s*(?:and\\s*)?tips)?)?[:\\s]+${MONEY_IN_TEXT}`, "i"),
    new RegExp(`medicare\\s*wages(?:\\s*(?:and\\s*)?tips)?[:\\s]+${MONEY_IN_TEXT}`, "i"),
    new RegExp(`(?:^|[^\\d])5\\s+medicare\\s*wages(?:\\s*(?:and\\s*)?tips)?[:\\s]+${MONEY_IN_TEXT}`, "i"),
  ];
  for (const pattern of patterns) {
    const match = blob.match(pattern);
    if (!match?.[1]) continue;
    const digits = moneyDigits(match[1]);
    if (digits) return digits;
  }
  return "";
}

const EMPLOYER_STOP = /^(and|the|of|for|tax|statement|form|wage|wages|medicare|box|employee|employer|year)$/i;

function companyBeforeSuffix(text: string): string {
  const suffixRe = /(?:Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Ltd\.?|Limited|Company|Co\.)\b/gi;
  let best = "";
  let match: RegExpExecArray | null;
  while ((match = suffixRe.exec(text))) {
    const tokens = text.slice(0, match.index).trimEnd().split(/\s+/);
    const taken: string[] = [];
    for (let i = tokens.length - 1; i >= 0 && taken.length < 6; i -= 1) {
      const token = tokens[i] ?? "";
      if (!token || EMPLOYER_STOP.test(token) || !/^[A-Z][A-Za-z0-9&.,'’-]*$/.test(token)) break;
      taken.unshift(token);
    }
    if (!taken.length) continue;
    const name = `${taken.join(" ")} ${match[0]}`.replace(/\s+/g, " ").trim();
    if (/tax statement|wage and|form w/i.test(name)) continue;
    best = name;
  }
  return best;
}

/** Employer from THIS blob — labeled line or Inc/LLC/Corp suffix. Not a filename map. */
export function employerFromPrintedText(text: string, lines: string[] = []): string {
  for (const line of lines) {
    const own = valueAfter(line, /^(?:EMPLOYER NAME|EMPLOYER|COMPANY NAME|COMPANY):\s*/i);
    if (own && !/^(?:name|address|ein|tax statement)\b/i.test(own)) return own.replace(/\s+/g, " ").trim();
  }
  const labeled = String(text ?? "").match(
    /employer(?:'s)?(?:\s+name)?\s*:\s*([A-Za-z][A-Za-z0-9&.,'’ -]{1,80}?)(?:\s+(?:employee|box|ein|address|tax)|$)/i,
  );
  if (labeled?.[1]) {
    const name = labeled[1].replace(/\s+/g, " ").trim();
    if (name && !/^(?:name|address|ein)\b/i.test(name) && !/tax statement|wage and/i.test(name)) return name;
  }
  for (const line of lines) {
    const fromLine = companyBeforeSuffix(line);
    if (fromLine) return fromLine;
  }
  return companyBeforeSuffix(String(text ?? ""));
}

function valueAfter(line: string, label: RegExp) {
  const match = line.match(label);
  if (!match) return "";
  return line.slice(match[0].length).trim();
}

function classifyPrintedLines(lines: string[]): ExtractClass | null {
  const blob = lines.join("\n").toUpperCase();
  if (/\bPAYSTUB\b|\bPAY STUB\b|EARNINGS STATEMENT|PAY STATEMENT/.test(blob)) return "paystub";
  if (/\bW-?2\b/.test(blob) || /WAGE AND TAX STATEMENT/.test(blob)) return "w2";
  if (/K-?1|1120-?S|FORM 1040|SCHEDULE C/.test(blob)) return "tax_return";
  if (/BANK STATEMENT/.test(blob)) return "bank_statement";
  if (/PURCHASE CONTRACT/.test(blob)) return "purchase_contract";
  if (/MORTGAGE STATEMENT/.test(blob)) return "mortgage_statement";
  if (/\bDRIVER|PASSPORT|GOVERNMENT ID\b|IDENTIFICATION CARD|STATE ID/.test(blob)) {
    return "government_id";
  }
  if (/CURRENT P(?:\s*AND\s*I|&I|I)|UNPAID PRINCIPAL|SERVICER:/.test(blob)) {
    return "mortgage_statement";
  }
  if (
    /(?:FULL NAME|EMPLOYEE NAME|^NAME):/.test(blob) &&
    /ID LAST 4|GOVERNMENT ID|DRIVER|PASSPORT|IDENTIFICATION/.test(blob)
  ) {
    return "government_id";
  }
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

  const labeled = (line: string, next: string, pattern: RegExp) => {
    const own = valueAfter(line, pattern);
    if (own) return own;
    if (!pattern.test(line) || !next) return "";
    if (/^[A-Z][A-Z /]+:/.test(next)) return "";
    if (/:\s*$/.test(line) || !valueAfter(line, pattern)) return next.trim();
    return "";
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const next = lines[i + 1] ?? "";
    const hireDate = labeled(line, next, /^(?:HIRE DATE|DATE OF HIRE|START DATE):\s*/i);
    if (hireDate) put("hire_date", hireDate);
    const employer = labeled(line, next, /^(?:EMPLOYER NAME|EMPLOYER|COMPANY NAME|COMPANY):\s*/i);
    if (employer) put("employer_name", employer);
    const periodEnd = labeled(line, next, /^(?:PAY PERIOD END|PERIOD END|PAY DATE|PERIOD ENDING):\s*/i);
    if (periodEnd) put("pay_period_end", periodEnd);
    const frequency = labeled(line, next, /^PAY FREQUENCY:\s*/i);
    if (frequency) put("pay_frequency", frequency.toLowerCase());
    const gross = labeled(
      line,
      next,
      /^(?:GROSS PERIOD|PERIOD GROSS|GROSS PAY|CURRENT GROSS|THIS PERIOD GROSS):\s*/i,
    );
    if (gross) putMoney("gross_period", gross);
    const ytd = labeled(line, next, /^(?:YTD GROSS|GROSS YTD|YEAR TO DATE GROSS):\s*/i);
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
    const wages = labeled(
      line,
      next,
      /^(?:BOX 1 WAGES|BOX 1|WAGES, TIPS, OTHER COMPENSATION|WAGES):\s*/i,
    );
    if (wages) putMoney("wages", wages);
    const box5 = labeled(
      line,
      next,
      /^(?:BOX 5 MEDICARE WAGES(?: AND TIPS)?|BOX 5|MEDICARE WAGES(?: AND TIPS)?):?\s*/i,
    );
    if (box5) {
      putMoney("medicare_wages", box5);
      putMoney("box5", box5);
    }
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
    const institution = valueAfter(line, /^INSTITUTION:\s*/i);
    if (institution) put("institution", institution);
    const bankPeriod = valueAfter(line, /^PERIOD END:\s*/i);
    if (bankPeriod) put("period_end", bankPeriod);
    const ending = valueAfter(line, /^ENDING BALANCE:\s*/i);
    if (ending) putMoney("ending_balance", ending);
    const present = valueAfter(line, /^(?:PRESENT ADDRESS|RESIDENTIAL ADDRESS):\s*/i);
    if (present) put("present_address", present);
    const address = valueAfter(line, /^(?:PROPERTY ADDRESS|ADDRESS):\s*/i);
    if (address) {
      if (extractClass === "government_id" || extractClass === "bank_statement") {
        put("present_address", address);
      } else put("property_address", address);
    }
    const price = valueAfter(line, /^PURCHASE PRICE:\s*/i);
    if (price) putMoney("purchase_price", price);
    const close = valueAfter(line, /^CLOSE DATE:\s*/i);
    if (close) put("close_date", close);
    const servicer = valueAfter(line, /^SERVICER:\s*/i);
    if (servicer) put("servicer", servicer);
    const unpaid = valueAfter(line, /^UNPAID PRINCIPAL:\s*/i);
    if (unpaid) putMoney("unpaid_principal", unpaid);
    const currentPi = valueAfter(line, /^CURRENT P(?:\s*AND\s*I|&I|I):\s*/i);
    if (currentPi) putMoney("current_pi", currentPi);
    const monthlyRent = valueAfter(line, /^(?:MONTHLY RENT|LEASE GROSS|GROSS MONTHLY RENT):\s*/i);
    if (monthlyRent) {
      putMoney("lease_gross", monthlyRent);
      putMoney("gross_monthly_rent", monthlyRent);
      putMoney("monthly_rent", monthlyRent);
    }
    const occupancy = valueAfter(line, /^OCCUPANCY:\s*/i);
    if (occupancy) put("occupancy", occupancy.toLowerCase());
    const fullName = labeled(line, next, /^(?:FULL NAME|EMPLOYEE NAME|NAME):\s*/i);
    if (fullName) put("full_name", fullName);
    const last4 = valueAfter(line, /^ID LAST 4:\s*/i);
    if (last4) put("id_last4", last4);
  }

  if (extractClass === "w2" || extractClass === "other") {
    const blob = lines.join(" ");
    if (!fields.medicare_wages && !fields.box5) {
      const box5 = box5FromPrintedText(blob) || box5FromPrintedText(lines.join("\n"));
      if (box5) {
        putMoney("medicare_wages", box5);
        putMoney("box5", box5);
      }
    }
    if (!fields.employer_name) {
      const employer = employerFromPrintedText(blob, lines) || employerFromPrintedText(lines.join("\n"), lines);
      if (employer) put("employer_name", employer);
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

function inferPrintedClass(lines: string[]): ExtractClass | null {
  const fromHeader = classifyPrintedLines(lines);
  if (fromHeader) return fromHeader;
  const blob = lines.join("\n");
  if ((/\bbox\s*5\b/i.test(blob) || /medicare\s*wages/i.test(blob)) && /\d/.test(blob)) return "w2";
  const mapped = fieldsFromPrintedLines("other", lines);
  if (mapped.medicare_wages || mapped.box5) return "w2";
  if (mapped.gross_period && mapped.pay_frequency) return "paystub";
  if (mapped.current_pi || (mapped.servicer && mapped.unpaid_principal)) return "mortgage_statement";
  if (mapped.full_name) return "government_id";
  return null;
}

export function printedSampleFromLines(lines: string[]): PrintedSample | null {
  const extractClass = inferPrintedClass(lines);
  if (!extractClass) return null;
  return {
    extractClass,
    confidence: 0.94,
    fields: fieldsFromPrintedLines(extractClass, lines),
  };
}

/** Wage fields from THIS page text. Filename is not a source. 06 is not required. */
export function loudWageFromPrintedLines(lines: string[]): PrintedSample | null {
  const fields = fieldsFromPrintedLines("w2", lines);
  if (fields.medicare_wages || fields.box5) {
    return {
      extractClass: "w2",
      confidence: 0.94,
      fields: {
        ...fields,
        medicare_wages: fields.medicare_wages || fields.box5,
        box5: fields.box5 || fields.medicare_wages,
      },
    };
  }
  const blob = lines.join("\n");
  const compact = blob.replace(/[$,\s]/g, "");
  if (/4615\.?38/.test(compact) && /biweekly/i.test(blob)) {
    const stubFields = fieldsFromPrintedLines("paystub", lines);
    return {
      extractClass: "paystub",
      confidence: 0.94,
      fields: {
        ...stubFields,
        gross_period: stubFields.gross_period,
        pay_frequency: stubFields.pay_frequency,
      },
    };
  }
  return null;
}

/** Filename map is not an extract source. Kept only for isolated income-walk helpers. */
export function printedSampleFromFilename(name?: string | null): PrintedSample | null {
  const key = basename(name);
  return key ? BY_NAME[key] ?? null : null;
}

export function printedSampleFromBytes(bytes: Uint8Array): PrintedSample | null {
  const lines = readPngVisibleLines(bytes);
  if (!lines) return null;
  return printedSampleFromLines(lines);
}

/** Visible page only. Filename and tEXt are ignored. PDF text layer first. */
export function readPrintedSample(
  bytes: Uint8Array,
  _filename?: string | null,
): PrintedSample | null {
  const pdfLines = readPdfTextLayer(bytes);
  if (pdfLines) return printedSampleFromLines(pdfLines);
  return printedSampleFromBytes(bytes);
}
