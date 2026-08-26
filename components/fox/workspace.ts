import {
  estimateRewardRange,
  formatRewardRange,
} from "@/components/products/rewardEstimate";
import {
  formatDollars,
  isCaliforniaZip,
  type CreditRange,
  type ExplorerScenario,
  type LoanPurpose,
  type Occupancy,
  type Timeline,
} from "@/components/products/scenario";
import { pathFromHomeChoice } from "./homeIdle";
import {
  AMOUNT_HELPER_BUBBLES,
  AMOUNT_PURPOSE_BUBBLES,
  CREDIT_STATED_NOTE,
  CREDIT_WORKSPACE_BUBBLES,
  explorerCreditFromStated,
  statedCreditLabel,
  INCOME_BUBBLES,
  JUMBO_PURPOSE_BUBBLES,
  OCCUPANCY_BUBBLES,
  PRODUCT_INTENT_BUBBLES,
  TERM_BUBBLES,
  TIMELINE_BUBBLES,
  type Capture,
  type FoxAction,
  type FoxIntakeDraft,
  type FoxMessage,
  type FoxMessageFact,
  type FoxPrompt,
  type GovProgram,
  type IntakePath,
  type JumboPurpose,
  type NamedCreditEvent,
  type ProductIntent,
  type ProductOffer,
} from "./types";
import {
  displayFactValue,
  docsDisplayLabel,
  factValue,
  isRemainderConfirmField,
  fileStillUsefulNote,
  incomeRequestedClasses,
  missingListCopy,
  slotFromFilename,
  stillUsefulAskCopy,
  conflictActions,
  conflictAskCopy,
  DOC_INVITE_COPY,
  firstNameFromDraft,
  lastExtractedClass,
  nextDocInvite,
  offeringDocStart,
  primaryDocPassFinished,
  thisBorrowerPrimaryPackageDone,
  readyForHouseholdAsk,
  skipCurrentInvite,
  holdDocuments,
  layer2Open,
  layer2AskCopy,
  layer2AskActions,
  stillUsefulVisible,
  shortListSpeak,
  persistCondoNeedsReview,
} from "./fileWrite";
import {
  SUGGESTED_NOTE,
  canLooksRight,
  timelineFilled,
  sketchAssembled,
  completenessExplainCopy,
  fileCompleteness,
  factsFromDraft,
  guidelineCaution,
  fundsAskNeeded,
  hasDownPayment,
  hasHelocLine,
  hasLoanAmount,
  hasPropertyValue,
  impliedDownPayment,
  impliedLoanAmount,
  isHelocFile,
  isPurchaseLike,
  isRefiLike,
  loanExceedsPurchasePrice,
  missingAmountAsk,
  parseFundsRole,
  incomeConfirmActions,
  proposalActions,
  proposalAskCopy,
  proposeFundsPair,
  purchasePriceAskNeeded,
  propertyValueAskNeeded,
  refiLoanAskNeeded,
  requiredLineValue,
  requiredStructureLines,
  QUALIFYING_INCOME_FIELD,
  lockedDownShare,
  resolveProposal,
  shouldAskYearsInBusiness,
  skipYearsInBusiness,
  yearsInBusinessSettled,
  yearsInBusinessSkipActions,
  sketchAmountsReady,
  withComputedCompanion,
  writeQualifyingIncome,
  writeYearsInBusiness,
  YEARS_IN_BUSINESS_ASK,
  YEARS_IN_BUSINESS_FIELD,
} from "./completeness";
import { conventionalFileFacts } from "./conventionalFile";
import {
  calculatorStructureFacts,
  draftHousingEstimate,
  ESTIMATED_NOT_FINAL,
  housingAskCopy,
  housingConfirmNeeded,
  skipEstimatedHousing,
  STATED_NOT_FROM_CREDIT,
  syncCalculatorDraft,
  writeEstimatedHousing,
} from "./calculators";
import {
  applyPayFrequencyAnswer,
  decliningIncomeCaution,
  formatIncomeMoney,
  hasK1Ordinary,
  K1_ORDINARY_NOTE,
  monthlyFromAnnual,
  qualifyingIncomeDisplay,
  scheduleCYearViews,
  SUGGESTED_INCOME_NOTE,
  wageIncomeCaution,
  wageMethodNote,
} from "./qualifyingIncome";
import {
  isRentalIncomeField,
  isSkipSubjectLeaseText,
  parseStatedMonthlyLease,
  parseSubjectLeaseAmount,
  proposeTypedLeaseRental,
  rentalConfirmAsk,
  rentalThinCopy,
  skipSubjectLease,
  subjectLeaseAskCopy,
  subjectLeaseAskNeeded,
} from "./rentalIncome";
import {
  applyMortgageSubtract,
  isSkipMonthlyDebtsText,
  isStatedDebtsConfirmPending,
  mentionsSubjectMortgage,
  monthlyDebtsAskCopy,
  monthlyDebtsConfirmActions,
  monthlyDebtsConfirmCopy,
  mortgageIncludedAskWithoutPayment,
  mortgageSubtractActions,
  mortgageSubtractAsk,
  parseMonthlyDebtAmount,
  proposeStatedMonthlyDebts,
  skipMonthlyDebts,
  writeStatedMonthlyDebts,
  STATED_MONTHLY_DEBTS_FIELD,
  SUGGESTED_DEBTS_NOTE,
  subjectMortgagePayment,
} from "./monthlyDebts";
import {
  STATED_AVAILABLE_ASSETS_FIELD,
  SUGGESTED_ASSETS_NOTE,
  availableAssetsAskCopy,
  availableAssetsConfirmActions,
  availableAssetsConfirmCopy,
  availableAssetsExtractCopy,
  isSkipAvailableAssetsText,
  isStatedAssetsConfirmPending,
  parseAvailableAssetsAmount,
  proposeStatedAvailableAssets,
  skipAvailableAssets,
  writeStatedAvailableAssets,
} from "./availableAssets";
import {
  PROPERTY_TYPE_ASK,
  PROPERTY_TYPE_FIELD,
  SUGGESTED_PROPERTY_NOTE,
  contractAddressConfirmCopy,
  isPropertyAddressField,
  isPropertyTypeConfirmPending,
  isSkipPropertyTypeText,
  isSubjectAddressConfirmPending,
  parsePropertyType,
  parseVolunteeredAddress,
  propertyTypeAskCopy,
  propertyTypeSettled,
  propertyTypeConfirmActions,
  propertyTypeConfirmCopy,
  propertyTypeLabel,
  proposePropertyType,
  proposeSubjectAddress,
  skipPropertyType,
  typedAddressConfirmCopy,
  writePropertyType,
} from "./propertyType";
import {
  STATED_TIME_ON_JOB_FIELD,
  SUGGESTED_TIME_ON_JOB_NOTE,
  TIME_ON_JOB_ASK,
  displayTimeOnJob,
  isSkipTimeOnJobText,
  isTimeOnJobConfirmPending,
  parseTimeOnJobMonths,
  proposeStatedTimeOnJob,
  skipTimeOnJob,
  timeOnJobLabelFromSpoken,
  writeStatedTimeOnJob,
  timeOnJobAskCopy,
  timeOnJobConfirmActions,
  timeOnJobConfirmCopy,
} from "./timeOnJob";
import {
  CURRENT_HOUSING_ASK,
  STATED_CURRENT_HOUSING_FIELD,
  SUGGESTED_HOUSING_NOTE,
  currentHousingAskCopy,
  currentHousingConfirmActions,
  currentHousingConfirmCopy,
  isCurrentHousingConfirmPending,
  isSkipCurrentHousingText,
  parseCurrentHousingAmount,
  proposeStatedCurrentHousing,
  skipCurrentHousing,
  writeStatedCurrentHousing,
} from "./currentHousing";
import {
  DECLARATIONS_ASK,
  STATED_DECLARATION_FIELD,
  SUGGESTED_DECLARATION_NOTE,
  declarationTimingAskCopy,
  declarationsAskCopy,
  declarationsConfirmActions,
  declarationsConfirmCopy,
  declarationsLabel,
  isDeclarationsConfirmPending,
  isSkipDeclarationTimingText,
  isSkipDeclarationsText,
  isStatedDeclaration,
  needsDeclarationTiming,
  parseDeclarationTiming,
  parseDeclarations,
  proposeStatedDeclaration,
  skipDeclarationTiming,
  skipDeclarations,
  volunteeredDeclarationNote,
  writeDeclarationTiming,
  writeStatedDeclaration,
} from "./declarations";
import {
  HOUSEHOLD_ASK,
  STATED_HOUSEHOLD_FIELD,
  SUGGESTED_HOUSEHOLD_NOTE,
  householdAskCopy,
  householdConfirmActions,
  householdConfirmCopy,
  householdLabel,
  householdSettled,
  isHouseholdConfirmPending,
  isSkipHouseholdText,
  isStatedHousehold,
  parseHousehold,
  proposeStatedHousehold,
  skipHousehold,
  writeStatedHousehold,
} from "./household";
import {
  SUGGESTED_COBORROWER_NOTE,
  coborrowerExtractCopy,
  coborrowerFileLabel,
  coborrowerHandOffCopy,
  coborrowerIdInviteCopy,
  coborrowerIdOutstanding,
  coborrowerIncomeInviteCopy,
  coborrowerNameAskCopy,
  coborrowerNameOnFile,
  coborrowerNameSettled,
  coborrowerSpokenIdCopy,
  isCoborrowerNameConfirmPending,
  isCoborrowerNameField,
  isSkipCoborrowerNameText,
  parseCoborrowerName,
  primaryFileLabel,
  proposeCoborrowerName,
  skipCoborrowerName,
  writeCoborrowerName,
} from "./coborrowerName";
import {
  BORROWER_NAME_ASK,
  BORROWER_NAME_FIELD,
  SUGGESTED_BORROWER_NOTE,
  borrowerNameAskCopy,
  borrowerNameConfirmActions,
  borrowerNameConfirmCopy,
  borrowerNameExtractCopy,
  borrowerNameOnFile,
  borrowerNameSettled,
  governmentIdOutstanding,
  isBorrowerNameConfirmPending,
  isBorrowerNameField,
  isSkipBorrowerNameText,
  parseBorrowerName,
  proposeBorrowerName,
  skipBorrowerName,
  writeBorrowerName,
} from "./borrowerName";
import {
  OTHER_REO_ASK,
  OTHER_REO_PAYMENT_FIELD,
  STATED_OTHER_REO_FIELD,
  SUGGESTED_OTHER_REO_NOTE,
  isOtherReoConfirmPending,
  isSkipOtherReoText,
  isStatedOtherReo,
  otherPropertyPaymentConfirmCopy,
  otherReoAskCopy,
  otherReoConfirmActions,
  otherReoConfirmCopy,
  otherReoLabel,
  otherReoSettled,
  parseOtherReo,
  proposeStatedOtherReo,
  skipOtherReo,
  writeStatedOtherReo,
} from "./otherReo";
import {
  CITIZENSHIP_ASK,
  citizenshipAskCopy,
  citizenshipLabel,
  citizenshipNeeded,
  isFileCitizenshipValue,
  isSkipCitizenshipText,
  parseCitizenship,
  skipCitizenship,
  writeCitizenship,
} from "./citizenship";
import {
  FORMER_HISTORY_ASK,
  formerHistoryAskCopy,
  formerHistoryNeeded,
  isSkipFormerHistoryText,
  skipFormerHistory,
  writeFormerHistoryNote,
} from "./fileHistory";
import { asksStaffExport, STAFF_EXPORT_BORROWER_COPY } from "./staffExport";
import {
  ACR_BENEFITS_LINE,
  COST_LINE,
  FHFA_HIGH_COST_CEILING_2026 as STORE_HIGH_COST_CEILING,
  HIGH_LTV_CAUTION,
  JUMBO_CEILING_LINE,
  KEEP_BOTH_LINE,
  LTV_NOT_A_DECISION,
  PHONE_LINE,
  TIMELINE_LINE,
  conventionalGuidelinePattern,
  flags as storeFlags,
  lookup as storeLookup,
} from "@/lib/guidelines/conventional";
import {
  answerFromFile,
  asksWillIQualify,
  foxAnswer,
  interpretQuestion,
} from "@/lib/guidelines/answer";
import {
  applyEmailThenFinish,
  applyEscalateMotion,
  applyLooksRightMotion,
  emailMissing,
  finishCaptureFromText,
  finishLineActions,
  inQueueEnding,
  latestOutbox,
  looksLikeEmail,
  MOTION_COPY,
  motionAskText,
  motionOf,
  motionStatusCopy,
  nextActorOf,
  remindLine,
  waitingOnOf,
} from "./motion";

export { slotFromFilename };

export const START_ACR_TEXT =
  "I can prepare your relationship file. We’ll keep this desk open after close.";
export const START_LOAN_TEXT =
  "This is the loan. ACR is optional if you want the desk later.";
export const PATH_ASK_TEXT = "Start a relationship, or just the loan?";

export function isPathAskMessage(message: Pick<FoxMessage, "role" | "text">) {
  return message.role === "fox" && message.text === PATH_ASK_TEXT;
}

export function starterText(path?: IntakePath | null) {
  if (path === "loan-only") return START_LOAN_TEXT;
  return START_ACR_TEXT;
}

export function productIntentLabel(intent?: ProductIntent | null) {
  if (intent === "buy") return "Buy";
  if (intent === "refinance") return "Refinance";
  if (intent === "heloc") return "HELOC";
  if (intent === "jumbo") return "Jumbo";
  if (intent === "other") return "Other";
  return "";
}

export function purposeForIntent(
  intent: ProductIntent,
  jumboPurpose?: JumboPurpose | null,
): LoanPurpose {
  if (intent === "refinance" || (intent === "jumbo" && jumboPurpose === "refinance")) {
    return "rate-term-refi";
  }
  if (intent === "heloc") return "heloc-heloan";
  return "purchase";
}

export function slugForIntent(intent: ProductIntent) {
  if (intent === "refinance") return "conventional-rate-term-refinance";
  if (intent === "heloc") return "heloc-heloan";
  if (intent === "jumbo") return "jumbo";
  if (intent === "other") return "other";
  return "conventional-purchase";
}

export function normalizeProductIntent(
  intent?: string | null,
): ProductIntent | undefined {
  if (intent === "use-equity" || intent === "heloc") return "heloc";
  if (
    intent === "buy" ||
    intent === "refinance" ||
    intent === "jumbo" ||
    intent === "other"
  ) {
    return intent;
  }
  return undefined;
}

export function productIntentFromSlug(slug?: string | null): ProductIntent | null {
  if (!slug) return null;
  if (
    slug === "heloc-heloan" ||
    slug === "use-equity" ||
    slug.includes("heloc") ||
    slug.includes("heloan")
  ) {
    return "heloc";
  }
  if (slug === "jumbo" || slug.includes("jumbo")) return "jumbo";
  if (slug === "other") return "other";
  if (slug.includes("refinance") || slug.includes("refi") || slug.includes("cash-out")) {
    return "refinance";
  }
  if (slug.includes("purchase") || slug === "fha" || slug === "va") {
    return "buy";
  }
  return null;
}

export function productIntentFromQuery(
  raw?: string | null,
): ProductIntent | null {
  if (!raw) return null;
  const token = raw.trim().toLowerCase();
  if (token === "buy" || token === "purchase") return "buy";
  if (token === "refinance" || token === "refi") return "refinance";
  if (token === "equity" || token === "use-equity" || token === "use_equity" || token === "heloc") {
    return "heloc";
  }
  if (token === "jumbo") return "jumbo";
  if (token === "other") return "other";
  return productIntentFromSlug(token);
}

export function productIntentFromText(text: string): ProductIntent | null {
  const trimmed = text.trim();
  if (!trimmed || /^[\s$0-9,kKmM.]+$/.test(trimmed)) return null;
  const lower = trimmed.toLowerCase();
  if (/\bbuy\b|purchase|buying/.test(lower)) return "buy";
  if (/refinanc|rate.?term|cash.?out/.test(lower)) return "refinance";
  if (/\bjumbo\b/.test(lower)) return "jumbo";
  if (/use equity|heloc|heloan|home equity|equity line/.test(lower)) {
    return "heloc";
  }
  if (
    !/refinanc|heloc|jumbo/.test(lower) &&
    /\b(down(\s+payment)?|percent down|% down|purchase price|a house|a home|the house|the home)\b/.test(
      lower,
    )
  ) {
    return "buy";
  }
  const fromQuery = productIntentFromQuery(lower);
  if (fromQuery && fromQuery !== "other") return fromQuery;
  if (lower === "other") return "other";
  return PRODUCT_INTENT_BUBBLES.find(
    (item) => item.label.toLowerCase() === lower || item.value === lower,
  )?.value ?? null;
}

/** Chip label wins over a stale capture so first-paint Refinance cannot write Buy. */
export function productIntentFromAction(
  action: Pick<FoxAction, "label" | "href" | "capture">,
): ProductIntent | null {
  const labeled = productIntentFromText(action.label ?? "");
  if (labeled) return labeled;
  if (action.capture?.field === "productIntent" || action.capture?.field === "starter") {
    return (
      normalizeProductIntent(action.capture.value) ??
      productIntentFromText(action.capture.value) ??
      null
    );
  }
  if (!action.href) return null;
  try {
    const url = new URL(action.href, "https://onyx.local");
    return (
      productIntentFromQuery(url.searchParams.get("intent")) ??
      productIntentFromSlug(url.searchParams.get("product"))
    );
  } catch {
    return null;
  }
}

export function rebindProductChipActions(actions?: FoxAction[]): FoxAction[] | undefined {
  if (!actions?.length) return actions;
  let changed = false;
  const next = actions.map((action) => {
    const intent = productIntentFromAction(action);
    if (!intent) return action;
    if (action.capture?.field === "productIntent" && action.capture.value === intent) {
      return action;
    }
    changed = true;
    if (action.capture?.field === "starter") {
      return { ...action, capture: { ...action.capture, value: intent } };
    }
    return { ...action, capture: { field: "productIntent" as const, value: intent } };
  });
  return changed ? next : actions;
}

export function isProductPickerAsk(
  message?: Pick<FoxMessage, "role" | "text" | "actions"> | null,
) {
  if (!message || message.role !== "fox") return false;
  return (message.actions ?? []).some((action) => {
    if (action.capture?.field === "productIntent" || action.capture?.field === "starter") {
      return true;
    }
    return /^(Buy|Refinance|HELOC|Jumbo|Other)$/i.test(action.label);
  });
}

/** Opening product chips are still the live ask — leftover productIntent is idle, not chosen. */
export function openingProductAskOpen(
  _draft: FoxIntakeDraft,
  messages: FoxMessage[],
) {
  const lastFox = lastFoxTurn(messages);
  if (!isProductPickerAsk(lastFox)) return false;
  return !messages.some(
    (message) => message.role === "client" && Boolean(productIntentFromText(message.text)),
  );
}

export function jumboPurposeOf(draft?: FoxIntakeDraft | null): JumboPurpose | undefined {
  if (draft?.jumboPurpose === "buy" || draft?.jumboPurpose === "refinance") {
    return draft.jumboPurpose;
  }
  if (draft?.productIntent !== "jumbo") return undefined;
  if (draft.propertyValueAmount && !draft.loanAmountValue) return "buy";
  if (draft.loanAmountValue && !draft.propertyValueAmount) return "refinance";
  return undefined;
}

export function needsJumboPurpose(draft?: FoxIntakeDraft | null) {
  return draft?.productIntent === "jumbo" && !jumboPurposeOf(draft);
}

export function usesPurchasePrice(
  intent?: ProductIntent | null,
  purposeLabel?: string | null,
  jumboPurpose?: JumboPurpose | null,
) {
  if (intent === "buy") return true;
  if (intent === "jumbo") return jumboPurpose !== "refinance";
  if (intent === "other" && purposeLabel) {
    return /purchase price/i.test(purposeLabel);
  }
  return false;
}

function draftUsesPurchasePrice(draft?: FoxIntakeDraft | null) {
  return usesPurchasePrice(
    draft?.productIntent,
    draft?.amountPurposeLabel,
    jumboPurposeOf(draft),
  );
}

export function structureAmountLabel(draft?: FoxIntakeDraft | null) {
  const intent = draft?.productIntent;
  if (intent === "buy") return "Purchase price";
  if (intent === "jumbo") {
    return jumboPurposeOf(draft) === "refinance" ? "Loan amount" : "Purchase price";
  }
  if (intent === "refinance") return "Loan amount";
  if (intent === "heloc") return "HELOC line";
  if (intent === "other") {
    const named = (draft?.amountPurposeLabel ?? "").trim();
    if (named && !/^(amount|numbers|rough amount)$/i.test(named)) return named;
    return "";
  }
  return draftUsesPurchasePrice(draft) ? "Purchase price" : "Loan amount";
}

function editingConfirmedDown(draft?: FoxIntakeDraft | null) {
  if (!draft || !isPurchaseLike(draft) || !hasDownPayment(draft)) return false;
  if (draft.correctingLine === "down") return true;
  return draft.correcting === "amount" && !draft.correctingLine;
}

export function composerAmountHint(draft?: FoxIntakeDraft | null) {
  if (!draft) return "the number";
  if (draft.correctingLine === "price" || draft.correctingLine === "home") {
    return draft.correctingLine === "home" ? "property value" : "purchase price";
  }
  if (draft.correctingLine === "loan") return "loan amount";
  if (editingConfirmedDown(draft) || draft.correctingLine === "down") {
    return "down payment or percent";
  }
  if (fundsAskNeeded(draft)) return "down payment, percent, or loan amount";
  if (draft.correcting === "amount" && isPurchaseLike(draft) && hasPropertyValue(draft)) {
    return "down payment, percent, or loan amount";
  }
  return structureAmountLabel(draft) || "the number";
}

export function lastFoxTurn<T extends { role: string }>(messages: T[]): T | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "fox") return messages[i];
  }
  return undefined;
}

export function composerPlaceholder(
  _draft?: FoxIntakeDraft,
  _askingAmountPurpose = false,
): string {
  return "";
}

function keepThisActions(): FoxAction[] {
  return [
    { id: "keep-line", label: "Keep this", event: "bubble", capture: { field: "keep-line" } },
  ];
}

function keepThisReply(draft: FoxIntakeDraft) {
  const nextDraft = { ...draft, correcting: null, correctingLine: null };
  return {
    ...nextFoxAsk(nextDraft),
    capture: { field: "keep-line" as const },
  };
}

function isKeepThisText(text: string) {
  return /^(keep( this)?|still right|yes|ok|okay|never mind|back)$/i.test(text.trim());
}

function proposePriceLockedPair(draft: FoxIntakeDraft, price: number): FoxIntakeDraft | null {
  const share = lockedDownShare(draft);
  if (share == null || price <= 0) return null;
  const down = Math.round(price * share);
  const loan = impliedLoanAmount(price, down);
  if (loan == null) return null;
  return proposeFundsPair(
    {
      ...draft,
      propertyValueAmount: price,
      valueAsked: true,
      correcting: null,
      correctingLine: null,
    },
    down,
    loan,
  );
}

export function amountAskText(draft: FoxIntakeDraft) {
  if (
    (draft.correctingLine === "price" || draft.correcting === "value") &&
    hasPropertyValue(draft) &&
    draft.correctingLine !== "home"
  ) {
    const n = draft.propertyValueAmount;
    return `Purchase price in the file is ${formatMoney(n ?? 0)}. Still right?`;
  }
  if (draft.correctingLine === "home" && hasPropertyValue(draft)) {
    const n = draft.propertyValueAmount;
    return `Property value in the file is ${formatMoney(n ?? 0)}. Still right?`;
  }
  if (editingConfirmedDown(draft)) {
    const n = draft.downPaymentAmount;
    return `Down payment in the file is ${formatMoney(n ?? 0)}. Still right?`;
  }
  if (draft.correctingLine === "down") {
    const n = draft.downPaymentAmount;
    return n != null && n > 0
      ? `Down payment in the file is ${formatMoney(n)}. What’s the down payment?`
      : "What’s the down payment?";
  }
  if (draft.correctingLine === "loan") {
    const n = draft.loanAmountValue;
    return n != null && n > 0
      ? `Loan amount in the file is ${formatMoney(n)}. What’s the loan amount?`
      : "What’s the loan amount?";
  }
  if (
    fundsAskNeeded(draft) ||
    (draft.correcting === "amount" && isPurchaseLike(draft) && hasPropertyValue(draft))
  ) {
    return "What’s the down payment or loan amount?";
  }
  if (propertyValueAskNeeded(draft)) return "What’s the property value?";
  if (purchasePriceAskNeeded(draft)) return "What’s the purchase price?";
  const intent = draft.productIntent;
  if (intent === "buy" || (intent === "jumbo" && jumboPurposeOf(draft) !== "refinance")) {
    return "What’s the purchase price?";
  }
  if (intent === "refinance" || (intent === "jumbo" && jumboPurposeOf(draft) === "refinance")) {
    return hasLoanAmount(draft) && !hasPropertyValue(draft)
      ? "What’s the property value?"
      : "What’s the approximate loan or payoff amount?";
  }
  if (intent === "heloc") return "What line or cash do you need?";
  if (intent === "other") {
    const named = structureAmountLabel(draft);
    if (!named) return "What is that number for?";
    return `What’s the ${named.charAt(0).toLowerCase()}${named.slice(1)}?`;
  }
  return draftUsesPurchasePrice(draft)
    ? "What’s the purchase price?"
    : "What’s the loan amount?";
}

export function parseAmountPurpose(text: string): string | null {
  const lower = text.trim().toLowerCase().replace(/['’]/g, "");
  if (!lower || /^(amount|numbers|rough amount)$/i.test(lower)) return null;
  if (/purchase|price/.test(lower)) return "Purchase price";
  if (/heloc|line|cash needed|cash out/.test(lower) && !/loan amount|payoff/.test(lower)) {
    return "HELOC line";
  }
  if (/loan|payoff/.test(lower)) return "Loan amount";
  const match = AMOUNT_PURPOSE_BUBBLES.find(
    (item) => item.label.toLowerCase() === lower || item.value.toLowerCase() === lower,
  );
  if (match) return match.value;
  if (parseLooseAmount(text) != null && !/[a-z]/i.test(text.replace(/[\d$,.\s]/g, ""))) {
    return null;
  }
  if (/dont know|do not know|not sure|unsure|skip( for now)?|\blater\b/.test(lower)) {
    return null;
  }
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned || /^\$?\d/.test(cleaned)) return null;
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function sampleRateApplies(intent?: ProductIntent | null) {
  return intent === "buy" || intent === "refinance";
}

/** 2026 FHFA high-cost ceiling. Not the standard conforming limit. */
export const FHFA_HIGH_COST_CEILING_2026 = STORE_HIGH_COST_CEILING;
export const PRICING_WHEN_READY = "Pricing when the file is ready";
export const GEO_STOP_COPY =
  "I can only prepare California files. I cannot prepare this file.";
export const JUMBO_PURPOSE_ASK = "Are you buying or refinancing?";
export const JUMBO_OFFER_COPY = JUMBO_CEILING_LINE;
export const HELOC_OFFER_COPY =
  "If you want cash and keep the first mortgage, HELOC may fit. Stay on Refinance, or use HELOC?";

const NON_CA_STATES = [
  "alabama",
  "alaska",
  "arizona",
  "arkansas",
  "colorado",
  "connecticut",
  "delaware",
  "florida",
  "georgia",
  "hawaii",
  "idaho",
  "illinois",
  "indiana",
  "iowa",
  "kansas",
  "kentucky",
  "louisiana",
  "maine",
  "maryland",
  "massachusetts",
  "michigan",
  "minnesota",
  "mississippi",
  "missouri",
  "montana",
  "nebraska",
  "nevada",
  "new hampshire",
  "new jersey",
  "new mexico",
  "new york",
  "north carolina",
  "north dakota",
  "ohio",
  "oklahoma",
  "oregon",
  "pennsylvania",
  "rhode island",
  "south carolina",
  "south dakota",
  "tennessee",
  "texas",
  "utah",
  "vermont",
  "virginia",
  "washington",
  "west virginia",
  "wisconsin",
  "wyoming",
];

export function treatedLoanAmount(draft?: FoxIntakeDraft | null): number | undefined {
  if (!draft) return undefined;
  if (draft.loanAmountValue != null && draft.loanAmountValue > 0) {
    return draft.loanAmountValue;
  }
  if (isPurchaseLike(draft) && draft.propertyValueAmount != null && draft.downPaymentAmount != null) {
    const implied = Math.round(draft.propertyValueAmount - draft.downPaymentAmount);
    if (implied > 0) return implied;
  }
  if (draftUsesPurchasePrice(draft) && draft.propertyValueAmount != null && draft.propertyValueAmount > 0) {
    return draft.propertyValueAmount;
  }
  return undefined;
}

export function loanLooksAboveCeiling(draft?: FoxIntakeDraft | null) {
  const amount = treatedLoanAmount(draft);
  return amount != null && amount > FHFA_HIGH_COST_CEILING_2026;
}

export function previewRateApplies(draft: FoxIntakeDraft): boolean {
  return storeFlags(factsFromDraft(draft)).previewRateAllowed;
}

export function withMatrixAfterAmount(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (draft.outOfState || draft.pendingOffer) return draft;
  if (
    (draft.productIntent === "buy" || draft.productIntent === "refinance") &&
    !draft.jumboOffered &&
    loanLooksAboveCeiling(draft)
  ) {
    return { ...draft, pendingOffer: "jumbo" };
  }
  return draft;
}

export function remapAmountForIntent(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (
    draft.productIntent === "buy" ||
    draft.productIntent === "refinance" ||
    draft.productIntent === "jumbo"
  ) {
    return draft;
  }
  if (draftUsesPurchasePrice(draft)) {
    if (draft.propertyValueAmount == null && draft.loanAmountValue != null) {
      return {
        ...draft,
        propertyValueAmount: draft.loanAmountValue,
        valueAsked: Boolean(draft.amountAsked || draft.valueAsked),
      };
    }
    return draft;
  }
  if (draft.loanAmountValue == null && draft.propertyValueAmount != null) {
    return {
      ...draft,
      loanAmountValue: draft.propertyValueAmount,
      amountAsked: Boolean(draft.valueAsked || draft.amountAsked),
    };
  }
  return draft;
}

export function applyProductChange(
  draft: FoxIntakeDraft,
  nextIntent: ProductIntent,
): FoxIntakeDraft {
  const from = draft.productIntent;
  let next: FoxIntakeDraft = {
    ...draft,
    productIntent: nextIntent,
    pendingOffer: undefined,
    jumboPurpose: nextIntent === "jumbo" ? draft.jumboPurpose : undefined,
    amountPurposeLabel: nextIntent === "other" ? draft.amountPurposeLabel : undefined,
    correcting: null,
  };
  if (from === "heloc" && nextIntent === "buy") {
    next = {
      ...next,
      valueAsked: false,
      propertyValueAmount: undefined,
    };
  }
  return remapAmountForIntent(next);
}

export function applyStarterSketch(
  draft: FoxIntakeDraft,
  intent: ProductIntent,
  price?: number | null,
): FoxIntakeDraft {
  let next = applyProductChange(draft, intent);
  if (price != null && price > 0) {
    next = withMatrixAfterAmount({
      ...next,
      propertyValueAmount: price,
      valueAsked: true,
    });
  }
  return next;
}

function requestHumanAction(): FoxAction {
  return {
    id: "request-human",
    label: "Request human",
    event: "bubble",
    capture: { field: "talk-originator" },
  };
}

function offerActions(kind: ProductOffer): FoxAction[] {
  if (kind === "jumbo") {
    return [
      { id: "stay-product", label: "Stay", event: "bubble", capture: { field: "decline-jumbo" } },
      { id: "use-jumbo", label: "Use Jumbo", event: "bubble", capture: { field: "accept-jumbo" } },
    ];
  }
  return [
    { id: "stay-refi", label: "Stay", event: "bubble", capture: { field: "decline-heloc" } },
    { id: "use-heloc", label: "Use HELOC", event: "bubble", capture: { field: "accept-heloc" } },
  ];
}

export function namedCalifornia(text: string) {
  const lower = text.trim().toLowerCase();
  if (/\bcalifornia\b|\bin ca\b/.test(lower)) return true;
  const zip = lower.match(/\b(\d{5})\b/);
  return Boolean(zip && isCaliforniaZip(zip[1]));
}

export function namedOutOfState(text: string) {
  const lower = text.trim().toLowerCase();
  if (namedCalifornia(text) && !/\b(not|outside|isn't|isnt)\b.{0,20}\bcalifornia\b/.test(lower)) {
    return false;
  }
  if (/\b(not|outside|isn't|isnt)\b.{0,20}\bcalifornia\b/.test(lower)) return true;
  if (/\bout of state\b/.test(lower)) return true;
  if (NON_CA_STATES.some((state) => new RegExp(`\\b${state}\\b`).test(lower))) return true;
  const zip = lower.match(/\b(\d{5})\b/);
  if (zip && !isCaliforniaZip(zip[1])) return true;
  return /\b(?:in|from|near)\s+(az|co|fl|ga|il|nc|nj|nv|ny|tn|tx|wa)\b/.test(lower);
}

export function namedGovProgram(text: string): GovProgram | null {
  const lower = text.trim().toLowerCase();
  if (/\bfha\b/.test(lower)) return "fha";
  if (/\busda\b/.test(lower)) return "usda";
  if (/\bvirginia\b/.test(lower)) return null;
  if (/\b(in|from|near)\s+va\b/.test(lower)) return null;
  if (/\b(va loan|va refinance|va purchase|va home|veterans?\s+(loan|affair)|gi bill)\b/.test(lower)) {
    return "va";
  }
  if (/\bva\b/.test(lower)) return "va";
  return null;
}

export function namedCreditEvent(text: string): NamedCreditEvent | null {
  const lower = text.trim().toLowerCase();
  if (/bankrupt/.test(lower)) return "bankruptcy";
  if (/foreclos/.test(lower)) return "foreclosure";
  return null;
}

export function jumboPurposeFromText(text: string): JumboPurpose | null {
  const lower = text.trim().toLowerCase();
  if (/^buy$|^purchase$|\bbuying\b/.test(lower)) return "buy";
  if (/refinanc|\brefi\b|payoff/.test(lower)) return "refinance";
  const intent = productIntentFromText(text);
  if (intent === "buy") return "buy";
  if (intent === "refinance") return "refinance";
  return null;
}

export function looksLikePurchase(text: string) {
  const lower = text.trim().toLowerCase();
  if (/\b(not|don't|dont|isn't|isnt)\b.{0,12}\b(buy|buying|purchase)\b/.test(lower)) {
    return false;
  }
  return productIntentFromText(text) === "buy" || /\b(buy|buying|purchase)\b/.test(lower);
}

export function wantsCashKeepFirst(text: string) {
  const lower = text.trim().toLowerCase();
  const cash = /\bcash(\s+out)?\b/.test(lower);
  const keep =
    /\bkeep(ing)?\b.{0,28}\b(first|mortgage|loan)\b/.test(lower) ||
    /\b(first|current) (mortgage|loan)\b.{0,20}\b(stay|stays|keep)/.test(lower);
  return cash && keep;
}

export function namedCashOut(text: string) {
  const lower = text.trim().toLowerCase();
  if (wantsCashKeepFirst(text)) return false;
  if (/\bcash[-\s]?out\b/.test(lower)) return true;
  if (/\btake cash(\s+out)?\b/.test(lower)) return true;
  if (/\bcash from (the )?(refi|refinance)\b/.test(lower)) return true;
  if (/\b(want|need) cash\b/.test(lower) && /\b(refi|refinance)\b/.test(lower)) return true;
  if (/\b(want|need) cash\b/.test(lower)) return true;
  return false;
}

function cashOutCopy(draft: FoxIntakeDraft) {
  return storeLookup("purpose.cash_out", factsFromDraft({ ...draft, cashOut: true })).borrowerLine;
}

export function wantsReplaceFirst(text: string) {
  const lower = text.trim().toLowerCase();
  return (
    /\breplace( the)? first\b/.test(lower) ||
    /\bpay\s*off( the)? first\b/.test(lower) ||
    /\brefinance( the)? first\b/.test(lower)
  );
}

function govProgramCopy(draft: FoxIntakeDraft, program: GovProgram) {
  return storeLookup("flags.govvie", factsFromDraft({ ...draft, govProgram: program })).borrowerLine;
}

function creditEventCopy(draft: FoxIntakeDraft) {
  return storeLookup("flags.distress", factsFromDraft({ ...draft, creditEvent: draft.creditEvent ?? "bankruptcy" })).borrowerLine;
}

function bubbles(
  items: { value: string; label: string }[],
  field: Capture["field"],
): FoxAction[] {
  return items.map((item) => ({
    id: `${field}-${item.value || "skip"}`,
    label: item.label,
    event: "bubble" as const,
    capture: { field, value: item.value } as Capture,
  }));
}

export function incomeSettled(draft: FoxIntakeDraft) {
  return Boolean(draft.incomeAsked || draft.incomeType.value);
}

export { nextDocInvite, skipCurrentInvite, DOC_INVITE_COPY };

export function docsRequestForIncome(income?: string | null): {
  text: string;
  labels: string[];
} {
  const classes = incomeRequestedClasses(income);
  return {
    labels: classes.map((item) => {
      if (item === "government_id") return "government ID";
      if (item === "paystub") return "latest paystub";
      if (item === "w2") return "W-2";
      if (item === "tax_return") return "tax return";
      return item;
    }),
    text: missingListCopy(classes),
  };
}

function incomeFromText(text: string) {
  const lower = text.trim().toLowerCase();
  return (
    INCOME_BUBBLES.find(
      (item) => item.label.toLowerCase() === lower || item.value === lower,
    ) ??
    (/\bboth\b/.test(lower)
      ? INCOME_BUBBLES.find((item) => item.value === "both")
      : /\bself/.test(lower) || /\b1099\b/.test(lower)
        ? INCOME_BUBBLES.find((item) => item.value === "self-employed")
        : /\bw-?2\b/.test(lower) || /\bwages?\b/.test(lower)
          ? INCOME_BUBBLES.find((item) => item.value === "w2")
          : /\bother\b/.test(lower)
            ? INCOME_BUBBLES.find((item) => item.value === "other")
            : undefined)
  );
}

function documentsAskText(draft: FoxIntakeDraft): string {
  if (isCoborrowerNameConfirmPending(draft) && draft.pendingProposal?.value) {
    return coborrowerExtractCopy(draft.pendingProposal.value, draft);
  }
  if (isBorrowerNameConfirmPending(draft) && draft.pendingProposal?.value) {
    return borrowerNameExtractCopy(draft.pendingProposal.value);
  }
  if (draft.awaitingYearsInBusiness) return YEARS_IN_BUSINESS_ASK;
  if (
    draft.docsHeld &&
    !draft.docsStarted &&
    !draft.sampleAccepted &&
    nextDocInvite(draft)
  ) {
    return HOLD_DOCS_COPY;
  }
  if (offeringDocStart(draft)) return sketchAndStartDocsCopy(draft).text;
  const invite = nextDocInvite(draft);
  if (invite === "coborrower_government_id") return coborrowerIdInviteCopy(draft);
  if (
    draft.workingOnCoborrower &&
    (invite === "paystub" || invite === "w2" || invite === "tax_return")
  ) {
    return coborrowerIncomeInviteCopy(invite, draft);
  }
  if (invite) return DOC_INVITE_COPY[invite];
  const useful = stillUsefulAskCopy(draft);
  if (useful) return useful;
  return docsRequestForIncome(draft.incomeType.value).text;
}

export const DESK_RELATIONSHIP_LINE =
  "I’ll keep this file working — clearer picture, lower cost when it’s real, stronger equity when the numbers support it.";

export function parseYearsInBusiness(text: string, nowYear = 2026): string | null {
  const t = text.trim();
  if (!t) return null;
  const since = t.match(/since\s+(?:19|20)?(\d{2,4})/i);
  if (since) {
    let year = Number(since[1]);
    if (year < 100) year += 2000;
    if (year >= 1970 && year <= nowYear) return String(nowYear - year);
  }
  const labeled = t.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i);
  if (labeled) return String(Number(labeled[1]));
  if (/^(a|one)\s+year\b/i.test(t)) return "1";
  if (/^\d+(?:\.\d+)?$/.test(t)) {
    const n = Number(t);
    if (!Number.isFinite(n) || n > 80) return null;
    return String(n);
  }
  return null;
}

function landedTaxYear(draft: FoxIntakeDraft): string {
  const written = factValue(draft, "tax_year").replace(/\D/g, "").slice(-4);
  if (written) return written;
  const years = scheduleCYearViews(draft);
  const last = years[years.length - 1];
  return last ? String(last.year) : "";
}

function nextDocSpoken(invite: ReturnType<typeof nextDocInvite>): string {
  if (invite === "tax_return") return "Next is your most recent tax return.";
  if (invite === "paystub") return "Next is your latest paystub.";
  if (invite === "w2") return "Next is your most recent W-2.";
  if (invite === "prior_year_return") return DOC_INVITE_COPY.prior_year_return;
  if (invite === "government_id") return "Next is a government ID, so the file has a name.";
  if (invite === "coborrower_government_id") return coborrowerSpokenIdCopy();
  return "";
}

function identityReactionAsk(draft: FoxIntakeDraft): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} {
  if (isCoborrowerNameConfirmPending(draft) && draft.pendingProposal) {
    return liveProposalAsk(draft, draft.pendingProposal, "government_id");
  }
  if (isBorrowerNameConfirmPending(draft) && draft.pendingProposal) {
    return liveProposalAsk(draft, draft.pendingProposal, "government_id");
  }
  const name = firstNameFromDraft(draft);
  const greet = name ? `Nice to meet you, ${name}.` : "Got your ID.";
  const invite = name ? nextDocInvite(draft) : null;
  const next = nextDocSpoken(invite);
  return {
    text: `${greet} ${DESK_RELATIONSHIP_LINE}${next ? ` ${next}` : ""}`.trim(),
    actions: invite
      ? docInviteActions()
      : canLooksRight(draft)
        ? [
            { id: "looks-right", label: "Looks right", event: "bubble", capture: { field: "confirm-draft" } },
            { id: "needs-fix", label: "Needs a correction", event: "bubble", capture: { field: "needs-correction" } },
          ]
        : undefined,
  };
}

function incomeReactionAsk(draft: FoxIntakeDraft, proposal: NonNullable<FoxIntakeDraft["pendingProposal"]>): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} {
  const shown = displayFactValue(proposal.field, proposal.value);
  const year = landedTaxYear(draft);
  const years = scheduleCYearViews(draft);
  const ack = year ? `Got the ${year} return.` : "Got the return.";
  if (years.length < 2) {
    return {
      text: `${ack} I’m suggesting ${shown} a month from Schedule C one-year. ${SUGGESTED_INCOME_NOTE}. Use this?`,
      actions: incomeConfirmActions(),
    };
  }
  const earlier = years[years.length - 2];
  const later = years[years.length - 1];
  const earlierMonthly = monthlyFromAnnual(earlier.annual);
  const laterMonthly = monthlyFromAnnual(later.annual);
  const caution = decliningIncomeCaution(draft);
  const stance =
    later.annual >= earlier.annual
      ? "That’s stable-to-rising — I’m averaging the two years."
      : caution
        ? "That’s declining."
        : "Later year is lower, so I’m using that year.";
  return {
    text: `${ack} ${later.year} is ${formatIncomeMoney(laterMonthly)} a month. ${earlier.year} is ${formatIncomeMoney(earlierMonthly)} a month. ${stance} Two-year view is ${shown} a month. ${SUGGESTED_INCOME_NOTE}. Use this?`,
    followUp: caution,
    actions: incomeConfirmActions(),
  };
}

function k1ReactionAsk(draft: FoxIntakeDraft, proposal: NonNullable<FoxIntakeDraft["pendingProposal"]>): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} {
  const shown = displayFactValue(proposal.field, proposal.value);
  const year = landedTaxYear(draft);
  const ack = year ? `Got the ${year} K-1.` : "Got the K-1.";
  return {
    text: `${ack} I’m suggesting ${shown} a month from ordinary / 12. ${K1_ORDINARY_NOTE} ${SUGGESTED_INCOME_NOTE}. Use this?`,
    actions: incomeConfirmActions(),
  };
}

function wageReactionAsk(
  draft: FoxIntakeDraft,
  proposal: NonNullable<FoxIntakeDraft["pendingProposal"]>,
  extractClass?: ReturnType<typeof lastExtractedClass>,
): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} {
  const cls = extractClass ?? lastExtractedClass(draft);
  const shown = displayFactValue(proposal.field, proposal.value);
  const method = proposal.methodNote ?? wageMethodNote(draft);
  const methodBit = method ? ` from ${method}` : "";
  const doc = cls === "w2" ? "W-2" : "paystub";
  const partial = (proposal.partialNotes ?? []).join(" ");
  const caution =
    proposal.caution && !partial.includes(proposal.caution) ? proposal.caution : undefined;
  const inLine = [partial, caution, SUGGESTED_INCOME_NOTE].filter(Boolean).join(" ");
  return {
    text: `Got the ${doc}. I’m suggesting ${shown} a month${methodBit}. ${inLine}. Use this?`,
    followUp: partial || caution ? undefined : wageIncomeCaution(draft),
    actions: incomeConfirmActions(),
  };
}

function combinedParts(proposal: NonNullable<FoxIntakeDraft["pendingProposal"]>) {
  const parts = proposal.parts ?? {};
  return [parts.wage, parts.scheduleC, parts.k1].filter(Boolean).length >= 2;
}

function combinedReactionAsk(
  draft: FoxIntakeDraft,
  proposal: NonNullable<FoxIntakeDraft["pendingProposal"]>,
): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} {
  const shown = displayFactValue(proposal.field, proposal.value);
  const method = proposal.methodNote ?? "combined wage + Schedule C";
  const k1Note = proposal.parts?.k1 ? `${K1_ORDINARY_NOTE} ` : "";
  const partial = (proposal.partialNotes ?? []).join(" ");
  return {
    text: `I’m suggesting ${shown} a month from ${method}. ${partial ? `${partial} ` : ""}${k1Note}${SUGGESTED_INCOME_NOTE}. Use this?`,
    followUp: proposal.caution ?? wageIncomeCaution(draft) ?? decliningIncomeCaution(draft),
    actions: incomeConfirmActions(),
  };
}

export function payFrequencyAsk(): {
  text: string;
  actions: FoxAction[];
} {
  return {
    text: "How often is this paycheck? I need that before I suggest a monthly number.",
    actions: [
      { id: "freq-weekly", label: "Weekly", event: "bubble", capture: { field: "payFrequency", value: "weekly" } },
      { id: "freq-biweekly", label: "Biweekly", event: "bubble", capture: { field: "payFrequency", value: "biweekly" } },
      { id: "freq-semi", label: "Semi-monthly", event: "bubble", capture: { field: "payFrequency", value: "semimonthly" } },
      { id: "freq-monthly", label: "Monthly", event: "bubble", capture: { field: "payFrequency", value: "monthly" } },
    ],
  };
}

function liveProposalAsk(
  draft: FoxIntakeDraft,
  proposal: NonNullable<FoxIntakeDraft["pendingProposal"]>,
  extractClass?: ReturnType<typeof lastExtractedClass>,
): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} {
  if (proposal.field === STATED_MONTHLY_DEBTS_FIELD) {
    const amount = Number(proposal.value);
    return {
      text: monthlyDebtsConfirmCopy(Number.isFinite(amount) ? amount : 0),
      actions: monthlyDebtsConfirmActions(),
    };
  }
  if (proposal.field === STATED_AVAILABLE_ASSETS_FIELD) {
    const amount = Number(proposal.value);
    const shown = Number.isFinite(amount) ? amount : 0;
    return {
      text: proposal.extras?.length
        ? availableAssetsExtractCopy(shown)
        : availableAssetsConfirmCopy(shown),
      actions: availableAssetsConfirmActions(),
    };
  }
  if (proposal.field === PROPERTY_TYPE_FIELD) {
    const value = parsePropertyType(proposal.value);
    return {
      text: value ? propertyTypeConfirmCopy(value) : proposalAskCopy(proposal),
      actions: propertyTypeConfirmActions(),
    };
  }
  if (isPropertyAddressField(proposal.field)) {
    return {
      text:
        proposal.note === SUGGESTED_PROPERTY_NOTE && !proposal.extras?.length
          ? typedAddressConfirmCopy(proposal.value)
          : contractAddressConfirmCopy(proposal.value),
      actions: propertyTypeConfirmActions(),
    };
  }
  if (proposal.field === STATED_TIME_ON_JOB_FIELD) {
    return {
      text: proposalAskCopy(proposal),
      actions: timeOnJobConfirmActions(),
    };
  }
  if (proposal.field === STATED_CURRENT_HOUSING_FIELD) {
    return {
      text: proposalAskCopy(proposal),
      actions: currentHousingConfirmActions(),
    };
  }
  if (proposal.field === STATED_DECLARATION_FIELD) {
    return {
      text: proposalAskCopy(proposal),
      actions: declarationsConfirmActions(),
    };
  }
  if (proposal.field === STATED_HOUSEHOLD_FIELD) {
    return {
      text: proposalAskCopy(proposal),
      actions: householdConfirmActions(),
    };
  }
  if (isBorrowerNameField(proposal.field)) {
    return {
      text: proposalAskCopy(proposal),
      actions: borrowerNameConfirmActions(),
    };
  }
  if (proposal.field === STATED_OTHER_REO_FIELD) {
    return {
      text: proposalAskCopy(proposal),
      actions: otherReoConfirmActions(),
    };
  }
  if (proposal.field === OTHER_REO_PAYMENT_FIELD) {
    return {
      text: otherPropertyPaymentConfirmCopy(Number(proposal.value) || 0),
      actions: otherReoConfirmActions(),
    };
  }
  if (isRentalIncomeField(proposal.field)) {
    const complete = Number(proposal.extras?.find((item) => item.field === "rental_complete_count")?.value ?? 1);
    return {
      text: rentalConfirmAsk(proposal.methodNote, Number(proposal.value), complete),
      actions: incomeConfirmActions(),
    };
  }
  if (proposal.field === QUALIFYING_INCOME_FIELD) {
    if (combinedParts(proposal) || proposal.methodNote?.startsWith("combined ")) {
      return combinedReactionAsk(draft, proposal);
    }
    if (scheduleCYearViews(draft).length) return incomeReactionAsk(draft, proposal);
    if (hasK1Ordinary(draft)) return k1ReactionAsk(draft, proposal);
    const cls = extractClass ?? lastExtractedClass(draft);
    if (cls === "paystub" || cls === "w2" || factValue(draft, "gross_period") || factValue(draft, "wages")) {
      return wageReactionAsk(draft, proposal, cls);
    }
  }
  const caution =
    proposal.field === QUALIFYING_INCOME_FIELD ? decliningIncomeCaution(draft) : undefined;
  return {
    text: caution ?? proposalAskCopy(proposal),
    followUp: caution ? proposalAskCopy(proposal) : undefined,
    actions: proposal.field === QUALIFYING_INCOME_FIELD ? incomeConfirmActions() : proposalActions(proposal.kind),
  };
}

export function docReactionAsk(
  draft: FoxIntakeDraft,
  extractClass?: ReturnType<typeof lastExtractedClass>,
): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} | null {
  const cls = extractClass ?? lastExtractedClass(draft);
  if (!cls) return null;
  if (draft.pendingConflict) {
    return {
      text: conflictAskCopy(draft.pendingConflict),
      actions: conflictActions(draft.pendingConflict),
    };
  }
  if (draft.pendingProposal) return liveProposalAsk(draft, draft.pendingProposal, cls);
  if (cls === "government_id") return identityReactionAsk(draft);
  if (draft.awaitingPayFrequency) return payFrequencyAsk();
  return null;
}

function rememberedAskCopy(draft: FoxIntakeDraft): string | undefined {
  if (inQueueEnding(draft)) return undefined;
  if (stillUsefulVisible(draft)) return layer2AskCopy(draft);
  if (!shouldAskYearsInBusiness(draft)) return undefined;
  if (draft.motion === "in_queue" || draft.sampleAccepted) return YEARS_IN_BUSINESS_ASK;
  return undefined;
}

export function sketchAndStartDocsCopy(draft: FoxIntakeDraft): {
  text: string;
  followUp: string;
} {
  const bits: string[] = [];
  const occupancy = OCCUPANCY_BUBBLES.find((item) => item.value === draft.occupancyChoice.value)?.label;
  if (occupancy) bits.push(occupancy);
  if (draft.propertyValueAmount != null && draft.propertyValueAmount > 0) {
    bits.push(formatMoney(draft.propertyValueAmount));
  }
  if (draft.downPaymentAmount != null && draft.downPaymentAmount > 0) {
    bits.push(`${formatMoney(draft.downPaymentAmount)} down`);
  }
  const credit = statedCreditLabel(draft.creditBand);
  if (credit) bits.push(`stated ${credit}`);
  else if (draft.creditAsked) bits.push("stated credit");
  const income = INCOME_BUBBLES.find((item) => item.value === draft.incomeType.value)?.label;
  if (income) bits.push(income === "Self-employed" ? "self-employed" : income);
  const sketch = bits.length
    ? `That’s the sketch. ${bits.join(", ")}.`
    : "That’s the sketch.";
  const missing = shortListSpeak(draft);
  return {
    text: sketch,
    followUp: missing
      ? `Next I need a few documents to build the file.\n\n${missing}`
      : "Next I need a few documents to build the file.",
  };
}

function startDocsActions(): FoxAction[] {
  return [
    { id: "start-docs", label: "Start with ID", event: "bubble", capture: { field: "start-docs" } },
    { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
    { id: "not-yet-docs", label: "Not yet", event: "bubble", capture: { field: "hold-docs" } },
  ];
}

export const HOLD_DOCS_COPY =
  "Okay. I’ll hold documents. The sketch is on the notepad. Say when you want to start with ID, or ask me anything.";

export const HOLD_DOCS_ASK_FOX =
  "I’m here. Ask anything about this file, or start with ID when you’re ready for documents.";

function holdDocsActions(): FoxAction[] {
  return [
    { id: "start-docs", label: "Start with ID", event: "bubble", capture: { field: "start-docs" } },
    { id: "ask-fox", label: "Ask Fox", event: "bubble", capture: { field: "ask-fox" } },
  ];
}

function holdDocsAsk() {
  return {
    text: HOLD_DOCS_COPY,
    actions: holdDocsActions(),
  };
}

export function holdDocsAskFox() {
  return {
    text: HOLD_DOCS_ASK_FOX,
    actions: holdDocsActions(),
  };
}

export const CORRECT_ASK = "What should I change?";

const CORRECTION_CHIP_IDS = new Set([
  "product",
  "occupancy",
  "timeline",
  "price",
  "home",
  "down",
  "loan",
  "line",
  "credit",
  "income",
  "qualifying",
  "years-in-business",
  "debts",
  "housing",
  "subject-lease",
  "assets",
  "property-type",
  "time-on-job",
  "current-housing",
  "declarations",
  "household",
  "borrower-name",
  "other-reo",
]);

function yearsOnFile(draft: FoxIntakeDraft) {
  return Boolean(draft.facts?.[YEARS_IN_BUSINESS_FIELD]);
}

function selfEmployedIncome(draft: FoxIntakeDraft) {
  const income = draft.incomeType.value;
  return income === "self-employed" || income === "both";
}

function extraCorrectionLines(draft: FoxIntakeDraft): { id: string; label: string; prompt: FoxPrompt }[] {
  const extra: { id: string; label: string; prompt: FoxPrompt }[] = [];
  if (draft.productIntent) {
    extra.push({ id: "product", label: "Product", prompt: "product" });
  }
  if (
    yearsOnFile(draft) ||
    draft.awaitingYearsInBusiness ||
    shouldAskYearsInBusiness(draft) ||
    selfEmployedIncome(draft)
  ) {
    extra.push({ id: "years-in-business", label: "Years in business", prompt: "years-in-business" });
  }
  if (qualifyingIncomeDisplay(draft)) {
    extra.push({ id: "qualifying", label: "Qualifying income", prompt: "qualifying" });
  }
  if (draft.monthlyDebtsAsked || draft.statedMonthlyDebts != null) {
    extra.push({ id: "debts", label: "Monthly debts", prompt: "debts" });
  }
  if (draft.housingAsked || draft.estimatedHousing != null) {
    extra.push({ id: "housing", label: "Housing payment", prompt: "housing" });
  }
  if (draft.subjectLeaseAsked || draft.rentalGrossMonthly != null) {
    extra.push({ id: "subject-lease", label: "Lease or rent", prompt: "subject-lease" });
  }
  if (draft.availableAssetsAsked || draft.statedAvailableAssets != null) {
    extra.push({ id: "assets", label: "Stated available assets", prompt: "assets" });
  }
  if (draft.propertyTypeAsked || draft.propertyType) {
    extra.push({ id: "property-type", label: "Property type", prompt: "property-type" });
  }
  if (draft.timeOnJobAsked || draft.statedTimeOnJob != null) {
    extra.push({ id: "time-on-job", label: "Time on job", prompt: "time-on-job" });
  }
  if (draft.currentHousingAsked || draft.statedCurrentHousing != null) {
    extra.push({ id: "current-housing", label: "Current housing", prompt: "current-housing" });
  }
  if (draft.declarationAsked || draft.statedDeclaration) {
    extra.push({ id: "declarations", label: "Declarations", prompt: "declarations" });
  }
  if (draft.declarationTiming || draft.declarationTimingAsked) {
    extra.push({ id: "declaration-timing", label: "Event timing", prompt: "declaration-timing" });
  }
  if (draft.householdAsked || draft.statedHousehold) {
    extra.push({ id: "household", label: "Household", prompt: "household" });
  }
  if (draft.coborrowerNameAsked || draft.coborrowerName) {
    extra.push({ id: "coborrower-name", label: coborrowerFileLabel(draft), prompt: "coborrower-name" });
  }
  if (draft.borrowerNameAsked || draft.borrowerName || draft.contact.fullName.value) {
    extra.push({ id: "borrower-name", label: primaryFileLabel(draft), prompt: "borrower-name" });
  }
  if (draft.otherReoAsked || draft.statedOtherReo) {
    extra.push({ id: "other-reo", label: "Other real estate", prompt: "other-reo" });
  }
  return extra;
}

function correctionFieldActions(draft: FoxIntakeDraft): FoxAction[] {
  const seen = new Set<string>();
  const lines = [
    ...requiredStructureLines(draft),
    ...extraCorrectionLines(draft),
  ].filter((line) => {
    if (!CORRECTION_CHIP_IDS.has(line.id) || seen.has(line.id)) return false;
    seen.add(line.id);
    return true;
  });
  return lines.map((line) => ({
    id: `fix-${line.id}`,
    label: line.label,
    event: "bubble" as const,
    capture: { field: "correct" as const, value: line.prompt, line: line.id },
  }));
}

function correctionAsk(draft: FoxIntakeDraft) {
  return {
    text: CORRECT_ASK,
    actions: correctionFieldActions(draft),
  };
}

function wantsCorrectionMenu(text: string) {
  const t = text.trim().toLowerCase().replace(/[?.!]+$/g, "").replace(/\s+/g, " ");
  return (
    /^(needs?|need)( a)? correction$/.test(t) ||
    /^what should i change$/.test(t) ||
    /^what do i (need to )?change$/.test(t) ||
    /^what can i change$/.test(t)
  );
}

function canOpenCorrectionMenu(draft: FoxIntakeDraft) {
  return sketchAssembled(draft) || draft.correcting === "correct";
}

function dismissesCorrectionMenu(text: string) {
  if (wantsCorrectionMenu(text)) return false;
  return /^(looks right|looks good|still right|confirm|yes|ok|okay|good)$/i.test(text.trim());
}

function skipRemainingInvites(draft: FoxIntakeDraft): FoxIntakeDraft {
  let next = draft;
  for (let i = 0; i < 8 && nextDocInvite(next); i += 1) {
    next = skipCurrentInvite(next);
  }
  return { ...next, correcting: null, correctingLine: null };
}

function draftAfterDismissCorrection(draft: FoxIntakeDraft): FoxIntakeDraft {
  const next: FoxIntakeDraft = { ...draft, correcting: null, correctingLine: null };
  if (!next.sampleAccepted && sketchAssembled(next) && nextDocInvite(next)) {
    return skipRemainingInvites(next);
  }
  return next;
}

function docInviteActions(): FoxAction[] {
  return [
    { id: "upload-this", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } },
    { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
  ];
}

function looksLikeQuestion(text: string) {
  const trimmed = text.trim();
  return (
    /\?$/.test(trimmed) ||
    /^(why|what|how|when|who|where|can i|can you|could i|could you|do i|will i|am i|should i|is this|is there|are there)\b/i.test(
      trimmed,
    )
  );
}

export const COST_COPY = COST_LINE;
export const ACR_BENEFITS_COPY = ACR_BENEFITS_LINE;
export const TIMELINE_COPY = TIMELINE_LINE;
export const PHONE_COPY = PHONE_LINE;
export const W2_TAX_RETURN_COPY = "No. This path needs a paystub and a W-2.";
const HELLO_COPY = "Hi.";
const AFTER_PROCEED_COPY =
  "After Proceed the file goes in queue. I stay the interface. A licensed originator reviews it — I’ll bring the result back here.";
const FILE_ANSWER_COPY = "I can answer from this file. I won’t invent a number, a date, or an approval.";

function asksTaxReturnNeed(text: string) {
  return (
    /\b(tax returns?|1040|schedule c)\b/i.test(text) &&
    /\b(need|needed|require|required|have to|do i|must|necessary)\b/i.test(text)
  );
}

function isTopicalSideAsk(text: string) {
  return interpretQuestion(text) != null || asksTaxReturnNeed(text) || asksStaffExport(text);
}

function isGreeting(text: string) {
  return /^(hi|hello|hey)(?:\s+(?:there|fox))?[.!]?\s*$/i.test(text.trim());
}

function asksProceedAftermath(text: string) {
  return /what happens after proceed|after (i )?proceed\b/i.test(text);
}

function isFreeTextAtGate(text: string) {
  return (
    interpretQuestion(text) != null ||
    isGreeting(text) ||
    asksProceedAftermath(text) ||
    looksLikeQuestion(text) ||
    isTopicalSideAsk(text)
  );
}

export function persistGuidelineNote(draft: FoxIntakeDraft, text: string): FoxIntakeDraft {
  const trimmed = text.trim();
  if (!trimmed) return draft;
  const withNote = draft.notes.some((note) => note === trimmed)
    ? draft
    : { ...draft, notes: [...draft.notes, trimmed] };
  const intent = interpretQuestion(trimmed);
  if (intent?.topicId === "condo.needs_review") {
    return persistCondoNeedsReview(withNote);
  }
  return withNote;
}

function freeTextAnswer(input: string, draft: FoxIntakeDraft) {
  if (asksStaffExport(input)) return STAFF_EXPORT_BORROWER_COPY;
  const answered = foxAnswer(input, factsFromDraft(draft));
  if (answered) return answered.text;
  if (isGreeting(input)) return HELLO_COPY;
  if (asksProceedAftermath(input)) return AFTER_PROCEED_COPY;
  return sideQuestionAnswer(input, draft);
}

function answerThenRestore(input: string, draft: FoxIntakeDraft) {
  const intent = interpretQuestion(input, factsFromDraft(draft));
  const nextDraft =
    intent?.filePatch && intent.topicId !== "language.will_i_qualify"
      ? persistGuidelineNote(draft, input)
      : draft;
  const restored = restoredAsk(freeTextAnswer(input, nextDraft), nextDraft);
  if (nextDraft === draft) return restored;
  return {
    ...restored,
    capture: { field: "note" as const, value: input.trim() },
  };
}

function restoreQueueActions(draft: FoxIntakeDraft) {
  if (inQueueEnding(draft)) return finishLineActions(draft);
  const extra = layer2AskActions(draft) ?? [];
  const finish = finishLineActions(draft);
  const seen = new Set(extra.map((item) => item.label));
  return [...extra, ...finish.filter((item) => !seen.has(item.label))];
}

function restoredAsk(answer: string, draft: FoxIntakeDraft) {
  const ask = nextFoxAsk(draft);
  if (ask.text === HOLD_DOCS_COPY) {
    return {
      text: answer,
      actions: ask.actions,
    };
  }
  return {
    text: `${answer} ${ask.text}`.trim(),
    followUp: ask.followUp,
    facts: ask.facts,
    actions: ask.actions,
  };
}

function sideQuestionAnswer(input: string, draft: FoxIntakeDraft) {
  if (asksStaffExport(input)) return STAFF_EXPORT_BORROWER_COPY;
  if (asksTaxReturnNeed(input)) {
    if (draft.incomeType.value === "w2") return W2_TAX_RETURN_COPY;
    if (draft.incomeType.value === "both") {
      return "This path needs a paystub, a W-2, and the return.";
    }
    return conventionalGuidelinePattern(
      "docs",
      "tax_return",
      "That’s how I estimate qualifying income. Suggested, not underwritten.",
    );
  }
  if (/(what is acr|what.?s acr|active credit relationship)/i.test(input)) {
    return draft.path === "loan-only"
      ? "ACR is the desk that stays open after close — letter, scout, and reward. This file is still the loan."
      : "ACR is the desk that stays open after close. Letter is originator-issued, not Fox. Scout and reward stay on the desk.";
  }
  if (/\b(stated credit|credit mean|what.{0,24}credit|fico)\b/i.test(input)) {
    return (
      structureExplainCopy("credit", draft)?.text ??
      "That’s a stated range for the estimate. Not a FICO and not a credit pull."
    );
  }
  if (draft.awaitingYearsInBusiness && /\b(years?|how long|business|self.?employ)/i.test(input)) {
    return "How long you’ve been running it helps me read the return. Not a form — just the file.";
  }
  if (
    /\b(id|document|return|upload|tax|paystub|w-?2)\b/i.test(input) ||
    /why do you need/i.test(input)
  ) {
    return documentQuestionAnswer(draft);
  }
  return unmatchedSideAnswer(draft);
}

function unmatchedSideAnswer(draft: FoxIntakeDraft) {
  const prompt = workspacePrompt(draft);
  if (prompt === "product") return "I can take Buy, Refinance, HELOC, Jumbo, or Other.";
  if (prompt === "correct") return "That’s so I can fix one line on the sketch.";
  if (prompt === "done" || draft.sampleAccepted) return TIMELINE_COPY;
  return FILE_ANSWER_COPY;
}

function documentQuestionAnswer(draft: FoxIntakeDraft) {
  const invite = nextDocInvite(draft);
  if (invite === "government_id") {
    return conventionalGuidelinePattern("docs", "government_id", "A government ID puts a name on this file.");
  }
  if (invite === "tax_return") {
    return conventionalGuidelinePattern(
      "docs",
      "tax_return",
      "That’s how I estimate qualifying income. Suggested, not underwritten.",
    );
  }
  if (invite === "prior_year_return") {
    return conventionalGuidelinePattern("docs", "prior_year_return", "It helps me see if last year was stable.");
  }
  if (invite === "paystub") {
    return conventionalGuidelinePattern("docs", "paystub", "That’s current income on paper.");
  }
  if (invite === "w2") {
    return conventionalGuidelinePattern("docs", "w2", "That’s last year’s wages on paper.");
  }
  if (draft.correcting === "correct") return "That’s so I can fix one line on the sketch.";
  if (draft.sampleAccepted) return TIMELINE_COPY;
  return FILE_ANSWER_COPY;
}

export function documentsMissingAsk(draft: FoxIntakeDraft) {
  return stillUsefulAskCopy(draft);
}

function docsSettled(draft: FoxIntakeDraft) {
  return draft.documents.length > 0 || draft.documentsSkipped;
}

function sketchNumberReady(draft: FoxIntakeDraft) {
  return sketchAmountsReady(draft);
}

function withIncomeType(draft: FoxIntakeDraft, value: string): FoxIntakeDraft {
  return {
    ...draft,
    incomeType: { ...draft.incomeType, value },
    incomeAsked: true,
  };
}

function amountHelperActions(field: "skip-amount" | "skip-value"): FoxAction[] {
  return AMOUNT_HELPER_BUBBLES.map((item) => ({
    id: `${field}-${item.id}`,
    label: item.label,
    event: "bubble" as const,
    capture: { field },
  }));
}

export const SAMPLE_NOTE = "Sample · indicative · not live";
export const PREVIEW_RATE_NOTE = "Preview rate · not live";
export { CREDIT_STATED_NOTE };
export const CREDIT_RANGE_ASK = "What is your estimated FICO?";
export const CREDIT_RANGE_FOLLOW = CREDIT_STATED_NOTE;
export const REWARD_PREPARED_COPY = "Prepared when you join";
const INVENTED_REWARD_RANGE = /\$[\d,]+(?:\.\d+)?\s+(?:to|–|-|—)\s+\$[\d,]+/;
const SAMPLE_INDICATIVE = /sample\s*·\s*indicative/i;
export const SAMPLE_RATE = 0.0675;
export const SAMPLE_RATE_LABEL = "6.750%";
export const SAMPLE_TERM_MONTHS = 360;
export const SAMPLE_STRUCTURE = "Conventional 30-year";
const SAMPLE_SAFE_CREDIT: CreditRange = "680-719";

export function loanAmountFromDraft(draft: FoxIntakeDraft): number | undefined {
  return (
    draft.loanAmountValue ??
    (!draft.amountAsked ? draft.scenario?.loanAmount : undefined)
  );
}

export function sampleMonthlyPayment(loanAmount?: number | null): number | null {
  if (loanAmount == null || loanAmount <= 0) return null;
  const monthlyRate = SAMPLE_RATE / 12;
  const growth = (1 + monthlyRate) ** SAMPLE_TERM_MONTHS;
  const payment = (loanAmount * monthlyRate * growth) / (growth - 1);
  if (!Number.isFinite(payment) || payment <= 0) return null;
  return payment;
}

export function formatSamplePayment(loanAmount?: number | null): string {
  const payment = sampleMonthlyPayment(loanAmount);
  if (payment == null) return "Loan amount not set";
  return `$${Math.round(payment).toLocaleString("en-US")}/mo`;
}

function creditSettled(draft: FoxIntakeDraft) {
  return Boolean(draft.creditAsked || draft.creditBand);
}

export function sampleReady(draft: FoxIntakeDraft): boolean {
  return sketchAssembled(draft);
}

export function isQualifyingIncomeConfirmPending(draft: FoxIntakeDraft): boolean {
  return draft.pendingProposal?.field === QUALIFYING_INCOME_FIELD;
}

export function isRentalIncomeConfirmPending(draft: FoxIntakeDraft): boolean {
  return isRentalIncomeField(draft.pendingProposal?.field);
}

/** Queue / Looks right waits until Use this / Change on a live income or remainder suggest. */
export function shouldDeferStillUsefulAsk(draft: FoxIntakeDraft): boolean {
  return (
    isQualifyingIncomeConfirmPending(draft) ||
    isRentalIncomeConfirmPending(draft) ||
    Boolean(draft.awaitingPayFrequency) ||
    Boolean(draft.pendingProposal && isRemainderConfirmField(draft.pendingProposal.field)) ||
    isStatedAssetsConfirmPending(draft) ||
    isPropertyTypeConfirmPending(draft) ||
    isSubjectAddressConfirmPending(draft) ||
    isTimeOnJobConfirmPending(draft) ||
    isCurrentHousingConfirmPending(draft) ||
    isDeclarationsConfirmPending(draft) ||
    isHouseholdConfirmPending(draft) ||
    isBorrowerNameConfirmPending(draft) ||
    isOtherReoConfirmPending(draft)
  );
}

/** Single /start conversation engine. Desktop and mobile share this order, copy, and path rules. */
export function nextFoxAsk(draft: FoxIntakeDraft): {
  text: string;
  followUp?: string;
  facts?: ReturnType<typeof workspacePromptCopy>["facts"];
  actions?: FoxAction[];
} {
  if (draft.awaitingYearsInBusiness && !draft.pendingProposal && !draft.pendingConflict) {
    return { text: YEARS_IN_BUSINESS_ASK };
  }
  return workspacePromptCopy(workspacePrompt(draft), draft);
}

export function workspacePrompt(draft: FoxIntakeDraft): FoxPrompt {
  if (draft.outOfState) return "geo-stop";
  if (!draft.path) return "intent";
  if (draft.pendingOffer === "jumbo") return "offer-jumbo";
  if (draft.pendingOffer === "heloc") return "offer-heloc";
  if (draft.awaitingPayFrequency) return "pay-frequency";
  if (draft.pendingConflict || draft.pendingProposal) return "confirm-proposal";
  if (draft.correcting === "path-switch") return "path-switch";
  if (draft.correcting === "correct") return "correct";
  if (draft.correcting === "credit") return "credit";
  if (draft.correcting === "term" && (draft.termAsked || draft.termYears != null)) {
    return "term";
  }
  if (draft.correcting === "income" && draft.incomeType.value) {
    return "income";
  }
  if (draft.correcting === "borrower-name" && governmentIdOutstanding(draft)) {
    // Typed name is illegal while government ID is still the next document.
  } else if (draft.correcting === "coborrower-name" && coborrowerIdOutstanding(draft)) {
    // Typed coborrower name is illegal while their ID is still the next document.
  } else if (draft.correcting) {
    return draft.correcting;
  }
  if (draft.resumeAfterEdit) {
    if (
      draft.resumeAfterEdit === "declaration-timing" &&
      draft.statedDeclaration !== "event"
    ) {
      // Stale resume — timing only after an explicit BK / FC / SS Yes.
    } else if (
      draft.resumeAfterEdit === "borrower-name" &&
      governmentIdOutstanding(draft)
    ) {
      // Stale resume — typed name only after Skip ID or a failed read.
    } else if (
      draft.resumeAfterEdit === "coborrower-name" &&
      (draft.statedHousehold !== "with_someone" ||
        !thisBorrowerPrimaryPackageDone(draft) ||
        coborrowerIdOutstanding(draft))
    ) {
      // Stale resume — coborrower name only after this borrower’s primary pass, then their ID.
    } else if (
      draft.resumeAfterEdit === "household" &&
      !readyForHouseholdAsk(draft) &&
      !draft.householdAsked
    ) {
      // Stale resume — coborrower ask only after Looks right, never mid-docs Skip.
    } else {
      return draft.resumeAfterEdit;
    }
  }
  if (
    draft.docsHeld &&
    !draft.docsStarted &&
    !draft.sampleAccepted &&
    nextDocInvite(draft)
  ) {
    return "documents";
  }
  if (!draft.productIntent) return "product";
  if (needsJumboPurpose(draft)) return "jumbo-purpose";
  if (!draft.occupancyAsked && !draft.occupancyChoice.value) return "occupancy";
  if (!timelineFilled(draft) && !draft.timelineAsked) return "timeline";
  if (purchasePriceAskNeeded(draft)) return "value";
  if (fundsAskNeeded(draft)) return "amount";
  if (refiLoanAskNeeded(draft) || (isHelocFile(draft) && !hasHelocLine(draft))) return "amount";
  if (propertyValueAskNeeded(draft)) return "value";
  if (needsOverPriceCheck(draft)) return "over-price";
  if (!sketchNumberReady(draft)) {
    return draftUsesPurchasePrice(draft) && !hasPropertyValue(draft) ? "value" : "amount";
  }
  if (subjectLeaseAskNeeded(draft)) return "subject-lease";
  if (!creditSettled(draft)) return "credit";
  if (!incomeSettled(draft)) return "income";
  if (needsDeclarationTiming(draft)) return "declaration-timing";
  if (!otherReoSettled(draft)) return "other-reo";
  if (!borrowerNameSettled(draft)) return "borrower-name";
  if (nextDocInvite(draft) && !thisBorrowerPrimaryPackageDone(draft)) return "documents";
  if (!draft.sampleAccepted && draft.awaitingYearsInBusiness) return "documents";
  if (nextDocInvite(draft) && !householdSettled(draft)) return "documents";
  if (primaryDocPassFinished(draft) && !yearsInBusinessSettled(draft)) return "years-in-business";
  if (!draft.sampleAccepted && !householdSettled(draft)) {
    if (!timelineFilled(draft)) return "timeline";
    if (canLooksRight(draft)) return "review";
    if (draft.looksRightHold) return "documents";
    return "amount";
  }
  if (readyForHouseholdAsk(draft) && !householdSettled(draft)) return "household";
  if (!coborrowerNameSettled(draft)) return "coborrower-name";
  if (nextDocInvite(draft)) return "documents";
  if (!draft.sampleAccepted) {
    if (!timelineFilled(draft)) return "timeline";
    if (canLooksRight(draft)) return "review";
    if (draft.looksRightHold) return "documents";
    return "amount";
  }
  const holdCalculatorAsk = draft.motion === "in_queue" || draft.motion === "escalated";
  if (!holdCalculatorAsk && subjectLeaseAskNeeded(draft)) return "subject-lease";
  if (!holdCalculatorAsk && housingConfirmNeeded(draft)) return "housing";
  if (!holdCalculatorAsk && !propertyTypeSettled(draft)) return "property-type";
  return "done";
}

function lateFileRemainder(draft: FoxIntakeDraft): { text?: string; actions?: FoxAction[] } {
  if (draft.motion === "in_queue" || draft.motion === "escalated") return {};
  if (citizenshipNeeded(draft)) {
    const ask = citizenshipAskCopy();
    return {
      text: ask.text,
      actions: (ask.actions ?? []).filter((item) => item.id !== "hold-citizenship"),
    };
  }
  if (formerHistoryNeeded(draft)) {
    const ask = formerHistoryAskCopy();
    return {
      text: ask.text,
      actions: (ask.actions ?? []).filter((item) => item.id !== "hold-former-history"),
    };
  }
  return {};
}

function withFoxFirst<
  T extends { text: string; followUp?: string; actions?: FoxAction[] },
>(copy: T): T {
  if ((copy.actions?.length ?? 0) > 0 && !copy.text.trim() && !(copy.followUp ?? "").trim()) {
    return { ...copy, text: "I’m here. Type below, or tap a reply." };
  }
  return copy;
}

export function workspacePromptCopy(
  prompt: FoxPrompt,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
} {
  return withFoxFirst(workspaceAskCopy(prompt, draft));
}

function workspaceAskCopy(
  prompt: FoxPrompt,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
} {
  if (prompt === "intent") {
    return {
      text: PATH_ASK_TEXT,
      actions: [
        { id: "start", label: "Start your relationship", event: "bubble", capture: { field: "path", value: "acr" } },
        { id: "loan", label: "Just need a mortgage", event: "bubble", capture: { field: "path", value: "loan-only" } },
      ],
    };
  }
  if (prompt === "product") {
    const current = productIntentLabel(draft.productIntent);
    if (current && draft.correcting === "product") {
      return {
        text: `Product in the file is ${current}. Still right?`,
        actions: [...bubbles([...PRODUCT_INTENT_BUBBLES], "productIntent"), ...keepThisActions()],
      };
    }
    return {
      text: starterText(draft.path),
      actions: bubbles([...PRODUCT_INTENT_BUBBLES], "productIntent"),
    };
  }
  if (prompt === "jumbo-purpose") {
    return {
      text: JUMBO_PURPOSE_ASK,
      actions: bubbles([...JUMBO_PURPOSE_BUBBLES], "jumboPurpose"),
    };
  }
  if (prompt === "offer-jumbo") {
    return {
      text: JUMBO_OFFER_COPY,
      actions: offerActions("jumbo"),
    };
  }
  if (prompt === "offer-heloc") {
    return {
      text: HELOC_OFFER_COPY,
      actions: offerActions("heloc"),
    };
  }
  if (prompt === "geo-stop") {
    return {
      text: GEO_STOP_COPY,
      actions: draft.originatorRequested ? undefined : [requestHumanAction()],
    };
  }
  if (prompt === "over-price") {
    return {
      text: loanOverPriceCopy(draft),
      actions: loanOverPriceActions(),
    };
  }
  if (prompt === "occupancy") {
    return {
      text: "How will the property be used?",
      actions: bubbles([...OCCUPANCY_BUBBLES], "occupancy"),
    };
  }
  if (prompt === "timeline") {
    const prior = draft.timelineChoice.value
      ? TIMELINE_BUBBLES.find((item) => item.value === draft.timelineChoice.value)?.label
      : "";
    return {
      text: prior ? `Timeline in the file is ${prior}. Still right?` : "What’s the timeline?",
      actions: prior
        ? [...bubbles([...TIMELINE_BUBBLES], "timeline"), ...keepThisActions()]
        : [
            ...bubbles([...TIMELINE_BUBBLES], "timeline"),
            { id: "skip-timeline", label: "Skip", event: "bubble", capture: { field: "skip-timeline" } },
            { id: "hold-timeline", label: "Not yet", event: "bubble", capture: { field: "skip-timeline" } },
          ],
    };
  }
  if (prompt === "amount") {
    if (editingConfirmedDown(draft)) {
      return {
        text: amountAskText(draft),
        actions: [
          { id: "keep-line", label: "Keep this", event: "bubble", capture: { field: "keep-line" } },
        ],
      };
    }
    const askingPurpose =
      draft.productIntent === "other" && !draft.amountPurposeLabel;
    const requiredAmount =
      fundsAskNeeded(draft) ||
      refiLoanAskNeeded(draft) ||
      (isHelocFile(draft) && !hasHelocLine(draft));
    return {
      text: amountAskText(draft),
      actions: askingPurpose
        ? [
            ...bubbles([...AMOUNT_PURPOSE_BUBBLES], "amountPurpose"),
            ...amountHelperActions("skip-amount"),
          ]
        : requiredAmount
          ? undefined
          : amountHelperActions("skip-amount"),
    };
  }
  if (prompt === "value") {
    const requiredValue = purchasePriceAskNeeded(draft) || propertyValueAskNeeded(draft);
    const editingPrice = Boolean(
      draft.correcting === "value" && hasPropertyValue(draft),
    );
    return {
      text: amountAskText({ ...draft, productIntent: draft.productIntent ?? "buy" }),
      actions: editingPrice
        ? keepThisActions()
        : requiredValue
          ? undefined
          : amountHelperActions("skip-value"),
    };
  }
  if (prompt === "credit") {
    return {
      text: CREDIT_RANGE_ASK,
      followUp: CREDIT_RANGE_FOLLOW,
      actions: [
        ...bubbles([...CREDIT_WORKSPACE_BUBBLES], "creditRange"),
        { id: "skip-credit", label: "Skip", event: "bubble", capture: { field: "skip-credit" } },
        { id: "hold-credit", label: "Not yet", event: "bubble", capture: { field: "skip-credit" } },
      ],
    };
  }
  if (prompt === "term") {
    return {
      text: "Any term in mind?",
      actions: [
        ...bubbles(TERM_BUBBLES.filter((item) => item.value), "termYears"),
        { id: "term-not-sure", label: "Not sure", event: "bubble", capture: { field: "skip-term" } },
        { id: "term-skip", label: "Skip for now", event: "bubble", capture: { field: "skip-term" } },
      ],
    };
  }
  if (prompt === "income") {
    return {
      text: "How is income earned?",
      actions: bubbles([...INCOME_BUBBLES], "incomeType"),
    };
  }
  if (prompt === "subject-lease") {
    return subjectLeaseAskCopy();
  }
  if (prompt === "housing") {
    return housingAskCopy(draft);
  }
  if (prompt === "debts") {
    return monthlyDebtsAskCopy(draft);
  }
  if (prompt === "assets") {
    return availableAssetsAskCopy(draft);
  }
  if (prompt === "property-type") {
    return propertyTypeAskCopy(draft);
  }
  if (prompt === "time-on-job") {
    return timeOnJobAskCopy(draft);
  }
  if (prompt === "current-housing") {
    return currentHousingAskCopy(draft);
  }
  if (prompt === "declarations") {
    return declarationsAskCopy(draft);
  }
  if (prompt === "citizenship") {
    return citizenshipAskCopy();
  }
  if (prompt === "former-history") {
    return formerHistoryAskCopy();
  }
  if (prompt === "declaration-timing") {
    return declarationTimingAskCopy();
  }
  if (prompt === "household") {
    return householdAskCopy(draft);
  }
  if (prompt === "coborrower-name") {
    return coborrowerNameAskCopy(draft);
  }
  if (prompt === "borrower-name") {
    return borrowerNameAskCopy(draft);
  }
  if (prompt === "other-reo") {
    return otherReoAskCopy(draft);
  }
  if (prompt === "qualifying") {
    const shown =
      qualifyingIncomeDisplay(draft)?.value ||
      (draft.facts?.qualifying_income?.value
        ? displayFactValue(QUALIFYING_INCOME_FIELD, draft.facts.qualifying_income.value)
        : "");
    return {
      text: shown
        ? `Qualifying income in the file is ${shown} a month. Still right?`
        : "What’s the monthly qualifying income?",
      actions: shown ? keepThisActions() : undefined,
    };
  }
  if (prompt === "years-in-business") {
    return {
      text: YEARS_IN_BUSINESS_ASK,
      actions: yearsInBusinessSkipActions(),
    };
  }
  if (prompt === "documents") {
    if (draft.awaitingYearsInBusiness) {
      return { text: YEARS_IN_BUSINESS_ASK };
    }
    if (
      draft.docsHeld &&
      !draft.docsStarted &&
      !draft.sampleAccepted &&
      nextDocInvite(draft)
    ) {
      return holdDocsAsk();
    }
    if (offeringDocStart(draft) && draft.docsHeld) {
      return holdDocsAsk();
    }
    if (offeringDocStart(draft)) {
      return {
        ...sketchAndStartDocsCopy(draft),
        actions: startDocsActions(),
      };
    }
    const invite = nextDocInvite(draft);
    if (invite === "coborrower_government_id") {
      return {
        text: coborrowerHandOffCopy(draft),
        followUp: coborrowerIdInviteCopy(draft),
        actions: docInviteActions(),
      };
    }
    return {
      text: documentsAskText(draft),
      actions: invite ? docInviteActions() : undefined,
    };
  }
  if (prompt === "preparing") {
    return { text: "I’m preparing your file." };
  }
  if (prompt === "review") {
    if (!canLooksRight(draft)) {
      const missing = missingAmountAsk(draft);
      return {
        text: missing || "I still need a required amount on this file.",
        actions: undefined,
      };
    }
    return {
      text: "The notepad looks complete enough to move. Does it look right?",
      actions: [
        { id: "looks-right", label: "Looks right", event: "bubble", capture: { field: "confirm-draft" } },
        { id: "needs-fix", label: "Needs a correction", event: "bubble", capture: { field: "needs-correction" } },
      ],
    };
  }
  if (prompt === "correct") {
    return correctionAsk(draft);
  }
  if (prompt === "pay-frequency") {
    return payFrequencyAsk();
  }
  if (prompt === "confirm-proposal") {
    if (draft.pendingConflict) {
      return {
        text: conflictAskCopy(draft.pendingConflict),
        actions: conflictActions(draft.pendingConflict),
      };
    }
    const proposal = draft.pendingProposal;
    if (!proposal) {
      return { text: missingAmountAsk(draft) || "I can keep this file current." };
    }
    return liveProposalAsk(draft, proposal);
  }
  if (prompt === "path-switch") {
    if (draft.path === "loan-only") {
      return {
        text: "Switch to the desk?",
        actions: [
          { id: "switch-acr", label: "Switch to the desk", event: "bubble", capture: { field: "path", value: "acr" } },
          { id: "keep-path", label: "Keep this path", event: "bubble", capture: { field: "keep-path" } },
        ],
      };
    }
    return {
      text: "Switch to loan only?",
      actions: [
        { id: "switch-loan", label: "Switch to loan only", event: "bubble", capture: { field: "path", value: "loan-only" } },
        { id: "keep-path", label: "Keep this path", event: "bubble", capture: { field: "keep-path" } },
      ],
    };
  }
  if (prompt === "done") {
    const outbox = latestOutbox(draft);
    const remind = remindLine(draft);
    const late = lateFileRemainder(draft);
    return {
      text: motionAskText(draft),
      followUp: late.text || rememberedAskCopy(draft) || remind || undefined,
      facts: outbox
        ? [
            {
              id: "outbox",
              label: "Preview outbox",
              value: outbox.to,
              note: outbox.body,
            },
          ]
        : undefined,
      actions: [...(late.actions ?? []), ...finishLineActions(draft)],
    };
  }
  return {
    text: "I have the basics. I’ll keep this file current as we go.",
  };
}

export function workspaceGreeting(draft: FoxIntakeDraft): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
} {
  const prompt = workspacePrompt(draft);
  if (prompt === "product" || prompt === "intent") {
    return workspacePromptCopy(prompt, draft);
  }
  const next = workspacePromptCopy(prompt, draft);
  if (
    prompt === "basics-done" ||
    prompt === "documents" ||
    prompt === "preparing" ||
    prompt === "review" ||
    prompt === "correct" ||
    prompt === "path-switch" ||
    prompt === "jumbo-purpose" ||
    prompt === "offer-jumbo" ||
    prompt === "offer-heloc" ||
    prompt === "geo-stop" ||
    prompt === "confirm-proposal" ||
    prompt === "pay-frequency" ||
    prompt === "done"
  ) {
    return next;
  }
  return {
    text: `${starterText(draft.path)} ${next.text}`,
    followUp: next.followUp,
    facts: next.facts,
    actions: next.actions,
  };
}

export function formatMoney(value: number) {
  return `$${formatDollars(value)}`;
}

export function needsOverPriceCheck(draft: FoxIntakeDraft) {
  return (
    isPurchaseLike(draft) &&
    loanExceedsPurchasePrice(draft) &&
    !draft.overPriceConfirmed &&
    draft.motion !== "escalated"
  );
}

export function loanOverPriceCopy(draft: FoxIntakeDraft) {
  return answerFromFile("flags.loan_over_price", factsFromDraft(draft)).text;
}

export function loanOverPriceActions(): FoxAction[] {
  return [
    {
      id: "over-price-price",
      label: "Purchase price",
      event: "bubble",
      capture: { field: "correct", value: "value", line: "price" },
    },
    {
      id: "over-price-down",
      label: "Down payment",
      event: "bubble",
      capture: { field: "correct", value: "amount", line: "down" },
    },
    {
      id: "over-price-loan",
      label: "Loan amount",
      event: "bubble",
      capture: { field: "correct", value: "amount", line: "loan" },
    },
    {
      id: "over-price-confirm",
      label: "That’s right",
      event: "bubble",
      capture: { field: "over-price-confirm" },
    },
  ];
}

/** Live composer commas. Returns null when the text is not a pure money number. */
export function formatLiveMoneyInput(raw: string): string | null {
  if (/[a-zA-Z]/.test(raw)) return null;
  const hasDollar = raw.includes("$");
  const hasPercent = raw.includes("%");
  if (hasPercent) {
    const digits = raw.replace(/[^\d.]/g, "");
    return digits ? `${digits}%` : "%";
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return hasDollar ? "$" : "";
  if (digits.length > 12) return null;
  const formatted = Number(digits).toLocaleString("en-US");
  return hasDollar ? `$${formatted}` : formatted;
}

export function caretAfterMoneyFormat(raw: string, caret: number, formatted: string) {
  const prefix = formatted.startsWith("$") ? 1 : 0;
  const digitsBefore = raw.slice(0, Math.max(0, caret)).replace(/\D/g, "").length;
  if (digitsBefore === 0) return prefix;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen === digitsBefore) return i + 1;
    }
  }
  return formatted.length;
}

export function confirmedMoneyText(raw: string): string | null {
  const pair = parseAmountPair(raw);
  if (pair.loan != null && pair.value != null && pair.value !== pair.loan) {
    return `${formatMoney(pair.loan)} on ${formatMoney(pair.value)}`;
  }
  const amount = pair.loan ?? pair.value ?? parseLooseAmount(raw);
  return amount != null ? formatMoney(amount) : null;
}

function collectAmounts(text: string): number[] {
  const pattern =
    /\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(m|mm|million|k|thousand)?/gi;
  const amounts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const value = amountFromParts(match[1], match[2]);
    if (value != null) amounts.push(value);
  }
  return amounts;
}

export function parseLooseAmount(text: string): number | null {
  return collectAmounts(text)[0] ?? null;
}

export type FundsParse = {
  dollars: number;
  percent?: number;
  asPercent: boolean;
  explicitDollars: boolean;
};

const FUNDS_ROLE_WORDS = /\b(down(\s+payment)?|earnest|deposit|loan(\s+amount)?|payoff)\b/gi;

export function parseFundsAmount(text: string, price?: number | null): FundsParse | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const explicitDollars = /\$/.test(trimmed) || /\b(dollars?|bucks)\b/.test(lower);
  const percentMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(%|percent\b|pct\b)/i);
  if (percentMatch && !explicitDollars) {
    const percent = Number(percentMatch[1]);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
    if (price == null || price <= 0) return null;
    const down = Math.round((price * percent) / 100);
    if (down <= 0) return null;
    return { dollars: down, percent, asPercent: true, explicitDollars: false };
  }
  if (explicitDollars) {
    const fromLoose = parseLooseAmount(trimmed);
    if (fromLoose != null) return { dollars: fromLoose, asPercent: false, explicitDollars: true };
    const small = trimmed.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d+)?)/);
    if (small) {
      const n = Number(small[1]);
      if (Number.isFinite(n) && n > 0) {
        return { dollars: Math.round(n), asPercent: false, explicitDollars: true };
      }
    }
    return null;
  }
  const stripped = trimmed.replace(FUNDS_ROLE_WORDS, "").replace(/\s+/g, " ").trim();
  const bare = stripped.match(/^(\d{1,2}(?:\.\d+)?|100(?:\.0+)?)$/);
  if (bare && price != null && price > 0) {
    const percent = Number(bare[1]);
    if (percent >= 1 && percent <= 100) {
      const down = Math.round((price * percent) / 100);
      if (down > 0) return { dollars: down, percent, asPercent: true, explicitDollars: false };
    }
  }
  const amount = parseLooseAmount(stripped || trimmed);
  if (amount != null) return { dollars: amount, asPercent: false, explicitDollars: false };
  return null;
}

function replyToFundsAsk(
  q: string,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
  capture?: Capture;
} {
  if (isUnknownAmount(q)) {
    if (draft.correcting === "amount" || draft.resumeAfterEdit) {
      const nextDraft = {
        ...draft,
        amountAsked: true,
        loanAmountValue: undefined,
        correcting: null,
        correctingLine: null,
      };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-amount" as const },
      };
    }
    return { text: "What’s the down payment or loan amount? A number works." };
  }
  const price = draft.propertyValueAmount;
  const parsed = parseFundsAmount(q, price);
  if (parsed == null) {
    return {
      text: "What’s the down payment or loan amount? A number under the purchase price works.",
    };
  }
  const namedDown = parseFundsRole(q, price) === "down";
  if (price != null && parsed.dollars > price && !parsed.asPercent) {
    if (namedDown) {
      return {
        text: "What’s the down payment or loan amount? A number under the purchase price works.",
      };
    }
    const nextDraft = {
      ...draft,
      correcting: null,
      correctingLine: null,
      pendingProposal: null,
      loanAmountValue: parsed.dollars,
      amountAsked: true,
    };
    return {
      text: loanOverPriceCopy(nextDraft),
      actions: loanOverPriceActions(),
      capture: { field: "loanAmount", value: String(parsed.dollars) },
    };
  }
  if (price != null && parsed.dollars === price && !parsed.asPercent) {
    return {
      text: "Purchase price is in the file. What’s the down payment or loan amount?",
    };
  }
  const role =
    draft.correctingLine === "down"
      ? "down"
      : draft.correctingLine === "loan" && !parsed.asPercent
        ? "loan"
        : parsed.asPercent
          ? "down"
          : parseFundsRole(q, price) ?? (parsed.dollars < (price ?? 0) * 0.5 ? "down" : "loan");
  const cleared = { ...draft, correcting: null, correctingLine: null, pendingProposal: null as null };
  const pairConfirm =
    price != null &&
    price > 0 &&
    (parsed.asPercent || (parsed.explicitDollars && parsed.dollars < 1000));
  if (pairConfirm && editingConfirmedDown(draft)) {
    const loan = impliedLoanAmount(price, parsed.dollars);
    if (loan == null) {
      return {
        text: "What’s the down payment? A number under the purchase price works.",
      };
    }
    const nextDraft = withComputedCompanion(
      { ...cleared, downPaymentAmount: parsed.dollars, downAsked: true },
      "down",
    );
    return withWorkspaceGuide(
      {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "downPayment", value: String(parsed.dollars) },
      },
      nextDraft,
    );
  }
  if (pairConfirm) {
    const pair =
      role === "loan"
        ? (() => {
            const down = impliedDownPayment(price, parsed.dollars);
            return down != null ? { down, loan: parsed.dollars } : null;
          })()
        : (() => {
            const loan = impliedLoanAmount(price, parsed.dollars);
            return loan != null ? { down: parsed.dollars, loan } : null;
          })();
    if (!pair) {
      return {
        text: "What’s the down payment or loan amount? A number under the purchase price works.",
      };
    }
    const nextDraft = proposeFundsPair(cleared, pair.down, pair.loan);
    return {
      ...workspacePromptCopy("confirm-proposal", nextDraft),
      capture: { field: "propose-funds", value: `${pair.down}:${pair.loan}` },
    };
  }
  if (role === "down") {
    const nextDraft = withComputedCompanion(
      { ...cleared, downPaymentAmount: parsed.dollars, downAsked: true },
      hasLoanAmount(draft) ? "down" : undefined,
    );
    return withWorkspaceGuide(
      {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "downPayment", value: String(parsed.dollars) },
      },
      nextDraft,
    );
  }
  const nextDraft = withComputedCompanion(
    { ...cleared, loanAmountValue: parsed.dollars, amountAsked: true },
    hasDownPayment(draft) ? "loan" : undefined,
  );
  return withWorkspaceGuide(
    {
      ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
      capture: { field: "loanAmount", value: String(parsed.dollars) },
    },
    nextDraft,
  );
}

export function parseAmountPair(text: string): { loan?: number; value?: number } {
  const amounts = collectAmounts(text);
  if (amounts.length >= 2) {
    const [first, second] = amounts;
    const loan = Math.min(first, second);
    const value = Math.max(first, second);
    return { loan, value };
  }
  if (amounts.length === 1) {
    const lower = text.toLowerCase();
    if (/value|worth|home|house|property/.test(lower) && !/loan|line|cash/.test(lower)) {
      return { value: amounts[0] };
    }
    return { loan: amounts[0] };
  }
  return {};
}

export function isUnknownAmount(text: string) {
  if (parseLooseAmount(text) != null) return false;
  const lower = text.trim().toLowerCase().replace(/['’]/g, "");
  return /dont know|do not know|not sure|unsure|unknown|no idea|\bidk\b|dunno|skip( for now)?|\blater\b|n\/a|\bnone\b/.test(
    lower,
  );
}

function amountFromParts(raw: string, unit?: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const suffix = (unit ?? "").toLowerCase();
  if (suffix === "m" || suffix === "mm" || suffix === "million") {
    return Math.round(n * 1_000_000);
  }
  if (suffix === "k" || suffix === "thousand") {
    return Math.round(n * 1_000);
  }
  if (n < 1000) return null;
  return Math.round(n);
}

export function isSkipCreditText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|not sure|unsure|unknown)$/i.test(lower) ||
    (/^\b(credit|fico|score)\b/.test(lower) && /\b(not sure|unsure|unknown)\b/.test(lower))
  );
}

/** Chip band or typed 3-digit score. Does not invent a FICO from a band. */
export function parseCreditRange(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || isSkipCreditText(trimmed)) return null;
  const lower = trimmed.toLowerCase().replace(/[–—]/g, "-");
  const exact = CREDIT_WORKSPACE_BUBBLES.find(
    (item) =>
      item.label.toLowerCase().replace(/[–—]/g, "-") === lower || item.value === lower,
  );
  if (exact) return exact.value;
  for (const item of CREDIT_WORKSPACE_BUBBLES) {
    const token = item.value.toLowerCase();
    const label = item.label.toLowerCase().replace(/[–—]/g, "-");
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(lower) || lower.includes(label) && label.includes("-")) {
      return item.value;
    }
  }
  const scoreMatch = trimmed.match(/\b([3-8]\d{2})\b/);
  if (scoreMatch) {
    const score = Number(scoreMatch[1]);
    if (score >= 300 && score <= 850) return String(score);
  }
  return null;
}

export function parseTermYears(text: string): number | null | "skip" {
  const lower = text.trim().toLowerCase();
  if (/skip|later|not sure|no|none/.test(lower)) return "skip";
  if (/\b30\b/.test(lower)) return 30;
  if (/\b15\b/.test(lower)) return 15;
  if (/\b10\b/.test(lower)) return 10;
  const years = lower.match(/(\d+)\s*-?\s*year/);
  if (years) {
    const n = Number(years[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function occupancySpokenLabel(value?: string | null) {
  return OCCUPANCY_BUBBLES.find((item) => item.value === value)?.label ?? "";
}

function occupancyFromText(text: string) {
  const trimmed = text.trim();
  if (/^\$?\d[\d,]*(?:\.\d+)?%?$/.test(trimmed) || /^\d{1,3}\s*(%|percent)$/i.test(trimmed)) {
    return undefined;
  }
  const lower = trimmed.toLowerCase();
  return (
    OCCUPANCY_BUBBLES.find(
      (item) => item.label.toLowerCase() === lower || item.value === lower,
    ) ??
    (/primary|owner/.test(lower)
      ? OCCUPANCY_BUBBLES[0]
      : /second/.test(lower)
        ? OCCUPANCY_BUBBLES[1]
        : /invest/.test(lower)
          ? OCCUPANCY_BUBBLES[2]
          : undefined)
  );
}

function timelineFromText(text: string) {
  const lower = text.trim().toLowerCase();
  return TIMELINE_BUBBLES.find(
    (item) =>
      item.label.toLowerCase() === lower ||
      item.value === lower ||
      (lower.includes("explor") && item.value === "exploring") ||
      (lower.includes("ready") && item.value === "ready-now") ||
      (lower.includes("30") && item.value === "30-90"),
  );
}

export function editLineFromCapture(capture?: Capture): string | undefined {
  if (!capture) return undefined;
  if (
    capture.field === "downPayment" ||
    capture.field === "propose-funds" ||
    capture.field === "skip-down"
  ) {
    return "down";
  }
  if (capture.field === "loanAmount" || capture.field === "skip-amount") return "loan";
  return undefined;
}

export function editPromptFromPendingField(field?: string | null): FoxPrompt | undefined {
  if (!field) return undefined;
  return editPromptFromCapture({ field, value: "" } as Capture);
}

export function promptForProposalField(field?: string | null): FoxPrompt | undefined {
  if (!field) return undefined;
  if (field === "loanAmount" || field === "downPayment" || field === "down_payment" || field === "loan_amount") {
    return "amount";
  }
  if (field === "purchase_price" || field === "propertyValue" || field === "property_value") return "value";
  if (field === QUALIFYING_INCOME_FIELD) return "qualifying";
  if (field === STATED_MONTHLY_DEBTS_FIELD) return "debts";
  if (field === STATED_AVAILABLE_ASSETS_FIELD) return "assets";
  if (field === PROPERTY_TYPE_FIELD) return "property-type";
  if (field === STATED_TIME_ON_JOB_FIELD) return "time-on-job";
  if (field === STATED_CURRENT_HOUSING_FIELD) return "current-housing";
  if (field === STATED_DECLARATION_FIELD) return "declarations";
  if (field === "declarationTiming") return "declaration-timing";
  if (field === STATED_HOUSEHOLD_FIELD) return "household";
  if (isCoborrowerNameField(field)) return "coborrower-name";
  if (isBorrowerNameField(field)) return "borrower-name";
  if (field === STATED_OTHER_REO_FIELD) return "other-reo";
  if (field === "property_address" || field === "subjectAddress") return "property-type";
  const fromCapture = editPromptFromPendingField(field);
  return fromCapture === "confirm-proposal" ? undefined : fromCapture;
}

export function changePendingProposal(draft: FoxIntakeDraft): FoxIntakeDraft {
  const field = draft.pendingProposal?.field;
  const prompt = promptForProposalField(field);
  return {
    ...draft,
    pendingProposal: null,
    correcting: prompt ?? null,
    correctingLine:
      field === "downPayment" || field === "down_payment"
        ? "down"
        : field === "loanAmount" || field === "loan_amount"
          ? "loan"
          : draft.correctingLine,
  };
}

export function editPromptFromCapture(capture?: Capture): FoxPrompt | undefined {
  if (!capture) return undefined;
  if (capture.field === "path") return "path-switch";
  if (capture.field === "productIntent" || capture.field === "starter") return "product";
  if (capture.field === "jumboPurpose") return "jumbo-purpose";
  if (
    capture.field === "accept-jumbo" ||
    capture.field === "decline-jumbo" ||
    capture.field === "pending-offer"
  ) {
    return "offer-jumbo";
  }
  if (capture.field === "accept-heloc" || capture.field === "decline-heloc") {
    return "offer-heloc";
  }
  if (capture.field === "occupancy") return "occupancy";
  if (capture.field === "timeline" || capture.field === "skip-timeline") return "timeline";
  if (capture.field === "skip-subject-lease" || capture.field === "statedSubjectLease") {
    return "subject-lease";
  }
  if (
    capture.field === "loanAmount" ||
    capture.field === "skip-amount" ||
    capture.field === "amountPurpose" ||
    capture.field === "downPayment" ||
    capture.field === "skip-down" ||
    capture.field === "propose-funds"
  ) {
    return "amount";
  }
  if (capture.field === "propertyValue" || capture.field === "skip-value") return "value";
  if (
    capture.field === "accept-proposal" ||
    capture.field === "change-proposal" ||
    capture.field === "decline-proposal"
  ) {
    return "confirm-proposal";
  }
  if (capture.field === "creditRange" || capture.field === "skip-credit") return "credit";
  if (capture.field === "termYears" || capture.field === "skip-term") return "term";
  if (capture.field === "incomeType") return "income";
  if (
    capture.field === "skip-monthly-debts" ||
    capture.field === "propose-monthly-debts" ||
    capture.field === "include-mortgage-debts" ||
    capture.field === "subtract-mortgage" ||
    capture.field === "statedMonthlyDebts"
  ) {
    return "debts";
  }
  if (capture.field === "skip-housing" || capture.field === "estimatedHousing") {
    return "housing";
  }
  if (
    capture.field === "skip-available-assets" ||
    capture.field === "propose-available-assets" ||
    capture.field === "statedAvailableAssets"
  ) {
    return "assets";
  }
  if (
    capture.field === "skip-property-type" ||
    capture.field === "propose-property-type" ||
    capture.field === "propertyType"
  ) {
    return "property-type";
  }
  if (
    capture.field === "skip-time-on-job" ||
    capture.field === "propose-time-on-job" ||
    capture.field === "statedTimeOnJob"
  ) {
    return "time-on-job";
  }
  if (
    capture.field === "skip-current-housing" ||
    capture.field === "propose-current-housing" ||
    capture.field === "statedCurrentHousing"
  ) {
    return "current-housing";
  }
  if (
    capture.field === "skip-declarations" ||
    capture.field === "propose-declarations" ||
    capture.field === "statedDeclaration"
  ) {
    return "declarations";
  }
  if (capture.field === "skip-declaration-timing" || capture.field === "declarationTiming") {
    return "declaration-timing";
  }
  if (
    capture.field === "skip-household" ||
    capture.field === "propose-household" ||
    capture.field === "statedHousehold"
  ) {
    return "household";
  }
  if (capture.field === "skip-citizenship" || capture.field === "citizenship") {
    return "citizenship";
  }
  if (capture.field === "skip-former-history" || capture.field === "formerHistory") {
    return "former-history";
  }
  if (
    capture.field === "skip-coborrower-name" ||
    capture.field === "propose-coborrower-name" ||
    capture.field === "coborrowerName"
  ) {
    return "coborrower-name";
  }
  if (
    capture.field === "skip-borrower-name" ||
    capture.field === "propose-borrower-name" ||
    capture.field === "borrowerName"
  ) {
    return "borrower-name";
  }
  if (
    capture.field === "skip-other-reo" ||
    capture.field === "propose-other-reo" ||
    capture.field === "statedOtherReo"
  ) {
    return "other-reo";
  }
  if (
    capture.field === "propose-subject-address" ||
    capture.field === "subjectAddress" ||
    capture.field === "propose-rental-lease"
  ) {
    return "confirm-proposal";
  }
  if (
    capture.field === "skip-docs" ||
    capture.field === "hold-docs" ||
    capture.field === "start-docs" ||
    capture.field === "open-docs" ||
    capture.field === "upload-more"
  ) {
    return "documents";
  }
  return undefined;
}

/** Chips already sit in the thread. Fox speaks only the next helpful line — never echo the last capture as a label. */
export function withWorkspaceGuide<
  T extends {
    text: string;
    followUp?: string;
    facts?: PreviewFact[];
    actions?: FoxAction[];
    capture?: Capture;
  },
>(reply: T, _nextDraft: FoxIntakeDraft): T {
  return reply;
}

export function workspaceUpdateCopy(capture: Capture, draft: FoxIntakeDraft) {
  if (capture.field === "path") {
    return capture.value === "loan-only"
      ? "Updated path to loan only."
      : "Updated path to the desk.";
  }
  if (capture.field === "keep-path") {
    return "Kept this path.";
  }
  if (capture.field === "keep-line") {
    if (editingConfirmedDown(draft) || draft.correctingLine === "down") {
      return "Kept the down payment.";
    }
    return "Kept this.";
  }
  if (capture.field === "what-acr") {
    return "ACR is the desk that stays open after close — letter, scout, and reward. This file is still the loan.";
  }
  if (capture.field === "what-happens-next") {
    return MOTION_COPY.whatHappensNext;
  }
  if (capture.field === "ask-fox") {
    if (draft.docsHeld && !draft.sampleAccepted) return HOLD_DOCS_ASK_FOX;
    return MOTION_COPY.askFox;
  }
  if (capture.field === "talk-originator") {
    return MOTION_COPY.escalated;
  }
  if (capture.field === "proceed") {
    return MOTION_COPY.in_queue;
  }
  if (capture.field === "not-yet") {
    return emailMissing(draft) ? MOTION_COPY.emailAsk : MOTION_COPY.on_hold;
  }
  if (capture.field === "start-docs") {
    return "";
  }
  if (capture.field === "upload-more") {
    return "";
  }
  if (capture.field === "productIntent" || capture.field === "starter") {
    return `Updated product to ${productIntentLabel(capture.value)}.`;
  }
  if (capture.field === "jumboPurpose") {
    return capture.value === "refinance"
      ? "Updated. Jumbo refinance."
      : "Updated. Jumbo purchase.";
  }
  if (capture.field === "accept-jumbo") return "Updated product to Jumbo.";
  if (capture.field === "decline-jumbo") return "Kept this product.";
  if (capture.field === "accept-heloc") return "Updated product to HELOC.";
  if (capture.field === "decline-heloc") return "Kept Refinance.";
  if (capture.field === "out-of-state") return GEO_STOP_COPY;
  if (capture.field === "in-state") return "California — I can prepare this file.";
  if (capture.field === "govProgram") return govProgramCopy(draft, capture.value);
  if (capture.field === "creditEvent") return creditEventCopy({ ...draft, creditEvent: capture.value });
  if (capture.field === "occupancy") {
    const label = occupancySpokenLabel(capture.value);
    return label ? `Updated occupancy to ${label}.` : "Updated occupancy.";
  }
  if (capture.field === "timeline") {
    const label = TIMELINE_BUBBLES.find((item) => item.value === capture.value)?.label;
    return label ? `Updated timeline to ${label}.` : "Updated timeline.";
  }
  if (capture.field === "skip-timeline") return "Updated. Timeline left blank.";
  if (capture.field === "skip-subject-lease") return "Updated. Lease left blank.";
  if (capture.field === "statedSubjectLease") {
    const n = Number(capture.value);
    return Number.isFinite(n) && n > 0
      ? `Updated lease to ${formatMoney(n)}.`
      : "Updated lease.";
  }
  if (capture.field === "loanAmount") {
    const n = Number(capture.value.split(":")[0].replace(/,/g, ""));
    const label = draft.productIntent === "heloc" ? "HELOC line" : "loan amount";
    return Number.isFinite(n) && n > 0
      ? `Updated ${label} to ${formatMoney(n)}.`
      : `Updated ${label}.`;
  }
  if (capture.field === "propertyValue") {
    const n = Number(capture.value.replace(/,/g, ""));
    const label = isRefiLike(draft) ? "property value" : "purchase price";
    return Number.isFinite(n) && n > 0
      ? `Updated ${label} to ${formatMoney(n)}.`
      : `Updated ${label}.`;
  }
  if (capture.field === "downPayment") {
    const n = Number(capture.value.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0
      ? `Updated down payment to ${formatMoney(n)}.`
      : "Updated down payment.";
  }
  if (capture.field === "propose-funds") {
    const proposal = draft.pendingProposal;
    return proposal ? proposalAskCopy(proposal) : "Use this down payment and loan amount?";
  }
  if (capture.field === "accept-proposal") {
    return draft.pendingProposal?.kind === "public"
      ? "Updated from the suggestion."
      : "Updated from the proposed amount.";
  }
  if (capture.field === "decline-proposal") {
    return draft.pendingProposal?.kind === "public" ? "Kept the file value." : "Left that line blank.";
  }
  if (capture.field === "amountPurpose") {
    return `Updated to ${capture.value}.`;
  }
  if (capture.field === "skip-credit") return "Updated. Stated credit left blank.";
  if (capture.field === "creditRange") {
    const label = statedCreditLabel(capture.value) || capture.value;
    return `Updated stated credit to ${label}.`;
  }
  if (capture.field === "termYears") {
    return `Updated term to ${capture.value} year.`;
  }
  if (capture.field === "skip-amount") {
    const label = draft.productIntent === "heloc" ? "HELOC line" : "Loan amount";
    return `Updated. ${label} left blank.`;
  }
  if (capture.field === "skip-value") {
    const label = isRefiLike(draft) ? "Property value" : "Purchase price";
    return `Updated. ${label} left blank.`;
  }
  if (capture.field === "skip-term") return "Updated. Term left blank.";
  if (capture.field === "incomeType") {
    const label = INCOME_BUBBLES.find((item) => item.value === capture.value)?.label;
    return label ? `Updated income to ${label}.` : "Updated income.";
  }
  if (capture.field === "skip-monthly-debts") return "Updated. Monthly debts left blank.";
  if (capture.field === "propose-monthly-debts" || capture.field === "include-mortgage-debts") {
    return "Updated.";
  }
  if (capture.field === "subtract-mortgage") return "Updated.";
  if (capture.field === "statedMonthlyDebts") {
    const n = Number(capture.value.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0
      ? `Updated monthly debts to ${formatMoney(n)}.`
      : "Updated monthly debts.";
  }
  if (capture.field === "skip-available-assets") return "Updated. Stated available assets left blank.";
  if (capture.field === "propose-available-assets") return "Updated.";
  if (capture.field === "skip-property-type") return "Updated. Property type left blank.";
  if (capture.field === "propose-property-type") return "Updated.";
  if (capture.field === "propertyType") {
    const value = parsePropertyType(capture.value);
    return value ? `Updated property type to ${propertyTypeLabel(value)}.` : "Updated property type.";
  }
  if (capture.field === "propose-rental-lease") return "Updated.";
  if (capture.field === "propose-subject-address") return "Updated.";
  if (capture.field === "subjectAddress") {
    return capture.value.trim()
      ? `Updated property address to ${capture.value.trim()}.`
      : "Updated property address.";
  }
  if (capture.field === "skip-time-on-job") return "Updated. Time on job left blank.";
  if (capture.field === "propose-time-on-job") return "Updated.";
  if (capture.field === "statedTimeOnJob") {
    const months = parseTimeOnJobMonths(capture.value) ?? Number(capture.value);
    const label = timeOnJobLabelFromSpoken(capture.value, Number.isFinite(months) ? months : 0);
    return label ? `Updated time on job to ${label}.` : "Updated time on job.";
  }
  if (capture.field === "skip-current-housing") return "Updated. Current housing left blank.";
  if (capture.field === "propose-current-housing") return "Updated.";
  if (capture.field === "statedCurrentHousing") {
    const n = Number(capture.value.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0
      ? `Updated current housing to ${formatMoney(n)}.`
      : "Updated current housing.";
  }
  if (capture.field === "skip-declarations") return "Updated. Declarations left blank.";
  if (capture.field === "propose-declarations") return "Updated.";
  if (capture.field === "statedDeclaration") {
    return isStatedDeclaration(capture.value)
      ? `Updated declarations to ${declarationsLabel(capture.value)}.`
      : "Updated declarations.";
  }
  if (capture.field === "skip-declaration-timing") return "Updated. Event timing left blank.";
  if (capture.field === "declarationTiming") {
    return capture.value.trim()
      ? `Updated event timing to ${capture.value.trim()}.`
      : "Updated event timing.";
  }
  if (capture.field === "skip-household") return "Updated. Household left blank.";
  if (capture.field === "propose-household") return "Updated.";
  if (capture.field === "statedHousehold") {
    return isStatedHousehold(capture.value)
      ? `Updated household to ${householdLabel(capture.value)}.`
      : "Updated household.";
  }
  if (capture.field === "skip-coborrower-name") return "Updated. Borrower 2 left blank.";
  if (capture.field === "propose-coborrower-name") return "Updated.";
  if (capture.field === "coborrowerName") {
    return capture.value.trim()
      ? `Updated Borrower 2 to ${capture.value.trim()}.`
      : "Updated Borrower 2.";
  }
  if (capture.field === "skip-borrower-name") return "Updated. Borrower left blank.";
  if (capture.field === "propose-borrower-name") return "Updated.";
  if (capture.field === "borrowerName") {
    return capture.value.trim()
      ? `Updated borrower to ${capture.value.trim()}.`
      : "Updated borrower.";
  }
  if (capture.field === "skip-other-reo") return "Updated. Other real estate left blank.";
  if (capture.field === "propose-other-reo") return "Updated.";
  if (capture.field === "skip-citizenship") return "Updated. Citizenship left blank.";
  if (capture.field === "citizenship") {
    return isFileCitizenshipValue(capture.value)
      ? `Updated citizenship to ${citizenshipLabel(capture.value)}.`
      : "Updated citizenship.";
  }
  if (capture.field === "skip-former-history") return "Updated. Prior history left blank.";
  if (capture.field === "formerHistory") {
    return capture.value.trim()
      ? `Updated prior history to ${capture.value.trim()}.`
      : "Updated prior history.";
  }
  if (capture.field === "statedOtherReo") {
    return isStatedOtherReo(capture.value)
      ? `Updated other real estate to ${otherReoLabel(capture.value)}.`
      : "Updated other real estate.";
  }
  if (capture.field === "statedAvailableAssets") {
    const n = Number(capture.value.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0
      ? `Updated stated available assets to ${formatMoney(n)}.`
      : "Updated stated available assets.";
  }
  if (capture.field === "skip-docs") return "Updated. Docs skipped.";
  if (capture.field === "hold-docs") return "Updated. Docs paused.";
  if (capture.field === "skip-down") return "Updated. Down payment left blank.";
  if (capture.field === "keep-file-fact") return "Kept the file value.";
  if (capture.field === "use-document-fact") return "I’ll use that number.";
  if (capture.field === "keep-both-facts") {
    return KEEP_BOTH_LINE;
  }
  return "Updated the file.";
}

export function parseWorkspaceEdit(
  text: string,
  draft?: FoxIntakeDraft,
): {
  capture?: Capture;
  correct?: FoxPrompt;
  line?: string;
  confirm: string;
} | null {
  const q = text.trim();
  const lower = q.toLowerCase();
  const namedField =
    /\boccupan|\b(credit|fico|income|timeline|product|purchase price|\bprice\b|down(\s+payment)?|loan amount|years? in business|path|property type|condo|house|sfr|time on job|current housing|declarations?|household|borrower|\bname\b|other real estate|other property|\breo\b)\b/.test(
      lower,
    );
  const spokenFix =
    /\b(change|edit|update|set|switch|actually|should be|make it|correction)\b/.test(lower) ||
    (namedField && /\b(is|to|as|=)\b/.test(lower));
  if (!spokenFix) return parseRefiDocumentsBareValue(q, draft);
  if (/^(needs a correction|looks right)$/i.test(lower) || wantsCorrectionMenu(q)) return null;
  if (looksLikeQuestion(q) && !/\b(change|edit|update|set|switch|actually)\b/.test(lower)) {
    return null;
  }

  const wantsPath = /\b(path|relationship|acr|loan only|loan-only)\b/.test(lower);
  if (wantsPath && !/\b(amount|value|occupan|timeline|credit|fico|term|product|buy|refi)\b/.test(lower)) {
    return { correct: "path-switch", confirm: "Tap Path on the structure to switch." };
  }

  if (/\b(product|buy|refinance|refi|heloc|jumbo|other)\b/.test(lower) && /\b(change|edit|update|set|switch)\b/.test(lower)) {
    const intent = productIntentFromText(q);
    if (intent) {
      return {
        capture: { field: "productIntent", value: intent },
        confirm: `Updated product to ${productIntentLabel(intent)}.`,
      };
    }
    if (/\bproduct\b/.test(lower)) {
      return { correct: "product", confirm: "Which product should I use?" };
    }
  }

  if (/\b(property type|condo|fourplex|duplex|single[-\s]?family|\bsfr\b)\b/.test(lower) && !/\boccupan/.test(lower)) {
    const match = parsePropertyType(q);
    if (match) {
      return {
        capture: { field: "propertyType", value: match },
        confirm: `Updated property type to ${propertyTypeLabel(match)}.`,
      };
    }
    if (/\bproperty type\b/.test(lower)) {
      return { correct: "property-type", confirm: PROPERTY_TYPE_ASK };
    }
  }

  if (/\btime on job\b/.test(lower)) {
    const months = parseTimeOnJobMonths(q);
    if (months != null) {
      const label = timeOnJobLabelFromSpoken(q, months);
      return {
        capture: { field: "statedTimeOnJob", value: q.trim() },
        confirm: `Updated time on job to ${label}.`,
      };
    }
    return { correct: "time-on-job", confirm: TIME_ON_JOB_ASK };
  }

  if (/\bcurrent housing\b/.test(lower)) {
    const amount = parseCurrentHousingAmount(q);
    if (amount != null) {
      return {
        capture: { field: "statedCurrentHousing", value: String(amount) },
        confirm: `Updated current housing to $${amount.toLocaleString("en-US")}.`,
      };
    }
    return { correct: "current-housing", confirm: CURRENT_HOUSING_ASK };
  }

  if (/\bdeclarations?\b/.test(lower)) {
    const value = parseDeclarations(q, { allowBareYes: true });
    if (value) {
      return {
        capture: { field: "statedDeclaration", value },
        confirm: `Updated declarations to ${declarationsLabel(value)}.`,
      };
    }
    return { correct: "declarations", confirm: DECLARATIONS_ASK };
  }

  if (/\bhousehold\b/.test(lower)) {
    const value = parseHousehold(q);
    if (value) {
      return {
        capture: { field: "statedHousehold", value },
        confirm: `Updated household to ${householdLabel(value)}.`,
      };
    }
    return { correct: "household", confirm: HOUSEHOLD_ASK };
  }

  if (/\b(borrower|\bname\b)\b/.test(lower)) {
    const name = parseBorrowerName(q);
    if (name) {
      return {
        capture: { field: "borrowerName", value: name },
        confirm: `Updated borrower to ${name}.`,
      };
    }
    return { correct: "borrower-name", confirm: BORROWER_NAME_ASK };
  }

  if (/\b(other real estate|other property|\breo\b)\b/.test(lower)) {
    const value = parseOtherReo(q, { allowBare: true });
    if (value) {
      return {
        capture: { field: "statedOtherReo", value },
        confirm: `Updated other real estate to ${otherReoLabel(value)}.`,
      };
    }
    return { correct: "other-reo", confirm: OTHER_REO_ASK };
  }

  if (/\boccupan/.test(lower)) {
    const match = occupancyFromText(q);
    if (match) {
      return {
        capture: { field: "occupancy", value: match.value },
        confirm: `Updated occupancy to ${occupancySpokenLabel(match.value)}.`,
      };
    }
    return { correct: "occupancy", confirm: "How will the property be used?" };
  }

  if (/\b(timeline|ready now|exploring|30)/.test(lower) && /\b(change|edit|update|set|timeline)\b/.test(lower)) {
    const match = timelineFromText(q);
    if (match) {
      return {
        capture: { field: "timeline", value: match.value },
        confirm: `Updated timeline to ${match.label}.`,
      };
    }
    if (/\btimeline\b/.test(lower)) {
      return { correct: "timeline", confirm: "What’s the timeline?" };
    }
  }

  if (/\b(fico|credit)\b/.test(lower)) {
    const range = parseCreditRange(q);
    if (range) {
      const label = statedCreditLabel(range) || range;
      return {
        capture: { field: "creditRange", value: range },
        confirm: `Updated stated credit to ${label}.`,
      };
    }
    return { correct: "credit", confirm: CREDIT_RANGE_ASK };
  }

  if (/\bterm\b/.test(lower)) {
    const term = parseTermYears(q);
    if (term === "skip") {
      return { capture: { field: "skip-term" }, confirm: "Updated. Term left blank." };
    }
    if (term != null) {
      return { capture: { field: "termYears", value: String(term) }, confirm: `Updated term to ${term} year.` };
    }
    return { correct: "term", confirm: "Any term in mind?" };
  }

  if (/\bdown(\s+payment)?\b/.test(lower)) {
    if (isUnknownAmount(q)) {
      return { capture: { field: "skip-down" }, confirm: "Updated. Down payment left blank." };
    }
    const amount = parseLooseAmount(q);
    if (amount != null) {
      return {
        capture: { field: "downPayment", value: String(amount) },
        confirm: `Updated down payment to ${formatMoney(amount)}.`,
      };
    }
    return { correct: "amount", line: "down", confirm: "What’s the down payment?" };
  }

  if (
    /\bpurchase price\b/.test(lower) ||
    (/\bprice\b/.test(lower) && !/\b(loan|heloc|line)\b/.test(lower) && (!draft || isPurchaseLike(draft)))
  ) {
    if (isUnknownAmount(q)) {
      return { capture: { field: "skip-value" }, confirm: "Updated. Purchase price left blank." };
    }
    const amount = parseLooseAmount(q);
    if (amount != null) {
      return {
        capture: { field: "propertyValue", value: String(amount) },
        confirm: `Updated purchase price to ${formatMoney(amount)}.`,
      };
    }
    return { correct: "value", confirm: "What’s the purchase price?" };
  }

  if (/\b(property value|home value|house value|worth)\b/.test(lower) || (/\bvalue\b/.test(lower) && !/\bloan\b/.test(lower) && !/\bpurchase price\b/.test(lower))) {
    if (isUnknownAmount(q)) {
      return { capture: { field: "skip-value" }, confirm: "Updated. Property value left blank." };
    }
    const amount = parseAmountPair(q).value ?? parseLooseAmount(q);
    if (amount != null) {
      return {
        capture: { field: "propertyValue", value: String(amount) },
        confirm: `Updated property value to ${formatMoney(amount)}.`,
      };
    }
    return { correct: "value", confirm: "What’s the purchase price?" };
  }

  if (/\b(years? in business|been in business|running this)\b/.test(lower)) {
    const years = parseYearsInBusiness(q);
    if (years) {
      return {
        capture: { field: "yearsInBusiness", value: years },
        confirm: `Updated years in business to ${years}.`,
      };
    }
    return { correct: "years-in-business", confirm: YEARS_IN_BUSINESS_ASK };
  }

  if (/\b(loan amount|heloc line|loan|line|cash|payoff)\b/.test(lower) && !/\bpurchase price\b/.test(lower)) {
    if (isUnknownAmount(q)) {
      return { capture: { field: "skip-amount" }, confirm: "Updated. Loan amount left blank." };
    }
    const amount = parseAmountPair(q).loan ?? parseLooseAmount(q);
    if (amount != null) {
      return {
        capture: { field: "loanAmount", value: String(amount) },
        confirm: `Updated loan amount to ${formatMoney(amount)}.`,
      };
    }
    return { correct: "amount", line: "loan", confirm: "What’s the loan amount?" };
  }

  if (/\bincome\b/.test(lower)) {
    const match = incomeFromText(q);
    if (match) {
      return {
        capture: { field: "incomeType", value: match.value },
        confirm: `Updated income to ${match.label}.`,
      };
    }
    return { correct: "income", confirm: "How is income earned?" };
  }

  if (/\bdoc/.test(lower)) {
    return { correct: "documents", confirm: "Government ID, latest paystub, and W-2." };
  }

  if (draft && /\bactually\b/.test(lower)) {
    const amount = parseLooseAmount(q);
    if (amount != null && (isPurchaseLike(draft) || isRefiLike(draft))) {
      if (/\bdown\b/.test(lower)) {
        return {
          capture: { field: "downPayment", value: String(amount) },
          confirm: `Updated down payment to ${formatMoney(amount)}.`,
        };
      }
      if (/\bloan\b/.test(lower)) {
        return {
          capture: { field: "loanAmount", value: String(amount) },
          confirm: `Updated loan amount to ${formatMoney(amount)}.`,
        };
      }
      return {
        capture: { field: "propertyValue", value: String(amount) },
        confirm: isPurchaseLike(draft)
          ? `Updated purchase price to ${formatMoney(amount)}.`
          : `Updated property value to ${formatMoney(amount)}.`,
      };
    }
  }

  return parseRefiDocumentsBareValue(q, draft);
}

function parseRefiDocumentsBareValue(
  text: string,
  draft?: FoxIntakeDraft,
): {
  capture?: Capture;
  correct?: FoxPrompt;
  line?: string;
  confirm: string;
} | null {
  if (!draft || !isRefiLike(draft)) return null;
  if (draft.pendingProposal || draft.pendingConflict) return null;
  if (workspacePrompt(draft) !== "documents") return null;
  if (!/^[\s$0-9,kKmM.]+$/.test(text.trim())) return null;
  const amount = parseLooseAmount(text);
  if (amount == null || amount < 1000) return null;
  return {
    capture: { field: "propertyValue", value: String(amount) },
    confirm: `Updated property value to ${formatMoney(amount)}.`,
  };
}

/** Snapshot the live step, then reopen only the edited field. */
export function beginFileEdit(draft: FoxIntakeDraft, field: FoxPrompt): FoxIntakeDraft {
  const prior =
    draft.resumeAfterEdit ??
    workspacePrompt({
      ...draft,
      correcting: null,
      correctingLine: undefined,
      resumeAfterEdit: undefined,
    });
  return {
    ...draft,
    correcting: field,
    resumeAfterEdit: prior !== field ? prior : draft.resumeAfterEdit,
  };
}

/** Clear the resume pointer only when the borrower continues that prior step. */
export function settleResumeAfterCapture(
  before: FoxIntakeDraft,
  capture: Capture,
  next: FoxIntakeDraft,
): FoxIntakeDraft {
  if (capture.field === "correct" || !next.resumeAfterEdit) return next;
  if (capture.field === "confirm-draft") {
    return { ...next, resumeAfterEdit: undefined };
  }
  const acted = editPromptFromCapture(capture);
  if (acted === next.resumeAfterEdit && before.correcting !== acted) {
    return { ...next, resumeAfterEdit: undefined };
  }
  return next;
}

function draftAfterCapture(draft: FoxIntakeDraft, capture: Capture): FoxIntakeDraft {
  return settleResumeAfterCapture(draft, capture, draftAfterCaptureBody(draft, capture));
}

function draftAfterCaptureBody(draft: FoxIntakeDraft, capture: Capture): FoxIntakeDraft {
  const next = { ...draft, correcting: null, correctingLine: null };
  if (capture.field === "path") return { ...next, path: capture.value };
  if (capture.field === "keep-line") return next;
  if (capture.field === "productIntent") return applyProductChange(next, capture.value);
  if (capture.field === "starter") {
    const price = capture.price ? Number(capture.price) : null;
    return applyStarterSketch(next, capture.value, price);
  }
  if (capture.field === "jumboPurpose") {
    return { ...next, jumboPurpose: capture.value };
  }
  if (capture.field === "accept-jumbo") {
    const purpose: JumboPurpose =
      draft.productIntent === "refinance" || jumboPurposeOf(draft) === "refinance"
        ? "refinance"
        : "buy";
    return applyProductChange(
      { ...next, jumboPurpose: purpose, jumboOffered: true, pendingOffer: undefined },
      "jumbo",
    );
  }
  if (capture.field === "decline-jumbo") {
    return { ...next, jumboOffered: true, pendingOffer: undefined };
  }
  if (capture.field === "accept-heloc") {
    return applyProductChange(
      { ...next, helocOffered: true, pendingOffer: undefined },
      "heloc",
    );
  }
  if (capture.field === "decline-heloc") {
    return { ...next, helocOffered: true, pendingOffer: undefined };
  }
  if (capture.field === "pending-offer") {
    return { ...next, pendingOffer: capture.value };
  }
  if (capture.field === "out-of-state") return { ...next, outOfState: true };
  if (capture.field === "in-state") return { ...next, outOfState: false };
  if (capture.field === "govProgram") return { ...next, govProgram: capture.value };
  if (capture.field === "creditEvent") return { ...next, creditEvent: capture.value };
  if (capture.field === "skip-declarations") return skipDeclarations(next);
  if (capture.field === "propose-declarations" && isStatedDeclaration(capture.value)) {
    return proposeStatedDeclaration(next, capture.value);
  }
  if (capture.field === "statedDeclaration" && isStatedDeclaration(capture.value)) {
    return writeStatedDeclaration(next, capture.value);
  }
  if (capture.field === "skip-declaration-timing") return skipDeclarationTiming(next);
  if (capture.field === "declarationTiming") {
    const timing = parseDeclarationTiming(capture.value) ?? capture.value.trim();
    return timing ? writeDeclarationTiming(next, timing) : next;
  }
  if (capture.field === "skip-household") return skipHousehold(next);
  if (capture.field === "propose-household" && isStatedHousehold(capture.value)) {
    return proposeStatedHousehold(next, capture.value);
  }
  if (capture.field === "statedHousehold" && isStatedHousehold(capture.value)) {
    return writeStatedHousehold(next, capture.value);
  }
  if (capture.field === "skip-coborrower-name") return skipCoborrowerName(next);
  if (capture.field === "propose-coborrower-name") {
    const name = parseCoborrowerName(capture.value) ?? capture.value.trim();
    return name ? proposeCoborrowerName(next, name) : next;
  }
  if (capture.field === "coborrowerName") {
    const name = parseCoborrowerName(capture.value) ?? capture.value.trim();
    return name ? writeCoborrowerName(next, name) : next;
  }
  if (capture.field === "skip-borrower-name") return skipBorrowerName(next);
  if (capture.field === "propose-borrower-name") {
    const name = parseBorrowerName(capture.value) ?? capture.value.trim();
    return name ? proposeBorrowerName(next, name) : next;
  }
  if (capture.field === "borrowerName") {
    const name = parseBorrowerName(capture.value) ?? capture.value.trim();
    return name ? writeBorrowerName(next, name) : next;
  }
  if (capture.field === "skip-citizenship") return skipCitizenship(next);
  if (capture.field === "citizenship" && isFileCitizenshipValue(capture.value)) {
    return writeCitizenship(next, capture.value);
  }
  if (capture.field === "skip-former-history") return skipFormerHistory(next);
  if (capture.field === "formerHistory") return writeFormerHistoryNote(next, capture.value);
  if (capture.field === "skip-other-reo") return skipOtherReo(next);
  if (capture.field === "propose-other-reo" && isStatedOtherReo(capture.value)) {
    return proposeStatedOtherReo(next, capture.value);
  }
  if (capture.field === "statedOtherReo" && isStatedOtherReo(capture.value)) {
    return writeStatedOtherReo(next, capture.value);
  }
  if (capture.field === "cashOut") return { ...next, cashOut: true };
  if (capture.field === "over-price-confirm") {
    return applyEscalateMotion({ ...next, overPriceConfirmed: true });
  }
  if (capture.field === "occupancy") {
    return { ...next, occupancyChoice: { ...draft.occupancyChoice, value: capture.value }, occupancyAsked: true };
  }
  if (capture.field === "timeline") {
    return { ...next, timelineChoice: { ...draft.timelineChoice, value: capture.value }, timelineAsked: true };
  }
  if (capture.field === "skip-timeline") {
    return { ...next, timelineAsked: true };
  }
  if (capture.field === "skip-subject-lease") return skipSubjectLease(next);
  if (capture.field === "statedSubjectLease") {
    const rent = parseSubjectLeaseAmount(capture.value, next.occupancyChoice.value);
    if (rent == null) return { ...next, subjectLeaseAsked: true };
    return (
      proposeTypedLeaseRental({ ...next, subjectLeaseAsked: true }, `lease ${rent} a month`) ?? {
        ...next,
        subjectLeaseAsked: true,
      }
    );
  }
  if (capture.field === "amountPurpose") {
    return { ...next, amountPurposeLabel: capture.value };
  }
  if (capture.field === "loanAmount") {
    const n = Number(capture.value.split(":")[0].replace(/,/g, ""));
    return withComputedCompanion(
      withMatrixAfterAmount({
        ...next,
        amountAsked: true,
        loanAmountValue: Number.isFinite(n) && n > 0 ? n : draft.loanAmountValue,
      }),
      hasDownPayment(draft) ? "loan" : undefined,
    );
  }
  if (capture.field === "propertyValue") {
    const n = Number(capture.value.replace(/,/g, ""));
    const price = Number.isFinite(n) && n > 0 ? n : draft.propertyValueAmount;
    if (price != null && price > 0 && price !== draft.propertyValueAmount) {
      const locked = proposePriceLockedPair(draft, price);
      if (locked) return locked;
    }
    return withComputedCompanion(
      withMatrixAfterAmount({
        ...next,
        valueAsked: true,
        propertyValueAmount: price,
      }),
    );
  }
  if (capture.field === "downPayment") {
    const n = Number(capture.value.replace(/,/g, ""));
    return withComputedCompanion(
      {
        ...next,
        downAsked: true,
        downPaymentAmount: Number.isFinite(n) && n > 0 ? n : draft.downPaymentAmount,
      },
      hasLoanAmount(draft) ? "down" : undefined,
    );
  }
  if (capture.field === "propose-funds") {
    const [downRaw, loanRaw] = capture.value.split(":");
    const down = Number(downRaw);
    const loan = Number(loanRaw);
    if (!Number.isFinite(down) || !Number.isFinite(loan) || down <= 0 || loan <= 0) return next;
    return proposeFundsPair(next, down, loan);
  }
  if (capture.field === "payFrequency") return applyPayFrequencyAnswer(next, capture.value);
  if (capture.field === "accept-proposal") return resolveProposal(next, "accept");
  if (capture.field === "change-proposal") return changePendingProposal(next);
  if (capture.field === "decline-proposal") return resolveProposal(next, "decline");
  if (capture.field === "yearsInBusiness") return writeYearsInBusiness(next, capture.value);
  if (capture.field === "skip-years-in-business") return skipYearsInBusiness(next);
  if (capture.field === "qualifyingIncome") return writeQualifyingIncome(next, capture.value);
  if (capture.field === "skip-down") return { ...next, downAsked: true };
  if (capture.field === "skip-credit") {
    return { ...next, creditBand: undefined, creditAsked: true };
  }
  if (capture.field === "creditRange") {
    return {
      ...next,
      creditBand: capture.value,
      creditAsked: true,
    };
  }
  if (capture.field === "termYears") {
    const n = Number(capture.value);
    return { ...next, termAsked: true, termYears: Number.isFinite(n) && n > 0 ? n : draft.termYears };
  }
  if (capture.field === "skip-amount") return { ...next, amountAsked: true, loanAmountValue: undefined };
  if (capture.field === "skip-value") return { ...next, valueAsked: true, propertyValueAmount: undefined };
  if (capture.field === "skip-term") return { ...next, termAsked: true, termYears: undefined };
  if (capture.field === "incomeType") return withIncomeType(next, capture.value);
  if (capture.field === "skip-docs") return skipCurrentInvite({ ...next, docsHeld: false });
  if (capture.field === "hold-docs") return holdDocuments(next);
  if (capture.field === "start-docs") return { ...next, docsStarted: true, docsHeld: false };
  if (capture.field === "statedMonthlyDebts") {
    const amount = parseMonthlyDebtAmount(capture.value);
    return amount != null ? syncCalculatorDraft(writeStatedMonthlyDebts(next, amount)) : next;
  }
  if (capture.field === "skip-housing") return skipEstimatedHousing(next);
  if (capture.field === "estimatedHousing") {
    const amount = Number(capture.value);
    return Number.isFinite(amount) && amount > 0 ? writeEstimatedHousing(next, amount) : next;
  }
  if (capture.field === "statedAvailableAssets") {
    const amount = parseAvailableAssetsAmount(capture.value);
    return amount != null ? writeStatedAvailableAssets(next, amount) : next;
  }
  if (capture.field === "propertyType") {
    const value = parsePropertyType(capture.value);
    return value ? writePropertyType(next, value) : next;
  }
  if (capture.field === "statedTimeOnJob") {
    const months = parseTimeOnJobMonths(capture.value) ?? Number(capture.value);
    if (!Number.isFinite(months) || months <= 0) return next;
    return writeStatedTimeOnJob(next, months, timeOnJobLabelFromSpoken(capture.value, months));
  }
  if (capture.field === "statedCurrentHousing") {
    const amount = parseCurrentHousingAmount(capture.value);
    return amount != null ? writeStatedCurrentHousing(next, amount) : next;
  }
  if (capture.field === "note") return persistGuidelineNote(next, capture.value);
  return next;
}

function withCurrentPrompt(
  confirm: string,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
} {
  const next = workspacePromptCopy(workspacePrompt({ ...draft, correcting: null }), draft);
  if (next.text === confirm) return next;
  return {
    text: confirm,
    followUp: next.followUp ?? next.text,
    facts: next.facts,
    actions: next.actions,
  };
}

function continueAfterFlag(
  confirm: string,
  nextDraft: FoxIntakeDraft,
  capture: Capture,
  extraActions?: FoxAction[],
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
  capture?: Capture;
} {
  const next = withCurrentPrompt(confirm, nextDraft);
  const actions = [
    ...(next.actions ?? []),
    ...(extraActions ?? []).filter(
      (item) => !(next.actions ?? []).some((existing) => existing.id === item.id),
    ),
  ];
  return {
    ...next,
    actions: actions.length ? actions : next.actions,
    capture,
  };
}

function matrixReply(
  text: string,
  draft: FoxIntakeDraft,
  prompt: FoxPrompt,
): ReturnType<typeof workspaceReply> {
  if (prompt === "credit" || prompt === "declaration-timing") {
    return null;
  }
  const moneyAtAsk =
    (prompt === "assets" && parseAvailableAssetsAmount(text) != null) ||
    (prompt === "debts" && parseMonthlyDebtAmount(text) != null);
  if (namedCalifornia(text) && draft.outOfState && !moneyAtAsk) {
    const nextDraft = { ...draft, outOfState: false };
    return continueAfterFlag(
      "California — I can prepare this file.",
      nextDraft,
      { field: "in-state" },
    );
  }
  if (!moneyAtAsk && namedOutOfState(text)) {
    return {
      text: GEO_STOP_COPY,
      actions: draft.originatorRequested ? undefined : [requestHumanAction()],
      capture: { field: "out-of-state" },
    };
  }

  const gov = namedGovProgram(text);
  if (gov && draft.govProgram !== gov) {
    const nextDraft = { ...draft, govProgram: gov };
    return continueAfterFlag(govProgramCopy(nextDraft, gov), nextDraft, {
      field: "govProgram",
      value: gov,
    }, draft.originatorRequested ? undefined : [requestHumanAction()]);
  }

  const volunteeredEvent = parseDeclarations(text);
  if (
    volunteeredEvent === "event" &&
    !draft.correcting &&
    prompt !== "declarations" &&
    !draft.pendingProposal &&
    !draft.pendingConflict &&
    draft.statedDeclaration !== "event"
  ) {
    const note = volunteeredDeclarationNote(text, "event");
    const nextDraft = writeStatedDeclaration(draft, "event", note);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedDeclaration", value: "event" },
    };
  }

  const volunteeredHousehold = parseHousehold(text);
  if (
    volunteeredHousehold &&
    !draft.correcting &&
    prompt !== "household" &&
    !draft.pendingProposal &&
    !draft.pendingConflict &&
    draft.statedHousehold !== volunteeredHousehold
  ) {
    const nextDraft = writeStatedHousehold(draft, volunteeredHousehold);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedHousehold", value: volunteeredHousehold },
    };
  }

  const volunteeredOtherReo = parseOtherReo(text);
  if (
    volunteeredOtherReo &&
    !draft.correcting &&
    prompt !== "other-reo" &&
    !draft.pendingProposal &&
    !draft.pendingConflict &&
    draft.statedOtherReo !== volunteeredOtherReo
  ) {
    const nextDraft = writeStatedOtherReo(draft, volunteeredOtherReo);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedOtherReo", value: volunteeredOtherReo },
    };
  }

  if (namedCashOut(text) && !draft.cashOut && isRefiLike(draft)) {
    const nextDraft = { ...draft, cashOut: true };
    return continueAfterFlag(cashOutCopy(nextDraft), nextDraft, { field: "cashOut" });
  }

  if (
    prompt === "product" ||
    prompt === "jumbo-purpose" ||
    prompt === "offer-jumbo" ||
    prompt === "offer-heloc" ||
    prompt === "geo-stop" ||
    prompt === "intent"
  ) {
    return null;
  }

  if (draft.productIntent === "refinance" && looksLikePurchase(text)) {
    const nextDraft = applyProductChange(draft, "buy");
    return continueAfterFlag(
      "Updated product to Buy.",
      nextDraft,
      { field: "productIntent", value: "buy" },
    );
  }
  if (
    draft.productIntent === "refinance" &&
    !draft.helocOffered &&
    !draft.pendingOffer &&
    wantsCashKeepFirst(text)
  ) {
    const nextDraft = { ...draft, pendingOffer: "heloc" as const };
    return {
      ...workspacePromptCopy("offer-heloc", nextDraft),
      capture: { field: "pending-offer", value: "heloc" },
    };
  }
  if (draft.productIntent === "heloc" && looksLikePurchase(text)) {
    const nextDraft = applyProductChange(draft, "buy");
    return continueAfterFlag(
      "Updated product to Buy.",
      nextDraft,
      { field: "productIntent", value: "buy" },
    );
  }
  if (draft.productIntent === "heloc" && wantsReplaceFirst(text)) {
    const nextDraft = applyProductChange(draft, "refinance");
    return continueAfterFlag(
      "Updated product to Refinance.",
      nextDraft,
      { field: "productIntent", value: "refinance" },
    );
  }
  return null;
}

function finishLineTakesCalculatorPrompt(
  text: string,
  prompt: FoxPrompt,
  draft: FoxIntakeDraft,
) {
  if (!draft.sampleAccepted) return false;
  const finish = finishCaptureFromText(text);
  const lower = text.trim().toLowerCase();
  if (prompt === "housing") {
    return (
      Boolean(finish) ||
      /^skip\b/.test(lower) ||
      (/(skip|later|don'?t have)/i.test(lower) && /doc/.test(lower))
    );
  }
  if (prompt === "debts") {
    return finish?.field === "proceed" || finish?.field === "upload-more";
  }
  return false;
}

export function workspaceReply(
  text: string,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
  capture?: Capture;
} | null {
  const q = text.trim();
  const lower = q.toLowerCase();
  const prompt = workspacePrompt(draft);

  if (draft.awaitingYearsInBusiness && draft.correcting !== "qualifying") {
    if (isFreeTextAtGate(q)) {
      if (
        looksLikeQuestion(q) &&
        !asksWillIQualify(q) &&
        !asksProceedAftermath(q) &&
        /\b(years?|how long|business|self.?employ|why do you need)\b/i.test(q)
      ) {
        return restoredAsk(
          /(what is acr|what.?s acr|active credit relationship)/i.test(q)
            ? sideQuestionAnswer(q, draft)
            : "How long you’ve been running it helps me read the return. Not a form — just the file.",
          draft,
        );
      }
      return answerThenRestore(q, draft);
    }
    const years = parseYearsInBusiness(q);
    if (years) {
      const nextDraft = writeYearsInBusiness(draft, years);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "yearsInBusiness", value: years },
      };
    }
    if (/^(skip|later|not sure|idk|pass)\b/i.test(lower)) {
      const nextDraft = skipYearsInBusiness(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-years-in-business" },
      };
    }
    return answerThenRestore(q, draft);
  }

  if (
    (prompt === "done" || draft.motion === "in_queue") &&
    shouldAskYearsInBusiness(draft) &&
    parseYearsInBusiness(q)
  ) {
    const years = parseYearsInBusiness(q)!;
    return {
      text: "I’ll keep that on the file.",
      actions: finishLineActions(draft),
      capture: { field: "yearsInBusiness", value: years },
    };
  }

  if (draft.pendingConflict) {
    if (/(keep both|both numbers|keep both numbers)/i.test(lower)) {
      return {
        text: KEEP_BOTH_LINE,
        capture: { field: "keep-both-facts" },
      };
    }
    if (/(keep (the )?file|file value|keep mine|keep the typed)/i.test(lower)) {
      return {
        text: "Kept the file value.",
        capture: { field: "keep-file-fact" },
      };
    }
    if (/(use (the )?document|document value|use (the )?paystub|use (the )?w-?2)/i.test(lower)) {
      return {
        text: "I’ll use that number.",
        capture: { field: "use-document-fact" },
      };
    }
  }

  if (prompt === "pay-frequency" || draft.awaitingPayFrequency) {
    if (isFreeTextAtGate(q)) return answerThenRestore(q, draft);
    if (/\bbi-?weekly\b/i.test(lower)) {
      const nextDraft = applyPayFrequencyAnswer(draft, "biweekly");
      return { ...nextFoxAsk(nextDraft), capture: { field: "payFrequency", value: "biweekly" } };
    }
    if (/\bsemi-?month/i.test(lower)) {
      const nextDraft = applyPayFrequencyAnswer(draft, "semimonthly");
      return { ...nextFoxAsk(nextDraft), capture: { field: "payFrequency", value: "semimonthly" } };
    }
    if (/\bweekly\b/i.test(lower)) {
      const nextDraft = applyPayFrequencyAnswer(draft, "weekly");
      return { ...nextFoxAsk(nextDraft), capture: { field: "payFrequency", value: "weekly" } };
    }
    if (/\bmonth/i.test(lower)) {
      const nextDraft = applyPayFrequencyAnswer(draft, "monthly");
      return { ...nextFoxAsk(nextDraft), capture: { field: "payFrequency", value: "monthly" } };
    }
    return { ...payFrequencyAsk() };
  }

  if (draft.pendingProposal || prompt === "confirm-proposal") {
    if (
      (isQualifyingIncomeConfirmPending(draft) ||
        isStatedDebtsConfirmPending(draft) ||
        isStatedAssetsConfirmPending(draft) ||
        isPropertyTypeConfirmPending(draft) ||
        isSubjectAddressConfirmPending(draft) ||
        isTimeOnJobConfirmPending(draft) ||
        isCurrentHousingConfirmPending(draft) ||
        isDeclarationsConfirmPending(draft) ||
        isHouseholdConfirmPending(draft) ||
        isBorrowerNameConfirmPending(draft) ||
        isOtherReoConfirmPending(draft) ||
        isRentalIncomeConfirmPending(draft)) &&
      asksWillIQualify(q)
    ) {
      return answerThenRestore(q, draft);
    }
    if (
      /^(yes|that.?s me|yes that.?s me|use this|use it|confirm|ok|okay)$/i.test(lower) ||
      /yes that.?s me|use this/.test(lower)
    ) {
      const nextDraft = resolveProposal(draft, "accept");
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "accept-proposal" },
      };
    }
    if (/^change\b/.test(lower)) {
      const nextDraft = changePendingProposal(draft);
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "change-proposal" },
      };
    }
    if (
      /keep (the )?file|leave blank|no|not me|skip/.test(lower)
    ) {
      const nextDraft = resolveProposal(draft, "decline");
      return {
        ...withCurrentPrompt(
          draft.pendingProposal?.kind === "public" ? "Kept the file value." : "Left that line blank.",
          nextDraft,
        ),
        capture: { field: "decline-proposal" },
      };
    }
    if (
      draft.pendingProposal &&
      isPurchaseLike(draft) &&
      hasPropertyValue(draft) &&
      draft.pendingProposal.kind === "computed" &&
      (draft.pendingProposal.field === "downPayment" || draft.pendingProposal.field === "loanAmount") &&
      parseFundsAmount(q, draft.propertyValueAmount)
    ) {
      return replyToFundsAsk(q, { ...draft, pendingProposal: null });
    }
    if (draft.pendingProposal) {
      return answerThenRestore(q, draft);
    }
  }

  if (
    prompt !== "current-housing" &&
    !draft.pendingProposal &&
    !draft.pendingConflict
  ) {
    const leaseDraft = proposeTypedLeaseRental(draft, q);
    if (leaseDraft) {
      const rent = parseStatedMonthlyLease(q, { occupancy: draft.occupancyChoice.value });
      if (leaseDraft.pendingProposal) {
        return {
          ...workspacePromptCopy("confirm-proposal", leaseDraft),
          capture: { field: "propose-rental-lease", value: String(rent ?? "") },
        };
      }
      const thin = rentalThinCopy(leaseDraft.rentalThinReason);
      if (thin) {
        return {
          text: thin,
          capture: { field: "propose-rental-lease", value: String(rent ?? "") },
        };
      }
    }
  }

  if (canOpenCorrectionMenu(draft) && wantsCorrectionMenu(q)) {
    return { ...workspacePromptCopy("correct", draft), capture: { field: "needs-correction" } };
  }

  if (
    isFreeTextAtGate(q) &&
    !wantsCorrectionMenu(q) &&
    !(inQueueEnding(draft) && /what happens next/.test(lower))
  ) {
    return answerThenRestore(q, draft);
  }

  if (layer2Open(draft) && /^skip\b/.test(lower)) {
    return {
      text: inQueueEnding(draft) ? MOTION_COPY.in_queue : layer2AskCopy(draft),
      actions: restoreQueueActions(draft),
      capture: { field: "skip-docs" },
    };
  }

  if (layer2Open(draft) && /^not yet\b/.test(lower)) {
    return {
      text: inQueueEnding(draft) ? MOTION_COPY.in_queue : layer2AskCopy(draft),
      actions: restoreQueueActions(draft),
      capture: { field: "hold-docs" },
    };
  }

  const edit = parseWorkspaceEdit(q, draft);
  if (edit?.capture && draft.path) {
    const nextDraft = draftAfterCapture(draft, edit.capture);
    return {
      ...withCurrentPrompt(edit.confirm, nextDraft),
      capture: edit.capture,
    };
  }
  if (edit && !edit.capture && !edit.correct) {
    return { text: edit.confirm };
  }
  if (edit?.correct && draft.path) {
    return {
      ...workspacePromptCopy(edit.correct, { ...draft, correctingLine: edit.line ?? draft.correctingLine }),
      capture: { field: "correct", value: edit.correct, line: edit.line },
    };
  }

  const matrix = matrixReply(q, draft, prompt);
  if (matrix) return matrix;

  if (/address/i.test(q) && !draft.pendingProposal && !draft.pendingConflict) {
    const volunteeredEarly = parseVolunteeredAddress(q);
    if (volunteeredEarly) {
      const nextDraft = proposeSubjectAddress(draft, volunteeredEarly);
      return {
        ...workspacePromptCopy("confirm-proposal", nextDraft),
        capture: { field: "propose-subject-address", value: volunteeredEarly },
      };
    }
  }

  if (prompt === "over-price" || (needsOverPriceCheck(draft) && !draft.correcting)) {
    if (
      /that['’]?s right|intentional|keep (this|these|the loan)|this is (the loan|right)|keep these numbers/i.test(
        lower,
      )
    ) {
      const nextDraft = applyEscalateMotion({ ...draft, overPriceConfirmed: true });
      return {
        text: answerFromFile("flags.loan_over_price", factsFromDraft(nextDraft)).text,
        actions: finishLineActions(nextDraft),
        capture: { field: "over-price-confirm" },
      };
    }
    if (/purchase price|the price/.test(lower) && !/loan/.test(lower) && !/down/.test(lower)) {
      return {
        ...workspacePromptCopy("value", { ...draft, correcting: "value", correctingLine: "price" }),
        capture: { field: "correct", value: "value", line: "price" },
      };
    }
    if (/down payment|the down/.test(lower) && !/loan/.test(lower)) {
      return {
        ...workspacePromptCopy("amount", { ...draft, correcting: "amount", correctingLine: "down" }),
        capture: { field: "correct", value: "amount", line: "down" },
      };
    }
    if (/loan amount|\bloan\b/.test(lower) && !/purchase price/.test(lower)) {
      return {
        ...workspacePromptCopy("amount", { ...draft, correcting: "amount", correctingLine: "loan" }),
        capture: { field: "correct", value: "amount", line: "loan" },
      };
    }
    const answered = foxAnswer(q, factsFromDraft(draft));
    if (answered) {
      return {
        ...restoredAsk(answered.text, draft),
        actions: loanOverPriceActions(),
      };
    }
    return {
      text: loanOverPriceCopy(draft),
      actions: loanOverPriceActions(),
    };
  }

  if (/(what is acr|what.?s acr|active credit relationship)/i.test(lower)) {
    return {
      ...restoredAsk(
        draft.path === "loan-only"
          ? "ACR is the desk that stays open after close — letter, scout, and reward. This file is still the loan."
          : "ACR is the desk that stays open after close. Letter is originator-issued, not Fox. Scout and reward stay on the desk.",
        draft,
      ),
      capture: { field: "what-acr" },
    };
  }

  if (/(talk to (a )?licensed originator|need (a )?licensed originator|request (a )?human|talk to (an )?originator|speak to (an? )?(lo|originator|human))/i.test(lower)) {
    return {
      text: MOTION_COPY.escalated,
      capture: { field: "talk-originator" },
    };
  }

  if (inQueueEnding(draft) && /what happens next/.test(lower)) {
    return {
      text: MOTION_COPY.whatHappensNext,
      actions: restoreQueueActions(draft),
      capture: { field: "what-happens-next" },
    };
  }

  if (inQueueEnding(draft) && /^ask fox$/.test(lower)) {
    return {
      text: MOTION_COPY.askFox,
      actions: restoreQueueActions(draft),
      capture: { field: "ask-fox" },
    };
  }

  if (prompt === "intent") {
    const path = pathFromHomeChoice(lower);
    if (path) {
      const nextDraft = { ...draft, path };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "path", value: path },
      };
    }
    const intent = productIntentFromText(q);
    if (intent) {
      return {
        ...workspacePromptCopy("intent", { ...draft, productIntent: intent }),
        capture: { field: "productIntent", value: intent },
      };
    }
    return answerThenRestore(q, draft);
  }

  if (prompt === "path-switch") {
    if (/keep|stay|no|cancel/.test(lower) && !/switch/.test(lower)) {
      return {
        ...withCurrentPrompt("Kept this path.", { ...draft, correcting: null }),
        capture: { field: "keep-path" },
      };
    }
    if (draft.path === "acr" && /loan|mortgage/.test(lower)) {
      return {
        ...withCurrentPrompt("Updated path to loan only.", { ...draft, path: "loan-only", correcting: null }),
        capture: { field: "path", value: "loan-only" },
      };
    }
    if (draft.path === "loan-only" && /desk|acr|relationship/.test(lower)) {
      return {
        ...withCurrentPrompt("Updated path to the desk.", { ...draft, path: "acr", correcting: null }),
        capture: { field: "path", value: "acr" },
      };
    }
    return answerThenRestore(q, draft);
  }

  if (prompt === "product") {
    if (draft.productIntent && isKeepThisText(q)) return keepThisReply(draft);
    if (draft.productIntent && /^[\s$0-9,kKmM.]+$/.test(q) && parseLooseAmount(q) != null) {
      const amountDraft = { ...draft, correcting: null, correctingLine: null };
      const nextPrompt = workspacePrompt(amountDraft);
      if (nextPrompt === "value" || nextPrompt === "amount") {
        return workspaceReply(q, amountDraft);
      }
      if (purchasePriceAskNeeded(amountDraft) || draftUsesPurchasePrice(amountDraft)) {
        return workspaceReply(q, { ...amountDraft, correcting: "value" });
      }
      if (refiLoanAskNeeded(amountDraft) || isHelocFile(amountDraft)) {
        return workspaceReply(q, { ...amountDraft, correcting: "amount" });
      }
    }
    const intent = productIntentFromText(q);
    if (!intent) {
      return answerThenRestore(q, draft);
    }
    if (draft.correcting === "product") {
      const nextDraft = applyProductChange({ ...draft, correcting: null, correctingLine: null }, intent);
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "productIntent", value: intent },
      };
    }
    const price = parseLooseAmount(q);
    const nextDraft = applyStarterSketch(draft, intent, price);
    const nextPrompt = workspacePrompt(nextDraft);
    const capture =
      price != null && price > 0
        ? { field: "starter" as const, value: intent, price: String(price) }
        : { field: "productIntent" as const, value: intent };
    return withWorkspaceGuide(
      {
        ...workspacePromptCopy(nextPrompt === "product" ? "occupancy" : nextPrompt, nextDraft),
        capture,
      },
      nextDraft,
    );
  }

  if (prompt === "jumbo-purpose") {
    const purpose = jumboPurposeFromText(q);
    if (!purpose) {
      return answerThenRestore(q, draft);
    }
    const nextDraft = { ...draft, jumboPurpose: purpose, correcting: null };
    return {
      ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
      capture: { field: "jumboPurpose", value: purpose },
    };
  }

  if (prompt === "offer-jumbo") {
    if (/jumbo|switch|use/.test(lower) && !/stay|keep|no/.test(lower)) {
      const purpose: JumboPurpose =
        draft.productIntent === "refinance" || jumboPurposeOf(draft) === "refinance"
          ? "refinance"
          : "buy";
      const nextDraft = applyProductChange(
        { ...draft, jumboPurpose: purpose, jumboOffered: true, pendingOffer: undefined },
        "jumbo",
      );
      return continueAfterFlag("Updated product to Jumbo.", nextDraft, { field: "accept-jumbo" });
    }
    if (/stay|keep|no|decline/.test(lower) || /this product/.test(lower)) {
      const nextDraft = { ...draft, jumboOffered: true, pendingOffer: undefined, correcting: null };
      return continueAfterFlag("Kept this product.", nextDraft, { field: "decline-jumbo" });
    }
    return answerThenRestore(q, draft);
  }

  if (prompt === "offer-heloc") {
    if (/heloc|switch|use/.test(lower) && !/stay|keep|no/.test(lower)) {
      const nextDraft = applyProductChange(
        { ...draft, helocOffered: true, pendingOffer: undefined },
        "heloc",
      );
      return continueAfterFlag("Updated product to HELOC.", nextDraft, { field: "accept-heloc" });
    }
    if (/stay|keep|no|decline|refi/.test(lower)) {
      const nextDraft = { ...draft, helocOffered: true, pendingOffer: undefined, correcting: null };
      return continueAfterFlag("Kept Refinance.", nextDraft, { field: "decline-heloc" });
    }
    return answerThenRestore(q, draft);
  }

  if (prompt === "geo-stop") {
    if (namedCalifornia(q)) {
      const nextDraft = { ...draft, outOfState: false };
      return continueAfterFlag(
        "California — I can prepare this file.",
        nextDraft,
        { field: "in-state" },
      );
    }
    if (/(talk to (a )?licensed originator|request (a )?human|speak to)/i.test(lower)) {
      return {
        text: MOTION_COPY.escalated,
        capture: { field: "talk-originator" },
      };
    }
    return answerThenRestore(q, draft);
  }

  if (prompt === "occupancy") {
    if (draft.occupancyChoice.value && isKeepThisText(q)) return keepThisReply(draft);
    const match = occupancyFromText(q);
    if (!match) return answerThenRestore(q, draft);
    const nextDraft = {
      ...draft,
      occupancyChoice: { ...draft.occupancyChoice, value: match.value },
      occupancyAsked: true,
      correcting: null,
      correctingLine: null,
    };
    if (draft.correcting === "occupancy") {
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "occupancy", value: match.value },
      };
    }
    const nextAsk = workspacePrompt({ ...nextDraft, correcting: null });
    const askPrompt =
      nextAsk === "occupancy" || nextAsk === "product"
        ? purchasePriceAskNeeded(nextDraft) || propertyValueAskNeeded(nextDraft) || draftUsesPurchasePrice(nextDraft)
          ? "value"
          : "amount"
        : nextAsk;
    return withWorkspaceGuide(
      {
        ...workspacePromptCopy(askPrompt, { ...nextDraft, correcting: null }),
        capture: { field: "occupancy", value: match.value },
      },
      nextDraft,
    );
  }

  if (prompt === "timeline") {
    if (draft.timelineChoice.value && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipCreditText(q)) {
      const nextDraft = { ...draft, timelineAsked: true, correcting: null, correctingLine: null };
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "skip-timeline" },
      };
    }
    const match = timelineFromText(q);
    if (!match) return answerThenRestore(q, draft);
    const nextDraft = {
      ...draft,
      timelineChoice: { ...draft.timelineChoice, value: match.value },
      timelineAsked: true,
      correcting: null,
      correctingLine: null,
    };
    if (draft.correcting === "timeline") {
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "timeline", value: match.value },
      };
    }
    const nextAsk = workspacePrompt(nextDraft);
    return withWorkspaceGuide(
      {
        ...workspacePromptCopy(nextAsk, nextDraft),
        capture: { field: "timeline", value: match.value },
      },
      nextDraft,
    );
  }

  if (prompt === "subject-lease") {
    if (isSkipSubjectLeaseText(q)) {
      const nextDraft = skipSubjectLease(draft);
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "skip-subject-lease" },
      };
    }
    const rent = parseSubjectLeaseAmount(q, draft.occupancyChoice.value);
    if (rent == null) return answerThenRestore(q, draft);
    const proposed = proposeTypedLeaseRental({ ...draft, subjectLeaseAsked: true }, `lease ${rent} a month`);
    const nextDraft = proposed ?? { ...draft, subjectLeaseAsked: true };
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedSubjectLease", value: String(rent) },
    };
  }

  if (prompt === "amount") {
    if (
      editingConfirmedDown(draft) &&
      /^(keep( this)?|still right|yes|ok|okay|never mind|back)$/i.test(lower)
    ) {
      const nextDraft = { ...draft, correcting: null, correctingLine: null };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "keep-line" },
      };
    }
    const editingFunds = draft.correctingLine === "down" || draft.correctingLine === "loan";
    const purchaseFunds =
      isPurchaseLike(draft) &&
      hasPropertyValue(draft) &&
      (fundsAskNeeded(draft) || editingFunds || draft.correcting === "amount");
    if (purchaseFunds) {
      return replyToFundsAsk(q, draft);
    }
    if (draft.productIntent === "other" && !draft.amountPurposeLabel) {
      if (isUnknownAmount(q)) {
        const nextDraft = { ...draft, amountAsked: true };
        return {
          ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
          capture: { field: "skip-amount" },
        };
      }
      const purpose = parseAmountPurpose(q);
      if (!purpose) {
        return answerThenRestore(q, draft);
      }
      const purposeDraft = { ...draft, amountPurposeLabel: purpose };
      return {
        ...workspacePromptCopy("amount", purposeDraft),
        capture: { field: "amountPurpose", value: purpose },
      };
    }
    if (isUnknownAmount(q)) {
      if (refiLoanAskNeeded(draft) || (isHelocFile(draft) && !hasHelocLine(draft))) {
        return { text: `${amountAskText(draft)} A number works.` };
      }
      const nextDraft = { ...draft, amountAsked: true };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-amount" },
      };
    }
    const pair = parseAmountPair(q);
    const amount = pair.loan ?? parseLooseAmount(q);
    if (amount == null) {
      return answerThenRestore(q, draft);
    }
    let nextDraft = withMatrixAfterAmount({
      ...draft,
      loanAmountValue: amount,
      amountAsked: true,
    });
    if (pair.value && pair.value !== amount) {
      nextDraft.propertyValueAmount = pair.value;
      nextDraft.valueAsked = true;
    }
    if (
      draft.productIntent === "refinance" &&
      !draft.helocOffered &&
      !nextDraft.pendingOffer &&
      wantsCashKeepFirst(q)
    ) {
      nextDraft = { ...nextDraft, pendingOffer: "heloc" };
    }
    const next = workspacePromptCopy(workspacePrompt(nextDraft), nextDraft);
    return withWorkspaceGuide(
      {
        ...next,
        capture: {
          field: "loanAmount",
          value: pair.value && pair.value !== amount ? `${amount}:${pair.value}` : String(amount),
        },
      },
      nextDraft,
    );
  }

  if (prompt === "value") {
    const requiredValue = purchasePriceAskNeeded(draft) || propertyValueAskNeeded(draft);
    if (hasPropertyValue(draft) && isKeepThisText(q)) return keepThisReply(draft);
    if (isUnknownAmount(q)) {
      if (requiredValue) {
        return { text: `${amountAskText(draft)} A number works.` };
      }
      const nextDraft = { ...draft, valueAsked: true };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-value" },
      };
    }
    const amount = parseAmountPair(q).value ?? parseLooseAmount(q);
    if (amount == null) {
      return answerThenRestore(q, draft);
    }
    const lockedPair = proposePriceLockedPair(draft, amount);
    if (lockedPair) {
      return {
        ...workspacePromptCopy("confirm-proposal", lockedPair),
        capture: { field: "propertyValue", value: String(amount) },
      };
    }
    const nextDraft = withComputedCompanion(
      withMatrixAfterAmount({
        ...draft,
        propertyValueAmount: amount,
        valueAsked: true,
        correcting: null,
        correctingLine: null,
      }),
    );
    const next = workspacePromptCopy(workspacePrompt(nextDraft), nextDraft);
    return withWorkspaceGuide(
      {
        ...next,
        capture: { field: "propertyValue", value: String(amount) },
      },
      nextDraft,
    );
  }

  if (prompt === "credit") {
    if (draft.creditBand && isKeepThisText(q)) return keepThisReply(draft);
    if (looksLikeQuestion(q)) {
      return answerThenRestore(q, draft);
    }
    if (isSkipCreditText(q)) {
      const nextDraft = { ...draft, creditBand: undefined, creditAsked: true, correcting: null, correctingLine: null };
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "skip-credit" },
      };
    }
    const range = parseCreditRange(q);
    if (!range) return answerThenRestore(q, draft);
    const nextDraft = { ...draft, creditBand: range, creditAsked: true, correcting: null, correctingLine: null };
    if (draft.correcting === "credit") {
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "creditRange", value: range },
      };
    }
    const next = workspacePromptCopy(workspacePrompt(nextDraft), nextDraft);
    return withWorkspaceGuide(
      {
        ...next,
        capture: { field: "creditRange", value: range },
      },
      nextDraft,
    );
  }

  if (prompt === "term") {
    const term = parseTermYears(q);
    if (term == null) return answerThenRestore(q, draft);
    const nextDraft =
      term === "skip"
        ? { ...draft, termAsked: true, termYears: undefined }
        : { ...draft, termAsked: true, termYears: term };
    return {
      ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
      capture:
        term === "skip" ? { field: "skip-term" } : { field: "termYears", value: String(term) },
    };
  }

  if (prompt === "housing" && !finishLineTakesCalculatorPrompt(q, prompt, draft)) {
    const estimate = draftHousingEstimate(draft);
    if (isSkipMonthlyDebtsText(q) || /^change\b/i.test(q.trim())) {
      const nextDraft = skipEstimatedHousing(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-housing" },
      };
    }
    if (/^use this\b/i.test(q.trim()) && estimate) {
      const nextDraft = writeEstimatedHousing(draft, estimate.estimatedHousing);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "estimatedHousing", value: String(estimate.estimatedHousing) },
      };
    }
    return answerThenRestore(q, draft);
  }

  if (prompt === "debts" && !finishLineTakesCalculatorPrompt(q, prompt, draft)) {
    if (draft.statedMonthlyDebts != null && isKeepThisText(q)) return keepThisReply(draft);
    if (draft.pendingDebtMortgage) {
      if (/^subtract\b/i.test(lower) || /subtract/.test(lower)) {
        const nextDraft = applyMortgageSubtract(draft);
        return {
          ...nextFoxAsk(nextDraft),
          capture: { field: "subtract-mortgage" },
        };
      }
      if (isSkipMonthlyDebtsText(q) || /leave blank/.test(lower)) {
        const nextDraft = skipMonthlyDebts(draft);
        return {
          ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
          capture: { field: "skip-monthly-debts" },
        };
      }
    }
    if (isSkipMonthlyDebtsText(q)) {
      const nextDraft = skipMonthlyDebts(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-monthly-debts" },
      };
    }
    const amount = parseMonthlyDebtAmount(q);
    if (amount == null) return answerThenRestore(q, draft);
    if (mentionsSubjectMortgage(q) && !draft.debtMortgageAsked) {
      const mortgage = subjectMortgagePayment(draft);
      if (mortgage != null) {
        const nextDraft = {
          ...draft,
          debtMortgageAsked: true,
          pendingDebtMortgage: { included: amount, mortgage },
        };
        return {
          text: mortgageSubtractAsk(amount, mortgage),
          actions: mortgageSubtractActions(),
          capture: { field: "include-mortgage-debts", value: String(amount) },
        };
      }
      const nextDraft = { ...draft, debtMortgageAsked: true, pendingDebtMortgage: null };
      return {
        text: mortgageIncludedAskWithoutPayment(),
        actions: monthlyDebtsAskCopy(nextDraft).actions,
        capture: { field: "include-mortgage-debts", value: String(amount) },
      };
    }
    const nextDraft = syncCalculatorDraft(writeStatedMonthlyDebts(draft, amount));
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedMonthlyDebts", value: String(amount) },
    };
  }

  if (prompt === "assets") {
    if (draft.statedAvailableAssets != null && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipAvailableAssetsText(q)) {
      const nextDraft = skipAvailableAssets(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-available-assets" },
      };
    }
    const amount = parseAvailableAssetsAmount(q);
    if (amount == null) return answerThenRestore(q, draft);
    const nextDraft = writeStatedAvailableAssets(draft, amount);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedAvailableAssets", value: String(amount) },
    };
  }

  if (prompt === "property-type") {
    if (draft.propertyType && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipPropertyTypeText(q)) {
      const nextDraft = skipPropertyType(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-property-type" },
      };
    }
    const volunteeredAtType = parseVolunteeredAddress(q);
    if (volunteeredAtType && /address/i.test(q)) {
      const nextDraft = proposeSubjectAddress(draft, volunteeredAtType);
      return {
        ...workspacePromptCopy("confirm-proposal", nextDraft),
        capture: { field: "propose-subject-address", value: volunteeredAtType },
      };
    }
    const value = parsePropertyType(q);
    if (!value) return answerThenRestore(q, draft);
    const nextDraft = writePropertyType(draft, value);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "propertyType", value },
    };
  }

  if (prompt === "time-on-job") {
    if (draft.statedTimeOnJob != null && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipTimeOnJobText(q)) {
      const nextDraft = skipTimeOnJob(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-time-on-job" },
      };
    }
    const volunteeredAtJob = parseVolunteeredAddress(q);
    if (volunteeredAtJob && /address/i.test(q)) {
      const nextDraft = proposeSubjectAddress(draft, volunteeredAtJob);
      return {
        ...workspacePromptCopy("confirm-proposal", nextDraft),
        capture: { field: "propose-subject-address", value: volunteeredAtJob },
      };
    }
    const months = parseTimeOnJobMonths(q);
    if (months == null) return answerThenRestore(q, draft);
    const label = timeOnJobLabelFromSpoken(q, months);
    const nextDraft = writeStatedTimeOnJob(draft, months, label);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedTimeOnJob", value: q.trim() },
    };
  }

  if (prompt === "current-housing") {
    if (draft.statedCurrentHousing != null && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipCurrentHousingText(q)) {
      const nextDraft = skipCurrentHousing(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-current-housing" },
      };
    }
    const amount = parseCurrentHousingAmount(q);
    if (amount == null) return answerThenRestore(q, draft);
    const nextDraft = writeStatedCurrentHousing(draft, amount);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedCurrentHousing", value: String(amount) },
    };
  }

  if (prompt === "declarations") {
    if (draft.statedDeclaration && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipDeclarationsText(q)) {
      const nextDraft = skipDeclarations(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-declarations" },
      };
    }
    const value = parseDeclarations(q, { allowBareYes: true });
    if (!value) return answerThenRestore(q, draft);
    const note = volunteeredDeclarationNote(q, value);
    const nextDraft = writeStatedDeclaration(draft, value, note);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedDeclaration", value },
    };
  }

  if (prompt === "declaration-timing") {
    if (draft.declarationTiming && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipDeclarationTimingText(q)) {
      const nextDraft = skipDeclarationTiming(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-declaration-timing" },
      };
    }
    const timing = parseDeclarationTiming(q);
    if (!timing) return answerThenRestore(q, draft);
    const nextDraft = writeDeclarationTiming(draft, timing);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "declarationTiming", value: timing },
    };
  }

  if (prompt === "household") {
    if (draft.statedHousehold && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipHouseholdText(q)) {
      const nextDraft = skipHousehold(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-household" },
      };
    }
    const value = parseHousehold(q, { allowBare: true });
    if (!value) return answerThenRestore(q, draft);
    const nextDraft = writeStatedHousehold(draft, value);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "statedHousehold", value },
    };
  }

  if (prompt === "coborrower-name") {
    if (coborrowerNameOnFile(draft) && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipCoborrowerNameText(q)) {
      const nextDraft = skipCoborrowerName(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-coborrower-name" },
      };
    }
    const name = parseCoborrowerName(q);
    if (!name) return answerThenRestore(q, draft);
    const nextDraft = writeCoborrowerName(draft, name);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "coborrowerName", value: name },
    };
  }

  if (prompt === "borrower-name") {
    if (borrowerNameOnFile(draft) && isKeepThisText(q)) return keepThisReply(draft);
    if (isSkipBorrowerNameText(q)) {
      const nextDraft = skipBorrowerName(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-borrower-name" },
      };
    }
    const name = parseBorrowerName(q);
    if (!name) return answerThenRestore(q, draft);
    const nextDraft = writeBorrowerName(draft, name);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "borrowerName", value: name },
    };
  }

  if (prompt === "other-reo") {
    if (isSkipOtherReoText(q)) {
      const nextDraft = skipOtherReo(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-other-reo" },
      };
    }
    const value = parseOtherReo(q, { allowBare: true });
    if (value) {
      if (draft.statedOtherReo === value) return keepThisReply(draft);
      const nextDraft = writeStatedOtherReo(draft, value);
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "statedOtherReo", value },
      };
    }
    if (draft.statedOtherReo && isKeepThisText(q)) return keepThisReply(draft);
    return answerThenRestore(q, draft);
  }

  if (prompt === "citizenship") {
    if (isSkipCitizenshipText(q)) {
      const nextDraft = skipCitizenship(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-citizenship" },
      };
    }
    const value = parseCitizenship(q);
    if (!value) return answerThenRestore(q, draft);
    const nextDraft = writeCitizenship(draft, value);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "citizenship", value },
    };
  }

  if (prompt === "former-history") {
    if (isSkipFormerHistoryText(q)) {
      const nextDraft = skipFormerHistory(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-former-history" },
      };
    }
    const nextDraft = writeFormerHistoryNote(draft, q);
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "formerHistory", value: q.trim() },
    };
  }

  if (prompt === "income") {
    if (draft.incomeType.value && isKeepThisText(q)) return keepThisReply(draft);
    const match = incomeFromText(q);
    if (!match) return answerThenRestore(q, draft);
    const nextDraft = {
      ...withIncomeType(draft, match.value),
      correcting: null,
      correctingLine: null,
    };
    if (draft.correcting === "income") {
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "incomeType", value: match.value },
      };
    }
    return withWorkspaceGuide(
      {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "incomeType", value: match.value },
      },
      nextDraft,
    );
  }

  if (prompt === "qualifying") {
    if (isKeepThisText(q)) return keepThisReply(draft);
    const monthly = parseLooseAmount(q);
    if (monthly == null) {
      return answerThenRestore(q, draft);
    }
    const nextDraft = writeQualifyingIncome(draft, String(Math.round(monthly)));
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "qualifyingIncome", value: String(Math.round(monthly)) },
    };
  }

  if (prompt === "years-in-business") {
    if (isKeepThisText(q)) return keepThisReply(draft);
    if (/^(skip|later|not sure|idk|pass|not yet)\b/i.test(lower)) {
      const nextDraft = skipYearsInBusiness(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-years-in-business" },
      };
    }
    const years = parseYearsInBusiness(q);
    if (!years) {
      return answerThenRestore(q, draft);
    }
    const nextDraft = writeYearsInBusiness(draft, years);
    return {
      ...nextFoxAsk({ ...nextDraft, correcting: null, correctingLine: null }),
      capture: { field: "yearsInBusiness", value: years },
    };
  }

  if (prompt === "documents") {
    if (offeringDocStart(draft) || draft.docsHeld) {
      if (/\bnot yet\b/.test(lower)) {
        const nextDraft = holdDocuments(draft);
        return {
          ...holdDocsAsk(),
          capture: { field: "hold-docs" },
        };
      }
      if (/^skip\b/.test(lower)) {
        const nextDraft = skipCurrentInvite({ ...draft, docsHeld: false });
        return {
          ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
          capture: { field: "skip-docs" },
        };
      }
      if (/(ask fox|just ask)/i.test(lower)) {
        return {
          ...holdDocsAskFox(),
          capture: { field: "ask-fox" },
        };
      }
      if (looksLikeQuestion(q) || asksWillIQualify(q) || isGreeting(q)) {
        return answerThenRestore(q, draft);
      }
      if (/(start|id|upload|drop|now|add|documents)/i.test(lower)) {
        const nextDraft = { ...draft, docsStarted: true, docsHeld: false };
        return {
          ...workspacePromptCopy("documents", nextDraft),
          capture: { field: "start-docs" },
        };
      }
      return answerThenRestore(q, draft);
    }
    if (/\bnot yet\b/.test(lower)) {
      const nextDraft = holdDocuments(draft);
      return {
        ...holdDocsAsk(),
        capture: { field: "hold-docs" },
      };
    }
    if (/^skip\b|later|don'?t have|fine/.test(lower)) {
      const nextDraft = skipCurrentInvite(draft);
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-docs" },
      };
    }
    if (/(upload|drop|now|add)/i.test(lower)) {
      return {
        text: "",
        capture: { field: "open-docs" },
      };
    }
    return answerThenRestore(q, draft);
  }

  if (prompt === "preparing") {
    return { text: "I’m preparing your file." };
  }

  if (prompt === "review") {
    if (/(correction|fix|wrong|no|edit)/i.test(lower) && !/looks right/.test(lower)) {
      return { ...workspacePromptCopy("correct", draft), capture: { field: "needs-correction" } };
    }
    if (/(looks right|confirm|yes|correct|good)/i.test(lower) && !/correction/.test(lower)) {
      if (needsOverPriceCheck(draft)) {
        return {
          text: loanOverPriceCopy(draft),
          actions: loanOverPriceActions(),
        };
      }
      if (!canLooksRight(draft)) {
        return {
          text: missingAmountAsk(draft) || "I still need a required amount on this file.",
        };
      }
      const nextDraft = applyLooksRightMotion(draft);
      const nextPrompt = workspacePrompt(nextDraft);
      const shown =
        nextPrompt === "review" || nextPrompt === "housing" || nextPrompt === "debts"
          ? "done"
          : nextPrompt;
      return {
        ...workspacePromptCopy(shown, nextDraft),
        capture: { field: "confirm-draft" },
      };
    }
    return answerThenRestore(q, draft);
  }

  if (prompt === "correct") {
    if (dismissesCorrectionMenu(q)) {
      const nextDraft = draftAfterDismissCorrection(draft);
      return {
        ...(canLooksRight(nextDraft)
          ? workspacePromptCopy("review", nextDraft)
          : nextFoxAsk(nextDraft)),
        capture: { field: "keep-line" },
      };
    }
    if (looksLikeQuestion(q) && !wantsCorrectionMenu(q)) {
      return answerThenRestore(q, draft);
    }
    const years = parseYearsInBusiness(q);
    if (years && /\b(year|business|running)\b/i.test(q)) {
      const nextDraft = writeYearsInBusiness({ ...draft, correcting: null }, years);
      return {
        ...nextFoxAsk(nextDraft),
        capture: { field: "yearsInBusiness", value: years },
      };
    }
    return answerThenRestore(q, draft);
  }

  if (/(reward|membership)/i.test(lower)) {
    if (draft.path === "loan-only") {
      return { text: "This file is the loan. ACR is optional if you want the desk later." };
    }
    const range = estimateFromDraft(draft);
    return {
      text: range
        ? `Estimated ACR reward is ${formatRewardRange(range)}. Sample, not live.`
        : "I’ll estimate a reward range once the scenario is complete enough.",
    };
  }

  if (
    prompt === "basics-done" ||
    prompt === "done" ||
    (draft.sampleAccepted && (prompt === "housing" || prompt === "debts"))
  ) {
    const intent = productIntentFromText(q);
    if (intent && prompt === "basics-done") {
      return {
        text: `Updated to ${productIntentLabel(intent)}.`,
        capture: { field: "productIntent", value: intent },
      };
    }
    if (prompt === "done" || prompt === "housing" || prompt === "debts") {
      if (prompt === "done" && citizenshipNeeded(draft)) {
        if (isSkipCitizenshipText(q) && !/^not yet$/i.test(q.trim())) {
          const nextDraft = skipCitizenship(draft);
          return {
            ...workspacePromptCopy("done", nextDraft),
            capture: { field: "skip-citizenship" },
          };
        }
        const citizenship = parseCitizenship(q);
        if (citizenship) {
          const nextDraft = writeCitizenship(draft, citizenship);
          return {
            ...workspacePromptCopy("done", nextDraft),
            capture: { field: "citizenship", value: citizenship },
          };
        }
      }
      if (prompt === "done" && formerHistoryNeeded(draft)) {
        if (isSkipFormerHistoryText(q) && !/^not yet$/i.test(q.trim())) {
          const nextDraft = skipFormerHistory(draft);
          return {
            ...workspacePromptCopy("done", nextDraft),
            capture: { field: "skip-former-history" },
          };
        }
        if (q.trim() && !finishCaptureFromText(q)) {
          const nextDraft = writeFormerHistoryNote(draft, q);
          return {
            ...workspacePromptCopy("done", nextDraft),
            capture: { field: "formerHistory", value: q.trim() },
          };
        }
      }
      if (asksWillIQualify(q)) {
        return answerThenRestore(q, draft);
      }
      if (draft.pendingFinish && looksLikeEmail(q)) {
        const nextDraft = applyEmailThenFinish(draft, q);
        return {
          ...workspacePromptCopy("done", nextDraft),
          capture: { field: "email", value: q.trim() },
        };
      }
      const finish = finishCaptureFromText(q);
      if (finish) {
        if (finish.field === "upload-more") {
          return {
            text: "",
            capture: finish,
          };
        }
        const nextDraft =
          finish.field === "proceed"
            ? {
                ...draft,
                motion: "in_queue" as const,
                nextActor: "ONYX" as const,
                pendingFinish: emailMissing(draft) ? "proceed" : draft.pendingFinish,
              }
            : { ...draft, pendingFinish: emailMissing(draft) ? "not-yet" : draft.pendingFinish };
        return {
          ...workspacePromptCopy("done", nextDraft),
          text:
            finish.field === "proceed"
              ? MOTION_COPY.in_queue
              : emailMissing(draft)
                ? MOTION_COPY.emailAsk
                : MOTION_COPY.on_hold,
          capture: finish,
        };
      }
      if (/^skip\b/.test(lower) || (/(skip|later|don'?t have)/i.test(lower) && /doc/.test(lower))) {
        const nextDraft = { ...draft, documentsSkipped: true, docsOpen: false, correcting: null };
        return {
          ...workspacePromptCopy("done", nextDraft),
          capture: { field: "skip-docs" },
        };
      }
      return answerThenRestore(q, draft);
    }
    return {
      text: "The file has the basics. Ask if you want to change anything.",
    };
  }

  const volunteered = parseVolunteeredAddress(q);
  if (volunteered && /address/i.test(q)) {
    const nextDraft = proposeSubjectAddress(draft, volunteered);
    return {
      ...workspacePromptCopy("confirm-proposal", nextDraft),
      capture: { field: "propose-subject-address", value: volunteered },
    };
  }

  return answerThenRestore(q, draft);
}

export function estimateFromDraft(draft: FoxIntakeDraft) {
  const scenario = scenarioForEstimate(draft);
  return scenario ? estimateRewardRange(scenario) : null;
}

export function scenarioForEstimate(
  draft: FoxIntakeDraft,
): ExplorerScenario | null {
  const intent = draft.productIntent ?? productIntentFromSlug(draft.scenario?.productSlug);
  const occupancy = (draft.occupancyChoice.value ||
    draft.scenario?.occupancy) as Occupancy | undefined;
  const credit =
    explorerCreditFromStated(draft.creditBand) ??
    draft.scenario?.creditRange ??
    SAMPLE_SAFE_CREDIT;
  const loanAmount = draft.loanAmountValue ?? draft.scenario?.loanAmount;
  const propertyValue = draft.propertyValueAmount ?? draft.scenario?.propertyValue;
  if (!intent || !occupancy) return null;
  if (loanAmount == null && propertyValue == null) return null;

  return {
    zip: draft.scenario?.zip ?? "90001",
    purpose: purposeForIntent(intent, jumboPurposeOf(draft)),
    propertyValue: propertyValue ?? loanAmount ?? 0,
    amountMode: "loan",
    loanAmount,
    downPayment: draft.scenario?.downPayment,
    creditRange: credit,
    occupancy,
    timeline: (draft.timelineChoice.value || draft.scenario?.timeline) as Timeline | undefined,
    productSlug: slugForIntent(intent),
    productName: productIntentLabel(intent),
  };
}

export type PreviewFact = {
  id: string;
  label: string;
  value: string;
  note?: string;
};

function numbersFact(draft: FoxIntakeDraft): PreviewFact | null {
  if (draft.productIntent && draft.productIntent !== "other") return null;
  const loan = draft.loanAmountValue;
  const value = draft.propertyValueAmount;
  const hasLoan = loan != null && loan > 0;
  const hasValue = value != null && value > 0;
  if (!hasLoan && !hasValue) return null;
  const label = structureAmountLabel(draft);
  if (!label) return null;
  if (hasLoan && hasValue) {
    return {
      id: "numbers",
      label,
      value: `${formatMoney(loan)} on ${formatMoney(value)}`,
    };
  }
  if (hasLoan) {
    return {
      id: "numbers",
      label,
      value: formatMoney(loan),
    };
  }
  return {
    id: "numbers",
    label,
    value: formatMoney(value as number),
  };
}

function docsFact(draft: FoxIntakeDraft): PreviewFact | null {
  if (draft.documents.length) {
    const labels = Array.from(
      new Set(draft.documents.map((doc) => docsDisplayLabel(doc))),
    );
    return {
      id: "docs",
      label: "Docs",
      value: labels.map((item) => `${item} in`).join(" · "),
    };
  }
  if (draft.documentsSkipped) {
    return { id: "docs", label: "Docs", value: "Skipped" };
  }
  return null;
}

export function statusCopy(draft: FoxIntakeDraft) {
  return motionStatusCopy(draft);
}

/** Same File facts /lo/review must show even when no explorer scenario bag exists. */
export function fileScenarioRows(draft: FoxIntakeDraft): [string, string][] {
  const rows: [string, string][] = [];
  if (draft.path) {
    rows.push(["Path", draft.path === "acr" ? "ACR" : "Loan only"]);
  }
  const product =
    productIntentLabel(draft.productIntent) || draft.scenario?.productName || "";
  if (product) rows.push(["Product", product]);

  const named = structureAmountLabel(draft);
  const value = draft.propertyValueAmount;
  const loan = draft.loanAmountValue;
  const down = draft.downPaymentAmount;
  if (isPurchaseLike(draft)) {
    if (value != null) rows.push(["Purchase price", formatMoney(value)]);
    if (down != null) rows.push(["Down payment", formatMoney(down)]);
    if (loan != null) rows.push(["Loan amount", formatMoney(loan)]);
  } else if (named && draftUsesPurchasePrice(draft) && value != null) {
    rows.push([named, formatMoney(value)]);
    if (loan != null && loan !== value) rows.push(["Loan amount", formatMoney(loan)]);
  } else if (named && loan != null) {
    rows.push([named, formatMoney(loan)]);
    if (value != null && value !== loan) rows.push(["Property value", formatMoney(value)]);
  } else if (value != null) {
    rows.push(["Purchase price", formatMoney(value)]);
  } else if (loan != null) {
    rows.push(["Loan amount", formatMoney(loan)]);
  }
  if (isRefiLike(draft) && value != null && !rows.some((row) => row[0] === "Property value")) {
    rows.push(["Property value", formatMoney(value)]);
  }

  const occupancy = occupancySpokenLabel(draft.occupancyChoice.value);
  if (occupancy) rows.push(["Occupancy", occupancy]);
  const timeline = TIMELINE_BUBBLES.find((item) => item.value === draft.timelineChoice.value)?.label;
  if (timeline) rows.push(["Timeline", timeline]);

  if (draft.scenario) {
    const extras: [string, string][] = [];
    if (draft.scenario.zip) extras.push(["ZIP", draft.scenario.zip]);
    if (draft.scenario.productName && draft.scenario.productName !== product) {
      extras.push(["Product", draft.scenario.productName]);
    }
    if (draft.scenario.propertyValue && value == null) {
      extras.push(["Property value", formatMoney(draft.scenario.propertyValue)]);
    }
    if (draft.scenario.loanAmount != null && loan == null) {
      extras.push(["Loan amount", formatMoney(draft.scenario.loanAmount)]);
    }
    for (const row of extras) {
      if (!rows.some((item) => item[0] === row[0])) rows.push(row);
    }
  }
  return rows;
}

export function previewFacts(draft: FoxIntakeDraft): PreviewFact[] {
  const facts: PreviewFact[] = [];
  if (draft.path === "acr") {
    facts.push({ id: "path", label: "Path", value: "Relationship desk" });
  } else if (draft.path === "loan-only") {
    facts.push({ id: "path", label: "Path", value: "Loan only" });
  }

  const intent = draft.productIntent ?? null;
  if (intent) {
    facts.push({
      id: "product",
      label: "Product",
      value: productIntentLabel(intent),
    });
  }

  const required = requiredStructureLines(draft);
  const requiredIds = new Set(required.map((line) => line.id));
  for (const line of required) {
    const shown = requiredLineValue(draft, line);
    facts.push({
      id: line.id,
      label: line.label,
      value: shown.value,
      note: shown.note,
    });
  }

  if (!requiredIds.has("occupancy")) {
    const occupancy = draft.occupancyChoice.value || "";
    const occupancyLabel = OCCUPANCY_BUBBLES.find((item) => item.value === occupancy)?.label;
    if (occupancyLabel) {
      facts.push({ id: "occupancy", label: "Occupancy", value: occupancyLabel });
    }
  }

  if (!requiredIds.has("timeline")) {
    const timeline = draft.timelineChoice.value || "";
    const timelineLabel = TIMELINE_BUBBLES.find((item) => item.value === timeline)?.label;
    if (timelineLabel) {
      facts.push({ id: "timeline", label: "Timeline", value: timelineLabel });
    }
  }

  const numbers = numbersFact(draft);
  if (numbers && !requiredIds.has("numbers") && !requiredIds.has("line")) facts.push(numbers);

  if (!requiredIds.has("credit") && (draft.creditAsked || draft.creditBand)) {
    const creditLabel = statedCreditLabel(draft.creditBand) || "—";
    facts.push({
      id: "credit",
      label: "Credit",
      value: creditLabel,
      note: CREDIT_STATED_NOTE,
    });
  }

  if (!requiredIds.has("income") && incomeSettled(draft)) {
    const incomeLabel =
      INCOME_BUBBLES.find((item) => item.value === draft.incomeType.value)?.label ?? "Other";
    facts.push({ id: "income", label: "Income", value: incomeLabel });
  }

  if (draft.monthlyDebtsAsked || draft.statedMonthlyDebts != null || isStatedDebtsConfirmPending(draft)) {
    const pendingAmount = isStatedDebtsConfirmPending(draft)
      ? Number(draft.pendingProposal?.value)
      : NaN;
    const shown =
      draft.statedMonthlyDebts != null && draft.statedMonthlyDebts > 0
        ? formatMoney(draft.statedMonthlyDebts)
        : Number.isFinite(pendingAmount) && pendingAmount > 0
          ? formatMoney(pendingAmount)
          : "—";
    facts.push({
      id: "debts",
      label: "Monthly debts",
      value: shown,
      note: STATED_NOT_FROM_CREDIT,
    });
  }

  if (
    draft.availableAssetsAsked ||
    draft.statedAvailableAssets != null ||
    isStatedAssetsConfirmPending(draft)
  ) {
    const pendingAmount = isStatedAssetsConfirmPending(draft)
      ? Number(draft.pendingProposal?.value)
      : NaN;
    const shown =
      draft.statedAvailableAssets != null && draft.statedAvailableAssets > 0
        ? formatMoney(draft.statedAvailableAssets)
        : Number.isFinite(pendingAmount) && pendingAmount > 0
          ? formatMoney(pendingAmount)
          : "—";
    facts.push({
      id: "assets",
      label: "Stated available assets",
      value: shown,
      note: SUGGESTED_ASSETS_NOTE,
    });
  }

  if (
    draft.propertyTypeAsked ||
    draft.propertyType ||
    isPropertyTypeConfirmPending(draft)
  ) {
    const pending = parsePropertyType(draft.pendingProposal?.value ?? "");
    const shown = draft.propertyType
      ? propertyTypeLabel(draft.propertyType)
      : pending
        ? propertyTypeLabel(pending)
        : "—";
    facts.push({
      id: "property-type",
      label: "Property type",
      value: shown,
      note: SUGGESTED_PROPERTY_NOTE,
    });
  }

  if (
    draft.timeOnJobAsked ||
    draft.statedTimeOnJob != null ||
    isTimeOnJobConfirmPending(draft)
  ) {
    const pendingMonths = isTimeOnJobConfirmPending(draft)
      ? Number(draft.pendingProposal?.value)
      : NaN;
    const shown =
      draft.statedTimeOnJobLabel ||
      (draft.statedTimeOnJob != null && draft.statedTimeOnJob > 0
        ? String(draft.statedTimeOnJob)
        : Number.isFinite(pendingMonths) && pendingMonths > 0
          ? String(pendingMonths)
          : "—");
    facts.push({
      id: "time-on-job",
      label: "Time on job",
      value: shown,
      note: SUGGESTED_TIME_ON_JOB_NOTE,
    });
  }

  if (
    draft.currentHousingAsked ||
    draft.statedCurrentHousing != null ||
    isCurrentHousingConfirmPending(draft)
  ) {
    const pendingAmount = isCurrentHousingConfirmPending(draft)
      ? Number(draft.pendingProposal?.value)
      : NaN;
    const shown =
      draft.statedCurrentHousing != null && draft.statedCurrentHousing > 0
        ? formatMoney(draft.statedCurrentHousing)
        : Number.isFinite(pendingAmount) && pendingAmount > 0
          ? formatMoney(pendingAmount)
          : "—";
    facts.push({
      id: "current-housing",
      label: "Current housing",
      value: shown,
      note: SUGGESTED_HOUSING_NOTE,
    });
  }

  if (
    draft.declarationAsked ||
    draft.statedDeclaration ||
    isDeclarationsConfirmPending(draft)
  ) {
    const pending = isDeclarationsConfirmPending(draft)
      ? draft.pendingProposal?.value
      : undefined;
    const shown = draft.statedDeclaration
      ? declarationsLabel(draft.statedDeclaration)
      : pending && isStatedDeclaration(pending)
        ? declarationsLabel(pending)
        : "—";
    const timing =
      draft.statedDeclaration === "event" && draft.declarationTiming
        ? draft.declarationTiming
        : "";
    facts.push({
      id: "declarations",
      label: "Declarations",
      value: timing ? `${shown} · ${timing}` : shown,
      note: SUGGESTED_DECLARATION_NOTE,
    });
  }

  if (
    draft.householdAsked ||
    draft.statedHousehold ||
    isHouseholdConfirmPending(draft)
  ) {
    const pending = isHouseholdConfirmPending(draft)
      ? draft.pendingProposal?.value
      : undefined;
    const shown = draft.statedHousehold
      ? householdLabel(draft.statedHousehold)
      : pending && isStatedHousehold(pending)
        ? householdLabel(pending)
        : "—";
    facts.push({
      id: "household",
      label: "Household",
      value: shown,
      note: SUGGESTED_HOUSEHOLD_NOTE,
    });
  }

  if (
    draft.coborrowerNameAsked ||
    draft.coborrowerName ||
    isCoborrowerNameConfirmPending(draft)
  ) {
    const pendingName = isCoborrowerNameConfirmPending(draft)
      ? draft.pendingProposal?.value
      : undefined;
    const shown = draft.coborrowerName || pendingName || "—";
    facts.push({
      id: "coborrower-name",
      label: coborrowerFileLabel(draft),
      value: shown,
      note: SUGGESTED_COBORROWER_NOTE,
    });
  }

  if (
    draft.borrowerNameAsked ||
    draft.borrowerName ||
    draft.contact.fullName.value ||
    isBorrowerNameConfirmPending(draft)
  ) {
    const pending = isBorrowerNameConfirmPending(draft)
      ? draft.pendingProposal?.value
      : undefined;
    const shown = borrowerNameOnFile(draft) || pending || "—";
    facts.push({
      id: "borrower",
      label: primaryFileLabel(draft),
      value: shown,
      note: SUGGESTED_BORROWER_NOTE,
    });
  }

  if (
    draft.otherReoAsked ||
    draft.statedOtherReo ||
    isOtherReoConfirmPending(draft)
  ) {
    const pending = isOtherReoConfirmPending(draft)
      ? draft.pendingProposal?.value
      : undefined;
    const shown = draft.statedOtherReo
      ? otherReoLabel(draft.statedOtherReo)
      : pending && isStatedOtherReo(pending)
        ? otherReoLabel(pending)
        : "—";
    facts.push({
      id: "other-reo",
      label: "Other real estate",
      value: shown,
      note: SUGGESTED_OTHER_REO_NOTE,
    });
  }

  const address = draft.subjectAddress || factValue(draft, "property_address");
  if (address) {
    facts.push({
      id: "address",
      label: "Property",
      value: address,
      note: SUGGESTED_PROPERTY_NOTE,
    });
  }
  const institution = factValue(draft, "institution");
  const endingBalance = factValue(draft, "ending_balance");
  if (institution || endingBalance) {
    facts.push({
      id: "bank",
      label: "Bank",
      value: [institution, endingBalance ? displayFactValue("ending_balance", endingBalance) : ""]
        .filter(Boolean)
        .join(" · "),
    });
  }
  const servicer = factValue(draft, "servicer");
  if (servicer) {
    facts.push({ id: "servicer", label: "Servicer", value: servicer });
  }
  const unpaid = factValue(draft, "unpaid_principal");
  if (unpaid) {
    facts.push({
      id: "unpaid_principal",
      label: "Unpaid principal",
      value: displayFactValue("unpaid_principal", unpaid),
    });
  }

  facts.push(...conventionalFileFacts(draft));
  const calculatorIds = new Set(facts.map((fact) => fact.id));
  for (const fact of calculatorStructureFacts(draft)) {
    if (!calculatorIds.has(fact.id)) facts.push(fact);
  }

  const employer = factValue(draft, "employer_name");
  const employerProposal =
    draft.pendingProposal?.field === "employer_name" ? draft.pendingProposal : null;
  if (employer) {
    facts.push({
      id: "employer",
      label: "Employer",
      value: employer,
      note: draft.facts?.employer_name?.source === "suggested" ? SUGGESTED_NOTE : undefined,
    });
  } else if (employerProposal) {
    facts.push({
      id: "employer",
      label: "Employer",
      value: employerProposal.value,
      note:
        employerProposal.kind === "public"
          ? SUGGESTED_NOTE
          : employerProposal.note ?? SUGGESTED_NOTE,
    });
  }
  const qualifying = qualifyingIncomeDisplay(draft);
  if (qualifying) {
    facts.push({
      id: "qualifying",
      label: "Qualifying income",
      value: qualifying.value,
      note: qualifying.note,
    });
  }
  const yearsInBusiness = draft.facts?.years_in_business?.value;
  if (yearsInBusiness) {
    facts.push({
      id: "years-in-business",
      label: "Years in business",
      value: yearsInBusiness,
    });
  }
  const periodPay = factValue(draft, "gross_period");
  const ytdPay = factValue(draft, "ytd_gross");
  const wages = factValue(draft, "wages");
  const agi = factValue(draft, "agi");
  const payBits = [
    periodPay ? `Period ${displayFactValue("gross_period", periodPay)}` : "",
    ytdPay ? `YTD ${displayFactValue("ytd_gross", ytdPay)}` : "",
    !periodPay && !ytdPay && wages ? `Wages ${displayFactValue("wages", wages)}` : "",
    !periodPay && !ytdPay && !wages && agi ? `AGI ${displayFactValue("agi", agi)}` : "",
  ].filter(Boolean);
  if (payBits.length) {
    facts.push({ id: "pay", label: "Pay", value: payBits.join(" · ") });
  }

  if (sampleReady(draft)) {
    if (previewRateApplies(draft)) {
      facts.push({
        id: "rate",
        label: "Rate",
        value: `${SAMPLE_STRUCTURE} ${SAMPLE_RATE_LABEL}`,
        note: PREVIEW_RATE_NOTE,
      });
    } else if (intent) {
      facts.push({
        id: "rate",
        label: "Rate",
        value: PRICING_WHEN_READY,
      });
    }
  }

  if (draft.path === "acr" && sampleReady(draft)) {
    facts.push({
      id: "reward",
      label: "Reward",
      value: REWARD_PREPARED_COPY,
    });
  }

  const deskOpen =
    draft.path === "acr" &&
    (Boolean(draft.sampleAccepted) ||
      draft.workspaceDraftStatus === "with-originator" ||
      draft.phase === "confirmed");
  if (deskOpen) {
    facts.push({
      id: "letter",
      label: "Letter",
      value: "Not issued yet",
      note: "Originator-issued, not Fox",
    });
    facts.push({
      id: "scout",
      label: "Scout",
      value: "When the timing is wrong, Fox waits.",
    });
  }

  if (
    draft.sampleAccepted ||
    draft.workspaceDraftStatus === "with-originator" ||
    draft.phase === "confirmed"
  ) {
    facts.push({
      id: "originator",
      label: "Originator",
      value: "Licensed originator assigned",
    });
  }

  const docs = docsFact(draft);
  if (docs) facts.push(docs);

  if (facts.length) {
    facts.push({
      id: "status",
      label: "Status",
      value: statusCopy(draft),
    });
    facts.push({
      id: "next",
      label: "Next",
      value: nextActorOf(draft),
    });
    const completeness = fileCompleteness(draft);
    if (completeness) {
      facts.push({
        id: "file",
        label: "Completeness",
        value: completeness.copy,
        note: fileStillUsefulNote(draft),
      });
    }
    facts.push({
      id: "waiting",
      label: "Waiting on",
      value: waitingOnOf(draft),
    });
    const caution = guidelineCaution(draft);
    if (caution) {
      facts.push({
        id: "caution",
        label: "Note",
        value: caution,
        note: caution === HIGH_LTV_CAUTION ? LTV_NOT_A_DECISION : undefined,
      });
    }
  }

  return facts;
}

export function structureFixPrompt(
  id: string,
  draft?: FoxIntakeDraft,
): FoxPrompt | null {
  if (id === "path") return "path-switch";
  if (id === "product") return "product";
  if (id === "occupancy") return "occupancy";
  if (id === "timeline") return "timeline";
  if (id === "numbers" || id === "line") {
    return isPurchaseLike(draft) && hasPropertyValue(draft) ? "amount" : draftUsesPurchasePrice(draft) ? "value" : "amount";
  }
  if (id === "price") return "value";
  if (id === "home") return "value";
  if (id === "down" || id === "loan") return "amount";
  if (id === "amount") return "amount";
  if (id === "value") return "value";
  if (id === "credit") return "credit";
  if (id === "income") return "income";
  if (id === "debts") return "debts";
  if (id === "housing" || id === "ltv" || id === "cltv" || id === "pi") return "housing";
  if (id === "assets") return "assets";
  if (id === "property-type") return "property-type";
  if (id === "time-on-job") return "time-on-job";
  if (id === "current-housing") return "current-housing";
  if (id === "declarations") return "declarations";
  if (id === "declaration-timing") return "declaration-timing";
  if (id === "household") return "household";
  if (id === "coborrower-name" || id === "other-borrower") return "coborrower-name";
  if (id === "borrower" || id === "borrower-name") return "borrower-name";
  if (id === "other-reo" || id === "other-real-estate") return "other-reo";
  if (id === "qualifying") return "qualifying";
  if (id === "years-in-business") return "years-in-business";
  if (id === "docs") return "documents";
  if (id === "employer" && draft?.pendingProposal?.field === "employer_name") return "confirm-proposal";
  return null;
}

export function structureExplainCopy(
  id: string,
  draft: FoxIntakeDraft,
): { text: string } | null {
  if (id === "credit") {
    return {
      text: "That’s a stated range for the estimate. Not a FICO and not a credit pull.",
    };
  }
  if (id === "debts" || id === "stated-dti") {
    return {
      text: `Monthly debts. ${STATED_NOT_FROM_CREDIT}. Not a credit pull.`,
    };
  }
  if (id === "ltv" || id === "cltv" || id === "housing" || id === "pi" || id === "taxes" || id === "hoi") {
    return {
      text: `${ESTIMATED_NOT_FINAL}. Sample payment is indicative · not live.`,
    };
  }
  if (id === "assets") {
    return {
      text: "Stated available assets. Suggested · not underwritten. Not a credit pull.",
    };
  }
  if (id === "property-type") {
    return {
      text: "Property type. Suggested · not underwritten.",
    };
  }
  if (id === "time-on-job") {
    return {
      text: "Time on job. Suggested · not underwritten.",
    };
  }
  if (id === "current-housing") {
    return {
      text: "Current housing. Suggested · not underwritten.",
    };
  }
  if (id === "declarations" || id === "file-declarations") {
    return {
      text: "Declarations. Agency a–m can sit on the File later. Not a first-session ask. Not a 1003.",
    };
  }
  if (id === "file-property") {
    return {
      text: "Property slots the file can hold. Address from you or a contract. APN, legal, year built, taxes, and HOA wait for a title profile. I won’t quiz you for those.",
    };
  }
  if (id === "file-assets") {
    return {
      text: "Assets from a statement: institution, type, suggested balance, last four. Not an asset form. Not a full account number.",
    };
  }
  if (id === "file-liabilities") {
    return {
      text: "Liabilities wait for a credit pull. Placeholder only. Not a worksheet.",
    };
  }
  if (id === "file-history") {
    return {
      text: "Two-year address and employment slots. I prefer documents over a form.",
    };
  }
  if (id === "household") {
    return {
      text: "Household. Suggested · not underwritten.",
    };
  }
  if (id === "borrower" || id === "borrower-name") {
    return {
      text: "Borrower. Suggested · not underwritten.",
    };
  }
  if (id === "other-reo" || id === "other-real-estate") {
    return {
      text: "Other real estate. Suggested · not underwritten.",
    };
  }
  if (id === "rate") {
    if (previewRateApplies(draft) && sampleReady(draft)) {
      return {
        text: `${SAMPLE_STRUCTURE} ${SAMPLE_RATE_LABEL}. ${PREVIEW_RATE_NOTE}. I cannot set, lock, or invent a live rate.`,
      };
    }
    return {
      text: `${PRICING_WHEN_READY}. I cannot set, lock, or invent a live rate.`,
    };
  }
  if (id === "reward") {
    return {
      text: "Reward is calculated for the relationship. Sample · indicative · not live. A licensed originator confirms it. I cannot edit it into a live amount.",
    };
  }
  if (id === "letter") {
    return {
      text: "The letter is originator-issued, not Fox. I cannot approve, lock, or commit to lend.",
    };
  }
  if (id === "scout") {
    return {
      text: "When the timing is wrong, Fox waits.",
    };
  }
  if (id === "status") {
    const motion = motionOf(draft);
    return {
      text: motion
        ? `Status is ${motion}. I cannot approve, lock, or commit to lend.`
        : "This is desk state. I cannot approve, lock, or commit to lend.",
    };
  }
  if (id === "next") {
    return {
      text: `Next is ${nextActorOf(draft)}. Fox owns file motion. I cannot approve, lock, or commit to lend.`,
    };
  }
  if (id === "file") {
    const useful = fileStillUsefulNote(draft);
    return {
      text: useful ? `${completenessExplainCopy(draft)} ${useful}.` : completenessExplainCopy(draft),
    };
  }
  if (id === "caution") {
    const caution = guidelineCaution(draft);
    return caution
      ? { text: caution }
      : null;
  }
  if (id === "qualifying") {
    return {
      text: "Suggested qualifying income · not underwritten. I cannot approve, lock, or commit to lend.",
    };
  }
  if (id === "originator") {
    return {
      text: "A licensed originator is assigned to this file. I cannot approve, lock, or commit to lend.",
    };
  }
  return null;
}

const CHAT_SUMMARY_IDS = new Set([
  "path",
  "product",
  "occupancy",
  "timeline",
  "numbers",
  "price",
  "down",
  "loan",
  "home",
  "line",
  "credit",
  "income",
  "qualifying",
  "rate",
  "reward",
  "docs",
]);

export function fileSummaryFacts(draft: FoxIntakeDraft): PreviewFact[] {
  return previewFacts(draft)
    .filter((fact) => CHAT_SUMMARY_IDS.has(fact.id))
    .map((fact) =>
      fact.id === "rate" && fact.note && !fact.value.includes(fact.note)
        ? { ...fact, value: `${fact.value} · ${fact.note}`, note: undefined }
        : fact,
    );
}

export function looksLikeInventedRewardMoney(value: string): boolean {
  return INVENTED_REWARD_RANGE.test(value) || (SAMPLE_INDICATIVE.test(value) && /\$[\d,]/.test(value));
}

function isRewardFact(fact: Pick<FoxMessageFact, "id" | "label">) {
  return fact.id === "reward" || /^reward$/i.test(fact.label);
}

function preparedRewardFact(fact: FoxMessageFact): FoxMessageFact {
  return { id: "reward", label: fact.label || "Reward", value: REWARD_PREPARED_COPY };
}

export function sanitizeRewardFact(fact: FoxMessageFact): FoxMessageFact {
  if (!isRewardFact(fact)) return fact;
  const blob = `${fact.value} ${fact.note ?? ""}`;
  if (!looksLikeInventedRewardMoney(blob) && !/\$[\d,]/.test(fact.value)) return fact;
  return preparedRewardFact(fact);
}

function sanitizeRestoredFoxText(text: string): string {
  if (!looksLikeInventedRewardMoney(text) && !INVENTED_REWARD_RANGE.test(text)) return text;
  if (!/(reward|membership)/i.test(text) && !SAMPLE_INDICATIVE.test(text)) return text;
  if (/estimated.*reward/i.test(text) || /reward is \$/i.test(text) || /membership reward/i.test(text)) {
    return `The reward is ${REWARD_PREPARED_COPY.toLowerCase()}.`;
  }
  return text.replace(
    /\$[\d,]+(?:\.\d+)?\s+(?:to|–|-|—)\s+\$[\d,]+(?:\s*·\s*Sample\s*·\s*indicative\s*·\s*not live)?/g,
    REWARD_PREPARED_COPY,
  );
}

function isQualifyingIncomeConfirm(message: FoxMessage) {
  if (message.role !== "fox") return false;
  const blob = `${message.text}\n${message.followUp ?? ""}`;
  if (/Suggested qualifying income/i.test(blob)) return true;
  return (message.actions ?? []).some((action) => action.capture?.field === "accept-proposal")
    && /qualifying income/i.test(blob);
}

function dropProposalActions(message: FoxMessage): FoxMessage {
  const actions = (message.actions ?? []).filter(
    (action) =>
      action.capture?.field !== "accept-proposal" && action.capture?.field !== "decline-proposal",
  );
  const text = message.text.replace(/\s*Use this\??\s*$/i, "").trim();
  const followUp = message.followUp?.replace(/\s*Use this\??\s*$/i, "").trim();
  return {
    ...message,
    text,
    followUp: followUp || undefined,
    actions: actions.length ? actions : undefined,
  };
}

export function ensureIncomeConfirmChips(messages: FoxMessage[], draft: FoxIntakeDraft): FoxMessage[] {
  if (!isQualifyingIncomeConfirmPending(draft)) return messages;
  let latest = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (isQualifyingIncomeConfirm(messages[i])) latest = i;
  }
  if (latest < 0) return messages;
  return messages.map((message, index) => {
    if (index !== latest) return message;
    const actions = message.actions ?? [];
    const hasUse = actions.some((action) => action.capture?.field === "accept-proposal");
    const hasLeave = actions.some((action) => action.capture?.field === "decline-proposal");
    if (hasUse && hasLeave) return message;
    return { ...message, actions: incomeConfirmActions() };
  });
}

/** Older qualifying-income Use this / Change cards go inert when a newer one lands. */
export function inertSupersededIncomeConfirms(messages: FoxMessage[]): FoxMessage[] {
  let latest = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (isQualifyingIncomeConfirm(messages[i])) latest = i;
  }
  if (latest < 0) return messages;
  return messages.map((message, index) =>
    index === latest || !isQualifyingIncomeConfirm(message) ? message : dropProposalActions(message),
  );
}

export function migrateRestoredFoxMessages(messages: FoxMessage[]): FoxMessage[] {
  return inertSupersededIncomeConfirms(
    messages.map((message) => {
      const text = sanitizeRestoredFoxText(message.text);
      const facts = message.facts?.map(sanitizeRewardFact);
      const factsChanged = Boolean(
        facts && message.facts?.some((fact, index) => fact !== facts[index]),
      );
      const actions = rebindProductChipActions(message.actions);
      const actionsChanged = actions !== message.actions;
      if (text === message.text && !factsChanged && !actionsChanged) return message;
      return { ...message, text, facts, actions };
    }),
  );
}
