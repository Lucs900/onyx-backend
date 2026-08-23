/**
 * Printed ONYX mortgage-sample fields. Reads labeled fixture text only —
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

export function printedSampleFromFilename(name?: string | null): PrintedSample | null {
  const key = basename(name);
  return key ? BY_NAME[key] ?? null : null;
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
  _bytes: Uint8Array,
  filename?: string | null,
): PrintedSample | null {
  return printedSampleFromFilename(filename);
}
