import {
  REJECT_LINE,
  LIMIT_LINE,
  MAX_DOC_COUNT,
  isAcceptedFile,
  isUnreadNote,
} from "@/lib/docs/accept";
import type {
  DocSlot,
  DraftField,
  ExtractClass,
  FactConflict,
  FactProposal,
  FactWrite,
  FoxAction,
  FoxIntakeDraft,
  ReceivedDoc,
} from "./types";
import {
  applyQualifyingIncomeFromExtract,
  decliningIncomeCaution,
  hasScheduleCCashflow,
  hasScheduleECashflow,
  hasTwoYearWageHistory,
  k1OrdinaryMissingDistributions,
  maybeProposeQualifyingFromTaxFile,
  isCoverReturnFields,
  hasK1Ordinary,
  isWageExtractFirstPath,
  isWageExtractProposal,
  isStubExtractProposal,
  isStubJobProposal,
  maybeProposeWageExtract,
  maybeProposeStubExtract,
  shouldProposeStubExtract,
  stubExtractAskOpen,
  canSpeakStubExtract,
  employersClose,
  wageExtractFailedRead,
  monthlyQualifyingFromExtract,
  normalizeReturnKind,
  parseExtractMoney,
  readStubAmount,
  readTaxCashflows,
  skipWageDocs,
  wageIncomeCaution,
  wageThreadOpen,
} from "./qualifyingIncome";
import { bankEndingBalanceAmount } from "@/lib/docs/bankBalance";
import { safeAccountLast4 } from "@/lib/docs/bankLast4";
import {
  applyRentalIncomeFromExtract,
  draftHasLease,
  draftHasScheduleE,
  draftHasUnsupportedRental,
  draftNeedsReoStatement,
  draftRentalNamed,
} from "./rentalIncome";
import {
  RENTAL_DOCS_WOULD_HELP,
  namedCondoIneligible,
  namedCondoLanguage,
  namedNewOrConvertedCondo,
} from "@/lib/guidelines/conventional";
import {
  completeness as storeCompleteness,
  conventionalGuidelinePattern,
  documentedStillUsefulIds,
  EMPLOYER_MISMATCH_LINE,
  type CompletenessFile,
  type DocumentedStillUsefulId,
} from "@/lib/guidelines/conventional";
import {
  STATED_AVAILABLE_ASSETS_FIELD,
  SUGGESTED_ASSETS_EXTRACT_NOTE,
  availableAssetsConflictActions,
  displayInstitution,
  proposeExtractedAvailableAssets,
  statementExtractConfirmed,
} from "./availableAssets";
import {
  PROPERTY_ADDRESS_FACT,
  SUGGESTED_PROPERTY_NOTE,
  isPropertyAddressField,
  parsePropertyType,
  propertyAddressConflictActions,
  adoptStreetOverZipOnly,
  displayedSubjectAddress,
  isPlaceAddressProposal,
  isZipOnlyFileAddress,
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
} from "./timeOnJob";
import {
  STATED_CURRENT_HOUSING_FIELD,
  SUGGESTED_HOUSING_NOTE,
  currentHousingConflictActions,
  proposeExtractedCurrentHousing,
} from "./currentHousing";
import {
  BORROWER_NAME_FIELD,
  borrowerNameConflictActions,
  borrowerNameSettled,
  displayBorrowerName,
  governmentIdSkipped,
  isBorrowerNameConfirmPending,
  isBorrowerNameField,
  proposeExtractedBorrowerName,
  SUGGESTED_BORROWER_NOTE,
  writeBorrowerName,
} from "./borrowerName";
import {
  proposeExtractedCoborrowerName,
  skipCoborrowerId,
} from "./coborrowerName";
import {
  STATED_OTHER_REO_FIELD,
  appendOtherReoRow,
  isFileNetConfirmPending,
  isOtherPropertyMortgageExtract,
  maybeProposeOtherReoFileNet,
  otherReoFileNetNeedsStatement,
  proposeExtractedOtherPropertyPayment,
  proposeExtractedOtherReo,
} from "./otherReo";
import { writeCurrentEmploymentHistory } from "./fileHistory";

export { REJECT_LINE, LIMIT_LINE };

export const LOW_EXTRACT_CONFIDENCE = 0.55;

export const EXTRACT_SCHEMA_KEYS: Record<ExtractClass, readonly string[]> = {
  government_id: [
    "full_name",
    "id_last4",
    "state",
    "expiration",
    "coborrower_name",
    "spouse_name",
    "present_address",
  ],
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
  w2: [
    "tax_year",
    "employer_name",
    "wages",
    "medicare_wages",
    "box5",
    "federal_withheld",
    "overtime",
    "bonus",
    "commission",
    "second_employer_name",
    "hire_date",
  ],
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
    "schedule_e_rents_received",
    "schedule_e_cash_expenses",
    "schedule_e_part2_names",
    "schedule_e_property_address",
    "entity_ordinary_income",
    "entity_8825_rental",
    "entity_depreciation",
    "entity_amortization",
    "entity_te",
    "entity_guaranteed_payments",
    "ownership_percent",
    "entity_taxable_income",
    "entity_name",
    "cover_schedules",
  ],
  bank_statement: ["institution", "period_end", "ending_balance", "account_type", "account_last4", "present_address"],
  purchase_contract: [
    "property_address",
    "purchase_price",
    "close_date",
    "seller_credit",
    "inspection_contingency",
    "loan_contingency",
    "appraisal_contingency",
    "addenda",
    "property_type",
    "year_built",
    "units",
    "annual_taxes",
    "hoa_monthly",
  ],
  mortgage_statement: [
    "servicer",
    "unpaid_principal",
    "current_pi",
    "property_address",
    "occupancy",
    "year_built",
    "annual_taxes",
    "hoa_monthly",
    "lease_gross",
    "gross_monthly_rent",
    "monthly_rent",
  ],
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
  "seller_credit",
  "unpaid_principal",
  "current_pi",
  "income",
  "qualifying_income",
  "paystub_monthly",
  "w2_monthly",
  "rental_income",
  "rental_gross_monthly",
  "rental_pitia_used",
  "suggested_net_rental",
  "suggestedFileNet",
  "lease_gross",
  "gross_monthly_rent",
  "monthly_rent",
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
  "entity_ordinary_income",
  "entity_8825_rental",
  "entity_depreciation",
  "entity_amortization",
  "entity_te",
  "entity_guaranteed_payments",
  "entity_taxable_income",
  "schedule_e_rents_received",
  "schedule_e_cash_expenses",
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
  "schedule_e_rents_received",
  "schedule_e_cash_expenses",
  "schedule_e_part2_names",
  "schedule_e_property_address",
  "entity_ordinary_income",
  "entity_8825_rental",
  "entity_depreciation",
  "entity_amortization",
  "entity_te",
  "entity_guaranteed_payments",
  "ownership_percent",
  "entity_taxable_income",
  "entity_name",
  "cover_schedules",
]);

const DROP_FIELD_KEYS =
  /^(ssn|social|social_security|account|account_number|routing|routing_number|card|cin|dl|dl_number|daq|license|license_number|full_ssn|full_account|date_of_birth|dob)$/i;
const CA_DL_NUMBER_RE = /^[A-Z]\d{7}$/i;
const SSN_RE = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/;
const LONG_ACCOUNT_RE = /\b\d{8,17}\b/;
const DATE_KEYS = new Set([
  "expiration",
  "pay_period_end",
  "period_end",
  "close_date",
  "tax_year",
  "hire_date",
  "inspection_contingency",
  "loan_contingency",
  "appraisal_contingency",
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
  if (/purchase.?contract|purchase.?agree|\bpsa\b/i.test(name)) return "purchase_contract";
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
  if (kind === "k1" || kind === "1065" || kind === "1120s" || kind === "1120" || kind === "schedule_c" || kind === "schedule_e") {
    return true;
  }
  if (isCoverReturnFields(fields)) return true;
  if (String(fields.k1_ordinary_income ?? "").trim()) return true;
  if (String(fields.entity_ordinary_income ?? "").trim()) return true;
  if (String(fields.schedule_c_net_profit ?? "").trim()) return true;
  if (String(fields.schedule_e_rents_received ?? "").trim()) return true;
  return false;
}

export function looksLikeMortgageFields(
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  if (!fields) return false;
  if (String(fields.current_pi ?? "").trim()) return true;
  return Boolean(String(fields.servicer ?? "").trim() && String(fields.unpaid_principal ?? "").trim());
}

export function looksLikeIdFields(
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  return Boolean(fields && String(fields.full_name ?? "").trim());
}

/** Institution or ending balance — last4 alone is not a lock. */
export function looksLikeBankFields(
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  const value = (key: string) => String(fields?.[key] ?? "").trim();
  return Boolean(value("institution") || value("ending_balance"));
}

export function looksLikeContractFields(
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  const value = (key: string) => String(fields?.[key] ?? "").trim();
  return Boolean(value("property_address") || value("purchase_price") || value("close_date") || value("seller_credit"));
}

export function hasLockedSuggestion(
  extractClass: ExtractClass,
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  const value = (key: string) => String(fields?.[key] ?? "").trim();
  if (extractClass === "government_id") return Boolean(value("full_name"));
  if (extractClass === "bank_statement") {
    return Boolean(value("institution") || value("ending_balance") || value("present_address"));
  }
  if (extractClass === "paystub") {
    return Boolean(
      value("employer_name") || value("gross_period") || value("ytd_gross") || value("pay_period_end"),
    );
  }
  if (extractClass === "w2") {
    return Boolean(
      value("employer_name") ||
        value("medicare_wages") ||
        value("box5") ||
        value("wages"),
    );
  }
  if (extractClass === "purchase_contract") return looksLikeContractFields(fields);
  if (extractClass === "tax_return") {
    const kind = normalizeReturnKind(String(fields?.return_kind ?? ""));
    if (kind === "schedule_e") {
      return Boolean(value("schedule_e_rents_received") && value("schedule_e_cash_expenses"));
    }
    if (kind === "1120") {
      return Boolean(String(fields?.return_kind ?? "").trim());
    }
    if (isCoverReturnFields(fields)) {
      return Boolean(value("tax_year") || value("cover_schedules"));
    }
    if (kind === "k1" || kind === "1065" || kind === "1120s") {
      return Boolean(
        String(fields?.k1_ordinary_income ?? "").trim() || String(fields?.entity_ordinary_income ?? "").trim(),
      );
    }
  }
  return Object.values(fields ?? {}).some((item) => String(item ?? "").trim());
}

export function scheduleECashFlowMissingFromExtract(
  fields?: Record<string, string | null | undefined> | null,
) {
  const kind = normalizeReturnKind(String(fields?.return_kind ?? ""));
  if (kind !== "schedule_e") return false;
  return (
    !String(fields?.schedule_e_rents_received ?? "").trim() ||
    !String(fields?.schedule_e_cash_expenses ?? "").trim()
  );
}

export function k1OrdinaryMissingFromExtract(
  fields?: Record<string, string | null | undefined> | null,
  name?: string,
) {
  if (isCoverReturnFields(fields)) return false;
  const kind = normalizeReturnKind(String(fields?.return_kind ?? ""));
  const namedK1 = kind === "k1" || kind === "1065" || kind === "1120s";
  const filenameK1 = /k-?1/i.test(name ?? "");
  if (String(fields?.entity_ordinary_income ?? "").trim() || kind === "1120") return false;
  if (!namedK1 && !filenameK1) return false;
  return !String(fields?.k1_ordinary_income ?? "").trim();
}

export function looksLikePaystubFields(
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  const value = (key: string) => String(fields?.[key] ?? "").trim();
  if (value("gross_period") && value("pay_frequency")) return true;
  if (value("employer_name") && value("gross_period")) return true;
  return Boolean(value("gross_period") && value("pay_period_end"));
}

export function promoteExtractClass(
  extractClass: ExtractClass,
  fields?: Record<string, string | null | undefined> | null,
): ExtractClass {
  if (extractClass !== "other") return extractClass;
  if (looksLikeTaxReturnFields(fields)) return "tax_return";
  if (looksLikeMortgageFields(fields)) return "mortgage_statement";
  if (looksLikePaystubFields(fields)) return "paystub";
  if (looksLikeIdFields(fields)) return "government_id";
  if (looksLikeBankFields(fields)) return "bank_statement";
  if (looksLikeContractFields(fields)) return "purchase_contract";
  return extractClass;
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
  if (extractClass === "purchase_contract") return "Purchase contract";
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
  if (extractClass === "paystub") return "latest two paystubs";
  if (extractClass === "w2") return "W-2 most recent two years";
  return extractClassLabel(extractClass);
}

export function incomeRequestedClasses(income?: string | null): ExtractClass[] {
  const out: ExtractClass[] = ["government_id"];
  if (income === "w2" || income === "both" || !income) {
    out.push("paystub", "w2");
  }
  if (income === "self-employed" || income === "other" || income === "both") {
    out.push("tax_return");
  }
  return out;
}

export const REMAINDER_CONFIRM_FIELDS = new Set([
  "property_address",
  "purchase_price",
  "close_date",
  "seller_credit",
  "inspection_contingency",
  "loan_contingency",
  "appraisal_contingency",
  "addenda",
  "institution",
  "period_end",
  "ending_balance",
  "account_type",
  "account_last4",
  "servicer",
  "unpaid_principal",
  "current_pi",
  "property_type",
  "year_built",
  "units",
  "annual_taxes",
  "hoa_monthly",
]);

export function isRemainderConfirmField(field: string) {
  return REMAINDER_CONFIRM_FIELDS.has(field);
}

export function remainderProposalFromWrites(
  extractClass: ExtractClass,
  writes: { field: string; value: string }[],
): FactProposal | null {
  let usable = writes.filter((item) => item.field && item.value);
  if (extractClass === "purchase_contract") {
    const rank = ["property_address", "purchase_price", "close_date", "seller_credit"];
    usable = [...usable].sort((a, b) => {
      const ai = rank.indexOf(a.field);
      const bi = rank.indexOf(b.field);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }
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
  if (field === "schedule_e_rents_received") return "Schedule E rents received";
  if (field === "schedule_e_cash_expenses") return "Schedule E cash expenses";
  if (field === "schedule_e_part2_names") return "Schedule E Part II names";
  if (field === "schedule_e_property_address") return "Schedule E property";
  if (field === "qualifying_income") return "qualifying income";
  if (field === "paystub_monthly") return "paystub monthly";
  if (field === "w2_monthly") return "W-2 monthly";
  if (field === "income_caution") return "income caution";
  if (field === "rental_income") return "Suggested rental income";
  if (field === "rental_gross_monthly") return "Suggested rental (gross)";
  if (field === "rental_pitia_used") return "PITIA used to net";
  if (field === "suggested_net_rental") return "Suggested net rental";
  if (field === "suggestedFileNet") return "File net";
  if (field === "rental_net_role") return "Rental net role";
  if (field === "institution") return "institution";
  if (field === "period_end") return "period end";
  if (field === "account_type") return "account type";
  if (field === "account_last4") return "account last 4";
  if (field === "ending_balance") return "ending balance";
  if (field === "property_address" || field === "subjectAddress") return "property";
  if (field === "present_address") return "present address";
  if (field === "property_type") return "property type";
  if (field === "year_built") return "year built";
  if (field === "units") return "units";
  if (field === "annual_taxes") return "annual taxes";
  if (field === "hoa_monthly") return "HOA dues";
  if (field === "occupancy") return "occupancy";
  if (field === "purchase_price") return "purchase price";
  if (field === "close_date") return "close date";
  if (field === "seller_credit") return "seller credit";
  if (field === "inspection_contingency") return "inspection contingency";
  if (field === "loan_contingency") return "loan contingency";
  if (field === "appraisal_contingency") return "appraisal contingency";
  if (field === "addenda") return "addenda";
  if (field === "servicer") return "servicer";
  if (field === "unpaid_principal") return "unpaid principal";
  if (field === "current_pi") return "current P&I";
  if (field === "income") return "income";
  if (field === STATED_AVAILABLE_ASSETS_FIELD) return "Stated available assets";
  if (field === STATED_TIME_ON_JOB_FIELD) return "Time on job";
  if (field === STATED_CURRENT_HOUSING_FIELD) return "Current housing";
  if (field === "statedDeclaration") return "Declarations";
  if (field === "declarationTiming") return "Event timing";
  if (field === "statedHousehold") return "Household";
  if (field === "coborrowerName" || field === "coborrower_name" || field === "spouse_name") {
    return "Borrower 2";
  }
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

function looksLikeContractStreet(value: string) {
  const t = value.trim();
  if (!t || isZipOnlyFileAddress(t)) return false;
  if (!/^\d{1,6}\s+[A-Za-z]/.test(t)) return false;
  return /\b(ST|STREET|AVE|AVENUE|BLVD|RD|ROAD|LN|LANE|DR|DRIVE|WAY|CT|COURT|PL|PLACE)\b/i.test(t);
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
    let value = String(rawValue ?? "").trim();
    if (!value) continue;
    if (key === "asset_accounts") {
      continue;
    }
    if (extractClass === "purchase_contract") {
      if (
        key === "seller_credits" ||
        key === "seller_concession" ||
        key === "seller_concessions" ||
        key === "concession" ||
        key === "credit_to_buyer" ||
        key === "buyer_credit" ||
        key === "seller_credit_amount"
      ) {
        if (!next.seller_credit) next.seller_credit = value;
        continue;
      }
      if (
        key === "subject_property" ||
        key === "subject_address" ||
        key === "premises" ||
        key === "property_street" ||
        key === "subject_property_address" ||
        key === "property" ||
        key === "address"
      ) {
        if (!next.property_address && looksLikeContractStreet(value)) {
          next.property_address = value;
        }
        continue;
      }
    }
    if (allowed.size && !allowed.has(key)) continue;
    if (key === "fico" || key === "credit" || key === "credit_score") continue;
    if (extractClass === "bank_statement" && key === "account_number") {
      continue;
    }
    if (extractClass === "bank_statement" && key === "ending_balance") {
      value = bankEndingBalanceAmount(value);
      if (!value) continue;
    }
    if (key === "account_last4") {
      if (CA_DL_NUMBER_RE.test(value.replace(/\s+/g, ""))) continue;
      const last4 = safeAccountLast4(value.split(/[,;·]/)[0]?.trim() ?? "");
      if (!last4) continue;
      next.account_last4 = last4;
      continue;
    }
    if (key === "id_last4") {
      if (CA_DL_NUMBER_RE.test(value.replace(/\s+/g, ""))) continue;
      value = last4Only(value);
      if (!value) continue;
      next[key] = value;
      continue;
    }
    if (CA_DL_NUMBER_RE.test(value.replace(/\s+/g, ""))) continue;
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
  if (extractClass === "purchase_contract") {
    const credit = next.seller_credit;
    if (credit) {
      const n = parseExtractMoney(credit);
      if (n != null && n > 0) next.seller_credit = String(Math.round(n));
      else delete next.seller_credit;
    }
    if (next.property_address && isZipOnlyFileAddress(next.property_address)) {
      delete next.property_address;
    }
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
  if (field === "citizenship") {
    if (value === "us_citizen") return "US citizen";
    if (value === "permanent_resident") return "Permanent resident";
    if (value === "other") return "Other";
  }
  if (field === STATED_TIME_ON_JOB_FIELD) {
    const months = Number(value);
    if (Number.isFinite(months) && months > 0) return displayTimeOnJob(months);
  }
  if (field === "suggested_net_rental" || field === "suggestedFileNet") {
    const n = moneyNumber(value);
    if (n != null) {
      const abs = Math.abs(Math.round(n)).toLocaleString("en-US");
      return n < 0 ? `−$${abs}` : `$${abs}`;
    }
  }
  if (field === "close_date") {
    const spoken = spokenCloseDate(value);
    if (spoken) return spoken;
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

function spokenCloseDate(value: string) {
  const t = value.trim();
  if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(t)) return t;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const year = iso ? Number(iso[1]) : us ? Number(us[3]) : NaN;
  const month = iso ? Number(iso[2]) : us ? Number(us[1]) : NaN;
  const day = iso ? Number(iso[3]) : us ? Number(us[2]) : NaN;
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return "";
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[month - 1]} ${day}, ${year}`;
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
    const value = draft.subjectAddress || draft.facts?.property_address?.value || "";
    if (isZipOnlyFileAddress(value, draft.propertyZip)) return null;
    return { value, via: "structure" };
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
  const written = {
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
    ...(isPropertyAddressField(field)
      ? { subjectAddress: value, subjectAddressAsked: true, pendingAddress: undefined }
      : {}),
    ...(field === "year_built" ? { propertyYearBuilt: value } : {}),
    ...(field === "units" ? { propertyUnits: value } : {}),
    ...(field === "annual_taxes" ? { propertyTaxes: value } : {}),
    ...(field === "hoa_monthly" ? { propertyHoa: value } : {}),
    ...(field === "property_type" && parsePropertyType(value)
      ? { propertyType: parsePropertyType(value) ?? draft.propertyType, propertyTypeAsked: true }
      : {}),
    ...(field === STATED_TIME_ON_JOB_FIELD && Number.isFinite(Number(value)) && Number(value) > 0
      ? {
          statedTimeOnJob: Math.round(Number(value)),
          statedTimeOnJobLabel: String(Math.round(Number(value))),
          timeOnJobAsked: true,
        }
      : {}),
    ...(field === STATED_CURRENT_HOUSING_FIELD && Number.isFinite(Number(value)) && Number(value) > 0
      ? { statedCurrentHousing: Math.round(Number(value)), currentHousingAsked: true }
      : {}),
  };
  return isPropertyAddressField(field) ? adoptStreetOverZipOnly(draft, written) : written;
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
    (input.confidence < LOW_EXTRACT_CONFIDENCE &&
      !looksLikeTaxReturnFields(input.fields) &&
      !looksLikeMortgageFields(input.fields) &&
      !looksLikeIdFields(input.fields) &&
      !looksLikePaystubFields(input.fields) &&
      !looksLikeBankFields(input.fields))
  ) {
    return { draft, writes, conflict: null, quietLines: [] };
  }
  const fields = sanitizeExtractedFields(extractClass, input.fields);
  const computed = monthlyQualifyingFromExtract(draft, extractClass, fields);
  const now = new Date().toISOString();
  const wageExtractFirst =
    isWageExtractFirstPath(draft) && (extractClass === "w2" || extractClass === "paystub");
  const holdWageFileWrites =
    wageThreadOpen(draft) &&
    !draft.sampleAccepted &&
    (extractClass === "w2" || extractClass === "paystub");
  let next = draft;
  let conflict: FactConflict | null = draft.pendingConflict ?? null;
  let remainderWrites: { field: string; value: string }[] = [];
  const payConfirmWrites: { field: string; value: string }[] = [];
  let idAddress = "";
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
  const PAY_CONFIRM_FIELDS = new Set(["employer_name", "pay_period_end", "gross_period", "ytd_gross"]);
  const WAGE_EXTRACT_HOLD_KEYS = new Set<string>([
    ...EXTRACT_SCHEMA_KEYS.w2,
    ...EXTRACT_SCHEMA_KEYS.paystub,
    "w2_box5",
    "paystub_amount",
  ]);
  const coverReturn = isCoverReturnFields(fields);
  for (const field of EXTRACT_SCHEMA_KEYS[extractClass]) {
    const value = fields[field];
    if (!value) continue;
    if (coverReturn && field !== "tax_year" && field !== "return_kind" && field !== "cover_schedules") continue;
    if (
      coverReturn &&
      field === "return_kind" &&
      String(next.facts?.return_kind?.value ?? "").trim() &&
      String(next.facts?.return_kind?.value ?? "").trim().toLowerCase() !== "cover"
    ) {
      continue;
    }
    if ((wageExtractFirst || holdWageFileWrites) && WAGE_EXTRACT_HOLD_KEYS.has(field)) continue;
    if (
      extractClass === "w2" &&
      field === "employer_name" &&
      existingEmployer &&
      incomingEmployer &&
      incomingEmployer !== existingEmployer
    ) {
      if (!conflict) {
        conflict = {
          field: "employer_name",
          fileValue: String(draft.facts?.employer_name?.value ?? ""),
          documentValue: value,
          label: factLabel("employer_name"),
          kind: "document",
        };
      }
      continue;
    }
    if (keepPrimaryPay && PRIMARY_PAY_KEYS.has(field)) continue;
    if (field === HIRE_DATE_FIELD) continue;
    if (extractClass === "government_id" && (field === "full_name" || field === "date_of_birth" || field === "dob")) continue;
    if (extractClass === "government_id" && field === "present_address") {
      idAddress = value;
      continue;
    }
    if (
      extractClass === "government_id" &&
      (field === "state" ||
        field === "street" ||
        field === "city" ||
        field === "zip" ||
        field === "propertyZip" ||
        field === "subjectAddress" ||
        field === "property_address")
    ) {
      continue;
    }
    if (
      extractClass === "bank_statement" &&
      (field === "present_address" || field === "property_address" || field === "subjectAddress")
    ) {
      continue;
    }
    if (extractClass === "bank_statement" && (field === "account_type" || field === "period_end")) {
      continue;
    }
    if (extractClass === "paystub" && PAY_CONFIRM_FIELDS.has(field)) {
      const existingPay = existingFact(next, field);
      const typedIncome =
        existingPay?.via === "income" || existingPay?.via === "qualifying_income";
      if (typedIncome) {
        // Typed / qualifying income already on the File — use the existing confirm.
      } else if (!existingPay) {
        payConfirmWrites.push({ field, value });
        continue;
      } else if (valuesMatch(existingPay.value, value)) {
        continue;
      }
    }
    if (
      extractClass === "mortgage_statement" &&
      isOtherPropertyMortgageExtract(next, {
        address: String(fields.property_address ?? "").trim() || undefined,
      })
    ) {
      continue;
    }
    if (isRemainderConfirmField(field)) {
      if (
        extractClass === "mortgage_statement" &&
        isOtherPropertyMortgageExtract(next, {
          address: String(fields.property_address ?? "").trim() || undefined,
        })
      ) {
        continue;
      }
      if (
        extractClass === "mortgage_statement" &&
        field === "property_address" &&
        draft.statedOtherReo === "yes"
      ) {
        continue;
      }
      const existingRemainder = existingFact(next, field);
      if (
        extractClass === "purchase_contract" &&
        field === "property_address" &&
        isZipOnlyFileAddress(value, next.propertyZip)
      ) {
        continue;
      }
      if (
        extractClass === "purchase_contract" &&
        field === "property_address" &&
        existingRemainder &&
        isZipOnlyFileAddress(existingRemainder.value, next.propertyZip)
      ) {
        remainderWrites.push({ field, value });
        continue;
      }
      if (!existingRemainder) {
        remainderWrites.push({ field, value });
        continue;
      }
      if (valuesMatch(existingRemainder.value, value)) {
        if (
          extractClass === "purchase_contract" &&
          (field === "purchase_price" || field === "close_date" || field === "seller_credit")
        ) {
          remainderWrites.push({ field, value });
        }
        continue;
      }
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
      if (
        field === "schedule_e_rents_received" ||
        field === "schedule_e_cash_expenses" ||
        field === "schedule_e_property_address" ||
        field === "entity_ordinary_income" ||
        field === "entity_8825_rental" ||
        field === "entity_depreciation" ||
        field === "entity_amortization" ||
        field === "entity_te" ||
        field === "entity_guaranteed_payments" ||
        field === "ownership_percent" ||
        field === "entity_taxable_income" ||
        field === "entity_name"
      ) {
        continue;
      }
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
  const stubAlreadyOnFile =
    Boolean(readStubAmount(draft)) ||
    Boolean(draft.wageFrequencyAsked) ||
    Boolean(draft.awaitingPayFrequency);
  if (shouldProposeStubExtract(draft, extractClass)) {
    const employee = String(input.fields.full_name ?? input.fields.employee_name ?? "").trim();
    next = maybeProposeStubExtract(
      { ...next, pendingConflict: null, awaitingPayFrequency: false },
      employee ? { ...fields, full_name: employee } : fields,
      extractClass,
    );
    conflict = next.pendingConflict ?? null;
  } else if (wageExtractFirst || (holdWageFileWrites && extractClass === "w2" && !stubAlreadyOnFile)) {
    next = maybeProposeWageExtract(
      { ...next, pendingConflict: null, awaitingPayFrequency: false },
      fields,
      extractClass,
    );
    conflict = next.pendingConflict ?? null;
  } else if (!coverReturn) {
    next = applyQualifyingIncomeFromExtract(
      { ...next, pendingConflict: conflict },
      extractClass,
      fields,
      computed,
    );
    conflict = next.pendingConflict ?? conflict;
  }
  const otherPropertyMortgageEarly =
    extractClass === "mortgage_statement" &&
    isOtherPropertyMortgageExtract(next, {
      address: String(fields.property_address ?? "").trim() || undefined,
    });
  if (
    !otherPropertyMortgageEarly &&
    !(
      String(fields.schedule_e_rents_received ?? "").trim() &&
      String(fields.schedule_e_cash_expenses ?? "").trim()
    )
  ) {
    next = applyRentalIncomeFromExtract(next, extractClass, fields);
  }
  conflict = next.pendingConflict ?? conflict;
  if (extractClass === "bank_statement") {
    remainderWrites = remainderWrites.filter(
      (item) =>
        item.field === "institution" ||
        item.field === "ending_balance" ||
        item.field === "account_last4",
    );
  }
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
      const institution = displayInstitution(String(fields.institution ?? "").trim());
      const last4 = String(fields.account_last4 ?? "").trim();
      next = proposeExtractedAvailableAssets(
        next,
        extractedAssets,
        [
          ...(institution
            ? [{ field: "institution", value: institution, label: factLabel("institution") }]
            : []),
          ...(last4
            ? [{ field: "account_last4", value: last4, label: factLabel("account_last4") }]
            : []),
          {
            field: "ending_balance",
            value: String(extractedAssets),
            label: factLabel("ending_balance"),
          },
        ],
      );
      remainderWrites.length = 0;
    }
  }
  const rawHire =
    !wageExtractFirst &&
    !isStubExtractProposal(next.pendingProposal) &&
    (extractClass === "paystub" || extractClass === "w2")
      ? String(fields.hire_date ?? "").trim()
      : "";
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
  const otherPropertyMortgage =
    extractClass === "mortgage_statement" &&
    isOtherPropertyMortgageExtract(next, {
      address: String(fields.property_address ?? "").trim() || undefined,
    });
  if (extractedHousing != null && !otherPropertyMortgage) {
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
    const extras: { field: string; value: string; label: string }[] = [];
    if (idAddress) {
      extras.push({ field: "present_address", value: idAddress, label: factLabel("present_address") });
    }
    if (next.workingOnCoborrower && !next.pendingConflict) {
      const existingCoborrower = (next.coborrowerName || "").trim();
      if (existingCoborrower && !valuesMatch(existingCoborrower, shown) && !conflict) {
        conflict = {
          field: "coborrowerName",
          fileValue: displayBorrowerName(existingCoborrower),
          documentValue: shown,
          label: "Borrower 2",
          kind: "document",
        };
        next = { ...next, pendingConflict: conflict };
      } else if (!existingCoborrower) {
        next = proposeExtractedCoborrowerName(next, shown, extras);
      }
    } else {
      const existingName = (next.borrowerName || next.contact.fullName.value || "").trim();
      if (existingName && !valuesMatch(existingName, shown) && !conflict) {
        conflict = {
          field: BORROWER_NAME_FIELD,
          fileValue: displayBorrowerName(existingName),
          documentValue: shown,
          label: "Borrower",
          kind: "document",
        };
        next = { ...next, pendingConflict: conflict };
      } else if (!existingName && !next.pendingConflict && !governmentIdSkipped(next)) {
        next = proposeExtractedBorrowerName(next, shown, extras);
      }
    }
  }
  if (extractClass === "government_id" && idAddress && !extractedName && !next.pendingConflict) {
    // Residence only. Never a subject / On the file. remainder.
  }
  const extractedEmployer = String(fields.employer_name ?? "").trim();
  if (
    !wageExtractFirst &&
    !isWageExtractProposal(next.pendingProposal) &&
    !isStubExtractProposal(next.pendingProposal) &&
    !isStubJobProposal(next.pendingProposal) &&
    (extractClass === "paystub" || extractClass === "w2") &&
    extractedEmployer
  ) {
    const already = (next.employmentHistory ?? []).some((item) =>
      employersClose(item.label, extractedEmployer),
    );
    if (!already) {
      next = writeCurrentEmploymentHistory(next, extractedEmployer);
    }
  }
  if (
    payConfirmWrites.length &&
    !wageExtractFirst &&
    !isWageExtractProposal(next.pendingProposal) &&
    !isStubExtractProposal(next.pendingProposal) &&
    !isStubJobProposal(next.pendingProposal)
  ) {
    const extras = payConfirmWrites.map((item) => ({
      field: item.field,
      value: item.value,
      label: factLabel(item.field),
    }));
    if (next.pendingProposal) {
      next = {
        ...next,
        pendingProposal: {
          ...next.pendingProposal,
          extras: [...(next.pendingProposal.extras ?? []), ...extras],
        },
      };
    } else if (!next.pendingConflict) {
      const payProposal = remainderProposalFromWrites(extractClass, payConfirmWrites);
      if (payProposal) {
        next = {
          ...next,
          pendingProposal: { ...payProposal, note: SUGGESTED_BORROWER_NOTE },
        };
      }
    } else {
      const openConflict = next.pendingConflict;
      for (const item of payConfirmWrites) {
        if (openConflict && item.field !== openConflict.field && item.field === "employer_name") {
          next = writeField(next, item.field, item.value, now);
          writes.push(item);
        }
      }
    }
  }
  if (
    extractClass === "mortgage_statement" &&
    isOtherPropertyMortgageExtract(next, {
      address: String(fields.property_address ?? "").trim() || undefined,
    })
  ) {
    const occupancy = String(fields.occupancy ?? "").trim() || undefined;
    next = appendOtherReoRow(next, {
      address: String(fields.property_address ?? "").trim() || undefined,
      unpaidPrincipal: String(fields.unpaid_principal ?? "").trim() || undefined,
      payment: String(fields.current_pi ?? "").trim() || undefined,
      occupancy,
      leaseGross:
        String(fields.lease_gross ?? fields.gross_monthly_rent ?? fields.monthly_rent ?? "").trim() ||
        undefined,
    });
    next = maybeProposeOtherReoFileNet(next);
    if (
      extractedHousing != null &&
      !next.pendingConflict &&
      !isFileNetConfirmPending(next) &&
      (!next.pendingProposal || next.pendingProposal.field === "otherReoPayment")
    ) {
      next = proposeExtractedOtherPropertyPayment(next, extractedHousing);
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
  if (extractClass === "purchase_contract") {
    if (isPlaceAddressProposal(next.pendingProposal)) {
      next = { ...next, pendingProposal: null, pendingAddress: undefined };
    } else {
      next = { ...next, pendingAddress: undefined };
    }
    const have = new Set(remainderWrites.map((item) => item.field));
    const street = String(fields.property_address ?? "").trim();
    if (
      street &&
      !isZipOnlyFileAddress(street, next.propertyZip) &&
      !have.has("property_address") &&
      conflict?.field !== "property_address"
    ) {
      remainderWrites.push({ field: "property_address", value: street });
    }
    const close = String(fields.close_date ?? "").trim();
    if (close && !have.has("close_date") && conflict?.field !== "close_date") {
      remainderWrites.push({ field: "close_date", value: close });
    }
    const credit = String(fields.seller_credit ?? "").trim();
    const creditAmount = moneyNumber(credit);
    if (
      credit &&
      creditAmount != null &&
      creditAmount > 0 &&
      !have.has("seller_credit") &&
      conflict?.field !== "seller_credit"
    ) {
      remainderWrites.push({ field: "seller_credit", value: credit });
    }
    next = { ...next, lastPurchaseContractFields: { ...fields } };
  }
  if (
    remainderWrites.length &&
    (!next.pendingProposal || isRemainderConfirmField(next.pendingProposal.field))
  ) {
    const remainder = remainderProposalFromWrites(extractClass, remainderWrites);
    if (remainder) {
      next = {
        ...next,
        pendingProposal: remainder,
        ...(extractClass === "purchase_contract" ? { pendingAddress: undefined } : {}),
      };
    }
  }
  if (conflict && !next.pendingConflict) {
    next = { ...next, pendingConflict: conflict };
  }
  next = attachExtractClass(next, extractClass);
  const cautionFacts = { ...(next.facts ?? {}) };
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    const already = cautionFacts[key];
    if (
      key === "schedule_e_rents_received" ||
      key === "schedule_e_cash_expenses" ||
      key === "schedule_e_property_address" ||
      key === "entity_ordinary_income" ||
      key === "entity_8825_rental" ||
      key === "entity_depreciation" ||
      key === "entity_amortization" ||
      key === "entity_te" ||
      key === "entity_guaranteed_payments" ||
      key === "ownership_percent" ||
      key === "entity_taxable_income" ||
      key === "entity_name"
    ) {
      continue;
    }
    if (key === "property_address") {
      if (isZipOnlyFileAddress(value, next.propertyZip) || already?.value) continue;
    } else if (already?.confirmed && already.value) {
      continue;
    } else if (already?.value && key !== "seller_credit") {
      continue;
    }
    cautionFacts[key] = {
      field: key,
      value,
      source: "extracted-unconfirmed",
      confirmed: false,
    };
  }
  const cautionDraft = { ...next, facts: cautionFacts };
  const caution = decliningIncomeCaution(cautionDraft) ?? wageIncomeCaution(cautionDraft);
  const quietLines = caution ? [caution] : [];
  if (
    employerMismatchStay(draft, extractClass, fields) &&
    !isStubExtractProposal(next.pendingProposal) &&
    !isStubJobProposal(next.pendingProposal) &&
    !quietLines.includes(EMPLOYER_MISMATCH_LINE)
  ) {
    quietLines.push(EMPLOYER_MISMATCH_LINE);
  }
  if (!coverReturn) next = maybeProposeQualifyingFromTaxFile(next);
  const holdLooksRight =
    !coverReturn || Boolean(next.pendingProposal || conflict || next.pendingConflict);
  return {
    draft: { ...next, looksRightHold: holdLooksRight },
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
  if (employersClose(fields.employer_name, draft.facts?.employer_name?.value)) return false;
  // W-2-only drop never invents a stub or a stub-employer mismatch.
  if (extractClass !== "paystub") return false;
  const fileHasW2 =
    receivedClassCount(draft, "w2") > 0 || Boolean(String(draft.facts?.wages?.value ?? "").trim());
  return fileHasW2;
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
  const resolved = { ...withValue, facts, pendingConflict: null, unresolvedConflict: false };
  if (
    hasPurchaseContractDoc(resolved) &&
    (conflict.field === "purchase_price" || isPropertyAddressField(conflict.field))
  ) {
    const written = applyPurchaseContractAccept(resolved, resolved.pendingProposal);
    return queuePurchaseSketchReconcile(
      queuePurchaseContractRemainder({ ...written, looksRightHold: false }),
    );
  }
  return resolved;
}

const COUNTED_DOC_STATUSES = new Set<ReceivedDoc["status"]>(["received", "reading", "extracted"]);

export function isCoverReturnDoc(doc: ReceivedDoc) {
  return /1040-cover|1040 cover|cover page/i.test(doc.name ?? "");
}

export function receivedTaxReturnCount(draft: FoxIntakeDraft): number {
  let fromDocs = 0;
  for (const doc of draft.documents) {
    if (!COUNTED_DOC_STATUSES.has(doc.status)) continue;
    if (receivedClassOf(doc) === "tax_return" && !isCoverReturnDoc(doc)) fromDocs += 1;
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
  | "W-2 most recent two years"
  | "This year’s W-2"
  | "latest paystub"
  | "second-year W-2"
  | "prior-year return"
  | "K-1 distributions"
  | "Bay Street K-1"
  | "Harbor Studio K-1"
  | "Schedule C"
  | "Schedule E"
  | "K-1"
  | "1065"
  | "1120-S"
  | "Schedule F";

const COVER_SCHEDULE_LABELS: Record<string, StillUsefulLabel> = {
  schedule_c: "Schedule C",
  schedule_e: "Schedule E",
  k1: "K-1",
  "1065": "1065",
  "1120s": "1120-S",
  schedule_f: "Schedule F",
};

export function coverSchedulesOnFile(draft: FoxIntakeDraft): string[] {
  const raw = factValue(draft, "cover_schedules");
  return raw
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase().replace(/[\s_-]+/g, "_"))
    .filter(Boolean);
}

function coverSchedulePresent(draft: FoxIntakeDraft, id: string) {
  if (id === "schedule_c") return hasScheduleCCashflow(draft);
  if (id === "schedule_e") return hasScheduleECashflow(draft);
  if (id === "k1" || id === "1065" || id === "1120s") {
    return (
      hasK1Ordinary(draft) ||
      readTaxCashflows(draft).some((row) => String(row.entity_ordinary_income ?? "").trim())
    );
  }
  if (id === "schedule_f") {
    return (draft.documents ?? []).some((doc) => /schedule-f|schedule f|farm/i.test(doc.name));
  }
  return false;
}

export function nextCoverScheduleLabels(draft: FoxIntakeDraft): StillUsefulLabel[] {
  return coverSchedulesOnFile(draft)
    .filter((id) => !coverSchedulePresent(draft, id))
    .map((id) => COVER_SCHEDULE_LABELS[id])
    .filter((label): label is StillUsefulLabel => Boolean(label))
    .slice(0, 3);
}

function wageGroceryExtractClass(id: string) {
  return (
    id === "government_id" ||
    id === "paystub" ||
    id === "w2" ||
    id === "second-year-w2" ||
    id === "tax_return" ||
    id === "prior-year-return" ||
    id === "k1-distributions" ||
    id === "ytd-pnl"
  );
}

/** W-2 after Looks right: one of each. Do not invent a return or a second year. */
function dropWageAfterLooksRightExtra(draft: FoxIntakeDraft, id: string) {
  if (!draft.sampleAccepted || !wageThreadOpen(draft)) return false;
  if (id === "second-year-w2") return true;
  if (draft.incomeType.value === "w2") {
    if (
      id === "tax_return" ||
      id === "prior-year-return" ||
      id === "k1-distributions" ||
      id === "ytd-pnl"
    ) {
      return true;
    }
  }
  if (id === "paystub" && receivedClassCount(draft, "paystub") >= 1) return true;
  if (id === "w2" && receivedClassCount(draft, "w2") >= 1) return true;
  return false;
}

function wageAskClassLabel(draft: FoxIntakeDraft, extractClass: ExtractClass): StillUsefulLabel {
  if (draft.sampleAccepted && wageThreadOpen(draft)) {
    if (extractClass === "paystub") return "latest paystub";
    if (extractClass === "w2") return "This year’s W-2";
  }
  return askClassLabel(extractClass);
}

function wantsW2RemainderReturn(draft: FoxIntakeDraft) {
  const income = draft.incomeType.value;
  if (income !== "w2") return false;
  if (wageThreadOpen(draft)) return false;
  if (receivedTaxReturnCount(draft) >= 1) return false;
  if ((draft.skippedClasses ?? []).includes("tax_return")) return false;
  return primaryInviteSequence(draft).every((kind) => inviteSatisfied(draft, kind));
}

const SCHEDULE_E_NAMED_K1S = [
  { label: "Bay Street K-1" as const, test: /bay\s*street/i },
  { label: "Harbor Studio K-1" as const, test: /harbor\s*studio/i },
];

function scheduleEPart2NamesOnFile(draft: FoxIntakeDraft): string[] {
  const fromFact = String(draft.facts?.schedule_e_part2_names?.value ?? "");
  const fromCash = readTaxCashflows(draft).flatMap((row) =>
    String(row.schedule_e_part2_names ?? "").split(";"),
  );
  return [...fromFact.split(";"), ...fromCash].map((item) => item.trim()).filter(Boolean);
}

function namedK1DocumentOnFile(draft: FoxIntakeDraft, test: RegExp) {
  return (draft.documents ?? []).some((doc) => test.test(doc.name));
}

export function nextScheduleENamedK1Label(draft: FoxIntakeDraft): StillUsefulLabel | null {
  if (!hasScheduleECashflow(draft) && !scheduleEPart2NamesOnFile(draft).length) return null;
  const names = scheduleEPart2NamesOnFile(draft);
  const wanted = names.length
    ? SCHEDULE_E_NAMED_K1S.filter((item) => names.some((name) => item.test.test(name)))
    : SCHEDULE_E_NAMED_K1S;
  for (const item of wanted) {
    if (!namedK1DocumentOnFile(draft, item.test)) return item.label;
  }
  return null;
}

export function stillUsefulLabels(draft: FoxIntakeDraft): StillUsefulLabel[] {
  const taxReturns = receivedTaxReturnCount(draft);
  const groceryBeforeLooksRight = wageThreadOpen(draft) && !draft.sampleAccepted;
  const labels: StillUsefulLabel[] = missingExtractClasses(draft)
    .filter((item) => item !== "tax_return" || taxReturns < 1)
    .filter((item) => !groceryBeforeLooksRight || !wageGroceryExtractClass(item))
    .filter((item) => !dropWageAfterLooksRightExtra(draft, item))
    .map((item) => wageAskClassLabel(draft, item));
  if (wantsW2RemainderReturn(draft) && !labels.includes(askClassLabel("tax_return") as StillUsefulLabel)) {
    labels.push(askClassLabel("tax_return") as StillUsefulLabel);
  }
  if (!deepenStillUseful(draft)) {
    const namedK1 = nextScheduleENamedK1Label(draft);
    if (namedK1 && !labels.includes(namedK1)) labels.push(namedK1);
    for (const cover of nextCoverScheduleLabels(draft)) {
      if (!labels.includes(cover)) labels.push(cover);
    }
    return labels;
  }
  const income = draft.incomeType.value;
  if ((income === "w2" || income === "both") && !wageThreadOpen(draft) && receivedClassCount(draft, "w2") < 2) {
    if (!labels.includes("W-2 most recent two years")) labels.push("W-2 most recent two years");
  }
  if (
    (income === "self-employed" || income === "both" || income === "other") &&
    taxReturns === 1
  ) {
    const namedK1 = nextScheduleENamedK1Label(draft);
    labels.push(
      namedK1 ??
        (k1OrdinaryMissingDistributions(draft) && !hasScheduleCCashflow(draft)
          ? "K-1 distributions"
          : "prior-year return"),
    );
  } else {
    const namedK1 = nextScheduleENamedK1Label(draft);
    if (namedK1 && !labels.includes(namedK1)) labels.push(namedK1);
  }
  for (const cover of nextCoverScheduleLabels(draft)) {
    if (!labels.includes(cover)) labels.push(cover);
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
  if (/latest (two )?paystubs?/i.test(label)) return "paystub";
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
    const display = preferFilenameClass(doc.extractClass ?? "other", doc.name, doc.slot);
    if (display === "government_id" || doc.slot === "id" || docsDisplayLabel(doc) === "ID") {
      const named = Boolean(
        draft.borrowerName || draft.contact.fullName.value || draft.facts?.full_name?.value,
      );
      if (doc.status === "extracted" && !isUnreadNote(doc.note) && named) {
        received.add("government_id");
      }
    }
    if (display === "purchase_contract") {
      const written = Boolean(
        (draft.facts?.purchase_price?.confirmed && draft.facts.purchase_price.value) ||
          (draft.facts?.close_date?.confirmed && draft.facts.close_date.value) ||
          (draft.subjectAddress && draft.facts?.property_address?.confirmed),
      );
      if (written) received.add("purchase_contract");
    }
    if (
      (doc.status === "extracted" || doc.status === "received" || doc.status === "reading") &&
      display &&
      display !== "other" &&
      display !== "government_id" &&
      display !== "purchase_contract"
    ) {
      received.add(display);
    }
  }
  if (
    draft.borrowerName ||
    draft.contact.fullName.confirmed ||
    draft.facts?.full_name?.confirmed ||
    draft.facts?.borrowerName?.confirmed
  ) {
    received.add("government_id");
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
    occupancy: draft.occupancyChoice.value || undefined,
    purchasePrice: purchase && draft.propertyValueAmount ? draft.propertyValueAmount : undefined,
    loanAmount: draft.loanAmountValue || undefined,
    propertyValue: draft.propertyValueAmount || undefined,
    received: Array.from(received),
    paystubCount: receivedClassCount(draft, "paystub"),
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
    ...(draft.estimatedHousing != null ? { estimatedHousing: draft.estimatedHousing } : {}),
    ...(draft.statedDti != null ? { statedDti: draft.statedDti } : {}),
    ...(draft.subordinateBalance != null ? { subordinateBalance: draft.subordinateBalance } : {}),
    ...(draft.hoaMonthly != null ? { hoaMonthly: draft.hoaMonthly } : {}),
    ...(draft.miApplies != null ? { miApplies: draft.miApplies } : {}),
    ...(draft.statedAvailableAssets != null ? { statedAvailableAssets: draft.statedAvailableAssets } : {}),
    ...(draft.propertyType ? { propertyType: draft.propertyType } : {}),
    ...(draft.subjectAddress ? { subjectAddress: draft.subjectAddress } : {}),
    ...(draft.statedTimeOnJob != null ? { statedTimeOnJob: draft.statedTimeOnJob } : {}),
    ...(draft.statedCurrentHousing != null ? { statedCurrentHousing: draft.statedCurrentHousing } : {}),
    ...(draft.statedDeclaration ? { statedDeclaration: draft.statedDeclaration } : {}),
    ...(draft.declarationTiming ? { declarationTiming: draft.declarationTiming } : {}),
    ...(draft.statedHousehold ? { statedHousehold: draft.statedHousehold } : {}),
    ...(draft.coborrowerName ? { coborrowerName: draft.coborrowerName } : {}),
    ...(draft.borrowerName ? { borrowerName: draft.borrowerName } : {}),
    ...(draft.statedOtherReo ? { statedOtherReo: draft.statedOtherReo } : {}),
    ...(draft.suggestedNetRental != null ? { suggestedNetRental: draft.suggestedNetRental } : {}),
    ...(draft.rentalNetRole ? { rentalNetRole: draft.rentalNetRole } : {}),
    ...fileGuidelineSignals(draft),
  };
}

function fileGuidelineSignals(draft: FoxIntakeDraft): Partial<CompletenessFile> {
  const text = [
    ...(draft.notes ?? []),
    ...Object.values(draft.facts ?? {}).map((fact) => fact.value),
    draft.incomeType.value,
    ...(draft.documents ?? []).map((doc) => doc.name),
  ].join(" ");
  const hoaDocs = (draft.documents ?? []).some((doc) =>
    /hoa questionnaire|condo project|project docs/i.test(doc.name),
  ) || Boolean(draft.facts?.hoa_questionnaire?.value || draft.facts?.condo_project_docs?.value);
  const projectFacts = Boolean(
    draft.facts?.condo_project_facts?.value || draft.facts?.project_name?.value,
  );
  return {
    manufactured: /\bmanufactured\b/i.test(text) || Boolean(draft.facts?.manufactured?.value),
    coop: /\bco-?ops?\b/i.test(text),
    pud: /\bpud\b/i.test(text) && !/\bcondo/i.test(text),
    ...(draft.propertyType
      ? {}
      : namedCondoLanguage(text)
        ? { propertyType: "condo" as const }
        : {}),
    condoNewOrConverted: namedNewOrConvertedCondo(text),
    condoDeveloperControl: /\bdeveloper control\b/i.test(text),
    condoHasHoaDocs: hoaDocs || undefined,
    condoHasProjectFacts: projectFacts || undefined,
    condoIneligibleNamed: namedCondoIneligible(text),
    rentalNamed: draftRentalNamed(draft),
    hasScheduleE: draftHasScheduleE(draft),
    hasLease: draftHasLease(draft),
    unsupportedRental: draftHasUnsupportedRental(draft),
    rentalNeedsStatement: draftNeedsReoStatement(draft) || otherReoFileNetNeedsStatement(draft),
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

/** Remainder board after the sketch exists. Income Skip still shows the board. */
export function stillUsefulVisible(draft: FoxIntakeDraft) {
  return Boolean(draft.path && draft.productIntent && (draft.incomeType.value || draft.incomeAsked));
}

function isWageGroceryBeforeLooksRight(draft: FoxIntakeDraft, id: string) {
  if (draft.sampleAccepted) return false;
  if (!wageThreadOpen(draft)) return false;
  if (id === "government_id" && (draft.skippedClasses ?? []).includes("government_id")) {
    return false;
  }
  return wageGroceryExtractClass(id);
}

function wageStillUsefulCopy(id: string): { label: string; ask: string } | null {
  if (id === "paystub") {
    return { label: "Latest paystub", ask: "Your latest paystub still helps this file." };
  }
  if (id === "w2") {
    return { label: "This year’s W-2", ask: "This year’s W-2 still helps this file." };
  }
  if (id === "second-year-w2") return null;
  return null;
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
      "income docs (latest paystub, W-2, and latest return)",
    );
  }
  if (income === "self-employed" || income === "other") {
    return conventionalGuidelinePattern(
      "completeness",
      "income-docs-self-employed",
      "income docs (latest return)",
    );
  }
  return conventionalGuidelinePattern("completeness", "income-docs", "income docs");
}

/** What Fox names after the sketch — the short list, not a remainder. */
export const OTHER_REO_MORTGAGE_STATEMENTS = "Mortgage statements for all properties owned.";

export function otherReoMortgageStatementsLabel(draft: FoxIntakeDraft) {
  return draft.statedOtherReo === "yes" ? OTHER_REO_MORTGAGE_STATEMENTS : "Mortgage statement";
}

export function shortListSpeak(draft: FoxIntakeDraft): string {
  const labels = ["government ID", incomeDocsPhrase(draft), "property address"];
  if (purchaseLikeFile(draft)) {
    labels.push("purchase contract", "bank statement");
  } else if (refiLikeFile(draft)) {
    labels.push(draft.statedOtherReo === "yes" ? OTHER_REO_MORTGAGE_STATEMENTS.replace(/\.$/, "") : "mortgage statement");
    if (draft.cashOut) labels.push("bank statement");
  }
  return labelListCopy(labels);
}

const LAYER2_COPY: Record<DocumentedStillUsefulId, { label: string; ask: string }> = {
  government_id: { label: "Government ID", ask: "A government ID still helps this file." },
  paystub: { label: "Latest two paystubs", ask: "Latest two paystubs still help this file." },
  w2: { label: "W-2 most recent two years", ask: "W-2 most recent two years still help this file." },
  "second-year-w2": { label: "W-2 most recent two years", ask: "W-2 most recent two years still help this file." },
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
  const ids = documentedStillUsefulIds(draft.productIntent ?? "", completenessFileFromDraft(draft));
  if (wantsW2RemainderReturn(draft) && !ids.includes("tax_return")) {
    const addressAt = ids.indexOf("property-address");
    if (addressAt >= 0) ids.splice(addressAt, 0, "tax_return");
    else ids.push("tax_return");
  }
  const skipped = new Set(draft.skippedStillUseful ?? []);
  const items = ids
    .filter((id) => !skipped.has(id))
    .filter((id) => !(id === "mortgage_statement" && purchaseLikeFile(draft)))
    .filter((id) => !isWageGroceryBeforeLooksRight(draft, id))
    .filter((id) => !dropWageAfterLooksRightExtra(draft, id))
    .flatMap((id) => {
    if (id === "mortgage_statement" && draft.statedOtherReo === "yes") {
      return [layer2Item(id, OTHER_REO_MORTGAGE_STATEMENTS, OTHER_REO_MORTGAGE_STATEMENTS)];
    }
    const wageCopy =
      draft.sampleAccepted && wageThreadOpen(draft) ? wageStillUsefulCopy(id) : null;
    if (wageCopy === null && id === "second-year-w2" && wageThreadOpen(draft)) return [];
    const skippedIncomeCopy =
      !draft.incomeType.value && id === "paystub"
        ? { label: "Latest paystub", ask: "A recent paystub still helps this file." }
        : !draft.incomeType.value && id === "w2"
          ? { label: "W-2", ask: "A W-2 still helps this file." }
          : null;
    const copy = wageCopy ?? skippedIncomeCopy ?? LAYER2_COPY[id];
    if (!copy) return [];
    return [layer2Item(id, copy.label, copy.ask)];
  });
  const bankDocs = bankStatementDocCount(draft);
  if (statementExtractConfirmed(draft) && bankDocs < 2) {
    items.push(
      layer2Item(
        "second-bank-statement",
        "Second bank statement",
        "A second recent bank statement still helps this file.",
      ),
    );
  }
  const namedK1 = nextScheduleENamedK1Label(draft);
  if (namedK1 && !items.some((item) => item.label === namedK1)) {
    items.push(
      layer2Item(
        namedK1 === "Harbor Studio K-1" ? "harbor-studio-k1" : "bay-street-k1",
        namedK1,
        `The ${namedK1} still helps this file.`,
      ),
    );
  }
  const coverItems = nextCoverScheduleLabels(draft)
    .filter((label) => !skipped.has(coverLayer2Id(label)))
    .filter((label) => !items.some((item) => item.label === label))
    .map((label) =>
      layer2Item(
        coverLayer2Id(label),
        label,
        `The ${label} named on the 1040 cover still helps this file.`,
      ),
    );
  items.unshift(...coverItems);
  return items;
}

function coverLayer2Id(label: StillUsefulLabel) {
  if (label === "Schedule C") return "cover-schedule-c";
  if (label === "Schedule E") return "cover-schedule-e";
  if (label === "K-1") return "cover-k1";
  if (label === "1065") return "cover-1065";
  if (label === "1120-S") return "cover-1120s";
  if (label === "Schedule F") return "cover-schedule-f";
  return `cover-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
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
  const items = [
    ...conditionItems,
    ...layer2Plan(draft),
    ...otherReoStillUsefulItems(draft),
    ...guidelineStillUsefulItems(draft),
  ].filter(
    (item) => item.label !== OTHER_REO_MORTGAGE_STATEMENTS || draft.statedOtherReo === "yes",
  );
  storeCompleteness(draft.productIntent ?? "", completenessFileFromDraft(draft));
  return { items: items.slice(0, 3), empty: items.length === 0 };
}

function otherReoStillUsefulItems(draft: FoxIntakeDraft): StillUsefulItem[] {
  if (draft.statedOtherReo !== "yes") return [];
  const received = new Set(
    (draft.documents ?? [])
      .filter((doc) => doc.extractClass && (doc.status === "extracted" || doc.status === "received" || doc.status === "reading"))
      .map((doc) => doc.extractClass as string),
  );
  const items: StillUsefulItem[] = [];
  const alreadyAsking = layer2Plan(draft).some(
    (item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS || item.id === "mortgage_statement",
  );
  if (
    !alreadyAsking &&
    ((!received.has("mortgage_statement") && !layer2Plan(draft).some((item) => item.id === "mortgage_statement")) ||
      otherReoFileNetNeedsStatement(draft))
  ) {
    items.push(
      layer2Item(
        "other-reo-mortgage",
        OTHER_REO_MORTGAGE_STATEMENTS,
        OTHER_REO_MORTGAGE_STATEMENTS,
      ),
    );
  }
  if (draft.occupancyChoice.value === "investment") {
    items.push(layer2Item("other-reo-lease", "Lease", "A lease still helps this file."));
  }
  return items;
}

export const CONDO_NEEDS_REVIEW_FACT = "condo_needs_review";

export function condoNeedsReviewPersisted(draft: FoxIntakeDraft): boolean {
  return draft.facts?.[CONDO_NEEDS_REVIEW_FACT]?.value === "needs_review";
}

/** Internal File flag for licensed review. Not a borrower Still useful item. */
export function persistCondoNeedsReview(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (condoNeedsReviewPersisted(draft)) return draft;
  return {
    ...draft,
    facts: {
      ...(draft.facts ?? {}),
      [CONDO_NEEDS_REVIEW_FACT]: {
        field: CONDO_NEEDS_REVIEW_FACT,
        value: "needs_review",
        source: "suggested",
        confirmed: false,
      },
    },
  };
}

function guidelineStillUsefulItems(draft: FoxIntakeDraft): StillUsefulItem[] {
  const file = completenessFileFromDraft(draft);
  const items: StillUsefulItem[] = [];
  if ((file.rentalNamed || file.occupancy === "investment") && !file.hasScheduleE && !file.hasLease) {
    items.push(layer2Item("rental-docs", RENTAL_DOCS_WOULD_HELP, RENTAL_DOCS_WOULD_HELP));
  }
  if (
    draft.statedOtherReo === "yes" &&
    file.rentalNeedsStatement &&
    !items.some((item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS)
  ) {
    items.push(layer2Item("reo-mortgage-rental", OTHER_REO_MORTGAGE_STATEMENTS, OTHER_REO_MORTGAGE_STATEMENTS));
  }
  return items;
}

export function layer2AskCopy(draft: FoxIntakeDraft) {
  const labels = layer2Plan(draft).map((item) => item.label);
  return labels.length ? labelListCopy(labels) : NOTHING_URGENT;
}

export function layer2AskActions(draft: FoxIntakeDraft): FoxAction[] | undefined {
  if (
    draft.motion === "in_queue" ||
    draft.motion === "waiting_out" ||
    draft.motion === "escalated" ||
    draft.pendingFinish
  ) {
    return undefined;
  }
  if (!nextStillUsefulItem(draft)) return undefined;
  return [
    { id: "upload-this", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } },
    { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
    { id: "hold-docs", label: "Not yet", event: "bubble", capture: { field: "hold-docs" } },
  ];
}

function stillUsefulSkipClass(id: string): ExtractClass | null {
  if (id === "government_id") return "government_id";
  if (id === "purchase_contract") return "purchase_contract";
  if (id === "bank_statement") return "bank_statement";
  if (id === "paystub") return "paystub";
  if (id === "w2") return "w2";
  if (id === "tax_return") return "tax_return";
  return null;
}

export function skipCurrentStillUseful(draft: FoxIntakeDraft): FoxIntakeDraft {
  const next = nextStillUsefulItem(draft);
  if (!next) return { ...draft, docsHeld: false };
  const docKind = stillUsefulSkipClass(next.id);
  if (docKind) {
    return {
      ...draft,
      docsHeld: false,
      skippedClasses: Array.from(new Set([...(draft.skippedClasses ?? []), docKind])),
    };
  }
  const skipId = next.id;
  return {
    ...draft,
    docsHeld: false,
    skippedStillUseful: (draft.skippedStillUseful ?? []).includes(skipId)
      ? draft.skippedStillUseful
      : [...(draft.skippedStillUseful ?? []), skipId],
  };
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
  | "prior_year_return"
  | "coborrower_government_id"
  | "bank_statement"
  | "second_bank_statement"
  | "purchase_contract";

export const DOC_INVITE_COPY: Record<DocInviteKind, string> = {
  government_id: "First I need a government ID, so this file has a name on it.",
  paystub: "Next is your latest paystub. That’s current income on paper.",
  w2: "Next is this year’s W-2.",
  tax_return:
    "Next is your most recent tax return. That’s how I estimate qualifying income. Suggested, not underwritten.",
  prior_year_return: "A prior-year return helps me see if last year was stable. Have one?",
  coborrower_government_id: "First I need Borrower 2’s government ID, so this file has a name on it.",
  bank_statement: "Two recent statements to show funds for the down payment.",
  second_bank_statement: "A second recent statement helps. Skip is fine.",
  purchase_contract: "The purchase contract is the property on paper. Skip is fine.",
};

export function bankStatementDocCount(draft: FoxIntakeDraft) {
  return (draft.documents ?? []).filter(
    (document) => document.extractClass === "bank_statement" || document.slot === "bank",
  ).length;
}

/** After the first statement writes Assets, offer a second statement once. */
export function secondBankStatementInviteNeeded(draft: FoxIntakeDraft) {
  if (draft.secondBankStatementSkipped) return false;
  if (!statementExtractConfirmed(draft)) return false;
  return bankStatementDocCount(draft) < 2;
}

export function secondBankStatementInviteCopy(draft: FoxIntakeDraft) {
  const who =
    displayInstitution(
      String(draft.facts?.institution?.value ?? draft.assetAccounts?.[0]?.institution ?? ""),
    ) || "That statement";
  return `${who} is in. A second recent statement helps. Skip is fine.`;
}

/** ID + this borrower’s income package. Prior-year / second-year sit on remainder. */
export function primaryInviteSequence(draft: FoxIntakeDraft): DocInviteKind[] {
  const income = draft.incomeType.value;
  const steps: DocInviteKind[] = ["government_id"];
  if (income === "w2" || income === "both") {
    steps.push("paystub", "w2");
  }
  if (income === "self-employed" || income === "other" || income === "both") {
    steps.push("tax_return");
  }
  return steps;
}

export function remainderInviteSequence(draft: FoxIntakeDraft): DocInviteKind[] {
  const income = draft.incomeType.value;
  const steps: DocInviteKind[] = [];
  if (income === "self-employed" || income === "other" || income === "both") {
    steps.push("prior_year_return");
  }
  return steps;
}

function coborrowerInviteSequence(draft: FoxIntakeDraft): DocInviteKind[] {
  if (draft.statedHousehold !== "with_someone" || !draft.householdAsked) return [];
  if (!thisBorrowerPrimaryPackageDone(draft)) return [];
  return ["coborrower_government_id"];
}

export function inviteSequence(draft: FoxIntakeDraft): DocInviteKind[] {
  return [...primaryInviteSequence(draft), ...coborrowerInviteSequence(draft), ...remainderInviteSequence(draft)];
}

export function unreadDocOpen(draft: FoxIntakeDraft): ReceivedDoc | null {
  const docs = [...(draft.documents ?? [])].reverse();
  const unread = docs.find(
    (doc) =>
      isUnreadNote(doc.note) ||
      doc.status === "failed" ||
      doc.status === "needs better copy",
  );
  if (unread) return unread;
  if (!wageExtractFailedRead(draft)) return null;
  return (
    docs.find((doc) => {
      const cls = receivedClassOf(doc) ?? doc.extractClass;
      return cls === "w2" || cls === "paystub" || doc.slot === "w2" || doc.slot === "paystubs";
    }) ?? null
  );
}

function classSuccessfullyRead(draft: FoxIntakeDraft, kind: DocInviteKind): boolean {
  return (draft.documents ?? []).some((doc) => {
    if (doc.status !== "extracted") return false;
    if (isUnreadNote(doc.note)) return false;
    if (kind === "government_id") {
      if (doc.party === "coborrower") return false;
      const received = receivedClassOf(doc);
      return (
        received === "government_id" ||
        doc.extractClass === "government_id" ||
        doc.slot === "id"
      );
    }
    return receivedClassOf(doc) === kind;
  });
}

function inviteSatisfied(draft: FoxIntakeDraft, kind: DocInviteKind): boolean {
  if (kind === "coborrower_government_id") {
    if (draft.coborrowerIdSkipped) return true;
    return draft.documents.some((doc) => {
      if (doc.party !== "coborrower") return false;
      const isId = doc.extractClass === "government_id" || doc.slot === "id";
      if (!isId) return false;
      return (
        doc.status === "extracted" ||
        doc.status === "failed" ||
        doc.status === "needs better copy"
      );
    });
  }
  if (kind === "government_id") {
    if ((draft.skippedClasses ?? []).includes("government_id")) return true;
    return classSuccessfullyRead(draft, "government_id");
  }
  if (kind === "bank_statement") {
    if ((draft.skippedClasses ?? []).includes("bank_statement")) return true;
    return statementExtractConfirmed(draft);
  }
  if (kind === "second_bank_statement") {
    return !secondBankStatementInviteNeeded(draft);
  }
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
  if (classSuccessfullyRead(draft, kind)) return true;
  if ((draft.skippedClasses ?? []).includes(kind)) return true;
  return false;
}

/** This borrower’s ID + income package received, ready, or skipped. Hold / Looks right do not count. */
export function thisBorrowerPrimaryPackageDone(draft: FoxIntakeDraft) {
  if (!draft.incomeType.value && !draft.incomeAsked) return false;
  return primaryInviteSequence(draft).every((kind) => inviteSatisfied(draft, kind));
}

/**
 * Household / coborrower only after Looks right — never after a mid-docs Skip.
 * Skip on paystub / W-2 / tax return stays on Borrower 1.
 * Prior-year return sits on Still useful — not a gate.
 */
export function readyForHouseholdAsk(draft: FoxIntakeDraft): boolean {
  if (!draft.path || !draft.productIntent) return false;
  if (!draft.occupancyChoice.value && !draft.occupancyAsked) return false;
  if (!draft.incomeType.value && !draft.incomeAsked) return false;
  if (!thisBorrowerPrimaryPackageDone(draft)) return false;
  return Boolean(draft.sampleAccepted);
}

/** Primary ID / income docs have all been uploaded, skipped, or the borrower left the pass. */
export function primaryDocPassFinished(draft: FoxIntakeDraft) {
  if (draft.sampleAccepted || draft.documentsSkipped) return true;
  if (
    draft.docsHeld &&
    (draft.docsStarted || (draft.skippedClasses?.length ?? 0) > 0 || draft.documents.length > 0)
  ) {
    return true;
  }
  return thisBorrowerPrimaryPackageDone(draft);
}

/** Pre-Looks-right ID / statements use Upload this · Skip, not Start with ID. */
export function offeringDocStart(_draft: FoxIntakeDraft) {
  return false;
}

/** Box 5, pay frequency, and stub monthly asked or skipped. No invented monthly. */
export function wageNumberPathSettled(draft: FoxIntakeDraft) {
  return Boolean(draft.wageBox5Asked && draft.wageFrequencyAsked && draft.wageStubAsked);
}

/** Extracted W-2 + stub on the file — not a skip-only package. */
export function wageExtractOnFile(draft: FoxIntakeDraft) {
  return classSuccessfullyRead(draft, "w2") && classSuccessfullyRead(draft, "paystub");
}

/** W-2 drop / Box 5 / frequency / stub confirm still live — ID wait. */
function wageSketchBlocksDocInvite(draft: FoxIntakeDraft): boolean {
  if (draft.sampleAccepted || !wageThreadOpen(draft)) return false;
  if (
    isWageExtractProposal(draft.pendingProposal) ||
    isStubExtractProposal(draft.pendingProposal) ||
    isStubJobProposal(draft.pendingProposal)
  ) {
    return true;
  }
  if (stubExtractAskOpen(draft)) return true;
  if (!draft.wageDocsAsked) return true;
  if (!draft.wageBox5Asked) return true;
  if (!draft.wageFrequencyAsked) return true;
  if (!draft.wageStubAsked) return true;
  return false;
}

function zipOnlySubject(draft: FoxIntakeDraft) {
  const line = String(draft.subjectAddress || draft.facts?.property_address?.value || "").trim();
  const zip = String(draft.propertyZip || "").trim();
  if (line && !isZipOnlyFileAddress(line, zip || undefined)) return false;
  return Boolean(zip || /^\d{5}$/.test(line) || /,\s*CA\s+\d{5}$/i.test(line));
}

/** ID, then statements. ZIP-only purchase asks for the contract before Looks right. After Looks right, a missing contract is still next. */
function lockedFileDocInvites(draft: FoxIntakeDraft): DocInviteKind[] {
  const kinds: DocInviteKind[] = [];
  if (!inviteSatisfied(draft, "government_id")) kinds.push("government_id");
  if (!inviteSatisfied(draft, "bank_statement")) kinds.push("bank_statement");
  if (secondBankStatementInviteNeeded(draft)) kinds.push("second_bank_statement");
  if (
    purchaseLikeFile(draft) &&
    !inviteSatisfied(draft, "purchase_contract") &&
    (draft.sampleAccepted || zipOnlySubject(draft))
  ) {
    kinds.push("purchase_contract");
  }
  return kinds;
}

export function nextDocInvite(draft: FoxIntakeDraft): DocInviteKind | null {
  if (!draft.incomeType.value && !draft.incomeAsked) return null;
  if (draft.pendingProposal || draft.pendingConflict) return null;
  if (wageSketchBlocksDocInvite(draft)) return null;
  const income = draft.incomeType.value;
  if (income === "self-employed" || income === "other" || income === "both") {
    for (const kind of primaryInviteSequence(draft)) {
      if (!inviteSatisfied(draft, kind)) return kind;
    }
    for (const kind of remainderInviteSequence(draft)) {
      if (!inviteSatisfied(draft, kind)) return kind;
    }
  }
  for (const kind of lockedFileDocInvites(draft)) {
    if (!inviteSatisfied(draft, kind)) return kind;
  }
  return null;
}

/** Composer extract hint. Dropped filename wins so 08 at the ID ask is government_id, not leftover bank/other. */
export function extractHintFromDraft(draft: FoxIntakeDraft, name?: string): ExtractClass | null {
  if (name) {
    const fromName = extractClassFromFilename(name);
    if (fromName && fromName !== "other") return fromName;
    const slot = slotFromFilename(name);
    if (slot === "id") return "government_id";
    if (slot === "bank") return "bank_statement";
    if (slot === "w2") return "w2";
    if (slot === "paystubs") return "paystub";
  }
  const invite = nextDocInvite(draft);
  if (invite === "bank_statement" || invite === "second_bank_statement") return "bank_statement";
  if (invite === "government_id" || invite === "coborrower_government_id") return "government_id";
  if (invite === "paystub") return "paystub";
  if (invite === "w2") return "w2";
  if (invite === "tax_return" || invite === "prior_year_return") return "tax_return";
  if (invite === "purchase_contract") return "purchase_contract";
  return null;
}

function hasRemainingPrimaryInvites(draft: FoxIntakeDraft) {
  return primaryInviteSequence(draft).some((kind) => !inviteSatisfied(draft, kind));
}

const PURCHASE_CONTRACT_ACCEPT_FIELDS = [
  "property_address",
  "purchase_price",
  "close_date",
  "seller_credit",
] as const;

export function hasPurchaseContractDoc(draft: FoxIntakeDraft) {
  return (draft.documents ?? []).some(
    (doc) =>
      (doc.extractClass === "purchase_contract" || /purchase.?contract|purchase.?agree|\bpsa\b/i.test(doc.name)) &&
      (doc.status === "extracted" || doc.status === "received"),
  );
}

export function purchaseContractFieldsFromDraft(draft: FoxIntakeDraft): Record<string, string> {
  const next: Record<string, string> = { ...(draft.lastPurchaseContractFields ?? {}) };
  if (draft.pendingProposal) {
    for (const item of remainderProposalWrites(draft.pendingProposal)) {
      if (item.field && item.value && !next[item.field]) next[item.field] = item.value.trim();
    }
  }
  return next;
}

export function purchaseContractStreetFromDraft(draft: FoxIntakeDraft) {
  const street = String(draft.lastPurchaseContractFields?.property_address ?? "").trim();
  if (!street || isZipOnlyFileAddress(street, draft.propertyZip)) return "";
  if (!looksLikeContractStreet(street) && !/^\d{1,6}\s+/.test(street)) return "";
  return street;
}

export function proposalFromLastPurchaseContract(draft: FoxIntakeDraft): FactProposal | null {
  const fields = purchaseContractFieldsFromDraft(draft);
  const writes: { field: string; value: string }[] = [];
  for (const field of PURCHASE_CONTRACT_ACCEPT_FIELDS) {
    const value = String(fields[field] ?? "").trim();
    if (!value) continue;
    if (field === "property_address") {
      if (isZipOnlyFileAddress(value, draft.propertyZip)) continue;
      const shown = displayedSubjectAddress(draft);
      if (shown && !isZipOnlyFileAddress(shown, draft.propertyZip)) continue;
    }
    if (field === "purchase_price" && draft.facts?.purchase_price?.confirmed && factValue(draft, "purchase_price")) {
      continue;
    }
    if (field === "close_date" && draft.facts?.close_date?.confirmed && factValue(draft, "close_date")) {
      continue;
    }
    if (field === "seller_credit") {
      const amount = moneyNumber(value);
      if (amount == null || amount <= 0) continue;
      if (draft.facts?.seller_credit?.confirmed && factValue(draft, "seller_credit")) continue;
      writes.push({ field, value: String(amount) });
      continue;
    }
    writes.push({ field, value });
  }
  return remainderProposalFromWrites("purchase_contract", writes);
}

/** After Use document on price, keep the contract street / close / credit queued for Use this. */
export function queuePurchaseContractRemainder(draft: FoxIntakeDraft): FoxIntakeDraft {
  const remainder = proposalFromLastPurchaseContract(draft);
  if (!remainder) {
    return { ...draft, pendingAddress: undefined };
  }
  return { ...draft, pendingProposal: remainder, pendingAddress: undefined };
}

export const PURCHASE_SPLIT_RECONCILE_NOTE = "purchase-split-reconcile";

export function isPurchaseSplitReconcileProposal(proposal?: FactProposal | null) {
  return (
    proposal?.note === PURCHASE_SPLIT_RECONCILE_NOTE &&
    proposal.field === "downPayment" &&
    proposal.companion?.field === "loanAmount"
  );
}

/** Price wrote. Down + loan still add to the old sketch. */
export function purchaseSketchMismatch(draft?: FoxIntakeDraft | null) {
  if (!draft || draft.productIntent !== "buy") return null;
  const price = draft.propertyValueAmount;
  const down = draft.downPaymentAmount;
  const loan = draft.loanAmountValue;
  if (price == null || down == null || loan == null) return null;
  if (price <= 0 || down <= 0 || loan <= 0) return null;
  if (Math.abs(down + loan - price) <= 1) return null;
  if (loan >= price) return null;
  const nextDown = Math.round(price - loan);
  if (nextDown <= 0 || nextDown >= price) return null;
  return {
    price,
    down,
    loan,
    sketch: Math.round(down + loan),
    nextDown,
    keepLoan: loan,
  };
}

export function needsPurchaseSplitAsk(draft?: FoxIntakeDraft | null) {
  return Boolean(isPurchaseSplitReconcileProposal(draft?.pendingProposal) || purchaseSketchMismatch(draft));
}

/** After contract write, ask before rewriting down to keep the loan. */
export function queuePurchaseSketchReconcile(draft: FoxIntakeDraft): FoxIntakeDraft {
  const mismatch = purchaseSketchMismatch(draft);
  if (!mismatch) return draft;
  if (proposalFromLastPurchaseContract(draft)) return draft;
  const extras: FactWrite[] = [
    { field: "purchase_price", value: String(mismatch.price), label: "purchase price" },
    { field: "oldDown", value: String(mismatch.down), label: "old down" },
    { field: "oldLoan", value: String(mismatch.loan), label: "old loan" },
    { field: "sketch", value: String(mismatch.sketch), label: "sketch" },
  ];
  const close = factValue(draft, "close_date");
  if (close) extras.push({ field: "close_date", value: close, label: "close date" });
  const credit = factValue(draft, "seller_credit");
  if (credit) extras.push({ field: "seller_credit", value: credit, label: "seller credit" });
  return {
    ...draft,
    pendingProposal: {
      field: "downPayment",
      value: String(mismatch.nextDown),
      label: "down payment",
      kind: "computed",
      note: PURCHASE_SPLIT_RECONCILE_NOTE,
      companion: {
        field: "loanAmount",
        value: String(mismatch.keepLoan),
        label: "loan amount",
      },
      extras,
    },
    pendingAddress: undefined,
  };
}

/** After Use this, write the contract street and seller credit even if the chip was a leftover ZIP place. */
export function applyPurchaseContractAccept(
  draft: FoxIntakeDraft,
  proposal?: FactProposal | null,
): FoxIntakeDraft {
  const fields = purchaseContractFieldsFromDraft({ ...draft, pendingProposal: proposal ?? draft.pendingProposal });
  const now = new Date().toISOString();
  let next: FoxIntakeDraft = { ...draft, pendingAddress: undefined };
  for (const field of PURCHASE_CONTRACT_ACCEPT_FIELDS) {
    const incoming = String(fields[field] ?? "").trim();
    if (!incoming) continue;
    if (field === "property_address") {
      if (isZipOnlyFileAddress(incoming, next.propertyZip)) continue;
      const shown = displayedSubjectAddress(next);
      if (shown && !isZipOnlyFileAddress(shown, next.propertyZip)) continue;
      next = writeField(next, field, incoming, now);
      continue;
    }
    if (field === "seller_credit") {
      const amount = moneyNumber(incoming);
      if (amount == null || amount <= 0) continue;
      if (next.facts?.seller_credit?.confirmed && factValue(next, "seller_credit")) continue;
      next = writeField(next, field, String(amount), now);
      continue;
    }
    if (field === "close_date") {
      if (next.facts?.close_date?.confirmed && factValue(next, "close_date")) continue;
      next = writeField(next, field, incoming, now);
      continue;
    }
    if (field === "purchase_price") {
      if (next.propertyValueAmount != null && next.propertyValueAmount > 0) continue;
      next = writeField(next, field, incoming, now);
    }
  }
  return { ...next, pendingAddress: undefined };
}

export function isPurchaseContractConfirmPending(draft: FoxIntakeDraft) {
  if (!hasPurchaseContractDoc(draft) && !draft.lastPurchaseContractFields) return false;
  const proposal = draft.pendingProposal;
  if (isPurchaseSplitReconcileProposal(proposal)) return false;
  if (proposal && isRemainderConfirmField(proposal.field)) return true;
  if (purchaseContractStreetFromDraft(draft) || String(draft.lastPurchaseContractFields?.seller_credit ?? "").trim()) {
    return Boolean(proposal || draft.pendingAddress);
  }
  return false;
}

export function skipCurrentInvite(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (isPurchaseContractConfirmPending(draft)) {
    const skipped = Array.from(
      new Set([...(draft.skippedClasses ?? []), "purchase_contract" as ExtractClass]),
    );
    const next = {
      ...draft,
      skippedClasses: skipped,
      docsOpen: false,
      correcting: null,
      correctingLine: null,
      pendingProposal: null,
    };
    return {
      ...next,
      documentsSkipped: draft.documents.length === 0 && !hasRemainingPrimaryInvites(next),
    };
  }
  if (isBorrowerNameConfirmPending(draft)) {
    const facts = { ...(draft.facts ?? {}) };
    delete facts[BORROWER_NAME_FIELD];
    const skipped = Array.from(
      new Set([...(draft.skippedClasses ?? []), "government_id" as ExtractClass]),
    );
    const next = {
      ...draft,
      borrowerName: undefined,
      skippedClasses: skipped,
      docsOpen: false,
      correcting: null,
      correctingLine: null,
      pendingProposal: null,
      pendingConflict: null,
      facts,
    };
    return {
      ...next,
      documentsSkipped: draft.documents.length === 0 && !hasRemainingPrimaryInvites(next),
    };
  }
  const kind = nextDocInvite(draft);
  if (!kind) {
    return {
      ...draft,
      documentsSkipped: !hasRemainingPrimaryInvites(draft),
      docsOpen: false,
      correcting: null,
    };
  }
  if (kind === "coborrower_government_id") {
    return skipCoborrowerId(draft);
  }
  if (kind === "prior_year_return") {
    const next = {
      ...draft,
      priorYearSkipped: true,
      docsOpen: false,
      correcting: null,
    };
    return {
      ...next,
      documentsSkipped: draft.documents.length === 0 && !hasRemainingPrimaryInvites(next),
    };
  }
  if (kind === "second_bank_statement") {
    return {
      ...draft,
      secondBankStatementSkipped: true,
      docsOpen: false,
      correcting: null,
    };
  }
  const skipped = Array.from(new Set([...(draft.skippedClasses ?? []), kind]));
  const next = {
    ...draft,
    skippedClasses: skipped,
    docsOpen: false,
    correcting: null,
  };
  return {
    ...next,
    documentsSkipped: draft.documents.length === 0 && !hasRemainingPrimaryInvites(next),
  };
}

export function retryUnreadDoc(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, awaitingUnreadNote: false };
}

export function writeUnreadNote(draft: FoxIntakeDraft, text: string): FoxIntakeDraft {
  const unread = unreadDocOpen(draft);
  const note = text.trim();
  if (!unread || !note) return { ...draft, awaitingUnreadNote: false };
  return {
    ...draft,
    awaitingUnreadNote: false,
    looksRightHold: true,
    notes: [...(draft.notes ?? []), note],
    documents: draft.documents.map((doc) =>
      doc.receivedAt === unread.receivedAt && doc.name === unread.name
        ? { ...doc, note }
        : doc,
    ),
  };
}

/** Skip on a received-unread item. Before Looks right, Skip on wage docs parks typed income. */
export function skipUnreadDoc(draft: FoxIntakeDraft): FoxIntakeDraft {
  const unread = unreadDocOpen(draft);
  const next: FoxIntakeDraft = { ...draft, looksRightHold: undefined, awaitingUnreadNote: false };
  const kind = unread ? receivedClassOf(unread) ?? unread.extractClass : null;
  if (!draft.sampleAccepted && (kind === "w2" || kind === "paystub" || wageThreadOpen(draft))) {
    return skipWageDocs(next);
  }
  return skipCurrentInvite(next);
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
  emptyRead?: { name: string; size: number };
};

export function emitDocIntake(detail: DocIntakeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DOC_INTAKE_EVENT, { detail }));
}
