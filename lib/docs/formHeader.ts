/**
 * Walk every tax-return page. Classify by the printed form header.
 * Extract only from the matching class. Form 8879 is not a Form 1040.
 * Missing a class on page 1 is not a missing class in the packet.
 */

export type TaxFormClass =
  | "form_8879"
  | "form_1040"
  | "form_1120s"
  | "form_1065"
  | "schedule_e"
  | "schedule_c"
  | "k1"
  | "w2"
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
  "k1_partner_name",
  "entity_name",
  "business_name",
  "schedule_e_part2_names",
  "ownership_percent",
]);
const FORM_1120S_KEYS = new Set([
  "tax_year",
  "entity_name",
  "business_name",
  "entity_ordinary_income",
  "officer_compensation",
  "ownership_percent",
  "return_kind",
]);
const FORM_1065_KEYS = new Set([
  "tax_year",
  "entity_name",
  "business_name",
  "entity_ordinary_income",
  "ownership_percent",
  "return_kind",
]);
const W2_KEYS = new Set(["tax_year", "employer_name", "medicare_wages", "box5", "wages"]);

function pageLooksLikePacketCover(text: string) {
  return /\b(bookmark|transmittal|table of contents|attached documents|see attached|index of forms)\b/i.test(
    text,
  );
}

/** Schedule E (Form 1040), including Part II. A mention of Schedule K-1 is not a K-1 form. */
export function looksLikeScheduleEHeader(text: string) {
  const t = String(text ?? "").replace(/\u00a0/g, " ");
  if (/\bSchedule\s+E\s*\(\s*Form\s+1040\s*\)/i.test(t)) return true;
  if (/\bSchedule\s+E\b/i.test(t) && /\bSupplemental\s+Income\b/i.test(t)) return true;
  if (
    /\bSchedule\s+E\b/i.test(t) &&
    /\bPart\s*II\b/i.test(t) &&
    /partnerships?\s+and\s+S\s+corporations/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Form 1065 / 1120-S K-1 face. Schedule E Part II caution text is not this. */
export function looksLikeK1FormHeader(text: string) {
  const t = String(text ?? "").replace(/\u00a0/g, " ");
  if (looksLikeScheduleEHeader(t)) return false;
  if (/\bSchedule\s+K-?1\s*\(\s*Form\s+(?:1065|1120-?S)\s*\)/i.test(t)) return true;
  if (
    /\bSchedule\s+K-?1\b/i.test(t) &&
    (/\bPartner'?s\s+Share\b/i.test(t) || /\bShareholder'?s\s+Share\b/i.test(t))
  ) {
    return true;
  }
  if (/\bForm\s+1065\b/i.test(t) && /\bPartner'?s\s+Share\b/i.test(t)) return true;
  return false;
}

/** Printed first. 8879 before any 1040 match — 8879 can mention Form 1040. */
export function classifyPageByFormHeader(text: string): TaxFormClass {
  const t = String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "other";

  if (
    /\bForm\s*8879(?:-\s*(?:S|C|CORP))?\b/i.test(t) ||
    /\b8879-CORP\b/i.test(t) ||
    /\bIRS\s+e-?file\s+Signature\s+Authorization\b/i.test(t) ||
    /\bE-?file\s+Authorization\s+for\s+Corporations\b/i.test(t)
  ) {
    return "form_8879";
  }

  if (
    /\bForm\s+1120-?S\b/i.test(t) &&
    (/\bU\.?S\.?\s+Income\s+Tax\s+Return\s+for\s+an\s+S\s+Corporation\b/i.test(t) ||
      /\bS\s+Corporation\s+Return\b/i.test(t) ||
      /\bOrdinary\s+business\s+income\b/i.test(t) ||
      /\bCompensation\s+of\s+officers\b/i.test(t) ||
      /\bName\s+of\s+corporation\b/i.test(t) ||
      /\bSchedule\s+K\b/i.test(t))
  ) {
    if (!looksLikeK1FormHeader(t)) return "form_1120s";
  }
  if (/\bU\.?S\.?\s+Income\s+Tax\s+Return\s+for\s+an\s+S\s+Corporation\b/i.test(t)) {
    return "form_1120s";
  }

  if (
    (/\bForm\s+W-?2\b/i.test(t) || /\bWage and Tax Statement\b/i.test(t)) &&
    !/\bForm\s+1040\b/i.test(t) &&
    !/\bU\.?S\.?\s+Individual\s+Income\s+Tax\s+Return\b/i.test(t)
  ) {
    return "w2";
  }

  if (looksLikeScheduleEHeader(t)) {
    return "schedule_e";
  }

  if (looksLikeK1FormHeader(t)) {
    return "k1";
  }

  if (
    /\bForm\s+1065\b/i.test(t) &&
    (/\bU\.?S\.?\s+Return\s+of\s+Partnership\s+Income\b/i.test(t) ||
      /\bPartnership\s+Return\b/i.test(t) ||
      /\bName\s+of\s+partnership\b/i.test(t) ||
      /\bOrdinary\s+business\s+income\b/i.test(t) ||
      /\bSchedule\s+K\b/i.test(t))
  ) {
    return "form_1065";
  }
  if (/\bU\.?S\.?\s+Return\s+of\s+Partnership\s+Income\b/i.test(t)) {
    return "form_1065";
  }

  if (/\bSchedule\s+C\b/i.test(t) && /\bProfit\s+or\s+Loss\b/i.test(t)) {
    return "schedule_c";
  }

  if (/\bSchedule\s+E\s*\(\s*Form\s+1040\s*\)/i.test(t) || (/\bSchedule\s+E\b/i.test(t) && /\bSupplemental\s+Income\b/i.test(t))) {
    return "schedule_e";
  }
  if (
    /\bSchedule\s+E\b/i.test(t) &&
    !/\bU\.?S\.?\s+Individual\s+Income\s+Tax\s+Return\b/i.test(t) &&
    !/\b1z\b/.test(t) &&
    !/\bForm\s+1065\b/i.test(t) &&
    !/\bForm\s+1120-?S\b/i.test(t)
  ) {
    return "schedule_e";
  }

  if (/\bForm\s+1040\b/i.test(t) && /\bU\.?S\.?\s+Individual\s+Income\s+Tax\s+Return\b/i.test(t)) {
    return "form_1040";
  }
  if (/\bForm\s+1040\b/i.test(t) && (/\b1z\b/.test(t) || /\bWages,\s*salaries,\s*tips\b/i.test(t))) {
    return "form_1040";
  }
  if (/\bForm\s+1040\b/i.test(t) && !/\bSchedule\s+[CEF]\b/i.test(t) && !/\bSchedule\s+K-?1\b/i.test(t)) {
    if (
      pageLooksLikePacketCover(t) &&
      !/\b1z\b/.test(t) &&
      !/\bU\.?S\.?\s+Individual\s+Income\s+Tax\s+Return\b/i.test(t)
    ) {
      return "other";
    }
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
              : klass === "form_1120s"
                ? FORM_1120S_KEYS
              : klass === "form_1065"
                ? FORM_1065_KEYS
                : klass === "w2"
                  ? W2_KEYS
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

/** Form 1120-S face / Schedule K. 8879-CORP / 8879-S and disclaimer pages are not the entity return. */
export function pickForm1120sPage(walked: readonly ClassifiedTaxPage[]): ClassifiedTaxPage | undefined {
  return walked.find((page) => page.klass === "form_1120s");
}

/** Form 1065 face / Schedule K. Schedule K-1 is not the partnership return. */
export function pickForm1065Page(walked: readonly ClassifiedTaxPage[]): ClassifiedTaxPage | undefined {
  return walked.find((page) => page.klass === "form_1065");
}

/** Year + both names: Form 1040 face first. 8879 is names/year fallback only. */
export function pickNameYearPage(walked: readonly ClassifiedTaxPage[]): ClassifiedTaxPage | undefined {
  return pickForm1040Page(walked) ?? walked.find((page) => page.klass === "form_8879");
}

/** W-2 pages inside the same packet. Same drop — not a second upload. */
export function pickW2Pages(walked: readonly ClassifiedTaxPage[]): ClassifiedTaxPage[] {
  return walked.filter((page) => page.klass === "w2");
}
