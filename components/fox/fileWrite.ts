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
  FactProposal,
  FoxAction,
  FoxIntakeDraft,
  ReceivedDoc,
} from "./types";
import {
  applyQualifyingIncomeFromExtract,
  decliningIncomeCaution,
  hasScheduleCCashflow,
  hasTwoYearWageHistory,
  k1OrdinaryMissingDistributions,
  monthlyQualifyingFromExtract,
  normalizeReturnKind,
  parseExtractMoney,
  readTaxCashflows,
  wageIncomeCaution,
} from "./qualifyingIncome";
import {
  completeness as storeCompleteness,
  conventionalGuidelinePattern,
  documentedStillUsefulIds,
  EMPLOYER_MISMATCH_LINE,
  type CompletenessFile,
  type DocumentedStillUsefulId,
} from "@/lib/guidelines/conventional";
import { debtsSettled } from "./monthlyDebts";
import {
  STATED_AVAILABLE_ASSETS_FIELD,
  SUGGESTED_ASSETS_EXTRACT_NOTE,
  assetsSettled,
  availableAssetsConflictActions,
  proposeExtractedAvailableAssets,
} from "./availableAssets";
import {
  PROPERTY_ADDRESS_FACT,
  SUGGESTED_PROPERTY_NOTE,
  isPropertyAddressField,
  propertyAddressConflictActions,
  propertyTypeSettled,
} from "./propertyType";
import {
  HIRE_DATE_FIELD,
  STATED_TIME_ON_JOB_FIELD,
  SUGGESTED_TIME_ON_JOB_NOTE,
  displayTimeOnJob,
  monthsBetween,
  parseHireDate,
  proposeExtractedTimeOnJob,
  timeOnJobConflictActions,
  timeOnJobSettled,
} from "./timeOnJob";
import {
  STATED_CURRENT_HOUSING_FIELD,
  SUGGESTED_HOUSING_NOTE,
  currentHousingConflictActions,
  currentHousingSettled,
  proposeExtractedCurrentHousing,
} from "./currentHousing";
import { declarationsSettled } from "./declarations";
import { householdSettled } from "./household";
import {
  BORROWER_NAME_FIELD,
  borrowerNameConflictActions,
  borrowerNameSettled,
  displayBorrowerName,
  isBorrowerNameField,
  proposeExtractedBorrowerName,
  SUGGESTED_BORROWER_NOTE,
  writeBorrowerName,
} from "./borrowerName";
import {
  STATED_OTHER_REO_FIELD,
  otherReoSettled,
  proposeExtractedOtherReo,
} from "./otherReo";

export { REJECT_LINE, LIMIT_LINE };

export const LOW_EXTRACT_CONFIDENCE = 0.55;

export const EXTRACT_SCHEMA_KEYS: Record<ExtractClass, readonly string[]> = {
  government_id: ["full_name", "date_of_birth", "id_last4", "state", "expiration"],
  paystub: [
    "employer_name",
    "pay_period_end",
    "gross_period",
    "ytd_gross",
    "net_period",
    "pay_frequency",
    "wages",
    "overtime",
    "bonus",
    "commission",
    "overtime_ytd",
    "bonus_ytd",
    "commission_ytd",
    "second_employer_name",
    "tax_year",
    "hire_date",
  ],
  w2: ["tax_year", "employer_name", "wages", "federal_withheld", "overtime", "bonus", "commission", "second_employer_name"],
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
  "overtime",
  "bonus",
  "commission",
  "overtime_ytd",
  "bonus_ytd",
  "commission_ytd",
  "downPayment",
  "down_payment",
  "loanAmount",
  "loan_amount",
  "statedMonthlyDebts",
  "statedAvailableAssets",
  "statedCurrentHousing",
]);

const INCOME_MONEY_KEYS = new Set([
  "gross_period",
  "ytd_gross",
  "wages",
  "agi",
  "income",
  "net_period",
  "overtime",
  "bonus",
  "commission",
  "overtime_ytd",
  "bonus_ytd",
  "commission_ytd",
]);
const VARIABLE_YEAR_KEYS = new Set([
  "overtime",
  "bonus",
  "commission",
  "overtime_ytd",
  "bonus_ytd",
  "commission_ytd",
  "tax_year",
  "wages",
  "gross_period",
  "ytd_gross",
  "pay_period_end",
  "pay_frequency",
  "second_employer_name",
]);
const PRIMARY_PAY_KEYS = new Set([
  "employer_name",
  "gross_period",
  "ytd_gross",
  "pay_period_end",
  "pay_frequency",
  "wages",
]);
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
  "hire_date",
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

export const REMAINDER_CONFIRM_FIELDS = new Set([
  "property_address",
  "purchase_price",
  "close_date",
  "institution",
  "period_end",
  "ending_balance",
  "servicer",
  "unpaid_principal",
  "current_pi",
]);

export function isRemainderConfirmField(field: string) {
  return REMAINDER_CONFIRM_FIELDS.has(field);
}

export function remainderProposalFromWrites(
  _extractClass: ExtractClass,
  writes: { field: string; value: string }[],
): FactProposal | null {
  const usable = writes.filter((item) => item.field && item.value);
  if (!usable.length) return null;
  const [first, ...rest] = usable;
  return {
    field: first.field,
    value: first.value,
    label: factLabel(first.field),
    kind: "computed",
    extras: rest.map((item) => ({
      field: item.field,
      value: item.value,
      label: factLabel(item.field),
    })),
  };
}

export function remainderProposalWrites(proposal: FactProposal): { field: string; value: string; label: string }[] {
  return [
    { field: proposal.field, value: proposal.value, label: proposal.label || factLabel(proposal.field) },
    ...(proposal.extras ?? []),
  ];
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
  if (field === "second_employer_name") return "second employer";
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
  if (field === "property_address" || field === "subjectAddress") return "property";
  if (field === "purchase_price") return "purchase price";
  if (field === "close_date") return "close date";
  if (field === "servicer") return "servicer";
  if (field === "unpaid_principal") return "unpaid principal";
  if (field === "current_pi") return "current P&I";
  if (field === "income") return "income";
  if (field === STATED_AVAILABLE_ASSETS_FIELD) return "Stated available assets";
  if (field === STATED_TIME_ON_JOB_FIELD) return "Time on job";
  if (field === STATED_CURRENT_HOUSING_FIELD) return "Current housing";
  if (field === "statedDeclaration") return "Declarations";
  if (field === "statedHousehold") return "Household";
  if (isBorrowerNameField(field)) return "Borrower";
  if (field === STATED_OTHER_REO_FIELD) return "Other real estate";
  if (field === HIRE_DATE_FIELD) return "hire date";
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
  if (field === STATED_TIME_ON_JOB_FIELD) {
    const months = Number(value);
    if (Number.isFinite(months) && months > 0) return displayTimeOnJob(months);
  }
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
  if (isBorrowerNameField(field) && (draft.borrowerName || draft.contact.fullName.value)) {
    return { value: draft.borrowerName || draft.contact.fullName.value, via: "structure" };
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
  if (field === STATED_AVAILABLE_ASSETS_FIELD && draft.statedAvailableAssets != null) {
    return { value: String(draft.statedAvailableAssets), via: "structure" };
  }
  if (field === STATED_TIME_ON_JOB_FIELD && draft.statedTimeOnJob != null) {
    return { value: String(draft.statedTimeOnJob), via: "structure" };
  }
  if (field === STATED_CURRENT_HOUSING_FIELD && draft.statedCurrentHousing != null) {
    return { value: String(draft.statedCurrentHousing), via: "structure" };
  }
  if (isPropertyAddressField(field) && (draft.subjectAddress || draft.facts?.property_address?.value)) {
    return {
      value: draft.subjectAddress || draft.facts?.property_address?.value || "",
      via: "structure",
    };
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
  if (isBorrowerNameField(field) && value.trim()) {
    return writeBorrowerName(
      { ...draft, pendingProposal: draft.pendingProposal?.field === field ? null : draft.pendingProposal },
      value,
    );
  }
  if (field === "purchase_price") {
    const n = moneyNumber(value);
    if (n != null && n > 0) {
      propertyValueAmount = n;
      valueAsked = true;
    }
  }
  if (field === "unpaid_principal") {
    const n = moneyNumber(value);
    if (n != null && n > 0) {
      loanAmountValue = n;
      amountAsked = true;
    }
  }
  const pendingProposal =
    draft.pendingProposal && draft.pendingProposal.field === field ? null : draft.pendingProposal;
  const assetAmount = field === STATED_AVAILABLE_ASSETS_FIELD ? moneyNumber(value) : null;
  return {
    ...draft,
    facts,
    contact,
    propertyValueAmount,
    valueAsked,
    loanAmountValue,
    amountAsked,
    pendingProposal,
    ...(assetAmount != null
      ? { statedAvailableAssets: assetAmount, availableAssetsAsked: true }
      : {}),
    ...(isPropertyAddressField(field) ? { subjectAddress: value } : {}),
    ...(field === STATED_TIME_ON_JOB_FIELD && Number.isFinite(Number(value)) && Number(value) > 0
      ? { statedTimeOnJob: Math.round(Number(value)), timeOnJobAsked: true }
      : {}),
    ...(field === STATED_CURRENT_HOUSING_FIELD && Number.isFinite(Number(value)) && Number(value) > 0
      ? { statedCurrentHousing: Math.round(Number(value)), currentHousingAsked: true }
      : {}),
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
  const full = (draft.borrowerName || draft.contact.fullName.value || factValue(draft, "full_name")).trim();
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
  let remainderWrites: { field: string; value: string }[] = [];
  const incomingEmployer = String(fields.employer_name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  const existingEmployer = String(draft.facts?.employer_name?.value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  const keepPrimaryPay =
    (extractClass === "paystub" || extractClass === "w2") &&
    Boolean(incomingEmployer && existingEmployer && incomingEmployer !== existingEmployer) &&
    draft.facts?.employer_name?.source !== "client";
  for (const field of EXTRACT_SCHEMA_KEYS[extractClass]) {
    const value = fields[field];
    if (!value) continue;
    if (keepPrimaryPay && PRIMARY_PAY_KEYS.has(field)) continue;
    if (field === HIRE_DATE_FIELD) continue;
    if (extractClass === "government_id" && (field === "full_name" || field === "date_of_birth")) continue;
    if (isRemainderConfirmField(field)) {
      const existingRemainder = existingFact(next, field);
      if (!existingRemainder) {
        remainderWrites.push({ field, value });
        continue;
      }
      if (valuesMatch(existingRemainder.value, value)) continue;
      if (!conflict) {
        conflict = {
          field,
          fileValue: existingRemainder.value,
          documentValue: value,
          label: factLabel(field),
          kind: "document",
        };
      }
      continue;
    }
    const existing = existingFact(next, field);
    if (!existing || (extractClass === "tax_return" && YEARLY_TAX_KEYS.has(field))) {
      next = writeField(next, field, value, now);
      writes.push({ field, value });
      continue;
    }
    if (
      (extractClass === "w2" || extractClass === "paystub") &&
      VARIABLE_YEAR_KEYS.has(field) &&
      existing.via !== "income"
    ) {
      if (valuesMatch(existing.value, value)) continue;
      next = writeField(next, field, value, now);
      writes.push({ field, value });
      continue;
    }
    if (
      field === "employer_name" &&
      (extractClass === "w2" || extractClass === "paystub") &&
      existing.via === "employer_name" &&
      !valuesMatch(existing.value, value) &&
      next.facts?.employer_name?.source !== "client"
    ) {
      continue;
    }
    if (existing.via === "income" || existing.via === "qualifying_income") {
      if (existing.via === "qualifying_income") {
        if (field !== existing.via) {
          next = writeField(next, field, value, now);
          writes.push({ field, value });
        }
        continue;
      }
      const compare = computed != null && !computed.needsFrequency ? String(computed.monthly) : value;
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
  const extractedAssets = extractClass === "bank_statement" ? moneyNumber(fields.ending_balance ?? "") : null;
  if (extractedAssets != null) {
    if (next.statedAvailableAssets != null) {
      if (!valuesMatch(String(next.statedAvailableAssets), String(extractedAssets)) && !conflict) {
        conflict = {
          field: STATED_AVAILABLE_ASSETS_FIELD,
          fileValue: String(next.statedAvailableAssets),
          documentValue: String(extractedAssets),
          label: "Stated available assets",
          kind: "document",
        };
        next = { ...next, pendingConflict: conflict };
      }
    } else if (!next.pendingConflict) {
      next = proposeExtractedAvailableAssets(
        next,
        extractedAssets,
        remainderWrites.map((item) => ({
          field: item.field,
          value: item.value,
          label: factLabel(item.field),
        })),
      );
      remainderWrites.length = 0;
    }
  }
  const rawHire = extractClass === "paystub" ? String(fields.hire_date ?? "").trim() : "";
  const hire = rawHire ? parseHireDate(rawHire) : null;
  const hireMonths = hire ? monthsBetween(hire) : 0;
  if (hire && hireMonths > 0) {
    if (next.statedTimeOnJob != null) {
      if (!valuesMatch(String(next.statedTimeOnJob), String(hireMonths)) && !conflict) {
        conflict = {
          field: STATED_TIME_ON_JOB_FIELD,
          fileValue: String(next.statedTimeOnJob),
          documentValue: String(hireMonths),
          label: "Time on job",
          kind: "document",
        };
        next = { ...next, pendingConflict: conflict };
      }
    } else if (next.pendingProposal && next.pendingProposal.field !== STATED_TIME_ON_JOB_FIELD) {
      next = {
        ...next,
        pendingHireDate: { date: rawHire, months: hireMonths, label: hire.label },
      };
    } else if (!next.pendingConflict) {
      next = proposeExtractedTimeOnJob(next, hireMonths, hire.label);
    }
  }
  const extractedHousing =
    extractClass === "mortgage_statement" ? moneyNumber(fields.current_pi ?? "") : null;
  if (extractedHousing != null) {
    const housingExtras = remainderWrites.map((item) => ({
      field: item.field,
      value: item.value,
      label: factLabel(item.field),
    }));
    if (next.statedCurrentHousing != null) {
      if (!valuesMatch(String(next.statedCurrentHousing), String(extractedHousing)) && !conflict) {
        conflict = {
          field: STATED_CURRENT_HOUSING_FIELD,
          fileValue: String(next.statedCurrentHousing),
          documentValue: String(extractedHousing),
          label: "Current housing",
          kind: "document",
        };
        next = { ...next, pendingConflict: conflict };
      }
    } else if (next.pendingProposal && next.pendingProposal.field !== STATED_CURRENT_HOUSING_FIELD) {
      next = {
        ...next,
        pendingCurrentHousing: { amount: extractedHousing, extras: housingExtras },
      };
      remainderWrites.length = 0;
    } else if (!next.pendingConflict) {
      next = proposeExtractedCurrentHousing(next, extractedHousing, housingExtras);
      remainderWrites.length = 0;
    }
  }
  const extractedName =
    extractClass === "government_id" ? String(fields.full_name ?? "").trim() : "";
  if (extractedName) {
    const shown = displayBorrowerName(extractedName);
    const existingName = (next.borrowerName || next.contact.fullName.value || "").trim();
    const extras = fields.date_of_birth
      ? [{ field: "date_of_birth", value: String(fields.date_of_birth), label: "date of birth" }]
      : [];
    if (existingName && !valuesMatch(existingName, shown) && !conflict) {
      conflict = {
        field: BORROWER_NAME_FIELD,
        fileValue: displayBorrowerName(existingName),
        documentValue: shown,
        label: "Borrower",
        kind: "document",
      };
      next = { ...next, pendingConflict: conflict };
    } else if (!existingName && !next.pendingConflict) {
      next = proposeExtractedBorrowerName(next, shown, extras);
    }
  }
  if (extractClass === "mortgage_statement" && purchaseFileForOtherReo(next) && !next.statedOtherReo) {
    const remainderWillAsk =
      remainderWrites.length > 0 &&
      (!next.pendingProposal || isRemainderConfirmField(next.pendingProposal.field));
    if (
      (next.pendingProposal && next.pendingProposal.field !== STATED_OTHER_REO_FIELD) ||
      remainderWillAsk
    ) {
      next = { ...next, pendingOtherReo: true };
    } else if (!next.pendingConflict) {
      next = proposeExtractedOtherReo(next);
    }
  }
  if (
    remainderWrites.length &&
    (!next.pendingProposal || isRemainderConfirmField(next.pendingProposal.field))
  ) {
    const remainder = remainderProposalFromWrites(extractClass, remainderWrites);
    if (remainder) next = { ...next, pendingProposal: remainder };
  }
  next = attachExtractClass(next, extractClass);
  const caution = decliningIncomeCaution(next) ?? wageIncomeCaution(next);
  const quietLines = caution ? [caution] : [];
  if (employerMismatchStay(draft, extractClass, fields) && !quietLines.includes(EMPLOYER_MISMATCH_LINE)) {
    quietLines.push(EMPLOYER_MISMATCH_LINE);
  }
  return {
    draft: next,
    writes,
    conflict,
    quietLines,
  };
}

function purchaseFileForOtherReo(draft: FoxIntakeDraft) {
  if (draft.productIntent === "buy") return true;
  if (draft.productIntent === "jumbo") return draft.jumboPurpose !== "refinance";
  return false;
}

function normalizeEmployerName(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function employerMismatchStay(
  draft: FoxIntakeDraft,
  extractClass: ExtractClass,
  fields: Record<string, string>,
) {
  const incoming = normalizeEmployerName(fields.employer_name);
  const existing = normalizeEmployerName(draft.facts?.employer_name?.value);
  if (!incoming || !existing || incoming === existing) return false;
  const fileHasW2 =
    receivedClassCount(draft, "w2") > 0 || Boolean(String(draft.facts?.wages?.value ?? "").trim());
  return (extractClass === "paystub" && fileHasW2) || (extractClass === "w2" && Boolean(existing));
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
  winner: "file" | "document" | "both",
): FoxIntakeDraft {
  const conflict = draft.pendingConflict;
  if (!conflict) return draft;
  const now = new Date().toISOString();
  if (winner === "both") {
    const facts = { ...(draft.facts ?? {}) };
    const current = facts[conflict.field];
    if (current) {
      facts[conflict.field] = { ...current, confirmed: true, confirmedAt: now };
    }
    facts[`${conflict.field}_document`] = {
      field: `${conflict.field}_document`,
      value: conflict.documentValue,
      source: "document",
      confirmed: true,
      confirmedAt: now,
    };
    return {
      ...draft,
      facts,
      pendingConflict: null,
      unresolvedConflict: true,
    };
  }
  if (winner === "file") {
    const facts = { ...(draft.facts ?? {}) };
    const current = facts[conflict.field];
    if (current) {
      facts[conflict.field] = { ...current, confirmed: true, confirmedAt: now };
    }
    return { ...draft, facts, pendingConflict: null, unresolvedConflict: false };
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
  return { ...withValue, facts, pendingConflict: null, unresolvedConflict: false };
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
  if (
    (income === "w2" || income === "both") &&
    receivedClassCount(draft, "w2") === 1 &&
    !hasTwoYearWageHistory(draft)
  ) {
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
  if (stillUsefulVisible(draft)) return layer2AskCopy(draft);
  return labelListCopy(stillUsefulLabels(draft));
}

export function stillUsefulAskKey(draft: FoxIntakeDraft) {
  if (stillUsefulVisible(draft)) {
    return layer2Plan(draft).map((item) => item.id).join("|") || "ready";
  }
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

function hasPnlDocument(draft: FoxIntakeDraft) {
  return draft.documents.some((doc) => /p&l|pnl|profit and loss/i.test(doc.name));
}

function layer2Item(id: string, label: string, ask: string): StillUsefulItem {
  return { id, label, ask };
}

export function completenessFileFromDraft(draft: FoxIntakeDraft): CompletenessFile {
  const received = new Set<string>();
  for (const doc of draft.documents ?? []) {
    if (
      (doc.status === "extracted" || doc.status === "received" || doc.status === "reading") &&
      doc.extractClass
    ) {
      received.add(doc.extractClass);
    }
  }
  if (draft.facts?.property_address?.confirmed && factValue(draft, "property_address")) {
    received.add("property_address");
  }
  if (draft.facts?.institution?.confirmed || draft.facts?.ending_balance?.confirmed) {
    received.add("bank_statement");
  }
  if (draft.facts?.purchase_price?.confirmed || draft.facts?.close_date?.confirmed) {
    received.add("purchase_contract");
  }
  if (draft.facts?.servicer?.confirmed || draft.facts?.unpaid_principal?.confirmed) {
    received.add("mortgage_statement");
  }
  if (factValue(draft, "employer_name")) received.add("employer_business");
  if (draft.facts?.years_in_business?.value) received.add("se_years");
  if (hasPnlDocument(draft)) received.add("ytd_pnl");
  const purchase = purchaseLikeFile(draft);
  const income = draft.incomeType.value;
  return {
    product: draft.productIntent || undefined,
    purposeHint: purchase ? "purchase" : draft.cashOut ? "cash_out" : refiLikeFile(draft) ? "lcor" : undefined,
    incomeType:
      income === "w2"
        ? "w2_base"
        : income === "self-employed"
          ? "se_schedule_c"
          : income === "both"
            ? "w2_plus_se"
            : income || undefined,
    purchasePrice: purchase && draft.propertyValueAmount ? draft.propertyValueAmount : undefined,
    loanAmount: draft.loanAmountValue || undefined,
    propertyValue: draft.propertyValueAmount || undefined,
    received: Array.from(received),
    w2Count: receivedClassCount(draft, "w2"),
    taxReturnCount: receivedTaxReturnCount(draft),
    twoYearWageHistory: hasTwoYearWageHistory(draft),
    variableExtracted: Boolean(
      factValue(draft, "overtime") ||
        factValue(draft, "bonus") ||
        factValue(draft, "commission") ||
        factValue(draft, "overtime_ytd") ||
        factValue(draft, "bonus_ytd") ||
        factValue(draft, "commission_ytd"),
    ),
    hasPnl: received.has("ytd_pnl"),
    k1OrdinaryOnly: k1OrdinaryMissingDistributions(draft),
    hasScheduleC: hasScheduleCCashflow(draft),
    fundsInPlay: Boolean(
      draft.cashOut || factValue(draft, "cash_to_close") || factValue(draft, "reserves"),
    ),
    ...(draft.statedMonthlyDebts != null ? { statedMonthlyDebts: draft.statedMonthlyDebts } : {}),
    ...(draft.statedAvailableAssets != null ? { statedAvailableAssets: draft.statedAvailableAssets } : {}),
    ...(draft.propertyType ? { propertyType: draft.propertyType } : {}),
    ...(draft.subjectAddress ? { subjectAddress: draft.subjectAddress } : {}),
    ...(draft.statedTimeOnJob != null ? { statedTimeOnJob: draft.statedTimeOnJob } : {}),
    ...(draft.statedCurrentHousing != null ? { statedCurrentHousing: draft.statedCurrentHousing } : {}),
    ...(draft.statedDeclaration ? { statedDeclaration: draft.statedDeclaration } : {}),
    ...(draft.statedHousehold ? { statedHousehold: draft.statedHousehold } : {}),
    ...(draft.borrowerName ? { borrowerName: draft.borrowerName } : {}),
    ...(draft.statedOtherReo ? { statedOtherReo: draft.statedOtherReo } : {}),
  };
}

/** After Proceed. Session-one sketch skip does not clear these — only a received item drops. */
export function layer2Open(draft: FoxIntakeDraft) {
  return Boolean(
    draft.sampleAccepted &&
      (draft.motion === "in_queue" ||
        draft.motion === "needs_you" ||
        draft.motion === "escalated" ||
        (draft.events ?? []).some((event) => event.kind === "proceed")),
  );
}

/** Remainder board after the sketch exists. Skip does not hide an item; received does. */
export function stillUsefulVisible(draft: FoxIntakeDraft) {
  return Boolean(draft.path && draft.productIntent && draft.incomeType.value);
}

function incomeDocsPhrase(draft: FoxIntakeDraft) {
  const income = draft.incomeType.value;
  if (income === "w2") {
    return conventionalGuidelinePattern(
      "completeness",
      "income-docs-w2",
      "income docs (latest paystub and W-2)",
    );
  }
  if (income === "both") {
    return conventionalGuidelinePattern(
      "completeness",
      "income-docs-both",
      "income docs (latest paystub, W-2, latest return, and prior-year)",
    );
  }
  if (income === "self-employed" || income === "other") {
    return conventionalGuidelinePattern(
      "completeness",
      "income-docs-self-employed",
      "income docs (latest return, prior-year, and a YTD P&L if you have it)",
    );
  }
  return conventionalGuidelinePattern("completeness", "income-docs", "income docs");
}

/** What Fox names after the sketch — the short list, not a remainder. */
export function shortListSpeak(draft: FoxIntakeDraft): string {
  const labels = ["government ID", incomeDocsPhrase(draft), "property address"];
  if (purchaseLikeFile(draft)) {
    labels.push("purchase contract", "bank statement");
  } else if (refiLikeFile(draft)) {
    labels.push("mortgage statement");
    if (draft.cashOut) labels.push("bank statement");
  }
  return labelListCopy(labels);
}

const LAYER2_COPY: Record<DocumentedStillUsefulId, { label: string; ask: string }> = {
  government_id: { label: "Government ID", ask: "A government ID still helps this file." },
  paystub: { label: "Latest paystub", ask: "A latest paystub still helps this file." },
  w2: { label: "W-2", ask: "A W-2 still helps this file." },
  "second-year-w2": { label: "Second-year W-2", ask: "A second-year W-2 still helps this file." },
  tax_return: { label: "Latest return", ask: "Your latest return still helps this file." },
  "prior-year-return": { label: "Prior-year return", ask: "A prior-year return still helps this file." },
  "k1-distributions": { label: "K-1 distributions", ask: "K-1 distributions still help this file." },
  "ytd-pnl": { label: "YTD P&L", ask: "A YTD P&L helps if you have one." },
  "property-address": {
    label: "Property address",
    ask: "The subject property address still helps this file.",
  },
  purchase_contract: {
    label: "Purchase contract",
    ask: "The purchase contract still helps this file.",
  },
  mortgage_statement: {
    label: "Mortgage statement",
    ask: "A current mortgage statement still helps this file.",
  },
  bank_statement: { label: "Bank statement", ask: "A recent bank statement still helps this file." },
};

export function layer2Plan(draft: FoxIntakeDraft): StillUsefulItem[] {
  return documentedStillUsefulIds(draft.productIntent ?? "", completenessFileFromDraft(draft)).map(
    (id) => {
      const copy = LAYER2_COPY[id];
      return layer2Item(id, copy.label, copy.ask);
    },
  );
}

export function nextStillUsefulItem(draft: FoxIntakeDraft): StillUsefulItem | undefined {
  return layer2Plan(draft)[0];
}

export function stillUsefulSection(draft: FoxIntakeDraft): {
  items: StillUsefulItem[];
  empty: boolean;
} | null {
  if (!stillUsefulVisible(draft)) return null;
  const conditionItems = (draft.conditions ?? [])
    .filter(
      (item) =>
        item.waitingOn === "borrower" &&
        item.status === "open" &&
        item.stillUseful &&
        Boolean(item.foxLine),
    )
    .map((item) => layer2Item(item.id, item.title, item.foxLine));
  const items = [...conditionItems, ...layer2Plan(draft)];
  storeCompleteness(draft.productIntent ?? "", completenessFileFromDraft(draft));
  return { items, empty: items.length === 0 };
}

export function layer2AskCopy(draft: FoxIntakeDraft) {
  const labels = layer2Plan(draft).map((item) => item.label);
  return labels.length ? labelListCopy(labels) : NOTHING_URGENT;
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
  return { ...draft, docsHeld: false };
}

export function missingAskCopy(classes: ExtractClass[]) {
  return missingListCopy(classes);
}

export function missingAskKey(classes: ExtractClass[]) {
  return classes.join("|");
}

export function conflictAskCopy(conflict: FactConflict) {
  if (conflict.field === STATED_AVAILABLE_ASSETS_FIELD) {
    return `The statement shows about ${displayFactValue(conflict.field, conflict.documentValue)}. The file has ${displayFactValue(conflict.field, conflict.fileValue)} typed. ${SUGGESTED_ASSETS_EXTRACT_NOTE}.`;
  }
  if (isPropertyAddressField(conflict.field)) {
    return `The contract shows ${conflict.documentValue}. The file has ${conflict.fileValue} typed. ${SUGGESTED_PROPERTY_NOTE}.`;
  }
  if (conflict.field === STATED_TIME_ON_JOB_FIELD) {
    return `The paystub hire date is about ${displayFactValue(conflict.field, conflict.documentValue)}. The file has ${displayFactValue(conflict.field, conflict.fileValue)} typed. ${SUGGESTED_TIME_ON_JOB_NOTE}.`;
  }
  if (conflict.field === STATED_CURRENT_HOUSING_FIELD) {
    return `The statement shows a current payment of about ${displayFactValue(conflict.field, conflict.documentValue)}. The file has ${displayFactValue(conflict.field, conflict.fileValue)} typed. ${SUGGESTED_HOUSING_NOTE}.`;
  }
  if (isBorrowerNameField(conflict.field)) {
    return `The ID shows ${conflict.documentValue}. The file has ${conflict.fileValue} typed. ${SUGGESTED_BORROWER_NOTE}.`;
  }
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
  if (!debtsSettled(draft)) return null;
  if (!assetsSettled(draft)) return null;
  if (!propertyTypeSettled(draft)) return null;
  if (!timeOnJobSettled(draft)) return null;
  if (!currentHousingSettled(draft)) return null;
  if (!declarationsSettled(draft)) return null;
  if (!householdSettled(draft)) return null;
  if (!borrowerNameSettled(draft)) return null;
  if (!otherReoSettled(draft)) return null;
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

export function conflictActions(conflict?: FactConflict | null): FoxAction[] {
  if (conflict?.field === STATED_AVAILABLE_ASSETS_FIELD) {
    return availableAssetsConflictActions();
  }
  if (conflict && isPropertyAddressField(conflict.field)) {
    return propertyAddressConflictActions();
  }
  if (conflict?.field === STATED_TIME_ON_JOB_FIELD) {
    return timeOnJobConflictActions();
  }
  if (conflict?.field === STATED_CURRENT_HOUSING_FIELD) {
    return currentHousingConflictActions();
  }
  if (conflict && isBorrowerNameField(conflict.field)) {
    return borrowerNameConflictActions();
  }
  return [
    { id: "keep-file-fact", label: "Keep file", event: "bubble", capture: { field: "keep-file-fact" } },
    { id: "use-document-fact", label: "Use document", event: "bubble", capture: { field: "use-document-fact" } },
    { id: "keep-both-facts", label: "Keep both", event: "bubble", capture: { field: "keep-both-facts" } },
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
