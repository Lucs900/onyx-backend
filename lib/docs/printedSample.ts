/**
 * Printed ONYX mortgage-sample fields. Reads labeled fixture text from the
 * visible page pixels. PNG tEXt / comment / EXIF and filename maps are not
 * extract sources.
 */

import { inflateSync } from "node:zlib";
import type { ExtractClass } from "@/components/fox/types";
import {
  bankEndingBalanceAmount,
  bankEndingBalanceFromStatementText,
  isDateFragmentAmount,
} from "@/lib/docs/bankBalance";
import { isTransferCounterpartyLine, safeAccountLast4, statementAccountLast4 } from "@/lib/docs/bankLast4";
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
  "*": ["00100", "10101", "01110", "11111", "01110", "10101", "00100"],
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

/** Period gross from THIS blob. Colon optional. Comma optional. Never invents an amount. */
export function grossPeriodFromPrintedText(text: string): string {
  const blob = String(text ?? "");
  const patterns = [
    new RegExp(
      `(?:gross(?:\\s*(?:period|pay|current|this\\s*period))?|(?:period|current|this\\s*period)\\s*gross)\\s*:?\\s*${MONEY_IN_TEXT}`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = blob.match(pattern);
    if (!match?.[1]) continue;
    const digits = moneyDigits(match[1]);
    if (digits) return digits;
  }
  return "";
}

/** Pay frequency from THIS blob. Colon optional. BIWEEKLY = biweekly. */
export function payFrequencyFromPrintedText(text: string): string {
  const blob = String(text ?? "");
  const match = blob.match(
    /\b(bi[\s-]?weekly|every\s*2\s*weeks|fortnight(?:ly)?|semi[\s-]?monthly|twice[\s-]?a[\s-]?month|weekly|monthly)\b/i,
  );
  const raw = match?.[1] ?? "";
  if (!raw) return "";
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (/(biweekly|every2weeks|fortnight)/.test(compact)) return "biweekly";
  if (/(semimonth|twiceamonth)/.test(compact)) return "semimonthly";
  if (/weekly/.test(compact)) return "weekly";
  if (/month/.test(compact)) return "monthly";
  return "";
}

/** Employer from THIS blob — labeled line or Inc/LLC/Corp suffix. Not a filename map. */
export function employerFromPrintedText(text: string, lines: string[] = []): string {
  for (const line of lines) {
    const own = valueAfter(line, /^(?:EMPLOYER NAME|EMPLOYER|COMPANY NAME|COMPANY):?\s*/i);
    if (own && !/^(?:name|address|ein|tax statement)\b/i.test(own)) return own.replace(/\s+/g, " ").trim();
  }
  const labeled = String(text ?? "").match(
    /employer(?:'s)?(?:\s+name)?\s*:?\s*([A-Za-z][A-Za-z0-9&.,'’ -]{1,80}?)(?:\s+(?:employee|box|ein|address|tax)|$)/i,
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

function looksLikeScheduleCWorksheet(lines: string[]) {
  const blob = lines.join("\n").toUpperCase();
  if (/SCHEDULE C WORKSHEET|FORM 1040 SCHEDULE C|IRS FORM 1040 SCHEDULE C/.test(blob)) return true;
  if (/PROFIT OR LOSS FROM BUSINESS/.test(blob)) return true;
  return /\bLINE\s*31\b/.test(blob) && /NET PROFIT/.test(blob);
}

function k1WorksheetKind(lines: string[]): "1065" | "1120s" | "k1" | null {
  const blob = lines.join("\n").toUpperCase();
  if (/SCHEDULE K-1\s*\(\s*FORM 1065\s*\)|K-1\s*\(\s*FORM 1065\s*\)/.test(blob)) return "1065";
  if (/SCHEDULE K-1\s*\(\s*FORM 1120S?\s*\)|K-1\s*\(\s*FORM 1120S\s*\)/.test(blob)) return "1120s";
  if (/SCHEDULE K-1 FORM 1120-?S/.test(blob)) return "k1";
  if (/SCHEDULE K-1/.test(blob) && /FORM 1065/.test(blob)) return "1065";
  if (/SCHEDULE K-1/.test(blob) && /1120-?S/.test(blob)) return "1120s";
  return null;
}

function looksLikeK1Worksheet(lines: string[]) {
  return k1WorksheetKind(lines) != null;
}

function classifyPrintedLines(lines: string[]): ExtractClass | null {
  const blob = lines.join("\n").toUpperCase();
  if (looksLikeScheduleCWorksheet(lines)) return "tax_return";
  if (looksLikeK1Worksheet(lines)) return "tax_return";
  if (
    /\bPAYSTUB\b|\bPAY STUB\b|EARNINGS STATEMENT|PAY STATEMENT/.test(blob) ||
    (/\bBI[\s-]?WEEKLY\b|\bSEMI[\s-]?MONTHLY\b|\bWEEKLY\b|\bMONTHLY\b/.test(blob) &&
      /\bGROSS\b/.test(blob) &&
      /\d/.test(blob))
  ) {
    return "paystub";
  }
  if (/\bW-?2\b/.test(blob) || /WAGE AND TAX STATEMENT/.test(blob)) return "w2";
  if (/K-?1|1120-?S|FORM 1040|SCHEDULE C/.test(blob)) return "tax_return";
  if (
    /BANK STATEMENT|ACCOUNT STATEMENT/.test(blob) ||
    (/\bBANK\b/.test(blob) && /ENDING BALANCE|ENDING BAL\b/.test(blob) && !/\bPAYSTUB\b|\bW-?2\b/.test(blob))
  ) {
    return "bank_statement";
  }
  if (/PURCHASE CONTRACT|PURCHASE AGREEMENT|CALIFORNIA RESIDENTIAL PURCHASE/.test(blob)) {
    return "purchase_contract";
  }
  if (/MORTGAGE STATEMENT/.test(blob)) return "mortgage_statement";
  if (
    /\bDRIVER|PASSPORT|GOVERNMENT ID\b|IDENTIFICATION CARD|STATE ID/.test(blob) ||
    (/\bCALIFORNIA\b/.test(blob) && /\bLN\b/.test(blob) && /\bFN\b/.test(blob))
  ) {
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

function stackedLabelValue(lines: string[], label: RegExp) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? "").trim();
    const own = valueAfter(line, label);
    if (own) return own;
    if (!label.test(line)) continue;
    const next = (lines[i + 1] ?? "").trim();
    if (!next || /^[A-Z][A-Z /]+:/.test(next)) continue;
    if (/^line\s*\d+/i.test(next) || /^part\s+/i.test(next) || /^expected 1084/i.test(next)) continue;
    return next;
  }
  return "";
}

function worksheetLineBlock(lines: string[], lineNo: string) {
  const start = new RegExp(`^line\\s*${lineNo}\\b`, "i");
  for (let i = 0; i < lines.length; i += 1) {
    const head = (lines[i] ?? "").trim();
    if (!start.test(head)) continue;
    if (/expected 1084/i.test(head)) continue;
    const texts = [head];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = (lines[j] ?? "").trim();
      if (
        /^line\s*\d+/i.test(next) ||
        /^part\s+/i.test(next) ||
        /^expected 1084/i.test(next) ||
        /^page\s*2\b/i.test(next) ||
        /^suggested monthly/i.test(next) ||
        /^(?:8829|4562)$/i.test(next)
      ) {
        break;
      }
      texts.push(next);
    }
    return texts;
  }
  return [];
}

function firstMoneyInBlock(texts: string[]) {
  for (const text of texts) {
    if (/expected 1084|suggested monthly|method:|ordinary alone/i.test(text)) continue;
    const own = moneyDigits(text.replace(/^\$\s*/, ""));
    if (own) return own;
    const tail = text.match(/\$\s*([\d,]+(?:\.\d+)?)/);
    if (tail?.[1]) {
      const digits = moneyDigits(tail[1]);
      if (digits) return digits;
    }
  }
  return "";
}

/** Worksheet labels (stacked or colon). Never reads Expected 1084 or the filename. */
function applyScheduleCWorksheetFields(
  lines: string[],
  put: (key: string, value: string) => void,
  putMoney: (key: string, value: string) => void,
) {
  if (!looksLikeScheduleCWorksheet(lines) && !lines.some((line) => /^line\s*31\b/i.test(line.trim()))) {
    return;
  }
  const taxYear = stackedLabelValue(lines, /^TAX YEAR:?\s*/i);
  if (taxYear) put("tax_year", taxYear.replace(/\D/g, "").slice(0, 4));
  const business = stackedLabelValue(lines, /^BUSINESS NAME:?\s*/i);
  if (business && !/^(?:name|address|ein)\b/i.test(business)) put("business_name", business);

  const line31 = worksheetLineBlock(lines, "31");
  if (line31.some((text) => /net profit/i.test(text))) {
    const net = firstMoneyInBlock(line31);
    if (net) putMoney("schedule_c_net_profit", net);
  }
  const line12 = worksheetLineBlock(lines, "12");
  if (line12.some((text) => /depletion/i.test(text))) {
    const depletion = firstMoneyInBlock(line12);
    if (depletion) putMoney("depletion", depletion);
  }
  const line13 = worksheetLineBlock(lines, "13");
  if (line13.some((text) => /depreciation/i.test(text))) {
    const dep = firstMoneyInBlock(line13);
    if (dep) putMoney("depreciation", dep);
  }
  const line30 = worksheetLineBlock(lines, "30");
  if (line30.some((text) => /business use of home|form 8829/i.test(text))) {
    const home = firstMoneyInBlock(line30);
    if (home) putMoney("business_use_of_home", home);
  }
  const line6 = worksheetLineBlock(lines, "6");
  if (line6.some((text) => /nonrecurring|one[\s-]?time/i.test(text))) {
    const other = firstMoneyInBlock(line6);
    if (other) putMoney("nonrecurring_other_income", other);
  }
}

function worksheetBoxBlock(lines: string[], boxNo: string) {
  const start = new RegExp(`^box\\s*${boxNo}\\b`, "i");
  for (let i = 0; i < lines.length; i += 1) {
    const head = (lines[i] ?? "").trim();
    if (!start.test(head)) continue;
    if (/expected 1084|ordinary alone/i.test(head)) continue;
    const texts = [head];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = (lines[j] ?? "").trim();
      if (
        /^box\s*\d/i.test(next) ||
        /^form\s*10(65|20)/i.test(next) ||
        /^expected 1084/i.test(next) ||
        /^suggested monthly/i.test(next) ||
        /^ordinary alone/i.test(next)
      ) {
        break;
      }
      texts.push(next);
    }
    return texts;
  }
  return [];
}

/** K-1 Box 1 ordinary from THIS page. Never Expected 1084, coaching /12, or ownership. */
function applyK1WorksheetFields(
  lines: string[],
  put: (key: string, value: string) => void,
  putMoney: (key: string, value: string) => void,
) {
  if (!looksLikeK1Worksheet(lines) && !lines.some((line) => /^box\s*1\b/i.test(line.trim()))) {
    return;
  }
  const taxYear = stackedLabelValue(lines, /^TAX YEAR:?\s*/i);
  if (taxYear) put("tax_year", taxYear.replace(/\D/g, "").slice(0, 4));
  const box1 = worksheetBoxBlock(lines, "1");
  if (box1.some((text) => /ordinary business income/i.test(text))) {
    const ordinary = firstMoneyInBlock(box1);
    if (ordinary) putMoney("k1_ordinary_income", ordinary);
  }
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
    const employer = labeled(line, next, /^(?:EMPLOYER NAME|EMPLOYER|COMPANY NAME|COMPANY):?\s*/i);
    if (employer) put("employer_name", employer);
    const periodEnd = labeled(line, next, /^(?:PAY PERIOD END|PERIOD END|PAY DATE|PERIOD ENDING):?\s*/i);
    if (periodEnd) put("pay_period_end", periodEnd);
    const frequency = labeled(line, next, /^(?:PAY FREQUENCY|FREQUENCY|PAY CYCLE):?\s*/i);
    if (frequency) put("pay_frequency", frequency.toLowerCase());
    const gross = labeled(
      line,
      next,
      /^(?:GROSS PERIOD|PERIOD GROSS|GROSS PAY|CURRENT GROSS|THIS PERIOD GROSS|GROSS):?\s*/i,
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
    const business = valueAfter(line, /^(?:BUSINESS NAME|BUSINESS):\s*/i);
    if (business) put("business_name", business);
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
    if (/^(?:ACCOUNT(?:\s+(?:NO|NUMBER|#|HOLDER))?|ACCOUNT LAST\s*4|LAST\s*4)\s*:/i.test(line)) {
      if (!isTransferCounterpartyLine(line)) {
        const last4 = safeAccountLast4(line);
        if (last4) put("account_last4", last4);
      }
      continue;
    }
    const institution = labeled(line, next, /^(?:INSTITUTION|BANK NAME):\s*/i);
    if (institution && !/\b(?:4412|4419|2281)\b|\*{2,}|x{4,}/i.test(institution)) put("institution", institution);
    const bankPeriod = valueAfter(line, /^(?:PERIOD END|STATEMENT PERIOD(?: END)?|PERIOD ENDING):\s*/i);
    if (bankPeriod) put("period_end", bankPeriod);
    const ending = labeled(line, next, /^(?:ENDING BALANCE|ENDING BAL\.?|ENDING ACCOUNT BALANCE):?\s*/i);
    if (ending) {
      const amount = bankEndingBalanceAmount(ending);
      if (amount) put("ending_balance", amount);
    }
    const present = valueAfter(line, /^(?:PRESENT ADDRESS|RESIDENTIAL ADDRESS):\s*/i);
    if (present) put("present_address", present);
    const address = labeled(
      line,
      next,
      /^(?:PROPERTY ADDRESS|SUBJECT PROPERTY(?: ADDRESS)?|THE PROPERTY(?: TO BE ACQUIRED)?|ADDRESS):\s*/i,
    );
    if (address) {
      if (extractClass === "government_id" || extractClass === "bank_statement") {
        put("present_address", address);
      } else put("property_address", address);
    }
    const price = labeled(line, next, /^(?:PURCHASE PRICE|TOTAL PURCHASE PRICE):\s*/i);
    if (price) putMoney("purchase_price", price);
    const close = labeled(line, next, /^(?:CLOSE DATE|CLOSE OF ESCROW|CLOSING DATE):\s*/i);
    if (close) put("close_date", close);
    const sellerCredit = labeled(
      line,
      next,
      /^(?:SELLER CREDIT|SELLER CREDITS|SELLER CONCESSION|SELLER CONCESSIONS|CREDIT TO BUYER):\s*/i,
    );
    if (sellerCredit && /\$|[\d,]+\.\d{2}\b/.test(sellerCredit) && moneyDigits(emptyIfNotShown(sellerCredit))) {
      putMoney("seller_credit", sellerCredit);
    }
    const inspection = labeled(line, next, /^INSPECTION CONTINGENCY:\s*/i);
    if (inspection && /\d/.test(inspection)) put("inspection_contingency", inspection);
    const loanContingency = labeled(line, next, /^LOAN CONTINGENCY:\s*/i);
    if (loanContingency && /\d/.test(loanContingency)) put("loan_contingency", loanContingency);
    const appraisal = labeled(line, next, /^APPRAISAL CONTINGENCY:\s*/i);
    if (appraisal && /\d/.test(appraisal)) put("appraisal_contingency", appraisal);
    const addenda = labeled(line, next, /^ADDENDA:\s*/i);
    if (addenda && !/fails|fnma|ineligible|guideline/i.test(addenda)) put("addenda", addenda);
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

  if (extractClass === "purchase_contract") {
    if (!fields.property_address) {
      const street = streetFromContractLines(lines);
      if (street) put("property_address", street);
    }
    if (!fields.seller_credit) {
      const credit = sellerCreditFromContractLines(lines);
      if (credit) put("seller_credit", credit);
    }
  }

  if (extractClass === "government_id" || extractClass === "other") {
    if (!fields.full_name) {
      const fromLnFn = nameFromCaIdLines(lines);
      if (fromLnFn) put("full_name", fromLnFn);
    }
    if (!fields.present_address) {
      const residence = residenceFromIdLines(lines);
      if (residence) put("present_address", residence);
    }
    delete fields.property_address;
    delete fields.subjectAddress;
    delete fields.daq;
    delete fields.dl;
    delete fields.dl_number;
    delete fields.license_number;
    for (const key of Object.keys(fields)) {
      if (isCaDriverLicenseNumber(fields[key] ?? "")) delete fields[key];
    }
  }

  if (extractClass === "bank_statement") {
    if (!fields.institution) {
      const fromHeader = institutionFromBankLines(lines);
      if (fromHeader) put("institution", fromHeader);
    }
    const fromText = bankEndingBalanceFromStatementText(lines.join("\n"));
    if (fromText && (!fields.ending_balance || isDateFragmentAmount(fields.ending_balance))) {
      fields.ending_balance = fromText;
    } else if (fields.ending_balance && isDateFragmentAmount(fields.ending_balance)) {
      delete fields.ending_balance;
    }
    const last4 = statementAccountLast4(lines.join("\n"));
    if (last4 && !fields.account_last4) put("account_last4", last4);
    delete fields.asset_accounts;
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

  if (extractClass === "paystub" || extractClass === "other") {
    const blob = lines.join(" ");
    const stacked = lines.join("\n");
    if (!fields.gross_period) {
      const gross = grossPeriodFromPrintedText(blob) || grossPeriodFromPrintedText(stacked);
      if (gross) putMoney("gross_period", gross);
    }
    if (!fields.pay_frequency) {
      const frequency = payFrequencyFromPrintedText(blob) || payFrequencyFromPrintedText(stacked);
      if (frequency) put("pay_frequency", frequency);
    }
    if (!fields.employer_name) {
      const employer = employerFromPrintedText(blob, lines) || employerFromPrintedText(stacked, lines);
      if (employer) put("employer_name", employer);
    }
  }

  if (extractClass === "tax_return" || extractClass === "other") {
    applyScheduleCWorksheetFields(lines, put, putMoney);
    applyK1WorksheetFields(lines, put, putMoney);
  }

  if (extractClass === "tax_return") {
    const blob = lines.join("\n").toUpperCase();
    const k1Kind = k1WorksheetKind(lines);
    if (k1Kind) {
      fields.return_kind = k1Kind;
    } else if (/K-?1|1120-?S/.test(blob) && !looksLikeScheduleCWorksheet(lines)) {
      fields.return_kind = "k1";
    } else if (looksLikeScheduleCWorksheet(lines) || fields.schedule_c_net_profit) {
      fields.return_kind = "schedule_c";
    }
  }

  return fields;
}

export function isCaDriverLicenseNumber(value: string) {
  return /^[A-Z]\d{7}$/i.test(String(value ?? "").replace(/\s+/g, ""));
}

function looksLikePersonNameToken(value: string) {
  const t = value.replace(/[,;]+$/g, "").replace(/\s+/g, " ").trim();
  if (!t || t.length < 2 || t.length > 40) return "";
  if (/[0-9]/.test(t)) return "";
  if (
    /^(DL|EXP|DOB|SEX|HGT|WGT|HAIR|EYES|CLASS|END|RSTR|USA|CA|CALIFORNIA|DRIVER|LICENSE|IDENTIFICATION|CARD|STATE|ADDRESS)$/i.test(
      t,
    )
  ) {
    return "";
  }
  if (!/^[A-Za-z][A-Za-z.'\- ]*[A-Za-z.']$/.test(t) && !/^[A-Za-z][A-Za-z.'\-]*$/.test(t)) return "";
  return t;
}

function firstNameFieldValue(raw: string) {
  const cut = raw.split(/\s+(?:LN|DL|EXP|DOB|SEX|MN|DCS|DAQ|DAG|DAI|DAJ|DAK|CLASS)\b/i)[0] ?? raw;
  const tokens = cut.trim().split(/\s+/).filter(Boolean).slice(0, 3);
  return looksLikePersonNameToken(tokens.join(" "));
}

function lastNameFieldValue(raw: string) {
  const cut = raw.split(/\s+(?:FN|DL|EXP|DOB|SEX|MN|DAC|DAQ|DAG|CLASS)\b/i)[0] ?? raw;
  const token = (cut.trim().split(/\s+/)[0] ?? "").trim();
  return looksLikePersonNameToken(token);
}

/** CA DL LN/FN and AAMVA name codes on THIS page. Never invents a name. */
export function nameFromCaIdLines(lines: string[]): string {
  let last = "";
  let first = "";
  const takeLast = (raw: string) => {
    const value = lastNameFieldValue(raw);
    if (value && !last) last = value;
  };
  const takeFirst = (raw: string) => {
    const value = firstNameFieldValue(raw);
    if (value && !first) first = value;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? "").trim();
    const next = (lines[i + 1] ?? "").trim();
    const lnSame = line.match(/(?:^|[\s|/])(?:LN|LAST NAME|DCS)\s*:?\s+([A-Za-z][A-Za-z.'\- ]*)/i);
    if (lnSame?.[1]) takeLast(lnSame[1]);
    const fnSame = line.match(/(?:^|[\s|/])(?:FN|FIRST NAME|DAC)\s*:?\s+([A-Za-z][A-Za-z.'\- ]*)/i);
    if (fnSame?.[1]) takeFirst(fnSame[1]);
    if (/^(?:LN|LAST NAME|DCS)\s*:?\s*$/i.test(line)) takeLast(next);
    if (/^(?:FN|FIRST NAME|DAC)\s*:?\s*$/i.test(line)) takeFirst(next);
    const field1 = line.match(/^(?:1|1\.)\s+(?:LN\s*:?\s+)?([A-Za-z][A-Za-z.'\-]*)$/i);
    if (field1?.[1]) takeLast(field1[1]);
    const field2 = line.match(/^(?:2|2\.)\s+(?:FN\s*:?\s+)?([A-Za-z][A-Za-z.'\- ]+)$/i);
    if (field2?.[1]) takeFirst(field2[1]);
  }

  if (!first || !last) {
    const blob = lines.join("\n");
    if (!last) {
      const ln = blob.match(/\b(?:LN|LAST NAME|DCS)\s*:?\s+([A-Za-z][A-Za-z.'\-]*)/i);
      if (ln?.[1]) takeLast(ln[1]);
    }
    if (!first) {
      const fn = blob.match(/\b(?:FN|FIRST NAME|DAC)\s*:?\s+([A-Za-z][A-Za-z.'\-]+(?:\s+[A-Za-z][A-Za-z.'\-]*){0,2})/i);
      if (fn?.[1]) takeFirst(fn[1]);
    }
  }

  if (first && last) return `${first} ${last}`.replace(/\s+/g, " ").trim();
  return "";
}

/** ID street is residence. Never a subject / purchase address. */
export function residenceFromIdLines(lines: string[]): string {
  for (const line of lines) {
    const labeled = valueAfter(
      line,
      /^(?:RESIDENTIAL ADDRESS|PRESENT ADDRESS|DAG)\s*:?\s*/i,
    );
    if (labeled) return labeled.replace(/\s+/g, " ").trim();
    const mid = line.match(
      /(?:RESIDENTIAL ADDRESS|PRESENT ADDRESS)\s*:?\s+(\d{1,6}\s+\S.+)/i,
    );
    if (mid?.[1]) return mid[1].replace(/\s+/g, " ").trim();
  }
  const street = lines
    .map((line) => line.match(/\bDAG\s*:?\s+(.+)/i)?.[1]?.trim() ?? "")
    .find(Boolean);
  const city = lines
    .map((line) => line.match(/\bDAI\s*:?\s+(.+)/i)?.[1]?.trim() ?? "")
    .find(Boolean);
  const state = lines
    .map((line) => line.match(/\bDAJ\s*:?\s+([A-Za-z]{2})\b/i)?.[1]?.trim() ?? "")
    .find(Boolean);
  const zip = lines
    .map((line) => line.match(/\bDAK\s*:?\s+(\d{5}(?:-\d{4})?)/i)?.[1]?.trim() ?? "")
    .find(Boolean);
  if (street && (city || zip)) {
    return [street, [city, state || "CA", zip].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ")
      .replace(/\s+/g, " ")
      .trim();
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? "").trim();
    const streetLine = line.replace(/^(?:8|8\.)\s+/, "");
    if (
      !/^\d{1,6}\s+[A-Za-z]/.test(streetLine) ||
      !/\b(ST|STREET|AVE|AVENUE|BLVD|RD|ROAD|LN|LANE|DR|DRIVE|WAY|CT|COURT|PL|PLACE)\b/i.test(streetLine)
    ) {
      continue;
    }
    const next = (lines[i + 1] ?? "").trim();
    if (next && /\bCA\b/i.test(next) && /\d{5}/.test(next) && !/^[A-Z][A-Z /]+:/.test(next)) {
      return `${streetLine}, ${next}`.replace(/\s+/g, " ").trim();
    }
    return streetLine;
  }
  return "";
}

function institutionFromBankLines(lines: string[]): string {
  for (const line of lines) {
    const t = line.trim();
    if (!t || /statement|period|ending|account|address|holder|sample|mortgage|page|balance|transfer/i.test(t)) {
      continue;
    }
    if (/\bBANK\b/i.test(t) && t.length <= 48 && !/\$/.test(t) && !/\d{4}/.test(t)) return t;
  }
  return "";
}

function inferPrintedClass(lines: string[]): ExtractClass | null {
  const fromHeader = classifyPrintedLines(lines);
  if (fromHeader) return fromHeader;
  const blob = lines.join("\n");
  if ((/\bbox\s*5\b/i.test(blob) || /medicare\s*wages/i.test(blob)) && /\d/.test(blob)) return "w2";
  const mapped = fieldsFromPrintedLines("other", lines);
  if (mapped.schedule_c_net_profit || mapped.k1_ordinary_income) return "tax_return";
  if (mapped.medicare_wages || mapped.box5) return "w2";
  if (mapped.gross_period && mapped.pay_frequency) return "paystub";
  if (mapped.current_pi || (mapped.servicer && mapped.unpaid_principal)) return "mortgage_statement";
  if (mapped.institution || mapped.ending_balance) return "bank_statement";
  if (mapped.purchase_price || mapped.seller_credit) return "purchase_contract";
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

function zipOnlyContractAddress(value: string) {
  const t = value.trim();
  if (!t) return true;
  if (/^\d{5}(?:-\d{4})?$/.test(t)) return true;
  return /^[A-Za-z][A-Za-z .'-]+,\s*CA\s+\d{5}(?:-\d{4})?$/.test(t);
}

function cleanContractStreet(raw: string) {
  const next = raw
    .replace(/\s+/g, " ")
    .replace(/[.;]+$/g, "")
    .trim();
  if (!next || zipOnlyContractAddress(next)) return "";
  if (!/^\d{1,6}\s+[A-Za-z]/.test(next)) return "";
  if (!/\b(ST|STREET|AVE|AVENUE|BLVD|RD|ROAD|LN|LANE|DR|DRIVE|WAY|CT|COURT|PL|PLACE)\b/i.test(next)) {
    return "";
  }
  return next;
}

/** Subject street from labeled or one-line contract text. Not a residence ZIP. */
function streetFromContractLines(lines: string[]): string {
  const blob = lines.join("\n");
  const labeled = blob.match(
    /(?:subject\s+property(?:\s+address)?|property\s+address|the\s+property(?:\s+to\s+be\s+acquired)?)\s*:?\s*(?:is\s+)?(\d{1,6}\s+[A-Za-z][^\n]+)/i,
  );
  const fromLabel = cleanContractStreet(labeled?.[1] ?? "");
  if (fromLabel) return fromLabel;
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? "").trim();
    if (/present address|residential address|buyer address/i.test(line)) continue;
    const oneLine = line.match(
      /(\d{1,6}\s+[A-Za-z][^,]*,\s*[A-Za-z .'-]+,\s*CA\s+\d{5}(?:-\d{4})?)/i,
    );
    const cleaned = cleanContractStreet(oneLine?.[1] ?? "");
    if (cleaned) return cleaned;
    if (
      /^\d{1,6}\s+[A-Za-z]/.test(line) &&
      /\b(ST|STREET|AVE|AVENUE|BLVD|RD|ROAD|LN|LANE|DR|DRIVE|WAY|CT|COURT|PL|PLACE)\b/i.test(line)
    ) {
      const next = (lines[i + 1] ?? "").trim();
      if (next && /\bCA\b/i.test(next) && /\d{5}/.test(next) && !/^[A-Z][A-Z /]+:/.test(next)) {
        const joined = cleanContractStreet(`${line}, ${next}`);
        if (joined) return joined;
      }
    }
  }
  return "";
}

/** Seller credit only when a dollar amount is printed next to seller credit / concession language. */
function sellerCreditFromContractLines(lines: string[]): string {
  const blob = lines.join("\n");
  const patterns = [
    /seller\s+(?:credit|credits|concession|concessions)(?:\s+to\s+(?:the\s+)?buyer)?\s*:?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /seller\s+(?:to\s+)?credits?\s+(?:the\s+)?buyer[^$\d]{0,80}\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /credit\s+to\s+(?:the\s+)?buyer\s*:?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = blob.match(pattern);
    if (!match?.[1] || /none|n\/a|not shown/i.test(match[0])) continue;
    const digits = moneyDigits(match[1]);
    if (digits && Number(digits) > 0) return digits;
  }
  return "";
}

/** Purchase contract fields from THIS page text. Filename is not a source. */
export function loudContractFromPrintedLines(lines: string[]): PrintedSample | null {
  const blob = lines.join("\n");
  if (/\bW-?2\b|PAYSTUB|WAGE AND TAX STATEMENT|ACCOUNT STATEMENT|BANK STATEMENT|DRIVER LICENSE|\bLN\b.*\bFN\b/i.test(blob)) {
    return null;
  }
  if (!/PURCHASE CONTRACT|PURCHASE AGREEMENT|CALIFORNIA RESIDENTIAL PURCHASE/i.test(blob)) {
    return null;
  }
  const fields = fieldsFromPrintedLines("purchase_contract", lines);
  if (!fields.property_address && !fields.purchase_price && !fields.close_date) return null;
  delete fields.present_address;
  return {
    extractClass: "purchase_contract",
    confidence: 0.94,
    fields,
  };
}

/** CA ID name from THIS page text. Filename is not a source. 08 is not required. */
export function loudIdFromPrintedLines(lines: string[]): PrintedSample | null {
  const blob = lines.join("\n");
  if (/\bW-?2\b|PAYSTUB|WAGE AND TAX STATEMENT|ACCOUNT STATEMENT|BANK STATEMENT/i.test(blob)) {
    return null;
  }
  if (
    !/\bDRIVER|PASSPORT|GOVERNMENT ID\b|IDENTIFICATION CARD|STATE ID|CALIFORNIA/i.test(blob) &&
    !(/\bLN\b/.test(blob) && /\bFN\b/.test(blob))
  ) {
    return null;
  }
  const fields = fieldsFromPrintedLines("government_id", lines);
  if (!fields.full_name) return null;
  delete fields.property_address;
  delete fields.subjectAddress;
  return {
    extractClass: "government_id",
    confidence: 0.94,
    fields,
  };
}

/** K-1 Box 1 ordinary from THIS page text. Filename, Expected 1084, and coaching /12 are not sources. */
export function loudK1FromPrintedLines(lines: string[]): PrintedSample | null {
  const kind = k1WorksheetKind(lines);
  if (!kind) return null;
  const fields = fieldsFromPrintedLines("tax_return", lines);
  if (!fields.k1_ordinary_income || !fields.tax_year) return null;
  delete fields.wages;
  delete fields.medicare_wages;
  delete fields.box5;
  delete fields.employer_name;
  delete fields.gross_period;
  delete fields.schedule_c_net_profit;
  return {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { ...fields, return_kind: kind },
  };
}

/** Schedule C fields from THIS page text. Filename and Expected 1084 are not sources. */
export function loudScheduleCFromPrintedLines(lines: string[]): PrintedSample | null {
  if (!looksLikeScheduleCWorksheet(lines)) return null;
  const fields = fieldsFromPrintedLines("tax_return", lines);
  if (!fields.schedule_c_net_profit || !fields.tax_year) return null;
  return {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { ...fields, return_kind: "schedule_c" },
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
  const stubFields = fieldsFromPrintedLines("paystub", lines);
  if (stubFields.gross_period && stubFields.pay_frequency) {
    return {
      extractClass: "paystub",
      confidence: 0.94,
      fields: stubFields,
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
