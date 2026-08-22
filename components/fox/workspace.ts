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
  skipCurrentInvite,
  skipRemainingClasses,
} from "./fileWrite";
import {
  SUGGESTED_NOTE,
  canLooksRight,
  sketchAssembled,
  completenessExplainCopy,
  fileCompleteness,
  guidelineCaution,
  lowestCreditBand,
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
  missingAmountAsk,
  parseFundsRole,
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
  sketchAmountsReady,
  withComputedCompanion,
  writeQualifyingIncome,
  writeYearsInBusiness,
  YEARS_IN_BUSINESS_ASK,
} from "./completeness";
import {
  decliningIncomeCaution,
  formatIncomeMoney,
  monthlyFromAnnual,
  qualifyingIncomeDisplay,
  scheduleCYearViews,
  SUGGESTED_INCOME_NOTE,
} from "./qualifyingIncome";
import {
  applyEmailThenFinish,
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
  const lower = text.trim().toLowerCase();
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
  draft: FoxIntakeDraft,
  askingAmountPurpose = false,
): string {
  if (draft.pendingProposal || draft.pendingConflict) return "Ask ONYX Fox";
  const ask = workspacePrompt(draft);
  if ((ask === "amount" && !askingAmountPurpose) || ask === "value") {
    return `Enter ${composerAmountHint(draft)}`;
  }
  if (askingAmountPurpose) return "Purchase price, loan amount, or HELOC line";
  return "Ask ONYX Fox";
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
export const FHFA_HIGH_COST_CEILING_2026 = 1_249_125;
export const PRICING_WHEN_READY = "Pricing when the file is ready";
export const GEO_STOP_COPY =
  "I can only prepare California files. I cannot prepare this file.";
export const JUMBO_PURPOSE_ASK = "Are you buying or refinancing?";
export const JUMBO_OFFER_COPY =
  "That looks above the 2026 high-cost ceiling ($1,249,125). Stay on this product, or use Jumbo?";
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
  const intent =
    draft.productIntent ??
    (() => {
      const fromSlug = productIntentFromSlug(draft.scenario?.productSlug);
      return fromSlug === "other" ? null : fromSlug;
    })();
  if (!sampleRateApplies(intent)) return false;
  if (draft.outOfState || draft.govProgram || draft.creditEvent || draft.cashOut) return false;
  if (lowestCreditBand(draft)) return false;
  const occupancy = draft.occupancyChoice.value || draft.scenario?.occupancy || "";
  if (occupancy === "investment") return false;
  if (occupancy && occupancy !== "primary" && occupancy !== "second-home") return false;
  if (loanLooksAboveCeiling(draft)) return false;
  return true;
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
  return /\bcash[-\s]?out\b/.test(lower);
}

function cashOutCopy() {
  return "Noted. I cannot show a preview rate.";
}

export function wantsReplaceFirst(text: string) {
  const lower = text.trim().toLowerCase();
  return (
    /\breplace( the)? first\b/.test(lower) ||
    /\bpay\s*off( the)? first\b/.test(lower) ||
    /\brefinance( the)? first\b/.test(lower)
  );
}

function govProgramCopy(program: GovProgram) {
  const name = program.toUpperCase();
  return `${name} is a government program. I cannot show a preview rate. I can still prepare this file. Request human is available.`;
}

function creditEventCopy() {
  return "Noted. I cannot show a preview rate. You can still Proceed. Request human is available.";
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
  if (draft.awaitingYearsInBusiness) return YEARS_IN_BUSINESS_ASK;
  if (offeringDocStart(draft)) return sketchAndStartDocsCopy(draft).text;
  const invite = nextDocInvite(draft);
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
  return "";
}

function identityReactionAsk(draft: FoxIntakeDraft): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} {
  const name = firstNameFromDraft(draft);
  const greet = name ? `Nice to meet you, ${name}.` : "Got your ID.";
  const invite = nextDocInvite(draft);
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
      text: `${ack} I’m suggesting ${shown} a month. ${SUGGESTED_INCOME_NOTE}. Use this?`,
      actions: proposalActions(proposal.kind),
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
    actions: proposalActions(proposal.kind),
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
  if (proposal.field === QUALIFYING_INCOME_FIELD) {
    if (scheduleCYearViews(draft).length || factValue(draft, "tax_year")) {
      return incomeReactionAsk(draft, proposal);
    }
    const cls = extractClass ?? lastExtractedClass(draft);
    const shown = displayFactValue(proposal.field, proposal.value);
    if (cls === "paystub" || cls === "w2") {
      return {
        text: `Got the ${cls === "w2" ? "W-2" : "paystub"}. I’m suggesting ${shown} a month. ${SUGGESTED_INCOME_NOTE}. Use this?`,
        actions: proposalActions(proposal.kind),
      };
    }
  }
  const caution =
    proposal.field === QUALIFYING_INCOME_FIELD ? decliningIncomeCaution(draft) : undefined;
  return {
    text: caution ?? proposalAskCopy(proposal),
    followUp: caution ? proposalAskCopy(proposal) : undefined,
    actions: proposalActions(proposal.kind),
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
      actions: conflictActions(),
    };
  }
  if (cls === "government_id") return identityReactionAsk(draft);
  if (draft.pendingProposal) return liveProposalAsk(draft, draft.pendingProposal, cls);
  return null;
}

function rememberedAskCopy(draft: FoxIntakeDraft): string | undefined {
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
  const credit = CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === draft.creditBand)?.label;
  if (credit && credit !== "Not sure") bits.push(`stated ${credit}`);
  else if (draft.creditAsked) bits.push("stated credit");
  const income = INCOME_BUBBLES.find((item) => item.value === draft.incomeType.value)?.label;
  if (income) bits.push(income === "Self-employed" ? "self-employed" : income);
  const sketch = bits.length
    ? `That’s the sketch. ${bits.join(", ")}. It’s on the notepad.`
    : "That’s the sketch. It’s on the notepad.";
  return {
    text: sketch,
    followUp: "If you want, I can start documents. First is a government ID, so the file has a name.",
  };
}

function startDocsActions(): FoxAction[] {
  return [
    { id: "start-docs", label: "Start with ID", event: "bubble", capture: { field: "start-docs" } },
    { id: "not-yet-docs", label: "Not yet", event: "bubble", capture: { field: "skip-docs" } },
  ];
}

function docInviteActions(): FoxAction[] {
  return [
    { id: "upload-this", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } },
    { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
  ];
}

function looksLikeQuestion(text: string) {
  const trimmed = text.trim();
  return /\?$/.test(trimmed) || /^(why|what|how|when|who|where|can you|could you)\b/i.test(trimmed);
}

function restoredAsk(answer: string, draft: FoxIntakeDraft) {
  const ask = workspacePromptCopy(workspacePrompt(draft), draft);
  return {
    text: `${answer} ${ask.text}`.trim(),
    followUp: ask.followUp,
    facts: ask.facts,
    actions: ask.actions,
  };
}

function documentQuestionAnswer(draft: FoxIntakeDraft) {
  const invite = nextDocInvite(draft);
  if (invite === "government_id") return "A government ID puts a name on this file.";
  if (invite === "tax_return") {
    return "That’s how I estimate qualifying income. Suggested, not underwritten.";
  }
  if (invite === "prior_year_return") return "It helps me see if last year was stable.";
  if (invite === "paystub") return "That’s current income on paper.";
  if (invite === "w2") return "That’s last year’s wages on paper.";
  return "I can keep this file current.";
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
export const CREDIT_RANGE_ASK = "What credit range should I use for the estimate?";
export const CREDIT_RANGE_FOLLOW = "Stated range — not a pull.";
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
  if (draft.correcting) return draft.correcting;
  if (!draft.productIntent) return "product";
  if (needsJumboPurpose(draft)) return "jumbo-purpose";
  if (!draft.occupancyAsked && !draft.occupancyChoice.value) return "occupancy";
  if (purchasePriceAskNeeded(draft)) return "value";
  if (fundsAskNeeded(draft)) return "amount";
  if (refiLoanAskNeeded(draft) || (isHelocFile(draft) && !hasHelocLine(draft))) return "amount";
  if (propertyValueAskNeeded(draft)) return "value";
  if (!sketchNumberReady(draft)) {
    return draftUsesPurchasePrice(draft) && !hasPropertyValue(draft) ? "value" : "amount";
  }
  if (!creditSettled(draft)) return "credit";
  if (!incomeSettled(draft)) return "income";
  if (!draft.sampleAccepted && draft.awaitingYearsInBusiness) return "documents";
  if (nextDocInvite(draft)) return "documents";
  if (!draft.sampleAccepted) return canLooksRight(draft) ? "review" : "amount";
  return "done";
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
  if (prompt === "occupancy") {
    const prior = draft.occupancyChoice.value
      ? OCCUPANCY_BUBBLES.find((item) => item.value === draft.occupancyChoice.value)?.label
      : "";
    return {
      text: prior
        ? `Occupancy in the file is ${prior}. Still right?`
        : "How will the property be used?",
      actions: prior
        ? [...bubbles([...OCCUPANCY_BUBBLES], "occupancy"), ...keepThisActions()]
        : bubbles([...OCCUPANCY_BUBBLES], "occupancy"),
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
        : bubbles([...TIMELINE_BUBBLES], "timeline"),
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
    const prior =
      CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === draft.creditBand)?.label ?? "";
    return {
      text: prior ? `Credit in the file is ${prior}. Still right?` : CREDIT_RANGE_ASK,
      followUp: CREDIT_RANGE_FOLLOW,
      actions: prior
        ? [...bubbles([...CREDIT_WORKSPACE_BUBBLES], "creditRange"), ...keepThisActions()]
        : bubbles([...CREDIT_WORKSPACE_BUBBLES], "creditRange"),
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
    const prior =
      INCOME_BUBBLES.find((item) => item.value === draft.incomeType.value)?.label ?? "";
    return {
      text: prior ? `Income in the file is ${prior}. Still right?` : "How is income earned?",
      actions: prior
        ? [...bubbles([...INCOME_BUBBLES], "incomeType"), ...keepThisActions()]
        : bubbles([...INCOME_BUBBLES], "incomeType"),
    };
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
    const years = draft.facts?.years_in_business?.value;
    const shown = years
      ? /year/i.test(years)
        ? years
        : `${years} years`
      : "";
    return {
      text: shown
        ? `Years in business in the file is ${shown}. Still right?`
        : YEARS_IN_BUSINESS_ASK,
      actions: shown ? keepThisActions() : undefined,
    };
  }
  if (prompt === "documents") {
    if (draft.awaitingYearsInBusiness) {
      return { text: YEARS_IN_BUSINESS_ASK };
    }
    if (offeringDocStart(draft)) {
      return {
        ...sketchAndStartDocsCopy(draft),
        actions: startDocsActions(),
      };
    }
    return {
      text: documentsAskText(draft),
      actions: nextDocInvite(draft) ? docInviteActions() : undefined,
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
    return {
      text: "Tap any line on the structure.",
    };
  }
  if (prompt === "confirm-proposal") {
    if (draft.pendingConflict) {
      return {
        text: conflictAskCopy(draft.pendingConflict),
        actions: conflictActions(),
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
    return {
      text: motionAskText(draft),
      followUp: rememberedAskCopy(draft) || remind || undefined,
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
      actions: finishLineActions(draft),
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
    return { text: "What’s the down payment or loan amount? A number works." };
  }
  const price = draft.propertyValueAmount;
  const parsed = parseFundsAmount(q, price);
  if (parsed == null || (price != null && parsed.dollars > price && !parsed.asPercent)) {
    return {
      text: "What’s the down payment or loan amount? A number under the purchase price works.",
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

export function parseCreditRange(text: string): CreditRange | null {
  const lower = text.trim().toLowerCase();
  const match = CREDIT_WORKSPACE_BUBBLES.find(
    (item) => item.label.toLowerCase() === lower || item.value === lower,
  );
  if (match) return match.value as CreditRange;
  if (/760|excellent/.test(lower)) return "760+";
  if (/720|740/.test(lower)) return "720-759";
  if (/680|700/.test(lower)) return "680-719";
  if (/not sure|unsure|unknown|skip( for now)?/.test(lower)) return "not-sure";
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
  if (capture.field === "timeline") return "timeline";
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
  if (capture.field === "accept-proposal" || capture.field === "decline-proposal") {
    return "confirm-proposal";
  }
  if (capture.field === "creditRange") return "credit";
  if (capture.field === "termYears" || capture.field === "skip-term") return "term";
  if (capture.field === "incomeType") return "income";
  if (
    capture.field === "skip-docs" ||
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
  if (capture.field === "govProgram") return govProgramCopy(capture.value);
  if (capture.field === "creditEvent") return creditEventCopy();
  if (capture.field === "occupancy") {
    const label = occupancySpokenLabel(capture.value);
    return label ? `Updated occupancy to ${label}.` : "Updated occupancy.";
  }
  if (capture.field === "timeline") {
    const label = TIMELINE_BUBBLES.find((item) => item.value === capture.value)?.label;
    return label ? `Updated timeline to ${label}.` : "Updated timeline.";
  }
  if (capture.field === "loanAmount") {
    const n = Number(capture.value.split(":")[0].replace(/,/g, ""));
    const label = structureAmountLabel(draft) || "Loan amount";
    return Number.isFinite(n) && n > 0
      ? `Updated ${label.toLowerCase()} to ${formatMoney(n)}.`
      : `Updated ${label.toLowerCase()}.`;
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
  if (capture.field === "creditRange") {
    const label =
      CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === capture.value)?.label ?? capture.value;
    return `Updated credit range to ${label}.`;
  }
  if (capture.field === "termYears") {
    return `Updated term to ${capture.value} year.`;
  }
  if (capture.field === "skip-amount") {
    const label = structureAmountLabel(draft) || "Loan amount";
    return `Updated. ${label} left blank.`;
  }
  if (capture.field === "skip-value") return "Updated. Purchase price left blank.";
  if (capture.field === "skip-term") return "Updated. Term left blank.";
  if (capture.field === "incomeType") {
    const label = INCOME_BUBBLES.find((item) => item.value === capture.value)?.label;
    return label ? `Updated income to ${label}.` : "Updated income.";
  }
  if (capture.field === "skip-docs") return "Updated. Docs skipped.";
  if (capture.field === "skip-down") return "Updated. Down payment left blank.";
  if (capture.field === "keep-file-fact") return "Kept the file value.";
  if (capture.field === "use-document-fact") return "I’ll use that number.";
  return "Updated the file.";
}

export function parseWorkspaceEdit(
  text: string,
): {
  capture?: Capture;
  correct?: FoxPrompt;
  line?: string;
  confirm: string;
} | null {
  const q = text.trim();
  const lower = q.toLowerCase();
  if (!/\b(change|edit|update|set|switch)\b/.test(lower)) return null;
  if (/^(needs a correction|looks right)$/i.test(lower)) return null;

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
      const label =
        CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === range)?.label ?? range;
      return {
        capture: { field: "creditRange", value: range },
        confirm: `Updated credit range to ${label}.`,
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

  if (/\b(property value|home value|house value|worth)\b/.test(lower) || (/\bvalue\b/.test(lower) && !/\bloan\b/.test(lower))) {
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

  if (/\b(loan amount|purchase price|heloc line|loan|line|cash|payoff)\b/.test(lower)) {
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

  return null;
}

function draftAfterCapture(draft: FoxIntakeDraft, capture: Capture): FoxIntakeDraft {
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
  if (capture.field === "cashOut") return { ...next, cashOut: true };
  if (capture.field === "occupancy") {
    return { ...next, occupancyChoice: { ...draft.occupancyChoice, value: capture.value }, occupancyAsked: true };
  }
  if (capture.field === "timeline") {
    return { ...next, timelineChoice: { ...draft.timelineChoice, value: capture.value }, timelineAsked: true };
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
    return withComputedCompanion(
      withMatrixAfterAmount({
        ...next,
        valueAsked: true,
        propertyValueAmount: Number.isFinite(n) && n > 0 ? n : draft.propertyValueAmount,
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
  if (capture.field === "accept-proposal") return resolveProposal(next, "accept");
  if (capture.field === "decline-proposal") return resolveProposal(next, "decline");
  if (capture.field === "yearsInBusiness") return writeYearsInBusiness(next, capture.value);
  if (capture.field === "skip-years-in-business") return skipYearsInBusiness(next);
  if (capture.field === "qualifyingIncome") return writeQualifyingIncome(next, capture.value);
  if (capture.field === "skip-down") return { ...next, downAsked: true };
  if (capture.field === "creditRange") {
    return {
      ...next,
      creditBand: capture.value as FoxIntakeDraft["creditBand"],
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
  if (capture.field === "skip-docs") return skipCurrentInvite(next);
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
  if (namedCalifornia(text) && draft.outOfState) {
    const nextDraft = { ...draft, outOfState: false };
    return continueAfterFlag(
      "California — I can prepare this file.",
      nextDraft,
      { field: "in-state" },
    );
  }
  if (namedOutOfState(text)) {
    return {
      text: GEO_STOP_COPY,
      actions: draft.originatorRequested ? undefined : [requestHumanAction()],
      capture: { field: "out-of-state" },
    };
  }

  const gov = namedGovProgram(text);
  if (gov && draft.govProgram !== gov) {
    const nextDraft = { ...draft, govProgram: gov };
    return continueAfterFlag(govProgramCopy(gov), nextDraft, {
      field: "govProgram",
      value: gov,
    }, draft.originatorRequested ? undefined : [requestHumanAction()]);
  }

  const event = namedCreditEvent(text);
  if (event && draft.creditEvent !== event) {
    const nextDraft = { ...draft, creditEvent: event };
    return continueAfterFlag(creditEventCopy(), nextDraft, {
      field: "creditEvent",
      value: event,
    }, draft.originatorRequested ? undefined : [requestHumanAction()]);
  }

  if (namedCashOut(text) && !draft.cashOut && isRefiLike(draft)) {
    const nextDraft = { ...draft, cashOut: true };
    return continueAfterFlag(cashOutCopy(), nextDraft, { field: "cashOut" });
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
    if (looksLikeQuestion(q)) {
      return { text: "How long you’ve been running it helps me read the return. Not a form — just the file." };
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
    return { text: YEARS_IN_BUSINESS_ASK };
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
    if (/(keep (the )?file|file value|keep mine)/i.test(lower)) {
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

  if (draft.pendingProposal || prompt === "confirm-proposal") {
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
      return workspacePromptCopy("confirm-proposal", draft);
    }
  }

  if (/(approv|lock|commit to lend|am i approved)/i.test(lower)) {
    return {
      text: "I can prepare a file. I cannot approve, lock, or commit to lend.",
    };
  }

  const matrix = matrixReply(q, draft, prompt);
  if (matrix) return matrix;

  const edit = parseWorkspaceEdit(q);
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

  if (/(what is acr|what.?s acr|active credit relationship)/i.test(lower)) {
    return {
      text:
        draft.path === "loan-only"
          ? "ACR is the desk that stays open after close — letter, scout, and reward. This file is still the loan."
          : "ACR is the desk that stays open after close. Letter is originator-issued, not Fox. Scout and reward stay on the desk.",
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
      actions: finishLineActions(draft),
      capture: { field: "what-happens-next" },
    };
  }

  if (inQueueEnding(draft) && /^ask fox$/.test(lower)) {
    return {
      text: MOTION_COPY.askFox,
      actions: finishLineActions(draft),
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
    return { text: "Tap Start your relationship or Just need a mortgage." };
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
    return workspacePromptCopy("path-switch", draft);
  }

  if (prompt === "product") {
    if (draft.productIntent && isKeepThisText(q)) return keepThisReply(draft);
    const intent = productIntentFromText(q);
    if (!intent) {
      return {
        text: "What are you looking to do? Buy, refinance, HELOC, Jumbo, or something else.",
        actions: bubbles([...PRODUCT_INTENT_BUBBLES], "productIntent"),
      };
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
      return workspacePromptCopy("jumbo-purpose", draft);
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
    return workspacePromptCopy("offer-jumbo", draft);
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
    return workspacePromptCopy("offer-heloc", draft);
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
    return workspacePromptCopy("geo-stop", draft);
  }

  if (prompt === "occupancy") {
    if (draft.occupancyChoice.value && isKeepThisText(q)) return keepThisReply(draft);
    const match = occupancyFromText(q);
    if (!match) return { text: "Tap Primary, Second home, or Investment." };
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
    const nextAsk = workspacePrompt(nextDraft);
    return withWorkspaceGuide(
      {
        ...workspacePromptCopy(nextAsk === "occupancy" ? "value" : nextAsk, nextDraft),
        capture: { field: "occupancy", value: match.value },
      },
      nextDraft,
    );
  }

  if (prompt === "timeline") {
    if (draft.timelineChoice.value && isKeepThisText(q)) return keepThisReply(draft);
    const match = timelineFromText(q);
    if (!match) return { text: "Tap Ready now, 30–90 days, or Just exploring." };
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
    const nextAsk = draftUsesPurchasePrice(nextDraft) ? "value" : "amount";
    return withWorkspaceGuide(
      {
        ...workspacePromptCopy(nextAsk, nextDraft),
        capture: { field: "timeline", value: match.value },
      },
      nextDraft,
    );
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
        return {
          text: "What is that number for?",
          actions: [
            ...bubbles([...AMOUNT_PURPOSE_BUBBLES], "amountPurpose"),
            ...amountHelperActions("skip-amount"),
          ],
        };
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
      return {
        text: `${amountAskText(draft)} A number works${refiLoanAskNeeded(draft) || isHelocFile(draft) ? "." : ", or tap Not sure."}`,
        actions:
          refiLoanAskNeeded(draft) || isHelocFile(draft)
            ? undefined
            : amountHelperActions("skip-amount"),
      };
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
      return {
        text: `${amountAskText(draft)} A number works${requiredValue ? "." : ", or tap Not sure."}`,
        actions: requiredValue ? undefined : amountHelperActions("skip-value"),
      };
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
    const range = parseCreditRange(q);
    if (!range) return { text: "Tap a credit range, or Not sure." };
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
    if (term == null) return { text: "Tap 30 year, 15 year, or Skip." };
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

  if (prompt === "income") {
    if (draft.incomeType.value && isKeepThisText(q)) return keepThisReply(draft);
    const match = incomeFromText(q);
    if (!match) return { text: "Tap W-2, Self-employed, Both, or Other." };
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
      return {
        text: "What’s the monthly qualifying income? A number works.",
        actions: keepThisActions(),
      };
    }
    const nextDraft = writeQualifyingIncome(draft, String(Math.round(monthly)));
    return {
      ...nextFoxAsk(nextDraft),
      capture: { field: "qualifyingIncome", value: String(Math.round(monthly)) },
    };
  }

  if (prompt === "years-in-business") {
    if (isKeepThisText(q)) return keepThisReply(draft);
    const years = parseYearsInBusiness(q);
    if (!years) {
      return {
        text: YEARS_IN_BUSINESS_ASK,
        actions: keepThisActions(),
      };
    }
    const nextDraft = writeYearsInBusiness(draft, years);
    return {
      ...nextFoxAsk({ ...nextDraft, correcting: null, correctingLine: null }),
      capture: { field: "yearsInBusiness", value: years },
    };
  }

  if (prompt === "documents") {
    if (offeringDocStart(draft)) {
      if (/(not yet|skip|later|don'?t have|fine)/i.test(lower)) {
        const nextDraft = skipRemainingClasses(draft);
        return {
          ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
          capture: { field: "skip-docs" },
        };
      }
      if (/(start|id|upload|drop|now|add|documents)/i.test(lower)) {
        const nextDraft = { ...draft, docsStarted: true };
        return {
          ...workspacePromptCopy("documents", nextDraft),
          capture: { field: "start-docs" },
        };
      }
      return workspacePromptCopy("documents", draft);
    }
    if (/(skip|later|not yet|don'?t have|fine)/i.test(lower)) {
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
    if (looksLikeQuestion(q)) {
      return restoredAsk(documentQuestionAnswer(draft), draft);
    }
    return workspacePromptCopy("documents", draft);
  }

  if (prompt === "preparing") {
    return { text: "I’m preparing your file." };
  }

  if (prompt === "review") {
    if (/(looks right|confirm|yes|correct|good)/i.test(lower)) {
      if (!canLooksRight(draft)) {
        return {
          text: missingAmountAsk(draft) || "I still need a required amount on this file.",
        };
      }
      const nextDraft = applyLooksRightMotion(draft);
      const nextPrompt = workspacePrompt(nextDraft);
      return {
        ...workspacePromptCopy(nextPrompt === "review" ? "done" : nextPrompt, nextDraft),
        capture: { field: "confirm-draft" },
      };
    }
    if (/(correction|fix|wrong|no|edit)/i.test(lower)) {
      return { ...workspacePromptCopy("correct", draft), capture: { field: "needs-correction" } };
    }
    if (looksLikeQuestion(q)) {
      return restoredAsk("This is the file as it stands. Confirm it, or say what to change.", draft);
    }
    return workspacePromptCopy("review", draft);
  }

  if (prompt === "correct") {
    return workspacePromptCopy("correct", draft);
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

  if (prompt === "basics-done" || prompt === "done") {
    const intent = productIntentFromText(q);
    if (intent && prompt === "basics-done") {
      return {
        text: `Updated to ${productIntentLabel(intent)}.`,
        capture: { field: "productIntent", value: intent },
      };
    }
    if (prompt === "done") {
      if (/(approv|lock|commit to lend)/i.test(lower)) {
        return {
          ...workspacePromptCopy("done", draft),
          text: "I can prepare a file. I cannot approve, lock, or commit to lend.",
        };
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
      return workspacePromptCopy("done", draft);
    }
    return {
      text: "The file has the basics. Ask if you want to change anything.",
    };
  }

  return null;
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
  const credit = draft.creditBand ?? draft.scenario?.creditRange ?? SAMPLE_SAFE_CREDIT;
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

  const intent =
    draft.productIntent ??
    (() => {
      const fromSlug = productIntentFromSlug(draft.scenario?.productSlug);
      return fromSlug === "other" ? null : fromSlug;
    })();
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
    const creditLabel =
      CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === draft.creditBand)?.label ??
      "Not sure";
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

  const address = factValue(draft, "property_address");
  if (address) {
    facts.push({ id: "address", label: "Property", value: address });
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
      value: /year/i.test(yearsInBusiness) ? yearsInBusiness : `${yearsInBusiness} years`,
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
        label: "File",
        value: completeness.copy,
        note: fileStillUsefulNote(draft),
      });
    }
    const caution = guidelineCaution(draft);
    if (caution) {
      facts.push({
        id: "caution",
        label: "Note",
        value: caution,
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

/** Older qualifying-income Use this / Leave blank cards go inert when a newer one lands. */
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
      if (text === message.text && !factsChanged) return message;
      return { ...message, text, facts };
    }),
  );
}
