/**
 * Reader map only. Does not write the File and does not stamp Docs.
 * One Grok look returns this shape. Writer runs after Use this on a returned line.
 */
import { junkEmployerName } from "@/lib/docs/junkEmployer";
import { classifyPageByFormHeader, type TaxFormClass } from "@/lib/docs/formHeader";

export type ReaderForm =
  | "1040"
  | "8879"
  | "540"
  | "7203"
  | "k1"
  | "1120s"
  | "1065"
  | "schedule_e"
  | "schedule_c"
  | "w2"
  | "paystub"
  | "other";

export type ReaderLine = {
  kind: string;
  value: string;
  label?: string;
};

export type ReaderMap = {
  forms: ReaderForm[];
  names: string[];
  entities: string[];
  lines: ReaderLine[];
  missing: string[];
};

export const NEVER_STUB_FORMS: readonly ReaderForm[] = ["1040", "8879", "540", "7203", "k1"];

const HEADER_TO_FORM: Partial<Record<TaxFormClass, ReaderForm>> = {
  form_1040: "1040",
  form_8879: "8879",
  form_540: "540",
  form_7203: "7203",
  k1: "k1",
  form_1120s: "1120s",
  form_1065: "1065",
  schedule_e: "schedule_e",
  schedule_c: "schedule_c",
  w2: "w2",
};

function trimField(fields: Record<string, string | null | undefined> | null | undefined, key: string) {
  return String(fields?.[key] ?? "").trim();
}

/** Paystub extract opens only when employer, pay period or check date, and period gross are on the same page. */
export function paystubExtractOpens(
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  const employer = trimField(fields, "employer_name");
  if (!employer || junkEmployerName(employer)) return false;
  const date = trimField(fields, "pay_period_end") || trimField(fields, "check_date");
  const gross = trimField(fields, "gross_period");
  return Boolean(date && gross);
}

/** Triple lock, or leftover printed stubs that print frequency instead of a date. */
export function paystubFieldsLock(
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  if (paystubExtractOpens(fields)) return true;
  const employer = trimField(fields, "employer_name");
  if (!employer || junkEmployerName(employer)) return false;
  const gross = trimField(fields, "gross_period");
  const frequency = trimField(fields, "pay_frequency");
  return Boolean(gross && frequency);
}

export function readerMapNeverOpensStub(map: ReaderMap): boolean {
  return map.forms.some((form) => (NEVER_STUB_FORMS as readonly string[]).includes(form));
}

export function extractClassFromReaderMap(map: ReaderMap): "tax_return" | "paystub" | "w2" | "other" {
  if (readerMapNeverOpensStub(map) || map.forms.includes("1120s") || map.forms.includes("1065")) {
    return "tax_return";
  }
  if (map.forms.includes("w2")) return "w2";
  if (map.forms.includes("paystub") && map.lines.some((line) => line.kind === "period_gross")) {
    return "paystub";
  }
  if (map.forms.some((form) => form !== "other" && form !== "paystub")) return "tax_return";
  return "other";
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of values) {
    const value = raw.replace(/\s+/g, " ").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(value);
  }
  return next;
}

function formFromBlob(blob: string): ReaderForm[] {
  const forms: ReaderForm[] = [];
  const header = classifyPageByFormHeader(blob);
  const mapped = HEADER_TO_FORM[header];
  if (mapped) forms.push(mapped);
  if (/\bform\s*540\b/i.test(blob) || /california resident income tax return/i.test(blob)) {
    forms.push("540");
  }
  if (/\bform\s*7203\b/i.test(blob) || /shareholder stock and debt basis/i.test(blob)) {
    forms.push("7203");
  }
  if (/\bform\s*8879(?:-\s*(?:s|c|corp))?\b/i.test(blob) || /\b8879-corp\b/i.test(blob)) {
    forms.push("8879");
  }
  if (/\bschedule\s+k-?1\b/i.test(blob) && !/\bschedule\s+e\s*\(\s*form\s+1040\s*\)/i.test(blob)) {
    forms.push("k1");
  }
  if (/\bschedule\s+c\b/i.test(blob)) forms.push("schedule_c");
  if (/\bschedule\s+e\b/i.test(blob) || /supplemental income and loss/i.test(blob)) {
    forms.push("schedule_e");
  }
  if (/\bform\s*1040\b/i.test(blob) || /u\.?s\.?\s+individual income tax return/i.test(blob)) {
    forms.push("1040");
  }
  return unique(forms) as ReaderForm[];
}

function looksLikePersonName(line: string) {
  const t = line.replace(/\s+/g, " ").trim();
  if (!t || t.length > 48) return false;
  if (/\$|\d{3,}|form|schedule|return|california wages|shareholder|corporation|inc\.?$|llc|basis|authorization/i.test(t)) {
    return false;
  }
  if (junkEmployerName(t)) return false;
  return /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(t);
}

function looksLikeEntity(line: string) {
  const t = line.replace(/\s+/g, " ").trim();
  if (!t || junkEmployerName(t)) return false;
  if (/form|schedule|wages|authorization|basis limitations/i.test(t)) return false;
  return /\b(?:INC\.?|LLC|L\.L\.C\.|CORP\.?|LLP)\b/i.test(t) && t.length <= 60;
}

function entityFromLine(line: string) {
  const labeled = line.match(/\b((?:[A-Z0-9][A-Z0-9 .&'-]{1,50}?)(?:INC\.?|LLC|L\.L\.C\.|CORP\.?))\b/i);
  const name = (labeled?.[1] ?? line)
    .replace(/\s+/g, " ")
    .replace(/^(?:shareholder|partner|name of (?:the )?(?:corporation|partnership|company)|entity)\s+/i, "")
    .trim()
    .replace(/\.$/, "");
  if (!name || junkEmployerName(name)) return "";
  return name;
}

function wageLineLabel(line: string) {
  const stripped = line
    .replace(/\$?\s*\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{4,}(?:\.\d+)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || "wages";
}

export function readerEntityName(map?: ReaderMap | null) {
  const named = String(map?.entities?.[0] ?? "").trim();
  if (!named || junkEmployerName(named)) return "";
  return named;
}

/** Form 1040 1g / household-employee instruction is not a wage to offer. A K-1 line is not a wage. */
export function isUnofferedWageText(text?: string | null) {
  const t = String(text ?? "");
  if (/\b1\s*g\b/i.test(t)) return true;
  if (/household employee/i.test(t)) return true;
  if (/if you did not/i.test(t)) return true;
  if (/not reported on form/i.test(t)) return true;
  if (/wages from form/i.test(t) && /line\s*6/i.test(t)) return true;
  if (/\b(k-?1|schedule\s*[ce]|ordinary|passive|partnership|s\s*corp|1120-?s)\b/i.test(t)) {
    return true;
  }
  return false;
}

export function wageLineIsOffered(line: ReaderLine) {
  if (line.kind !== "wages" && line.kind !== "household_wages") return false;
  return !isUnofferedWageText(`${line.label ?? ""} ${line.kind}`);
}

function cleanWageLabel(label?: string) {
  const t = String(label ?? "").replace(/\s+/g, " ").trim();
  if (!t || t.length > 40 || isUnofferedWageText(t) || /…|\.{3}/.test(t)) return "wages";
  return t;
}

export function readerWageLine(map?: ReaderMap | null): ReaderLine | null {
  for (const line of map?.lines ?? []) {
    if (!wageLineIsOffered(line)) continue;
    const amount = String(line.value ?? "").replace(/[^\d.]/g, "");
    if (!amount || !Number(amount)) continue;
    return { ...line, value: amount, label: cleanWageLabel(line.label) };
  }
  return null;
}

export function readerBusinessLines(map?: ReaderMap | null): ReaderLine[] {
  return (map?.lines ?? []).filter((line) =>
    line.kind === "schedule_c" || line.kind === "schedule_e" || line.kind === "k1" || line.kind === "1120s",
  );
}

export function readerBusinessSpeech(line: ReaderLine) {
  const amount = String(line.value ?? "").replace(/[^\d.]/g, "");
  const money = Number(amount) > 0 ? `$${Number(amount).toLocaleString("en-US")}` : "";
  if (line.kind === "schedule_c") {
    const who = String(line.value ?? "").trim();
    return who ? `Schedule C under ${who}` : "Schedule C";
  }
  if (line.kind === "schedule_e") {
    const named = String(line.label ?? "").trim();
    return ["Schedule E", named, money].filter(Boolean).join(" · ");
  }
  if (line.kind === "k1" || line.kind === "1120s") {
    const named = String(line.label ?? "").trim();
    return [named, money].filter(Boolean).join(" · ");
  }
  return "";
}

/** Never-stub page with a printed entity, business line, or on-page wage. Names alone are not a card. */
export function readerMapOpensReturnCard(map?: ReaderMap | null): boolean {
  if (!map || !readerMapNeverOpensStub(map)) return false;
  return Boolean(readerEntityName(map) || readerWageLine(map) || readerBusinessLines(map).length);
}

function moneyOnLine(line: string) {
  const match = line.match(/\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{4,}(?:\.\d+)?)/);
  return match?.[1]?.replace(/,/g, "") ?? "";
}

function businessesFromPrinted(cleaned: string[], names: string[]): ReaderLine[] {
  const out: ReaderLine[] = [];
  let afterC = false;
  let afterE = false;
  let afterK1 = false;
  let pendingE = "";
  let pendingK1 = "";
  let eRole = "";
  let k1Role = "";
  let k1Ein = "";
  for (const line of cleaned) {
    if (/\bschedule\s+c\b/i.test(line)) afterC = true;
    if (/\bschedule\s+e\b/i.test(line) || /supplemental income/i.test(line)) afterE = true;
    if (/\bschedule\s+k-?1\b/i.test(line) || /\b1120-?s\b/i.test(line)) afterK1 = true;
    if (/\bpartnership\b/i.test(line)) eRole = eRole || "partnership";
    if (/\bpassive\b/i.test(line)) {
      eRole = eRole.includes("passive") ? eRole : [eRole, "passive"].filter(Boolean).join(" · ");
    }
    if (/\bs\s*corp/i.test(line)) k1Role = k1Role || "S corp";
    const ein = line.match(/\b(\d{2}-?\d{7})\b/);
    if (ein && afterK1) k1Ein = ein[1] ?? "";

    if (afterC) {
      const who = looksLikePersonName(line)
        ? line.replace(/\s+/g, " ").trim()
        : names.find((name) => line.toLowerCase().includes(name.toLowerCase()));
      if (who && !/\bschedule\s+c\b/i.test(line)) {
        out.push({ kind: "schedule_c", value: who, label: "Schedule C" });
        afterC = false;
      }
    }

    const entity = looksLikeEntity(line) ? entityFromLine(line) : "";
    if (entity && afterE && !pendingE) pendingE = entity;
    if (entity && afterK1 && !pendingK1) pendingK1 = entity;

    const amount = moneyOnLine(line);
    if (
      amount &&
      afterE &&
      pendingE &&
      (eRole || /passive|partnership|schedule\s+e/i.test(line)) &&
      !/wages/i.test(line)
    ) {
      out.push({
        kind: "schedule_e",
        value: amount,
        label: [pendingE, eRole].filter(Boolean).join(" · "),
      });
    }
    if (amount && afterK1 && pendingK1 && !isUnofferedWageText(line) && !/wages/i.test(line)) {
      out.push({
        kind: "k1",
        value: amount,
        label: [pendingK1, k1Role || "S corp", k1Ein ? `EIN ${k1Ein}` : ""].filter(Boolean).join(" · "),
      });
    }
  }
  return out;
}

export function readerMapFromPrintedLines(lines: readonly string[]): ReaderMap {
  const cleaned = lines.map((line) => String(line ?? "").replace(/\u00a0/g, " ").trim()).filter(Boolean);
  const blob = cleaned.join("\n");
  const forms = formFromBlob(blob);
  const names = unique(cleaned.filter(looksLikePersonName));
  const entities = unique(cleaned.flatMap((line) => (looksLikeEntity(line) ? [entityFromLine(line)] : [])));
  const linesOut: ReaderLine[] = [];
  for (const line of cleaned) {
    if (!/wages/i.test(line) || isUnofferedWageText(line)) continue;
    const amount = moneyOnLine(line);
    if (amount) linesOut.push({ kind: "wages", value: amount, label: wageLineLabel(line) });
  }
  linesOut.push(...businessesFromPrinted(cleaned, names));
  for (const name of names) linesOut.push({ kind: "name", value: name });
  for (const entity of entities) linesOut.push({ kind: "entity", value: entity });

  const missing: string[] = [];
  const hasStub = forms.includes("paystub") && !forms.some((form) => (NEVER_STUB_FORMS as readonly string[]).includes(form));
  if (!hasStub) {
    missing.push("employer", "pay_period", "period_gross");
  }
  return {
    forms: forms.length ? forms : ["other"],
    names,
    entities,
    lines: linesOut,
    missing,
  };
}

export function readerMapFromLook(
  parsed: Record<string, unknown>,
  printed?: readonly string[] | null,
): ReaderMap {
  const fromPrinted = printed?.length ? readerMapFromPrintedLines(printed) : null;
  const forms = unique([
    ...(Array.isArray(parsed.forms) ? parsed.forms.map((item) => String(item)) : []),
    ...(fromPrinted?.forms ?? []),
  ]).filter((item): item is ReaderForm =>
    [
      "1040",
      "8879",
      "540",
      "7203",
      "k1",
      "1120s",
      "1065",
      "schedule_e",
      "schedule_c",
      "w2",
      "paystub",
      "other",
    ].includes(item),
  );
  const parsedNames = (Array.isArray(parsed.names) ? parsed.names.map((item) => String(item)) : []).filter(
    (name) => !junkEmployerName(name),
  );
  const names = unique(
    fromPrinted?.names.length ? fromPrinted.names : parsedNames,
  ).filter((name) => !junkEmployerName(name));
  const parsedEntities = (Array.isArray(parsed.entities) ? parsed.entities.map((item) => String(item)) : []).filter(
    (name) => !junkEmployerName(name),
  );
  const entities = unique([...(fromPrinted?.entities ?? []), ...parsedEntities]).filter(
    (name) => !junkEmployerName(name),
  );
  const parsedLines = Array.isArray(parsed.lines)
    ? parsed.lines.flatMap((raw) => {
        if (!raw || typeof raw !== "object") return [];
        const row = raw as Record<string, unknown>;
        const kind = String(row.kind ?? "").trim();
        const value = String(row.value ?? "").trim();
        if (!kind || !value) return [];
        if ((kind === "employer" || kind === "employer_name") && junkEmployerName(value)) return [];
        const label = String(row.label ?? "").trim();
        const line = { kind, value, ...(label ? { label } : {}) };
        if ((kind === "wages" || kind === "household_wages") && !wageLineIsOffered(line)) return [];
        return [line];
      })
    : [];
  const lines = [...(fromPrinted?.lines ?? []), ...parsedLines].filter(
    (line, index, all) =>
      all.findIndex((other) => other.kind === line.kind && other.value === line.value) === index,
  );
  const missing = unique([
    ...(Array.isArray(parsed.missing) ? parsed.missing.map((item) => String(item)) : []),
    ...(fromPrinted?.missing ?? []),
  ]);
  return {
    forms: forms.length ? forms : fromPrinted?.forms ?? ["other"],
    names,
    entities,
    lines,
    missing,
  };
}

const STUB_LOCK_KEYS = [
  "employer_name",
  "pay_period_end",
  "check_date",
  "gross_period",
  "pay_frequency",
  "ytd_gross",
] as const;

export function fieldsOnReaderMap(
  fields: Record<string, string>,
  map: ReaderMap,
): Record<string, string> {
  if (!map.lines.length && !map.names.length && !map.entities.length) return fields;
  const stubLock: Record<string, string> = {};
  for (const key of STUB_LOCK_KEYS) {
    const value = String(fields[key] ?? "").trim();
    if (!value) continue;
    if (key === "employer_name" && junkEmployerName(value)) continue;
    stubLock[key] = value;
  }
  const allowed = new Set<string>();
  for (const line of map.lines) {
    if (line.kind === "wages" || line.kind === "household_wages") allowed.add("wages");
    if (line.kind === "employer" || line.kind === "employer_name") allowed.add("employer_name");
    if (line.kind === "pay_period" || line.kind === "check_date" || line.kind === "pay_period_end") {
      allowed.add("pay_period_end");
      allowed.add("check_date");
    }
    if (line.kind === "period_gross" || line.kind === "gross_period") allowed.add("gross_period");
    if (line.kind === "name" || line.kind === "full_name") allowed.add("full_name");
    if (line.kind === "entity") {
      allowed.add("entity_name");
      allowed.add("business_name");
    }
    if (line.kind === "tax_year") allowed.add("tax_year");
    allowed.add(line.kind);
  }
  if (map.names.length) allowed.add("full_name");
  if (map.entities.length) {
    allowed.add("entity_name");
    allowed.add("business_name");
  }
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    if (key === "employer_name" && junkEmployerName(value)) continue;
    if (allowed.has(key) || key === "return_kind" || key === "tax_year") next[key] = value;
  }
  Object.assign(next, stubLock);
  if (map.names.length) next.full_name = map.names.join(" and ");
  if (map.entities.length && !next.entity_name) next.entity_name = map.entities[0] ?? "";
  const wage = readerWageLine(map);
  if (wage && !paystubFieldsLock(next)) next.wages = wage.value;
  return next;
}

export function printedLooksLikeNeverStubForm(lines?: readonly string[] | null): boolean {
  if (!lines?.length) return false;
  return readerMapNeverOpensStub(readerMapFromPrintedLines(lines));
}
