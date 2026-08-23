import {
  CREDIT_STATED_NOTE,
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
  nextDocInvite,
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
  HIGH_LTV_CAUTION as STORE_HIGH_LTV_CAUTION,
  HIGH_PURCHASE_LTV as STORE_HIGH_PURCHASE_LTV,
  JUMBO_CEILING_LINE,
  completeness as storeCompleteness,
  escalate as storeEscalate,
  flags as storeFlags,
  type FileFacts,
} from "@/lib/guidelines/conventional";

export const SUGGESTED_NOTE = "Suggested · not verified";
export const PROPOSED_NOTE = "Proposed · confirm";
export { SUGGESTED_INCOME_NOTE, QUALIFYING_INCOME_FIELD };
export const YEARS_IN_BUSINESS_FIELD = "years_in_business";
export const YEARS_IN_BUSINESS_ASK = "How long have you been running this?";
export const MISSING_LINE = "—";

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

function completenessDisplayCopy(state: CompletenessState, filled: number) {
  if (state === "documented") return "documented";
  return `sketch · ${filled} of ${COMPLETENESS_GROUPS.length}`;
}

export function fileCompleteness(draft: FoxIntakeDraft): CompletenessMap | null {
  if (!showsAgencyCompleteness(draft)) return null;
  const groups = {} as CompletenessMap["groups"];
  let filled = 0;
  let documentedCount = 0;
  for (const group of COMPLETENESS_GROUPS) {
    const present = groupPresent(draft, group);
    const documented = groupDocumented(draft, group);
    groups[group] = { present, documented };
    if (present) filled += 1;
    if (documented) documentedCount += 1;
  }
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
    filled,
    total: COMPLETENESS_GROUPS.length,
    groups,
    copy: completenessDisplayCopy(state, filled),
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
  return draft?.creditBand === "680-719" || draft?.scenario?.creditRange === "680-719";
}

export function factsFromDraft(draft: FoxIntakeDraft): FileFacts {
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
  } else if (purchase && draft.propertyValueAmount != null && draft.propertyValueAmount > 0) {
    loanAmount = draft.propertyValueAmount;
  }
  return {
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
    namedDistress: Boolean(draft.creditEvent),
    wantsCreditDecision: false,
    requestedHuman: Boolean(draft.originatorRequested),
    commitmentRequired: Boolean(draft.overPriceConfirmed),
    unresolvedConflict: Boolean(draft.unresolvedConflict),
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
  return field;
}

function fundsMoneyShown(field: string, value: string) {
  const shown = displayFactValue(field, value);
  if (/^-?\$/.test(shown)) return shown;
  const n = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? `$${Math.round(n).toLocaleString("en-US")}` : value;
}

export function proposalAskCopy(proposal: FactProposal) {
  const shown = displayFactValue(proposal.field, proposal.value);
  if (proposal.field === QUALIFYING_INCOME_FIELD) {
    return `From the return I’m suggesting ${shown} a month. ${SUGGESTED_INCOME_NOTE}. Use this?`;
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
      { id: "decline-proposal", label: "Leave blank", event: "bubble", capture: { field: "decline-proposal" } },
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
  if (field === "employer_name" || field === QUALIFYING_INCOME_FIELD) {
    next = { ...next, facts };
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
    return { ...draft, pendingProposal: null };
  }
  const source =
    proposal.field === QUALIFYING_INCOME_FIELD || proposal.kind === "public"
      ? "suggested"
      : proposal.kind === "computed"
        ? "computed"
        : "document";
  let next = writeConfirmedFact(draft, proposal.field, proposal.value, source);
  if (proposal.companion) {
    next = writeConfirmedFact(next, proposal.companion.field, proposal.companion.value, source);
  }
  if (proposal.field === QUALIFYING_INCOME_FIELD && proposal.parts) {
    if (proposal.parts.wage) next = writeConfirmedFact(next, WAGE_MONTHLY_FIELD, proposal.parts.wage, source);
    if (proposal.parts.scheduleC) next = writeConfirmedFact(next, SE_MONTHLY_FIELD, proposal.parts.scheduleC, source);
    if (proposal.parts.k1) next = writeConfirmedFact(next, K1_MONTHLY_FIELD, proposal.parts.k1, source);
  }
  const cleared = { ...next, pendingProposal: null };
  if (winner === "accept" && shouldAskYearsInBusiness(cleared)) {
    return withYearsInBusinessAsk(cleared);
  }
  return cleared;
}

export function yearsInBusinessValue(draft: FoxIntakeDraft) {
  return draft.facts?.[YEARS_IN_BUSINESS_FIELD]?.value ?? "";
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

export function canLooksRight(draft: FoxIntakeDraft) {
  return sketchAssembled(draft) && !nextDocInvite(draft);
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
  if (proposal && proposalId === line.id) {
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
    const band = draft.creditBand;
    const label =
      band === "760+"
        ? "760+"
        : band === "720-759"
          ? "720–759"
          : band === "680-719"
            ? "680–719"
            : band === "not-sure"
              ? "Not sure"
              : "";
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
