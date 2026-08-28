import {
  CREDIT_STATED_NOTE,
  isLowestStatedCredit,
  statedCreditLabel,
  type CompletenessGroup,
  type CompletenessState,
  type FactProposal,
  type FoxAction,
  type FoxIntakeDraft,
  type FoxPrompt,
  type JumboPurpose,
  type ProductIntent,
  type ProposalKind,
} from "./types";
import {
  completenessFileFromDraft,
  displayFactValue,
  factLabel,
  factValue,
  isRemainderConfirmField,
  nextDocInvite,
  remainderProposalWrites,
  valuesMatch,
} from "./fileWrite";
import {
  QUALIFYING_INCOME_FIELD,
  SUGGESTED_INCOME_NOTE,
  WAGE_MONTHLY_FIELD,
  SE_MONTHLY_FIELD,
  K1_MONTHLY_FIELD,
  decliningIncomeCaution,
  hasScheduleCCashflow,
  wageIncomeCaution,
} from "./qualifyingIncome";
import {
  STATED_MONTHLY_DEBTS_FIELD,
  SUGGESTED_DEBTS_NOTE,
  monthlyDebtsConfirmCopy,
  skipMonthlyDebts,
} from "./monthlyDebts";
import {
  STATED_AVAILABLE_ASSETS_FIELD,
  SUGGESTED_ASSETS_NOTE,
  assetsSettled,
  availableAssetsConfirmCopy,
  availableAssetsExtractCopy,
  isLateWalkBankStatementAsk,
  skipAvailableAssets,
} from "./availableAssets";
import {
  PROPERTY_ADDRESS_FACT,
  PROPERTY_TYPE_FIELD,
  SUGGESTED_PROPERTY_NOTE,
  contractAddressConfirmCopy,
  isPropertyTypeValue,
  parsePropertyType,
  propertyAddressSettled,
  propertyTypeConfirmCopy,
  adoptReuseZip,
  rememberPriorZipOnNewAddress,
  skipPropertyType,
  typedAddressConfirmCopy,
} from "./propertyType";
import { citizenshipSettled } from "./citizenship";
import {
  STATED_TIME_ON_JOB_FIELD,
  SUGGESTED_TIME_ON_JOB_NOTE,
  displayTimeOnJob,
  hireDateConfirmCopy,
  proposeExtractedTimeOnJob,
  skipTimeOnJob,
  timeOnJobConfirmCopy,
  writeStatedTimeOnJob,
} from "./timeOnJob";
import {
  STATED_CURRENT_HOUSING_FIELD,
  SUGGESTED_HOUSING_NOTE,
  currentHousingConfirmCopy,
  currentHousingExtractCopy,
  proposeExtractedCurrentHousing,
  skipCurrentHousing,
  writeStatedCurrentHousing,
} from "./currentHousing";
import {
  STATED_DECLARATION_FIELD,
  declarationsConfirmCopy,
  isStatedDeclaration,
  skipDeclarations,
  writeStatedDeclaration,
} from "./declarations";
import {
  STATED_HOUSEHOLD_FIELD,
  householdConfirmCopy,
  isStatedHousehold,
  skipHousehold,
  writeStatedHousehold,
} from "./household";
import {
  coborrowerExtractCopy,
  coborrowerNameConfirmCopy,
  isCoborrowerNameField,
  skipCoborrowerName,
  writeCoborrowerName,
} from "./coborrowerName";
import {
  BORROWER_NAME_FIELD,
  borrowerNameConfirmCopy,
  borrowerNameExtractCopy,
  isBorrowerNameField,
  skipBorrowerName,
  writeBorrowerName,
} from "./borrowerName";
import {
  historyGapNeeded,
  writeCurrentEmploymentHistory,
  writeCurrentEmploymentStart,
  writePresentAddressHistory,
} from "./fileHistory";
import {
  FILE_NET_ROLE_FIELD,
  OTHER_REO_PAYMENT_FIELD,
  STATED_OTHER_REO_FIELD,
  SUGGESTED_FILE_NET_FIELD,
  fileNetConfirmCopy,
  isFileNetField,
  isStatedOtherReo,
  maybeProposeOtherReoFileNet,
  otherReoFileNetNeedsStatement,
  otherPropertyPaymentConfirmCopy,
  otherReoConfirmCopy,
  proposeExtractedOtherReo,
  skipOtherReo,
  skipOtherReoFileNet,
  writeStatedOtherReo,
} from "./otherReo";
import {
  HIGH_LTV_CAUTION as STORE_HIGH_LTV_CAUTION,
  HIGH_PURCHASE_LTV as STORE_HIGH_PURCHASE_LTV,
  JUMBO_CEILING_LINE,
  namedCondoIneligible,
  namedCondoLanguage,
  namedNewOrConvertedCondo,
  completeness as storeCompleteness,
  escalate as storeEscalate,
  flags as storeFlags,
  type CompletenessFile,
  type NamedDebt,
} from "@/lib/guidelines/conventional";
import {
  RENTAL_GROSS_FIELD,
  RENTAL_INCOME_FIELD,
  RENTAL_NET_ROLE_FIELD,
  RENTAL_PITIA_FIELD,
  SUGGESTED_NET_RENTAL_FIELD,
  draftHasLease,
  draftHasScheduleE,
  draftHasUnsupportedRental,
  draftNeedsReoStatement,
  draftRentalNamed,
  parseRentalMoney,
  rentalConfirmAsk,
} from "./rentalIncome";
import { conventionalCompletenessCopy, conventionalSlotCount } from "./conventionalFile";
import {
  ESTIMATED_HOUSING_FIELD,
  draftRentalDtiNet,
  housingConfirmCopy,
  qualifyingIncomeConfirmCopy,
  skipEstimatedHousing,
  syncCalculatorDraft,
} from "./calculators";
import { statedDti } from "@/lib/calculators/conventional";

export const SUGGESTED_NOTE = "Suggested · not verified";
export const PROPOSED_NOTE = "Proposed · confirm";
export {
  SUGGESTED_INCOME_NOTE,
  QUALIFYING_INCOME_FIELD,
  SUGGESTED_DEBTS_NOTE,
  STATED_MONTHLY_DEBTS_FIELD,
  SUGGESTED_ASSETS_NOTE,
  STATED_AVAILABLE_ASSETS_FIELD,
  SUGGESTED_PROPERTY_NOTE,
  PROPERTY_TYPE_FIELD,
  SUGGESTED_TIME_ON_JOB_NOTE,
  STATED_TIME_ON_JOB_FIELD,
  SUGGESTED_HOUSING_NOTE,
  STATED_CURRENT_HOUSING_FIELD,
};
export const YEARS_IN_BUSINESS_FIELD = "years_in_business";
export const YEARS_IN_BUSINESS_ASK = "How long have you had this business?";
export const MISSING_LINE = "—";

export function businessNameOnFile(draft?: FoxIntakeDraft | null) {
  if (!draft) return "";
  return factValue(draft, "employer_name").trim();
}

/** Self-employed tenure after a skipped or missing return. Purchase timeline stays “What’s the timeline?” */
export function yearsInBusinessAskCopy(draft?: FoxIntakeDraft | null) {
  const name = businessNameOnFile(draft);
  return name ? `How long have you had ${name}?` : YEARS_IN_BUSINESS_ASK;
}

export const COMPLETENESS_GROUPS: CompletenessGroup[] = [
  "identity",
  "property",
  "loan",
  "income",
  "credit",
];

export type RequiredLine = {
  id: string;
  label: string;
  prompt: FoxPrompt;
};

function moneyNumber(value: string): number | null {
  const cleaned = value.replace(/[$,]/g, "").replace(/\s/g, "");
  if (!cleaned || /[a-z]/i.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function jumboPurposeOfDraft(draft?: FoxIntakeDraft | null): JumboPurpose | undefined {
  if (draft?.jumboPurpose === "buy" || draft?.jumboPurpose === "refinance") {
    return draft.jumboPurpose;
  }
  return undefined;
}

export function isPurchaseLike(draft?: FoxIntakeDraft | null) {
  const intent = draft?.productIntent;
  if (intent === "buy") return true;
  if (intent === "jumbo") return jumboPurposeOfDraft(draft) !== "refinance";
  return false;
}

export function isRefiLike(draft?: FoxIntakeDraft | null) {
  const intent = draft?.productIntent;
  if (intent === "refinance") return true;
  if (intent === "jumbo") return jumboPurposeOfDraft(draft) === "refinance";
  return false;
}

export function isHelocFile(draft?: FoxIntakeDraft | null) {
  return draft?.productIntent === "heloc";
}

export function isJumboFile(draft?: FoxIntakeDraft | null) {
  return draft?.productIntent === "jumbo";
}

/** Conventional purchase / refinance only. HELOC and Jumbo stay thin. */
export function showsAgencyCompleteness(draft?: FoxIntakeDraft | null) {
  return draft?.productIntent === "buy" || draft?.productIntent === "refinance";
}

export function hasPurchasePrice(draft?: FoxIntakeDraft | null) {
  return (draft?.propertyValueAmount ?? 0) > 0 && isPurchaseLike(draft);
}

export function hasPropertyValue(draft?: FoxIntakeDraft | null) {
  return (draft?.propertyValueAmount ?? 0) > 0;
}

export function hasLoanAmount(draft?: FoxIntakeDraft | null) {
  return (draft?.loanAmountValue ?? 0) > 0;
}

export function hasDownPayment(draft?: FoxIntakeDraft | null) {
  return (draft?.downPaymentAmount ?? 0) > 0;
}

export function hasHelocLine(draft?: FoxIntakeDraft | null) {
  return isHelocFile(draft) && hasLoanAmount(draft);
}

/** Confirmed down ÷ price. Used to re-propose the pair when price changes. */
export function lockedDownShare(draft?: FoxIntakeDraft | null): number | null {
  if (!draft || !isPurchaseLike(draft) || !hasPropertyValue(draft) || !hasDownPayment(draft)) {
    return null;
  }
  const share = draft.downPaymentAmount! / draft.propertyValueAmount!;
  if (!Number.isFinite(share) || share <= 0 || share >= 1) return null;
  return share;
}

export function impliedLoanAmount(price?: number | null, down?: number | null) {
  if (price == null || down == null || price <= 0 || down <= 0) return null;
  const loan = Math.round(price - down);
  return loan > 0 && loan < price ? loan : null;
}

export function impliedDownPayment(price?: number | null, loan?: number | null) {
  if (price == null || loan == null || price <= 0 || loan <= 0) return null;
  const down = Math.round(price - loan);
  return down > 0 && down < price ? down : null;
}

/** Price + (down OR loan) for purchase. Loan + property value for refi. */
export function agencyMinimumsMet(draft?: FoxIntakeDraft | null) {
  if (!draft) return false;
  if (isPurchaseLike(draft)) {
    return hasPropertyValue(draft) && (hasDownPayment(draft) || hasLoanAmount(draft));
  }
  if (isRefiLike(draft)) {
    return hasLoanAmount(draft) && hasPropertyValue(draft);
  }
  return false;
}

export function sketchAmountsReady(draft: FoxIntakeDraft) {
  if (isHelocFile(draft)) return hasHelocLine(draft);
  if (isPurchaseLike(draft) || isRefiLike(draft)) return agencyMinimumsMet(draft);
  if (draft.productIntent === "other") {
    if (!draft.amountPurposeLabel) return Boolean(draft.amountAsked);
    return hasLoanAmount(draft) || hasPropertyValue(draft);
  }
  return false;
}

export function requiredStructureLines(draft?: FoxIntakeDraft | null): RequiredLine[] {
  if (!draft?.productIntent) return [];
  const occupancy: RequiredLine = { id: "occupancy", label: "Occupancy", prompt: "occupancy" };
  const timeline: RequiredLine = { id: "timeline", label: "Timeline", prompt: "timeline" };
  const credit: RequiredLine = { id: "credit", label: "Credit", prompt: "credit" };
  const income: RequiredLine = { id: "income", label: "Income", prompt: "income" };
  if (isHelocFile(draft)) {
    return [
      occupancy,
      timeline,
      { id: "line", label: "HELOC line", prompt: "amount" },
      credit,
      income,
    ];
  }
  if (isPurchaseLike(draft)) {
    return [
      occupancy,
      timeline,
      { id: "price", label: "Purchase price", prompt: "value" },
      { id: "down", label: "Down payment", prompt: "amount" },
      { id: "loan", label: "Loan amount", prompt: "amount" },
      credit,
      income,
    ];
  }
  if (isRefiLike(draft)) {
    return [
      occupancy,
      timeline,
      { id: "loan", label: "Loan amount", prompt: "amount" },
      { id: "home", label: "Property value", prompt: "value" },
      credit,
      income,
    ];
  }
  const named = (draft.amountPurposeLabel ?? "").trim();
  return [
    occupancy,
    timeline,
    { id: "numbers", label: named || "Amount", prompt: "amount" },
    credit,
    income,
  ];
}

function occupancyPresent(draft: FoxIntakeDraft) {
  return Boolean(draft.occupancyChoice.value);
}

function identityPresent(draft: FoxIntakeDraft) {
  return Boolean(
    draft.borrowerName ||
      draft.contact.fullName.value ||
      factValue(draft, "full_name") ||
      draft.documents.some((doc) => doc.extractClass === "government_id" || doc.slot === "id"),
  );
}

function identityDocumented(draft: FoxIntakeDraft) {
  const name = draft.facts?.full_name;
  if (name?.value && (name.source === "document" || name.source === "extracted-unconfirmed")) {
    return true;
  }
  return draft.documents.some(
    (doc) =>
      (doc.extractClass === "government_id" || doc.slot === "id") &&
      (doc.status === "extracted" || doc.status === "received" || doc.status === "reading"),
  );
}

function propertyDocumented(draft: FoxIntakeDraft) {
  if (!occupancyPresent(draft)) return false;
  if (factValue(draft, "property_address")) return true;
  return draft.documents.some(
    (doc) =>
      (doc.extractClass === "purchase_contract" || doc.extractClass === "mortgage_statement") &&
      (doc.status === "extracted" || doc.status === "received"),
  );
}

function loanDocumented(draft: FoxIntakeDraft) {
  if (!agencyMinimumsMet(draft) && !isHelocFile(draft)) return false;
  if (isHelocFile(draft) && !hasHelocLine(draft)) return false;
  const fromDoc =
    Boolean(factValue(draft, "purchase_price")) ||
    Boolean(factValue(draft, "unpaid_principal")) ||
    draft.documents.some(
      (doc) =>
        (doc.extractClass === "purchase_contract" || doc.extractClass === "mortgage_statement") &&
        (doc.status === "extracted" || doc.status === "received"),
    );
  return fromDoc;
}

function incomeDocumented(draft: FoxIntakeDraft) {
  if (!draft.incomeType.value) return false;
  const employer = draft.facts?.employer_name;
  const pay = draft.facts?.gross_period || draft.facts?.wages || draft.facts?.agi || draft.facts?.ytd_gross;
  const confirmedExtract = [employer, pay].some(
    (field) =>
      field?.value &&
      field.confirmed &&
      (field.source === "document" || field.source === "extracted-unconfirmed"),
  );
  return confirmedExtract;
}

function groupPresent(draft: FoxIntakeDraft, group: CompletenessGroup) {
  if (group === "identity") return identityPresent(draft);
  if (group === "property") return occupancyPresent(draft);
  if (group === "loan") return sketchAmountsReady(draft);
  if (group === "income") return Boolean(draft.incomeType.value);
  return Boolean(draft.creditAsked || draft.creditBand);
}

function groupDocumented(draft: FoxIntakeDraft, group: CompletenessGroup) {
  if (group === "identity") return identityDocumented(draft);
  if (group === "property") return occupancyPresent(draft) && (propertyDocumented(draft) || Boolean(draft.sampleAccepted));
  if (group === "loan") return loanDocumented(draft) || (agencyMinimumsMet(draft) && Boolean(draft.sampleAccepted));
  if (group === "income") return incomeDocumented(draft);
  return Boolean(draft.creditBand && draft.creditBand !== "not-sure" && draft.sampleAccepted);
}

export type CompletenessMap = {
  state: CompletenessState;
  filled: number;
  total: number;
  groups: Record<CompletenessGroup, { present: boolean; documented: boolean }>;
  copy: string;
};

/** Identity + income facts confirmed from documents. Looks right / sampleAccepted is not enough. */
function identityAndIncomeConfirmedFromDocs(draft: FoxIntakeDraft) {
  return identityDocumented(draft) && incomeDocumented(draft);
}

function completenessDisplayCopy(state: CompletenessState, draft: FoxIntakeDraft) {
  return conventionalCompletenessCopy(state === "documented" ? "documented" : "sketch", draft);
}

export function fileCompleteness(draft: FoxIntakeDraft): CompletenessMap | null {
  if (!showsAgencyCompleteness(draft)) return null;
  const groups = {} as CompletenessMap["groups"];
  let documentedCount = 0;
  for (const group of COMPLETENESS_GROUPS) {
    const present = groupPresent(draft, group);
    const documented = groupDocumented(draft, group);
    groups[group] = { present, documented };
    if (documented) documentedCount += 1;
  }
  const slots = conventionalSlotCount(draft);
  const minimums = agencyMinimumsMet(draft);
  const fromDocs = identityAndIncomeConfirmedFromDocs(draft);
  let state: CompletenessState = "sketch";
  if (minimums && documentedCount === COMPLETENESS_GROUPS.length && fromDocs) {
    state = "documented";
  } else if (minimums && fromDocs) {
    state = "agency_partial";
  }
  return {
    state,
    filled: slots.filled,
    total: slots.total,
    groups,
    copy: completenessDisplayCopy(state, draft),
  };
}

export function completenessCopy(draft: FoxIntakeDraft) {
  return fileCompleteness(draft)?.copy ?? "";
}

export const HIGH_LTV_CAUTION = STORE_HIGH_LTV_CAUTION;
export const PRICING_WAITS = "Investment occupancy. Pricing waits.";
export const HIGH_PURCHASE_LTV = STORE_HIGH_PURCHASE_LTV;

export function sketchedPurchaseLtv(draft?: FoxIntakeDraft | null): number | null {
  if (!draft || draft.productIntent !== "buy") return null;
  const price = draft.propertyValueAmount;
  const loan =
    draft.loanAmountValue != null && draft.loanAmountValue > 0
      ? draft.loanAmountValue
      : price != null && draft.downPaymentAmount != null
        ? Math.round(price - draft.downPaymentAmount)
        : null;
  if (price == null || price <= 0 || loan == null || loan <= 0) return null;
  return loan / price;
}

export function loanExceedsPurchasePrice(draft?: FoxIntakeDraft | null) {
  const ltv = sketchedPurchaseLtv(draft);
  return ltv != null && ltv > 1;
}

export function highPurchaseLtv(draft?: FoxIntakeDraft | null) {
  const ltv = sketchedPurchaseLtv(draft);
  return ltv != null && ltv > HIGH_PURCHASE_LTV && ltv <= 1;
}

export function lowestCreditBand(draft?: FoxIntakeDraft | null) {
  return (
    isLowestStatedCredit(draft?.creditBand) ||
    draft?.scenario?.creditRange === "680-719" ||
    draft?.scenario?.creditRange === "640-679" ||
    draft?.scenario?.creditRange === "below-640"
  );
}

const DEBT_FACT_KEYS: Record<string, string> = {
  auto_loan: "the auto loan",
  car_loan: "the car loan",
  car_payment: "the car payment",
  student_loan: "the student loan",
  credit_card: "the credit card",
  alimony: "alimony",
  child_support: "child support",
  installment_debt: "the installment debt",
  other_debt: "the other debt",
  monthly_debt: "that debt",
};

function inferredIncomeClasses(draft: FoxIntakeDraft): string[] {
  const extra: string[] = [];
  if (
    factValue(draft, "gross_period") ||
    factValue(draft, "pay_period_end") ||
    factValue(draft, "ytd_gross") ||
    factValue(draft, "pay_frequency")
  ) {
    extra.push("paystub");
  }
  if (factValue(draft, "wages")) extra.push("w2");
  if (
    factValue(draft, "schedule_c_net_profit") ||
    factValue(draft, "k1_ordinary_income") ||
    factValue(draft, "return_kind") ||
    factValue(draft, "agi")
  ) {
    extra.push("tax_return");
  }
  return extra;
}

function namedDebtsFromDraft(draft: FoxIntakeDraft): NamedDebt[] {
  const facts = draft.facts ?? {};
  const debts: NamedDebt[] = [];
  const seen = new Set<string>();
  for (const [key, label] of Object.entries(DEBT_FACT_KEYS)) {
    const fact = facts[key];
    if (!fact?.value || fact.value === "0") continue;
    const named = /[a-z]/i.test(fact.value) && !/^\$?[\d,]+(?:\.\d+)?$/.test(fact.value.trim())
      ? fact.value.trim()
      : label;
    if (seen.has(named)) continue;
    seen.add(named);
    debts.push({ name: named });
  }
  const named = facts.debt_name?.value?.trim();
  if (named && !seen.has(named)) debts.push({ name: named });
  return debts;
}

export function factsFromDraft(draft: FoxIntakeDraft): CompletenessFile {
  const occupancyRaw = draft.occupancyChoice.value || draft.scenario?.occupancy || "";
  const occupancy =
    occupancyRaw === "second-home" ? "second" : occupancyRaw || undefined;
  const purchase = isPurchaseLike(draft);
  const refi = isRefiLike(draft);
  const purposeHint = purchase ? "purchase" : draft.cashOut ? "cash_out" : refi ? "lcor" : undefined;
  const income = draft.incomeType.value;
  const incomeType =
    income === "w2"
      ? "w2_base"
      : income === "self-employed"
        ? "se_schedule_c"
        : income === "both"
          ? "w2_plus_se"
          : income || undefined;
  let loanAmount: number | undefined;
  if (draft.loanAmountValue != null && draft.loanAmountValue > 0) {
    loanAmount = draft.loanAmountValue;
  } else if (purchase && draft.propertyValueAmount != null && draft.downPaymentAmount != null) {
    const implied = Math.round(draft.propertyValueAmount - draft.downPaymentAmount);
    if (implied > 0) loanAmount = implied;
  }
  const debts = namedDebtsFromDraft(draft);
  const suggestedMonthlyIncome = moneyNumber(draft.facts?.[QUALIFYING_INCOME_FIELD]?.value ?? "");
  const computedDti =
    draft.statedDti ??
    statedDti(
      draft.estimatedHousing,
      draft.statedMonthlyDebts,
      suggestedMonthlyIncome,
      draftRentalDtiNet(draft),
    );
  const base = completenessFileFromDraft(draft);
  const received = new Set(base.received ?? []);
  for (const id of inferredIncomeClasses(draft)) received.add(id);
  return {
    ...base,
    received: Array.from(received),
    w2Count: Math.max(base.w2Count ?? 0, received.has("w2") ? 1 : 0),
    taxReturnCount: Math.max(base.taxReturnCount ?? 0, received.has("tax_return") ? 1 : 0),
    product: draft.productIntent || undefined,
    occupancy,
    purposeHint,
    state: draft.outOfState ? "XX" : "CA",
    purchasePrice: purchase && draft.propertyValueAmount ? draft.propertyValueAmount : undefined,
    downPayment: draft.downPaymentAmount || undefined,
    loanAmount,
    propertyValue: draft.propertyValueAmount || undefined,
    statedCreditBand: draft.creditBand || undefined,
    incomeType,
    namedGovvie: Boolean(draft.govProgram),
    namedDistress: Boolean(draft.creditEvent) || draft.statedDeclaration === "event",
    govProgram: draft.govProgram,
    wantsCreditDecision: false,
    requestedHuman: Boolean(draft.originatorRequested),
    commitmentRequired: Boolean(draft.overPriceConfirmed),
    unresolvedConflict: Boolean(draft.unresolvedConflict),
    ...(debts.length ? { debts } : {}),
    ...(draft.statedMonthlyDebts != null ? { statedMonthlyDebts: draft.statedMonthlyDebts } : {}),
    ...(draft.estimatedHousing != null ? { estimatedHousing: draft.estimatedHousing } : {}),
    ...(computedDti != null ? { statedDti: computedDti } : {}),
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
    ...((draftNeedsReoStatement(draft) || otherReoFileNetNeedsStatement(draft))
      ? { rentalNeedsStatement: true }
      : {}),
    ...(suggestedMonthlyIncome != null ? { suggestedMonthlyIncome } : {}),
    docsSkipped: Boolean(
      draft.documentsSkipped || draft.docsHeld || (draft.skippedClasses?.length ?? 0) > 0,
    ),
    ...guidelineSignalsFromDraft(draft),
  };
}

function guidelineSignalsFromDraft(draft: FoxIntakeDraft): Partial<CompletenessFile> {
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
    rentalNeedsStatement: draftNeedsReoStatement(draft),
  };
}

export { completenessFileFromDraft };

export function fileStoreCompleteness(draft: FoxIntakeDraft) {
  return storeCompleteness(draft.productIntent ?? "", completenessFileFromDraft(draft));
}

export function shouldEscalate(draft: FoxIntakeDraft) {
  return storeEscalate(factsFromDraft(draft)).action === "escalate";
}

/** One quiet File / Fox line. Never a verdict. First store flag wins. Income decline is last. */
export function guidelineCaution(draft: FoxIntakeDraft): string | undefined {
  if (draft.productIntent === "heloc") return undefined;
  const flagged = storeFlags(factsFromDraft(draft)).caution;
  if (flagged === JUMBO_CEILING_LINE && draft.productIntent === "jumbo") {
    return decliningIncomeCaution(draft) ?? wageIncomeCaution(draft);
  }
  if (flagged) return flagged;
  return decliningIncomeCaution(draft) ?? wageIncomeCaution(draft);
}

export function proposalNote(kind: ProposalKind) {
  return kind === "public" ? SUGGESTED_NOTE : kind === "computed" ? PROPOSED_NOTE : undefined;
}

export function proposalForField(draft: FoxIntakeDraft, field: string): FactProposal | null {
  const pending = draft.pendingProposal;
  if (pending && pending.field === field) return pending;
  return null;
}

export function structureFieldForProposal(field: string) {
  if (field === "downPayment" || field === "down_payment") return "down";
  if (field === "loanAmount" || field === "loan_amount" || field === "unpaid_principal") return "loan";
  if (field === "purchase_price" || field === "propertyValue") return "price";
  if (field === "property_value" || field === "home_value") return "home";
  if (field === "employer_name") return "employer";
  if (field === "full_name") return "name";
  if (field === "property_address") return "address";
  if (field === QUALIFYING_INCOME_FIELD) return "qualifying";
  if (field === STATED_MONTHLY_DEBTS_FIELD) return "debts";
  if (field === STATED_AVAILABLE_ASSETS_FIELD) return "assets";
  if (field === PROPERTY_TYPE_FIELD) return "property-type";
  if (field === STATED_TIME_ON_JOB_FIELD) return "time-on-job";
  if (field === STATED_CURRENT_HOUSING_FIELD) return "current-housing";
  if (field === STATED_DECLARATION_FIELD) return "declarations";
  if (field === STATED_HOUSEHOLD_FIELD) return "household";
  if (isBorrowerNameField(field)) return "borrower";
  if (field === STATED_OTHER_REO_FIELD) return "other-reo";
  return field;
}

function fundsMoneyShown(field: string, value: string) {
  const shown = displayFactValue(field, value);
  if (/^-?\$/.test(shown)) return shown;
  const n = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? `$${Math.round(n).toLocaleString("en-US")}` : value;
}

export function remainderAskCopy(proposal: FactProposal) {
  const writes = remainderProposalWrites(proposal);
  const named = writes
    .map((item) => `${item.label} ${displayFactValue(item.field, item.value)}`)
    .join(", ");
  if (writes.some((item) => item.field === "ending_balance" || item.field === "institution")) {
    return `The bank statement has ${named}. Use this?`;
  }
  if (writes.some((item) => item.field === "purchase_price" || item.field === "close_date")) {
    return `The purchase contract has ${named}. Use this?`;
  }
  if (writes.some((item) => item.field === "servicer" || item.field === "unpaid_principal")) {
    return `The mortgage statement has ${named}. Use this?`;
  }
  if (writes.some((item) => item.field === "property_address") && writes.length === 1) {
    return `The document has property ${displayFactValue("property_address", writes[0].value)}. Use this?`;
  }
  if (
    writes.some(
      (item) =>
        item.field === "employer_name" ||
        item.field === "gross_period" ||
        item.field === "ytd_gross" ||
        item.field === "pay_period_end" ||
        item.field === "wages",
    )
  ) {
    return `The document has ${named}. Suggested · not underwritten. Use this?`;
  }
  return `The document has ${named}. Use this?`;
}

export function proposalAskCopy(proposal: FactProposal) {
  if (proposal.field === PROPERTY_TYPE_FIELD && isPropertyTypeValue(proposal.value)) {
    return propertyTypeConfirmCopy(proposal.value);
  }
  if (proposal.field === STATED_TIME_ON_JOB_FIELD) {
    const months = Number(proposal.value) || 0;
    return proposal.hireLabel
      ? hireDateConfirmCopy(proposal.hireLabel, months)
      : timeOnJobConfirmCopy(months);
  }
  if (proposal.field === STATED_CURRENT_HOUSING_FIELD) {
    const amount = Number(proposal.value) || 0;
    return proposal.extras?.length
      ? currentHousingExtractCopy(amount)
      : currentHousingConfirmCopy(amount);
  }
  if (proposal.field === STATED_DECLARATION_FIELD && isStatedDeclaration(proposal.value)) {
    return declarationsConfirmCopy(proposal.value);
  }
  if (proposal.field === STATED_HOUSEHOLD_FIELD && isStatedHousehold(proposal.value)) {
    return householdConfirmCopy(proposal.value);
  }
  if (isBorrowerNameField(proposal.field)) {
    const address = proposal.extras?.find((item) => item.field === "present_address")?.value;
    return proposal.extras
      ? borrowerNameExtractCopy(proposal.value, address)
      : borrowerNameConfirmCopy(proposal.value);
  }
  if (isCoborrowerNameField(proposal.field)) {
    return proposal.extras
      ? coborrowerExtractCopy(proposal.value)
      : coborrowerNameConfirmCopy(proposal.value);
  }
  if (proposal.field === OTHER_REO_PAYMENT_FIELD) {
    return otherPropertyPaymentConfirmCopy(Number(proposal.value) || 0);
  }
  if (isFileNetField(proposal.field)) {
    const complete = Number(proposal.extras?.find((item) => item.field === "file_net_complete_count")?.value ?? 1);
    return fileNetConfirmCopy({ net: Number(proposal.value), completeCount: complete }) ?? "";
  }
  if (proposal.field === STATED_OTHER_REO_FIELD && isStatedOtherReo(proposal.value)) {
    return otherReoConfirmCopy(proposal.value);
  }
  if (proposal.field === PROPERTY_ADDRESS_FACT || proposal.field === "subjectAddress") {
    return proposal.note === SUGGESTED_PROPERTY_NOTE && !proposal.extras?.length
      ? typedAddressConfirmCopy(proposal.value)
      : contractAddressConfirmCopy(proposal.value);
  }
  if (proposal.field === STATED_AVAILABLE_ASSETS_FIELD) {
    const amount = Number(proposal.value) || 0;
    const institution = proposal.extras?.find((item) => item.field === "institution")?.value;
    return proposal.extras?.length
      ? availableAssetsExtractCopy(amount, institution)
      : availableAssetsConfirmCopy(amount);
  }
  const shown = displayFactValue(proposal.field, proposal.value);
  if (proposal.field === QUALIFYING_INCOME_FIELD) {
    return qualifyingIncomeConfirmCopy(Number(proposal.value) || 0);
  }
  if (isRemainderConfirmField(proposal.field) || proposal.extras?.length) {
    return remainderAskCopy(proposal);
  }
  if (proposal.field === ESTIMATED_HOUSING_FIELD) {
    return housingConfirmCopy(Number(proposal.value) || 0);
  }
  if (proposal.field === RENTAL_INCOME_FIELD || proposal.field === SUGGESTED_NET_RENTAL_FIELD) {
    const complete = Number(proposal.extras?.find((item) => item.field === "rental_complete_count")?.value ?? 1);
    return rentalConfirmAsk(proposal.methodNote, Number(proposal.value), complete);
  }
  if (proposal.field === STATED_MONTHLY_DEBTS_FIELD) {
    return monthlyDebtsConfirmCopy(Number(proposal.value) || 0);
  }
  if (proposal.kind === "public") {
    return `I have ${proposal.label} ${shown}. ${SUGGESTED_NOTE}. Is that you?`;
  }
  if (proposal.kind === "computed") {
    if (proposal.companion && (proposal.field === "downPayment" || proposal.field === "loanAmount")) {
      const down =
        proposal.field === "downPayment" ? proposal.value : proposal.companion.value;
      const loan =
        proposal.field === "loanAmount" ? proposal.value : proposal.companion.value;
      return `${fundsMoneyShown("downPayment", down)} down · ${fundsMoneyShown("loanAmount", loan)} loan. Use this?`;
    }
    if (proposal.field === "loanAmount") {
      return `Loan amount would be ${shown} from the purchase price and down payment. Use this?`;
    }
    if (proposal.field === "downPayment") {
      return `Down payment would be ${shown} from the purchase price and loan amount. Use this?`;
    }
    return `${proposal.label} would be ${shown}. Use this?`;
  }
  return `The document has ${proposal.label} ${shown}. Use this?`;
}

export function incomeConfirmActions(): FoxAction[] {
  return proposalActions("computed");
}

export function proposalActions(kind: ProposalKind): FoxAction[] {
  if (kind === "public") {
    return [
      { id: "accept-proposal", label: "Yes that’s me", event: "bubble", capture: { field: "accept-proposal" } },
      { id: "decline-proposal", label: "Keep file", event: "bubble", capture: { field: "decline-proposal" } },
    ];
  }
  if (kind === "computed") {
    return [
      { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
      { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
    ];
  }
  return [
    { id: "keep-file-fact", label: "Keep file", event: "bubble", capture: { field: "keep-file-fact" } },
    { id: "use-document-fact", label: "Use document", event: "bubble", capture: { field: "use-document-fact" } },
  ];
}

export function makeProposal(
  field: string,
  value: string,
  kind: ProposalKind,
  label = factLabel(field),
): FactProposal {
  return {
    field,
    value,
    label,
    kind,
    note: proposalNote(kind),
  };
}

export function makeFundsPairProposal(down: number, loan: number): FactProposal {
  return {
    field: "downPayment",
    value: String(down),
    label: "down payment",
    kind: "computed",
    note: PROPOSED_NOTE,
    companion: {
      field: "loanAmount",
      value: String(loan),
      label: "loan amount",
    },
  };
}

export function proposeFundsPair(draft: FoxIntakeDraft, down: number, loan: number): FoxIntakeDraft {
  return {
    ...draft,
    pendingProposal: makeFundsPairProposal(down, loan),
  };
}

function writeConfirmedFact(
  draft: FoxIntakeDraft,
  field: string,
  value: string,
  source: "computed" | "suggested" | "document",
): FoxIntakeDraft {
  if (
    field === "date_of_birth" ||
    field === "dob" ||
    field === "ssn" ||
    field === "full_ssn" ||
    field === "social" ||
    field === "social_security"
  ) {
    return draft;
  }
  const now = new Date().toISOString();
  const facts = { ...(draft.facts ?? {}) };
  facts[field] = {
    field,
    value,
    source,
    confirmed: true,
    confirmedAt: now,
  };
  let next: FoxIntakeDraft = { ...draft, facts };
  const amount = moneyNumber(value);
  if (field === "downPayment" && amount != null) {
    next = { ...next, downPaymentAmount: amount, downAsked: true };
  }
  if (field === "loanAmount" && amount != null) {
    next = { ...next, loanAmountValue: amount, amountAsked: true };
  }
  if ((field === "purchase_price" || field === "propertyValue") && amount != null) {
    next = { ...next, propertyValueAmount: amount, valueAsked: true };
  }
  if (field === "unpaid_principal" && amount != null) {
    next = { ...next, loanAmountValue: amount, amountAsked: true };
  }
  if (field === "employer_name" || field === QUALIFYING_INCOME_FIELD) {
    next = { ...next, facts };
  }
  if (field === "employer_name" && value.trim()) {
    next = writeCurrentEmploymentHistory(next, value);
  }
  if (field === "present_address" && value.trim()) {
    next = writePresentAddressHistory(next, value);
  }
  if (field === ESTIMATED_HOUSING_FIELD && amount != null) {
    next = {
      ...next,
      estimatedHousing: amount,
      housingAsked: true,
      facts,
    };
  }
  if (field === SUGGESTED_NET_RENTAL_FIELD) {
    const net = parseRentalMoney(value);
    if (net != null) {
      next = { ...next, suggestedNetRental: net, facts };
    }
  }
  if (field === SUGGESTED_FILE_NET_FIELD) {
    const net = parseRentalMoney(value);
    if (net != null) {
      next = { ...next, suggestedFileNet: net, fileNetAsked: undefined, skippedFileNet: undefined, facts };
    }
  }
  if (field === FILE_NET_ROLE_FIELD) {
    if (value === "income" || value === "liability" || value === "none" || value === "thin") {
      next = { ...next, fileNetRole: value, facts };
    }
  }
  if (field === RENTAL_GROSS_FIELD) {
    const gross = parseRentalMoney(value);
    if (gross != null) next = { ...next, rentalGrossMonthly: gross, facts };
  }
  if (field === RENTAL_PITIA_FIELD) {
    const pitia = parseRentalMoney(value);
    if (pitia != null) next = { ...next, rentalPitiaUsed: pitia, facts };
  }
  if (field === RENTAL_NET_ROLE_FIELD) {
    if (value === "income" || value === "liability" || value === "none" || value === "thin") {
      next = { ...next, rentalNetRole: value, facts };
    }
  }
  if (field === STATED_MONTHLY_DEBTS_FIELD && amount != null) {
    next = {
      ...next,
      statedMonthlyDebts: amount,
      monthlyDebtsAsked: true,
      pendingDebtMortgage: null,
      facts,
    };
  }
  if (field === STATED_AVAILABLE_ASSETS_FIELD && amount != null) {
    next = {
      ...next,
      statedAvailableAssets: amount,
      availableAssetsAsked: true,
      bankStatementAsked: isLateWalkBankStatementAsk(draft) ? true : draft.bankStatementAsked,
      looksRightHold: isLateWalkBankStatementAsk(draft) ? false : draft.looksRightHold,
      facts,
    };
  }
  if (field === PROPERTY_TYPE_FIELD && isPropertyTypeValue(value)) {
    next = {
      ...next,
      propertyType: value,
      propertyTypeAsked: true,
      facts,
    };
  }
  if (field === STATED_TIME_ON_JOB_FIELD) {
    const months = Number(value);
    if (Number.isFinite(months) && months > 0) {
      const hireLabel = draft.pendingProposal?.hireLabel?.trim();
      next = writeStatedTimeOnJob(next, months, hireLabel || displayTimeOnJob(months));
      if (hireLabel) next = writeCurrentEmploymentStart(next, hireLabel);
    }
  }
  if (field === STATED_CURRENT_HOUSING_FIELD && amount != null) {
    next = writeStatedCurrentHousing(next, amount);
  }
  if (field === STATED_DECLARATION_FIELD && isStatedDeclaration(value)) {
    next = writeStatedDeclaration(next, value, draft.pendingProposal?.methodNote);
  }
  if (field === STATED_HOUSEHOLD_FIELD && isStatedHousehold(value)) {
    next = writeStatedHousehold(next, value);
  }
  if (isBorrowerNameField(field) && value.trim()) {
    next = writeBorrowerName(next, value);
  }
  if (isCoborrowerNameField(field) && value.trim()) {
    next = writeCoborrowerName(next, value);
  }
  if (field === STATED_OTHER_REO_FIELD && isStatedOtherReo(value)) {
    next = writeStatedOtherReo(next, value);
  }
  if (field === PROPERTY_ADDRESS_FACT || field === "subjectAddress") {
    facts[PROPERTY_ADDRESS_FACT] = {
      field: PROPERTY_ADDRESS_FACT,
      value,
      source,
      confirmed: true,
      confirmedAt: now,
    };
    next = adoptReuseZip(
      rememberPriorZipOnNewAddress(next, {
        ...next,
        subjectAddress: value,
        subjectAddressAsked: true,
        facts,
      }),
    );
  }
  if (field === "year_built") next = { ...next, propertyYearBuilt: value, facts };
  if (field === "units") next = { ...next, propertyUnits: value, facts };
  if (field === "annual_taxes") next = { ...next, propertyTaxes: value, facts };
  if (field === "hoa_monthly") next = { ...next, propertyHoa: value, facts };
  if (field === "property_type") {
    const parsed = parsePropertyType(value);
    if (parsed) next = { ...next, propertyType: parsed, propertyTypeAsked: true, facts };
  }
  if (field === "full_name" && !draft.contact.fullName.value) {
    next = {
      ...next,
      contact: {
        ...draft.contact,
        fullName: { field: "fullName", value, source, confirmed: true, confirmedAt: now },
      },
    };
  }
  return next;
}

export function proposeIfEmpty(
  draft: FoxIntakeDraft,
  field: string,
  value: string,
  kind: ProposalKind,
): { draft: FoxIntakeDraft; proposal: FactProposal | null } {
  const existing =
    field === "downPayment"
      ? draft.downPaymentAmount != null
        ? String(draft.downPaymentAmount)
        : ""
      : field === "loanAmount"
        ? draft.loanAmountValue != null
          ? String(draft.loanAmountValue)
          : ""
        : field === "purchase_price" || field === "propertyValue"
          ? draft.propertyValueAmount != null
            ? String(draft.propertyValueAmount)
            : ""
          : factValue(draft, field);
  if (existing) {
    if (valuesMatch(existing, value)) return { draft, proposal: null };
    return { draft, proposal: null };
  }
  const proposal = makeProposal(field, value, kind);
  return { draft: { ...draft, pendingProposal: proposal }, proposal };
}

export function proposePublicSuggestion(
  draft: FoxIntakeDraft,
  field: string,
  value: string,
): { draft: FoxIntakeDraft; proposal: FactProposal | null } {
  return proposeIfEmpty(draft, field, value, "public");
}

export function withComputedCompanion(
  draft: FoxIntakeDraft,
  force?: "down" | "loan",
): FoxIntakeDraft {
  if (!isPurchaseLike(draft) || draft.pendingProposal || draft.pendingConflict) return draft;
  const price = draft.propertyValueAmount;
  if (price == null || price <= 0) return draft;
  const proposeLoan = hasDownPayment(draft) && (!hasLoanAmount(draft) || force === "down");
  if (proposeLoan) {
    const loan = impliedLoanAmount(price, draft.downPaymentAmount);
    if (loan == null) return draft;
    if (draft.loanAmountValue === loan) return draft;
    if (force === "down" && hasLoanAmount(draft)) {
      return { ...draft, loanAmountValue: loan, amountAsked: true };
    }
    return {
      ...draft,
      pendingProposal: makeProposal("loanAmount", String(loan), "computed", "loan amount"),
    };
  }
  const proposeDown = hasLoanAmount(draft) && (!hasDownPayment(draft) || force === "loan");
  if (proposeDown) {
    const down = impliedDownPayment(price, draft.loanAmountValue);
    if (down == null) return draft;
    if (draft.downPaymentAmount === down) return draft;
    return {
      ...draft,
      pendingProposal: makeProposal("downPayment", String(down), "computed", "down payment"),
    };
  }
  return draft;
}

export function resolveProposal(
  draft: FoxIntakeDraft,
  winner: "accept" | "decline",
): FoxIntakeDraft {
  const proposal = draft.pendingProposal;
  if (!proposal) return draft;
  if (winner === "decline") {
    if (proposal.field === ESTIMATED_HOUSING_FIELD) {
      return skipEstimatedHousing({ ...draft, pendingProposal: null });
    }
    if (proposal.field === STATED_MONTHLY_DEBTS_FIELD) {
      return skipMonthlyDebts({ ...draft, pendingProposal: null });
    }
    if (proposal.field === STATED_AVAILABLE_ASSETS_FIELD) {
      return skipAvailableAssets({ ...draft, pendingProposal: null });
    }
    if (proposal.field === PROPERTY_TYPE_FIELD) {
      return skipPropertyType({ ...draft, pendingProposal: null });
    }
    if (proposal.field === STATED_TIME_ON_JOB_FIELD) {
      return skipTimeOnJob({ ...draft, pendingProposal: null });
    }
    if (proposal.field === STATED_CURRENT_HOUSING_FIELD) {
      return skipCurrentHousing({ ...draft, pendingProposal: null, pendingCurrentHousing: null });
    }
    if (proposal.field === STATED_DECLARATION_FIELD) {
      return skipDeclarations({ ...draft, pendingProposal: null });
    }
    if (proposal.field === STATED_HOUSEHOLD_FIELD) {
      return skipHousehold({ ...draft, pendingProposal: null });
    }
    if (isBorrowerNameField(proposal.field)) {
      return skipBorrowerName({ ...draft, pendingProposal: null });
    }
    if (isCoborrowerNameField(proposal.field)) {
      return skipCoborrowerName({ ...draft, pendingProposal: null });
    }
    if (proposal.field === STATED_OTHER_REO_FIELD) {
      return skipOtherReo({ ...draft, pendingProposal: null });
    }
    if (isFileNetField(proposal.field)) {
      return skipOtherReoFileNet({ ...draft, pendingProposal: null });
    }
    const declined = { ...draft, pendingProposal: null };
    return flushPendingOtherReo(flushPendingCurrentHousing(flushPendingHireDate(declined)));
  }
  const source =
    proposal.field === QUALIFYING_INCOME_FIELD ||
      proposal.field === RENTAL_INCOME_FIELD ||
      proposal.field === SUGGESTED_NET_RENTAL_FIELD ||
      proposal.field === STATED_AVAILABLE_ASSETS_FIELD ||
      proposal.field === PROPERTY_TYPE_FIELD ||
      proposal.field === STATED_TIME_ON_JOB_FIELD ||
      proposal.field === STATED_CURRENT_HOUSING_FIELD ||
      proposal.field === STATED_DECLARATION_FIELD ||
      proposal.field === STATED_HOUSEHOLD_FIELD ||
      isBorrowerNameField(proposal.field) ||
      isCoborrowerNameField(proposal.field) ||
      proposal.field === STATED_OTHER_REO_FIELD ||
      isFileNetField(proposal.field) ||
      proposal.kind === "public"
      ? "suggested"
      : isRemainderConfirmField(proposal.field)
        ? "document"
        : proposal.kind === "computed"
          ? "computed"
          : "document";
  let next = writeConfirmedFact(draft, proposal.field, proposal.value, source);
  if (proposal.companion) {
    next = writeConfirmedFact(next, proposal.companion.field, proposal.companion.value, source);
  }
  for (const extra of proposal.extras ?? []) {
    next = writeConfirmedFact(next, extra.field, extra.value, source);
  }
  if (proposal.field === QUALIFYING_INCOME_FIELD && proposal.parts) {
    if (proposal.parts.wage) next = writeConfirmedFact(next, WAGE_MONTHLY_FIELD, proposal.parts.wage, source);
    if (proposal.parts.scheduleC) next = writeConfirmedFact(next, SE_MONTHLY_FIELD, proposal.parts.scheduleC, source);
    if (proposal.parts.k1) next = writeConfirmedFact(next, K1_MONTHLY_FIELD, proposal.parts.k1, source);
  }
  const cleared = { ...next, pendingProposal: null };
  const flushed = flushPendingOtherReo(flushPendingCurrentHousing(flushPendingHireDate(cleared)));
  const afterNet =
    winner === "accept" &&
    (proposal.field === SUGGESTED_NET_RENTAL_FIELD || proposal.field === RENTAL_INCOME_FIELD)
      ? syncCalculatorDraft(flushed)
      : flushed;
  const afterFileNet = winner === "accept" ? maybeProposeOtherReoFileNet(afterNet) : afterNet;
  if (winner === "accept" && shouldAskYearsInBusiness(afterFileNet)) {
    return withYearsInBusinessAsk(afterFileNet);
  }
  return afterFileNet;
}

function flushPendingHireDate(draft: FoxIntakeDraft): FoxIntakeDraft {
  const pending = draft.pendingHireDate;
  if (!pending || draft.statedTimeOnJob != null) {
    return { ...draft, pendingHireDate: null };
  }
  return proposeExtractedTimeOnJob(
    { ...draft, pendingHireDate: null },
    pending.months,
    pending.label,
  );
}

function flushPendingCurrentHousing(draft: FoxIntakeDraft): FoxIntakeDraft {
  const pending = draft.pendingCurrentHousing;
  if (!pending || draft.statedCurrentHousing != null) {
    return { ...draft, pendingCurrentHousing: null };
  }
  return proposeExtractedCurrentHousing(
    { ...draft, pendingCurrentHousing: null },
    pending.amount,
    pending.extras ?? [],
  );
}

function flushPendingOtherReo(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (!draft.pendingOtherReo || draft.statedOtherReo) {
    return { ...draft, pendingOtherReo: null };
  }
  return proposeExtractedOtherReo({ ...draft, pendingOtherReo: null });
}

export function yearsInBusinessValue(draft: FoxIntakeDraft) {
  return draft.facts?.[YEARS_IN_BUSINESS_FIELD]?.value ?? "";
}

export function wantsYearsInBusinessAsk(draft: FoxIntakeDraft) {
  const income = draft.incomeType.value;
  return income === "self-employed" || income === "both";
}

export function yearsInBusinessSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "years-in-business" || draft.awaitingYearsInBusiness) return false;
  if (!wantsYearsInBusinessAsk(draft)) return true;
  return Boolean(yearsInBusinessValue(draft) || draft.yearsInBusinessAsked);
}

export function yearsInBusinessSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-years-in-business",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-years-in-business" },
    },
    {
      id: "hold-years-in-business",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-years-in-business" },
    },
  ];
}

export function shouldAskYearsInBusiness(draft: FoxIntakeDraft) {
  return (
    hasScheduleCCashflow(draft) &&
    !yearsInBusinessValue(draft) &&
    !draft.yearsInBusinessAsked &&
    !draft.awaitingYearsInBusiness
  );
}

export function withYearsInBusinessAsk(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, yearsInBusinessAsked: true, awaitingYearsInBusiness: true };
}

export function writeYearsInBusiness(draft: FoxIntakeDraft, years: string): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    awaitingYearsInBusiness: false,
    yearsInBusinessAsked: true,
    facts: {
      ...(draft.facts ?? {}),
      [YEARS_IN_BUSINESS_FIELD]: {
        field: YEARS_IN_BUSINESS_FIELD,
        value: years,
        source: "client",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function skipYearsInBusiness(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, awaitingYearsInBusiness: false, yearsInBusinessAsked: true };
}

export function writeQualifyingIncome(draft: FoxIntakeDraft, monthly: string): FoxIntakeDraft {
  return {
    ...writeConfirmedFact(draft, QUALIFYING_INCOME_FIELD, monthly, "suggested"),
    pendingProposal: null,
    correcting: null,
    correctingLine: null,
  };
}

export function acceptComputedAmounts(draft: FoxIntakeDraft): FoxIntakeDraft {
  return resolveProposal(draft, "accept");
}

export function fundsAskNeeded(draft: FoxIntakeDraft) {
  return isPurchaseLike(draft) && hasPropertyValue(draft) && !hasDownPayment(draft) && !hasLoanAmount(draft);
}

export function propertyValueAskNeeded(draft: FoxIntakeDraft) {
  return isRefiLike(draft) && hasLoanAmount(draft) && !hasPropertyValue(draft);
}

export function purchasePriceAskNeeded(draft: FoxIntakeDraft) {
  return isPurchaseLike(draft) && !hasPropertyValue(draft);
}

export function refiLoanAskNeeded(draft: FoxIntakeDraft) {
  return isRefiLike(draft) && !hasLoanAmount(draft);
}

export function missingAmountAsk(draft: FoxIntakeDraft) {
  if (purchasePriceAskNeeded(draft)) return "What’s the purchase price?";
  if (fundsAskNeeded(draft)) return "What’s the down payment or loan amount?";
  if (refiLoanAskNeeded(draft)) return "What’s the approximate loan or payoff amount?";
  if (propertyValueAskNeeded(draft)) return "What’s the property value?";
  if (isHelocFile(draft) && !hasHelocLine(draft)) return "What line or cash do you need?";
  return "";
}

export function sketchAssembled(draft: FoxIntakeDraft) {
  if (!draft.path || !draft.productIntent) return false;
  if (!draft.occupancyChoice.value) return false;
  if (!sketchAmountsReady(draft)) return false;
  if (!draft.creditBand && !draft.creditAsked) return false;
  if (!draft.incomeType.value && !draft.incomeAsked) return false;
  if (draft.pendingProposal || draft.pendingConflict) return false;
  return true;
}

/** Timeline chip or an extracted close date. Skip leaves this empty — do not invent a date. */
export function timelineFilled(draft: FoxIntakeDraft) {
  if (draft.timelineChoice.value) return true;
  return Boolean(factValue(draft, "close_date"));
}

/** Looks right waits until the current doc/chip ask is idle. */
export function currentAskIdle(draft: FoxIntakeDraft) {
  if (draft.pendingProposal || draft.pendingConflict) return false;
  if (draft.awaitingPayFrequency) return false;
  if (draft.awaitingBothMonthlyReason) return false;
  if (draft.awaitingRaiseWhen) return false;
  if (draft.awaitingRaiseYtdFar) return false;
  if (nextDocInvite(draft)) return false;
  if (draft.looksRightHold) return false;
  return true;
}

export function canLooksRight(draft: FoxIntakeDraft) {
  return (
    sketchAssembled(draft) &&
    timelineFilled(draft) &&
    currentAskIdle(draft) &&
    !historyGapNeeded(draft) &&
    propertyAddressSettled(draft) &&
    citizenshipSettled(draft) &&
    assetsSettled(draft)
  );
}

export function parseFundsRole(
  text: string,
  price?: number | null,
): "down" | "loan" | null {
  const lower = text.trim().toLowerCase();
  if (/down(\s+payment)?|earnest|deposit/.test(lower) && !/loan amount|payoff/.test(lower)) {
    return "down";
  }
  if (/loan|payoff|borrow|mortgage amount/.test(lower) && !/down/.test(lower)) {
    return "loan";
  }
  const amount = moneyNumber(text.replace(/[a-z]/gi, " "));
  if (amount == null || price == null || price <= 0) return null;
  if (amount >= price) return null;
  return amount < price * 0.5 ? "down" : "loan";
}

export const STUB_PUBLIC_EMPLOYER = "Listed employer";

export function applyStubEmployerSuggestion(draft: FoxIntakeDraft) {
  return proposePublicSuggestion(draft, "employer_name", STUB_PUBLIC_EMPLOYER);
}

export function occupancyValue(draft: FoxIntakeDraft) {
  return draft.occupancyChoice.value;
}

export function requiredLineValue(
  draft: FoxIntakeDraft,
  line: RequiredLine,
): { value: string; note?: string; filled: boolean } {
  const proposal = draft.pendingProposal;
  const proposalId = proposal ? structureFieldForProposal(proposal.field) : "";
  const companionId = proposal?.companion
    ? structureFieldForProposal(proposal.companion.field)
    : "";
  if (proposal && proposalId === line.id && proposal.field !== STATED_AVAILABLE_ASSETS_FIELD) {
    return {
      value: displayFactValue(proposal.field, proposal.value),
      note: proposal.note ?? proposalNote(proposal.kind),
      filled: false,
    };
  }
  if (proposal?.companion && companionId === line.id) {
    return {
      value: displayFactValue(proposal.companion.field, proposal.companion.value),
      note: proposal.note ?? proposalNote(proposal.kind),
      filled: false,
    };
  }
  if (line.id === "occupancy") {
    const label =
      draft.occupancyChoice.value === "primary"
        ? "Primary"
        : draft.occupancyChoice.value === "second-home"
          ? "Second home"
          : draft.occupancyChoice.value === "investment"
            ? "Investment"
            : "";
    return { value: label || MISSING_LINE, filled: Boolean(label) };
  }
  if (line.id === "timeline") {
    const label =
      draft.timelineChoice.value === "ready-now"
        ? "Ready now"
        : draft.timelineChoice.value === "30-90"
          ? "30–90 days"
          : draft.timelineChoice.value === "exploring"
            ? "Just exploring"
            : "";
    if (label) return { value: label, filled: true };
    const close = factValue(draft, "close_date");
    if (close) return { value: displayFactValue("close_date", close), filled: true };
    return { value: MISSING_LINE, filled: false };
  }
  if (line.id === "credit") {
    const label = statedCreditLabel(draft.creditBand);
    return {
      value: label || MISSING_LINE,
      note: label ? CREDIT_STATED_NOTE : undefined,
      filled: Boolean(label),
    };
  }
  if (line.id === "income") {
    const raw = draft.incomeType.value;
    const label =
      raw === "w2"
        ? "W-2"
        : raw === "self-employed"
          ? "Self-employed"
          : raw === "both"
            ? "Both"
            : raw === "other"
              ? "Other"
              : "";
    const rental =
      draft.facts?.[SUGGESTED_NET_RENTAL_FIELD] ?? draft.facts?.[RENTAL_INCOME_FIELD];
    if (rental?.confirmed && rental.value) {
      const shown = displayFactValue(rental.field, rental.value);
      const bits = [label, shown].filter(Boolean);
      return { value: bits.join(" · "), filled: true };
    }
    return { value: label || MISSING_LINE, filled: Boolean(label) };
  }
  if (line.id === "price" || line.id === "home") {
    const n = draft.propertyValueAmount;
    return {
      value: n != null && n > 0 ? `$${Math.round(n).toLocaleString("en-US")}` : MISSING_LINE,
      filled: n != null && n > 0,
    };
  }
  if (line.id === "loan" || line.id === "line" || line.id === "numbers") {
    const n = draft.loanAmountValue ?? (line.id === "numbers" ? draft.propertyValueAmount : undefined);
    return {
      value: n != null && n > 0 ? `$${Math.round(n).toLocaleString("en-US")}` : MISSING_LINE,
      filled: n != null && n > 0,
    };
  }
  if (line.id === "down") {
    const n = draft.downPaymentAmount;
    return {
      value: n != null && n > 0 ? `$${Math.round(n).toLocaleString("en-US")}` : MISSING_LINE,
      filled: n != null && n > 0,
    };
  }
  return { value: MISSING_LINE, filled: false };
}

export function completenessExplainCopy(draft: FoxIntakeDraft) {
  const map = fileCompleteness(draft);
  if (!map) return "This file stays thin. No agency completeness score.";
  return `File is ${map.copy}. I cannot approve, lock, or commit to lend.`;
}

export function intentUsesPurchasePrice(
  intent?: ProductIntent | null,
  purposeLabel?: string | null,
  jumboPurpose?: JumboPurpose | null,
) {
  if (intent === "buy") return true;
  if (intent === "jumbo") return jumboPurpose !== "refinance";
  if (intent === "other" && purposeLabel) return /purchase price/i.test(purposeLabel);
  return false;
}
