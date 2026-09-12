/**
 * Walk every tax-return page. Classify by the printed form header.
 * Extract only from the matching class. Form 8879 is not a Form 1040.
 * Missing a class on page 1 is not a missing class in the packet.
 */

export type TaxFormClass =
  | "form_8879"
  | "form_1040"
  | "schedule_e"
  | "schedule_c"
  | "k1"
  | "other";

export type ClassifiedTaxPage = {
  page: number;
  klass: TaxFormClass;
  text: string;
  lines: string[];
};

const FORM_1040_KEYS = new Set(["tax_year", "full_name", "wages"]);
const FORM_8879_KEYS = new Set(["tax_year", "full_name"]);
const SCHEDULE_E_KEYS = new Set([
  "tax_year",
  "schedule_e_rents_received",
  "schedule_e_cash_expenses",
  "schedule_e_part2_names",
  "schedule_e_property_address",
  "k1_ordinary_income",
]);
const SCHEDULE_C_KEYS = new Set([
  "tax_year",
  "schedule_c_net_profit",
  "business_name",
  "gross_receipts",
]);
const K1_KEYS = new Set([
  "tax_year",
  "k1_ordinary_income",
  "entity_name",
  "business_name",
  "schedule_e_part2_names",
]);

/** Printed first. 8879 before any 1040 match — 8879 can mention Form 1040. */
export function classifyPageByFormHeader(text: string): TaxFormClass {
  const t = String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "other";

  if (/\bForm\s*8879\b/i.test(t) || /\bIRS\s+e-?file\s+Signature\s+Authorization\b/i.test(t)) {
    return "form_8879";
  }

  if (/\bSchedule\s+K-?1\b/i.test(t) || (/\bForm\s+1065\b/i.test(t) && /\bPartner'?s\s+Share\b/i.test(t))) {
    return "k1";
  }

  if (/\bSchedule\s+C\b/i.test(t) && /\bProfit\s+or\s+Loss\b/i.test(t)) {
    return "schedule_c";
  }

  if (/\bSchedule\s+E\s*\(\s*Form\s+1040\s*\)/i.test(t) || (/\bSchedule\s+E\b/i.test(t) && /\bSupplemental\s+Income\b/i.test(t))) {
    return "schedule_e";
  }
  if (/\bSchedule\s+E\b/i.test(t) && !/\bU\.?S\.?\s+Individual\s+Income\s+Tax\s+Return\b/i.test(t) && !/\b1z\b/.test(t)) {
    return "schedule_e";
  }

  if (/\bForm\s+1040\b/i.test(t) && /\bU\.?S\.?\s+Individual\s+Income\s+Tax\s+Return\b/i.test(t)) {
    return "form_1040";
  }
  if (/\bForm\s+1040\b/i.test(t) && (/\b1z\b/.test(t) || /\bWages,\s*salaries,\s*tips\b/i.test(t))) {
    return "form_1040";
  }
  if (/\bForm\s+1040\b/i.test(t) && !/\bSchedule\s+[CEF]\b/i.test(t) && !/\bSchedule\s+K-?1\b/i.test(t)) {
    return "form_1040";
  }

  return "other";
}

export function fieldsAllowedForClass(
  klass: TaxFormClass,
  fields: Record<string, string>,
): Record<string, string> {
  const allow =
    klass === "form_1040"
      ? FORM_1040_KEYS
      : klass === "form_8879"
        ? FORM_8879_KEYS
        : klass === "schedule_e"
          ? SCHEDULE_E_KEYS
          : klass === "schedule_c"
            ? SCHEDULE_C_KEYS
            : klass === "k1"
              ? K1_KEYS
              : null;
  if (!allow) return {};
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const raw = String(value ?? "").trim();
    if (!raw || !allow.has(key)) continue;
    next[key] = raw;
  }
  return next;
}

export function pickForm1040Page(walked: readonly ClassifiedTaxPage[]): ClassifiedTaxPage | undefined {
  return walked.find((page) => page.klass === "form_1040");
}

/** Year + both names: Form 1040 face first. 8879 is names/year fallback only. */
export function pickNameYearPage(walked: readonly ClassifiedTaxPage[]): ClassifiedTaxPage | undefined {
  return pickForm1040Page(walked) ?? walked.find((page) => page.klass === "form_8879");
}
