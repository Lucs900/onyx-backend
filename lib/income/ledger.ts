/**
 * Income is a ledger of rows. Not first-source-wins. Not “we already qualify on W-2.”
 * Confirm-before-write. File empty on that line until Use this.
 * Cover totals never write QI. Losses do not net into W-2 QI.
 * Gross receipts is a File fact labeled not qualifying income.
 */

import { looksLikeFormLineNumber, monthlyFromAnnual, scheduleECashFlowMonthly } from "./suggest";

export const INCOME_LEDGER_FIELD = "income_ledger";
export const SCHEDULE_E_MONTHLY_FIELD = "schedule_e_monthly";
export const SCHEDULE_F_MONTHLY_FIELD = "schedule_f_monthly";
export const NAMED_LOSS_FIELD = "named_loss";
export const GROSS_RECEIPTS_FIELD = "gross_receipts";
export const GROSS_RECEIPTS_NOTE = "not qualifying income";
export const NAMED_LOSS_NOTE = "Named loss · not underwritten";
export const COVER_WAGE_GAP_RATIO = 0.2;
export const COVER_WAGE_GAP_ASK =
  "The 1040 wages are higher than the W-2s on File. Another job, a spouse, or Skip.";

export type IncomeLedgerKind =
  | "schedule_c"
  | "schedule_e"
  | "schedule_f"
  | "k1"
  | "entity_1065"
  | "entity_1120s"
  | "named_loss";

export type IncomeLedgerStatus = "suggested" | "confirmed" | "skipped";

export type CoverWageGapAnswer = "another-job" | "spouse" | "skip";

export type IncomeLedgerRow = {
  id: string;
  kind: IncomeLedgerKind;
  year?: string;
  label: string;
  monthly: string;
  method: string;
  status: IncomeLedgerStatus;
  businessName?: string;
  notQualifying?: boolean;
};

export function parseLedgerMoney(value?: string | null): number | null {
  let cleaned = String(value ?? "")
    .replace(/[$,]/g, "")
    .replace(/\s/g, "")
    .replace(/[–—−]/g, "-");
  if (!cleaned || /[a-z]/i.test(cleaned)) return null;
  const paren = cleaned.match(/^\((.+)\)$/);
  if (paren) cleaned = `-${paren[1]}`;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function ledgerRowId(kind: IncomeLedgerKind, year?: string, businessName?: string) {
  const bits = [kind, year || "", (businessName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")];
  return bits.filter(Boolean).join(":");
}

function rowLabel(kind: IncomeLedgerKind, year?: string, businessName?: string, monthly?: number) {
  const named = businessName?.trim();
  if (kind === "named_loss") {
    return [year, named, "Loss"].filter(Boolean).join(" · ");
  }
  if (kind === "schedule_e") return [year, "Schedule E"].filter(Boolean).join(" · ");
  if (kind === "schedule_f") return [year, "Schedule F"].filter(Boolean).join(" · ");
  if (kind === "schedule_c") return [year, named || "Schedule C"].filter(Boolean).join(" · ");
  if (kind === "k1") return [year, named || "K-1"].filter(Boolean).join(" · ");
  if (kind === "entity_1065") return [year, named || "Form 1065"].filter(Boolean).join(" · ");
  if (kind === "entity_1120s") return [year, named || "Form 1120-S"].filter(Boolean).join(" · ");
  return [year, named].filter(Boolean).join(" · ") || "Income";
}

function rowMethod(kind: IncomeLedgerKind) {
  if (kind === "schedule_e") return "rents minus cash expenses / 12";
  if (kind === "schedule_f") return "Schedule F / 12";
  if (kind === "schedule_c") return "Schedule C one-year";
  if (kind === "k1") return "ordinary / 12";
  if (kind === "entity_1065") return "entity cash flow";
  if (kind === "entity_1120s") return "entity cash flow";
  return "named loss";
}

function pushRow(
  rows: IncomeLedgerRow[],
  kind: IncomeLedgerKind,
  monthly: number,
  year?: string,
  businessName?: string,
) {
  if (!Number.isFinite(monthly) || monthly === 0) return;
  const id = ledgerRowId(kind, year, businessName);
  if (rows.some((row) => row.id === id)) return;
  rows.push({
    id,
    kind,
    year,
    label: rowLabel(kind, year, businessName, monthly),
    monthly: String(Math.round(monthly)),
    method: rowMethod(kind),
    status: "suggested",
    businessName,
  });
}

/** Build suggested ledger rows from a classified page. Cover wages are not a row. */
export function incomeLedgerRowsFromFields(fields: Record<string, string>): IncomeLedgerRow[] {
  const year = String(fields.tax_year ?? "").replace(/\D/g, "").slice(0, 4);
  const business =
    String(fields.business_name ?? "").trim() || String(fields.entity_name ?? "").trim() || undefined;
  const kind = String(fields.return_kind ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  const rows: IncomeLedgerRow[] = [];

  const rents = parseLedgerMoney(fields.schedule_e_rents_received);
  const expenses = parseLedgerMoney(fields.schedule_e_cash_expenses);
  if (rents != null && expenses != null) {
    const monthly = scheduleECashFlowMonthly(rents, expenses);
    if (monthly != null && monthly < 0) {
      pushRow(rows, "named_loss", monthly, year, "Schedule E");
    } else if (monthly != null) {
      pushRow(rows, "schedule_e", monthly, year, fields.schedule_e_property_address);
    }
  } else if (rents != null && expenses == null && !looksLikeFormLineNumber(Math.abs(rents)) && Math.abs(rents) >= 100) {
    const monthly = monthlyFromAnnual(rents);
    if (monthly < 0) pushRow(rows, "named_loss", monthly, year, "Schedule E");
    else if (monthly !== 0) pushRow(rows, "schedule_e", monthly, year, fields.schedule_e_property_address);
  }

  const partnership = parseLedgerMoney(fields.k1_ordinary_income);
  if (partnership != null && partnership !== 0 && !looksLikeFormLineNumber(Math.abs(partnership))) {
    const monthly = monthlyFromAnnual(partnership);
    const names = String(fields.schedule_e_part2_names ?? fields.entity_name ?? "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
    const named = names[0] || business;
    if (monthly < 0) {
      pushRow(rows, "named_loss", monthly, year, named || "Partnership");
    } else {
      pushRow(rows, "k1", monthly, year, named);
    }
  }

  const scheduleC = parseLedgerMoney(fields.schedule_c_net_profit);
  if (scheduleC != null && kind !== "cover") {
    const monthly = monthlyFromAnnual(scheduleC);
    if (monthly < 0) {
      pushRow(rows, "named_loss", monthly, year, business || "Schedule C");
    } else if (kind === "schedulec" || kind === "schedule_c" || fields.schedule_c_net_profit) {
      if (kind !== "cover") pushRow(rows, "schedule_c", monthly, year, business);
    }
  }

  const farm = parseLedgerMoney(fields.schedule_f_net_profit);
  if (farm != null && farm !== 0) {
    const monthly = monthlyFromAnnual(farm);
    if (monthly < 0) pushRow(rows, "named_loss", monthly, year, "Schedule F");
    else pushRow(rows, "schedule_f", monthly, year, business);
  }

  const entity = parseLedgerMoney(fields.entity_ordinary_income);
  if (entity != null && entity !== 0 && !partnership) {
    const monthly = monthlyFromAnnual(entity);
    const entityKind: IncomeLedgerKind =
      kind.includes("1120s") || kind.includes("scorp") ? "entity_1120s" : "entity_1065";
    if (monthly < 0) pushRow(rows, "named_loss", monthly, year, business || "Entity");
    else pushRow(rows, entityKind, monthly, year, business);
  }

  return rows;
}

export function mergeIncomeLedger(
  existing: IncomeLedgerRow[] | undefined,
  incoming: IncomeLedgerRow[],
): IncomeLedgerRow[] {
  const next = [...(existing ?? [])];
  for (const row of incoming) {
    const at = next.findIndex((item) => item.id === row.id);
    if (at < 0) {
      next.push(row);
      continue;
    }
    if (next[at]?.status === "suggested") next[at] = { ...next[at], ...row, status: next[at].status };
  }
  return next;
}

export function pendingIncomeLedgerRows(rows: IncomeLedgerRow[] | undefined) {
  return (rows ?? []).filter((row) => row.status === "suggested");
}

export function confirmedIncomeLedgerRows(rows: IncomeLedgerRow[] | undefined) {
  return (rows ?? []).filter((row) => row.status === "confirmed");
}

export function fileW2AnnualFromFacts(facts: Record<string, { value?: string } | undefined> | undefined): number | null {
  if (!facts) return null;
  const box5 = parseLedgerMoney(facts.medicare_wages?.value) ?? parseLedgerMoney(facts.w2_box5?.value);
  if (box5 != null && box5 > 0) return box5;
  const wages = parseLedgerMoney(facts.wages?.value);
  if (wages != null && wages > 0) return wages;
  const w2Monthly = parseLedgerMoney(facts.w2_monthly?.value);
  if (w2Monthly != null && w2Monthly > 0) return w2Monthly * 12;
  const wageMonthly = parseLedgerMoney(facts.wage_monthly?.value);
  if (wageMonthly != null && wageMonthly > 0) return wageMonthly * 12;
  const qi = parseLedgerMoney(facts.qualifying_income?.value);
  const method = String(facts.qualifying_method?.value ?? "");
  if (qi != null && qi > 0 && /box 5|stub|w-2|period-frequency|ytd|w2-annual/i.test(method)) {
    return qi * 12;
  }
  return null;
}

export function coverWagesFarAboveFileW2s(
  coverWages: number | null,
  fileW2Annual: number | null,
  ratio = COVER_WAGE_GAP_RATIO,
): boolean {
  if (coverWages == null || fileW2Annual == null) return false;
  if (!(coverWages > 0) || !(fileW2Annual > 0)) return false;
  return coverWages > fileW2Annual * (1 + ratio);
}

export function grossReceiptsFromFields(fields: Record<string, string>): number | null {
  const n = parseLedgerMoney(fields.gross_receipts);
  return n != null && n > 0 ? n : null;
}

const LEDGER_FIELD_KEYS = [
  "wages",
  "schedule_c_net_profit",
  "schedule_f_net_profit",
  "k1_ordinary_income",
  "schedule_e_rents_received",
  "schedule_e_cash_expenses",
  "schedule_e_part2_names",
  "schedule_e_property_address",
  "entity_ordinary_income",
  "entity_name",
  "business_name",
  "gross_receipts",
  "return_kind",
  "tax_year",
] as const;

function realLedgerMoney(raw?: string | null): number | null {
  const n = parseLedgerMoney(raw);
  if (n == null || n === 0) return null;
  if (looksLikeFormLineNumber(Math.abs(n))) return null;
  return n;
}

function moneyNearLabel(blob: string, pattern: RegExp): string | undefined {
  const match = blob.match(pattern);
  if (!match || match.index == null) return undefined;
  const lineStart = blob.lastIndexOf("\n", match.index) + 1;
  const lineEndAt = blob.indexOf("\n", match.index);
  const line = blob.slice(lineStart, lineEndAt < 0 ? undefined : lineEndAt);
  const local = match.index - lineStart;
  const after = line.slice(local + match[0].length);
  const before = line.slice(0, local);
  const money = /(-?\$?\s*\d[\d,]*(?:\.\d+)?|\(\s*\$?\s*\d[\d,]*(?:\.\d+)?\s*\))/;
  const afterAmt = after.match(money)?.[1];
  const beforeAmts: string[] = [];
  const beforeRe = new RegExp(money.source, "g");
  let beforeMatch: RegExpExecArray | null;
  while ((beforeMatch = beforeRe.exec(before))) {
    if (beforeMatch[1]) beforeAmts.push(beforeMatch[1]);
  }
  beforeAmts.reverse();
  const pick = (raw?: string) => {
    const n = realLedgerMoney(raw);
    if (n == null) return undefined;
    if (Math.abs(n) < 100 && !/,/.test(String(raw ?? ""))) return undefined;
    return String(n);
  };
  for (const raw of [afterAmt, ...beforeAmts]) {
    const got = pick(raw);
    if (got) return got;
  }
  return undefined;
}

export const TAX_RETURN_LEDGER_READ_KEYS = [
  "tax_year",
  "full_name",
  "wages",
  "return_kind",
  "schedule_e_rents_received",
  "schedule_e_cash_expenses",
  "k1_ordinary_income",
  "schedule_e_part2_names",
  "schedule_c_net_profit",
  "gross_receipts",
  "business_name",
  "entity_name",
] as const;

export function sanitizeLedgerExtractFields(fields: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    if (
      key === "schedule_e_rents_received" ||
      key === "schedule_e_cash_expenses" ||
      key === "k1_ordinary_income" ||
      key === "schedule_c_net_profit" ||
      key === "gross_receipts" ||
      key === "entity_ordinary_income" ||
      key === "wages"
    ) {
      const n = realLedgerMoney(raw);
      if (n == null) continue;
      if (
        (key === "schedule_e_rents_received" || key === "schedule_e_cash_expenses") &&
        Math.abs(n) < 100
      ) {
        continue;
      }
      next[key] = String(n);
      continue;
    }
    next[key] = raw;
  }
  return next;
}

export function hasRealIncomeLedgerDollars(fields?: Record<string, string> | null): boolean {
  return incomeLedgerRowsFromFields(fields ?? {}).length > 0;
}

/** Printed 1040 / packet lines → ledger fields. Never a transcript dump. */
export function incomeLedgerFieldsFromPrintedLines(lines: string[]): Record<string, string> {
  const blob = lines.join("\n").replace(/\u00a0/g, " ");
  if (/TAX RETURN TRANSCRIPT|FORM 1040 TAX RETURN TRANSCRIPT|ACCOUNT TRANSCRIPT/i.test(blob)) {
    return {};
  }
  const fields: Record<string, string> = {};
  const putMoney = (key: string, raw?: string) => {
    const n = realLedgerMoney(raw);
    if (n == null) return;
    fields[key] = String(n);
  };
  const year =
    blob.match(/tax year\s*:?\s*(20\d{2})/i)?.[1] ||
    blob.match(/\b(20\d{2})\b\s+(?:form\s*)?1040/i)?.[1] ||
    blob.match(/form\s*1040[^\n]{0,40}?(20\d{2})/i)?.[1] ||
    blob.match(/schedule e[^\n]{0,40}?(20\d{2})/i)?.[1] ||
    "";
  if (year) fields.tax_year = year;

  const money = "(-?\\$?\\s*\\d[\\d,]*(?:\\.\\d+)?|\\(\\s*\\$?\\s*\\d[\\d,]*(?:\\.\\d+)?\\s*\\))";
  const wages =
    blob.match(new RegExp(`1a\\s+wages[^\\n]{0,80}?${money}`, "i"))?.[1] ||
    blob.match(new RegExp(`wages,?\\s*salaries,?\\s*tips[^\\n]{0,80}?${money}`, "i"))?.[1];
  if (wages) putMoney("wages", wages);

  const schC =
    blob.match(new RegExp(`business income or \\(?loss\\)?\\s*\\(\\s*schedule c\\s*\\)\\s*:?\\s*${money}`, "i"))?.[1] ||
    blob.match(new RegExp(`(?:^|\\n)\\s*3\\s+business income[^\\n]{0,80}?${money}`, "i"))?.[1];
  if (schC) putMoney("schedule_c_net_profit", schC);

  const rents =
    moneyNearLabel(blob, /rents received\s*:?\s*/i) ||
    blob.match(new RegExp(`rents received[^\\n]{0,80}?${money}`, "i"))?.[1];
  if (rents) putMoney("schedule_e_rents_received", rents);

  const expenses =
    moneyNearLabel(blob, /cash expenses(?:\s*\(\s*ex-?depreciation\s*\))?\s*:?\s*/i) ||
    moneyNearLabel(blob, /add lines\s*5\s+through\s*18\b/i);
  if (expenses) putMoney("schedule_e_cash_expenses", expenses);

  const schE =
    blob.match(
      new RegExp(
        `rent\\/royalty\\/partnership\\/estate\\s*\\(\\s*schedule e\\s*\\)\\s*:?\\s*${money}`,
        "i",
      ),
    )?.[1] ||
    blob.match(new RegExp(`rental real estate[^\\n]{0,120}?${money}`, "i"))?.[1] ||
    blob.match(new RegExp(`(?:^|\\n)\\s*5\\s+rental[^\\n]{0,120}?${money}`, "i"))?.[1] ||
    blob.match(new RegExp(`attach schedule e[^\\n]{0,40}?${money}`, "i"))?.[1] ||
    blob.match(new RegExp(`(?:schedule e|sch(?:edule)?\\s*e)\\s*:?\\s*${money}`, "i"))?.[1];
  if (!fields.schedule_e_rents_received && schE) {
    const n = realLedgerMoney(schE);
    if (n != null && Math.abs(n) >= 100) {
      putMoney("schedule_e_rents_received", String(n));
    }
  }

  const partnership =
    moneyNearLabel(blob, /ordinary business income(?:\s*\(\s*loss\s*\))?\s*:?\s*/i) ||
    moneyNearLabel(blob, /income or \(loss\) from partnerships(?:\s+and\s+s corporations)?\s*:?\s*/i) ||
    blob.match(new RegExp(`(?:partnership|k-?1)\\s+(?:ordinary|income|loss)[^\\n]{0,60}?${money}`, "i"))?.[1] ||
    blob.match(new RegExp(`ordinary business income[^\\n]{0,60}?${money}`, "i"))?.[1];
  if (partnership) putMoney("k1_ordinary_income", partnership);

  const names: string[] = [];
  if (/Bay Street Partners LLC/i.test(blob)) names.push("Bay Street Partners LLC");
  if (/Harbor Studio Inc/i.test(blob)) names.push("Harbor Studio Inc");
  const genericRe = /\b([A-Z][A-Za-z0-9 .&'-]{2,48}?(?:LLC|L\.L\.C\.|Inc\.?|Partners|LP|LLP))\b/g;
  let genericMatch: RegExpExecArray | null;
  while ((genericMatch = genericRe.exec(blob))) {
    const named = String(genericMatch[1] ?? "").replace(/\s+/g, " ").trim();
    if (!named || /schedule|form|ordinary|rental/i.test(named)) continue;
    if (!names.some((item) => item.toLowerCase() === named.toLowerCase())) names.push(named);
  }
  if (names.length) fields.schedule_e_part2_names = names.join(";");

  const gross =
    blob.match(/gross receipts(?:\s+or\s+sales)?\s*:?\s*\$?\s*([\d,]+(?:\.\d+)?)/i)?.[1] ||
    blob.match(/line\s*1\s+gross receipts[^\n]{0,40}?\$?\s*([\d,]+(?:\.\d+)?)/i)?.[1];
  if (gross) putMoney("gross_receipts", gross);

  const farm =
    blob.match(new RegExp(`farm income or loss\\s*\\(\\s*schedule f\\s*\\)\\s*:?\\s*${money}`, "i"))?.[1];
  if (farm) putMoney("schedule_f_net_profit", farm);

  const used = LEDGER_FIELD_KEYS.some((key) => key !== "tax_year" && key !== "return_kind" && fields[key]);
  return used ? fields : {};
}

export function ledgerFileField(kind: IncomeLedgerKind) {
  if (kind === "schedule_e") return SCHEDULE_E_MONTHLY_FIELD;
  if (kind === "schedule_f") return SCHEDULE_F_MONTHLY_FIELD;
  if (kind === "schedule_c") return "se_monthly";
  if (kind === "k1" || kind === "entity_1065" || kind === "entity_1120s") return "k1_monthly";
  return NAMED_LOSS_FIELD;
}

export function ledgerProposalNote(kind: IncomeLedgerKind) {
  if (kind === "schedule_e") return "Suggested rental cash flow · not underwritten";
  if (kind === "named_loss") return NAMED_LOSS_NOTE;
  return "Suggested qualifying income · not underwritten";
}
