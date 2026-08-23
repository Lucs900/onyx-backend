import {
  REJECT_LINE,
  LIMIT_LINE,
  MAX_DOC_COUNT,
  isAcceptedFile,
} from "@/lib/docs/accept";
import type {
  DocSlot,
  DraftField,
  ExtractClass,
  FactConflict,
  FoxAction,
  FoxIntakeDraft,
  ReceivedDoc,
} from "./types";
import {
  applyQualifyingIncomeFromExtract,
  decliningIncomeCaution,
  hasScheduleCCashflow,
  k1OrdinaryMissingDistributions,
  monthlyQualifyingFromExtract,
  normalizeReturnKind,
  parseExtractMoney,
  readTaxCashflows,
} from "./qualifyingIncome";

export { REJECT_LINE, LIMIT_LINE };

export const LOW_EXTRACT_CONFIDENCE = 0.55;

export const EXTRACT_SCHEMA_KEYS: Record<ExtractClass, readonly string[]> = {
  government_id: ["full_name", "date_of_birth", "id_last4", "state", "expiration"],
  paystub: ["employer_name", "pay_period_end", "gross_period", "ytd_gross", "net_period", "pay_frequency"],
  w2: ["tax_year", "employer_name", "wages", "federal_withheld"],
  tax_return: [
    "tax_year",
    "filing_status",
    "agi",
    "return_kind",
    "schedule_c_net_profit",
    "depreciation",
    "depletion",
    "business_use_of_home",
    "nonrecurring_other_income",
    "amortization",
    "casualty_loss",
    "mileage_depreciation",
    "k1_ordinary_income",
    "k1_distributions",
  ],
  bank_statement: ["institution", "period_end", "ending_balance"],
  purchase_contract: ["property_address", "purchase_price", "close_date"],
  mortgage_statement: ["servicer", "unpaid_principal", "current_pi", "property_address"],
  other: [],
};

const MONEY_KEYS = new Set([
  "gross_period",
  "ytd_gross",
  "net_period",
  "wages",
  "federal_withheld",
  "agi",
  "ending_balance",
  "purchase_price",
  "unpaid_principal",
  "current_pi",
  "income",
  "qualifying_income",
  "schedule_c_net_profit",
  "depreciation",
  "depletion",
  "business_use_of_home",
  "nonrecurring_other_income",
  "amortization",
  "casualty_loss",
  "mileage_depreciation",
  "k1_ordinary_income",
  "k1_distributions",
  "downPayment",
  "down_payment",
  "loanAmount",
  "loan_amount",
]);

const INCOME_MONEY_KEYS = new Set(["gross_period", "ytd_gross", "wages", "agi", "income", "net_period"]);
const YEARLY_TAX_KEYS = new Set([
  "tax_year",
  "filing_status",
  "agi",
  "return_kind",
  "schedule_c_net_profit",
  "depreciation",
  "depletion",
  "business_use_of_home",
  "nonrecurring_other_income",
  "amortization",
  "casualty_loss",
  "mileage_depreciation",
  "k1_ordinary_income",
  "k1_distributions",
]);

const DROP_FIELD_KEYS =
  /^(ssn|social|social_security|account|account_number|routing|routing_number|card|cin|dl_number|license_number|full_ssn|full_account)$/i;
const SSN_RE = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/;
const LONG_ACCOUNT_RE = /\b\d{8,17}\b/;
const DATE_KEYS = new Set([
  "date_of_birth",
  "expiration",
  "pay_period_end",
  "period_end",
  "close_date",
  "tax_year",
]);

export function slotForExtractClass(extractClass: ExtractClass): DocSlot {
  if (extractClass === "government_id") return "id";
  if (extractClass === "paystub") return "paystubs";
  if (extractClass === "w2") return "w2";
  if (extractClass === "bank_statement") return "bank";
  return "other";
}

export function slotFromFilename(name: string): DocSlot {
  const lower = name.toLowerCase();
  if (/w-?2/.test(lower)) return "w2";
  if (/pay.?stub|payslip/.test(lower)) return "paystubs";
  if (/tax|1099|k-?1|schedule.?c|profit|business|\bentity\b|\breturn\b/.test(lower)) return "other";
  if (/bank|statement/.test(lower)) return "bank";
  if (/\bid\b|license|passport|driver/.test(lower)) return "id";
  return "other";
}

export function extractClassFromSlot(slot: DocSlot): ExtractClass | null {
  if (slot === "paystubs") return "paystub";
  if (slot === "w2") return "w2";
  if (slot === "id") return "government_id";
  if (slot === "bank") return "bank_statement";
  return null;
}

export function extractClassFromFilename(name: string): ExtractClass | null {
  return extractClassFromSlot(slotFromFilename(name));
}

/** return-2024.png / entity-ordinary-2024.png / tax / 1099 / K-1 / Schedule C. Does not need "schedule-c" in the name. */
const TAX_RETURN_FILENAME = /\breturn\b|\bentity\b|tax|1099|k-?1|schedule.?c/;

export function taxReturnFilename(name: string) {
  return TAX_RETURN_FILENAME.test(name.toLowerCase());
}

export function receivedClassOf(doc: ReceivedDoc): ExtractClass | null {
  if (doc.extractClass && doc.extractClass !== "other") return doc.extractClass;
  const fromSlot = extractClassFromSlot(doc.slot);
  if (fromSlot) return fromSlot;
  if (doc.status === "extracted" && taxReturnFilename(doc.name)) return "tax_return";
  if (doc.extractClass === "other") return null;
  return null;
}

export function looksLikeTaxReturnFields(
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  if (!fields) return false;
  const kind = normalizeReturnKind(String(fields.return_kind ?? ""));
  if (kind === "k1" || kind === "1065" || kind === "1120s" || kind === "schedule_c") return true;
  if (String(fields.k1_ordinary_income ?? "").trim()) return true;
  if (String(fields.schedule_c_net_profit ?? "").trim()) return true;
  return false;
}

export function promoteExtractClass(
  extractClass: ExtractClass,
  fields?: Record<string, string | null | undefined> | null,
): ExtractClass {
  if (extractClass !== "other") return extractClass;
  return looksLikeTaxReturnFields(fields) ? "tax_return" : extractClass;
}

/** Filename paystub / W-2 / ID / bank / tax-return names win when extract returns `other`. */
export function preferFilenameClass(
  extractClass: ExtractClass,
  name?: string,
  slot?: DocSlot,
): ExtractClass {
  if (extractClass !== "other") return extractClass;
  return (
    extractClassFromSlot(slot ?? "other") ??
    extractClassFromFilename(name ?? "") ??
    (taxReturnFilename(name ?? "") ? "tax_return" : null) ??
    extractClass
  );
}

export function resolveReceivedSlot(
  filenameSlot: DocSlot,
  name: string,
  extractClass: ExtractClass,
): DocSlot {
  const classSlot = slotForExtractClass(extractClass);
  if (classSlot !== "other") return classSlot;
  if (filenameSlot !== "other") return filenameSlot;
  return slotFromFilename(name);
}

export function docsDisplayLabel(doc: {
  slot: DocSlot;
  name: string;
  extractClass?: ExtractClass;
}): string {
  const extractClass = preferFilenameClass(doc.extractClass ?? "other", doc.name, doc.slot);
  if (extractClass === "paystub") return "Paystubs";
  if (extractClass === "w2") return "W-2";
  if (extractClass === "government_id") return "ID";
  if (extractClass === "bank_statement") return "Bank statements";
  if (extractClass === "tax_return") return "Tax return";
  const slot = resolveReceivedSlot(doc.slot, doc.name, extractClass);
  if (slot === "paystubs") return "Paystubs";
  if (slot === "w2") return "W-2";
  if (slot === "id") return "ID";
  if (slot === "bank") return "Bank statements";
  return "Other";
}

export function extractClassLabel(extractClass: ExtractClass) {
  if (extractClass === "government_id") return "government ID";
  if (extractClass === "paystub") return "paystub";
  if (extractClass === "w2") return "W-2";
  if (extractClass === "tax_return") return "tax return";
  if (extractClass === "bank_statement") return "bank statement";
  if (extractClass === "purchase_contract") return "purchase contract";
  if (extractClass === "mortgage_statement") return "mortgage statement";
  return "document";
}

export function askClassLabel(extractClass: ExtractClass) {
  if (extractClass === "paystub") return "latest paystub";
  return extractClassLabel(extractClass);
}

export function incomeRequestedClasses(income?: string | null): ExtractClass[] {
  const out: ExtractClass[] = ["government_id"];
  if (income === "w2" || income === "both") {
    out.push("paystub", "w2");
  }
  if (income === "self-employed" || income === "other" || income === "both" || !income) {
    if (income !== "w2") out.push("tax_return");
  }
  return out;
}

export function factLabel(field: string) {
  if (field === "full_name") return "name";
  if (field === "date_of_birth") return "date of birth";
  if (field === "id_last4") return "ID last 4";
  if (field === "state") return "state";
  if (field === "expiration") return "expiration";
  if (field === "employer_name") return "employer";
  if (field === "pay_period_end") return "pay period";
  if (field === "gross_period") return "period pay";
  if (field === "ytd_gross") return "YTD pay";
  if (field === "net_period") return "net pay";
  if (field === "tax_year") return "tax year";
  if (field === "wages") return "wages";
  if (field === "federal_withheld") return "federal withheld";
  if (field === "pay_frequency") return "pay frequency";
  if (field === "filing_status") return "filing status";
  if (field === "agi") return "AGI";
  if (field === "return_kind") return "return kind";
  if (field === "schedule_c_net_profit") return "net profit";
  if (field === "depreciation") return "depreciation";
  if (field === "depletion") return "depletion";
  if (field === "business_use_of_home") return "business use of home";
  if (field === "nonrecurring_other_income") return "nonrecurring other income";
  if (field === "amortization") return "amortization";
  if (field === "casualty_loss") return "casualty loss";
  if (field === "mileage_depreciation") return "mileage depreciation";
  if (field === "k1_ordinary_income") return "K-1 ordinary income";
  if (field === "k1_distributions") return "K-1 distributions";
  if (field === "qualifying_income") return "qualifying income";
  if (field === "institution") return "institution";
  if (field === "period_end") return "period end";
  if (field === "ending_balance") return "ending balance";
  if (field === "property_address") return "property";
  if (field === "purchase_price") return "purchase price";
  if (field === "close_date") return "close date";
  if (field === "servicer") return "servicer";
  if (field === "unpaid_principal") return "unpaid principal";
  if (field === "current_pi") return "current P&I";
  if (field === "income") return "income";
  return field.replace(/_/g, " ");
}

export function last4Only(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "";
  return digits.slice(-4);
}

export function sanitizeExtractedFields(
  extractClass: ExtractClass,
  fields: Record<string, string | null | undefined>,
): Record<string, string> {
  const allowed = new Set(EXTRACT_SCHEMA_KEYS[extractClass] ?? []);
  const next: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(fields ?? {})) {
    const key = rawKey.trim();
    if (!key || DROP_FIELD_KEYS.test(key)) continue;
    if (allowed.size && !allowed.has(key)) continue;
    if (key === "fico" || key === "credit" || key === "credit_score") continue;
    let value = String(rawValue ?? "").trim();
    if (!value) continue;
    if (key === "id_last4") {
      value = last4Only(value);
      if (!value) continue;
      next[key] = value;
      continue;
    }
    if (SSN_RE.test(value)) continue;
    if (
      LONG_ACCOUNT_RE.test(value.replace(/[\s-]/g, "")) &&
      !MONEY_KEYS.has(key) &&
      !DATE_KEYS.has(key)
    ) {
      continue;
    }
    next[key] = value;
  }
  return next;
}

function moneyNumber(value: string): number | null {
  return parseExtractMoney(value);
}

export function valuesMatch(left: string, right: string) {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) return false;
  const an = moneyNumber(a);
  const bn = moneyNumber(b);
  if (an != null && bn != null) return Math.abs(an - bn) < 0.51;
  return a.toLowerCase().replace(/\s+/g, " ") === b.toLowerCase().replace(/\s+/g, " ");
}

export function displayFactValue(field: string, value: string) {
  if (MONEY_KEYS.has(field)) {
    const n = moneyNumber(value);
    if (n != null) {
      const shown = `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
      return n < 0 ? `-${shown}` : shown;
    }
  }
  return value;
}

function existingFact(draft: FoxIntakeDraft, field: string): { value: string; via: string } | null {
  if (field === "full_name" && draft.contact.fullName.value) {
    return { value: draft.contact.fullName.value, via: "structure" };
  }
  if (field === "purchase_price" && draft.propertyValueAmount != null) {
    return { value: String(draft.propertyValueAmount), via: "structure" };
  }
  if (field === "unpaid_principal" && draft.loanAmountValue != null) {
    return { value: String(draft.loanAmountValue), via: "structure" };
  }
  if (field === "employer_name" && draft.facts?.employer_name?.value) {
    return { value: draft.facts.employer_name.value, via: "employer_name" };
  }
  const direct = draft.facts?.[field]?.value;
  if (direct) return { value: direct, via: field };
  if (field === "qualifying_income" && draft.facts?.qualifying_income?.value) {
    return { value: draft.facts.qualifying_income.value, via: "qualifying_income" };
  }
  if (INCOME_MONEY_KEYS.has(field) && draft.facts?.qualifying_income?.value) {
    return { value: draft.facts.qualifying_income.value, via: "qualifying_income" };
  }
  if (INCOME_MONEY_KEYS.has(field) && draft.facts?.income?.value) {
    return { value: draft.facts.income.value, via: "income" };
  }
  return null;
}

function writeField(
  draft: FoxIntakeDraft,
  field: string,
  value: string,
  now: string,
): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  const next: DraftField = {
    field,
    value,
    source: "extracted-unconfirmed",
    confirmed: true,
    confirmedAt: now,
  };
  facts[field] = next;
  let contact = draft.contact;
  let propertyValueAmount = draft.propertyValueAmount;
  let valueAsked = draft.valueAsked;
  let loanAmountValue = draft.loanAmountValue;
  let amountAsked = draft.amountAsked;
  if (field === "full_name" && !draft.contact.fullName.value) {
    contact = {
      ...draft.contact,
      fullName: { field: "fullName", value, source: "document", confirmed: true, confirmedAt: now },
    };
  }
  if (field === "purchase_price" && draft.propertyValueAmount == null) {
    const n = moneyNumber(value);
    if (n != null && n > 0) {
      propertyValueAmount = n;
      valueAsked = true;
    }
  }
  if (field === "unpaid_principal" && draft.loanAmountValue == null) {
    const n = moneyNumber(value);
    if (n != null && n > 0) {
      loanAmountValue = n;
      amountAsked = true;
    }
  }
  const pendingProposal =
    draft.pendingProposal && draft.pendingProposal.field === field ? null : draft.pendingProposal;
  return {
    ...draft,
    facts,
    contact,
    propertyValueAmount,
    valueAsked,
    loanAmountValue,
    amountAsked,
    pendingProposal,
  };
}

export function quietLineForClass(extractClass: ExtractClass) {
  if (extractClass === "paystub") return "Updated income from paystub.";
  if (extractClass === "w2") return "Updated income from W-2.";
  if (extractClass === "tax_return") return "Updated income from tax return.";
  if (extractClass === "government_id") return "Updated identity from ID.";
  if (extractClass === "bank_statement") return "Updated deposits from bank statement.";
  if (extractClass === "purchase_contract") return "Updated purchase from contract.";
  if (extractClass === "mortgage_statement") return "Updated loan from mortgage statement.";
  return null;
}

export const DEAD_FILE_WRITE_LINES = [
  "Updated income from paystub.",
  "Updated income from W-2.",
  "Updated income from tax return.",
  "Updated identity from ID.",
  "Updated deposits from bank statement.",
  "Updated purchase from contract.",
  "Updated loan from mortgage statement.",
] as const;

export function isDeadFileWriteLine(line: string) {
  return (DEAD_FILE_WRITE_LINES as readonly string[]).includes(line);
}

export function firstNameFromDraft(draft: FoxIntakeDraft): string {
  const full = (draft.contact.fullName.value || factValue(draft, "full_name")).trim();
  if (!full) return "";
  const raw = (full.split(/\s+/)[0] ?? "").replace(/[.,]+$/g, "");
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function lastExtractedClass(draft: FoxIntakeDraft): ExtractClass | null {
  for (let i = draft.documents.length - 1; i >= 0; i -= 1) {
    const doc = draft.documents[i];
    if (doc.status !== "extracted") continue;
    const cls = receivedClassOf(doc);
    if (cls && cls !== "other") return cls;
  }
  return null;
}

export type ExtractApplyInput = {
  extractClass: ExtractClass;
  confidence: number;
  fields: Record<string, string | null | undefined>;
};

export type ExtractApplyResult = {
  draft: FoxIntakeDraft;
  writes: { field: string; value: string }[];
  conflict: FactConflict | null;
  quietLines: string[];
};

export function applyExtractedFields(
  draft: FoxIntakeDraft,
  input: ExtractApplyInput,
): ExtractApplyResult {
  const writes: { field: string; value: string }[] = [];
  const extractClass = promoteExtractClass(input.extractClass, input.fields);
  if (
    extractClass === "other" ||
    (input.confidence < LOW_EXTRACT_CONFIDENCE && !looksLikeTaxReturnFields(input.fields))
  ) {
    return { draft, writes, conflict: null, quietLines: [] };
  }
  const fields = sanitizeExtractedFields(extractClass, input.fields);
  const computed = monthlyQualifyingFromExtract(draft, extractClass, fields);
  const now = new Date().toISOString();
  let next = draft;
  let conflict: FactConflict | null = draft.pendingConflict ?? null;
  for (const field of EXTRACT_SCHEMA_KEYS[extractClass]) {
    const value = fields[field];
    if (!value) continue;
    const existing = existingFact(next, field);
    if (!existing || (extractClass === "tax_return" && YEARLY_TAX_KEYS.has(field))) {
      next = writeField(next, field, value, now);
      writes.push({ field, value });
      continue;
    }
    if (existing.via === "income" || existing.via === "qualifying_income") {
      if (extractClass === "tax_return" && existing.via === "qualifying_income") {
        continue;
      }
      const compare = computed != null ? String(computed.monthly) : value;
      if (valuesMatch(existing.value, compare)) {
        if (field !== existing.via) {
          next = writeField(next, field, value, now);
          writes.push({ field, value });
        }
        continue;
      }
      if (!conflict) {
        const askField = existing.via;
        conflict = {
          field: askField,
          fileValue: existing.value,
          documentValue: compare,
          label: factLabel(askField),
          kind: "document",
        };
      }
      continue;
    }
    if (valuesMatch(existing.value, value)) continue;
    if (!conflict) {
      conflict = {
        field,
        fileValue: existing.value,
        documentValue: value,
        label: factLabel(field),
        kind: "document",
      };
    }
  }
  next = applyQualifyingIncomeFromExtract(
    { ...next, pendingConflict: conflict },
    extractClass,
    fields,
    computed,
  );
  conflict = next.pendingConflict ?? conflict;
  next = attachExtractClass(next, extractClass);
  const caution = decliningIncomeCaution(next);
  return {
    draft: next,
    writes,
    conflict,
    quietLines: caution ? [caution] : [],
  };
}

function attachExtractClass(draft: FoxIntakeDraft, extractClass: ExtractClass): FoxIntakeDraft {
  if (extractClass === "other") return draft;
  const unmatched = draft.documents
    .map((doc, index) => ({ doc, index }))
    .filter(
      ({ doc }) =>
        COUNTED_DOC_STATUSES.has(doc.status) && (!doc.extractClass || doc.extractClass === "other"),
    );
  if (!unmatched.length) return draft;
  const preferred =
    unmatched.find(({ doc }) =>
      extractClass === "tax_return"
        ? taxReturnFilename(doc.name)
        : preferFilenameClass("other", doc.name, doc.slot) === extractClass,
    ) ?? (unmatched.length === 1 ? unmatched[0] : undefined);
  if (!preferred) return draft;
  return {
    ...draft,
    documents: draft.documents.map((doc, index) =>
      index === preferred.index
        ? {
            ...doc,
            extractClass,
            slot: resolveReceivedSlot(doc.slot, doc.name, extractClass),
            status: "extracted" as const,
          }
        : doc,
    ),
  };
}

export function resolveFactConflict(
  draft: FoxIntakeDraft,
  winner: "file" | "document",
): FoxIntakeDraft {
  const conflict = draft.pendingConflict;
  if (!conflict) return draft;
  const now = new Date().toISOString();
  if (winner === "file") {
    const facts = { ...(draft.facts ?? {}) };
    const current = facts[conflict.field];
    if (current) {
      facts[conflict.field] = { ...current, confirmed: true, confirmedAt: now };
    }
    return { ...draft, facts, pendingConflict: null };
  }
  const withValue = writeField(draft, conflict.field, conflict.documentValue, now);
  const facts = { ...(withValue.facts ?? {}) };
  if (facts[conflict.field]) {
    facts[conflict.field] = {
      ...facts[conflict.field],
      source: "document",
      confirmed: true,
      confirmedAt: now,
    };
  }
  return { ...withValue, facts, pendingConflict: null };
}

const COUNTED_DOC_STATUSES = new Set<ReceivedDoc["status"]>(["received", "reading", "extracted"]);

export function receivedTaxReturnCount(draft: FoxIntakeDraft): number {
  let fromDocs = 0;
  for (const doc of draft.documents) {
    if (!COUNTED_DOC_STATUSES.has(doc.status)) continue;
    if (receivedClassOf(doc) === "tax_return") fromDocs += 1;
  }
  const years = new Set<string>();
  for (const row of readTaxCashflows(draft)) {
    const year = row.tax_year.trim();
    if (year) years.add(year);
  }
  return Math.max(fromDocs, years.size);
}

export function receivedExtractClasses(draft: FoxIntakeDraft): Set<ExtractClass> {
  const set = new Set<ExtractClass>(draft.skippedClasses ?? []);
  for (const doc of draft.documents) {
    if (!COUNTED_DOC_STATUSES.has(doc.status)) continue;
    const received = receivedClassOf(doc);
    if (received) set.add(received);
  }
  if (receivedTaxReturnCount(draft) >= 1) set.add("tax_return");
  return set;
}

export function requestedExtractClasses(draft: FoxIntakeDraft): ExtractClass[] {
  return incomeRequestedClasses(draft.incomeType.value);
}

export function missingExtractClasses(draft: FoxIntakeDraft): ExtractClass[] {
  const have = receivedExtractClasses(draft);
  return requestedExtractClasses(draft).filter((item) => !have.has(item));
}

export function receivedClassCount(draft: FoxIntakeDraft, extractClass: ExtractClass): number {
  let count = 0;
  for (const doc of draft.documents) {
    if (!COUNTED_DOC_STATUSES.has(doc.status)) continue;
    if (receivedClassOf(doc) === extractClass) count += 1;
  }
  return count;
}

/** After Looks right, conventional W-2 / SE can deepen past the minimum three. HELOC / Jumbo stay thin. */
export function deepenStillUseful(draft: FoxIntakeDraft) {
  if (!draft.sampleAccepted) return false;
  if (draft.productIntent === "heloc" || draft.productIntent === "jumbo") return false;
  return draft.productIntent === "buy" || draft.productIntent === "refinance";
}

/** Ask-copy labels plus deepen items the still-useful list may name after Looks right. */
export type StillUsefulLabel =
  | ReturnType<typeof askClassLabel>
  | "second-year W-2"
  | "prior-year return"
  | "K-1 distributions";

export function stillUsefulLabels(draft: FoxIntakeDraft): StillUsefulLabel[] {
  const taxReturns = receivedTaxReturnCount(draft);
  const labels: StillUsefulLabel[] = missingExtractClasses(draft)
    .filter((item) => item !== "tax_return" || taxReturns < 1)
    .map(askClassLabel);
  if (!deepenStillUseful(draft)) return labels;
  const income = draft.incomeType.value;
  if ((income === "w2" || income === "both") && receivedClassCount(draft, "w2") === 1) {
    labels.push("second-year W-2");
  }
  if (
    (income === "self-employed" || income === "both" || income === "other") &&
    taxReturns === 1
  ) {
    labels.push(
      k1OrdinaryMissingDistributions(draft) && !hasScheduleCCashflow(draft)
        ? "K-1 distributions"
        : "prior-year return",
    );
  }
  return taxReturns >= 2
    ? labels.filter(
        (label) =>
          label !== "tax return" && label !== "prior-year return" && label !== "K-1 distributions",
      )
    : labels;
}

export function shortStillUsefulLabel(label: string) {
  if (/government ID/i.test(label)) return "ID";
  if (/latest paystub/i.test(label)) return "paystub";
  if (/^tax return$/i.test(label)) return "return";
  return label;
}

export function fileStillUsefulNote(draft: FoxIntakeDraft): string | undefined {
  if (stillUsefulVisible(draft)) return undefined;
  if (!deepenStillUseful(draft) && !draft.sampleAccepted) return undefined;
  const labels = stillUsefulLabels(draft).map(shortStillUsefulLabel);
  if (!labels.length) return undefined;
  return `still useful: ${labels.join(" · ")}`;
}

export function labelListCopy(labels: string[]) {
  if (!labels.length) return "";
  const head = labels[0].charAt(0).toUpperCase() + labels[0].slice(1);
  if (labels.length === 1) return `${head}.`;
  if (labels.length === 2) return `${head} and ${labels[1]}.`;
  return `${head}, ${labels.slice(1, -1).join(", ")}, and ${labels[labels.length - 1]}.`;
}

export function missingListCopy(classes: ExtractClass[]) {
  return labelListCopy(classes.map(askClassLabel));
}

export function stillUsefulAskCopy(draft: FoxIntakeDraft) {
  if (layer2Open(draft)) return layer2AskCopy(draft);
  return labelListCopy(stillUsefulLabels(draft));
}

export function stillUsefulAskKey(draft: FoxIntakeDraft) {
  if (layer2Open(draft)) return nextStillUsefulItem(draft)?.id ?? "ready";
  return stillUsefulLabels(draft).join("|");
}

/** Key used to decide whether Fox should refresh the still-useful ask after extract. */
export function stillUsefulRefreshKey(draft: FoxIntakeDraft) {
  return stillUsefulAskKey(draft) || "ready";
}

export const NOTHING_URGENT = "Nothing urgent missing.";

export type StillUsefulItem = {
  id: string;
  label: string;
  ask: string;
};

function purchaseLikeFile(draft: FoxIntakeDraft) {
  return (
    draft.productIntent === "buy" ||
    (draft.productIntent === "jumbo" && draft.jumboPurpose === "buy")
  );
}

function refiLikeFile(draft: FoxIntakeDraft) {
  return (
    draft.productIntent === "refinance" ||
    (draft.productIntent === "jumbo" && draft.jumboPurpose === "refinance")
  );
}

function actuallyReceivedClass(draft: FoxIntakeDraft, extractClass: ExtractClass) {
  if (extractClass === "tax_return") return receivedTaxReturnCount(draft) >= 1;
  return receivedClassCount(draft, extractClass) > 0;
}

function hasPnlDocument(draft: FoxIntakeDraft) {
  return draft.documents.some((doc) => /p&l|pnl|profit and loss/i.test(doc.name));
}

function skippedStillUsefulSet(draft: FoxIntakeDraft) {
  return new Set(draft.skippedStillUseful ?? []);
}

function layer2Item(
  id: string,
  label: string,
  ask: string,
  skipped: Set<string>,
): StillUsefulItem | null {
  if (skipped.has(id)) return null;
  return { id, label, ask };
}

/** After Proceed. Session-one sketch skip does not clear these — only a received item or a Layer 2 Skip does. */
export function layer2Open(draft: FoxIntakeDraft) {
  return Boolean(
    draft.sampleAccepted &&
      (draft.motion === "in_queue" ||
        draft.motion === "needs_you" ||
        draft.motion === "escalated" ||
        (draft.events ?? []).some((event) => event.kind === "proceed")),
  );
}

function skippedOpeningDoc(draft: FoxIntakeDraft) {
  return Boolean(
    (draft.skippedClasses && draft.skippedClasses.length > 0) ||
      draft.priorYearSkipped ||
      draft.documentsSkipped,
  );
}

/** Structure Still useful: after Proceed, or as soon as an opening doc was skipped. */
export function stillUsefulVisible(draft: FoxIntakeDraft) {
  if (layer2Open(draft)) return true;
  if (!skippedOpeningDoc(draft)) return false;
  return Boolean(draft.path && draft.productIntent && draft.incomeType.value);
}

export function layer2Plan(draft: FoxIntakeDraft): StillUsefulItem[] {
  const skipped = skippedStillUsefulSet(draft);
  const income = draft.incomeType.value;
  const w2 = income === "w2" || income === "both";
  const se = income === "self-employed" || income === "both" || income === "other";
  const taxReturns = receivedTaxReturnCount(draft);
  const items: StillUsefulItem[] = [];
  const push = (id: string, label: string, ask: string) => {
    const item = layer2Item(id, label, ask, skipped);
    if (item) items.push(item);
  };

  if (!actuallyReceivedClass(draft, "government_id")) {
    push("government_id", "Government ID", "A government ID still helps this file.");
  }
  if (w2 && !actuallyReceivedClass(draft, "paystub")) {
    push("paystub", "Latest paystub", "A latest paystub still helps this file.");
  }
  if (w2 && receivedClassCount(draft, "w2") < 1) {
    push("w2", "W-2", "A W-2 still helps this file.");
  }
  if (w2 && receivedClassCount(draft, "w2") === 1) {
    push("second-year-w2", "Second-year W-2", "A second-year W-2 still helps this file.");
  }
  if (se && taxReturns < 1) {
    push("tax_return", "Latest return", "Your latest return still helps this file.");
  }
  if (se && taxReturns === 1) {
    if (k1OrdinaryMissingDistributions(draft) && !hasScheduleCCashflow(draft)) {
      push("k1-distributions", "K-1 distributions", "K-1 distributions still help this file.");
    } else {
      push("prior-year-return", "Prior-year return", "A prior-year return still helps this file.");
    }
  }
  if (se && taxReturns >= 1 && !hasPnlDocument(draft)) {
    push("ytd-pnl", "YTD P&L", "A YTD P&L helps if you have one.");
  }
  if (purchaseLikeFile(draft) || refiLikeFile(draft)) {
    if (!factValue(draft, "property_address")) {
      push(
        "property-address",
        "Property address",
        "The subject property address still helps this file.",
      );
    }
  }
  if (purchaseLikeFile(draft) && !actuallyReceivedClass(draft, "purchase_contract")) {
    push("purchase_contract", "Purchase contract", "The purchase contract still helps this file.");
  }
  if (refiLikeFile(draft) && !actuallyReceivedClass(draft, "mortgage_statement")) {
    push(
      "mortgage_statement",
      "Mortgage statement",
      "A current mortgage statement still helps this file.",
    );
  }
  if (
    (purchaseLikeFile(draft) || (refiLikeFile(draft) && draft.cashOut)) &&
    !actuallyReceivedClass(draft, "bank_statement")
  ) {
    push("bank_statement", "Bank statement", "A recent bank statement still helps this file.");
  }
  if (!factValue(draft, "employer_name")) {
    if (se && income !== "both") {
      push("business", "Business name", "The business name still helps this file.");
    } else if (w2 || income === "both") {
      push("employer", "Employer", "The employer name still helps this file.");
    }
  }
  if (se && !factValue(draft, "years_in_business")) {
    push("years-in-business", "Years in business", "Years in business still helps this file.");
  }
  return items;
}

export function nextStillUsefulItem(draft: FoxIntakeDraft): StillUsefulItem | undefined {
  return layer2Plan(draft)[0];
}

export function stillUsefulSection(draft: FoxIntakeDraft): {
  items: StillUsefulItem[];
  empty: boolean;
} | null {
  if (!stillUsefulVisible(draft)) return null;
  const items = layer2Plan(draft).slice(0, 3);
  return { items, empty: items.length === 0 };
}

export function layer2AskCopy(draft: FoxIntakeDraft) {
  return nextStillUsefulItem(draft)?.ask ?? NOTHING_URGENT;
}

export function layer2AskActions(draft: FoxIntakeDraft): FoxAction[] | undefined {
  if (!nextStillUsefulItem(draft)) return undefined;
  return [
    { id: "upload-this", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } },
    { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
    { id: "hold-docs", label: "Not yet", event: "bubble", capture: { field: "hold-docs" } },
  ];
}

export function skipCurrentStillUseful(draft: FoxIntakeDraft): FoxIntakeDraft {
  const next = nextStillUsefulItem(draft);
  if (!next) return { ...draft, docsHeld: false };
  return {
    ...draft,
    docsHeld: false,
    skippedStillUseful: Array.from(new Set([...(draft.skippedStillUseful ?? []), next.id])),
  };
}

export function missingAskCopy(classes: ExtractClass[]) {
  return missingListCopy(classes);
}

export function missingAskKey(classes: ExtractClass[]) {
  return classes.join("|");
}

export function conflictAskCopy(conflict: FactConflict) {
  return `The file has ${conflict.label} ${displayFactValue(conflict.field, conflict.fileValue)}. The document has ${displayFactValue(conflict.field, conflict.documentValue)}. Which should I keep?`;
}

export type DocInviteKind =
  | "government_id"
  | "paystub"
  | "w2"
  | "tax_return"
  | "prior_year_return";

export const DOC_INVITE_COPY: Record<DocInviteKind, string> = {
  government_id: "First I need a government ID, so this file has a name on it.",
  paystub: "Next is your latest paystub. That’s current income on paper.",
  w2: "Next is your most recent W-2.",
  tax_return:
    "Next is your most recent tax return. That’s how I estimate qualifying income. Suggested, not underwritten.",
  prior_year_return: "A prior-year return helps me see if last year was stable. Have one?",
};

export function inviteSequence(draft: FoxIntakeDraft): DocInviteKind[] {
  const income = draft.incomeType.value;
  const steps: DocInviteKind[] = ["government_id"];
  if (income === "w2" || income === "both") {
    steps.push("paystub", "w2");
  }
  if (income === "self-employed" || income === "other" || income === "both") {
    steps.push("tax_return", "prior_year_return");
  }
  return steps;
}

function inviteSatisfied(draft: FoxIntakeDraft, kind: DocInviteKind): boolean {
  if (kind === "prior_year_return") {
    if (draft.priorYearSkipped) return true;
    let extracted = 0;
    for (const doc of draft.documents) {
      if (doc.status !== "extracted") continue;
      if (receivedClassOf(doc) === "tax_return") extracted += 1;
    }
    const years = new Set<string>();
    for (const row of readTaxCashflows(draft)) {
      const year = row.tax_year.trim();
      if (year) years.add(year);
    }
    if (Math.max(extracted, years.size) >= 2) return true;
    if (receivedTaxReturnCount(draft) < 1) {
      return !(draft.skippedClasses ?? []).includes("tax_return");
    }
    return false;
  }
  if (receivedExtractClasses(draft).has(kind)) return true;
  return (draft.skippedClasses ?? []).includes(kind);
}

export function offeringDocStart(draft: FoxIntakeDraft) {
  return (
    !draft.docsStarted &&
    !draft.sampleAccepted &&
    draft.documents.length === 0 &&
    nextDocInvite(draft) === "government_id"
  );
}

export function nextDocInvite(draft: FoxIntakeDraft): DocInviteKind | null {
  if (draft.sampleAccepted) return null;
  if (!draft.incomeType.value && !draft.incomeAsked) return null;
  if (draft.pendingProposal || draft.pendingConflict) return null;
  for (const kind of inviteSequence(draft)) {
    if (!inviteSatisfied(draft, kind)) return kind;
  }
  return null;
}

export function skipCurrentInvite(draft: FoxIntakeDraft): FoxIntakeDraft {
  const kind = nextDocInvite(draft);
  if (!kind) {
    return { ...draft, documentsSkipped: true, docsOpen: false, correcting: null };
  }
  if (kind === "prior_year_return") {
    return {
      ...draft,
      priorYearSkipped: true,
      docsOpen: false,
      correcting: null,
      documentsSkipped: draft.documents.length === 0,
    };
  }
  const skipped = Array.from(new Set([...(draft.skippedClasses ?? []), kind]));
  const next = { ...draft, skippedClasses: skipped, docsOpen: false, correcting: null };
  const more = nextDocInvite(next);
  return {
    ...next,
    documentsSkipped: more == null && draft.documents.length === 0,
  };
}

export function holdDocuments(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, docsHeld: true, docsOpen: false, correcting: null };
}

export function skipRemainingClasses(draft: FoxIntakeDraft): FoxIntakeDraft {
  const remaining = missingExtractClasses(draft);
  const skipped = Array.from(new Set([...(draft.skippedClasses ?? []), ...remaining]));
  const cleared = draft.pendingConflict ? resolveFactConflict(draft, "file") : draft;
  return {
    ...cleared,
    documentsSkipped: true,
    docsOpen: false,
    correcting: null,
    skippedClasses: skipped,
  };
}

export function rejectIncomingFile(
  draft: FoxIntakeDraft,
  name: string,
  type: string,
  size: number,
): string | null {
  if (draft.documents.length >= MAX_DOC_COUNT) return LIMIT_LINE;
  if (!isAcceptedFile(name, type, size)) return REJECT_LINE;
  return null;
}

export function factValue(draft: FoxIntakeDraft, field: string) {
  return draft.facts?.[field]?.value ?? "";
}

export function documentStatusLine(doc: ReceivedDoc) {
  return `${doc.name} · ${doc.status}`;
}

export function conflictActions(): FoxAction[] {
  return [
    { id: "keep-file-fact", label: "Keep file", event: "bubble", capture: { field: "keep-file-fact" } },
    { id: "use-document-fact", label: "Use document", event: "bubble", capture: { field: "use-document-fact" } },
  ];
}

export function missingAskActions(): FoxAction[] {
  return [
    { id: "skip-docs", label: "Skip for now", event: "bubble", capture: { field: "skip-docs" } },
  ];
}

export const DOC_INTAKE_EVENT = "onyx:doc-intake";

export type DocIntakeDetail = {
  reject?: string;
  quietLines?: string[];
  conflict?: FactConflict | null;
  missing?: ExtractClass[];
  refreshStillUseful?: boolean;
  extractClass?: ExtractClass;
};

export function emitDocIntake(detail: DocIntakeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DOC_INTAKE_EVENT, { detail }));
}
