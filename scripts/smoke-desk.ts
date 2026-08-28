import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { greeting, promptCopy } from "../components/fox/script";
import {
  applyCapture,
  applyExtractWrite,
  applyPublicSuggestion,
  beginWorkspaceFromHero,
  applyPreviewMotionControls,
  continueWorkspaceFromEntry,
  emptyDraft,
  getFoxDraft,
  getFoxMessages,
  nudgeReview,
  receiveDocument,
  resetWorkspaceForEntry,
  startOverWorkspace,
  returnToFox,
  setFoxMessages,
  shouldResumeWorkspaceEntry,
  sitExpireReview,
  workspaceSessionStarted,
} from "../components/fox/store";
import { rateflowClientBodyFromDraft } from "../lib/rateflow/fromDraft";
import { liveRateLine, liveRateSecondLine, rateflowScenarioKey } from "../lib/rateflow/quote";
import {
  SUGGESTED_NOTE,
  SUGGESTED_INCOME_NOTE,
  SUGGESTED_DEBTS_NOTE,
  SUGGESTED_ASSETS_NOTE,
  SUGGESTED_PROPERTY_NOTE,
  SUGGESTED_TIME_ON_JOB_NOTE,
  SUGGESTED_HOUSING_NOTE,
  HIGH_LTV_CAUTION,
  PRICING_WAITS,
  YEARS_IN_BUSINESS_ASK,
  yearsInBusinessAskCopy,
  writeYearsInBusiness,
  canLooksRight,
  factsFromDraft,
  fileCompleteness,
  guidelineCaution,
  loanExceedsPurchasePrice,
  proposalAskCopy,
  remainderAskCopy,
  proposeFundsPair,
  resolveProposal,
  showsAgencyCompleteness,
  requiredStructureLines,
} from "../components/fox/completeness";
import {
  CONVENTIONAL_FILE_SLOT_TOTAL,
  assetsMatter,
  conventionalFileFromDraft,
  conventionalSlotReport,
  isSimplePrimaryW2File,
} from "../components/fox/conventionalFile";
import {
  DECLINING_INCOME_CAUTION,
  QUALIFYING_INCOME_FIELD,
  W2_BOX1_MONTHLY_NOTE,
  laterYearIncomeLower,
  monthlyFromAnnual,
  monthlyQualifyingFromExtract,
  parseExtractMoney,
  readTaxCashflows,
  applyBothMonthlyReasonAnswer,
  applyPayFrequencyAnswer,
  applyRaiseWhenAnswer,
  applyRaiseYtdFarAnswer,
  hasTwoYearWageHistory,
  scheduleCAnnual,
  stableOrDecliningAnnual,
} from "../components/fox/qualifyingIncome";
import {
  inferPayFrequency,
  k1OrdinaryMonthly,
  SECOND_JOB_SAME_STUB_NOTE,
  SECOND_JOB_THIN_NOTE,
  BOTH_MONTHLY_OT_NOTE,
  BOTH_MONTHLY_SECOND_JOB_NOTE,
  BOTH_MONTHLY_SKIP_NOTE,
  RAISE_WHEN_ASK,
  RAISE_YTD_MISSING_NOTE,
  RAISE_WHEN_UNKNOWN_NOTE,
  bothMonthlyAskCopy,
  bothMonthlyMethodNote,
  expectedRaiseYtd,
  parseBothMonthlyReason,
  parseRaiseWhen,
  proposeBothMonthlyIncome,
  proposeRaiseWeightedIncome,
  raiseWeightMonths,
  raiseWeightNote,
  raiseYtdFarAskCopy,
  raiseYtdSupportsNote,
  suggestCombinedIncome,
  suggestScheduleCIncome,
  suggestWageIncome,
  variableMonthlyAmount,
} from "../lib/income/suggest";
import {
  printedSampleFromBytes,
  printedSampleFromFilename,
  readPngPrintedLines,
  readPngVisibleLines,
} from "../lib/docs/printedSample";
import {
  CASH_OUT_CAUTION,
  CONVENTIONAL_GUIDELINE_VERSION,
  DISTRESS_LINE,
  EMPLOYER_MISMATCH_LINE,
  ESCALATE_LINE,
  GOVVIE_LINE,
  KEEP_BOTH_LINE,
  INVESTMENT_CAUTION,
  JUMBO_CEILING_LINE,
  LTV_NOT_A_DECISION,
  READINESS_STRONG,
  READINESS_UW_REVIEW,
  completeness as storeCompleteness,
  documentedStillUsefulIds,
  escalate as storeEscalate,
  flags as storeFlags,
  lookup as storeLookup,
  queryConventionalGuidelines,
  fundsShortLine,
  readinessFromFile,
  COST_LINE,
  LOAN_OVER_PRICE_TEMPLATE,
  SECOND_HOME_CAUTION,
  TWO_TO_FOUR_CAUTION,
  MANUFACTURED_CAUTION,
  CONDO_NON_WARRANTABLE_CAUTION,
  HIGH_STATED_DTI_CAUTION,
  RENTAL_NET_COST_CAUTION,
  RENTAL_UNSUPPORTED_CAUTION,
  CONDO_NEW_CONSTRUCTION_ACK,
  RENTAL_DOCS_WOULD_HELP,
  condoFlag,
  sketchedLtvFromFacts,
} from "../lib/guidelines/conventional";
import {
  netOtherPropertyFile,
  netRentalCashFlow,
  parseStatedMonthlyLease,
  rentalConfirmCopy,
  rentalNetConfirmCopy,
  fileNetConfirmCopy,
  RENTAL_NEED_HOUSING,
  RENTAL_NEED_STATEMENT,
  SUGGESTED_FILE_NET_FIELD,
  SUGGESTED_FILE_NET_NOTE,
  SUGGESTED_NET_NOTE,
  SUGGESTED_NET_RENTAL_FIELD,
  suggestLeaseRental,
  suggestScheduleERental,
} from "../lib/income/rental";
import {
  applyRentalIncomeFromExtract,
  proposeTypedLeaseRental,
  SUBJECT_LEASE_ASK,
} from "../components/fox/rentalIncome";
import { answerFromFile, foxAnswer, interpretQuestion, topicFromFile } from "../lib/guidelines/answer";
import {
  ESTIMATED_NOT_FINAL,
  HIGH_STATED_DTI,
  PI_SAMPLE_LINE,
  SAMPLE_INDICATIVE_NOT_LIVE,
  STATED_DTI_ASK,
  STATED_NOT_FROM_CREDIT,
  assetNotes,
  formatRatioPercent,
  housingConfirmCopy,
  housingEstimate,
  ltvCltv,
  monthlyPrincipalAndInterest,
  qualifyingIncomeConfirmCopy,
  rentalSuggest,
  statedDti,
} from "../lib/calculators/conventional";
import {
  draftHousingEstimate,
  draftLtvCltv,
  skipEstimatedHousing,
  syncCalculatorDraft,
  writeEstimatedHousing,
} from "../components/fox/calculators";
import {
  MOTION_COPY,
  PAYSTUB_RETURN_LINE,
  SILENT_RETURN_ERROR,
  applyLooksRightMotion,
  creditPullPermitted,
  gatheringCopy,
  gatheringList,
  motionOf,
  nextActorOf,
  openReviewWorkItem,
  reviewIsSitting,
  waitingOnOf,
} from "../components/fox/motion";
import {
  applyExtractedFields,
  EXTRACT_SCHEMA_KEYS,
  promoteExtractClass,
  conflictAskCopy,
  isDeadFileWriteLine,
  isRemainderConfirmField,
  extractClassFromFilename,
  fileStillUsefulNote,
  missingAskCopy,
  missingExtractClasses,
  preferFilenameClass,
  receivedClassOf,
  receivedTaxReturnCount,
  stillUsefulAskCopy,
  stillUsefulLabels,
  stillUsefulSection,
  nextStillUsefulItem,
  layer2Plan,
  layer2Open,
  layer2AskCopy,
  skipCurrentStillUseful,
  shortListSpeak,
  OTHER_REO_MORTGAGE_STATEMENTS,
  NOTHING_URGENT,
  taxReturnFilename,
  resolveFactConflict,
  sanitizeExtractedFields,
  skipRemainingClasses,
  slotFromFilename as slotFromName,
  nextDocInvite,
} from "../components/fox/fileWrite";
import {
  MONTHLY_DEBTS_ASK,
  parseMonthlyDebtAmount,
} from "../components/fox/monthlyDebts";
import {
  AVAILABLE_ASSETS_ASK,
  BANK_STATEMENT_ASK,
  parseAvailableAssetsAmount,
  skipAvailableAssets,
} from "../components/fox/availableAssets";
import {
  PURCHASE_ADDRESS_ASK,
  PROPERTY_TYPE_ASK,
  parsePropertyType,
  proposeSubjectAddress,
  skipSubjectAddress,
  writeSubjectAddress,
} from "../components/fox/propertyType";
import {
  TIME_ON_JOB_ASK,
  displayTimeOnJob,
  parseHireDate,
  parseTimeOnJobMonths,
  writeStatedTimeOnJob,
} from "../components/fox/timeOnJob";
import {
  CURRENT_HOUSING_ASK,
  parseCurrentHousingAmount,
} from "../components/fox/currentHousing";
import {
  DECLARATION_TIMING_ASK,
  DECLARATIONS_ASK,
  SUGGESTED_DECLARATION_NOTE,
  parseDeclarationTiming,
  parseDeclarations,
} from "../components/fox/declarations";
import {
  HOUSEHOLD_ASK,
  SUGGESTED_HOUSEHOLD_NOTE,
  parseHousehold,
} from "../components/fox/household";
import { COBORROWER_HANDOFF } from "../components/fox/coborrowerName";
import {
  BORROWER_NAME_ASK,
  SUGGESTED_BORROWER_NOTE,
  parseBorrowerName,
  skipBorrowerName,
} from "../components/fox/borrowerName";
import {
  OTHER_REO_ASK,
  SUGGESTED_OTHER_REO_NOTE,
  applyTypedOtherPropertyRent,
  applyTypedOtherPropertyRental,
  draftOtherPropertyFileNet,
  otherPropertyPaymentConfirmCopy,
  otherReoRows,
  parseOtherPropertyRent,
  parseOtherPropertyRental,
  parseOtherReo,
  writeStatedOtherReo,
} from "../components/fox/otherReo";
import { CITIZENSHIP_ASK, skipCitizenship, writeCitizenship } from "../components/fox/citizenship";
import {
  FORMER_HISTORY_ASK,
  WHERE_BEFORE_ASK,
  skipFormerHistory,
  whoBeforeAsk,
  writeFormerHistoryNote,
} from "../components/fox/fileHistory";
import {
  STAFF_EXPORT_BORROWER_COPY,
  derivedExportStatus,
  exportGaps,
  exportSketchReady,
  fileExportOf,
  fnma32Text,
  mappedFileFacts,
  mappedJsonText,
  markExported,
} from "../components/fox/staffExport";
import { scrollDeltaToClearAsk, scrollDeltaToFollowLastLine } from "../components/fox/askReveal";
import { subjectMortgagePayment } from "../components/fox/monthlyDebts";
import { FAILED_READ_NOTE } from "../lib/docs/accept";
import { classifyAndExtract, imageDataUrl, visionChatBody } from "../lib/docs/extract";
import {
  CREDIT_WORKSPACE_BUBBLES,
  FOX_DISCLOSURE,
  PRODUCT_INTENT_BUBBLES,
} from "../components/fox/types";
import {
  amountAskText,
  composerAmountHint,
  composerPlaceholder,
  docsRequestForIncome,
  editLineFromCapture,
  editPromptFromCapture,
  formatLiveMoneyInput,
  FHFA_HIGH_COST_CEILING_2026,
  fileScenarioRows,
  fileSummaryFacts,
  GEO_STOP_COPY,
  HOLD_DOCS_COPY,
  HOLD_DOCS_ASK_FOX,
  holdDocsAskFox,
  CORRECT_ASK,
  HELOC_OFFER_COPY,
  JUMBO_OFFER_COPY,
  loanOverPriceCopy,
  JUMBO_PURPOSE_ASK,
  lastFoxTurn,
  loanLooksAboveCeiling,
  migrateRestoredFoxMessages,
  inertSupersededIncomeConfirms,
  namedOutOfState,
  parseFundsAmount,
  parseWorkspaceEdit,
  parseCreditRange,
  CREDIT_RANGE_ASK,
  CREDIT_RANGE_FOLLOW,
  CREDIT_STATED_NOTE,
  PATH_ASK_TEXT,
  COST_COPY,
  ACR_BENEFITS_COPY,
  TIMELINE_COPY,
  PHONE_COPY,
  W2_TAX_RETURN_COPY,
  previewFacts,
  previewRateApplies,
  PRICING_WHEN_READY,
  productIntentFromText,
  productIntentFromAction,
  openingProductAskOpen,
  REWARD_PREPARED_COPY,
  productIntentFromQuery,
  sampleRateApplies,
  structureAmountLabel,
  PREVIEW_RATE_NOTE,
  SAMPLE_RATE_LABEL,
  slotFromFilename,
  starterText,
  statusCopy,
  structureExplainCopy,
  structureFixPrompt,
  workspaceGreeting,
  workspacePrompt,
  workspacePromptCopy,
  workspaceReply,
  persistGuidelineNote,
  docReactionAsk,
  nextFoxAsk,
  shouldDeferStillUsefulAsk,
  parseYearsInBusiness,
  workspaceUpdateCopy,
  skipCurrentInvite,
  DOC_INVITE_COPY,
  beginFileEdit,
} from "../components/fox/workspace";
import { HOME_FOX_LINE, HOME_IDLE_TEXT, homePathActions, homeProductActions } from "../components/fox/homeIdle";
import { assertOnyxFixtures } from "./assert-onyx-fixtures";

assertOnyxFixtures();

function draft(partial: Record<string, unknown> = {}) {
  return { ...emptyDraft(), workspaceFlow: true, ...partial };
}

function onStep(base: ReturnType<typeof draft>, prompt: string) {
  return draft({ ...base, correcting: prompt, correctingLine: prompt });
}

function extractedDoc(
  name: string,
  extractClass: "paystub" | "w2" | "tax_return",
  status: "received" | "extracted" = "extracted",
) {
  const slot = extractClass === "w2" ? "w2" : extractClass === "paystub" ? "paystubs" : "other";
  return {
    slot,
    name,
    type: "image/png",
    size: 4000,
    receivedAt: `${name}-${status}`,
    status,
    extractClass: status === "extracted" ? extractClass : undefined,
  };
}

function queuedMidConfirm(live: Parameters<typeof nextFoxAsk>[0]) {
  return {
    ...live,
    sampleAccepted: true,
    motion: "in_queue" as const,
    pendingFinish: "proceed" as const,
  };
}

function assertIncomeChipsHoldOverQueue(live: Parameters<typeof nextFoxAsk>[0], amount: RegExp) {
  assert.equal(shouldDeferStillUsefulAsk(live), true);
  assert.equal(workspacePrompt(live), "confirm-proposal");
  const latest = nextFoxAsk(live);
  assert.match(latest.text, amount);
  assert.ok((latest.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok((latest.actions ?? []).some((item) => item.label === "Change"));
  assert.notEqual(latest.text, MOTION_COPY.in_queue);
  assert.doesNotMatch(latest.text, /ONYX has this for review/);
  const queued = queuedMidConfirm(live);
  assert.equal(shouldDeferStillUsefulAsk(queued), true);
  assert.equal(workspacePrompt(queued), "confirm-proposal");
  const queuedAsk = nextFoxAsk(queued);
  assert.match(queuedAsk.text, amount);
  assert.ok((queuedAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok((queuedAsk.actions ?? []).some((item) => item.label === "Change"));
  assert.notEqual(queuedAsk.text, MOTION_COPY.in_queue);
  assert.doesNotMatch(queuedAsk.text, /ONYX has this for review/);
  const afterUse = resolveProposal(queued, "accept");
  assert.equal(shouldDeferStillUsefulAsk(afterUse), false);
  assert.equal(afterUse.pendingProposal, null);
  const afterLeave = resolveProposal(queued, "decline");
  assert.equal(shouldDeferStillUsefulAsk(afterLeave), false);
  assert.equal(afterLeave.pendingProposal, null);
}

function skipDocInvites(base: ReturnType<typeof draft>) {
  let next: ReturnType<typeof draft> = base;
  for (let i = 0; i < 8; i += 1) {
    if (workspacePrompt(next) === "borrower-name") {
      next = skipBorrowerName(next);
      continue;
    }
    if (workspacePrompt(next) !== "documents" && !nextDocInvite(next)) break;
    next = { ...next, ...skipCurrentInvite(next) };
  }
  return next;
}

function readyForReview(base: ReturnType<typeof draft>) {
  return skipAvailableAssets(skipCitizenship(skipSubjectAddress(skipDocInvites(base))));
}

function afterProceed(
  base: ReturnType<typeof draft>,
  extra: Record<string, unknown> = {},
) {
  return draft({
    ...base,
    sampleAccepted: true,
    motion: "in_queue",
    nextActor: "ONYX",
    workspaceDraftStatus: "with-originator",
    phase: "confirmed",
    events: [
      {
        id: "proceed-1",
        at: "2026-08-20T00:00:00.000Z",
        kind: "proceed",
        text: "Proceed — review work item opened. Next = ONYX.",
      },
    ],
    ...extra,
  });
}

function confirmLooksRight() {
  const skips: Record<string, { field: string }> = {
    "time-on-job": { field: "skip-time-on-job" },
    "years-in-business": { field: "skip-years-in-business" },
    housing: { field: "skip-housing" },
    debts: { field: "skip-monthly-debts" },
    assets: { field: "skip-available-assets" },
    "property-type": { field: "skip-property-type" },
    "property-address": { field: "skip-property-address" },
    "current-housing": { field: "skip-current-housing" },
    declarations: { field: "skip-declarations" },
    "declaration-timing": { field: "skip-declaration-timing" },
    household: { field: "skip-household" },
    "coborrower-name": { field: "skip-coborrower-name" },
    "borrower-name": { field: "skip-borrower-name" },
    "other-reo": { field: "skip-other-reo" },
    citizenship: { field: "skip-citizenship" },
    "former-history": { field: "skip-former-history" },
  };
  for (let i = 0; i < 20; i += 1) {
    const prompt = workspacePrompt(getFoxDraft());
    if (prompt === "review") break;
    const capture = skips[prompt];
    if (capture) {
      applyCapture(capture as Parameters<typeof applyCapture>[0]);
      continue;
    }
    if (prompt === "documents" || nextDocInvite(getFoxDraft())) {
      applyCapture({ field: "skip-docs" });
      continue;
    }
    break;
  }
  if (workspacePrompt(getFoxDraft()) === "review" || canLooksRight(getFoxDraft())) {
    applyCapture({ field: "confirm-draft" });
  }
  for (let i = 0; i < 8; i += 1) {
    const prompt = workspacePrompt(getFoxDraft());
    if (prompt === "household") {
      applyCapture({ field: "skip-household" });
      continue;
    }
    if (prompt === "coborrower-name") {
      applyCapture({ field: "skip-coborrower-name" });
      continue;
    }
    if (prompt === "property-type") {
      applyCapture({ field: "skip-property-type" });
      continue;
    }
    if (prompt === "property-address") {
      applyCapture({ field: "skip-property-address" });
      continue;
    }
    if (prompt === "citizenship") {
      applyCapture({ field: "skip-citizenship" });
      continue;
    }
    if (prompt === "assets") {
      applyCapture({ field: "skip-available-assets" });
      continue;
    }
    if (prompt === "former-history") {
      applyCapture({ field: "skip-former-history" });
      continue;
    }
    break;
  }
  return getFoxDraft();
}

function withIncome(
  base: ReturnType<typeof draft>,
  value: "w2" | "self-employed" | "both" | "other" = "w2",
) {
  return draft({
    ...base,
    incomeAsked: true,
    monthlyDebtsAsked: true,
    availableAssetsAsked: true,
    propertyTypeAsked: true,
    timeOnJobAsked: value === "w2" || value === "both" ? true : undefined,
    yearsInBusinessAsked: value === "self-employed" || value === "both" ? true : undefined,
    currentHousingAsked: true,
    declarationAsked: true,
    householdAsked: true,
    borrowerNameAsked: true,
    otherReoAsked: true,
    incomeType: { ...emptyDraft().incomeType, value },
  });
}

function withPurchaseFunds(
  base: ReturnType<typeof draft>,
  price = 1_200_000,
  down = 240_000,
  loan = 960_000,
) {
  return draft({
    ...base,
    valueAsked: true,
    propertyValueAmount: price,
    downAsked: true,
    downPaymentAmount: down,
    amountAsked: true,
    loanAmountValue: loan,
  });
}

function withRefiFunds(
  base: ReturnType<typeof draft>,
  loan = 640_000,
  value = 900_000,
) {
  return draft({
    ...base,
    amountAsked: true,
    loanAmountValue: loan,
    valueAsked: true,
    propertyValueAmount: value,
  });
}

function capturePurchaseFunds(price = "1200000", loan = "960000") {
  applyCapture({ field: "propertyValue", value: price });
  applyCapture({ field: "loanAmount", value: loan });
  if (getFoxDraft().pendingProposal) applyCapture({ field: "accept-proposal" });
}

const chips = PRODUCT_INTENT_BUBBLES.map((item) => item.value);
assert.deepEqual(chips, ["buy", "refinance", "heloc", "jumbo", "other"]);
assert.equal(productIntentFromQuery("use-equity"), "heloc");
assert.equal(sampleRateApplies("buy"), true);
assert.equal(sampleRateApplies("heloc"), false);

const idle = homePathActions();
assert.deepEqual(
  idle.map((item) => item.label),
  ["Start your relationship", "Just need a mortgage"],
);
assert.ok(idle[0]?.href?.includes("path=acr") && idle[0]?.href?.includes("fresh=1"));
assert.ok(idle[1]?.href?.includes("path=loan") && idle[1]?.href?.includes("fresh=1"));
assert.ok(!HOME_IDLE_TEXT.toLowerCase().includes("equity"));
assert.equal(HOME_IDLE_TEXT, "Ask ONYX Fox");

const homeStart = workspaceGreeting(draft());
assert.equal(homeStart.text, PATH_ASK_TEXT);
assert.deepEqual(
  (homeStart.actions ?? []).map((item) => item.label),
  ["Start your relationship", "Just need a mortgage"],
);
assert.ok(!/opening your file/i.test(homeStart.text));
const homeGreet = greeting("home", null, draft());
assert.equal(homeGreet.text, HOME_IDLE_TEXT);
assert.deepEqual(homeGreet.actions ?? [], []);
assert.ok(!/start a relationship, or just the loan/i.test(homeGreet.text));
assert.equal(greeting("start", null, draft()).text, PATH_ASK_TEXT);

const typedBuy = workspaceReply("I want to buy", draft());
assert.equal(typedBuy?.capture?.field, "productIntent");
assert.equal(typedBuy?.capture && "value" in typedBuy.capture ? typedBuy.capture.value : "", "buy");
assert.ok(!/i can prepare a file/i.test(typedBuy?.text ?? ""));
assert.equal(workspacePrompt(draft({ productIntent: "buy" })), "intent");
assert.deepEqual(
  (typedBuy?.actions ?? []).map((item) => item.label),
  ["Start your relationship", "Just need a mortgage"],
);

const buyThenPath = workspaceReply("Start your relationship", draft({ productIntent: "buy" }));
assert.equal(buyThenPath?.capture?.field, "path");
assert.equal(buyThenPath?.capture && "value" in buyThenPath.capture ? buyThenPath.capture.value : "", "acr");
assert.ok(/how will the property be used/i.test(buyThenPath?.text ?? ""));
assert.ok(!/opening your file/i.test(buyThenPath?.text ?? ""));
assert.deepEqual(
  homeProductActions("acr").map((item) => item.label),
  ["Buy", "Refinance", "HELOC", "Jumbo", "Other"],
);

const withPath = draft({ path: "acr" });
assert.equal(workspacePrompt(withPath), "product");
assert.ok(starterText("acr").includes("We’ll keep this desk open after close"));
assert.equal(
  starterText("loan-only"),
  "This is the loan. ACR is optional if you want the desk later.",
);

const greetAcr = workspaceGreeting(withPath);
assert.ok(!greetAcr.text.includes(FOX_DISCLOSURE));
assert.ok(!(greetAcr.followUp ?? "").includes(FOX_DISCLOSURE));
const greetLoan = workspaceGreeting(draft({ path: "loan-only" }));
assert.equal(greetLoan.text, starterText("loan-only"));
assert.ok(!(greetLoan.followUp ?? "").includes(FOX_DISCLOSURE));

const productAsk = workspacePromptCopy("product", withPath);
assert.deepEqual(
  (productAsk.actions ?? []).map((item) => item.label),
  ["Buy", "Refinance", "HELOC", "Jumbo", "Other"],
);

const afterProduct = draft({ path: "acr", productIntent: "buy" });
assert.equal(workspacePrompt(afterProduct), "occupancy");
const typedBuyAcr = workspaceReply("I want to buy", withPath);
assert.equal(typedBuyAcr?.capture?.field, "productIntent");
assert.equal(typedBuyAcr?.capture && "value" in typedBuyAcr.capture ? typedBuyAcr.capture.value : "", "buy");
assert.doesNotMatch(typedBuyAcr?.text ?? "", /^Buy\./);
assert.doesNotMatch(typedBuyAcr?.text ?? "", /Buy\. How will the property be used/i);
assert.match(typedBuyAcr?.text ?? "", /how will the property be used/i);
assert.notEqual(typedBuyAcr?.capture?.field, undefined);
const typedHouse = workspaceReply("Buy a house", withPath);
assert.equal(typedHouse?.capture?.field, "productIntent");
const typedDownOnPrice = workspaceReply("20% down on 850k", withPath);
assert.equal(typedDownOnPrice?.capture?.field, "starter");
assert.equal(
  typedDownOnPrice?.capture && "value" in typedDownOnPrice.capture ? typedDownOnPrice.capture.value : "",
  "buy",
);
assert.equal(
  typedDownOnPrice?.capture && "price" in typedDownOnPrice.capture ? typedDownOnPrice.capture.price : "",
  "850000",
);
assert.match(typedDownOnPrice?.text ?? "", /how will the property be used|purchase price|down payment/i);
const typedRefi = workspaceReply("refinance", withPath);
assert.equal(typedRefi?.capture?.field, "productIntent");
assert.equal(typedRefi?.capture && "value" in typedRefi.capture ? typedRefi.capture.value : "", "refinance");
const unclearProduct = workspaceReply("not sure yet", withPath);
assert.equal(unclearProduct?.capture, undefined);
assert.match(unclearProduct?.text ?? "", /I can take Buy, Refinance, HELOC, Jumbo, or Other/);
assert.doesNotMatch(unclearProduct?.text ?? "", /I can keep this file current\. Ask anything/);
assert.match(unclearProduct?.text ?? "", /prepare your relationship file|looking to do/i);
assert.ok((unclearProduct?.actions ?? []).some((item) => item.label === "Buy"));

for (const value of ["buy", "refinance", "heloc", "jumbo"] as const) {
  const tapped = workspaceReply(value === "heloc" ? "HELOC" : value[0].toUpperCase() + value.slice(1), draft({ path: "acr" }));
  const tappedValue = tapped?.capture && "value" in tapped.capture ? tapped.capture.value : "";
  assert.equal(tapped?.capture?.field, "productIntent");
  assert.equal(tappedValue, value);
  assert.notEqual(tappedValue, "other");
  const painted = previewFacts(draft({ path: "acr", productIntent: value }));
  assert.ok(painted.some((fact) => fact.id === "product" && fact.value !== "Other"));
  assert.equal(painted.find((fact) => fact.id === "product")?.value, value === "heloc" ? "HELOC" : value[0].toUpperCase() + value.slice(1));
}

const firstPaintAsk = workspacePromptCopy("product", draft({ path: "acr" }));
assert.match(firstPaintAsk.text, /I can prepare your relationship file/);
const firstPaintChips = firstPaintAsk.actions ?? [];
assert.deepEqual(
  firstPaintChips.map((item) => item.label),
  ["Buy", "Refinance", "HELOC", "Jumbo", "Other"],
);
assert.deepEqual(
  firstPaintChips.map((item) =>
    item.capture && "value" in item.capture ? item.capture.value : "",
  ),
  ["buy", "refinance", "heloc", "jumbo", "other"],
);
assert.ok(firstPaintChips.every((item) => item.capture?.field === "productIntent"));
assert.equal(productIntentFromAction({ label: "Refinance", capture: { field: "productIntent", value: "buy" } }), "refinance");
assert.equal(productIntentFromAction({ label: "HELOC", capture: { field: "productIntent", value: "buy" } }), "heloc");
assert.equal(productIntentFromAction({ label: "Jumbo", capture: { field: "productIntent", value: "buy" } }), "jumbo");
assert.equal(productIntentFromAction({ label: "Buy", capture: { field: "productIntent", value: "buy" } }), "buy");
assert.equal(
  productIntentFromAction({ label: "Other", capture: { field: "citizenship", value: "other" } }),
  null,
);
assert.equal(
  productIntentFromAction({ label: "US citizen", capture: { field: "citizenship", value: "us_citizen" } }),
  null,
);
assert.equal(
  productIntentFromAction({ label: "Refinance", href: "/start?path=acr&intent=refinance" }),
  "refinance",
);
const idlePurchaseFacts = previewFacts(
  draft({
    path: "acr",
    scenario: { zip: "90001", purpose: "purchase", productSlug: "conventional-purchase", productName: "Conventional Purchase" },
  }),
);
assert.ok(!idlePurchaseFacts.some((fact) => fact.id === "product"));
resetWorkspaceForEntry("acr");
assert.equal(getFoxDraft().productIntent, undefined);
const staleBuyChips = firstPaintChips.map((item) => ({
  ...item,
  capture: { field: "productIntent" as const, value: "buy" as const },
}));
assert.ok(staleBuyChips.every((item) => item.capture?.value === "buy"));
const rebound = migrateRestoredFoxMessages([
  { id: "open", role: "fox", text: firstPaintAsk.text, actions: staleBuyChips },
]);
assert.deepEqual(
  (rebound[0]?.actions ?? []).map((item) =>
    item.capture && "value" in item.capture ? item.capture.value : "",
  ),
  ["buy", "refinance", "heloc", "jumbo", "other"],
);
assert.equal(
  openingProductAskOpen(getFoxDraft(), [
    { id: "open", role: "fox", text: firstPaintAsk.text, actions: firstPaintChips },
  ]),
  true,
);
applyCapture({ field: "productIntent", value: "buy" });
assert.equal(getFoxDraft().productIntent, "buy");
setFoxMessages([{ id: "open", role: "fox", text: firstPaintAsk.text, actions: staleBuyChips }]);
const clearedIdle = continueWorkspaceFromEntry("acr", null);
assert.equal(clearedIdle.productIntent, undefined);
assert.equal(workspacePrompt(clearedIdle), "product");
const refiChip = rebound[0]?.actions?.find((item) => item.label === "Refinance");
assert.equal(refiChip?.capture && "value" in refiChip.capture ? refiChip.capture.value : "", "refinance");
applyCapture({ field: "productIntent", value: "Refinance" as "refinance" });
assert.equal(getFoxDraft().productIntent, "refinance");
applyCapture({ field: "occupancy", value: "primary" });
assert.equal(workspacePrompt(getFoxDraft()), "timeline");
applyCapture({ field: "timeline", value: "ready-now" });
assert.equal(workspacePrompt(getFoxDraft()), "amount");
assert.equal(amountAskText(getFoxDraft()), "What’s the approximate loan or payoff amount?");
assert.doesNotMatch(amountAskText(getFoxDraft()), /purchase price|down payment or loan amount/i);
resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
setFoxMessages([{ id: "open", role: "fox", text: firstPaintAsk.text, actions: firstPaintChips }]);
const urlRefi = continueWorkspaceFromEntry("acr", "refinance");
assert.equal(urlRefi.productIntent, "refinance");
assert.equal(workspacePrompt(urlRefi), "timeline");
applyCapture({ field: "timeline", value: "ready-now" });
assert.equal(workspacePrompt(getFoxDraft()), "amount");
assert.equal(amountAskText(getFoxDraft()), "What’s the approximate loan or payoff amount?");
resetWorkspaceForEntry("acr");
for (const value of ["buy", "refinance", "heloc", "jumbo"] as const) {
  const chip = firstPaintChips.find((item) =>
    item.capture && "value" in item.capture ? item.capture.value === value : false,
  );
  assert.ok(chip, value);
  resetWorkspaceForEntry("acr");
  applyCapture({ field: "productIntent", value: value });
  assert.equal(getFoxDraft().productIntent, value);
  if (value === "buy") {
    applyCapture({ field: "occupancy", value: "primary" });
    assert.equal(workspacePrompt(getFoxDraft()), "timeline");
    applyCapture({ field: "timeline", value: "ready-now" });
    assert.equal(workspacePrompt(getFoxDraft()), "value");
    assert.match(nextFoxAsk(getFoxDraft()).text, /purchase price/);
  }
  if (value === "refinance") {
    applyCapture({ field: "occupancy", value: "primary" });
    assert.equal(workspacePrompt(getFoxDraft()), "timeline");
    applyCapture({ field: "timeline", value: "ready-now" });
    assert.match(nextFoxAsk(getFoxDraft()).text, /loan or payoff/);
    assert.doesNotMatch(nextFoxAsk(getFoxDraft()).text, /purchase price/);
  }
  if (value === "heloc") {
    applyCapture({ field: "occupancy", value: "primary" });
    assert.equal(workspacePrompt(getFoxDraft()), "timeline");
    applyCapture({ field: "timeline", value: "ready-now" });
    assert.match(nextFoxAsk(getFoxDraft()).text, /line or cash/i);
  }
  if (value === "jumbo") {
    assert.equal(workspacePrompt(getFoxDraft()), "jumbo-purpose");
  }
}

assert.equal(productIntentFromText("I want to buy"), "buy");
assert.equal(productIntentFromText("Buy a house"), "buy");
assert.equal(productIntentFromText("20% down on 850k"), "buy");
assert.equal(productIntentFromText("looking to refinance"), "refinance");
assert.equal(productIntentFromText("need a HELOC"), "heloc");
assert.equal(productIntentFromText("this is jumbo"), "jumbo");
assert.equal(productIntentFromText("I have other questions about buying"), "buy");
assert.equal(productIntentFromText("I have other plans"), null);
assert.equal(productIntentFromText("other"), "other");
assert.equal(workspaceReply("I have other plans", draft({ path: "acr" }))?.capture, undefined);

const afterOcc = draft({
  path: "acr",
  productIntent: "buy",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
});
assert.equal(workspacePrompt(afterOcc), "timeline");
assert.notEqual(workspacePrompt(afterOcc), "value");
assert.equal(workspacePromptCopy("timeline", afterOcc).text, "What’s the timeline?");
const occThenTimeline = workspaceReply("Primary", draft({ path: "acr", productIntent: "buy" }));
assert.equal(occThenTimeline?.capture?.field, "occupancy");
assert.match(occThenTimeline?.text ?? "", /timeline/i);
assert.doesNotMatch(occThenTimeline?.text ?? "", /^Primary\.|Primary\. What’s the purchase price/i);
assert.ok((occThenTimeline?.actions ?? []).some((item) => item.label === "Ready now"));
assert.ok((occThenTimeline?.actions ?? []).some((item) => item.label === "Skip"));
assert.ok((workspacePromptCopy("occupancy", draft({ path: "acr", productIntent: "buy" })).text ?? "").trim());
assert.ok(
  (workspacePromptCopy("product", draft({ path: "acr" })).actions ?? []).some((item) => item.label === "Buy"),
);
assert.ok((workspacePromptCopy("product", draft({ path: "acr" })).text ?? "").trim());

const afterTime = draft({
  path: "loan-only",
  productIntent: "heloc",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
});
assert.equal(workspacePrompt(afterTime), "amount");

const buyAfterOcc = workspaceReply("Primary", draft({ path: "acr", productIntent: "buy" }));
assert.equal(buyAfterOcc?.capture?.field, "occupancy");
assert.match(buyAfterOcc?.text ?? "", /What’s the timeline\?/);
assert.doesNotMatch(buyAfterOcc?.text ?? "", /Product in the file is Buy/);
assert.doesNotMatch(buyAfterOcc?.text ?? "", /^Primary\./);
assert.doesNotMatch(buyAfterOcc?.text ?? "", /rough amount|^what’s a rough amount/i);
assert.ok(!(buyAfterOcc?.actions ?? []).some((item) => item.label === "Refinance"));
const afterPrimaryBuy = draft({
  path: "acr",
  productIntent: "buy",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
});
assert.equal(workspacePrompt(afterPrimaryBuy), "timeline");
assert.doesNotMatch(workspacePromptCopy("timeline", afterPrimaryBuy).text, /Product in the file/);
assert.ok(!(workspacePromptCopy("timeline", afterPrimaryBuy).actions ?? []).some((item) => item.label === "Refinance"));
const afterPrimaryTimeline = draft({
  ...afterPrimaryBuy,
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
});
assert.equal(workspacePrompt(afterPrimaryTimeline), "value");
const typedPriceStayBuy = workspaceReply("850000", afterPrimaryTimeline);
assert.equal(typedPriceStayBuy?.capture?.field, "propertyValue");
assert.equal(
  typedPriceStayBuy?.capture && "value" in typedPriceStayBuy.capture ? typedPriceStayBuy.capture.value : "",
  "850000",
);
assert.notEqual(typedPriceStayBuy?.capture?.field, "productIntent");
assert.notEqual(typedPriceStayBuy?.capture?.field, "loanAmount");
const typedPriceOnProductAsk = workspaceReply("850000", {
  ...afterPrimaryTimeline,
  correcting: "product",
});
assert.equal(typedPriceOnProductAsk?.capture?.field, "propertyValue");
assert.notEqual(typedPriceOnProductAsk?.capture?.field, "productIntent");
assert.equal(productIntentFromText("850000"), null);
assert.equal(productIntentFromText("850,000"), null);

const refiAfterTime = draft({
  path: "acr",
  productIntent: "refinance",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
});
assert.equal(workspacePrompt(refiAfterTime), "amount");
assert.equal(amountAskText(refiAfterTime), "What’s the approximate loan or payoff amount?");
assert.doesNotMatch(amountAskText(refiAfterTime), /rough amount|What’s a rough|^\s*What’s an amount/i);

const helocAfterTime = draft({
  path: "loan-only",
  productIntent: "heloc",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
});
assert.equal(workspacePrompt(helocAfterTime), "amount");
assert.equal(amountAskText(helocAfterTime), "What line or cash do you need?");
assert.doesNotMatch(amountAskText(helocAfterTime), /rough amount|^\s*what’s a rough/i);

const afterPrice = draft({
  path: "acr",
  productIntent: "buy",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  valueAsked: true,
  propertyValueAmount: 1200000,
});
assert.equal(workspacePrompt(afterPrice), "amount");
assert.equal(amountAskText(afterPrice), "What’s the down payment or loan amount?");
assert.notEqual(workspacePrompt(afterPrice), "credit");
assert.notEqual(workspacePrompt(afterPrice), "review");
assert.ok(!canLooksRight(afterPrice));
const looksRightTooSoon = workspaceReply("Looks right", afterPrice);
assert.notEqual(looksRightTooSoon?.capture?.field, "confirm-draft");
assert.match(looksRightTooSoon?.text ?? "", /down payment or loan amount/i);
const fundsReply = workspaceReply("240000 down", afterPrice);
assert.equal(fundsReply?.capture?.field, "downPayment");
assert.match(fundsReply?.text ?? "", /loan amount would be/i);
assert.match(fundsReply?.text ?? "", /\$960,000/);
assert.doesNotMatch(fundsReply?.text ?? "", /would be 960000 /);
assert.ok((fundsReply?.actions ?? []).some((item) => item.label === "Use this"));
assert.equal(composerAmountHint(afterPrice), "down payment, percent, or loan amount");
assert.doesNotMatch(composerAmountHint(afterPrice), /purchase price/i);
assert.equal(editPromptFromCapture({ field: "propose-funds", value: "170000:680000" }), "amount");
assert.equal(editLineFromCapture({ field: "propose-funds", value: "170000:680000" }), "down");
assert.equal(editLineFromCapture({ field: "downPayment", value: "170000" }), "down");
assert.equal(formatLiveMoneyInput("$20"), "$20");
assert.equal(formatLiveMoneyInput("20%"), "20%");
assert.equal(formatLiveMoneyInput("170000"), "170,000");
assert.equal(parseFundsAmount("20", 850000)?.asPercent, true);
assert.equal(parseFundsAmount("20", 850000)?.dollars, 170000);
assert.equal(parseFundsAmount("20%", 850000)?.dollars, 170000);
assert.equal(parseFundsAmount("20 percent", 850000)?.dollars, 170000);
assert.equal(parseFundsAmount("170000", 850000)?.asPercent, false);
assert.equal(parseFundsAmount("170k", 850000)?.dollars, 170000);
assert.equal(parseFundsAmount("$20", 850000)?.dollars, 20);
assert.equal(parseFundsAmount("$20", 850000)?.explicitDollars, true);
assert.equal(parseFundsAmount("20 dollars", 850000)?.dollars, 20);
assert.notEqual(parseFundsAmount("20", 850000)?.dollars, 20);

const priced850 = draft({ ...afterPrice, propertyValueAmount: 850000 });
const percent20 = workspaceReply("20", priced850);
assert.equal(percent20?.capture?.field, "propose-funds");
assert.equal(percent20?.capture && "value" in percent20.capture ? percent20.capture.value : "", "170000:680000");
assert.match(percent20?.text ?? "", /\$170,000 down · \$680,000 loan/i);
assert.ok((percent20?.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((percent20?.actions ?? []).some((item) => item.label === "Change"));
assert.equal(priced850.downPaymentAmount, undefined);
assert.equal(priced850.loanAmountValue, undefined);
const percent20pct = workspaceReply("20%", priced850);
assert.equal(percent20pct?.capture?.field, "propose-funds");
assert.match(percent20pct?.text ?? "", /\$170,000 down · \$680,000 loan/i);
const percent20word = workspaceReply("20 percent", priced850);
assert.equal(percent20word?.capture?.field, "propose-funds");
const dollars170 = workspaceReply("170000", priced850);
assert.equal(dollars170?.capture?.field, "downPayment");
assert.equal(dollars170?.capture && "value" in dollars170.capture ? dollars170.capture.value : "", "170000");
const dollars170k = workspaceReply("170k", priced850);
assert.equal(dollars170k?.capture?.field, "downPayment");
assert.match(dollars170k?.text ?? "", /\$680,000/);
const tiny20 = workspaceReply("$20", priced850);
assert.equal(tiny20?.capture?.field, "propose-funds");
assert.match(tiny20?.text ?? "", /\$20 down/i);
assert.doesNotMatch(tiny20?.text ?? "", /\$170,000 down/);
const tiny20words = workspaceReply("20 dollars", priced850);
assert.equal(tiny20words?.capture?.field, "propose-funds");
assert.match(tiny20words?.text ?? "", /\$20 down/i);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "850000" });
const beforePercent = {
  productIntent: getFoxDraft().productIntent,
  occupancy: getFoxDraft().occupancyChoice.value,
  timeline: getFoxDraft().timelineChoice.value,
  price: getFoxDraft().propertyValueAmount,
};
const typed20 = workspaceReply("20", getFoxDraft());
assert.equal(typed20?.capture?.field, "propose-funds");
if (typed20?.capture) applyCapture(typed20.capture);
assert.equal(getFoxDraft().downPaymentAmount, undefined);
assert.equal(getFoxDraft().loanAmountValue, undefined);
assert.match(proposalAskCopy(getFoxDraft().pendingProposal!), /\$170,000 down · \$680,000 loan/);
applyCapture({ field: "accept-proposal" });
assert.equal(getFoxDraft().downPaymentAmount, 170000);
assert.equal(getFoxDraft().loanAmountValue, 680000);
applyCapture({ field: "correct", value: "amount" });
assert.equal(getFoxDraft().correcting, "amount");
assert.doesNotMatch(composerAmountHint(getFoxDraft()), /purchase price/i);
assert.doesNotMatch(amountAskText(getFoxDraft()), /purchase price/i);
assert.match(amountAskText(getFoxDraft()), /still right/i);
assert.doesNotMatch(amountAskText(getFoxDraft()), /down payment or loan amount/i);
const downEditAsk = workspacePromptCopy("amount", getFoxDraft());
assert.ok((downEditAsk.actions ?? []).some((item) => item.label === "Keep this"));
assert.ok(!(downEditAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.equal(workspaceReply("Keep this", getFoxDraft())?.capture?.field, "keep-line");
applyCapture({ field: "keep-line" });
assert.equal(getFoxDraft().downPaymentAmount, 170000);
assert.equal(getFoxDraft().loanAmountValue, 680000);
assert.equal(getFoxDraft().correcting, null);
assert.equal(getFoxDraft().productIntent, beforePercent.productIntent);
assert.equal(getFoxDraft().occupancyChoice.value, beforePercent.occupancy);
assert.equal(getFoxDraft().timelineChoice.value, beforePercent.timeline);
assert.equal(getFoxDraft().propertyValueAmount, beforePercent.price);
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
const fileBeforeEdit = {
  product: getFoxDraft().productIntent,
  occupancy: getFoxDraft().occupancyChoice.value,
  timeline: getFoxDraft().timelineChoice.value,
  credit: getFoxDraft().creditBand,
  income: getFoxDraft().incomeType.value,
  price: getFoxDraft().propertyValueAmount,
  motion: getFoxDraft().motion,
};
applyCapture({ field: "correct", value: "amount", line: "down" });
assert.equal(getFoxDraft().correctingLine, "down");
assert.match(amountAskText(getFoxDraft()), /still right/i);
assert.doesNotMatch(amountAskText(getFoxDraft()), /down payment or loan amount/i);
assert.match(composerAmountHint(getFoxDraft()), /down payment/i);
assert.doesNotMatch(composerAmountHint(getFoxDraft()), /purchase price/i);
const edit25 = workspaceReply("25%", getFoxDraft());
assert.equal(edit25?.capture?.field, "downPayment");
assert.doesNotMatch(edit25?.text ?? "", /use this/i);
if (edit25?.capture) applyCapture(edit25.capture);
assert.equal(getFoxDraft().productIntent, fileBeforeEdit.product);
assert.equal(getFoxDraft().occupancyChoice.value, fileBeforeEdit.occupancy);
assert.equal(getFoxDraft().timelineChoice.value, fileBeforeEdit.timeline);
assert.equal(getFoxDraft().creditBand, fileBeforeEdit.credit);
assert.equal(getFoxDraft().incomeType.value, fileBeforeEdit.income);
assert.equal(getFoxDraft().motion, fileBeforeEdit.motion);
assert.equal(getFoxDraft().downPaymentAmount, 212500);
assert.equal(getFoxDraft().loanAmountValue, 637500);
applyCapture({ field: "correct", value: "amount", line: "down" });
const edit200k = workspaceReply("200k", getFoxDraft());
assert.equal(edit200k?.capture?.field, "downPayment");
if (edit200k?.capture) applyCapture(edit200k.capture);
assert.equal(getFoxDraft().downPaymentAmount, 200000);
assert.equal(getFoxDraft().occupancyChoice.value, fileBeforeEdit.occupancy);
assert.equal(getFoxDraft().incomeType.value, fileBeforeEdit.income);
applyCapture({ field: "correct", value: "amount", line: "down" });
const replayPrice = workspaceReply("850000", getFoxDraft());
assert.notEqual(replayPrice?.capture?.field, "downPayment");
assert.notEqual(replayPrice?.capture?.field, "propose-funds");
assert.match(replayPrice?.text ?? "", /purchase price is in the file/i);
const keptAfterEdit = { ...getFoxDraft() };
continueWorkspaceFromEntry("acr", "buy");
assert.equal(getFoxDraft().downPaymentAmount, keptAfterEdit.downPaymentAmount);
assert.equal(getFoxDraft().propertyValueAmount, keptAfterEdit.propertyValueAmount);
assert.equal(getFoxDraft().occupancyChoice.value, keptAfterEdit.occupancyChoice.value);
assert.equal(getFoxDraft().productIntent, keptAfterEdit.productIntent);
const occupancyTwenty = workspaceReply("20", draft({ path: "acr", productIntent: "buy" }));
assert.notEqual(occupancyTwenty?.capture?.field, "occupancy");
assert.notEqual(occupancyTwenty?.capture?.field, "propose-funds");
const afterFunds = withPurchaseFunds(afterPrice);
assert.equal(workspacePrompt(afterFunds), "credit");
assert.notEqual(workspacePrompt(afterFunds), "review");
assert.notEqual(workspacePrompt(afterFunds), "documents");

const creditAsk = workspacePromptCopy("credit", afterPrice);
assert.equal(creditAsk.text, CREDIT_RANGE_ASK);
assert.equal(creditAsk.followUp, CREDIT_RANGE_FOLLOW);
assert.match(creditAsk.text, /estimated FICO/i);
assert.match(creditAsk.followUp ?? "", /stated · not a pull/i);
assert.doesNotMatch(`${creditAsk.text} ${creditAsk.followUp ?? ""}`, /we pulled|pulled your credit|live score/i);
assert.deepEqual(
  (creditAsk.actions ?? []).map((item) => item.label),
  ["760+", "740–759", "720–739", "700–719", "680–699", "660–679", "640–659", "620–639", "Skip", "Not yet"],
);
assert.deepEqual(
  CREDIT_WORKSPACE_BUBBLES.map((item) => item.label),
  ["760+", "740–759", "720–739", "700–719", "680–699", "660–679", "640–659", "620–639"],
);
assert.ok(!(creditAsk.actions ?? []).some((item) => item.label === "Not sure"));
assert.ok(!(creditAsk.actions ?? []).some((item) => item.label === "Use this" || item.label === "Still right"));
const typedFico = workspaceReply("742", afterFunds);
assert.equal(typedFico?.capture?.field, "creditRange");
assert.equal(typedFico?.capture && "value" in typedFico.capture ? typedFico.capture.value : "", "742");
assert.doesNotMatch(typedFico?.text ?? "", /Use this|Still right/i);
const skippedCredit = workspaceReply("Skip", afterFunds);
assert.equal(skippedCredit?.capture?.field, "skip-credit");
assert.equal(draft({ ...afterFunds, creditAsked: true }).creditBand, undefined);
assert.equal(creditPullPermitted(afterFunds), false);
assert.equal(creditPullPermitted(draft()), false);

const afterCredit = draft({
  ...afterFunds,
  creditAsked: true,
  creditBand: "760+",
});
assert.equal(workspacePrompt(afterCredit), "income");
assert.notEqual(workspacePrompt(afterCredit), "review");
assert.notEqual(workspacePrompt(afterCredit), "documents");

const creditReply = workspaceReply("760+", afterFunds);
assert.equal(creditReply?.capture?.field, "creditRange");
assert.doesNotMatch(creditReply?.text ?? "", /Credit 760\+/);
assert.ok(/income earned/i.test(creditReply?.text ?? ""));
const incomeReply = workspaceReply("W-2", afterCredit);
assert.equal(incomeReply?.capture?.field, "incomeType");
assert.doesNotMatch(incomeReply?.text ?? "", /^W-2\.|W-2\. Here’s a sample structure/i);
assert.equal(incomeReply?.text, OTHER_REO_ASK);
assert.doesNotMatch(incomeReply?.text ?? "", /How long have you been at this job|other monthly debts/i);
assert.doesNotMatch(incomeReply?.text ?? "", /auto loan|student loan|credit card|HOA|tradeline/i);
assert.deepEqual(
  (incomeReply?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
assert.ok(!(incomeReply?.actions ?? []).some((item) => item.label === "Upload this"));
assert.ok(!(incomeReply?.actions ?? []).some((item) => item.label === "Add another"));

const incomeAsk = workspacePromptCopy("income", afterCredit);
assert.deepEqual(
  (incomeAsk.actions ?? []).map((item) => item.label),
  ["W-2", "Self-employed", "Both", "Other"],
);

const afterIncome = withIncome(afterCredit, "w2");
assert.equal(structureFixPrompt("product"), "product");
assert.equal(structureFixPrompt("timeline"), "timeline");
assert.equal(structureFixPrompt("path"), "path-switch");
assert.equal(structureFixPrompt("qualifying", afterIncome), "qualifying");
assert.equal(structureFixPrompt("debts", afterIncome), "debts");
assert.equal(structureFixPrompt("assets", afterIncome), "assets");
assert.equal(structureFixPrompt("property-type", afterIncome), "property-type");
assert.equal(structureFixPrompt("address", afterIncome), "property-address");
assert.equal(structureFixPrompt("property-address", afterIncome), "property-address");
assert.equal(structureFixPrompt("years-in-business", afterIncome), "years-in-business");
assert.equal(structureFixPrompt("file"), null);
assert.equal(structureFixPrompt("rate"), null);
assert.equal(structureFixPrompt("reward"), null);
assert.equal(structureFixPrompt("status"), null);
assert.equal(structureFixPrompt("next"), null);
assert.equal(structureFixPrompt("originator"), null);
resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "850000" });
applyCapture({ field: "propose-funds", value: "170000:680000" });
applyCapture({ field: "accept-proposal" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
const midFile = {
  product: getFoxDraft().productIntent,
  occupancy: getFoxDraft().occupancyChoice.value,
  timeline: getFoxDraft().timelineChoice.value,
  credit: getFoxDraft().creditBand,
  income: getFoxDraft().incomeType.value,
  price: getFoxDraft().propertyValueAmount,
  down: getFoxDraft().downPaymentAmount,
  loan: getFoxDraft().loanAmountValue,
};
applyCapture({ field: "correct", value: "value", line: "price" });
const priceEditAsk = workspacePromptCopy("value", getFoxDraft());
assert.match(priceEditAsk.text, /still right/i);
assert.ok((priceEditAsk.actions ?? []).some((item) => item.label === "Keep this"));
applyCapture({ field: "keep-line" });
assert.equal(getFoxDraft().propertyValueAmount, midFile.price);
assert.equal(getFoxDraft().downPaymentAmount, midFile.down);
assert.equal(getFoxDraft().occupancyChoice.value, midFile.occupancy);
applyCapture({ field: "correct", value: "value", line: "price" });
const priceRetype = workspaceReply("1200000", getFoxDraft());
assert.equal(priceRetype?.capture?.field, "propertyValue");
assert.match(priceRetype?.text ?? "", /\$240,000 down · \$960,000 loan/);
assert.match(priceRetype?.text ?? "", /Use this/);
if (priceRetype?.capture) applyCapture(priceRetype.capture);
assert.equal(getFoxDraft().propertyValueAmount, 1200000);
assert.equal(getFoxDraft().downPaymentAmount, midFile.down);
assert.equal(getFoxDraft().loanAmountValue, midFile.loan);
assert.equal(getFoxDraft().pendingProposal?.companion?.value, "960000");
assert.equal(getFoxDraft().occupancyChoice.value, midFile.occupancy);
assert.equal(getFoxDraft().incomeType.value, midFile.income);
assert.equal(getFoxDraft().creditBand, midFile.credit);
applyCapture({ field: "accept-proposal" });
assert.equal(getFoxDraft().downPaymentAmount, 240000);
assert.equal(getFoxDraft().loanAmountValue, 960000);
assert.equal(getFoxDraft().productIntent, midFile.product);
applyCapture({ field: "correct", value: "amount", line: "down" });
assert.match(workspacePromptCopy("amount", getFoxDraft()).text, /still right/i);
applyCapture({ field: "keep-line" });
assert.equal(getFoxDraft().downPaymentAmount, 240000);
applyCapture({ field: "correct", value: "credit", line: "credit" });
const creditEditAsk = workspacePromptCopy("credit", getFoxDraft());
assert.equal(creditEditAsk.text, CREDIT_RANGE_ASK);
assert.doesNotMatch(creditEditAsk.text, /Still right/i);
assert.ok(!(creditEditAsk.actions ?? []).some((item) => item.label === "Keep this"));
const midCreditEdit = workspaceReply("720–739", getFoxDraft());
assert.equal(midCreditEdit?.capture?.field, "creditRange");
if (midCreditEdit?.capture) applyCapture(midCreditEdit.capture);
assert.equal(getFoxDraft().creditBand, "720-739");
assert.equal(getFoxDraft().propertyValueAmount, 1200000);
assert.equal(getFoxDraft().incomeType.value, "w2");
applyCapture({ field: "correct", value: "income", line: "income" });
const incomeEditAsk = workspacePromptCopy("income", getFoxDraft());
assert.equal(incomeEditAsk.text, "How is income earned?");
assert.doesNotMatch(incomeEditAsk.text, /Still right/i);
assert.ok(!(incomeEditAsk.actions ?? []).some((item) => item.label === "Keep this"));
const incomeEdit = workspaceReply("Self-employed", getFoxDraft());
assert.equal(incomeEdit?.capture?.field, "incomeType");
if (incomeEdit?.capture) applyCapture(incomeEdit.capture);
assert.equal(getFoxDraft().incomeType.value, "self-employed");
assert.equal(getFoxDraft().propertyValueAmount, 1200000);
assert.equal(getFoxDraft().downPaymentAmount, 240000);
assert.equal(getFoxDraft().creditBand, "720-739");
assert.equal(getFoxDraft().occupancyChoice.value, "primary");
assert.ok(getFoxDraft().documents.length === 0 || getFoxDraft().productIntent === "buy");
const fileBeforeStartOver = getFoxDraft();
assert.ok(fileBeforeStartOver.propertyValueAmount);
startOverWorkspace("acr");
assert.equal(getFoxDraft().propertyValueAmount, undefined);
assert.equal(getFoxDraft().incomeType.value, "");
assert.equal(getFoxDraft().creditBand, undefined);
assert.equal(getFoxDraft().downPaymentAmount, undefined);
assert.equal(getFoxDraft().documents.length, 0);
assert.equal(getFoxDraft().statedMonthlyDebts, undefined);
assert.equal(getFoxDraft().monthlyDebtsAsked, undefined);
assert.equal(getFoxDraft().statedAvailableAssets, undefined);
assert.equal(getFoxDraft().availableAssetsAsked, undefined);
assert.equal(getFoxDraft().propertyType, undefined);
assert.equal(getFoxDraft().propertyTypeAsked, undefined);
assert.equal(getFoxDraft().subjectAddress, undefined);
assert.equal(getFoxDraft().statedTimeOnJob, undefined);
assert.equal(getFoxDraft().timeOnJobAsked, undefined);
assert.equal(getFoxDraft().statedCurrentHousing, undefined);
assert.equal(getFoxDraft().currentHousingAsked, undefined);
assert.equal(getFoxDraft().statedDeclaration, undefined);
assert.equal(getFoxDraft().declarationAsked, undefined);
assert.equal(getFoxDraft().statedHousehold, undefined);
assert.equal(getFoxDraft().householdAsked, undefined);
assert.equal(getFoxDraft().borrowerName, undefined);
assert.equal(getFoxDraft().borrowerNameAsked, undefined);
assert.equal(getFoxDraft().statedOtherReo, undefined);
assert.equal(getFoxDraft().otherReoAsked, undefined);
assert.equal(workspacePrompt(getFoxDraft()), "product");
assert.equal(workspacePrompt(afterIncome), "documents");
assert.match(workspacePromptCopy("documents", afterIncome).text, /That’s the sketch/i);
assert.doesNotMatch(workspacePromptCopy("documents", afterIncome).text, /government ID|income docs|purchase contract|bank statement/i);
assert.match(
  workspacePromptCopy("documents", afterIncome).followUp ?? "",
  /Next I need a few documents to build the file/,
);
assert.match(workspacePromptCopy("documents", afterIncome).followUp ?? "", /government ID/i);
assert.match(workspacePromptCopy("documents", afterIncome).followUp ?? "", /income docs/i);
assert.match(workspacePromptCopy("documents", afterIncome).followUp ?? "", /property address/i);
assert.match(workspacePromptCopy("documents", afterIncome).followUp ?? "", /purchase contract/i);
assert.match(workspacePromptCopy("documents", afterIncome).followUp ?? "", /bank statement/i);
assert.doesNotMatch(
  workspacePromptCopy("documents", afterIncome).followUp ?? "",
  /employer|years in business|I’ll ask the rest|next session/i,
);
assert.deepEqual(
  (workspacePromptCopy("documents", afterIncome).actions ?? []).map((item) => item.label),
  ["Start with ID", "Skip", "Not yet"],
);
const afterStartId = draft({ ...afterIncome, docsStarted: true });
assert.equal(workspacePromptCopy("documents", afterStartId).text, DOC_INVITE_COPY.government_id);
assert.deepEqual(
  (workspacePromptCopy("documents", afterStartId).actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const startIdReply = workspaceReply("Start with ID", afterIncome);
assert.equal(startIdReply?.capture?.field, "start-docs");
assert.equal(startIdReply?.text, DOC_INVITE_COPY.government_id);
const idStillReading = draft({
  ...afterStartId,
  documents: [
    {
      slot: "id",
      name: "license.png",
      type: "image/png",
      size: 4000,
      receivedAt: "2026-08-25T00:00:00.000Z",
      status: "reading",
      extractClass: "government_id",
    },
  ],
});
assert.equal(workspacePrompt(idStillReading), "documents");
assert.equal(workspacePromptCopy("documents", idStillReading).text, DOC_INVITE_COPY.government_id);
assert.doesNotMatch(workspacePromptCopy("documents", idStillReading).text, /paystub|tax return/i);
const notYetDocs = workspaceReply("Not yet", afterIncome);
assert.equal(notYetDocs?.capture?.field, "hold-docs");
assert.equal(notYetDocs?.text, HOLD_DOCS_COPY);
assert.deepEqual(
  (notYetDocs?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Ask Fox"],
);
assert.ok(!(notYetDocs?.actions ?? []).some((item) => item.label === "Looks right"));
assert.ok(!(notYetDocs?.actions ?? []).some((item) => item.label === "Proceed"));
const heldDocs = { ...afterIncome, docsHeld: true };
assert.equal(workspacePrompt(heldDocs), "documents");
assert.notEqual(workspacePrompt(heldDocs), "review");
assert.equal(workspacePromptCopy("documents", heldDocs).text, HOLD_DOCS_COPY);
assert.deepEqual(
  (workspacePromptCopy("documents", heldDocs).actions ?? []).map((item) => item.label),
  ["Start with ID", "Ask Fox"],
);
const askFoxHeld = workspaceReply("Ask Fox", heldDocs);
assert.equal(askFoxHeld?.capture?.field, "ask-fox");
assert.equal(askFoxHeld?.text, HOLD_DOCS_ASK_FOX);
assert.notEqual(askFoxHeld?.text, HOLD_DOCS_COPY);
assert.doesNotMatch(askFoxHeld?.text ?? "", /I’ll hold documents|Okay\. I’ll hold/);
assert.deepEqual(
  (askFoxHeld?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Ask Fox"],
);
assert.equal(holdDocsAskFox().text, HOLD_DOCS_ASK_FOX);
assert.notEqual(HOLD_DOCS_ASK_FOX, HOLD_DOCS_COPY);
assert.equal(workspaceUpdateCopy({ field: "ask-fox" }, heldDocs), HOLD_DOCS_ASK_FOX);
const refiOffer = withIncome(
  withRefiFunds(
    draft({
      path: "acr",
      productIntent: "refinance",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "second-home" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      creditAsked: true,
      creditBand: "760+",
    }),
    500_000,
    1_000_000,
  ),
  "w2",
);
assert.equal(workspacePrompt(refiOffer), "documents");
assert.match(workspacePromptCopy("documents", refiOffer).followUp ?? "", /government ID/i);
assert.match(workspacePromptCopy("documents", refiOffer).followUp ?? "", /income docs/i);
assert.match(workspacePromptCopy("documents", refiOffer).followUp ?? "", /property address/i);
assert.match(workspacePromptCopy("documents", refiOffer).followUp ?? "", /mortgage statement/i);
assert.doesNotMatch(workspacePromptCopy("documents", refiOffer).followUp ?? "", /bank statement/i);
assert.doesNotMatch(workspacePromptCopy("documents", refiOffer).followUp ?? "", /employer|years in business/i);
const refiNotYet = workspaceReply("Not yet", refiOffer);
assert.equal(refiNotYet?.capture?.field, "hold-docs");
assert.equal(refiNotYet?.text, HOLD_DOCS_COPY);
assert.deepEqual(
  (refiNotYet?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Ask Fox"],
);
assert.ok(!(refiNotYet?.actions ?? []).some((item) => item.label === "Looks right"));
assert.equal(workspacePrompt({ ...refiOffer, docsHeld: true }), "documents");
assert.notEqual(workspacePrompt({ ...refiOffer, docsHeld: true }), "review");
assert.equal(workspacePromptCopy("documents", { ...refiOffer, docsHeld: true }).text, HOLD_DOCS_COPY);
const skipIdFromOffer = workspaceReply("Skip", afterIncome);
assert.equal(skipIdFromOffer?.capture?.field, "skip-docs");
assert.equal(skipIdFromOffer?.text, DOC_INVITE_COPY.paystub);
assert.ok((skipIdFromOffer?.actions ?? []).some((item) => item.label === "Upload this"));
assert.ok((skipIdFromOffer?.actions ?? []).some((item) => item.label === "Skip"));
assert.notEqual(workspacePrompt(skipCurrentInvite(afterIncome)), "review");
const actuallyPrice = workspaceReply("actually 900k", afterIncome);
assert.equal(actuallyPrice?.capture?.field, "propertyValue");
assert.equal(
  actuallyPrice?.capture && "value" in actuallyPrice.capture ? actuallyPrice.capture.value : "",
  "900000",
);
assert.match(actuallyPrice?.text ?? "", /\$900,000/);
assert.equal(afterIncome.occupancyChoice.value, "primary");
assert.equal(workspacePrompt({ ...afterIncome, propertyValueAmount: 900000 }), "over-price");

const heldWhy = workspaceReply("why do you need that?", heldDocs);
assert.match(heldWhy?.text ?? "", /government ID|name on this file/i);
assert.doesNotMatch(heldWhy?.text ?? "", /I’ll hold documents|Okay\. I’ll hold/);
assert.deepEqual(
  (heldWhy?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Ask Fox"],
);
const offerWhy = workspaceReply("why do you need that?", afterIncome);
assert.match(offerWhy?.text ?? "", /government ID|name on this file/i);
assert.ok((offerWhy?.actions ?? []).some((item) => item.label === "Start with ID"));
assert.ok((offerWhy?.actions ?? []).some((item) => item.label === "Skip"));
assert.ok((offerWhy?.actions ?? []).some((item) => item.label === "Not yet"));
const statedCreditAsk = workspaceReply("what does stated credit mean?", afterIncome);
assert.match(statedCreditAsk?.text ?? "", /stated range|not a (fico|pull)|not a credit pull/i);
assert.doesNotMatch(statedCreditAsk?.text ?? "", /A government ID puts a name on this file/);
assert.ok((statedCreditAsk?.actions ?? []).some((item) => item.label === "Start with ID"));
const statedCreditEdit = parseWorkspaceEdit("what does stated credit mean?", afterIncome);
assert.equal(statedCreditEdit, null);
const inviteWhy = workspaceReply("why do you need that?", afterStartId);
assert.match(inviteWhy?.text ?? "", /government ID|name on this file/i);
assert.ok((inviteWhy?.actions ?? []).some((item) => item.label === "Upload this"));
assert.ok((inviteWhy?.actions ?? []).some((item) => item.label === "Skip"));
const heldAcr = workspaceReply("what is ACR?", heldDocs);
assert.match(heldAcr?.text ?? "", /desk that stays open/i);
assert.doesNotMatch(heldAcr?.text ?? "", /I’ll hold documents|Okay\. I’ll hold/);
assert.deepEqual(
  (heldAcr?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Ask Fox"],
);
const offerAcr = workspaceReply("what is ACR?", afterIncome);
assert.match(offerAcr?.text ?? "", /desk that stays open/i);
assert.ok((offerAcr?.actions ?? []).some((item) => item.label === "Start with ID"));
const inviteAcr = workspaceReply("what is ACR?", afterStartId);
assert.match(inviteAcr?.text ?? "", /desk that stays open/i);
assert.ok((inviteAcr?.actions ?? []).some((item) => item.label === "Upload this"));
const yearsAskDraft = draft({
  ...afterIncome,
  docsStarted: true,
  awaitingYearsInBusiness: true,
});
const yearsWhy = workspaceReply("why do you need that?", yearsAskDraft);
assert.match(yearsWhy?.text ?? "", /helps me read the return/i);
assert.match(yearsWhy?.text ?? "", /How long have you had this business/);
assert.doesNotMatch(yearsWhy?.text ?? "", /running this/);
const yearsAcr = workspaceReply("what is ACR?", yearsAskDraft);
assert.match(yearsAcr?.text ?? "", /desk that stays open/i);
assert.match(yearsAcr?.text ?? "", /How long have you had this business/);
assert.doesNotMatch(yearsAcr?.text ?? "", /running this/);
const doneWhy = workspaceReply("why do you need that?", {
  ...skipDocInvites(afterIncome),
  sampleAccepted: true,
  housingAsked: true,
  subjectAddressAsked: true,
  workspaceDraftStatus: "with-originator",
  phase: "confirmed",
});
assert.match(doneWhy?.text ?? "", /Sketch now, documents next, review after Proceed/);
assert.doesNotMatch(doneWhy?.text ?? "", /I can keep this file current\. Ask anything/);
assert.ok((doneWhy?.actions ?? []).some((item) => item.label === "Proceed" || item.label === "Ask Fox"));
const refiHeld = { ...refiOffer, docsHeld: true };
const refiActually = workspaceReply("actually 900k", refiHeld);
assert.equal(refiActually?.capture?.field, "propertyValue");
assert.equal(
  refiActually?.capture && "value" in refiActually.capture ? refiActually.capture.value : "",
  "900000",
);
assert.match(refiActually?.text ?? "", /\$900,000/);
const refiBareHeld = workspaceReply("1200000", refiHeld);
assert.equal(refiBareHeld?.capture?.field, "propertyValue");
assert.equal(
  refiBareHeld?.capture && "value" in refiBareHeld.capture ? refiBareHeld.capture.value : "",
  "1200000",
);
const refiBareInvite = workspaceReply("1200000", { ...refiOffer, docsStarted: true });
assert.equal(refiBareInvite?.capture?.field, "propertyValue");
assert.equal(
  refiBareInvite?.capture && "value" in refiBareInvite.capture ? refiBareInvite.capture.value : "",
  "1200000",
);
const purchaseBareDocs = workspaceReply("1200000", afterIncome);
assert.notEqual(purchaseBareDocs?.capture?.field, "propertyValue");
for (const product of [
  withIncome(
    draft({
      path: "acr",
      productIntent: "heloc",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      amountAsked: true,
      loanAmountValue: 150000,
      creditAsked: true,
      creditBand: "760+",
    }),
  ),
  withIncome(
    withPurchaseFunds(
      draft({
        path: "acr",
        productIntent: "jumbo",
        jumboPurpose: "buy",
        occupancyAsked: true,
        occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
        timelineAsked: true,
        timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
        creditAsked: true,
        creditBand: "760+",
      }),
      1_500_000,
      300_000,
      1_200_000,
    ),
  ),
] as const) {
  assert.equal(workspacePrompt(product), "documents");
  const held = workspaceReply("Not yet", product);
  assert.equal(held?.capture?.field, "hold-docs");
  assert.equal(held?.text, HOLD_DOCS_COPY);
  assert.ok(!(held?.actions ?? []).some((item) => item.label === "Looks right"));
  const why = workspaceReply("why do you need that?", { ...product, docsHeld: true });
  assert.doesNotMatch(why?.text ?? "", /I’ll hold documents|Okay\. I’ll hold/);
  assert.ok((why?.actions ?? []).some((item) => item.label === "Start with ID"));
}
const afterIncomeReady = readyForReview(afterIncome);
assert.equal(workspacePrompt(afterIncomeReady), "review");
const noTimelineFile = withIncome(
  withPurchaseFunds(
    draft({
      path: "acr",
      productIntent: "buy",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      creditAsked: true,
      creditBand: "760+",
    }),
  ),
);
assert.equal(noTimelineFile.timelineChoice.value, "");
assert.equal(canLooksRight(noTimelineFile), false);
assert.equal(canLooksRight(skipDocInvites(noTimelineFile)), false);
assert.equal(workspacePrompt(noTimelineFile), "timeline");
assert.equal(workspacePrompt(skipDocInvites(noTimelineFile)), "timeline");
assert.ok(previewFacts(noTimelineFile).some((fact) => fact.id === "timeline" && fact.value === "—"));
const skippedTimeline = draft({ ...noTimelineFile, timelineAsked: true });
assert.equal(skippedTimeline.timelineChoice.value, "");
assert.equal(canLooksRight(skipDocInvites(skippedTimeline)), false);
assert.equal(workspacePrompt(skipDocInvites(skippedTimeline)), "timeline");
const closeDateUnlocksLooks = draft({
  ...skippedTimeline,
  facts: {
    close_date: {
      field: "close_date",
      value: "2026-10-15",
      source: "document",
      confirmed: true,
    },
  },
});
assert.ok(canLooksRight(readyForReview(closeDateUnlocksLooks)));
assert.equal(workspacePrompt(readyForReview(closeDateUnlocksLooks)), "review");
const looksRight = workspaceReply("Looks right", afterIncomeReady);
assert.equal(creditPullPermitted(applyLooksRightMotion(afterIncomeReady)), false);
assert.equal(looksRight?.capture?.field, "confirm-draft");
assert.match(looksRight?.text ?? "", /file can move|proceed/i);
assert.doesNotMatch(looksRight?.text ?? "", /government ID, latest paystub, and W-2|upload what you have|skip is fine|upload docs/i);
assert.doesNotMatch(`${looksRight?.text ?? ""} ${looksRight?.followUp ?? ""}`, /drop what you have|will contact you|we’ll be in touch|your lo has the file/i);
assert.ok(!(looksRight?.actions ?? []).some((item) => item.label === "Upload docs"));
assert.ok((looksRight?.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok((looksRight?.actions ?? []).some((item) => item.label === "Not yet"));
assert.ok((looksRight?.actions ?? []).some((item) => item.label === "Request human"));
const looksRightLabels = (looksRight?.actions ?? []).map((item) => item.label);
assert.ok(looksRightLabels.indexOf("Proceed") < looksRightLabels.indexOf("Not yet"));

const notSure = withIncome(draft({ ...afterFunds, creditAsked: true, creditBand: "not-sure" }));
assert.equal(workspacePrompt(notSure), "documents");
assert.equal(workspacePrompt(readyForReview(notSure)), "review");

const otherIncome = withIncome(afterCredit, "other");
assert.equal(workspacePrompt(otherIncome), "documents");
assert.match(workspacePromptCopy("documents", otherIncome).text, /sketch/i);
assert.deepEqual(
  (workspacePromptCopy("documents", otherIncome).actions ?? []).map((item) => item.label),
  ["Start with ID", "Skip", "Not yet"],
);

const creditFacts = previewFacts(afterIncome);
assert.ok(creditFacts.some((fact) => fact.id === "path" && fact.value === "Relationship desk"));
assert.ok(creditFacts.some((fact) => fact.id === "price" && fact.label === "Purchase price" && fact.value === "$1,200,000"));
assert.ok(creditFacts.some((fact) => fact.id === "down" && fact.label === "Down payment" && fact.value === "$240,000"));
assert.ok(creditFacts.some((fact) => fact.id === "loan" && fact.label === "Loan amount" && fact.value === "$960,000"));
assert.ok(creditFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
assert.equal(structureAmountLabel(afterIncome), "Purchase price");
assert.ok(canLooksRight(afterIncomeReady));
assert.equal(fileCompleteness(afterIncome)?.state, "sketch");
assert.equal(fileCompleteness(afterIncome)?.total, CONVENTIONAL_FILE_SLOT_TOTAL);
assert.equal(fileCompleteness(afterIncome)?.filled, 4);
assert.equal(fileCompleteness(afterIncome)?.copy, `sketch · 4 of ${CONVENTIONAL_FILE_SLOT_TOTAL}`);
assert.ok(creditFacts.some((fact) => fact.id === "file" && new RegExp(`sketch · 4 of ${CONVENTIONAL_FILE_SLOT_TOTAL}`).test(fact.value)));
assert.ok(
  creditFacts.some(
    (fact) => fact.id === "credit" && fact.value === "760+" && fact.note === CREDIT_STATED_NOTE,
  ),
);
assert.ok(
  creditFacts
    .filter((fact) => fact.id === "credit")
    .every((fact) => CREDIT_WORKSPACE_BUBBLES.some((item) => item.label === fact.value)),
);
assert.equal(creditPullPermitted(afterIncome), false);
assert.equal(creditPullPermitted({ ...afterIncome, sampleAccepted: true, motion: "gathering" }), false);
assert.match(structureExplainCopy("credit", afterIncome)?.text ?? "", /stated range/i);
assert.doesNotMatch(structureExplainCopy("credit", afterIncome)?.text ?? "", /we pulled|fico \d/i);
assert.ok(creditFacts.some((fact) => fact.id === "income" && fact.value === "W-2"));
assert.ok(creditFacts.some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(creditFacts.every((fact) => fact.id !== "rate" || !/6\.750/.test(`${fact.value} ${fact.note ?? ""}`)));
assert.ok(creditFacts.every((fact) => fact.id !== "rate" || fact.note !== PREVIEW_RATE_NOTE));
const convReward = creditFacts.find((fact) => fact.id === "reward");
assert.equal(convReward?.value, "Prepared when you join");
assert.ok(!/\$[\d,]/.test(convReward?.value ?? ""));
assert.ok(!/446|604/.test(convReward?.value ?? ""));
assert.equal(structureFixPrompt("credit"), "credit");
assert.equal(structureFixPrompt("income"), "income");

const recap = fileSummaryFacts(afterIncome);
const recapRate = recap.find((fact) => fact.id === "rate");
assert.equal(recapRate?.value, PRICING_WHEN_READY);
assert.ok(!recapRate?.value.includes(SAMPLE_RATE_LABEL));
assert.ok(!recapRate?.value.includes("6.750"));
assert.ok(recap.some((fact) => fact.id === "income" && fact.value === "W-2"));

const liveReady = {
  ...afterIncome,
  propertyType: "sfr" as const,
  liveQuote: {
    key: "",
    rate: 6.125,
    asOf: "2026-08-28T19:04:00.000Z",
    principalAndInterest: 5830,
    pts: 0,
  },
};
const liveBody = rateflowClientBodyFromDraft(liveReady);
assert.ok(liveBody);
liveReady.liveQuote.key = rateflowScenarioKey(liveBody!);
const liveFacts = previewFacts(liveReady);
const liveRate = liveFacts.find((fact) => fact.id === "rate");
assert.equal(liveRate?.value, liveRateLine(liveReady.liveQuote));
assert.equal(liveRate?.note, liveRateSecondLine(liveReady.liveQuote));
assert.match(liveRate?.value ?? "", /not a lock/);
assert.doesNotMatch(liveRate?.value ?? "", /approved|locked|committed|6\.750/i);
assert.equal(liveRate?.note, "P&I $5,830 · 0 pts");
assert.match(structureExplainCopy("rate", liveReady)?.text ?? "", /not a lock/);
assert.doesNotMatch(structureExplainCopy("rate", liveReady)?.text ?? "", /6\.750|Preview rate/);
const staleLive = previewFacts({
  ...liveReady,
  loanAmountValue: 800_000,
});
assert.ok(staleLive.some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(staleLive.every((fact) => fact.id !== "rate" || !/6\.125|6\.750/.test(fact.value)));
const migratedSampleRate = migrateRestoredFoxMessages([
  {
    id: "old-sample-rate",
    role: "fox",
    text: "Here’s a sample structure.",
    facts: [{ id: "rate", label: "Rate", value: `Conventional 30-year ${SAMPLE_RATE_LABEL}`, note: PREVIEW_RATE_NOTE }],
  },
]);
assert.ok(
  migratedSampleRate[0]?.facts?.some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY),
);
assert.ok(!/6\.750/.test(JSON.stringify(migratedSampleRate)));

const occupancyCopy = workspaceUpdateCopy(
  { field: "occupancy", value: "second-home" },
  afterOcc,
);
assert.equal(occupancyCopy, "Updated occupancy to Second home.");

const afterOccEdit = draft({
  ...afterIncome,
  correcting: null,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "second-home" },
  occupancyAsked: true,
});
assert.equal(workspacePrompt(afterOccEdit), "documents");
assert.equal(workspacePrompt(readyForReview(afterOccEdit)), "review");
assert.notEqual(workspacePrompt({ ...afterIncome, correcting: "occupancy" }), "documents");
assert.equal(workspacePrompt({ ...afterIncome, correcting: "credit" }), "credit");
assert.equal(workspacePrompt({ ...afterIncome, correcting: "income" }), "income");

const creditEdit = parseWorkspaceEdit("change credit to 760+");
assert.equal(creditEdit?.capture?.field, "creditRange");
assert.equal(creditEdit?.capture && "value" in creditEdit.capture ? creditEdit.capture.value : "", "760+");
const creditAskEdit = parseWorkspaceEdit("edit credit");
assert.equal(creditAskEdit?.correct, "credit");
assert.ok(!/not on this sketch/i.test(creditAskEdit?.confirm ?? ""));
const occupancySpoken = parseWorkspaceEdit("occupancy is second home", afterIncome);
assert.equal(occupancySpoken?.capture?.field, "occupancy");
assert.equal(
  occupancySpoken?.capture && "value" in occupancySpoken.capture ? occupancySpoken.capture.value : "",
  "second-home",
);
const occupancySpokenReply = workspaceReply("occupancy is second home", afterIncome);
assert.equal(occupancySpokenReply?.capture?.field, "occupancy");
assert.equal(
  occupancySpokenReply?.capture && "value" in occupancySpokenReply.capture
    ? occupancySpokenReply.capture.value
    : "",
  "second-home",
);
assert.match(occupancySpokenReply?.text ?? "", /Second home/);
const creditSpoken = parseWorkspaceEdit("credit is 760+", afterIncome);
assert.equal(creditSpoken?.capture?.field, "creditRange");
assert.equal(creditSpoken?.capture && "value" in creditSpoken.capture ? creditSpoken.capture.value : "", "760+");
const creditSpokenReply = workspaceReply("credit is 760+", afterIncome);
assert.equal(creditSpokenReply?.capture?.field, "creditRange");

const review = workspacePromptCopy("review", afterIncomeReady);
assert.match(review.text, /notepad looks complete/i);
assert.match(review.text, /does it look right/i);
assert.doesNotMatch(review.text, /here.?s the file/i);
assert.equal((review.facts ?? []).length, 0);
assert.deepEqual(
  (review.actions ?? []).map((item) => item.label),
  ["Looks right", "Needs a correction"],
);

const helocReady = withIncome(
  draft({
    path: "loan-only",
    productIntent: "heloc",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    amountAsked: true,
    loanAmountValue: 365000,
    creditAsked: true,
    creditBand: "720-759",
  }),
);
const helocFacts = previewFacts(helocReady);
assert.ok(helocFacts.some((fact) => fact.id === "path" && fact.value === "Loan only"));
assert.ok(helocFacts.some((fact) => fact.id === "line" && fact.label === "HELOC line"));
assert.ok(helocFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
assert.ok(!showsAgencyCompleteness(helocReady));
assert.equal(fileCompleteness(helocReady), null);
assert.ok(helocFacts.every((fact) => fact.id !== "file"));
assert.ok(canLooksRight(readyForReview(helocReady)));
assert.ok(helocFacts.some((fact) => fact.id === "credit" && fact.value === "720–759"));
assert.ok(helocFacts.some((fact) => fact.id === "rate" && fact.value === "Pricing when the file is ready"));
assert.ok(!helocFacts.some((fact) => fact.id === "reward"));
assert.ok(helocFacts.some((fact) => fact.id === "status"));

const helocAcrReady = withIncome(
  draft({
    path: "acr",
    productIntent: "heloc",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    amountAsked: true,
    loanAmountValue: 150000,
    creditAsked: true,
    creditBand: "760+",
  }),
);
const refiAfterLoan = draft({
  path: "acr",
  productIntent: "refinance",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  amountAsked: true,
  loanAmountValue: 640000,
});
assert.equal(workspacePrompt(refiAfterLoan), "value");
assert.equal(amountAskText(refiAfterLoan), "What’s the property value?");
assert.ok(!canLooksRight(withIncome({ ...refiAfterLoan, creditAsked: true, creditBand: "760+" })));
const refiReady = withIncome(
  withRefiFunds(
    draft({
      path: "acr",
      productIntent: "refinance",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      creditAsked: true,
      creditBand: "760+",
    }),
  ),
);
const refiFacts = previewFacts(refiReady);
assert.ok(refiFacts.some((fact) => fact.id === "loan" && fact.label === "Loan amount"));
assert.ok(refiFacts.some((fact) => fact.id === "home" && fact.label === "Property value"));
assert.ok(refiFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
assert.equal(structureAmountLabel(refiReady), "Loan amount");
assert.ok(canLooksRight(readyForReview(refiReady)));
assert.ok(refiFacts.some((fact) => fact.id === "file"));
assert.equal(amountAskText(refiAfterTime), "What’s the approximate loan or payoff amount?");

const helocAcrFacts = previewFacts(helocAcrReady);
assert.ok(helocAcrFacts.some((fact) => fact.id === "path" && fact.value === "Relationship desk"));
assert.ok(helocAcrFacts.some((fact) => fact.id === "line" && fact.label === "HELOC line"));
assert.ok(helocAcrFacts.every((fact) => fact.id !== "file"));
assert.ok(helocAcrFacts.some((fact) => fact.id === "rate" && fact.value === "Pricing when the file is ready"));
const helocReward = helocAcrFacts.find((fact) => fact.id === "reward");
assert.equal(helocReward?.value, "Prepared when you join");
assert.ok(!/\$[\d,]/.test(helocReward?.value ?? ""));
assert.ok(!/446|604/.test(helocReward?.value ?? ""));

const jumboAcrReady = withIncome(
  withPurchaseFunds(
    draft({
      path: "acr",
      productIntent: "jumbo",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      creditAsked: true,
      creditBand: "760+",
    }),
    1_500_000,
    300_000,
    1_200_000,
  ),
);
const jumboFacts = previewFacts(jumboAcrReady);
assert.ok(jumboFacts.some((fact) => fact.id === "price" && fact.label === "Purchase price"));
assert.ok(jumboFacts.some((fact) => fact.id === "down" && fact.label === "Down payment"));
assert.ok(jumboFacts.some((fact) => fact.id === "loan" && fact.label === "Loan amount"));
assert.ok(!showsAgencyCompleteness(jumboAcrReady));
assert.ok(jumboFacts.every((fact) => fact.id !== "file"));
assert.ok(jumboFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
assert.ok(jumboFacts.some((fact) => fact.id === "rate" && fact.value === "Pricing when the file is ready"));
const jumboReward = jumboFacts.find((fact) => fact.id === "reward");
assert.equal(jumboReward?.value, "Prepared when you join");
assert.ok(!/\$[\d,]/.test(jumboReward?.value ?? ""));

assert.equal(FHFA_HIGH_COST_CEILING_2026, 1_249_125);
assert.ok(!loanLooksAboveCeiling(afterIncome));
assert.ok(previewRateApplies(afterIncome));
assert.ok(previewRateApplies(refiReady));
assert.ok(!previewRateApplies(helocReady));
assert.ok(!previewRateApplies(jumboAcrReady));

const jumboTap = workspaceReply("Jumbo", draft({ path: "acr" }));
assert.equal(jumboTap?.capture?.field, "productIntent");
assert.equal(jumboTap?.capture && "value" in jumboTap.capture ? jumboTap.capture.value : "", "jumbo");
assert.equal(jumboTap?.text, JUMBO_PURPOSE_ASK);
assert.deepEqual(
  (jumboTap?.actions ?? []).map((item) => item.label),
  ["Buy", "Refinance"],
);
assert.equal(workspacePrompt(draft({ path: "acr", productIntent: "jumbo" })), "jumbo-purpose");

const jumboBuyPurpose = workspaceReply(
  "Buy",
  draft({ path: "acr", productIntent: "jumbo" }),
);
assert.equal(jumboBuyPurpose?.capture?.field, "jumboPurpose");
assert.equal(
  jumboBuyPurpose?.capture && "value" in jumboBuyPurpose.capture ? jumboBuyPurpose.capture.value : "",
  "buy",
);
assert.match(jumboBuyPurpose?.text ?? "", /how will the property be used/i);

const jumboRefiAfterTime = draft({
  path: "acr",
  productIntent: "jumbo",
  jumboPurpose: "refinance",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
});
assert.equal(workspacePrompt(jumboRefiAfterTime), "amount");
assert.equal(amountAskText(jumboRefiAfterTime), "What’s the approximate loan or payoff amount?");
assert.equal(structureAmountLabel(jumboRefiAfterTime), "Loan amount");

const jumboRefiReady = withIncome(
  withRefiFunds(
    draft({
      ...jumboRefiAfterTime,
      creditAsked: true,
      creditBand: "760+",
    }),
    1_600_000,
    2_100_000,
  ),
);
const jumboRefiFacts = previewFacts(jumboRefiReady);
assert.ok(jumboRefiFacts.some((fact) => fact.id === "product" && fact.value === "Jumbo"));
assert.ok(jumboRefiFacts.some((fact) => fact.id === "loan" && fact.label === "Loan amount"));
assert.ok(jumboRefiFacts.some((fact) => fact.id === "home" && fact.label === "Property value"));
assert.ok(jumboRefiFacts.every((fact) => fact.id !== "file"));
assert.ok(jumboRefiFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
assert.ok(jumboRefiFacts.some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(!jumboRefiFacts.some((fact) => fact.value.includes(SAMPLE_RATE_LABEL)));
const jumboRefiReward = jumboRefiFacts.find((fact) => fact.id === "reward");
assert.equal(jumboRefiReward?.value, REWARD_PREPARED_COPY);
assert.ok(!/\$[\d,]/.test(jumboRefiReward?.value ?? ""));

const investBuy = withIncome(
  withPurchaseFunds(
    draft({
      path: "acr",
      productIntent: "buy",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "investment" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      subjectLeaseAsked: true,
      creditAsked: true,
      creditBand: "760+",
    }),
    850000,
    170000,
    680000,
  ),
);
assert.ok(!previewRateApplies(investBuy));
const investFacts = previewFacts(investBuy);
assert.ok(investFacts.some((fact) => fact.id === "price" && fact.label === "Purchase price"));
assert.ok(investFacts.some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.equal(guidelineCaution(investBuy), INVESTMENT_CAUTION);
assert.ok(investFacts.some((fact) => fact.id === "caution" && fact.value === INVESTMENT_CAUTION));
assert.ok(investFacts.some((fact) => fact.id === "caution" && fact.value === PRICING_WAITS));
assert.equal(
  storeEscalate({ occupancy: "investment", product: "buy", purposeHint: "purchase", state: "CA" }).action,
  "stay",
);
assert.equal(
  storeFlags({ occupancy: "investment", product: "buy", purposeHint: "purchase", state: "CA" }).caution,
  INVESTMENT_CAUTION,
);
assert.equal(
  storeFlags({ occupancy: "investment", product: "buy", purposeHint: "purchase", state: "CA" }).previewRateAllowed,
  false,
);
assert.ok(!investFacts.some((fact) => fact.value.includes(SAMPLE_RATE_LABEL)));
assert.ok(!investFacts.some((fact) => fact.value.includes("6.750%")));
assert.equal(investFacts.find((fact) => fact.id === "reward")?.value, REWARD_PREPARED_COPY);
assert.doesNotMatch(
  `${guidelineCaution(investBuy) ?? ""} ${investFacts.map((fact) => fact.value).join(" ")}`,
  /approv|eligible|ineligible|\bDU\b|\bAUS\b|you qualify|you don’t qualify|will contact you/i,
);

const highBuyAfterTime = draft({
  path: "acr",
  productIntent: "buy",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
});
const highBuyAsk = workspaceReply("1500000", highBuyAfterTime);
assert.equal(highBuyAsk?.capture?.field, "propertyValue");
assert.equal(JUMBO_OFFER_COPY, JUMBO_CEILING_LINE);
assert.equal(highBuyAsk?.text, JUMBO_OFFER_COPY);
assert.deepEqual(
  (highBuyAsk?.actions ?? []).map((item) => item.label),
  ["Stay", "Use Jumbo"],
);
assert.ok(!/832,?750/.test(highBuyAsk?.text ?? ""));

const highBuyHeld = withIncome(
  withPurchaseFunds(
    draft({
      ...highBuyAfterTime,
      jumboOffered: true,
      creditAsked: true,
      creditBand: "760+",
    }),
    1_500_000,
    200_000,
    1_300_000,
  ),
);
assert.ok(loanLooksAboveCeiling(highBuyHeld));
assert.ok(!previewRateApplies(highBuyHeld));
const highBuyFacts = previewFacts(highBuyHeld);
assert.ok(highBuyFacts.some((fact) => fact.id === "product" && fact.value === "Buy"));
assert.ok(highBuyFacts.some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(!highBuyFacts.some((fact) => fact.value.includes(SAMPLE_RATE_LABEL)));

const acceptJumbo = workspaceReply(
  "Use Jumbo",
  draft({
    ...highBuyAfterTime,
    valueAsked: true,
    propertyValueAmount: 1_500_000,
    pendingOffer: "jumbo",
  }),
);
assert.equal(acceptJumbo?.capture?.field, "accept-jumbo");
assert.match(acceptJumbo?.text ?? "", /jumbo/i);
const afterAcceptJumbo = draft({
  ...highBuyAfterTime,
  productIntent: "jumbo",
  jumboPurpose: "buy",
  jumboOffered: true,
  valueAsked: true,
  propertyValueAmount: 1_500_000,
});
assert.equal(previewFacts(afterAcceptJumbo).find((fact) => fact.id === "product")?.value, "Jumbo");
assert.equal(structureAmountLabel(afterAcceptJumbo), "Purchase price");

const buyOnRefi = workspaceReply("I'm buying", refiAfterTime);
assert.equal(buyOnRefi?.capture?.field, "productIntent");
assert.equal(buyOnRefi?.capture && "value" in buyOnRefi.capture ? buyOnRefi.capture.value : "", "buy");
assert.notEqual(buyOnRefi?.text, PATH_ASK_TEXT);
assert.ok(
  /purchase price|how will the property be used|timeline/i.test(
    `${buyOnRefi?.text ?? ""} ${buyOnRefi?.followUp ?? ""}`,
  ),
);

const cashKeepFirst = workspaceReply("I want cash and keep the first mortgage", refiAfterTime);
assert.equal(cashKeepFirst?.capture?.field, "pending-offer");
assert.equal(cashKeepFirst?.text, HELOC_OFFER_COPY);
assert.deepEqual(
  (cashKeepFirst?.actions ?? []).map((item) => item.label),
  ["Stay", "Use HELOC"],
);

const helocButBuy = workspaceReply("I'm buying", helocAfterTime);
assert.equal(helocButBuy?.capture?.field, "productIntent");
assert.equal(
  helocButBuy?.capture && "value" in helocButBuy.capture ? helocButBuy.capture.value : "",
  "buy",
);

const helocReplace = workspaceReply("Replace the first", helocAfterTime);
assert.equal(helocReplace?.capture?.field, "productIntent");
assert.equal(
  helocReplace?.capture && "value" in helocReplace.capture ? helocReplace.capture.value : "",
  "refinance",
);

assert.ok(namedOutOfState("I live in Texas"));
assert.ok(!namedOutOfState("I live in California"));
const geoStop = workspaceReply("The property is in Texas", afterIncome);
assert.equal(geoStop?.capture?.field, "out-of-state");
assert.equal(geoStop?.text, GEO_STOP_COPY);
assert.doesNotMatch(geoStop?.text ?? "", /will contact you|we’ll be in touch|your lo has the file/i);
assert.ok((geoStop?.actions ?? []).some((item) => item.label === "Request human"));
assert.equal(workspacePrompt(draft({ ...afterIncome, outOfState: true })), "geo-stop");

const fhaNamed = workspaceReply("This is FHA", afterIncome);
assert.equal(fhaNamed?.capture?.field, "govProgram");
assert.ok((fhaNamed?.text ?? "").includes(GOVVIE_LINE));
assert.doesNotMatch(fhaNamed?.text ?? "", /MIP|UFMIP|FHA case|203\s*\(b\)|FHA guideline/i);
assert.ok((fhaNamed?.actions ?? []).some((item) => item.label === "Request human"));
const fhaReady = draft({ ...afterIncome, govProgram: "fha" });
assert.ok(!previewRateApplies(fhaReady));
assert.ok(previewFacts(fhaReady).some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(previewFacts(fhaReady).some((fact) => fact.id === "product" && fact.value === "Buy"));

const bkNamed = workspaceReply("I have an active bankruptcy", afterIncome);
assert.equal(bkNamed?.capture?.field, "statedDeclaration");
assert.doesNotMatch(bkNamed?.text ?? "", /Use this|Still right|I’ll note a credit event for underwriting/i);
assert.equal(afterIncome.statedDeclaration, undefined);
assert.equal(afterIncome.creditEvent, undefined);
assert.doesNotMatch(bkNamed?.text ?? "", /will contact you|chapter|waiting period|7-year|you don.t qualify/i);
assert.ok(!(bkNamed?.actions ?? []).some((item) => item.label === "Use this" || item.label === "Change"));
const bkReady = draft({
  ...afterIncome,
  sampleAccepted: true,
  housingAsked: true,
  subjectAddressAsked: true,
  workspaceDraftStatus: "with-originator",
  phase: "confirmed",
  creditEvent: "bankruptcy",
});
assert.ok(!previewRateApplies(bkReady));
assert.equal(workspacePrompt(bkReady), "done");
const bkDone = workspacePromptCopy("done", bkReady);
assert.ok((bkDone.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok((bkDone.actions ?? []).some((item) => item.label === "Request human"));
assert.ok(!/will contact you|we’ll be in touch|your lo has the file/i.test(bkDone.text));

const matrixLooksRight = workspaceReply("Looks right", readyForReview(investBuy));
assert.equal(matrixLooksRight?.capture?.field, "confirm-draft");
assert.match(matrixLooksRight?.text ?? "", /file can move|proceed/i);
assert.doesNotMatch(matrixLooksRight?.text ?? "", /government ID, latest paystub, and W-2|upload what you have|upload docs/i);
assert.ok((matrixLooksRight?.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok(!(matrixLooksRight?.actions ?? []).some((item) => item.label === "Upload docs"));
assert.ok((matrixLooksRight?.actions ?? []).some((item) => item.label === "Not yet"));
assert.doesNotMatch(
  `${matrixLooksRight?.text ?? ""} ${matrixLooksRight?.followUp ?? ""}`,
  /will contact you|we’ll be in touch|your lo has the file/i,
);

const correct = workspacePromptCopy("correct", afterIncome);
assert.equal(correct.text, CORRECT_ASK);
assert.doesNotMatch(correct.text, /Tap any line on the structure/);
assert.ok((correct.actions ?? []).some((item) => item.label === "Occupancy"));
assert.ok((correct.actions ?? []).some((item) => item.label === "Purchase price" || item.label === "Down payment"));
assert.ok((correct.actions ?? []).some((item) => item.label === "Credit"));
assert.ok((correct.actions ?? []).some((item) => item.label === "Income"));
assert.ok(!(correct.actions ?? []).some((item) => item.label === "Years in business"));
const seNoYears = withIncome(afterCredit, "self-employed");
assert.equal(workspacePrompt(seNoYears), "documents");
assert.ok(!seNoYears.facts?.years_in_business);
const seNoYearsChips = workspacePromptCopy("correct", seNoYears);
assert.ok((seNoYearsChips.actions ?? []).some((item) => item.label === "Years in business"));
assert.ok((seNoYearsChips.actions ?? []).some((item) => item.label === "Occupancy"));
assert.ok((seNoYearsChips.actions ?? []).some((item) => item.label === "Purchase price"));
assert.ok((seNoYearsChips.actions ?? []).some((item) => item.label === "Timeline"));
const bothNoYearsChips = workspacePromptCopy("correct", withIncome(afterCredit, "both"));
assert.ok((bothNoYearsChips.actions ?? []).some((item) => item.label === "Years in business"));
const seYearsFile = writeYearsInBusiness(
  draft({
    ...skipDocInvites(afterIncome),
    incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
  }),
  "4",
);
const seYearsChips = workspacePromptCopy("correct", seYearsFile);
assert.ok((seYearsChips.actions ?? []).some((item) => item.label === "Years in business"));
assert.ok((seYearsChips.actions ?? []).some((item) => item.label === "Occupancy"));
assert.ok((seYearsChips.actions ?? []).some((item) => item.label === "Purchase price"));
assert.ok((seYearsChips.actions ?? []).some((item) => item.label === "Timeline"));
const yearsCorrection = workspaceReply("correction: I’ve been in business 9 years", {
  ...seYearsFile,
  correcting: "correct",
});
assert.equal(yearsCorrection?.capture?.field, "yearsInBusiness");
assert.equal(
  yearsCorrection?.capture && "value" in yearsCorrection.capture ? yearsCorrection.capture.value : "",
  "9",
);
assert.notEqual(yearsCorrection?.capture?.field, "creditRange");
assert.notEqual(yearsCorrection?.capture?.field, "propertyValue");
assert.equal(parseCreditRange("correction: I’ve been in business 9 years"), null);
assert.equal(parseCreditRange("what does stated credit mean?"), null);
const changePrice = workspaceReply("change the purchase price to 875,000", afterIncome);
assert.equal(changePrice?.capture?.field, "propertyValue");
assert.equal(
  changePrice?.capture && "value" in changePrice.capture ? changePrice.capture.value : "",
  "875000",
);
assert.notEqual(changePrice?.capture?.field, "loanAmount");
assert.match(changePrice?.text ?? "", /\$875,000/);
assert.doesNotMatch(changePrice?.text ?? "", /Updated loan amount/);
const priceEdit = parseWorkspaceEdit("change the purchase price to 875,000", afterIncome);
assert.equal(priceEdit?.capture?.field, "propertyValue");
assert.equal(afterIncome.propertyValueAmount, 1_200_000);
assert.equal(afterIncome.downPaymentAmount, 240_000);
assert.notEqual(afterIncome.loanAmountValue, 875000);
assert.equal(workspacePrompt(afterIncome), "documents");
const sketchNeedsFix = workspaceReply("Needs a correction", afterIncome);
assert.equal(sketchNeedsFix?.capture?.field, "needs-correction");
assert.equal(sketchNeedsFix?.text, CORRECT_ASK);
assert.ok((sketchNeedsFix?.actions ?? []).some((item) => item.label === "Occupancy"));
assert.ok((sketchNeedsFix?.actions ?? []).some((item) => item.label === "Credit"));
assert.ok((sketchNeedsFix?.actions ?? []).some((item) => item.label === "Income"));
const sketchWhatChange = workspaceReply("what should I change?", afterIncome);
assert.equal(sketchWhatChange?.capture?.field, "needs-correction");
assert.equal(sketchWhatChange?.text, CORRECT_ASK);
assert.ok((sketchWhatChange?.actions ?? []).some((item) => item.label === "Occupancy"));
assert.ok((sketchWhatChange?.actions ?? []).some((item) => item.label === "Purchase price" || item.label === "Down payment"));
assert.doesNotMatch(sketchWhatChange?.text ?? "", /government ID|Start with ID|stated credit/i);
const seSketchWhat = workspaceReply("what should I change?", seNoYears);
assert.equal(seSketchWhat?.text, CORRECT_ASK);
assert.ok((seSketchWhat?.actions ?? []).some((item) => item.label === "Years in business"));
const sketchLooksFromCorrect = workspaceReply("looks right", {
  ...readyForReview(afterIncome),
  correcting: "correct",
});
assert.equal(sketchLooksFromCorrect?.capture?.field, "keep-line");
assert.notEqual(sketchLooksFromCorrect?.capture?.field, "confirm-draft");
assert.notEqual(sketchLooksFromCorrect?.text, CORRECT_ASK);
assert.match(sketchLooksFromCorrect?.text ?? "", /look right/i);
assert.ok((sketchLooksFromCorrect?.actions ?? []).some((item) => item.label === "Looks right"));
assert.ok((sketchLooksFromCorrect?.actions ?? []).some((item) => item.label === "Needs a correction"));
assert.ok(!(sketchLooksFromCorrect?.actions ?? []).some((item) => item.label === "Proceed"));
const needsFix = workspaceReply("Needs a correction", readyForReview(afterIncome));
assert.equal(needsFix?.capture?.field, "needs-correction");
assert.equal(needsFix?.text, CORRECT_ASK);
assert.ok((needsFix?.actions ?? []).some((item) => item.label === "Occupancy"));
const reviewLooksFromCorrect = workspaceReply("looks right", {
  ...readyForReview(afterIncome),
  correcting: "correct",
});
assert.equal(reviewLooksFromCorrect?.capture?.field, "keep-line");
assert.notEqual(reviewLooksFromCorrect?.capture?.field, "confirm-draft");
assert.notEqual(reviewLooksFromCorrect?.text, CORRECT_ASK);
assert.match(reviewLooksFromCorrect?.text ?? "", /look right/i);
assert.ok((reviewLooksFromCorrect?.actions ?? []).some((item) => item.label === "Looks right"));
assert.ok((reviewLooksFromCorrect?.actions ?? []).some((item) => item.label === "Needs a correction"));
assert.ok(!(reviewLooksFromCorrect?.actions ?? []).some((item) => item.label === "Proceed"));
const fixOccupancy = workspaceReply("occupancy is second home", {
  ...skipDocInvites(afterIncome),
  correcting: "correct",
});
assert.equal(fixOccupancy?.capture?.field, "occupancy");
assert.equal(
  fixOccupancy?.capture && "value" in fixOccupancy.capture ? fixOccupancy.capture.value : "",
  "second-home",
);
const leftoverCorrect = promptCopy("correct");
assert.equal(leftoverCorrect.text, CORRECT_ASK);
assert.doesNotMatch(leftoverCorrect.text, /Tap any line on the structure/);
const afterHoldLooks = readyForReview({ ...afterIncome, docsHeld: true });
assert.equal(workspacePrompt(afterHoldLooks), "review");
const afterHoldFix = workspaceReply("Needs a correction", afterHoldLooks);
assert.equal(afterHoldFix?.capture?.field, "needs-correction");
assert.equal(afterHoldFix?.text, CORRECT_ASK);
assert.ok((afterHoldFix?.actions ?? []).some((item) => item.label === "Occupancy"));
assert.ok((afterHoldFix?.actions ?? []).some((item) => item.label === "Credit"));
assert.doesNotMatch(afterHoldFix?.text ?? "", /Tap any line on the structure/);
const correctWhy = workspaceReply("why do you need that?", {
  ...skipDocInvites(afterIncome),
  correcting: "correct",
});
assert.match(correctWhy?.text ?? "", /fix one line on the sketch/);
assert.doesNotMatch(correctWhy?.text ?? "", /I can keep this file current\. Ask anything/);
assert.match(correctWhy?.text ?? "", /What should I change\?/);
assert.ok((correctWhy?.actions ?? []).some((item) => item.label === "Occupancy"));

assert.equal(resetWorkspaceForEntry("acr", "buy").productIntent, "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "1200000" });
applyCapture({ field: "propose-funds", value: "240000:960000" });
applyCapture({ field: "accept-proposal" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "self-employed" });
applyCapture({ field: "skip-years-in-business" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
applyCapture({ field: "skip-current-housing" });
applyCapture({ field: "skip-declarations" });
applyCapture({ field: "skip-household" });
applyCapture({ field: "skip-borrower-name" });
applyCapture({ field: "skip-other-reo" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.ok(!getFoxDraft().facts?.years_in_business);
const liveSketchFix = workspaceReply("Needs a correction", getFoxDraft());
assert.equal(liveSketchFix?.capture?.field, "needs-correction");
assert.equal(liveSketchFix?.text, CORRECT_ASK);
assert.ok((liveSketchFix?.actions ?? []).some((item) => item.label === "Years in business"));
if (liveSketchFix?.capture) applyCapture(liveSketchFix.capture);
assert.equal(workspacePrompt(getFoxDraft()), "correct");
const liveLooks = workspaceReply("looks right", getFoxDraft());
assert.equal(liveLooks?.capture?.field, "keep-line");
assert.notEqual(liveLooks?.text, CORRECT_ASK);
assert.equal(liveLooks?.text, PURCHASE_ADDRESS_ASK);
assert.ok(!(liveLooks?.actions ?? []).some((item) => item.label === "Looks right"));
if (liveLooks?.capture) applyCapture(liveLooks.capture);
assert.equal(workspacePrompt(getFoxDraft()), "property-address");
applyCapture({ field: "skip-property-address" });
assert.equal(workspacePrompt(getFoxDraft()), "citizenship");
assert.equal(nextFoxAsk(getFoxDraft()).text, CITIZENSHIP_ASK);
applyCapture({ field: "skip-citizenship" });
assert.equal(workspacePrompt(getFoxDraft()), "assets");
assert.equal(nextFoxAsk(getFoxDraft()).text, BANK_STATEMENT_ASK);
applyCapture({ field: "skip-available-assets" });
assert.equal(workspacePrompt(getFoxDraft()), "review");
assert.notEqual(getFoxDraft().motion, "in_queue");

const afterLooks = draft({
  ...afterIncome,
  sampleAccepted: true,
  workspaceDraftStatus: "with-originator",
  phase: "confirmed",
});
assert.equal(workspacePrompt(afterLooks), "housing");
assert.equal(statusCopy(afterLooks), "gathering");
assert.equal(nextActorOf(afterLooks), "You");
assert.notEqual(statusCopy(afterLooks), "Assigned / reviewing");
const assignedFacts = previewFacts(afterLooks);
assert.ok(assignedFacts.some((fact) => fact.id === "status" && fact.value === "gathering"));
assert.ok(assignedFacts.some((fact) => fact.id === "next" && fact.value === "You"));
assert.ok(assignedFacts.some((fact) => fact.id === "file"));
const statusAt = assignedFacts.findIndex((fact) => fact.id === "status");
const nextAt = assignedFacts.findIndex((fact) => fact.id === "next");
const completenessAt = assignedFacts.findIndex((fact) => fact.id === "file");
assert.equal(assignedFacts[completenessAt]?.label, "Completeness");
assert.ok(statusAt >= 0 && nextAt === statusAt + 1 && completenessAt === nextAt + 1);
assert.ok(stillUsefulSection(afterLooks)?.items.some((item) => item.label === "Property address"));
assert.equal(fileCompleteness(afterLooks)?.state, "sketch");
assert.equal(fileCompleteness(afterLooks)?.copy, `sketch · 4 of ${CONVENTIONAL_FILE_SLOT_TOTAL}`);
assert.ok(!/agency_partial|agency_ready/.test(fileCompleteness(afterLooks)?.copy ?? ""));
assert.ok(
  assignedFacts.some(
    (fact) =>
      fact.id === "file" &&
      fact.value === `sketch · 4 of ${CONVENTIONAL_FILE_SLOT_TOTAL}` &&
      !/agency_partial|agency_ready/.test(fact.value),
  ),
);
assert.equal(fileStillUsefulNote(afterLooks), undefined);
assert.equal(layer2Open(afterLooks), false);
assert.ok(stillUsefulSection(afterIncome));
assert.deepEqual(
  stillUsefulSection(afterIncome)?.items.map((item) => item.label),
  [
    "Government ID",
    "Latest two paystubs",
    "W-2 most recent two years",
    "Property address",
    "Purchase contract",
    "Bank statement",
  ],
);
assert.ok(stillUsefulSection(afterLooks));
assert.ok(!stillUsefulSection(afterLooks)?.items.some((item) => item.label === "Latest return"));
assert.ok(!stillUsefulSection(afterLooks)?.items.some((item) => item.label === "Employer"));
assert.ok(!stillUsefulSection(afterLooks)?.items.some((item) => /years in business/i.test(item.label)));
const confirmedFromDocs = {
  full_name: {
    field: "full_name",
    value: "Ada Borrower",
    source: "document" as const,
    confirmed: true,
    confirmedAt: "2026-08-20T00:00:00.000Z",
  },
  employer_name: {
    field: "employer_name",
    value: "Harbor Steel",
    source: "document" as const,
    confirmed: true,
    confirmedAt: "2026-08-20T00:00:00.000Z",
  },
};
const docsBeforeLooks = draft({ ...afterIncome, facts: confirmedFromDocs });
assert.equal(fileCompleteness(docsBeforeLooks)?.state, "agency_partial");
assert.match(fileCompleteness(docsBeforeLooks)?.copy ?? "", new RegExp(`^sketch · \\d+ of ${CONVENTIONAL_FILE_SLOT_TOTAL}$`));
assert.ok(!/agency_partial|agency_ready/.test(fileCompleteness(docsBeforeLooks)?.copy ?? ""));
assert.ok(
  previewFacts(docsBeforeLooks).some(
    (fact) => fact.id === "file" && new RegExp(`^sketch · \\d+ of ${CONVENTIONAL_FILE_SLOT_TOTAL}$`).test(fact.value) && !/agency_partial/.test(fact.value),
  ),
);
assert.ok(assignedFacts.some((fact) => fact.id === "originator" && fact.value === "Licensed originator assigned"));
assert.ok(assignedFacts.some((fact) => fact.id === "letter"));
const assignedReward = assignedFacts.find((fact) => fact.id === "reward");
assert.equal(assignedReward?.value, "Prepared when you join");
assert.ok(!/\$[\d,]/.test(assignedReward?.value ?? ""));
assert.ok(
  assignedFacts.some(
    (fact) => fact.id === "scout" && fact.value === "When the timing is wrong, Fox waits.",
  ),
);

const done = workspacePromptCopy("done", afterLooks);
assert.equal(done.text, MOTION_COPY.ready);
assert.doesNotMatch(done.text, /government ID|upload what you have|skip is fine|upload docs/i);
assert.ok(!/I’m preparing this desk/i.test(done.text));
assert.ok(!/we’ll be in touch|will contact you|your lo has the file/i.test(done.text));
assert.ok(!(done.actions ?? []).some((item) => item.label === "Upload docs"));
assert.ok((done.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok((done.actions ?? []).some((item) => item.label === "Not yet"));
assert.ok((done.actions ?? []).some((item) => item.label === "Request human"));
assert.ok(!(done.actions ?? []).some((item) => item.href === "/advisor"));
assert.ok(!(done.actions ?? []).some((item) => /talk to a licensed originator/i.test(item.label)));

const human = workspaceReply("Request human", afterLooks);
assert.ok(human);
assert.equal(human.text, MOTION_COPY.escalated);
assert.ok(!/I’m preparing this desk/i.test(human.text ?? ""));
assert.ok(!/we’ll be in touch|will contact you/i.test(human.text ?? ""));
assert.equal(human.capture?.field, "talk-originator");

const afterHuman = workspacePromptCopy("done", {
  ...afterLooks,
  originatorRequested: true,
  motion: "escalated",
  nextActor: "ONYX",
});
assert.equal(afterHuman.text, MOTION_COPY.escalated);
assert.ok(!(afterHuman.actions ?? []).some((item) => item.label === "Request human"));
assert.ok(!/I’m preparing this desk|will contact you/i.test(afterHuman.text));

const loanDone = workspacePromptCopy(
  "done",
  draft({
    path: "loan-only",
    sampleAccepted: true,
    motion: "ready",
    nextActor: "You",
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    documentsSkipped: true,
    skippedClasses: ["government_id", "paystub", "w2"],
  }),
);
assert.equal(loanDone.text, MOTION_COPY.ready);
assert.ok((loanDone.actions ?? []).some((item) => item.label === "What is ACR?"));
assert.ok((loanDone.actions ?? []).some((item) => item.label === "Proceed"));

assert.equal(structureFixPrompt("path"), "path-switch");
assert.equal(structureFixPrompt("occupancy"), "occupancy");
assert.equal(structureFixPrompt("price", afterPrice), "value");
assert.equal(structureFixPrompt("down", afterPrice), "amount");
assert.equal(structureFixPrompt("loan", afterPrice), "amount");
assert.equal(structureFixPrompt("line", helocReady), "amount");
assert.equal(structureFixPrompt("file"), null);
assert.equal(structureFixPrompt("rate"), null);
assert.equal(structureFixPrompt("reward"), null);
assert.equal(structureFixPrompt("letter"), null);
assert.equal(structureFixPrompt("scout"), null);
assert.equal(structureFixPrompt("status"), null);
assert.equal(structureFixPrompt("next"), null);
assert.equal(structureFixPrompt("originator"), null);
assert.ok(structureExplainCopy("rate", afterIncome)?.text.includes("cannot set"));
assert.ok(FOX_DISCLOSURE.includes("cannot approve"));

assert.equal(slotFromFilename("w2-2024.pdf"), "w2");
assert.equal(resetWorkspaceForEntry("acr", "buy").productIntent, "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "starter", value: "buy", price: "850000" });
assert.equal(getFoxDraft().productIntent, "buy");
assert.equal(getFoxDraft().propertyValueAmount, 850000);
setFoxMessages([{ id: "keep", role: "client", text: "20" }]);
const wiped = startOverWorkspace("acr");
assert.equal(wiped.productIntent, undefined);
assert.equal(wiped.propertyValueAmount, undefined);
assert.equal(wiped.occupancyChoice.value, "");
assert.equal(wiped.path, "acr");
assert.equal(workspacePrompt(wiped), "product");
assert.equal(getFoxMessages().length, 0);
assert.ok((workspacePromptCopy("product", wiped).actions ?? []).some((item) => item.label === "Buy"));

const pathSetReply = workspaceReply("Start your relationship", draft());
assert.equal(pathSetReply?.capture?.field, "path");
assert.ok(!(pathSetReply?.followUp ?? "").includes(FOX_DISCLOSURE));

const w2Docs = workspacePromptCopy("documents", afterIncome);
assert.match(w2Docs.text, /sketch|notepad/i);
assert.doesNotMatch(w2Docs.text, /drop what you have|skip is fine|latest paystub/i);
assert.deepEqual(
  (w2Docs.actions ?? []).map((item) => item.label),
  ["Start with ID", "Skip", "Not yet"],
);
const w2Started = workspacePromptCopy("documents", { ...afterIncome, docsStarted: true });
assert.equal(w2Started.text, DOC_INVITE_COPY.government_id);
assert.doesNotMatch(w2Started.text, /drop what you have|skip is fine|tax return|latest paystub/i);
assert.deepEqual(
  (w2Started.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const w2AfterId = skipCurrentInvite(afterIncome);
assert.equal(workspacePromptCopy("documents", w2AfterId).text, DOC_INVITE_COPY.paystub);
const w2AfterStub = skipCurrentInvite(w2AfterId);
assert.equal(workspacePromptCopy("documents", w2AfterStub).text, DOC_INVITE_COPY.w2);
const w2AfterPrimary = skipCurrentInvite(w2AfterStub);
assert.equal(workspacePrompt(w2AfterPrimary), "property-address");
assert.equal(nextFoxAsk(w2AfterPrimary).text, PURCHASE_ADDRESS_ASK);
assert.equal(workspacePrompt(skipSubjectAddress(w2AfterPrimary)), "citizenship");
assert.equal(workspacePrompt(skipCitizenship(skipSubjectAddress(w2AfterPrimary))), "assets");
assert.equal(workspacePrompt(skipAvailableAssets(skipCitizenship(skipSubjectAddress(w2AfterPrimary)))), "review");
const w2Request = docsRequestForIncome("w2");
assert.deepEqual(w2Request.labels, ["government ID", "latest paystub", "W-2"]);
assert.ok(!w2Request.labels.includes("Bank statements"));

const seHandOff = workspacePromptCopy("documents", withIncome(afterCredit, "self-employed"));
assert.match(seHandOff.followUp ?? "", /income docs \(latest return\)/);
assert.doesNotMatch(seHandOff.followUp ?? "", /prior-year|P&L/i);
const bothHandOff = workspacePromptCopy("documents", withIncome(afterCredit, "both"));
assert.match(bothHandOff.followUp ?? "", /income docs \(latest paystub, W-2, and latest return\)/);
assert.doesNotMatch(bothHandOff.followUp ?? "", /prior-year|P&L/i);
const seIncome = withIncome(afterCredit, "self-employed");
const selfLooks = workspaceReply("Looks right", readyForReview(seIncome));
assert.equal(selfLooks?.capture?.field, "confirm-draft");
assert.match(selfLooks?.text ?? "", /file can move|proceed/i);
assert.doesNotMatch(selfLooks?.text ?? "", /government ID|most recent tax return|prior-year return if available|upload what you have|upload docs/i);
assert.ok(!(selfLooks?.actions ?? []).some((item) => item.label === "Upload docs"));
assert.ok((selfLooks?.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok((selfLooks?.actions ?? []).some((item) => item.label === "Not yet"));
const seCoachLooks = applyLooksRightMotion(readyForReview(seIncome));
const uploadDocsReply = workspaceReply("Upload docs", seCoachLooks);
assert.equal(uploadDocsReply?.capture?.field, "upload-more");
assert.equal((uploadDocsReply?.text ?? "").trim(), "");
assert.doesNotMatch(uploadDocsReply?.text ?? "", /government ID|most recent tax return|prior-year return|upload docs/i);
assert.doesNotMatch(
  workspaceUpdateCopy({ field: "upload-more" }, seCoachLooks),
  /government ID|most recent tax return|prior-year return/i,
);
const seIncomeReply = workspaceReply("Self-employed", afterCredit);
assert.doesNotMatch(seIncomeReply?.text ?? "", /^Self-employed\.|Self-employed\. Here’s a sample structure/i);
assert.equal(seIncomeReply?.text, OTHER_REO_ASK);
assert.doesNotMatch(seIncomeReply?.text ?? "", /How long have you had this business|How long have you been running this|other monthly debts/i);
assert.deepEqual(
  (seIncomeReply?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const seAfterId = skipCurrentInvite(seIncome);
assert.equal(workspacePromptCopy("documents", seAfterId).text, DOC_INVITE_COPY.tax_return);
const whyReturn = workspaceReply("Why do you need that?", seAfterId);
assert.match(whyReturn?.text ?? "", /qualifying income|not underwritten/i);
assert.match(whyReturn?.text ?? "", /most recent tax return/i);
assert.deepEqual(
  (whyReturn?.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const seAfterReturnSkip = skipCurrentInvite(seAfterId);
assert.equal(workspacePrompt(seAfterReturnSkip), "documents");
assert.equal(workspacePromptCopy("documents", seAfterReturnSkip).text, DOC_INVITE_COPY.prior_year_return);
assert.deepEqual(
  (workspacePromptCopy("documents", seAfterReturnSkip).actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
assert.notEqual(workspacePrompt(seAfterReturnSkip), "review");
const skipSeId = workspaceReply("Skip", seIncome);
assert.equal(skipSeId?.text, DOC_INVITE_COPY.tax_return);
assert.ok((skipSeId?.actions ?? []).some((item) => item.label === "Upload this"));
assert.ok((skipSeId?.actions ?? []).some((item) => item.label === "Skip"));
const seWithReturn = draft({
  ...seAfterId,
  documents: [
    {
      slot: "other",
      name: "return-2024.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "tax_return",
    },
  ],
});
assert.equal(workspacePromptCopy("documents", seWithReturn).text, DOC_INVITE_COPY.prior_year_return);
const uploadThisThread = [
  { role: "fox" as const, text: DOC_INVITE_COPY.government_id },
  { role: "client" as const, text: "Upload this" },
];
assert.equal(lastFoxTurn(uploadThisThread)?.text, DOC_INVITE_COPY.government_id);
assert.equal(
  lastFoxTurn(uploadThisThread)?.text,
  workspacePromptCopy("documents", { ...seIncome, docsStarted: true }).text,
);
const skipThenTax = [
  { role: "fox" as const, text: DOC_INVITE_COPY.government_id },
  { role: "client" as const, text: "Skip" },
  { role: "fox" as const, text: workspacePromptCopy("documents", seAfterId).text },
];
assert.equal(lastFoxTurn(skipThenTax)?.text, DOC_INVITE_COPY.tax_return);
assert.notEqual(lastFoxTurn(skipThenTax)?.text, DOC_INVITE_COPY.government_id);
const priorYearThread = [
  { role: "fox" as const, text: DOC_INVITE_COPY.prior_year_return },
  { role: "client" as const, text: "Upload this" },
];
const priorYearInFlight = draft({
  ...seWithReturn,
  documents: [
    ...seWithReturn.documents,
    {
      slot: "other",
      name: "return-2023.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-21T00:00:00.000Z",
      status: "reading",
    },
  ],
});
assert.equal(workspacePrompt(priorYearInFlight), "documents");
assert.equal(workspacePromptCopy("documents", priorYearInFlight).text, DOC_INVITE_COPY.prior_year_return);
assert.equal(lastFoxTurn(priorYearThread)?.text, workspacePromptCopy("documents", priorYearInFlight).text);
const priorYearExtract = applyExtractedFields(priorYearInFlight, {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: {
    tax_year: "2023",
    return_kind: "schedule_c",
    schedule_c_net_profit: "88000",
  },
});
assert.ok(priorYearExtract.draft.pendingProposal || priorYearExtract.draft.pendingConflict);
assert.notEqual(workspacePrompt(priorYearExtract.draft), "documents");
assert.notEqual(
  workspacePromptCopy(workspacePrompt(priorYearExtract.draft), priorYearExtract.draft).text,
  DOC_INVITE_COPY.prior_year_return,
);
const selfDocs = workspacePromptCopy("documents", seIncome);
assert.match(selfDocs.text, /sketch/i);
assert.doesNotMatch(selfDocs.text, /paystub|w-2|drop what you have/i);
assert.deepEqual(
  (selfDocs.actions ?? []).map((item) => item.label),
  ["Start with ID", "Skip", "Not yet"],
);
assert.ok((selfDocs.actions ?? []).some((item) => item.capture?.field === "skip-docs"));
const selfRequest = docsRequestForIncome("self-employed");
assert.deepEqual(selfRequest.labels, ["government ID", "tax return"]);
assert.ok(!selfRequest.labels.includes("Paystubs"));
assert.ok(!selfRequest.labels.includes("W-2"));

const bothRequest = docsRequestForIncome("both");
assert.ok(bothRequest.labels.includes("latest paystub"));
assert.ok(bothRequest.labels.includes("tax return"));
assert.ok(bothRequest.labels.includes("government ID"));
assert.ok(bothRequest.labels.includes("W-2"));

const otherRequest = docsRequestForIncome("other");
assert.deepEqual(otherRequest.labels, ["government ID", "tax return"]);
assert.match(otherRequest.text, /government ID and tax return/i);
assert.doesNotMatch(otherRequest.text, /drop what you have|latest paystub/i);
const otherDocs = workspacePromptCopy("documents", withIncome(afterCredit, "other"));
assert.ok((otherDocs.actions ?? []).some((item) => item.capture?.field === "skip-docs"));

const dropAfterLooks = workspacePromptCopy("documents", {
  ...afterLooks,
  docsOpen: true,
  correcting: "documents",
});
assert.ok(!(dropAfterLooks.actions ?? []).some((item) => item.label === "Upload docs"));

const skippedLooks = draft({
  ...afterLooks,
  documentsSkipped: true,
  docsOpen: false,
  correcting: null,
  skippedClasses: ["government_id", "paystub", "w2"],
  motion: "ready",
  nextActor: "You",
});
assert.equal(workspacePrompt(skippedLooks), "housing");
assert.equal(statusCopy(skippedLooks), "ready");
assert.equal(nextActorOf(skippedLooks), "You");
assert.ok(previewFacts(skippedLooks).some((fact) => fact.id === "docs" && fact.value === "Skipped"));
assert.ok(previewFacts(skippedLooks).some((fact) => fact.id === "originator"));
assert.ok(previewFacts(skippedLooks).some((fact) => fact.id === "next" && fact.value === "You"));

const skipReply = workspaceReply("Skip for now", { ...afterLooks, correcting: "documents", docsOpen: true });
assert.equal(skipReply?.capture?.field, "skip-docs");
assert.equal(workspacePrompt({ ...afterLooks, documentsSkipped: true, correcting: null, docsOpen: false }), "housing");

assert.equal(workspacePrompt({ ...afterLooks, correcting: "occupancy" }), "occupancy");
assert.notEqual(workspacePrompt({ ...afterLooks, correcting: "occupancy" }), "documents");
assert.equal(
  workspacePrompt({
    ...afterLooks,
    correcting: null,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "second-home" },
  }),
  "housing",
);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "1200000" });
assert.equal(workspacePrompt(getFoxDraft()), "amount");
assert.ok(!canLooksRight(getFoxDraft()));
confirmLooksRight();
assert.equal(getFoxDraft().sampleAccepted, undefined);
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
assert.equal(workspacePrompt(getFoxDraft()), "income");
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
applyCapture({ field: "skip-time-on-job" });
applyCapture({ field: "skip-current-housing" });
applyCapture({ field: "skip-declarations" });
applyCapture({ field: "skip-household" });
applyCapture({ field: "skip-borrower-name" });
applyCapture({ field: "skip-other-reo" });
assert.equal(getFoxDraft().documentsSkipped, false);
assert.equal(workspacePrompt(getFoxDraft()), "documents");
applyCapture({ field: "skip-docs" });
applyCapture({ field: "skip-docs" });
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "property-address");
applyCapture({ field: "skip-property-address" });
assert.equal(workspacePrompt(getFoxDraft()), "citizenship");
applyCapture({ field: "skip-citizenship" });
assert.equal(workspacePrompt(getFoxDraft()), "assets");
applyCapture({ field: "skip-available-assets" });
assert.equal(workspacePrompt(getFoxDraft()), "review");
confirmLooksRight();
const confirmed = getFoxDraft();
assert.equal(workspacePrompt(confirmed), "housing");
assert.equal(statusCopy(confirmed), "ready");
assert.equal(nextActorOf(confirmed), "You");
assert.equal(confirmed.phase, "confirmed");
assert.ok(confirmed.sampleAccepted);
assert.notEqual(motionOf(confirmed), "in_queue");
applyCapture({ field: "open-docs" });
const opened = getFoxDraft();
assert.equal(opened.docsOpen, true);
assert.equal(opened.phase, "confirmed");
assert.equal(workspacePrompt(opened), "housing");
assert.ok(statusCopy(opened) === "ready" || statusCopy(opened) === "gathering");
applyCapture({ field: "skip-docs" });
const afterSkip = getFoxDraft();
assert.equal(afterSkip.documentsSkipped, true);
assert.equal(afterSkip.docsOpen, false);
assert.equal(afterSkip.phase, "confirmed");
assert.notEqual(motionOf(afterSkip), "in_queue");
assert.equal(statusCopy(afterSkip), "ready");
assert.equal(workspacePrompt(afterSkip), "housing");
assert.ok(previewFacts(afterSkip).some((fact) => fact.id === "docs" && fact.value === "Skipped"));
assert.ok(previewFacts(afterSkip).some((fact) => fact.id === "originator"));
assert.ok(!(afterSkip.workItems ?? []).some((item) => item.kind === "review" && item.state === "open"));
assert.ok((afterSkip.skippedClasses ?? []).includes("government_id"));
assert.ok((afterSkip.skippedClasses ?? []).includes("paystub"));
assert.ok((afterSkip.skippedClasses ?? []).includes("w2"));
assert.ok(!(afterSkip.skippedClasses ?? []).includes("purchase_contract"));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "other" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
applyCapture({ field: "skip-current-housing" });
applyCapture({ field: "skip-declarations" });
applyCapture({ field: "skip-household" });
applyCapture({ field: "skip-borrower-name" });
applyCapture({ field: "skip-other-reo" });
assert.equal(getFoxDraft().documentsSkipped, false);
assert.equal(workspacePrompt(getFoxDraft()), "documents");

const plantedReward = {
  id: "stale-review",
  role: "fox" as const,
  text: "Here’s a sample structure.",
  facts: [
    { id: "rate", label: "Rate", value: "Pricing when the file is ready" },
    {
      id: "reward",
      label: "Reward",
      value: "$446 to $604",
      note: "Sample · indicative · not live",
    },
  ],
};
const plantedAsk = {
  id: "stale-ask",
  role: "fox" as const,
  text: "Estimated ACR reward is $446 to $604. Sample, not live.",
};
const migratedThread = migrateRestoredFoxMessages([plantedReward, plantedAsk]);
const migratedReward = migratedThread[0]?.facts?.find((fact) => fact.id === "reward");
assert.equal(migratedReward?.value, REWARD_PREPARED_COPY);
assert.equal(migratedReward?.note, undefined);
assert.ok(!/\$[\d,]/.test(migratedReward?.value ?? ""));
assert.ok(!/446|604/.test(JSON.stringify(migratedThread)));
assert.ok(
  migratedThread[0]?.facts?.some(
    (fact) => fact.id === "rate" && fact.value === "Pricing when the file is ready",
  ),
);
assert.match(migratedThread[1]?.text ?? "", /prepared when you join/i);

resetWorkspaceForEntry(null);
setFoxMessages([plantedReward, plantedAsk]);
const hydratedThread = getFoxMessages();
const hydratedReward = hydratedThread.find((message) => message.id === "stale-review")?.facts?.find(
  (fact) => fact.id === "reward",
);
assert.equal(hydratedReward?.value, REWARD_PREPARED_COPY);
assert.ok(!/446|604/.test(JSON.stringify(hydratedThread)));

resetWorkspaceForEntry(null);
setFoxMessages([
  { id: "fox-home", role: "fox", text: homeStart.text, actions: homeStart.actions },
  { id: "client-buy", role: "client", text: "I want to buy" },
]);
applyCapture({ field: "productIntent", value: "buy" });
assert.equal(workspaceSessionStarted(), true);
const keptHome = continueWorkspaceFromEntry("acr", null);
assert.equal(keptHome.productIntent, "buy");
assert.equal(keptHome.path, "acr");
assert.ok(getFoxMessages().some((message) => message.text === "I want to buy"));
assert.ok(getFoxMessages().some((message) => message.role === "client"));

resetWorkspaceForEntry(null);
setFoxMessages([{ id: "fox-only", role: "fox", text: homeStart.text, actions: homeStart.actions }]);
assert.equal(workspaceSessionStarted(), false);
beginWorkspaceFromHero("loan-only");
assert.equal(getFoxDraft().path, "loan-only");
assert.equal(getFoxDraft().productIntent, undefined);
assert.equal(getFoxMessages().length, 0);
assert.equal(workspacePrompt(getFoxDraft()), "product");

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "starter", value: "buy", price: "850000" });
setFoxMessages([{ id: "mid-file", role: "client", text: "I want to buy" }]);
assert.equal(workspaceSessionStarted(), true);
assert.equal(getFoxDraft().productIntent, "buy");
beginWorkspaceFromHero("acr");
assert.equal(getFoxDraft().path, "acr");
assert.equal(getFoxDraft().productIntent, undefined);
assert.equal(getFoxDraft().propertyValueAmount, undefined);
assert.equal(getFoxMessages().length, 0);
assert.equal(workspacePrompt(getFoxDraft()), "product");
const heroLoanWipe = beginWorkspaceFromHero("loan-only");
assert.equal(heroLoanWipe.path, "loan-only");
assert.equal(heroLoanWipe.productIntent, undefined);
assert.equal(workspacePrompt(heroLoanWipe), "product");

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("850000", "680000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
setFoxMessages([{ id: "keep-return", role: "fox", text: "These docs help next: government ID." }]);
assert.equal(shouldResumeWorkspaceEntry(), true);
assert.ok(getFoxDraft().sampleAccepted);
const resumedLooks = continueWorkspaceFromEntry("acr");
assert.ok(resumedLooks.sampleAccepted);
assert.equal(resumedLooks.productIntent, "buy");
assert.ok(getFoxMessages().some((message) => message.id === "keep-return"));
const freshLooks = continueWorkspaceFromEntry("acr", null, { fresh: true });
assert.equal(freshLooks.productIntent, undefined);
assert.ok(!freshLooks.sampleAccepted);
assert.equal(getFoxMessages().length, 0);
assert.equal(workspacePrompt(freshLooks), "product");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const paystubWrite = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.92,
  fields: {
    employer_name: "Harbor Steel",
    pay_period_end: "2026-07-31",
    gross_period: "7200",
    ytd_gross: "50400",
    net_period: "5100",
    ssn: "123-45-6789",
    account_number: "000123456789",
  },
});
assert.equal(paystubWrite.conflict, null);
assert.ok(!paystubWrite.quietLines.includes("Updated income from paystub."));
assert.ok(paystubWrite.quietLines.every((line) => !isDeadFileWriteLine(line)));
assert.equal(paystubWrite.draft.facts?.employer_name, undefined);
assert.equal(paystubWrite.draft.facts?.gross_period, undefined);
assert.equal(paystubWrite.draft.facts?.ssn, undefined);
assert.equal(paystubWrite.draft.awaitingPayFrequency, true);
assert.equal(workspacePrompt(paystubWrite.draft), "pay-frequency");
assert.equal(paystubWrite.draft.facts?.qualifying_income, undefined);
const paystubReady = applyPayFrequencyAnswer(paystubWrite.draft, "monthly");
assert.equal(workspacePrompt(paystubReady), "confirm-proposal");
assert.equal(paystubReady.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(paystubReady.pendingProposal?.value, "7200");
assert.equal(paystubReady.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.ok(
  (paystubReady.pendingProposal?.extras ?? []).some(
    (item) => item.field === "employer_name" && item.value === "Harbor Steel",
  ),
);
assert.ok(
  (paystubReady.pendingProposal?.extras ?? []).some((item) => item.field === "ytd_gross" && item.value === "50400"),
);
assert.equal(paystubReady.facts?.qualifying_income, undefined);
assert.equal(paystubReady.productIntent, afterLooks.productIntent);
assert.ok(previewFacts(paystubReady).some((fact) => fact.id === "employer" && fact.value === "Harbor Steel"));
assert.ok(previewFacts(paystubReady).some((fact) => fact.id === "pay" && /7,200/.test(fact.value)));
assert.ok(previewFacts(paystubReady).some((fact) => fact.id === "pay" && /YTD/.test(fact.value)));
const paystubConfirmed = resolveProposal(paystubReady, "accept");
assert.equal(paystubConfirmed.facts?.employer_name?.value, "Harbor Steel");
assert.equal(paystubConfirmed.facts?.gross_period?.value, "7200");
assert.equal(paystubConfirmed.facts?.pay_period_end?.value, "2026-07-31");
assert.equal(paystubConfirmed.facts?.ytd_gross?.value, "50400");
assert.ok(
  previewFacts(paystubReady).some(
    (fact) =>
      fact.id === "qualifying" &&
      /7,200/.test(fact.value) &&
      fact.note === SUGGESTED_INCOME_NOTE,
  ),
);
assert.ok(previewFacts(paystubReady).every((fact) => fact.id !== "product" || fact.value !== "Other"));
assert.equal(structureFixPrompt("employer"), null);
assert.equal(structureFixPrompt("pay"), null);
const paystubAsk = nextFoxAsk(paystubReady);
assert.match(paystubAsk.text, /Got the paystub/);
assert.match(paystubAsk.text, /monthly period × 12 \/ 12/);
assert.ok((paystubAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((paystubAsk.actions ?? []).some((item) => item.label === "Change"));
assertIncomeChipsHoldOverQueue(paystubReady, /7,200/);
assert.equal(paystubConfirmed.facts?.qualifying_income?.value, "7200");

const acmeWrite = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: {
    employer_name: "Acme",
    pay_period_end: "2026-08-07",
    gross_period: "4230.77",
    ytd_gross: "67692.32",
  },
});
assert.equal(acmeWrite.draft.awaitingPayFrequency, true);
assert.equal(acmeWrite.draft.facts?.qualifying_income, undefined);
const acmeReady = applyPayFrequencyAnswer(acmeWrite.draft, "biweekly");
assert.equal(acmeReady.pendingProposal?.value, "9167");
assert.equal(acmeReady.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.equal(acmeReady.awaitingPayFrequency, false);
assert.equal(acmeReady.facts?.qualifying_income, undefined);
assert.equal(acmeReady.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(acmeReady.statedTimeOnJob, undefined);
assert.equal(acmeReady.pendingHireDate, undefined);
assert.equal(acmeReady.facts?.hire_date, undefined);
const acmeAsk = nextFoxAsk(acmeReady);
assert.match(acmeAsk.text, /Got the paystub/);
assert.match(acmeAsk.text, /9,167/);
assert.match(acmeAsk.text, /biweekly period × 26 \/ 12/);
assert.match(acmeAsk.text, /Suggested qualifying income · not underwritten/);
assert.ok((acmeAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((acmeAsk.actions ?? []).some((item) => item.label === "Change"));
assert.equal(docReactionAsk(acmeReady, "paystub")?.actions?.some((item) => item.label === "Use this"), true);
assertIncomeChipsHoldOverQueue(acmeReady, /9,167/);
const acmeQualifyAsk = workspaceReply("will i qualify", acmeReady);
assert.notEqual(acmeQualifyAsk?.capture?.field, "accept-proposal");
assert.notEqual(acmeQualifyAsk?.capture?.field, "decline-proposal");
assert.equal(acmeReady.facts?.qualifying_income, undefined);
assertAnswerThenRestore(acmeQualifyAsk, /Not ready yet —/, {
  text: /9,167/,
  labels: ["Use this", "Change"],
});
assert.match(acmeQualifyAsk?.text ?? "", /biweekly period × 26 \/ 12/);
assert.match(acmeQualifyAsk?.text ?? "", /A W-2 is still missing/);
assert.doesNotMatch(stripReadinessAnswer(acmeQualifyAsk?.text ?? ""), /you qualify|you are approved|you don’t qualify/i);
assert.equal(resolveProposal(acmeReady, "accept").facts?.qualifying_income?.value, "9167");
assert.equal(resolveProposal(acmeReady, "decline").facts?.qualifying_income, undefined);

const acmeStaleWrite = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: {
    employer_name: "Acme",
    pay_period_end: "2026-08-07",
    gross_period: "4230.77",
    ytd_gross: "67692.32",
    pay_frequency: "semimonthly",
  },
});
assert.equal(acmeStaleWrite.draft.awaitingPayFrequency, false);
assert.equal(acmeStaleWrite.draft.pendingProposal?.value, "8462");
assert.match(nextFoxAsk(acmeStaleWrite.draft).text, /semi-monthly period × 24 \/ 12/);

const typedIncome = draft({
  ...afterLooks,
  facts: {
    income: { field: "income", value: "6000", source: "client", confirmed: true },
  },
});
const incomeConflict = applyExtractedFields(typedIncome, {
  extractClass: "paystub",
  confidence: 0.9,
  fields: { employer_name: "Harbor Steel", gross_period: "7200" },
});
assert.ok(incomeConflict.conflict);
assert.equal(incomeConflict.conflict?.field, "income");
assert.equal(incomeConflict.draft.facts?.income?.value, "6000");
assert.notEqual(incomeConflict.draft.facts?.gross_period?.value, "7200");
assert.equal(incomeConflict.draft.facts?.employer_name?.value, "Harbor Steel");
const keptFile = resolveFactConflict(incomeConflict.draft, "file");
assert.equal(keptFile.facts?.income?.value, "6000");
assert.equal(keptFile.pendingConflict, null);
const usedDoc = resolveFactConflict(incomeConflict.draft, "document");
assert.equal(usedDoc.facts?.income?.value, "7200");
assert.equal(usedDoc.facts?.income?.source, "document");
const keepBoth = resolveFactConflict(incomeConflict.draft, "both");
assert.equal(keepBoth.facts?.income?.value, "6000");
assert.equal(keepBoth.facts?.income_document?.value, "7200");
assert.equal(keepBoth.unresolvedConflict, true);
assert.equal(keepBoth.pendingConflict, null);
assert.notEqual(keepBoth.facts?.income?.value, "6600");
assert.equal(storeEscalate({ unresolvedConflict: true }).action, "escalate");
assert.equal(storeEscalate({ unresolvedConflict: true }).reason, "unresolvedConflict");
assert.match(KEEP_BOTH_LINE, /licensed originator is on this exception/);
assert.doesNotMatch(KEEP_BOTH_LINE, /LO will contact you|you qualify|approved/i);
assert.match(foxAnswer("will i qualify", factsFromDraft(keepBoth))?.text ?? "", /Not ready yet — The File has a conflict on this number\./);
const keepBothQualify = workspaceReply("will i qualify", keepBoth);
assertAnswerThenRestore(keepBothQualify, /Not ready yet — The File has a conflict on this number\./, {
  labels: (nextFoxAsk(keepBoth).actions ?? []).map((item) => item.label).filter(Boolean),
});
const keepBothReply = workspaceReply("keep both", incomeConflict.draft);
assert.equal(keepBothReply?.capture?.field, "keep-both-facts");
assert.match(keepBothReply?.text ?? "", /licensed originator is on this exception/);
assert.ok((nextFoxAsk(incomeConflict.draft).actions ?? []).some((item) => item.label === "Keep both"));
assert.ok((nextFoxAsk(incomeConflict.draft).actions ?? []).some((item) => item.label === "Keep file"));
assert.ok((nextFoxAsk(incomeConflict.draft).actions ?? []).some((item) => item.label === "Use document"));

const writtenEmployer = draft({
  ...afterLooks,
  facts: {
    employer_name: { field: "employer_name", value: "Typed Shop", source: "client", confirmed: true },
  },
});
const employerConflict = applyExtractedFields(writtenEmployer, {
  extractClass: "paystub",
  confidence: 0.9,
  fields: { employer_name: "Harbor Steel", gross_period: "7200" },
});
assert.ok(employerConflict.conflict);
assert.equal(employerConflict.draft.facts?.employer_name?.value, "Typed Shop");
assert.notEqual(employerConflict.draft.facts?.employer_name?.value, "Harbor Steel");
assert.equal(resolveFactConflict(employerConflict.draft, "file").facts?.employer_name?.value, "Typed Shop");

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
const stubbed = applyPublicSuggestion();
assert.equal(stubbed.pendingProposal?.kind, "public");
assert.equal(stubbed.pendingProposal?.note, SUGGESTED_NOTE);
assert.ok(previewFacts(stubbed).some((fact) => fact.id === "employer" && fact.note === SUGGESTED_NOTE));
assert.ok(!canLooksRight(stubbed));
const keepStub = workspaceReply("Keep file", stubbed);
assert.equal(keepStub?.capture?.field, "decline-proposal");
applyCapture({ field: "decline-proposal" });
assert.equal(getFoxDraft().facts?.employer_name, undefined);
assert.equal(getFoxDraft().pendingProposal, null);
applyPublicSuggestion();
const yesStub = workspaceReply("Yes that’s me", getFoxDraft());
assert.equal(yesStub?.capture?.field, "accept-proposal");
applyCapture({ field: "accept-proposal" });
assert.equal(getFoxDraft().facts?.employer_name?.value, "Listed employer");
assert.equal(getFoxDraft().facts?.employer_name?.source, "suggested");
assert.ok(previewFacts(getFoxDraft()).some((fact) => fact.id === "employer" && fact.note === SUGGESTED_NOTE));

resetWorkspaceForEntry("acr");
applyPreviewMotionControls({});
assert.ok(!getFoxDraft().pendingProposal);
assert.equal(getFoxDraft().facts?.employer_name, undefined);
const fromUrl = applyPreviewMotionControls({ suggest: "employer" });
assert.equal(fromUrl.pendingProposal?.kind, "public");
assert.equal(fromUrl.pendingProposal?.note, SUGGESTED_NOTE);
assert.equal(fromUrl.facts?.employer_name, undefined);
assert.ok(
  previewFacts(fromUrl).some(
    (fact) =>
      fact.id === "employer" &&
      fact.value === "Listed employer" &&
      fact.note === SUGGESTED_NOTE,
  ),
);
assert.ok(
  previewFacts({
    ...fromUrl,
    pendingProposal: { ...fromUrl.pendingProposal!, note: undefined },
  }).some((fact) => fact.id === "employer" && fact.note === SUGGESTED_NOTE),
);
resetWorkspaceForEntry("acr", "buy");
applyPreviewMotionControls({ suggest: "employer" });
assert.equal(workspacePrompt(getFoxDraft()), "confirm-proposal");
const urlAsk = workspacePromptCopy("confirm-proposal", getFoxDraft());
assert.match(urlAsk.text, /Suggested · not verified/);
assert.ok(urlAsk.actions?.some((action) => action.label === "Yes that’s me"));
assert.ok(urlAsk.actions?.some((action) => action.label === "Keep file"));
assert.equal(workspaceReply("Keep file", getFoxDraft())?.capture?.field, "decline-proposal");
applyCapture({ field: "decline-proposal" });
assert.equal(getFoxDraft().facts?.employer_name, undefined);
assert.equal(getFoxDraft().pendingProposal, null);

const w2AfterLooks = draft({
  ...afterLooks,
  documents: [
    {
      slot: "w2",
      name: "w2-2025.pdf",
      type: "application/pdf",
      size: 8000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "w2",
    },
  ],
});
const w2Useful = stillUsefulLabels(w2AfterLooks);
assert.ok(w2Useful.includes("W-2 most recent two years"));
assert.ok(w2Useful.includes("government ID"));
assert.ok(w2Useful.includes("latest two paystubs"));
assert.ok(!missingExtractClasses(w2AfterLooks).includes("w2"));
assert.ok(w2Useful.length > missingExtractClasses(w2AfterLooks).length);
assert.equal(fileStillUsefulNote(w2AfterLooks), undefined);
assert.ok(stillUsefulSection(w2AfterLooks)?.items.some((item) => item.label === "Government ID"));
assert.ok(stillUsefulSection(w2AfterLooks)?.items.some((item) => item.label === "W-2 most recent two years"));
assert.match(gatheringList(w2AfterLooks), /W-2 most recent two years/i);
assert.equal(gatheringCopy(w2AfterLooks), MOTION_COPY.ready);
assert.ok(
  previewFacts(w2AfterLooks).every(
    (fact) => fact.id !== "file" || !/still useful:/i.test(fact.note ?? ""),
  ),
);
assert.equal(fileCompleteness(w2AfterLooks)?.state, "sketch");
assert.match(fileCompleteness(w2AfterLooks)?.copy ?? "", new RegExp(`^sketch · \\d+ of ${CONVENTIONAL_FILE_SLOT_TOTAL}$`));
assert.ok(!/agency_partial|agency_ready/.test(fileCompleteness(w2AfterLooks)?.copy ?? ""));

const seAfterLooks = draft({
  ...afterLooks,
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
  documents: [
    {
      slot: "other",
      name: "return-2025.pdf",
      type: "application/pdf",
      size: 9000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "tax_return",
    },
  ],
});
assert.ok(stillUsefulLabels(seAfterLooks).includes("prior-year return"));
assert.ok(stillUsefulLabels(seAfterLooks).includes("government ID"));
assert.match(gatheringList(seAfterLooks), /prior-year return/i);
assert.equal(gatheringCopy(seAfterLooks), MOTION_COPY.ready);

const buyProceed = afterProceed(afterIncome);
assert.equal(layer2Open(buyProceed), true);
assert.equal(workspacePrompt(buyProceed), "done");
assert.equal(workspacePromptCopy("done", buyProceed).text, MOTION_COPY.in_queue);
assert.equal(MOTION_COPY.in_queue, "ONYX has this.");
assert.doesNotMatch(workspacePromptCopy("done", buyProceed).followUp ?? "", /government ID|Purchase contract|Bank statement/i);
assert.ok(previewFacts(buyProceed).some((fact) => fact.id === "status"));
assert.ok(previewFacts(buyProceed).some((fact) => fact.id === "next"));
const noneReoProceed = afterProceed(
  draft({
    ...afterIncome,
    statedOtherReo: "none",
    otherReoAsked: true,
  }),
);
assert.equal(workspacePromptCopy("done", noneReoProceed).text, MOTION_COPY.in_queue);
assert.equal(motionOf(noneReoProceed), "in_queue");
assert.ok(!/agency_ready/.test(fileCompleteness(noneReoProceed)?.copy ?? ""));
assert.ok(
  !(stillUsefulSection(noneReoProceed)?.items ?? []).some(
    (item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS,
  ),
);
assert.doesNotMatch(layer2AskCopy(noneReoProceed), /Mortgage statements for all properties owned/);
assert.doesNotMatch(
  `${workspacePromptCopy("done", noneReoProceed).text} ${workspacePromptCopy("done", noneReoProceed).followUp ?? ""}`,
  /Mortgage statements for all properties owned/,
);
const buySection = stillUsefulSection(buyProceed);
assert.ok(buySection);
assert.equal(buySection.empty, false);
assert.deepEqual(
  buySection.items.map((item) => item.label),
  [
    "Government ID",
    "Latest two paystubs",
    "W-2 most recent two years",
    "Property address",
    "Purchase contract",
    "Bank statement",
  ],
);
assert.ok(!buySection.items.some((item) => item.label === "Employer"));
assert.match(layer2AskCopy(buyProceed), /Government ID/);
assert.match(layer2AskCopy(buyProceed), /Purchase contract/);
assert.match(stillUsefulAskCopy(buyProceed), /Government ID/);
assert.match(stillUsefulAskCopy(buyProceed), /Bank statement/);
assert.equal(fileStillUsefulNote(buyProceed), undefined);
assert.ok(!(previewFacts(buyProceed).find((fact) => fact.id === "file")?.note ?? "").includes("still useful:"));
assert.doesNotMatch(
  layer2Plan(buyProceed)
    .map((item) => `${item.id} ${item.label} ${item.ask}`)
    .join(" "),
  /ssn|social security|account number|1003|declaration|two-year address|hoa|reserve-months|credit pull|we pulled|fico/i,
);
const skippedId = skipCurrentStillUseful(buyProceed);
assert.ok(stillUsefulSection(skippedId)?.items.some((item) => item.label === "Government ID"));
assert.ok(stillUsefulSection(skippedId)?.items.some((item) => item.label === "Latest two paystubs"));
const withId = afterProceed(afterIncome, {
  documents: [
    {
      slot: "id",
      name: "id.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "government_id",
    },
  ],
});
assert.equal(stillUsefulSection(withId)?.items[0]?.label, "Latest two paystubs");
assert.ok(!stillUsefulSection(withId)?.items.some((item) => item.label === "Government ID"));
assert.ok(stillUsefulSection(withId)?.items.some((item) => item.label === "Latest two paystubs"));
const buyDocsIn = afterProceed(afterIncome, {
  documents: [
    {
      slot: "id",
      name: "id.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "government_id",
    },
    {
      slot: "paystubs",
      name: "paystub.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "paystub",
    },
    {
      slot: "w2",
      name: "w2-2025.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "w2",
    },
    {
      slot: "w2",
      name: "w2-2024.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "w2",
    },
  ],
  facts: {
    employer_name: {
      field: "employer_name",
      value: "Harbor Steel",
      source: "document",
      confirmed: true,
    },
  },
});
assert.deepEqual(
  stillUsefulSection(buyDocsIn)?.items.map((item) => item.label),
  ["Latest two paystubs", "Latest return", "Property address", "Purchase contract", "Bank statement"],
);
const seProceed = afterProceed(withIncome(afterCredit, "self-employed"));
assert.deepEqual(
  stillUsefulSection(seProceed)?.items.map((item) => item.label),
  [
    "Government ID",
    "Latest return",
    "Property address",
    "Purchase contract",
    "Bank statement",
  ],
);
assert.ok(!layer2Plan(seProceed).some((item) => item.label === "Years in business"));
assert.ok(!layer2Plan(seProceed).some((item) => item.label === "Business name"));
assert.ok(!layer2Plan(seProceed).some((item) => item.label === "Employer"));
assert.ok(!layer2Plan(seProceed).some((item) => item.label === "YTD P&L"));
const seOneReturn = afterProceed(seAfterLooks);
assert.ok(stillUsefulSection(seOneReturn)?.items.some((item) => item.label === "Prior-year return"));
assert.ok(layer2Plan(seOneReturn).some((item) => item.label === "YTD P&L"));
const refiProceed = afterProceed(
  draft({
    ...afterIncome,
    productIntent: "refinance",
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
  }),
);
assert.ok(stillUsefulSection(refiProceed)?.items.some((item) => item.label === "Government ID"));
assert.ok(layer2Plan(refiProceed).some((item) => item.label === "Mortgage statement"));
assert.ok(layer2Plan(refiProceed).some((item) => item.label === "Property address"));
assert.ok(!layer2Plan(refiProceed).some((item) => item.label === "Purchase contract"));
assert.ok(!layer2Plan(refiProceed).some((item) => item.label === "Bank statement"));
const refiFunds = afterProceed(
  draft({
    ...afterIncome,
    productIntent: "refinance",
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    facts: {
      reserves: { field: "reserves", value: "needed", source: "client", confirmed: true },
    },
  }),
);
assert.ok(layer2Plan(refiFunds).some((item) => item.label === "Bank statement"));
const refiCash = afterProceed(
  draft({
    ...afterIncome,
    productIntent: "refinance",
    cashOut: true,
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
  }),
);
assert.ok(layer2Plan(refiCash).some((item) => item.label === "Bank statement"));
const emptied = afterProceed(afterIncome, {
  documents: [
    {
      slot: "id",
      name: "id.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "government_id",
    },
    {
      slot: "paystubs",
      name: "paystub.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "paystub",
    },
    {
      slot: "paystubs",
      name: "paystub-2.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:01.000Z",
      status: "extracted",
      extractClass: "paystub",
    },
    {
      slot: "w2",
      name: "w2-2025.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "w2",
    },
    {
      slot: "w2",
      name: "w2-2024.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "w2",
    },
    {
      slot: "other",
      name: "contract.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "purchase_contract",
    },
    {
      slot: "other",
      name: "bank.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "bank_statement",
    },
  ],
  borrowerName: "Jordan Hale",
  facts: {
    property_address: {
      field: "property_address",
      value: "1 Main St",
      source: "client",
      confirmed: true,
    },
    full_name: {
      field: "full_name",
      value: "Jordan Hale",
      source: "document",
      confirmed: true,
    },
  },
});
assert.deepEqual(stillUsefulSection(emptied)?.items, [
  { id: "tax_return", label: "Latest return", ask: "Your latest return still helps this file." },
]);
assert.equal(stillUsefulSection(emptied)?.empty, false);
assert.match(layer2AskCopy(emptied), /latest return/i);
const walkSkip = skipCurrentInvite(afterIncome);
assert.ok((walkSkip.skippedClasses ?? []).includes("government_id"));
assert.equal(workspacePrompt(walkSkip), "documents");
assert.ok(stillUsefulSection(walkSkip)?.items.some((item) => item.label === "Government ID"));
assert.ok(stillUsefulSection(walkSkip)?.items.some((item) => item.label === "Latest two paystubs"));
assert.ok(stillUsefulSection(walkSkip)?.items.some((item) => item.label === "W-2 most recent two years"));
assert.ok(stillUsefulSection(walkSkip)?.items.some((item) => item.label === "Property address"));
assert.ok(stillUsefulSection(walkSkip)?.items.some((item) => item.label === "Purchase contract"));
assert.ok(stillUsefulSection(walkSkip)?.items.some((item) => item.label === "Bank statement"));
assert.ok(!stillUsefulSection(walkSkip)?.items.some((item) => item.label === "Employer"));
assert.ok(!stillUsefulSection(walkSkip)?.items.some((item) => /years in business/i.test(item.label)));
assert.ok((stillUsefulSection(walkSkip)?.items.length ?? 0) > 3);
assert.equal(fileStillUsefulNote(walkSkip), undefined);
assert.equal(resetWorkspaceForEntry("acr", "buy").productIntent, "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "1200000" });
applyCapture({ field: "propose-funds", value: "240000:960000" });
applyCapture({ field: "accept-proposal" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
applyCapture({ field: "skip-time-on-job" });
applyCapture({ field: "skip-current-housing" });
applyCapture({ field: "skip-declarations" });
applyCapture({ field: "skip-household" });
applyCapture({ field: "skip-borrower-name" });
applyCapture({ field: "skip-other-reo" });
applyCapture({ field: "skip-docs" });
assert.ok((getFoxDraft().skippedClasses ?? []).includes("government_id"));
assert.ok(stillUsefulSection(getFoxDraft())?.items.some((item) => item.label === "Government ID"));
assert.notEqual(workspacePrompt(getFoxDraft()), "review");
receiveDocument({
  slot: "id",
  name: "license-id.png",
  type: "image/png",
  size: 8000,
  receivedAt: "2026-08-23T00:00:00.000Z",
  extractClass: "government_id",
  status: "extracted",
});
assert.ok(!stillUsefulSection(getFoxDraft())?.items.some((item) => item.label === "Government ID"));
assert.ok(stillUsefulSection(getFoxDraft())?.items.some((item) => item.label === "Latest two paystubs"));
assert.ok(stillUsefulSection(getFoxDraft())?.items.some((item) => item.label === "Purchase contract"));
assert.ok(stillUsefulSection(getFoxDraft())?.items.some((item) => item.label === "Bank statement"));
assert.equal(shouldResumeWorkspaceEntry(), true);
const remembered = continueWorkspaceFromEntry("acr", "buy");
assert.equal(remembered.productIntent, "buy");
assert.ok((remembered.skippedClasses ?? []).includes("government_id"));
assert.ok(remembered.documents.some((doc) => doc.extractClass === "government_id"));
assert.ok(!stillUsefulSection(remembered)?.items.some((item) => item.label === "Government ID"));
assert.ok(stillUsefulSection(remembered)?.items.some((item) => item.label === "Latest two paystubs"));
assert.ok(stillUsefulSection(remembered)?.items.some((item) => item.label === "Purchase contract"));
assert.ok(!stillUsefulSection(remembered)?.items.some((item) => item.label === "Employer"));
assert.notEqual(workspacePrompt(remembered), "intent");
assert.notEqual(workspacePrompt(remembered), "product");
assert.notEqual(workspacePrompt(remembered), "occupancy");

const skipItem = workspaceReply("Skip", buyProceed);
assert.equal(skipItem?.capture?.field, "skip-docs");
assert.equal(skipItem?.text, MOTION_COPY.in_queue);
assert.doesNotMatch(skipItem?.text ?? "", /paystub|Government ID/i);
const holdItem = workspaceReply("Not yet", buyProceed);
assert.equal(holdItem?.capture?.field, "hold-docs");
assert.equal(holdItem?.text, MOTION_COPY.in_queue);
assert.doesNotMatch(holdItem?.text ?? "", /government ID/i);
assert.notEqual(holdItem?.capture?.field, "not-yet");

function stripReadinessAnswer(text: string) {
  return text
    .replace(READINESS_STRONG, "")
    .replace(READINESS_UW_REVIEW, "")
    .replace(/This file is still thin\. [^.]*\./, "")
    .replace(/Not ready yet — [^.]*\./, "")
    .replace(/Not enough yet to tell\. Still useful: [^.]*\./, "")
    .replace(/Not ready yet —[^.]*\.[^.]*\./, "");
}

function assertAnswerThenRestore(
  reply: ReturnType<typeof workspaceReply>,
  answer: RegExp,
  restored: { text?: RegExp; labels: string[] },
) {
  assert.match(reply?.text ?? "", answer);
  if (restored.text) assert.match(reply?.text ?? "", restored.text);
  for (const label of restored.labels) {
    assert.ok((reply?.actions ?? []).some((item) => item.label === label), label);
  }
  const spoken = stripReadinessAnswer(reply?.text ?? "");
  assert.doesNotMatch(spoken, /you are approved|you don’t qualify|you will qualify|\bDTI\b|will contact you/i);
  assert.doesNotMatch(reply?.text ?? "", /I can prepare a file\. I cannot approve or say you qualify/);
  assert.doesNotMatch(reply?.text ?? "", /You are approved|This is locked|guaranteed/i);
}

const atOccupancy = draft({ path: "acr", productIntent: "buy" });
const occupancyChips = (workspacePromptCopy("occupancy", atOccupancy).actions ?? []).map(
  (item) => item.label,
);
assertAnswerThenRestore(workspaceReply("will i qualify", atOccupancy), /This file is still thin\./, {
  labels: occupancyChips,
});
assertAnswerThenRestore(workspaceReply("hi", atOccupancy), /^Hi\./, { labels: occupancyChips });
assertAnswerThenRestore(
  workspaceReply("what does stated credit mean?", atOccupancy),
  /stated range|not a (fico|pull)|not a credit pull/i,
  { labels: occupancyChips },
);
assertAnswerThenRestore(
  workspaceReply("what happens after Proceed?", atOccupancy),
  /in queue|I stay the interface|licensed originator reviews/i,
  { labels: occupancyChips },
);
assertAnswerThenRestore(workspaceReply("ACR benefits", atOccupancy), new RegExp(ACR_BENEFITS_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: occupancyChips,
});
assert.equal(workspaceReply("ACR benefits", atOccupancy)?.text?.startsWith(ACR_BENEFITS_COPY), true);
assertAnswerThenRestore(workspaceReply("closing costs", atOccupancy), new RegExp(COST_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: occupancyChips,
});
assert.equal(workspaceReply("closing costs", atOccupancy)?.text?.startsWith(COST_COPY), true);
assertAnswerThenRestore(workspaceReply("can I do this on my phone", atOccupancy), new RegExp(PHONE_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: occupancyChips,
});
assert.equal(workspaceReply("can I do this on my phone", atOccupancy)?.text?.startsWith(PHONE_COPY), true);
assertAnswerThenRestore(workspaceReply("when do I close?", atOccupancy), new RegExp(TIMELINE_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: occupancyChips,
});
assert.doesNotMatch(workspaceReply("ACR benefits", atOccupancy)?.text ?? "", /I can keep this file current\. Ask anything/);
assert.doesNotMatch(workspaceReply("closing costs", atOccupancy)?.text ?? "", /%\s*reward|public percent|\$[\d,]+ to \$[\d,]+/i);
assert.equal(workspaceReply("will i qualify", atOccupancy)?.text?.startsWith("This file is still thin."), true);
assert.equal(
  workspaceReply("what do I get if I start a relationship", atOccupancy)?.text?.startsWith(ACR_BENEFITS_COPY),
  true,
);
assert.doesNotMatch(
  workspaceReply("what do I get if I start a relationship", atOccupancy)?.text ?? "",
  /I can answer from this file/,
);

const fundsConfirm = proposeFundsPair(
  draft({
    ...priced850,
    propertyValueAmount: 850000,
    valueAsked: true,
  }),
  170000,
  680000,
);
assert.equal(workspacePrompt(fundsConfirm), "confirm-proposal");
const relationshipAtFunds = workspaceReply("what do I get if I start a relationship", fundsConfirm);
assert.equal(relationshipAtFunds?.text?.startsWith(ACR_BENEFITS_COPY), true);
assert.match(relationshipAtFunds?.text ?? "", /\$170,000 down · \$680,000 loan/);
assert.doesNotMatch(relationshipAtFunds?.text ?? "", /I can answer from this file/);
assert.doesNotMatch(relationshipAtFunds?.text ?? "", /%\s*reward|\$[\d,]+ to \$[\d,]+/i);
assertAnswerThenRestore(relationshipAtFunds, new RegExp(ACR_BENEFITS_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: ["Use this", "Change"],
});
assert.equal(workspaceReply("will i qualify", fundsConfirm)?.text?.startsWith("This file is still thin."), true);
assert.equal(workspaceReply("what will this cost me", fundsConfirm)?.text?.startsWith(COST_COPY), true);
assert.equal(workspaceReply("can I do this on my phone", fundsConfirm)?.text?.startsWith(PHONE_COPY), true);

const creditChips = (workspacePromptCopy("credit", afterFunds).actions ?? []).map((item) => item.label);
assertAnswerThenRestore(workspaceReply("will i qualify", afterFunds), /This file is still thin\./, {
  labels: creditChips,
});
assertAnswerThenRestore(
  workspaceReply("what does stated credit mean?", afterFunds),
  /stated range|not a (fico|pull)|not a credit pull/i,
  { labels: creditChips },
);

const incomeChips = (workspacePromptCopy("income", afterCredit).actions ?? []).map((item) => item.label);
assertAnswerThenRestore(workspaceReply("hi", afterCredit), /^Hi\./, { labels: incomeChips });

assertAnswerThenRestore(
  workspaceReply("what happens after Proceed?", afterOcc),
  /in queue|licensed originator reviews/i,
  { text: /timeline/i, labels: [] },
);
assertAnswerThenRestore(
  workspaceReply("hi", afterOcc),
  /^Hi\./,
  { text: /timeline/i, labels: [] },
);

const docsChips = ["Upload this", "Skip"];
assertAnswerThenRestore(workspaceReply("will i qualify", afterStartId), /Not ready yet —/, {
  text: /government ID|name on this file/i,
  labels: docsChips,
});
assert.match(workspaceReply("will i qualify", afterStartId)?.text ?? "", /paystub|W-2/);
const afterSkipId = skipCurrentInvite(afterStartId);
assert.match(workspacePromptCopy("documents", afterSkipId).text, /latest paystub/i);
assertAnswerThenRestore(workspaceReply("will i qualify", afterSkipId), /Not ready yet —/, {
  text: /latest paystub/i,
  labels: docsChips,
});
assert.match(
  workspaceReply("will i qualify", afterSkipId)?.text ?? "",
  /A latest paystub and a W-2 are still missing\./,
);
assert.doesNotMatch(workspaceReply("will i qualify", afterSkipId)?.text ?? "", /Not enough yet to tell/);
assertAnswerThenRestore(workspaceReply("hi", afterStartId), /^Hi\./, { labels: docsChips });
assertAnswerThenRestore(
  workspaceReply("what does stated credit mean?", afterStartId),
  /stated range|not a credit pull/i,
  { labels: docsChips },
);

const holdChips = ["Start with ID", "Ask Fox"];
assertAnswerThenRestore(workspaceReply("will i qualify", heldDocs), /Not ready yet —/, {
  labels: holdChips,
});
assertAnswerThenRestore(workspaceReply("hi", heldDocs), /^Hi\./, { labels: holdChips });

const looksChips = ["Looks right", "Needs a correction"];
const qualifyAtReview = workspaceReply("will i qualify", afterIncomeReady);
assert.notEqual(qualifyAtReview?.capture?.field, "confirm-draft");
assertAnswerThenRestore(qualifyAtReview, /Not ready yet —/, {
  text: /does it look right/i,
  labels: looksChips,
});
const docsStartChips = ["Start with ID", "Skip", "Not yet"];
assertAnswerThenRestore(workspaceReply("do I need my tax return", afterIncome), new RegExp(W2_TAX_RETURN_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: docsStartChips,
});
assert.equal(workspaceReply("do I need my tax return", afterIncome)?.text?.startsWith(W2_TAX_RETURN_COPY), true);
assertAnswerThenRestore(workspaceReply("ACR benefits", afterIncome), new RegExp(ACR_BENEFITS_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: docsStartChips,
});
assertAnswerThenRestore(workspaceReply("closing costs", afterIncome), new RegExp(COST_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: docsStartChips,
});
assertAnswerThenRestore(workspaceReply("can I do this on my phone", afterIncome), new RegExp(PHONE_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
  labels: docsStartChips,
});

assertAnswerThenRestore(workspaceReply("hi", afterIncomeReady), /^Hi\./, {
  text: /does it look right/i,
  labels: looksChips,
});
assertAnswerThenRestore(
  workspaceReply("what does stated credit mean?", afterIncomeReady),
  /stated range|not a credit pull/i,
  { text: /does it look right/i, labels: looksChips },
);
assertAnswerThenRestore(
  workspaceReply("what happens after Proceed?", afterIncomeReady),
  /in queue|I stay the interface|licensed originator reviews/i,
  { text: /does it look right/i, labels: looksChips },
);

const atCorrect = { ...afterIncomeReady, correcting: "correct" as const };
assert.equal(workspacePrompt(atCorrect), "correct");
const correctChips = (workspacePromptCopy("correct", atCorrect).actions ?? []).map((item) => item.label);
assert.ok(correctChips.includes("Occupancy"));
assertAnswerThenRestore(workspaceReply("will i qualify", atCorrect), /Not ready yet —/, {
  labels: correctChips.filter((label) => label === "Occupancy" || label === "Credit" || label === "Income"),
});
assertAnswerThenRestore(workspaceReply("hi", atCorrect), /^Hi\./, {
  labels: ["Occupancy"],
});

const proceedChips = ["Proceed", "Not yet"];
const housingChips = ["Use this", "Change"];
assertAnswerThenRestore(workspaceReply("will i qualify", afterLooks), /Not ready yet —/, {
  labels: housingChips,
});
assertAnswerThenRestore(workspaceReply("hi", afterLooks), /^Hi\./, { labels: housingChips });
assertAnswerThenRestore(
  workspaceReply("what happens after Proceed?", afterLooks),
  /in queue|I stay the interface|licensed originator reviews/i,
  { labels: housingChips },
);

assertAnswerThenRestore(workspaceReply("will i qualify", buyProceed), /Not ready yet —/, {
  labels: ["Ask Fox"],
});
assertAnswerThenRestore(workspaceReply("hi", buyProceed), /^Hi\./, { labels: ["Ask Fox"] });
const afterProceedAsk = workspaceReply("what happens after Proceed?", buyProceed);
assertAnswerThenRestore(afterProceedAsk, /in queue|I stay the interface|licensed originator reviews/i, {
  labels: ["Ask Fox"],
});
assert.doesNotMatch(afterProceedAsk?.text ?? "", /will contact you|we’ll be in touch|your lo has the file/i);

assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("schedule_c_net_profit"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("return_kind"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("depreciation"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("depletion"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("business_use_of_home"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("nonrecurring_other_income"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("k1_ordinary_income"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("k1_distributions"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("amortization"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("pay_frequency"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("overtime"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("bonus"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("commission"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("overtime_ytd"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("bonus_ytd"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("second_employer_name"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("hire_date"));
assert.ok(EXTRACT_SCHEMA_KEYS.w2.includes("second_employer_name"));
assert.ok(EXTRACT_SCHEMA_KEYS.w2.includes("overtime"));
assert.ok(EXTRACT_SCHEMA_KEYS.w2.includes("bonus"));
assert.ok(EXTRACT_SCHEMA_KEYS.w2.includes("commission"));
assert.ok(EXTRACT_SCHEMA_KEYS.w2.includes("hire_date"));
assert.ok(EXTRACT_SCHEMA_KEYS.bank_statement.includes("present_address"));
assert.ok(!EXTRACT_SCHEMA_KEYS.government_id.includes("date_of_birth"));
assert.ok(EXTRACT_SCHEMA_KEYS.government_id.includes("id_last4"));
assert.ok(EXTRACT_SCHEMA_KEYS.bank_statement.includes("account_last4"));
assert.equal(stableOrDecliningAnnual(120000, 96000), 96000);
assert.equal(stableOrDecliningAnnual(96000, 120000), 108000);
assert.equal(parseExtractMoney("(12,000)"), -12000);
assert.equal(parseExtractMoney("-$8,000"), -8000);
assert.equal(scheduleCAnnual({ netProfit: -24000, depreciation: 0 }), -24000);
assert.equal(monthlyFromAnnual(-24000), -2000);
assert.equal(scheduleCAnnual({ netProfit: 80000, depreciation: 8000 }), 88000);
assert.equal(monthlyFromAnnual(72000), 6000);
assert.equal(monthlyFromAnnual(40000), 3333);
assert.equal(k1OrdinaryMonthly(40000), 3333);

const moduleOneYear = suggestScheduleCIncome([
  { taxYear: "2024", netProfit: 96000, depreciation: 12000 },
]);
assert.equal(moduleOneYear?.monthly, 9000);
assert.equal(moduleOneYear?.method, "one-year");
assert.equal(moduleOneYear?.caution, undefined);

const moduleTwoYear = suggestScheduleCIncome([
  { taxYear: "2023", netProfit: 88000 },
  { taxYear: "2024", netProfit: 96000, depreciation: 12000 },
]);
assert.equal(moduleTwoYear?.monthly, 8167);
assert.equal(moduleTwoYear?.method, "two-year-average");
assert.equal(moduleTwoYear?.caution, undefined);

const moduleDeclining = suggestScheduleCIncome([
  { taxYear: "2023", netProfit: 80000, depreciation: 8000 },
  { taxYear: "2024", netProfit: 66000, depreciation: 6000 },
]);
assert.equal(moduleDeclining?.monthly, 6000);
assert.equal(moduleDeclining?.method, "later-year-lower");
assert.equal(moduleDeclining?.caution, DECLINING_INCOME_CAUTION);
assert.equal(moduleDeclining?.caution, "Income is lower this year. I’m using the later year.");

const moduleWageYtd = suggestWageIncome({
  payPeriodEnd: "2026-07-31",
  ytdGross: 50400,
  grossPeriod: 7200,
});
assert.equal(moduleWageYtd?.needsFrequency, true);
assert.equal(moduleWageYtd?.monthly, 0);
const moduleWageYtdMonthly = suggestWageIncome({
  payPeriodEnd: "2026-07-31",
  ytdGross: 50400,
  grossPeriod: 7200,
  payFrequency: "monthly",
});
assert.equal(moduleWageYtdMonthly?.monthly, 7200);
assert.equal(moduleWageYtdMonthly?.method, "period-frequency");
assert.equal(moduleWageYtdMonthly?.methodNote, "monthly period × 12 / 12");
assert.equal(moduleWageYtdMonthly?.caution, undefined);
assert.equal(moduleWageYtdMonthly?.needsFrequency, undefined);

const moduleWageFreq = suggestWageIncome({
  grossPeriod: 3500,
  payFrequency: "biweekly",
});
assert.equal(moduleWageFreq?.monthly, 7583);
assert.equal(moduleWageFreq?.method, "period-frequency");
assert.equal(moduleWageFreq?.caution, undefined);

const moduleWageW2 = suggestWageIncome({ w2Wages: 84000 });
assert.equal(moduleWageW2?.monthly, 7000);
assert.equal(moduleWageW2?.method, "w2-annual");
assert.equal(moduleWageW2?.methodNote, W2_BOX1_MONTHLY_NOTE);
assert.equal(moduleWageW2?.caution, undefined);

const moduleWageAgree = suggestWageIncome({
  payPeriodEnd: "2026-07-31",
  ytdGross: 53081,
  grossPeriod: 3500,
  payFrequency: "biweekly",
});
assert.equal(moduleWageAgree?.monthly, 7583);
assert.equal(moduleWageAgree?.method, "period-frequency");
assert.equal(moduleWageAgree?.caution, undefined);

const moduleYtdConflict = suggestWageIncome({
  payPeriodEnd: "2026-07-31",
  ytdGross: 50400,
  grossPeriod: 4000,
  payFrequency: "monthly",
});
assert.equal(moduleYtdConflict?.monthly, 4000);
assert.equal(moduleYtdConflict?.method, "period-frequency");
assert.equal(moduleYtdConflict?.caution, undefined);
assert.notEqual(moduleYtdConflict?.monthly, Math.round((7200 + 4000) / 2));

const moduleYtdVsW2 = suggestWageIncome({
  payPeriodEnd: "2026-07-31",
  ytdGross: 50400,
  w2Wages: 84000,
});
assert.equal(moduleYtdVsW2?.monthly, 7000);
assert.equal(moduleYtdVsW2?.method, "w2-annual");
assert.equal(moduleYtdVsW2?.methodNote, W2_BOX1_MONTHLY_NOTE);
assert.equal(moduleYtdVsW2?.caution, undefined);

const moduleSingleOt = suggestWageIncome({ w2Wages: 84000, overtime: 12000 });
assert.equal(moduleSingleOt?.monthly, 7000);
assert.equal(moduleSingleOt?.method, "w2-annual");
assert.equal(moduleSingleOt?.methodNote, W2_BOX1_MONTHLY_NOTE);
assert.doesNotMatch(moduleSingleOt?.methodNote ?? "", /two-year OT average/);

const moduleTwoYearOt = suggestWageIncome({
  w2Wages: 84000,
  overtime: 12000,
  priorYear: { taxYear: 2023, wages: 84000, overtime: 6000 },
});
assert.equal(moduleTwoYearOt?.monthly, 7750);
assert.match(moduleTwoYearOt?.methodNote ?? "", /two-year OT average/);
assert.equal(moduleTwoYearOt?.partialNotes, undefined);

const moduleDecliningBonus = suggestWageIncome({
  w2Wages: 84000,
  bonus: 6000,
  priorYear: { taxYear: 2023, wages: 84000, bonus: 12000 },
});
assert.equal(moduleDecliningBonus?.monthly, 7500);
assert.match(moduleDecliningBonus?.methodNote ?? "", /later-year bonus/);
assert.match(moduleDecliningBonus?.caution ?? "", /Bonus is lower this year/);

const moduleHarborBoth = suggestWageIncome({
  w2Wages: 84000,
  overtime: 6000,
  grossPeriod: 7000,
  payFrequency: "biweekly",
});
assert.equal(moduleHarborBoth?.needsBothReason, true);
assert.equal(moduleHarborBoth?.monthly, 0);
assert.equal(moduleHarborBoth?.method, "both-ask");
assert.equal(moduleHarborBoth?.stubMonthly, 15167);
assert.equal(moduleHarborBoth?.w2Monthly, 7000);
assert.equal(moduleHarborBoth?.methodNote, bothMonthlyMethodNote(15167, 7000));
assert.notEqual(moduleHarborBoth?.monthly, 8107);
assert.equal(proposeBothMonthlyIncome(15167, 7000, "skip").monthly, 7000);
assert.equal(proposeBothMonthlyIncome(15167, 7000, "skip").caution, BOTH_MONTHLY_SKIP_NOTE);
assert.equal(proposeBothMonthlyIncome(15167, 7000, "overtime-bonus").monthly, 7000);
assert.equal(proposeBothMonthlyIncome(15167, 7000, "overtime-bonus").caution, BOTH_MONTHLY_OT_NOTE);
assert.equal(proposeBothMonthlyIncome(15167, 7000, "second-job").monthly, 7000);
assert.equal(proposeBothMonthlyIncome(15167, 7000, "second-job").caution, BOTH_MONTHLY_SECOND_JOB_NOTE);
assert.equal(parseBothMonthlyReason("Skip"), "skip");
assert.equal(parseBothMonthlyReason("raise / new base"), "raise");
assert.equal(parseBothMonthlyReason("that's my base now"), "raise");
assert.equal(parseBothMonthlyReason("overtime / bonus"), "overtime-bonus");
assert.equal(parseBothMonthlyReason("second job"), "second-job");
assert.equal(parseBothMonthlyReason("I don't know"), "skip");
assert.deepEqual(parseRaiseWhen("This year"), { kind: "this-year", label: "this year" });
assert.deepEqual(parseRaiseWhen("Last year"), { kind: "last-year", label: "last year" });
assert.deepEqual(parseRaiseWhen("Not sure"), { kind: "not-sure", label: "not sure" });
assert.deepEqual(parseRaiseWhen("not-sure"), { kind: "not-sure", label: "not sure" });
assert.deepEqual(parseRaiseWhen("March"), { kind: "month", month: 3, label: "March" });
assert.deepEqual(raiseWeightMonths(3, 7), { oldMonths: 2, newMonths: 5 });
assert.equal(expectedRaiseYtd(7000, 15167, 2, 5), 89835);
assert.equal(raiseWeightNote(7000, 15167, 3, 7), "Jan–Feb at $7,000 · Mar–Jul at $15,167");
const harborRaiseNoYtd = proposeRaiseWeightedIncome({
  stubMonthly: 15167,
  w2Monthly: 7000,
  when: { kind: "month", month: 3, label: "March" },
  stubMonth: 7,
});
assert.equal(harborRaiseNoYtd.monthly, 15167);
assert.equal(harborRaiseNoYtd.caution, RAISE_YTD_MISSING_NOTE);
assert.equal(harborRaiseNoYtd.weightNote, "Jan–Feb at $7,000 · Mar–Jul at $15,167");
assert.match(harborRaiseNoYtd.methodNote ?? "", /Jan–Feb at \$7,000/);
assert.match(harborRaiseNoYtd.methodNote ?? "", /Mar–Jul at \$15,167/);
assert.equal(harborRaiseNoYtd.expectedYtd, 89835);
assert.notEqual(harborRaiseNoYtd.monthly, 7000);
const harborThisYearNoYtd = proposeRaiseWeightedIncome({
  stubMonthly: 15167,
  w2Monthly: 7000,
  when: { kind: "this-year", label: "this year" },
  stubMonth: 7,
});
assert.equal(harborThisYearNoYtd.monthly, 15167);
assert.equal(harborThisYearNoYtd.caution, RAISE_YTD_MISSING_NOTE);
assert.notEqual(harborThisYearNoYtd.monthly, 7000);
const harborLastYearNoYtd = proposeRaiseWeightedIncome({
  stubMonthly: 15167,
  w2Monthly: 7000,
  when: { kind: "last-year", label: "last year" },
  stubMonth: 7,
});
assert.equal(harborLastYearNoYtd.monthly, 7000);
assert.equal(harborLastYearNoYtd.caution, RAISE_YTD_MISSING_NOTE);
const harborRaiseClose = proposeRaiseWeightedIncome({
  stubMonthly: 15167,
  w2Monthly: 7000,
  when: { kind: "month", month: 3, label: "March" },
  ytdGross: 89835,
  stubMonth: 7,
});
assert.equal(harborRaiseClose.monthly, 15167);
assert.equal(harborRaiseClose.caution, raiseYtdSupportsNote("March"));
assert.equal(harborRaiseClose.needsRaiseYtdFar, undefined);
const harborRaiseFar = proposeRaiseWeightedIncome({
  stubMonthly: 15167,
  w2Monthly: 7000,
  when: { kind: "month", month: 3, label: "March" },
  ytdGross: 49000,
  stubMonth: 7,
});
assert.equal(harborRaiseFar.needsRaiseYtdFar, true);
assert.equal(harborRaiseFar.monthly, 0);
assert.notEqual(harborRaiseFar.monthly, 15167);

const moduleSameStubSecond = suggestWageIncome({
  w2Wages: 84000,
  sameStubSecondEmployer: true,
});
assert.equal(moduleSameStubSecond?.monthly, 7000);
assert.ok(moduleSameStubSecond?.partialNotes?.includes(SECOND_JOB_SAME_STUB_NOTE));

const moduleSecondJobThin = suggestWageIncome({
  w2Wages: 84000,
  secondJob: { documentedSeparately: true, employerName: "Night Shift Co", w2Wages: 24000 },
});
assert.equal(moduleSecondJobThin?.monthly, 9000);
assert.ok(moduleSecondJobThin?.partialNotes?.includes(SECOND_JOB_THIN_NOTE));
assert.match(moduleSecondJobThin?.methodNote ?? "", /second job/);

const moduleSecondJobTwoYear = suggestWageIncome({
  w2Wages: 84000,
  secondJob: {
    documentedSeparately: true,
    employerName: "Night Shift Co",
    w2Wages: 24000,
    priorYear: { taxYear: 2023, wages: 24000 },
  },
});
assert.equal(moduleSecondJobTwoYear?.monthly, 9000);

const moduleCombined = suggestCombinedIncome({
  wage: { monthly: 9167, method: "period-frequency", methodNote: "biweekly period × 26 / 12" },
  scheduleC: { monthly: 9000, method: "one-year" },
});
assert.equal(moduleCombined?.monthly, 18167);
assert.equal(moduleCombined?.method, "combined");
assert.match(moduleCombined?.methodNote ?? "", /combined wage \+ Schedule C/);
assert.match(moduleCombined?.methodNote ?? "", /biweekly period × 26 \/ 12/);
assert.match(moduleCombined?.methodNote ?? "", /Schedule C one-year/);

const acmeWageAsk = suggestWageIncome({
  payPeriodEnd: "2026-08-07",
  grossPeriod: 4230.77,
  ytdGross: 67692.32,
});
assert.equal(acmeWageAsk?.needsFrequency, true);
const acmeWage = suggestWageIncome({
  payPeriodEnd: "2026-08-07",
  grossPeriod: 4230.77,
  ytdGross: 67692.32,
  payFrequency: "biweekly",
});
assert.equal(acmeWage?.monthly, 9167);
assert.equal(acmeWage?.method, "period-frequency");
assert.equal(acmeWage?.methodNote, "biweekly period × 26 / 12");
assert.equal(acmeWage?.needsFrequency, undefined);
assert.equal(acmeWage?.caution, undefined);
assert.equal(inferPayFrequency({
  payPeriodEnd: "2026-08-07",
  grossPeriod: 4230.77,
  ytdGross: 67692.32,
})?.key, "biweekly");

const acmeStaleSemi = suggestWageIncome({
  payPeriodEnd: "2026-08-07",
  grossPeriod: 4230.77,
  ytdGross: 67692.32,
  payFrequency: "semimonthly",
});
assert.equal(acmeStaleSemi?.monthly, 8462);
assert.equal(acmeStaleSemi?.methodNote, "semi-monthly period × 24 / 12");
assert.notEqual(acmeStaleSemi?.monthly, 9167);

const ambiguousFreq = suggestWageIncome({
  payPeriodEnd: "2026-08-15",
  grossPeriod: 4230.77,
  ytdGross: 67692.32,
});
assert.equal(ambiguousFreq?.needsFrequency, true);
assert.equal(inferPayFrequency({
  payPeriodEnd: "2026-08-15",
  grossPeriod: 4230.77,
  ytdGross: 67692.32,
}), "ambiguous");

const periodOnlyAsk = suggestWageIncome({ grossPeriod: 4230.77 });
assert.equal(periodOnlyAsk?.needsFrequency, true);

const fannieW2 = queryConventionalGuidelines({ agency: "fannie", topic: "income", key: "w2" });
const freddieW2 = queryConventionalGuidelines({ agency: "freddie", topic: "income", key: "w2" });
assert.equal(fannieW2.length, 1);
assert.equal(freddieW2.length, 1);
assert.equal(fannieW2[0]?.version, CONVENTIONAL_GUIDELINE_VERSION);
assert.equal(freddieW2[0]?.rules?.both, "show-both-use-lower");
assert.equal(freddieW2[0]?.rules?.ytd, "write-only");
assert.equal(freddieW2[0]?.rules?.variable, "second-w2-only");
assert.equal(freddieW2[0]?.rules?.secondJob, "two-documents-two-year");
assert.equal(queryConventionalGuidelines({ topic: "income", key: "combined" })[0]?.rules?.basis, "confirmed-sum");
assert.equal(queryConventionalGuidelines({ topic: "completeness", key: "purchase" }).length, 2);
assert.equal(
  queryConventionalGuidelines({ topic: "completeness", key: "income-docs-w2" })[0]?.pattern,
  "income docs (latest paystub and W-2)",
);
assert.equal(
  queryConventionalGuidelines({ topic: "completeness", key: "income-docs-self-employed" })[0]?.pattern,
  "income docs (latest return)",
);
assert.equal(
  queryConventionalGuidelines({ topic: "completeness", key: "income-docs-both" })[0]?.pattern,
  "income docs (latest paystub, W-2, and latest return)",
);
assert.ok(queryConventionalGuidelines({ topic: "docs", key: "paystub" }).length >= 2);
assert.equal(queryConventionalGuidelines({ topic: "income", key: "k1" })[0]?.rules?.basis, "ordinary-over-12");
assert.equal(queryConventionalGuidelines({ agency: "fannie" }).every((row) => row.agency === "fannie"), true);

const mayaId = applyExtractedFields(
  draft({
    ...seIncome,
    docsStarted: true,
    documents: [
      {
        slot: "id",
        name: "license.png",
        type: "image/png",
        size: 4000,
        receivedAt: "2026-08-22T00:00:00.000Z",
        status: "reading",
      },
    ],
  }),
  {
    extractClass: "government_id",
    confidence: 0.94,
    fields: {
      full_name: "Maya Chen",
      date_of_birth: "1990-04-12",
      id_last4: "4421",
    },
  },
);
assert.ok(!mayaId.quietLines.includes("Updated identity from ID."));
assert.ok(mayaId.quietLines.every((line) => !isDeadFileWriteLine(line)));
assert.equal(mayaId.draft.contact.fullName.value, "");
assert.equal(mayaId.draft.borrowerName, undefined);
assert.equal(mayaId.draft.pendingProposal?.field, "borrowerName");
assert.equal(mayaId.draft.pendingProposal?.value, "Maya Chen");
assert.ok(!(mayaId.draft.pendingProposal?.extras ?? []).some((item) => item.field === "date_of_birth"));
assert.equal(workspacePrompt(mayaId.draft), "confirm-proposal");
const mayaAsk = docReactionAsk(mayaId.draft, "government_id");
assert.equal(
  mayaAsk?.text,
  "The ID shows Maya Chen. Suggested · not underwritten. Use this?",
);
assert.doesNotMatch(mayaAsk?.text ?? "", /paystub|tax return|most recent/i);
assert.deepEqual(
  (mayaAsk?.actions ?? []).map((item) => item.label),
  ["Use this", "Change"],
);
const mayaNamed = resolveProposal(mayaId.draft, "accept");
assert.equal(mayaNamed.borrowerName, "Maya Chen");
assert.equal(mayaNamed.contact.fullName.value, "Maya Chen");
assert.equal(mayaNamed.facts?.date_of_birth, undefined);
const mayaGreet = docReactionAsk(mayaNamed, "government_id");
assert.match(mayaGreet?.text ?? "", /Nice to meet you, Maya/);
assert.match(mayaGreet?.text ?? "", /keep this file working|clearer picture|lower cost|stronger equity/);
assert.match(mayaGreet?.text ?? "", /most recent tax return/);
assert.doesNotMatch(
  mayaGreet?.text ?? "",
  /Updated identity from ID|approv|eligible|you qualify|sales/i,
);
assert.deepEqual(
  (mayaGreet?.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const jordanId = applyExtractedFields(
  draft({
    ...seIncome,
    docsStarted: true,
    documents: [
      {
        slot: "id",
        name: "doc-id.png",
        type: "image/png",
        size: 4000,
        receivedAt: "2026-08-22T00:10:00.000Z",
        status: "reading",
      },
    ],
  }),
  {
    extractClass: "government_id",
    confidence: 0.94,
    fields: { full_name: "JORDAN HALE", ssn: "123-45-6789", full_ssn: "123456789" },
  },
);
assert.equal(jordanId.draft.contact.fullName.value, "");
assert.equal(jordanId.draft.borrowerName, undefined);
assert.equal(jordanId.draft.pendingProposal?.field, "borrowerName");
assert.equal(jordanId.draft.facts?.ssn, undefined);
assert.equal(jordanId.draft.facts?.full_ssn, undefined);
assert.doesNotMatch(JSON.stringify(jordanId.draft.facts ?? {}), /123-45-6789|123456789/);
const jordanAsk = docReactionAsk(jordanId.draft, "government_id");
assert.equal(
  jordanAsk?.text,
  "The ID shows Jordan Hale. Suggested · not underwritten. Use this?",
);
assert.doesNotMatch(jordanAsk?.text ?? "", /JORDAN|date of birth|SSN|social security/);
assert.ok(!(jordanId.draft.pendingProposal?.extras ?? []).some((item) => item.field === "date_of_birth"));
const jordanUsed = resolveProposal(jordanId.draft, "accept");
assert.equal(jordanUsed.borrowerName, "Jordan Hale");
assert.equal(jordanUsed.facts?.date_of_birth, undefined);
assert.equal(jordanUsed.facts?.ssn, undefined);
const jordanGreet = docReactionAsk(jordanUsed, "government_id");
assert.match(jordanGreet?.text ?? "", /Nice to meet you, Jordan/);
assert.doesNotMatch(jordanGreet?.text ?? "", /JORDAN/);
const mayaThenReturn = applyExtractedFields(mayaNamed, {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: {
    tax_year: "2024",
    return_kind: "schedule_c",
    schedule_c_net_profit: "96000",
    depreciation: "12000",
  },
});
assert.ok(!mayaThenReturn.quietLines.includes("Updated income from tax return."));
const mayaIncomeAsk = docReactionAsk(mayaThenReturn.draft, "tax_return");
assert.match(mayaIncomeAsk?.text ?? "", /Got the 2024 return/);
assert.match(mayaIncomeAsk?.text ?? "", /\$9,000/);
assert.match(mayaIncomeAsk?.text ?? "", /Use this/);
assert.doesNotMatch(mayaIncomeAsk?.text ?? "", /Updated income from tax return/);
const mayaAccepted = resolveProposal(mayaThenReturn.draft, "accept");
assert.match(workspacePromptCopy("documents", mayaAccepted).text, /prior-year return|stable/i);
const mayaYears = workspaceReply("How long have you been running this?", mayaAccepted);
assert.equal(mayaYears?.capture, undefined);
assert.match(mayaYears?.text ?? "", /prior-year return|stable|helps me read the return/i);
const mayaYearsIn = workspaceReply("5 years", mayaAccepted);
assert.match(mayaYearsIn?.text ?? "", /prior-year return|stable|I’ll keep that/i);
assert.doesNotMatch(mayaYearsIn?.text ?? "", /Updated income from tax return/);

const seReturn = applyExtractedFields(seAfterLooks, {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: {
    tax_year: "2024",
    filing_status: "single",
    agi: "110000",
    return_kind: "schedule_c",
    schedule_c_net_profit: "96000",
    depreciation: "12000",
    depletion: "",
    business_use_of_home: "0",
    nonrecurring_other_income: "",
  },
});
assert.equal(seReturn.draft.facts?.schedule_c_net_profit?.value, "96000");
assert.equal(seReturn.draft.facts?.qualifying_income, undefined);
assert.equal(seReturn.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(seReturn.draft.pendingProposal?.value, "9000");
assert.equal(seReturn.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.equal(workspacePrompt(seReturn.draft), "confirm-proposal");
assert.equal(
  composerPlaceholder({ ...seReturn.draft, correcting: "value" }),
  "",
);
assert.doesNotMatch(
  composerPlaceholder({ ...seReturn.draft, correcting: "value" }),
  /purchase price/i,
);
assert.equal(
  workspacePrompt({ ...seReturn.draft, correcting: "value" }),
  "confirm-proposal",
);
const conflictOnPrice = draft({
  ...seReturn.draft,
  pendingProposal: null,
  pendingConflict: {
    field: "qualifying_income",
    fileValue: "9000",
    documentValue: "6000",
    label: "Qualifying income",
    kind: "document",
  },
  correcting: "value",
});
assert.equal(workspacePrompt(conflictOnPrice), "confirm-proposal");
assert.equal(composerPlaceholder(conflictOnPrice), "");
assert.doesNotMatch(composerPlaceholder(conflictOnPrice), /purchase price/i);
const seAsk = proposalAskCopy(seReturn.draft.pendingProposal!);
assert.match(seAsk, /Suggested monthly income is \$9,000/);
assert.match(seAsk, /Use this/);
assert.match(seAsk, /9,000/);
assert.doesNotMatch(seAsk, /1084|\bDU\b|approved|eligible|you qualify|don’t qualify|agency_ready/i);
const seLiveAsk = workspacePromptCopy("confirm-proposal", seReturn.draft);
assert.match(seLiveAsk.text, /Got the 2024 return/);
assert.match(seLiveAsk.text, /\$9,000/);
assert.match(seLiveAsk.text, /Schedule C one-year/);
assert.match(seLiveAsk.text, /Suggested qualifying income · not underwritten/);
assert.match(seLiveAsk.text, /Use this/);
const seQualifyAsk = workspaceReply("will i qualify", seReturn.draft);
assert.notEqual(seQualifyAsk?.capture?.field, "accept-proposal");
assertAnswerThenRestore(seQualifyAsk, /This file looks conventionally strong enough to keep moving\. Final underwriting still decides\./, {
  text: /\$9,000/,
  labels: ["Use this", "Change"],
});
assert.equal(seQualifyAsk?.text?.startsWith(READINESS_STRONG), true);
assert.doesNotMatch(seLiveAsk.text, /Updated income from tax return/);
assert.ok((seLiveAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((seLiveAsk.actions ?? []).some((item) => item.label === "Change"));
assertIncomeChipsHoldOverQueue(seReturn.draft, /\$9,000/);
assert.equal(nextFoxAsk(resolveProposal(queuedMidConfirm(seReturn.draft), "accept")).text, YEARS_IN_BUSINESS_ASK);
assert.ok(
  previewFacts(seReturn.draft).some(
    (fact) =>
      fact.id === "qualifying" &&
      /9,000/.test(fact.value) &&
      fact.note === SUGGESTED_INCOME_NOTE,
  ),
);
assert.ok(stillUsefulLabels(seReturn.draft).includes("prior-year return"));
assert.equal(slotFromName("return-2024.png"), "other");
assert.ok(taxReturnFilename("return-2024.png"));
assert.ok(taxReturnFilename("return-2025.pdf"));
assert.ok(taxReturnFilename("return-declining-2024.png"));
assert.ok(taxReturnFilename("entity-ordinary-2024.png"));
assert.ok(!taxReturnFilename("license.png"));
assert.equal(slotFromName("entity-ordinary-2024.png"), "other");
assert.equal(extractClassFromFilename("entity-ordinary-2024.png"), null);
assert.equal(
  receivedClassOf({
    slot: "other",
    name: "return-2024.png",
    type: "image/png",
    size: 8000,
    receivedAt: "2026-08-20T00:00:00.000Z",
    status: "extracted",
  }),
  "tax_return",
);
assert.equal(
  receivedClassOf({
    slot: "other",
    name: "entity-ordinary-2024.png",
    type: "image/png",
    size: 8000,
    receivedAt: "2026-08-21T01:00:00.000Z",
    status: "extracted",
  }),
  "tax_return",
);
assert.equal(extractClassFromFilename("return-2024.png"), null);

const sePendingReturn = draft({
  ...afterLooks,
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
  documents: [
    {
      slot: "other",
      name: "return-2024.png",
      type: "image/png",
      size: 8000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "reading",
    },
  ],
});
assert.ok(missingExtractClasses(sePendingReturn).includes("tax_return"));
assert.ok(!stillUsefulLabels(sePendingReturn).includes("prior-year return"));

const seWalk = applyExtractedFields(sePendingReturn, {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: {
    tax_year: "2024",
    filing_status: "single",
    agi: "110000",
    return_kind: "schedule_c",
    schedule_c_net_profit: "96000",
    depreciation: "12000",
    depletion: "",
    business_use_of_home: "0",
    nonrecurring_other_income: "",
  },
});
assert.equal(seWalk.draft.documents[0]?.extractClass, "tax_return");
assert.equal(seWalk.draft.pendingProposal?.value, "9000");
assert.ok(!missingExtractClasses(seWalk.draft).includes("tax_return"));
assert.ok(missingExtractClasses(seWalk.draft).includes("government_id"));
assert.ok(stillUsefulLabels(seWalk.draft).includes("prior-year return"));
assert.ok(stillUsefulLabels(seWalk.draft).includes("government ID"));
assert.ok(!stillUsefulLabels(seWalk.draft).includes("tax return"));
assert.match(stillUsefulAskCopy(seWalk.draft), /Government ID/);
assert.match(stillUsefulAskCopy(seWalk.draft), /Prior-year return/);
assert.match(stillUsefulAskCopy(seWalk.draft), /Purchase contract/);
assert.doesNotMatch(stillUsefulAskCopy(seWalk.draft), /Employer|Years in business/);
assert.doesNotMatch(stillUsefulAskCopy(seWalk.draft), /government ID and tax return/i);
assert.match(gatheringList(seWalk.draft), /government ID and prior-year return/i);
assert.equal(gatheringCopy(seWalk.draft), MOTION_COPY.ready);
assert.doesNotMatch(gatheringList(seWalk.draft), /government ID and tax return/i);
assert.equal(fileStillUsefulNote(seWalk.draft), undefined);
assert.ok(stillUsefulSection(seWalk.draft)?.items.some((item) => item.label === "Prior-year return"));
assert.ok(stillUsefulSection(seWalk.draft)?.items.some((item) => item.label === "Government ID"));
assert.match(workspacePromptCopy("documents", seWalk.draft).text, /Government ID/);
assert.match(workspacePromptCopy("documents", seWalk.draft).text, /Prior-year return/);
assert.doesNotMatch(workspacePromptCopy("documents", seWalk.draft).text, /government ID and tax return/i);
assert.equal(fileCompleteness(seWalk.draft)?.state, "sketch");
assert.ok(!/agency_partial|agency_ready/.test(fileCompleteness(seWalk.draft)?.copy ?? ""));
assert.doesNotMatch(
  `${gatheringCopy(seWalk.draft)} ${stillUsefulAskCopy(seWalk.draft)} ${fileStillUsefulNote(seWalk.draft) ?? ""}`,
  /1084|\bDU\b|approved|eligible|you qualify|agency_ready/i,
);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "self-employed" });
confirmLooksRight();
receiveDocument({
  slot: slotFromName("return-2024.png"),
  name: "return-2024.png",
  type: "image/png",
  size: 8000,
  receivedAt: "2026-08-20T03:00:00.000Z",
  bytesRef: "fox-intake/return-2024.png",
});
const seWalkWrite = applyExtractWrite("2026-08-20T03:00:00.000Z", "return-2024.png", {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: {
    tax_year: "2024",
    return_kind: "schedule_c",
    schedule_c_net_profit: "96000",
    depreciation: "12000",
  },
});
assert.equal(seWalkWrite.draft.documents[0]?.extractClass, "tax_return");
assert.equal(seWalkWrite.draft.documents[0]?.slot, "other");
assert.equal(seWalkWrite.draft.pendingProposal?.value, "9000");
assert.ok(!missingExtractClasses(seWalkWrite.draft).includes("tax_return"));
assert.ok(stillUsefulLabels(seWalkWrite.draft).includes("prior-year return"));
assert.ok(!stillUsefulLabels(seWalkWrite.draft).includes("tax return"));
assert.match(gatheringList(seWalkWrite.draft), /prior-year return/i);
assert.doesNotMatch(gatheringList(seWalkWrite.draft), /government ID and tax return/i);
assert.equal(gatheringCopy(seWalkWrite.draft), MOTION_COPY.ready);
assert.equal(fileStillUsefulNote(seWalkWrite.draft), undefined);
assert.ok(stillUsefulSection(seWalkWrite.draft)?.items.some((item) => item.label === "Prior-year return"));
assert.ok(stillUsefulSection(seWalkWrite.draft)?.items.some((item) => item.label === "Government ID"));
assert.equal(fileCompleteness(seWalkWrite.draft)?.state, "sketch");

const seYearOne88k = applyExtractedFields(
  draft({
    ...afterLooks,
    incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
    documents: [
      {
        slot: "other",
        name: "return-2023.png",
        type: "image/png",
        size: 8000,
        receivedAt: "2026-08-20T04:00:00.000Z",
        status: "reading",
      },
    ],
  }),
  {
    extractClass: "tax_return",
    confidence: 0.93,
    fields: {
      tax_year: "2023",
      return_kind: "schedule_c",
      schedule_c_net_profit: "88000",
    },
  },
);
assert.equal(seYearOne88k.draft.pendingProposal?.value, "7333");
assert.equal(receivedTaxReturnCount(seYearOne88k.draft), 1);
assert.ok(stillUsefulLabels(seYearOne88k.draft).includes("prior-year return"));
assert.ok(!stillUsefulLabels(seYearOne88k.draft).includes("tax return"));
assert.match(gatheringList(seYearOne88k.draft), /government ID and prior-year return/i);
assert.equal(gatheringCopy(seYearOne88k.draft), MOTION_COPY.ready);

const seBothYears = applyExtractedFields(
  {
    ...seYearOne88k.draft,
    documents: [
      ...seYearOne88k.draft.documents,
      {
        slot: "other",
        name: "return-2024.png",
        type: "image/png",
        size: 8000,
        receivedAt: "2026-08-20T04:10:00.000Z",
        status: "reading",
      },
    ],
  },
  {
    extractClass: "tax_return",
    confidence: 0.93,
    fields: {
      tax_year: "2024",
      return_kind: "schedule_c",
      schedule_c_net_profit: "108000",
    },
  },
);
assert.equal(seBothYears.draft.pendingProposal?.value, "8167");
assert.equal(receivedTaxReturnCount(seBothYears.draft), 2);
assert.ok(!missingExtractClasses(seBothYears.draft).includes("tax_return"));
assert.deepEqual(stillUsefulLabels(seBothYears.draft), ["government ID"]);
assert.match(stillUsefulAskCopy(seBothYears.draft), /Government ID/);
assert.match(stillUsefulAskCopy(seBothYears.draft), /Purchase contract/);
assert.match(gatheringList(seBothYears.draft), /government ID/i);
assert.doesNotMatch(gatheringList(seBothYears.draft), /tax return|prior-year return/i);
assert.equal(gatheringCopy(seBothYears.draft), MOTION_COPY.ready);
assert.equal(fileStillUsefulNote(seBothYears.draft), undefined);
assert.ok(stillUsefulSection(seBothYears.draft)?.items.some((item) => item.label === "Government ID"));
assert.match(workspacePromptCopy("documents", seBothYears.draft).text, /Government ID/);
assert.doesNotMatch(workspacePromptCopy("documents", seBothYears.draft).text, /prior-year/i);
assert.equal(fileCompleteness(seBothYears.draft)?.state, "sketch");
assert.ok(!/agency_partial|agency_ready/.test(fileCompleteness(seBothYears.draft)?.copy ?? ""));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "self-employed" });
confirmLooksRight();
receiveDocument({
  slot: slotFromName("return-2023.png"),
  name: "return-2023.png",
  type: "image/png",
  size: 8000,
  receivedAt: "2026-08-20T05:00:00.000Z",
  bytesRef: "fox-intake/return-2023.png",
});
const seFirstWrite = applyExtractWrite("2026-08-20T05:00:00.000Z", "return-2023.png", {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: { tax_year: "2023", return_kind: "schedule_c", schedule_c_net_profit: "88000" },
});
assert.equal(seFirstWrite.draft.pendingProposal?.value, "7333");
assert.ok(stillUsefulLabels(seFirstWrite.draft).includes("prior-year return"));
receiveDocument({
  slot: slotFromName("return-2024.png"),
  name: "return-2024.png",
  type: "image/png",
  size: 8000,
  receivedAt: "2026-08-20T05:10:00.000Z",
  bytesRef: "fox-intake/return-2024.png",
});
const seSecondWrite = applyExtractWrite("2026-08-20T05:10:00.000Z", "return-2024.png", {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: { tax_year: "2024", return_kind: "schedule_c", schedule_c_net_profit: "108000" },
});
assert.equal(seSecondWrite.draft.pendingProposal?.value, "8167");
assert.equal(seSecondWrite.draft.documents.length, 2);
assert.equal(seSecondWrite.draft.documents[0]?.extractClass, "tax_return");
assert.equal(seSecondWrite.draft.documents[1]?.extractClass, "tax_return");
assert.equal(receivedTaxReturnCount(seSecondWrite.draft), 2);
assert.ok(!stillUsefulLabels(seSecondWrite.draft).includes("tax return"));
assert.ok(!stillUsefulLabels(seSecondWrite.draft).includes("prior-year return"));
assert.equal(gatheringCopy(seSecondWrite.draft), MOTION_COPY.ready);

const seAccepted = resolveProposal(seReturn.draft, "accept");
assert.equal(seAccepted.facts?.qualifying_income?.value, "9000");
assert.equal(seAccepted.facts?.qualifying_income?.source, "suggested");
assert.equal(seAccepted.awaitingYearsInBusiness, true);
assert.equal(nextFoxAsk(seAccepted).text, YEARS_IN_BUSINESS_ASK);
assert.equal(workspacePromptCopy("documents", seAccepted).text, YEARS_IN_BUSINESS_ASK);
assert.deepEqual(
  (workspacePromptCopy("documents", seAccepted).actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
assert.equal(parseYearsInBusiness("5 years"), "5");
assert.equal(parseYearsInBusiness("since 2019"), "7");
assert.equal(parseYearsInBusiness("5"), "5");
const yearsReply = workspaceReply("5 years", seAccepted);
assert.equal(yearsReply?.capture?.field, "yearsInBusiness");
assert.equal(yearsReply?.capture && "value" in yearsReply.capture ? yearsReply.capture.value : "", "5");
const yearsWritten = writeYearsInBusiness(seAccepted, "5");
assert.equal(yearsWritten.facts?.years_in_business?.value, "5");
assert.ok(
  previewFacts(yearsWritten).some(
    (fact) => fact.id === "years-in-business" && fact.value === "5",
  ),
);
assert.ok(!yearsWritten.awaitingYearsInBusiness);
assert.equal(structureFixPrompt("qualifying", seAccepted), "qualifying");
assert.match(workspacePromptCopy("qualifying", seAccepted).text, /9,000/);
assert.ok((workspacePromptCopy("qualifying", seAccepted).actions ?? []).some((item) => item.label === "Keep this"));
const qualifyingEdit = workspaceReply("8500", {
  ...seAccepted,
  correcting: "qualifying",
  correctingLine: "qualifying",
});
assert.equal(qualifyingEdit?.capture?.field, "qualifyingIncome");
assert.equal(qualifyingEdit?.capture && "value" in qualifyingEdit.capture ? qualifyingEdit.capture.value : "", "8500");
assert.equal(structureFixPrompt("years-in-business", yearsWritten), "years-in-business");
assert.equal(workspacePromptCopy("years-in-business", yearsWritten).text, YEARS_IN_BUSINESS_ASK);
const yearsKeep = workspaceReply("Keep this", {
  ...yearsWritten,
  correcting: "years-in-business",
  correctingLine: "years-in-business",
});
assert.equal(yearsKeep?.capture?.field, "keep-line");
const yearsEdit = workspaceReply("8 years", {
  ...yearsWritten,
  correcting: "years-in-business",
  correctingLine: "years-in-business",
});
assert.equal(yearsEdit?.capture?.field, "yearsInBusiness");
assert.equal(yearsEdit?.capture && "value" in yearsEdit.capture ? yearsEdit.capture.value : "", "8");
assert.doesNotMatch(yearsReply?.text ?? "", /Years in business|field/i);
const leftBlank = resolveProposal(seReturn.draft, "decline");
assert.ok(!leftBlank.yearsInBusinessAsked);
assert.ok(!leftBlank.awaitingYearsInBusiness);
const queuedBlank = {
  ...leftBlank,
  sampleAccepted: true,
  motion: "in_queue" as const,
};
assert.equal(workspacePromptCopy("done", queuedBlank).text, MOTION_COPY.in_queue);
assert.doesNotMatch(workspacePromptCopy("done", queuedBlank).followUp ?? "", /government ID|Purchase contract|Bank statement/i);
assert.notEqual(workspacePromptCopy("done", queuedBlank).followUp, layer2AskCopy(queuedBlank));
assert.ok(!layer2Plan(queuedBlank).some((item) => item.id === "years-in-business"));
assert.ok(!layer2Plan(queuedBlank).some((item) => item.label === "Years in business"));
assert.ok(
  previewFacts(seAccepted).some(
    (fact) => fact.id === "qualifying" && fact.note === SUGGESTED_INCOME_NOTE,
  ),
);
assert.equal(seAccepted.pendingProposal, null);
const seSecondAfterConfirm = applyExtractedFields(
  {
    ...seAccepted,
    awaitingYearsInBusiness: false,
    documents: [
      ...(seAccepted.documents ?? []),
      {
        slot: "other",
        name: "return-2023.png",
        type: "image/png",
        size: 8000,
        receivedAt: "2026-08-22T12:00:00.000Z",
        status: "reading",
      },
    ],
  },
  {
    extractClass: "tax_return",
    confidence: 0.93,
    fields: {
      tax_year: "2023",
      return_kind: "schedule_c",
      schedule_c_net_profit: "88000",
    },
  },
);
assert.equal(seSecondAfterConfirm.conflict, null);
assert.equal(seSecondAfterConfirm.draft.pendingConflict, null);
assert.equal(seSecondAfterConfirm.draft.pendingProposal?.value, "8167");
assert.equal(seSecondAfterConfirm.draft.facts?.qualifying_income?.value, "9000");
const seTwoYearAsk = workspacePromptCopy("confirm-proposal", seSecondAfterConfirm.draft);
assert.match(seTwoYearAsk.text, /Got the 2023 return/);
assert.match(seTwoYearAsk.text, /2024 is \$9,000 a month/);
assert.match(seTwoYearAsk.text, /2023 is \$7,333 a month/);
assert.match(seTwoYearAsk.text, /Two-year view is \$8,167 a month/);
assert.match(seTwoYearAsk.text, /stable-to-rising|averag/i);
assert.match(seTwoYearAsk.text, /Suggested qualifying income · not underwritten/);
assert.doesNotMatch(
  seTwoYearAsk.text,
  /which should I keep|the document has|Keep file|Use document|Updated from the document/i,
);
assert.ok((seTwoYearAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((seTwoYearAsk.actions ?? []).some((item) => item.label === "Change"));
assertIncomeChipsHoldOverQueue(seSecondAfterConfirm.draft, /\$8,167/);
{
  const twoYearUsed = resolveProposal(queuedMidConfirm(seSecondAfterConfirm.draft), "accept");
  if (workspacePrompt(twoYearUsed) === "done") {
    assert.equal(nextFoxAsk(twoYearUsed).text, MOTION_COPY.in_queue);
  }
}
assert.doesNotMatch(
  `${proposalAskCopy(seReturn.draft.pendingProposal!)} ${previewFacts(seAccepted).map((fact) => `${fact.value} ${fact.note ?? ""}`).join(" ")}`,
  /1084|\bDU\b|approved|eligible|you qualify|don’t qualify|agency_ready/i,
);

const seYearTwo = applyExtractedFields(seReturn.draft, {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: {
    tax_year: "2025",
    return_kind: "schedule_c",
    schedule_c_net_profit: "72000",
    depreciation: "12000",
  },
});
assert.equal(seYearTwo.draft.pendingProposal?.value, "7000");
assert.equal(receivedTaxReturnCount(seYearTwo.draft), 2);
assert.ok(!stillUsefulLabels(seYearTwo.draft).includes("prior-year return"));
assert.ok(!stillUsefulLabels(seYearTwo.draft).includes("tax return"));
assert.match(gatheringList(seYearTwo.draft), /government ID/i);
assert.equal(gatheringCopy(seYearTwo.draft), MOTION_COPY.ready);
assert.equal(
  monthlyQualifyingFromExtract(seReturn.draft, "tax_return", {
    tax_year: "2025",
    return_kind: "schedule_c",
    schedule_c_net_profit: "72000",
    depreciation: "12000",
  })?.monthly,
  7000,
);

const seRising = applyExtractedFields(seAfterLooks, {
  extractClass: "tax_return",
  confidence: 0.9,
  fields: { tax_year: "2024", return_kind: "schedule_c", schedule_c_net_profit: "72000" },
});
const seRisingTwo = applyExtractedFields(seRising.draft, {
  extractClass: "tax_return",
  confidence: 0.9,
  fields: { tax_year: "2025", return_kind: "schedule_c", schedule_c_net_profit: "96000" },
});
assert.equal(seRisingTwo.draft.pendingProposal?.value, "7000");

const k1Return = applyExtractedFields(seAfterLooks, {
  extractClass: "tax_return",
  confidence: 0.91,
  fields: {
    tax_year: "2024",
    return_kind: "k1",
    k1_ordinary_income: "180000",
    schedule_c_net_profit: "",
  },
});
assert.equal(k1Return.draft.facts?.k1_ordinary_income?.value, "180000");
assert.equal(k1Return.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(k1Return.draft.pendingProposal?.value, "15000");
assert.equal(k1Return.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.equal(k1Return.draft.facts?.qualifying_income, undefined);
const k1Accepted = resolveProposal(k1Return.draft, "accept");
assert.equal(k1Accepted.facts?.qualifying_income?.source, "suggested");
assert.equal(fileCompleteness(k1Accepted)?.groups.income.documented, false);
assert.ok(
  previewFacts(k1Accepted).some(
    (fact) => fact.id === "qualifying" && fact.note === SUGGESTED_INCOME_NOTE,
  ),
);
assert.match(nextFoxAsk(k1Return.draft).text, /Got the 2024 K-1/);
assert.match(nextFoxAsk(k1Return.draft).text, /Ordinary is not confirmed cash flow/);
assert.ok(stillUsefulLabels(k1Return.draft).includes("K-1 distributions"));
assert.ok(!stillUsefulLabels(k1Return.draft).includes("prior-year return"));
assert.match(stillUsefulAskCopy(k1Return.draft), /K-1 distributions/i);
assert.doesNotMatch(
  `${proposalAskCopy(k1Return.draft.pendingProposal!)} ${stillUsefulAskCopy(k1Return.draft)}`,
  /1084|\bDU\b|approved|eligible|you qualify|don’t qualify|agency_ready/i,
);

const seLoss = applyExtractedFields(seAfterLooks, {
  extractClass: "tax_return",
  confidence: 0.92,
  fields: {
    tax_year: "2024",
    return_kind: "schedule_c",
    schedule_c_net_profit: "(24000)",
    depreciation: "0",
  },
});
assert.equal(seLoss.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(seLoss.draft.pendingProposal?.value, "-2000");
assert.equal(seLoss.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.match(proposalAskCopy(seLoss.draft.pendingProposal!), /-\$2,000/);
assert.equal(seLoss.draft.facts?.qualifying_income, undefined);

const seZero = applyExtractedFields(seAfterLooks, {
  extractClass: "tax_return",
  confidence: 0.92,
  fields: {
    tax_year: "2024",
    return_kind: "schedule_c",
    schedule_c_net_profit: "0",
    depreciation: "0",
  },
});
assert.equal(seZero.draft.pendingProposal?.value, "0");
assert.equal(seZero.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);

const seAmort = applyExtractedFields(seAfterLooks, {
  extractClass: "tax_return",
  confidence: 0.9,
  fields: {
    tax_year: "2024",
    return_kind: "schedule_c",
    schedule_c_net_profit: "96000",
    depreciation: "12000",
    amortization: "2400",
  },
});
assert.equal(seAmort.draft.pendingProposal?.value, "9200");
assert.equal(readTaxCashflows(seAmort.draft)[0]?.amortization, "2400");

const seDecliningYearOne = applyExtractedFields(
  draft({
    ...afterLooks,
    incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
    documents: [
      {
        slot: "other",
        name: "return-2023.png",
        type: "image/png",
        size: 8000,
        receivedAt: "2026-08-21T00:00:00.000Z",
        status: "reading",
      },
    ],
  }),
  {
    extractClass: "tax_return",
    confidence: 0.93,
    fields: {
      tax_year: "2023",
      return_kind: "schedule_c",
      schedule_c_net_profit: "80000",
      depreciation: "8000",
      depletion: "0",
      business_use_of_home: "0",
      nonrecurring_other_income: "0",
    },
  },
);
assert.equal(seDecliningYearOne.draft.pendingProposal?.value, "7333");
assert.equal(readTaxCashflows(seDecliningYearOne.draft)[0]?.schedule_c_net_profit, "80000");
assert.ok(stillUsefulLabels(seDecliningYearOne.draft).includes("prior-year return"));

const seDecliningYearTwo = applyExtractedFields(
  {
    ...seDecliningYearOne.draft,
    documents: [
      ...seDecliningYearOne.draft.documents,
      {
        slot: "other",
        name: "return-declining-2024.png",
        type: "image/png",
        size: 8000,
        receivedAt: "2026-08-21T00:10:00.000Z",
        status: "reading",
      },
    ],
  },
  {
    extractClass: "tax_return",
    confidence: 0.93,
    fields: {
      tax_year: "2024",
      return_kind: "schedule_c",
      schedule_c_net_profit: "66000",
      depreciation: "6000",
    },
  },
);
assert.equal(seDecliningYearTwo.draft.pendingProposal?.value, "6000");
assert.notEqual(seDecliningYearTwo.draft.pendingProposal?.value, "6667");
assert.ok(laterYearIncomeLower(seDecliningYearTwo.draft));
assert.equal(guidelineCaution(seDecliningYearTwo.draft), DECLINING_INCOME_CAUTION);
assert.ok(seDecliningYearTwo.quietLines.includes(DECLINING_INCOME_CAUTION));
assert.ok(!seDecliningYearTwo.quietLines.includes("Updated income from tax return."));
const decliningCard = workspacePromptCopy("confirm-proposal", seDecliningYearTwo.draft);
assert.match(decliningCard.text, /Got the 2024 return/);
assert.match(decliningCard.text, /2024 is \$6,000 a month/);
assert.match(decliningCard.text, /2023 is \$7,333 a month/);
assert.match(decliningCard.text, /Two-year view is \$6,000 a month/);
assert.match(decliningCard.text, /declin/i);
assert.doesNotMatch(decliningCard.text, /which should I keep|the document has|Updated from the document/i);
assert.match(decliningCard.text, /Suggested qualifying income · not underwritten/);
assert.equal(decliningCard.followUp, DECLINING_INCOME_CAUTION);
assertIncomeChipsHoldOverQueue(seDecliningYearTwo.draft, /\$6,000/);
const yearOneAsk = workspacePromptCopy("confirm-proposal", seDecliningYearOne.draft);
assert.match(yearOneAsk.text, /Got the 2023 return/);
assert.match(yearOneAsk.text, /7,333/);
const supersededThread = inertSupersededIncomeConfirms([
  {
    id: "income-2023",
    role: "fox" as const,
    text: yearOneAsk.text,
    followUp: yearOneAsk.followUp,
    actions: yearOneAsk.actions,
  },
  {
    id: "income-2024",
    role: "fox" as const,
    text: decliningCard.text,
    followUp: decliningCard.followUp,
    actions: decliningCard.actions,
  },
]);
assert.ok(!(supersededThread[0]?.actions ?? []).some((item) => item.capture?.field === "accept-proposal"));
assert.ok(!(supersededThread[0]?.actions ?? []).some((item) => item.label === "Use this"));
assert.doesNotMatch(supersededThread[0]?.text ?? "", /Use this/);
assert.ok((supersededThread[1]?.actions ?? []).some((item) => item.label === "Use this"));
assert.match(`${supersededThread[1]?.text ?? ""} ${supersededThread[1]?.followUp ?? ""}`, /\$6,000/);
const restoredIncome = migrateRestoredFoxMessages(supersededThread);
assert.ok(!(restoredIncome[0]?.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((restoredIncome[1]?.actions ?? []).some((item) => item.label === "Use this"));
assert.ok(
  previewFacts(seDecliningYearTwo.draft).some(
    (fact) => fact.id === "caution" && fact.value === DECLINING_INCOME_CAUTION,
  ),
);
assert.ok(
  previewFacts(seDecliningYearTwo.draft).filter((fact) => fact.id === "caution").length <= 1,
);
assert.doesNotMatch(DECLINING_INCOME_CAUTION, /approv|eligible|ineligible|denied|1084|agency_ready|liquidity/i);
assert.equal(receivedTaxReturnCount(seDecliningYearTwo.draft), 2);
const decliningYears = readTaxCashflows(seDecliningYearTwo.draft);
assert.equal(decliningYears.length, 2);
assert.equal(decliningYears[0]?.tax_year, "2023");
assert.equal(decliningYears[0]?.schedule_c_net_profit, "80000");
assert.equal(decliningYears[0]?.depreciation, "8000");
assert.equal(decliningYears[1]?.tax_year, "2024");
assert.equal(decliningYears[1]?.schedule_c_net_profit, "66000");
assert.equal(decliningYears[1]?.depreciation, "6000");
assert.deepEqual(stillUsefulLabels(seDecliningYearTwo.draft), ["government ID"]);
assert.equal(seDecliningYearTwo.draft.facts?.qualifying_income, undefined);
assert.match(proposalAskCopy(seDecliningYearTwo.draft.pendingProposal!), /6,000/);
assert.match(proposalAskCopy(seDecliningYearTwo.draft.pendingProposal!), /Suggested monthly income is \$6,000/);
assert.equal(seDecliningYearTwo.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.doesNotMatch(
  `${proposalAskCopy(seDecliningYearTwo.draft.pendingProposal!)} ${stillUsefulAskCopy(seDecliningYearTwo.draft)}`,
  /1084|\bDU\b|approved|eligible|you qualify|don’t qualify|agency_ready/i,
);

const entityOrdinary = applyExtractedFields(
  draft({
    ...afterLooks,
    incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
    documents: [
      {
        slot: "other",
        name: "entity-ordinary-2024.png",
        type: "image/png",
        size: 8000,
        receivedAt: "2026-08-21T01:00:00.000Z",
        status: "reading",
      },
    ],
  }),
  {
    extractClass: "tax_return",
    confidence: 0.91,
    fields: {
      tax_year: "2024",
      return_kind: "k1",
      k1_ordinary_income: "40000",
      k1_distributions: "",
    },
  },
);
assert.equal(entityOrdinary.draft.documents[0]?.extractClass, "tax_return");
assert.equal(entityOrdinary.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(entityOrdinary.draft.pendingProposal?.value, "3333");
assert.equal(entityOrdinary.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.equal(entityOrdinary.draft.facts?.qualifying_income, undefined);
assert.equal(workspacePrompt(entityOrdinary.draft), "confirm-proposal");
const entityAsk = workspacePromptCopy("confirm-proposal", entityOrdinary.draft);
assert.match(entityAsk.text, /Got the 2024 K-1/);
assert.doesNotMatch(entityAsk.text, /Got the 2024 return/);
assert.match(entityAsk.text, /3,333/);
assert.match(entityAsk.text, /ordinary \/ 12/);
assert.match(entityAsk.text, /Ordinary is not confirmed cash flow/);
assert.ok((entityAsk.actions ?? []).some((action) => action.label === "Use this"));
assert.ok((entityAsk.actions ?? []).some((action) => action.label === "Change"));
assertIncomeChipsHoldOverQueue(entityOrdinary.draft, /3,333/);
assert.match(proposalAskCopy(entityOrdinary.draft.pendingProposal!), /3,333/);
assert.match(proposalAskCopy(entityOrdinary.draft.pendingProposal!), /Suggested monthly income is \$3,333/);
assert.equal(entityOrdinary.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.ok(stillUsefulLabels(entityOrdinary.draft).includes("K-1 distributions"));
assert.ok(stillUsefulLabels(entityOrdinary.draft).includes("government ID"));
assert.ok(!stillUsefulLabels(entityOrdinary.draft).includes("prior-year return"));
assert.match(stillUsefulAskCopy(entityOrdinary.draft), /Government ID/);
assert.match(stillUsefulAskCopy(entityOrdinary.draft), /K-1 distributions/);
assert.equal(fileCompleteness(entityOrdinary.draft)?.state, "sketch");
assert.equal(fileCompleteness(entityOrdinary.draft)?.groups.income.documented, false);
const entityAccepted = resolveProposal(entityOrdinary.draft, "accept");
assert.equal(entityAccepted.facts?.qualifying_income?.value, "3333");
assert.equal(entityAccepted.facts?.qualifying_income?.source, "suggested");
assert.ok(!entityAccepted.awaitingYearsInBusiness);
assert.notEqual(workspacePromptCopy("documents", entityAccepted).text, YEARS_IN_BUSINESS_ASK);
assert.equal(fileCompleteness(entityAccepted)?.groups.income.documented, false);
assert.doesNotMatch(
  `${proposalAskCopy(entityOrdinary.draft.pendingProposal!)} ${stillUsefulAskCopy(entityOrdinary.draft)}`,
  /1084|\bDU\b|approved|eligible|you qualify|don’t qualify|agency_ready/i,
);

assert.equal(preferFilenameClass("other", "entity-ordinary-2024.png"), "tax_return");
assert.equal(preferFilenameClass("other", "return-2024.png"), "tax_return");
assert.equal(
  receivedClassOf({
    slot: "other",
    name: "entity-ordinary-2024.png",
    type: "image/png",
    size: 8000,
    receivedAt: "2026-08-21T01:00:00.000Z",
    status: "extracted",
    extractClass: "other",
  }),
  "tax_return",
);
assert.ok(previewFacts(entityOrdinary.draft).some((fact) => fact.id === "docs" && /Tax return in/.test(fact.value)));
assert.ok(previewFacts(entityOrdinary.draft).every((fact) => fact.id !== "docs" || !/Other in/.test(fact.value)));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("850000", "680000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "self-employed" });
confirmLooksRight();
receiveDocument({
  slot: slotFromName("entity-ordinary-2024.png"),
  name: "entity-ordinary-2024.png",
  type: "image/png",
  size: 8000,
  receivedAt: "2026-08-21T02:00:00.000Z",
  bytesRef: "fox-intake/entity-ordinary-2024.png",
});
const entityWalkWrite = applyExtractWrite("2026-08-21T02:00:00.000Z", "entity-ordinary-2024.png", {
  extractClass: "other",
  confidence: 0.4,
  fields: {
    tax_year: "2024",
    return_kind: "1120s",
    k1_ordinary_income: "40000",
    k1_distributions: "",
  },
});
assert.equal(entityWalkWrite.draft.documents[0]?.extractClass, "tax_return");
assert.equal(entityWalkWrite.draft.documents[0]?.slot, "other");
assert.equal(entityWalkWrite.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(entityWalkWrite.draft.pendingProposal?.value, "3333");
assert.equal(entityWalkWrite.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.equal(entityWalkWrite.draft.facts?.qualifying_income, undefined);
assert.equal(entityWalkWrite.draft.facts?.k1_ordinary_income?.value, "40000");
assert.ok(!missingExtractClasses(entityWalkWrite.draft).includes("tax_return"));
assert.ok(stillUsefulLabels(entityWalkWrite.draft).includes("K-1 distributions"));
assert.ok(!stillUsefulLabels(entityWalkWrite.draft).includes("government ID"));
assert.ok(!stillUsefulLabels(entityWalkWrite.draft).includes("tax return"));
assert.match(stillUsefulAskCopy(entityWalkWrite.draft), /K-1 distributions/i);
assert.doesNotMatch(stillUsefulAskCopy(entityWalkWrite.draft), /government ID and tax return/i);
assert.ok(previewFacts(entityWalkWrite.draft).some((fact) => fact.id === "docs" && /Tax return in/.test(fact.value)));
assert.ok(previewFacts(entityWalkWrite.draft).every((fact) => fact.id !== "docs" || !/Other in/.test(fact.value)));
assert.equal(fileCompleteness(entityWalkWrite.draft)?.groups.income.documented, false);
assert.doesNotMatch(
  `${proposalAskCopy(entityWalkWrite.draft.pendingProposal!)} ${stillUsefulAskCopy(entityWalkWrite.draft)}`,
  /1084|\bDU\b|approved|eligible|you qualify|don’t qualify|agency_ready|liquidity|partnership/i,
);

const schCWins = applyExtractedFields(seDecliningYearTwo.draft, {
  extractClass: "tax_return",
  confidence: 0.9,
  fields: {
    tax_year: "2024",
    return_kind: "schedule_c",
    schedule_c_net_profit: "66000",
    depreciation: "6000",
    k1_ordinary_income: "40000",
  },
});
assert.equal(schCWins.draft.pendingProposal?.value, "6000");

const w2Extract = applyExtractedFields(afterLooks, {
  extractClass: "w2",
  confidence: 0.94,
  fields: { tax_year: "2025", employer_name: "Harbor Steel", wages: "84000" },
});
assert.equal(w2Extract.draft.facts?.wages?.value, "84000");
assert.equal(w2Extract.draft.pendingProposal?.value, "7000");
assert.equal(w2Extract.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.equal(w2Extract.draft.pendingProposal?.methodNote, W2_BOX1_MONTHLY_NOTE);
assert.equal(w2Extract.draft.facts?.qualifying_income, undefined);
assert.equal(workspacePrompt(w2Extract.draft), "confirm-proposal");
assert.ok(
  previewFacts(w2Extract.draft).some(
    (fact) =>
      fact.id === "qualifying" &&
      /7,000/.test(fact.value) &&
      /Box 1 monthly/.test(fact.value) &&
      fact.note === SUGGESTED_INCOME_NOTE,
  ),
);

const w2Conflict = applyExtractedFields(typedIncome, {
  extractClass: "w2",
  confidence: 0.94,
  fields: { tax_year: "2025", employer_name: "Harbor Steel", wages: "84000" },
});
assert.ok(w2Conflict.conflict);
assert.equal(w2Conflict.conflict?.field, "income");
assert.equal(w2Conflict.conflict?.fileValue, "6000");
assert.equal(w2Conflict.conflict?.documentValue, "7000");
assert.equal(w2Conflict.draft.facts?.wages, undefined);
assert.ok(!w2Conflict.draft.pendingProposal);

const paystubFreq = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.9,
  fields: { employer_name: "Harbor Steel", gross_period: "3500", pay_frequency: "biweekly" },
});
assert.equal(paystubFreq.draft.pendingProposal?.value, "7583");
assert.equal(paystubFreq.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);

const ytdVsW2Draft = draft({
  ...afterLooks,
  facts: {
    wages: { field: "wages", value: "84000", source: "extracted-unconfirmed", confirmed: true },
    tax_year: { field: "tax_year", value: "2025", source: "extracted-unconfirmed", confirmed: true },
  },
});
const ytdVsW2Write = applyExtractedFields(ytdVsW2Draft, {
  extractClass: "paystub",
  confidence: 0.92,
  fields: {
    employer_name: "Harbor Steel",
    pay_period_end: "2026-07-31",
    gross_period: "7200",
    ytd_gross: "50400",
  },
});
assert.equal(ytdVsW2Write.draft.awaitingPayFrequency, true);
const ytdVsW2Ready = applyPayFrequencyAnswer(ytdVsW2Write.draft, "monthly");
assert.equal(ytdVsW2Ready.awaitingBothMonthlyReason, true);
assert.equal(ytdVsW2Ready.pendingProposal, null);
assert.equal(ytdVsW2Ready.facts?.qualifying_income, undefined);
assert.equal(ytdVsW2Ready.facts?.paystub_monthly?.value, "7200");
assert.equal(ytdVsW2Ready.facts?.w2_monthly?.value, "7000");
assert.equal(nextFoxAsk(ytdVsW2Ready).text, bothMonthlyAskCopy(7200, 7000));
assert.ok(!ytdVsW2Write.quietLines.includes("YTD and the run-rate don’t match. I’m using the lower number — not a blend."));

const singleOtWrite = applyExtractedFields(afterLooks, {
  extractClass: "w2",
  confidence: 0.94,
  fields: { tax_year: "2025", employer_name: "Harbor Steel", wages: "84000", overtime: "12000" },
});
assert.equal(singleOtWrite.draft.pendingProposal?.value, "7000");
assert.match(nextFoxAsk(singleOtWrite.draft).text, /Box 1 monthly/);
assert.doesNotMatch(nextFoxAsk(singleOtWrite.draft).text, /Overtime history is thin/);
assert.doesNotMatch(nextFoxAsk(singleOtWrite.draft).text, /two-year OT average/);
assert.ok((nextFoxAsk(singleOtWrite.draft).actions ?? []).some((item) => item.label === "Use this"));
assert.ok((nextFoxAsk(singleOtWrite.draft).actions ?? []).some((item) => item.label === "Change"));

const otYearOne = applyExtractedFields(afterLooks, {
  extractClass: "w2",
  confidence: 0.94,
  fields: { tax_year: "2025", employer_name: "Harbor Steel", wages: "84000", overtime: "6000" },
});
assert.equal(otYearOne.draft.pendingProposal?.value, "7000");
const twoYearOtWrite = applyExtractedFields(otYearOne.draft, {
  extractClass: "w2",
  confidence: 0.94,
  fields: { tax_year: "2026", employer_name: "Harbor Steel", wages: "84000", overtime: "12000" },
});
assert.equal(twoYearOtWrite.conflict, null);
assert.equal(twoYearOtWrite.draft.pendingProposal?.value, "7750");
assert.match(nextFoxAsk(twoYearOtWrite.draft).text, /two-year OT average/);
assert.ok((nextFoxAsk(twoYearOtWrite.draft).actions ?? []).some((item) => item.label === "Use this"));
assert.ok((nextFoxAsk(twoYearOtWrite.draft).actions ?? []).some((item) => item.label === "Change"));

const decliningBonusYearOne = applyExtractedFields(afterLooks, {
  extractClass: "w2",
  confidence: 0.94,
  fields: { tax_year: "2025", employer_name: "Harbor Steel", wages: "84000", bonus: "12000" },
});
assert.equal(decliningBonusYearOne.draft.pendingProposal?.value, "7000");
const decliningBonusYearTwo = applyExtractedFields(decliningBonusYearOne.draft, {
  extractClass: "paystub",
  confidence: 0.93,
  fields: {
    tax_year: "2026",
    employer_name: "Harbor Steel",
    wages: "84000",
    bonus: "6000",
  },
});
assert.equal(decliningBonusYearTwo.draft.pendingProposal?.value, "7500");
assert.match(nextFoxAsk(decliningBonusYearTwo.draft).text, /later-year bonus/);
assert.match(
  `${nextFoxAsk(decliningBonusYearTwo.draft).text} ${nextFoxAsk(decliningBonusYearTwo.draft).followUp ?? ""}`,
  /Bonus is lower this year/,
);

const sameStubSecond = applyExtractedFields(afterLooks, {
  extractClass: "w2",
  confidence: 0.92,
  fields: {
    tax_year: "2025",
    employer_name: "Harbor Steel",
    wages: "84000",
    second_employer_name: "Night Shift Co",
  },
});
assert.equal(sameStubSecond.draft.pendingProposal?.value, "7000");
assert.match(
  `${nextFoxAsk(sameStubSecond.draft).text} ${sameStubSecond.quietLines.join(" ")}`,
  /A second employer name on one stub is not enough/,
);

const firstJobWrite = applyExtractedFields(afterLooks, {
  extractClass: "w2",
  confidence: 0.94,
  fields: { tax_year: "2025", employer_name: "Harbor Steel", wages: "84000" },
});
const firstJobAccepted = resolveProposal(firstJobWrite.draft, "accept");
assert.equal(firstJobAccepted.facts?.qualifying_income?.value, "7000");
const thinSecondJobWrite = applyExtractedFields(firstJobAccepted, {
  extractClass: "paystub",
  confidence: 0.92,
  fields: {
    employer_name: "Night Shift Co",
    tax_year: "2026",
    wages: "24000",
  },
});
assert.equal(thinSecondJobWrite.conflict, null);
assert.equal(thinSecondJobWrite.draft.facts?.qualifying_income?.value, "7000");
assert.equal(thinSecondJobWrite.draft.pendingProposal?.value, "9000");
assert.ok(thinSecondJobWrite.quietLines.includes(EMPLOYER_MISMATCH_LINE));
assert.equal(storeEscalate(factsFromDraft(thinSecondJobWrite.draft)).action, "stay");
assert.match(nextFoxAsk(thinSecondJobWrite.draft).text, /Second-job history is thin/);
assert.ok((nextFoxAsk(thinSecondJobWrite.draft).actions ?? []).some((item) => item.label === "Use this"));
assert.ok((nextFoxAsk(thinSecondJobWrite.draft).actions ?? []).some((item) => item.label === "Change"));

const wageAccepted = resolveProposal(acmeReady, "accept");
assert.equal(wageAccepted.facts?.qualifying_income?.value, "9167");
assert.equal(wageAccepted.facts?.wage_monthly?.value, "9167");
const combinedWrite = applyExtractedFields(wageAccepted, {
  extractClass: "tax_return",
  confidence: 0.93,
  fields: {
    tax_year: "2024",
    return_kind: "schedule_c",
    schedule_c_net_profit: "96000",
    depreciation: "12000",
  },
});
assert.equal(combinedWrite.conflict, null);
assert.equal(combinedWrite.draft.pendingProposal?.value, "18167");
assert.equal(combinedWrite.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.match(combinedWrite.draft.pendingProposal?.methodNote ?? "", /combined wage \+ Schedule C/);
const combinedAsk = nextFoxAsk(combinedWrite.draft);
assert.match(combinedAsk.text, /18,167/);
assert.match(combinedAsk.text, /combined wage \+ Schedule C/);
assert.match(combinedAsk.text, /biweekly period × 26 \/ 12/);
assert.match(combinedAsk.text, /Schedule C one-year/);
assert.match(combinedAsk.text, /Suggested qualifying income · not underwritten/);
assert.ok((combinedAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((combinedAsk.actions ?? []).some((item) => item.label === "Change"));
assertIncomeChipsHoldOverQueue(combinedWrite.draft, /18,167/);
const combinedQualify = workspaceReply("will i qualify", combinedWrite.draft);
assert.notEqual(combinedQualify?.capture?.field, "accept-proposal");
assertAnswerThenRestore(combinedQualify, /Not ready yet —/, {
  text: /18,167/,
  labels: ["Use this", "Change"],
});
assert.match(combinedQualify?.text ?? "", /A W-2 is still missing/);
const combinedAccepted = resolveProposal(combinedWrite.draft, "accept");
assert.equal(combinedAccepted.facts?.qualifying_income?.value, "18167");
assert.equal(combinedAccepted.facts?.wage_monthly?.value, "9167");
assert.equal(combinedAccepted.facts?.se_monthly?.value, "9000");

assert.equal(slotFromName("paystub-ot-bonus-2026.png"), "paystubs");
assert.equal(slotFromName("paystub-bonus-declining-2026.png"), "paystubs");
assert.equal(slotFromName("paystub-second-job.png"), "paystubs");
assert.equal(slotFromName("paystub-harbor.png"), "paystubs");
assert.equal(slotFromName("w2-ot-bonus-2025.png"), "w2");
assert.equal(slotFromName("w2-bonus-2025.png"), "w2");

assert.equal(variableMonthlyAmount(6000, null), 500);
assert.equal(variableMonthlyAmount(null, 12000, "2026-07-31"), 1714);
assert.equal(variableMonthlyAmount(null, 6000, "2026-07-31"), 857);

const printedOtW2 = printedSampleFromFilename("w2-ot-bonus-2025.png");
const printedOtStub = printedSampleFromFilename("paystub-ot-bonus-2026.png");
const printedBonusW2 = printedSampleFromFilename("w2-bonus-2025.png");
const printedBonusStub = printedSampleFromFilename("paystub-bonus-declining-2026.png");
const printedNight = printedSampleFromFilename("paystub-second-job.png");
const printedHarbor = printedSampleFromFilename("paystub-harbor.png");
assert.equal(printedOtW2?.fields.overtime, "6000");
assert.equal(printedOtW2?.fields.wages, "84000");
assert.equal(printedOtStub?.fields.overtime_ytd, "12000");
assert.equal(printedOtStub?.fields.gross_period, "7000");
assert.equal(printedOtStub?.fields.ytd_gross, undefined);
assert.equal(printedBonusW2?.fields.bonus, "12000");
assert.equal(printedBonusStub?.fields.bonus_ytd, "6000");
assert.equal(printedNight?.fields.employer_name, "NIGHT SHIFT CO");
assert.equal(printedHarbor?.fields.employer_name, "HARBOR CAFE");

const walkOtStub = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: printedOtStub!.fields,
});
assert.equal(walkOtStub.draft.awaitingPayFrequency, true);
const walkOtMonthly = applyPayFrequencyAnswer(walkOtStub.draft, "monthly");
assert.equal(walkOtMonthly.pendingProposal?.value, "7000");
assert.match(nextFoxAsk(walkOtMonthly).text, /monthly period × 12 \/ 12/);
assert.doesNotMatch(nextFoxAsk(walkOtMonthly).text, /two-year OT average/);
assert.ok(!(walkOtMonthly.pendingProposal?.extras ?? []).some((item) => item.field === "ytd_gross"));
const walkOtAccepted = draft({
  ...resolveProposal(walkOtMonthly, "accept"),
  documents: [
    extractedDoc("paystub-ot-bonus-2026.png", "paystub"),
    extractedDoc("w2-ot-bonus-2025.png", "w2", "received"),
  ],
});
const walkOtPair = applyExtractedFields(walkOtAccepted, {
  extractClass: "w2",
  confidence: 0.94,
  fields: printedOtW2!.fields,
});
assert.equal(walkOtPair.conflict, null);
assert.equal(walkOtPair.draft.awaitingBothMonthlyReason, false);
assert.equal(walkOtPair.draft.pendingProposal?.value, "7000");
assert.notEqual(walkOtPair.draft.pendingProposal?.value, "8107");
const walkOtAsk = nextFoxAsk(walkOtPair.draft);
assert.match(walkOtAsk.text, /I’m suggesting \$7,000 a month/);
assert.match(walkOtAsk.text, /Paystub \$7,000/);
assert.match(walkOtAsk.text, /W-2 Box 1 \$7,000/);
assert.doesNotMatch(walkOtAsk.text, /Using the lower/);
assert.doesNotMatch(walkOtAsk.text, /two-year OT average/);
assert.doesNotMatch(walkOtAsk.text, /8,107/);
assert.ok((walkOtAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((walkOtAsk.actions ?? []).some((item) => item.label === "Change"));
assert.equal(hasTwoYearWageHistory(walkOtPair.draft), true);
const walkOtFile = draft({
  ...walkOtPair.draft,
  documents: [
    {
      slot: "w2",
      name: "w2-ot-bonus-2025.png",
      type: "image/png",
      size: 8000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "w2",
    },
    {
      slot: "paystubs",
      name: "paystub-ot-bonus-2026.png",
      type: "image/png",
      size: 8000,
      receivedAt: "2026-08-20T00:01:00.000Z",
      status: "extracted",
      extractClass: "paystub",
    },
  ],
});
assert.ok(!stillUsefulLabels(walkOtFile).includes("second-year W-2"));
assert.ok(!layer2Plan(walkOtFile).some((item) => item.id === "second-year-w2"));

const walkOtW2First = applyExtractedFields(afterLooks, {
  extractClass: "w2",
  confidence: 0.94,
  fields: printedOtW2!.fields,
});
assert.equal(walkOtW2First.draft.pendingProposal?.value, "7000");
assert.equal(walkOtW2First.draft.pendingProposal?.methodNote, W2_BOX1_MONTHLY_NOTE);
assert.ok(
  previewFacts(walkOtW2First.draft).some(
    (fact) => fact.id === "qualifying" && /7,000/.test(fact.value) && /Box 1 monthly/.test(fact.value),
  ),
);
assert.doesNotMatch(nextFoxAsk(walkOtW2First.draft).text, /8,107|two-year OT average/);

const harborStubAsk = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: printedOtStub!.fields,
});
assert.equal(harborStubAsk.draft.awaitingPayFrequency, true);
assert.equal(printedOtStub!.fields.ytd_gross, undefined);
assert.ok(!Object.prototype.hasOwnProperty.call(printedOtStub!.fields, "ytd_gross"));
const harborStubBiweekly = applyPayFrequencyAnswer(harborStubAsk.draft, "biweekly");
assert.equal(harborStubBiweekly.pendingProposal?.value, "15167");
assert.match(nextFoxAsk(harborStubBiweekly).text, /biweekly period × 26 \/ 12/);
assert.ok(!(harborStubBiweekly.pendingProposal?.extras ?? []).some((item) => item.field === "ytd_gross"));
const harborStubAccepted = resolveProposal(harborStubBiweekly, "accept");
const harborBoth = applyExtractedFields(harborStubAccepted, {
  extractClass: "w2",
  confidence: 0.94,
  fields: printedOtW2!.fields,
});
assert.equal(harborBoth.draft.awaitingBothMonthlyReason, true);
assert.equal(harborBoth.draft.pendingProposal, null);
assert.equal(harborBoth.draft.facts?.qualifying_income, undefined);
assert.equal(harborBoth.draft.facts?.paystub_monthly?.value, "15167");
assert.equal(harborBoth.draft.facts?.w2_monthly?.value, "7000");
assert.notEqual(harborBoth.draft.facts?.qualifying_income?.value, "7000");
assert.ok(
  previewFacts(harborBoth.draft).some(
    (fact) => fact.id === "monthlies" && /15,167/.test(fact.value) && /7,000/.test(fact.value),
  ),
);
assert.ok(previewFacts(harborBoth.draft).every((fact) => fact.id !== "qualifying"));
const harborBothAsk = nextFoxAsk(harborBoth.draft);
assert.equal(harborBothAsk.text, bothMonthlyAskCopy(15167, 7000));
assert.equal(harborBothAsk.text, "The paystub is $15,167 a month. The W-2 Box 1 is $7,000 a month. Why do they differ?");
assert.deepEqual(
  (harborBothAsk.actions ?? []).map((item) => item.label),
  ["Raise / new base", "Overtime / bonus", "Second job", "Skip"],
);
assert.doesNotMatch(harborBothAsk.text, /Using the lower/);
assert.doesNotMatch(harborBothAsk.text, /Suggested qualifying income · not underwritten/);
assert.equal(workspacePrompt(harborBoth.draft), "both-monthly-reason");
const harborQualifyTooSoon = workspaceReply("will i qualify", harborBoth.draft);
assert.notEqual(harborQualifyTooSoon?.capture?.field, "bothMonthlyReason");
assert.notEqual(harborQualifyTooSoon?.capture?.field, "accept-proposal");
assert.equal(applyBothMonthlyReasonAnswer(harborBoth.draft, "skip").pendingProposal?.value, "7000");
assert.equal(applyBothMonthlyReasonAnswer(harborBoth.draft, "skip").pendingProposal?.caution, BOTH_MONTHLY_SKIP_NOTE);
assert.equal(applyBothMonthlyReasonAnswer(harborBoth.draft, "raise").awaitingRaiseWhen, true);
assert.equal(applyBothMonthlyReasonAnswer(harborBoth.draft, "raise").pendingProposal, null);
assert.equal(applyBothMonthlyReasonAnswer(harborBoth.draft, "raise").facts?.qualifying_income, undefined);
assert.equal(applyBothMonthlyReasonAnswer(harborBoth.draft, "overtime-bonus").pendingProposal?.value, "7000");
assert.equal(applyBothMonthlyReasonAnswer(harborBoth.draft, "overtime-bonus").pendingProposal?.caution, BOTH_MONTHLY_OT_NOTE);
assert.equal(applyBothMonthlyReasonAnswer(harborBoth.draft, "second-job").pendingProposal?.value, "7000");
const harborSkip = applyBothMonthlyReasonAnswer(harborBoth.draft, "skip");
assert.equal(harborSkip.awaitingBothMonthlyReason, false);
assert.equal(harborSkip.facts?.income_caution?.value, BOTH_MONTHLY_SKIP_NOTE);
assert.equal(harborSkip.facts?.paystub_monthly?.value, "15167");
assert.match(nextFoxAsk(harborSkip).text, /I’m suggesting \$7,000 a month/);
assert.match(nextFoxAsk(harborSkip).text, /Suggested qualifying income · not underwritten/);
assert.ok(previewFacts(harborSkip).some((fact) => fact.id === "monthlies" && /15,167/.test(fact.value)));
assert.ok(previewFacts(harborSkip).some((fact) => fact.id === "income-caution" && fact.value === BOTH_MONTHLY_SKIP_NOTE));
assert.ok(fileScenarioRows(harborSkip).some((row) => row[0] === "Income caution" && row[1] === BOTH_MONTHLY_SKIP_NOTE));
assert.doesNotMatch(BOTH_MONTHLY_SKIP_NOTE, /denied|denial|ineligible|approv|\bDU\b/i);
const harborTypedSkip = workspaceReply("Skip", harborBoth.draft);
assert.equal(harborTypedSkip?.capture?.field, "bothMonthlyReason");
assert.equal(harborTypedSkip?.capture?.value, "skip");
assert.match(harborTypedSkip?.text ?? "", /I’m suggesting \$7,000 a month/);
const harborTypedRaise = workspaceReply("that's my base now", harborBoth.draft);
assert.equal(harborTypedRaise?.capture?.field, "bothMonthlyReason");
assert.equal(harborTypedRaise?.capture?.value, "raise");
assert.equal(harborTypedRaise?.text, RAISE_WHEN_ASK);
assert.deepEqual(
  (harborTypedRaise?.actions ?? []).map((item) => item.label),
  ["This year", "Last year", "Not sure"],
);
const harborTypedOt = workspaceReply("overtime", harborBoth.draft);
assert.equal(harborTypedOt?.capture?.value, "overtime-bonus");
assert.match(harborTypedOt?.text ?? "", /I’m suggesting \$7,000 a month/);
assert.doesNotMatch(harborTypedOt?.text ?? "", /15,167 a month from/);
const harborRaiseWhen = applyBothMonthlyReasonAnswer(harborBoth.draft, "raise");
assert.equal(harborRaiseWhen.awaitingRaiseWhen, true);
assert.equal(workspacePrompt(harborRaiseWhen), "raise-when");
assert.equal(nextFoxAsk(harborRaiseWhen).text, RAISE_WHEN_ASK);
assert.ok(previewFacts(harborRaiseWhen).some((fact) => fact.id === "monthlies" && /15,167/.test(fact.value)));
assert.ok(previewFacts(harborRaiseWhen).every((fact) => fact.id !== "qualifying"));
const harborRaiseQualifyTooSoon = workspaceReply("will i qualify", harborRaiseWhen);
assert.notEqual(harborRaiseQualifyTooSoon?.capture?.field, "raiseWhen");
assert.notEqual(harborRaiseQualifyTooSoon?.capture?.field, "accept-proposal");
const harborMarch = applyRaiseWhenAnswer(harborRaiseWhen, "March");
assert.equal(harborMarch.awaitingRaiseWhen, false);
assert.equal(harborMarch.pendingProposal?.value, "15167");
assert.equal(harborMarch.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.equal(harborMarch.pendingProposal?.caution, RAISE_YTD_MISSING_NOTE);
assert.match(harborMarch.pendingProposal?.methodNote ?? "", /Jan–Feb at \$7,000/);
assert.match(harborMarch.pendingProposal?.methodNote ?? "", /Mar–Jul at \$15,167/);
assert.equal(harborMarch.facts?.income_caution?.value, RAISE_YTD_MISSING_NOTE);
assert.equal(harborMarch.facts?.paystub_monthly?.value, "15167");
assert.equal(harborMarch.facts?.w2_monthly?.value, "7000");
assert.notEqual(harborMarch.pendingProposal?.value, "7000");
assert.ok(previewFacts(harborMarch).some((fact) => fact.id === "monthlies" && /15,167/.test(fact.value) && /7,000/.test(fact.value)));
assert.ok(
  previewFacts(harborMarch).some(
    (fact) =>
      fact.id === "qualifying" &&
      /15,167/.test(fact.value) &&
      /Jan–Feb at \$7,000/.test(fact.value) &&
      /Mar–Jul at \$15,167/.test(fact.value) &&
      fact.note === SUGGESTED_INCOME_NOTE,
  ),
);
assert.ok(previewFacts(harborMarch).some((fact) => fact.id === "income-caution" && fact.value === RAISE_YTD_MISSING_NOTE));
assert.ok(fileScenarioRows(harborMarch).some((row) => row[0] === "Income caution" && row[1] === RAISE_YTD_MISSING_NOTE));
assert.match(nextFoxAsk(harborMarch).text, /I’m suggesting \$15,167 a month/);
assert.match(nextFoxAsk(harborMarch).text, /Cannot weight without YTD/);
assert.match(nextFoxAsk(harborMarch).text, /Suggested qualifying income · not underwritten/);
assert.doesNotMatch(nextFoxAsk(harborMarch).text, /Using the lower/);
assert.doesNotMatch(RAISE_YTD_MISSING_NOTE, /denied|denial|ineligible|approv|\bDU\b/i);
const harborThisYear = applyRaiseWhenAnswer(harborRaiseWhen, "this-year");
assert.equal(harborThisYear.pendingProposal?.value, "15167");
assert.equal(harborThisYear.pendingProposal?.caution, RAISE_YTD_MISSING_NOTE);
assert.notEqual(harborThisYear.pendingProposal?.value, "7000");
assert.ok(previewFacts(harborThisYear).some((fact) => fact.id === "income-caution" && fact.value === RAISE_YTD_MISSING_NOTE));
const harborLastYear = applyRaiseWhenAnswer(harborRaiseWhen, "last-year");
assert.equal(harborLastYear.pendingProposal?.value, "7000");
assert.equal(harborLastYear.pendingProposal?.caution, RAISE_YTD_MISSING_NOTE);
assert.equal(harborLastYear.facts?.paystub_monthly?.value, "15167");
assert.ok(previewFacts(harborLastYear).some((fact) => fact.id === "monthlies" && /15,167/.test(fact.value)));
assert.ok(previewFacts(harborLastYear).some((fact) => fact.id === "income-caution" && fact.value === RAISE_YTD_MISSING_NOTE));
assert.ok(fileScenarioRows(harborLastYear).some((row) => row[0] === "Income caution" && row[1] === RAISE_YTD_MISSING_NOTE));
const harborNotSure = applyRaiseWhenAnswer(harborRaiseWhen, "not-sure");
assert.equal(harborNotSure.pendingProposal?.value, "7000");
assert.equal(harborNotSure.pendingProposal?.caution, RAISE_WHEN_UNKNOWN_NOTE);
assert.equal(harborNotSure.facts?.paystub_monthly?.value, "15167");
assert.ok(previewFacts(harborNotSure).some((fact) => fact.id === "monthlies" && /15,167/.test(fact.value)));
const harborTypedMarch = workspaceReply("March", harborRaiseWhen);
assert.equal(harborTypedMarch?.capture?.field, "raiseWhen");
assert.match(harborTypedMarch?.text ?? "", /15,167/);
assert.match(harborTypedMarch?.text ?? "", /Cannot weight without YTD/);
const harborTypedThisYear = workspaceReply("This year", harborRaiseWhen);
assert.equal(harborTypedThisYear?.capture?.field, "raiseWhen");
assert.match(harborTypedThisYear?.text ?? "", /15,167/);
const harborWithYtd = {
  ...harborRaiseWhen,
  facts: {
    ...harborRaiseWhen.facts,
    ytd_gross: {
      field: "ytd_gross",
      value: "89835",
      source: "extracted-unconfirmed" as const,
      confirmed: true,
      confirmedAt: "2026-08-27T00:00:00.000Z",
    },
  },
};
const harborYtdClose = applyRaiseWhenAnswer(harborWithYtd, "March");
assert.equal(harborYtdClose.pendingProposal?.value, "15167");
assert.equal(harborYtdClose.pendingProposal?.caution, raiseYtdSupportsNote("March"));
assert.equal(harborYtdClose.awaitingRaiseYtdFar, false);
const harborYtdFarDraft = {
  ...harborRaiseWhen,
  facts: {
    ...harborRaiseWhen.facts,
    ytd_gross: {
      field: "ytd_gross",
      value: "49000",
      source: "extracted-unconfirmed" as const,
      confirmed: true,
      confirmedAt: "2026-08-27T00:00:00.000Z",
    },
  },
};
const harborYtdFar = applyRaiseWhenAnswer(harborYtdFarDraft, "March");
assert.equal(harborYtdFar.awaitingRaiseYtdFar, true);
assert.equal(harborYtdFar.pendingProposal, null);
assert.notEqual(harborYtdFar.facts?.qualifying_income?.value, "15167");
assert.equal(nextFoxAsk(harborYtdFar).text, raiseYtdFarAskCopy("March"));
assert.ok(previewFacts(harborYtdFar).some((fact) => fact.id === "monthlies" && /15,167/.test(fact.value)));
assert.ok(previewFacts(harborYtdFar).every((fact) => fact.id !== "qualifying"));
const harborYtdFarSkip = applyRaiseYtdFarAnswer(harborYtdFar, "Skip");
assert.equal(harborYtdFarSkip.pendingProposal?.value, "7000");
assert.equal(harborYtdFarSkip.awaitingRaiseYtdFar, false);
assert.equal(harborYtdFarSkip.facts?.paystub_monthly?.value, "15167");

const walkOtW2Accepted = resolveProposal(walkOtW2First.draft, "accept");
const walkOtStubAfterW2 = applyExtractedFields(walkOtW2Accepted, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: printedOtStub!.fields,
});
const walkOtW2ThenStub = walkOtStubAfterW2.draft.awaitingPayFrequency
  ? applyPayFrequencyAnswer(walkOtStubAfterW2.draft, "monthly")
  : walkOtStubAfterW2.draft;
assert.equal(walkOtW2ThenStub.awaitingBothMonthlyReason, false);
assert.equal(walkOtW2ThenStub.pendingProposal?.value, "7000");
assert.notEqual(walkOtW2ThenStub.pendingProposal?.value, "8107");
assert.match(nextFoxAsk(walkOtW2ThenStub).text, /Paystub \$7,000/);
assert.match(nextFoxAsk(walkOtW2ThenStub).text, /W-2 Box 1 \$7,000/);
assert.doesNotMatch(nextFoxAsk(walkOtW2ThenStub).text, /Using the lower/);
assert.doesNotMatch(nextFoxAsk(walkOtW2ThenStub).text, /two-year OT average/);
assert.equal(hasTwoYearWageHistory(walkOtW2ThenStub), true);
assert.ok(!stillUsefulLabels(walkOtW2ThenStub).includes("second-year W-2"));

const walkBonusStub = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: printedBonusStub!.fields,
});
const walkBonusMonthly = applyPayFrequencyAnswer(walkBonusStub.draft, "monthly");
assert.equal(walkBonusMonthly.pendingProposal?.value, "7000");
const walkBonusAccepted = draft({
  ...resolveProposal(walkBonusMonthly, "accept"),
  documents: [
    extractedDoc("paystub-bonus-declining-2026.png", "paystub"),
    extractedDoc("w2-bonus-2025.png", "w2", "received"),
  ],
});
const walkBonusPair = applyExtractedFields(walkBonusAccepted, {
  extractClass: "w2",
  confidence: 0.94,
  fields: printedBonusW2!.fields,
});
assert.equal(walkBonusPair.draft.awaitingBothMonthlyReason, false);
assert.equal(walkBonusPair.draft.pendingProposal?.value, "7000");
const walkBonusAsk = nextFoxAsk(walkBonusPair.draft);
assert.match(walkBonusAsk.text, /I’m suggesting \$7,000 a month/);
assert.doesNotMatch(walkBonusAsk.text, /Using the lower/);
assert.doesNotMatch(walkBonusAsk.text, /later-year bonus/);
assert.doesNotMatch(walkBonusAsk.text, /7,857/);
assert.ok((walkBonusAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((walkBonusAsk.actions ?? []).some((item) => item.label === "Change"));
assert.ok(!stillUsefulLabels(walkBonusPair.draft).includes("second-year W-2"));

const walkBonusW2First = applyExtractedFields(afterLooks, {
  extractClass: "w2",
  confidence: 0.94,
  fields: printedBonusW2!.fields,
});
const walkBonusW2Accepted = resolveProposal(walkBonusW2First.draft, "accept");
const walkBonusStubAfterW2 = applyExtractedFields(walkBonusW2Accepted, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: printedBonusStub!.fields,
});
const walkBonusW2ThenStub = walkBonusStubAfterW2.draft.awaitingPayFrequency
  ? applyPayFrequencyAnswer(walkBonusStubAfterW2.draft, "monthly")
  : walkBonusStubAfterW2.draft;
assert.equal(walkBonusW2ThenStub.awaitingBothMonthlyReason, false);
assert.equal(walkBonusW2ThenStub.pendingProposal?.value, "7000");
assert.doesNotMatch(nextFoxAsk(walkBonusW2ThenStub).text, /Using the lower/);
assert.doesNotMatch(nextFoxAsk(walkBonusW2ThenStub).text, /later-year bonus/);

const nightOnly = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: printedNight!.fields,
});
const nightReady = nightOnly.draft.awaitingPayFrequency
  ? applyPayFrequencyAnswer(nightOnly.draft, "monthly")
  : nightOnly.draft;
assert.equal(nightReady.pendingProposal?.value, "1200");
assert.doesNotMatch(nextFoxAsk(nightReady).text, /second job/);
const nightAccepted = draft({
  ...resolveProposal(nightReady, "accept"),
  documents: [
    extractedDoc("paystub-second-job.png", "paystub"),
    extractedDoc("paystub-harbor.png", "paystub", "received"),
  ],
});
assert.equal(nightAccepted.facts?.qualifying_income?.value, "1200");
const harborAdd = applyExtractedFields(nightAccepted, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: printedHarbor!.fields,
});
assert.equal(harborAdd.conflict, null);
assert.equal(harborAdd.draft.pendingProposal?.value, "1600");
assert.equal(harborAdd.draft.facts?.employer_name?.value, "NIGHT SHIFT CO");
assert.equal(harborAdd.draft.facts?.gross_period?.value, "1200");
assert.notEqual(harborAdd.draft.facts?.gross_period?.value, "400");
const harborAsk = nextFoxAsk(harborAdd.draft);
assert.equal(
  harborAsk.text,
  "Got the paystub. I’m suggesting $1,600 a month from monthly period × 12 / 12 plus second job. Second-job history is thin. Suggested qualifying income · not underwritten. Use this?",
);
assert.ok((harborAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((harborAsk.actions ?? []).some((item) => item.label === "Change"));
assert.ok(previewFacts(harborAdd.draft).some((fact) => fact.id === "pay" && /1,200/.test(fact.value)));
assert.ok(previewFacts(harborAdd.draft).every((fact) => fact.id !== "pay" || !/Period \$400/.test(fact.value)));
assert.ok(previewFacts(harborAdd.draft).some((fact) => fact.id === "employer" && fact.value === "NIGHT SHIFT CO"));

const highLtvBuy = withIncome(
  withPurchaseFunds(
    draft({
      path: "acr",
      productIntent: "buy",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      creditAsked: true,
      creditBand: "760+",
    }),
    850000,
    20000,
    830000,
  ),
);
assert.ok(canLooksRight(readyForReview(highLtvBuy)));
assert.equal(guidelineCaution(highLtvBuy), HIGH_LTV_CAUTION);
assert.ok(
  previewFacts(highLtvBuy).some(
    (fact) => fact.id === "caution" && fact.value === HIGH_LTV_CAUTION && fact.note === LTV_NOT_A_DECISION,
  ),
);
assert.doesNotMatch(HIGH_LTV_CAUTION, /approv|eligible|ineligible|\bDU\b|\bAUS\b|you qualify|will contact you/i);
const highLtvLooks = workspaceReply("Looks right", readyForReview(highLtvBuy));
assert.equal(highLtvLooks?.capture?.field, "confirm-draft");
assert.ok((highLtvLooks?.actions ?? []).some((item) => item.label === "Proceed"));
assert.notEqual(motionOf(applyLooksRightMotion(highLtvBuy)), "escalated");

const nonsenseBuy = withIncome(
  withPurchaseFunds(
    draft({
      path: "acr",
      productIntent: "buy",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      creditAsked: true,
      creditBand: "760+",
    }),
    850000,
    0,
    860000,
  ),
);
assert.ok(loanExceedsPurchasePrice(nonsenseBuy));
assert.ok(canLooksRight(readyForReview(nonsenseBuy)));
const nonsenseLooks = applyLooksRightMotion(readyForReview(nonsenseBuy));
assert.notEqual(motionOf(nonsenseLooks), "escalated");
assert.equal(workspacePrompt(skipDocInvites(nonsenseBuy)), "over-price");
assert.equal(workspaceReply("Looks right", skipDocInvites(nonsenseBuy))?.text, loanOverPriceCopy(nonsenseBuy));
assert.equal(MOTION_COPY.escalated, ESCALATE_LINE);
assert.equal(storeEscalate({ product: "buy", purposeHint: "purchase", purchasePrice: 850000, loanAmount: 860000 }).action, "stay");
assert.equal(
  storeEscalate({
    product: "buy",
    purposeHint: "purchase",
    purchasePrice: 850000,
    loanAmount: 860000,
    commitmentRequired: true,
  }).action,
  "escalate",
);
assert.equal(
  storeEscalate({
    product: "buy",
    purposeHint: "purchase",
    purchasePrice: 850000,
    loanAmount: 860000,
    commitmentRequired: true,
  }).borrowerLine,
  ESCALATE_LINE,
);
assert.ok(canLooksRight(readyForReview(nonsenseBuy)));
assert.doesNotMatch(
  `${MOTION_COPY.escalated} ${guidelineCaution(nonsenseBuy) ?? ""}`,
  /approv|eligible|ineligible|\bDU\b|\bAUS\b|you qualify|you don’t qualify|will contact you/i,
);

const lowCredit = draft({ ...afterIncome, creditBand: "680-719" });
assert.ok(!previewRateApplies(lowCredit));
assert.ok(previewFacts(lowCredit).every((fact) => !/620/.test(`${fact.value} ${fact.note ?? ""}`)));
assert.ok(previewFacts(lowCredit).some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));

const cashOutNamed = workspaceReply("This is a cash-out refinance", refiReady);
assert.equal(cashOutNamed?.capture?.field, "cashOut");
assert.ok((cashOutNamed?.text ?? "").includes(CASH_OUT_CAUTION));
assert.doesNotMatch(cashOutNamed?.text ?? "", /80\s*%|cash-out LTV/i);
assert.ok(!previewRateApplies(draft({ ...refiReady, cashOut: true })));
assert.equal(guidelineCaution(draft({ ...refiReady, cashOut: true })), CASH_OUT_CAUTION);
assert.ok(previewFacts(draft({ ...refiReady, cashOut: true })).some((fact) => fact.id === "product" && fact.value === "Refinance"));
assert.ok(previewFacts(draft({ ...refiReady, cashOut: true })).some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(previewFacts(draft({ ...refiReady, cashOut: true })).some((fact) => fact.id === "caution" && fact.value === CASH_OUT_CAUTION));
assert.notEqual(motionOf(draft({ ...refiReady, cashOut: true })), "escalated");
for (const phrase of [
  "I want cash from the refinance",
  "I want cash from the refi",
  "take cash out",
  "want cash",
]) {
  const spoken = workspaceReply(phrase, refiReady);
  assert.equal(spoken?.capture?.field, "cashOut", phrase);
  assert.ok((spoken?.text ?? "").includes(CASH_OUT_CAUTION), phrase);
  assert.doesNotMatch(spoken?.text ?? "", /I can answer from this file/i);
}
assert.equal(
  workspaceReply("I want cash and keep the first mortgage", refiAfterTime)?.capture?.field,
  "pending-offer",
);

const overPriceBase = draft({
  path: "acr",
  productIntent: "buy",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  valueAsked: true,
  propertyValueAmount: 500000,
});
assert.equal(workspacePrompt(overPriceBase), "amount");
const overPriceFile = {
  product: "buy",
  purposeHint: "purchase" as const,
  purchasePrice: 500000,
  loanAmount: 600000,
};
const overPriceLine =
  "The loan is larger than the purchase price. Want to change the price, the down payment, or the loan?";
assert.equal(topicFromFile(overPriceFile), "flags.loan_over_price");
assert.equal(interpretQuestion("600000"), null);
assert.equal(answerFromFile("flags.loan_over_price", overPriceFile).text, overPriceLine);
assert.equal(answerFromFile("flags.loan_over_price", overPriceFile).action, "stay");
assert.doesNotMatch(answerFromFile("flags.loan_over_price", overPriceFile).text, /licensed originator is on this exception|under the purchase price/i);
assert.equal(
  answerFromFile("flags.loan_over_price", { ...overPriceFile, commitmentRequired: true }).text,
  ESCALATE_LINE,
);
assert.match(foxAnswer("will i qualify", overPriceFile)?.text ?? "", /Not ready yet — The loan is larger than the purchase price\./);
assert.equal(foxAnswer("closing costs", overPriceFile)?.text, COST_LINE);
assert.equal(LOAN_OVER_PRICE_TEMPLATE, overPriceLine);
for (const typed of ["loan 600000", "600000", "600,000"]) {
  const over = workspaceReply(typed, overPriceBase);
  assert.equal(over?.capture?.field, "loanAmount", typed);
  assert.equal(over?.capture && "value" in over.capture ? over.capture.value : "", "600000", typed);
  assert.equal(over?.text, overPriceLine, typed);
  assert.deepEqual(
    (over?.actions ?? []).map((item) => item.label),
    ["Purchase price", "Down payment", "Loan amount", "That’s right"],
  );
  assert.doesNotMatch(over?.text ?? "", /under the purchase price|licensed originator is on this exception/i);
}
const downOverPrice = workspaceReply("down 600000", overPriceBase);
assert.notEqual(downOverPrice?.capture?.field, "loanAmount");
assert.match(downOverPrice?.text ?? "", /under the purchase price/i);
const overWritten = draft({
  ...overPriceBase,
  loanAmountValue: 600000,
  amountAsked: true,
});
assert.equal(overWritten.loanAmountValue, 600000);
assert.equal(overWritten.propertyValueAmount, 500000);
assert.equal(loanOverPriceCopy(overWritten), overPriceLine);
assert.notEqual(motionOf(overWritten), "escalated");
assert.equal(workspacePrompt(overWritten), "over-price");
assert.ok(previewFacts(overWritten).some((fact) => fact.id === "price" && /\$500,000/.test(fact.value)));
assert.ok(previewFacts(overWritten).some((fact) => fact.id === "loan" && /\$600,000/.test(fact.value)));
const overConfirm = workspaceReply("That’s right", overWritten);
assert.equal(overConfirm?.capture?.field, "over-price-confirm");
assert.equal(overConfirm?.text, ESCALATE_LINE);
assert.equal(motionOf({ ...overWritten, overPriceConfirmed: true, motion: "escalated" }), "escalated");

assert.ok(
  previewFacts(fromUrl).some(
    (fact) => fact.id === "employer" && fact.note === SUGGESTED_NOTE,
  ),
);

const sameValue = applyExtractedFields(paystubWrite.draft, {
  extractClass: "paystub",
  confidence: 0.9,
  fields: { employer_name: "Harbor Steel", gross_period: "$7,200" },
});
assert.equal(sameValue.conflict, null);
assert.deepEqual(sameValue.writes, []);

const lowConf = applyExtractedFields(afterLooks, {
  extractClass: "paystub",
  confidence: 0.2,
  fields: { gross_period: "999999", employer_name: "Invented Co" },
});
assert.equal(lowConf.draft.facts?.gross_period, undefined);
assert.equal(lowConf.draft.facts?.employer_name, undefined);
assert.deepEqual(lowConf.writes, []);

const otherClass = applyExtractedFields(afterLooks, {
  extractClass: "other",
  confidence: 0.9,
  fields: { purchase_price: "800000" },
});
assert.equal(otherClass.draft.propertyValueAmount, afterLooks.propertyValueAmount);
assert.deepEqual(otherClass.writes, []);

const bankExtract = applyExtractedFields(afterLooks, {
  extractClass: "bank_statement",
  confidence: 0.93,
  fields: {
    institution: "FIRST NATIONAL",
    period_end: "2026-07-31",
    ending_balance: "18400",
  },
});
assert.equal(bankExtract.draft.facts?.institution, undefined);
assert.equal(bankExtract.draft.facts?.ending_balance, undefined);
assert.equal(bankExtract.draft.statedAvailableAssets, undefined);
assert.equal(bankExtract.draft.pendingProposal?.field, "statedAvailableAssets");
assert.equal(bankExtract.draft.pendingProposal?.value, "18400");
assert.ok(
  previewFacts(bankExtract.draft).every(
    (fact) =>
      (fact.id !== "assets" || !/18,400|18400/.test(fact.value)) &&
      (fact.id !== "file-assets" || !/FIRST NATIONAL|18,400|18400/.test(fact.value)) &&
      fact.id !== "bank",
  ),
);
const bankAsk = nextFoxAsk(bankExtract.draft);
assert.match(bankAsk.text, /The statement shows FIRST NATIONAL · \$18,400/);
assert.match(bankAsk.text, /Suggested · not underwritten/);
assert.doesNotMatch(bankAsk.text, /as available assets|last4|account number/i);
assert.match(bankAsk.text, /Use this/);
assert.doesNotMatch(bankAsk.text, /enough|DTI|qualif|approv|months? reserves|you don.t qualify/i);
assert.ok((bankAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((bankAsk.actions ?? []).some((item) => item.label === "Change"));
const bankAccepted = resolveProposal(bankExtract.draft, "accept");
assert.equal(bankAccepted.facts?.institution?.value, "FIRST NATIONAL");
assert.equal(bankAccepted.facts?.ending_balance?.value, "18400");
assert.equal(bankAccepted.facts?.period_end?.value, "2026-07-31");
assert.equal(bankAccepted.statedAvailableAssets, 18400);
assert.equal(conventionalFileFromDraft(bankAccepted).assets.institution, "FIRST NATIONAL");
assert.equal(conventionalFileFromDraft(bankAccepted).assets.suggestedBalance, "18400");
assert.equal(conventionalFileFromDraft(bankAccepted).assets.last4, undefined);
const bankWithLast4 = applyExtractedFields(afterLooks, {
  extractClass: "bank_statement",
  confidence: 0.93,
  fields: {
    institution: "FIRST NATIONAL",
    ending_balance: "18400",
    account_type: "checking",
    account_last4: "9999888877771234",
    account_number: "9999888877771234",
  },
});
const bankLast4Accepted = resolveProposal(bankWithLast4.draft, "accept");
assert.equal(conventionalFileFromDraft(bankLast4Accepted).assets.type, "checking");
assert.equal(conventionalFileFromDraft(bankLast4Accepted).assets.last4, "1234");
assert.doesNotMatch(JSON.stringify(bankLast4Accepted.facts ?? {}), /9999888877771234/);
assert.equal(bankAccepted.pendingProposal, null);
assert.ok(!layer2Plan(bankAccepted).some((item) => item.label === "Bank statement"));
const bankLeft = resolveProposal(bankExtract.draft, "decline");
assert.equal(bankLeft.facts?.institution, undefined);
assert.equal(bankLeft.pendingProposal, null);
assert.equal(workspacePrompt(bankLeft), workspacePrompt({ ...afterLooks, pendingProposal: null }));

const contractSamePrice = applyExtractedFields(afterLooks, {
  extractClass: "purchase_contract",
  confidence: 0.93,
  fields: {
    property_address: "14 OAK STREET",
    purchase_price: "1200000",
    close_date: "2026-10-15",
  },
});
assert.equal(contractSamePrice.conflict, null);
assert.equal(contractSamePrice.draft.propertyValueAmount, afterLooks.propertyValueAmount);
assert.equal(contractSamePrice.draft.facts?.purchase_price, undefined);
assert.match(nextFoxAsk(contractSamePrice.draft).text, /The contract shows 14 OAK STREET/);
assert.match(nextFoxAsk(contractSamePrice.draft).text, /Suggested · not underwritten/);
assert.match(nextFoxAsk(contractSamePrice.draft).text, /Use this/);
const contractAccepted = resolveProposal(contractSamePrice.draft, "accept");
assert.equal(contractAccepted.facts?.property_address?.value, "14 OAK STREET");
assert.equal(conventionalFileFromDraft(contractAccepted).property.address, "14 OAK STREET");
assert.equal(contractAccepted.subjectAddress, "14 OAK STREET");
assert.equal(contractAccepted.facts?.close_date?.value, "2026-10-15");
assert.ok(!layer2Plan(contractAccepted).some((item) => item.label === "Property address"));
assert.ok(!layer2Plan(contractAccepted).some((item) => item.label === "Purchase contract"));

const contractConflict = applyExtractedFields(afterLooks, {
  extractClass: "purchase_contract",
  confidence: 0.93,
  fields: {
    property_address: "14 OAK STREET",
    purchase_price: "1150000",
    close_date: "2026-10-15",
  },
});
assert.ok(contractConflict.conflict);
assert.equal(contractConflict.conflict?.field, "purchase_price");
assert.equal(contractConflict.conflict?.fileValue, "1200000");
assert.equal(contractConflict.conflict?.documentValue, "1150000");
assert.equal(contractConflict.draft.propertyValueAmount, 1_200_000);
assert.match(conflictAskCopy(contractConflict.conflict!), /1,200,000/);
assert.match(conflictAskCopy(contractConflict.conflict!), /1,150,000/);
assert.ok((nextFoxAsk(contractConflict.draft).actions ?? []).some((item) => item.label === "Keep file"));
assert.ok((nextFoxAsk(contractConflict.draft).actions ?? []).some((item) => item.label === "Use document"));
assert.ok((nextFoxAsk(contractConflict.draft).actions ?? []).some((item) => item.label === "Keep both"));
assert.doesNotMatch(nextFoxAsk(contractConflict.draft).text, /qualif|approv|LO will contact/i);

const mortgageExtract = applyExtractedFields(
  draft({
    ...afterLooks,
    productIntent: "refinance",
    cashOut: false,
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "OAK SERVICING",
      unpaid_principal: "960000",
      current_pi: "4800",
      property_address: "14 OAK STREET",
    },
  },
);
assert.equal(mortgageExtract.conflict, null);
assert.equal(mortgageExtract.draft.facts?.servicer, undefined);
assert.equal(mortgageExtract.draft.facts?.current_pi, undefined);
assert.equal(mortgageExtract.draft.statedCurrentHousing, undefined);
assert.equal(mortgageExtract.draft.loanAmountValue, 960_000);
assert.equal(mortgageExtract.draft.statedOtherReo, undefined);
assert.ok(!mortgageExtract.draft.pendingOtherReo);
assert.equal(mortgageExtract.draft.pendingProposal?.field, "statedCurrentHousing");
assert.match(nextFoxAsk(mortgageExtract.draft).text, /current payment of about \$4,800/);
assert.match(nextFoxAsk(mortgageExtract.draft).text, /Suggested · not underwritten/);
assert.doesNotMatch(nextFoxAsk(mortgageExtract.draft).text, /qualif|approv|enough|payment shock/i);
const mortgageAccepted = resolveProposal(mortgageExtract.draft, "accept");
assert.equal(mortgageAccepted.facts?.servicer?.value, "OAK SERVICING");
assert.equal(mortgageAccepted.facts?.current_pi?.value, "4800");
assert.equal(mortgageAccepted.statedCurrentHousing, 4800);
assert.equal(mortgageAccepted.statedMonthlyDebts, undefined);
assert.equal(mortgageAccepted.loanAmountValue, 960_000);
assert.ok(!layer2Plan(mortgageAccepted).some((item) => item.label === "Mortgage statement"));

const mortgageConflict = applyExtractedFields(
  draft({
    ...afterLooks,
    productIntent: "refinance",
    loanAmountValue: 960_000,
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: { servicer: "OAK SERVICING", unpaid_principal: "880000" },
  },
);
assert.ok(mortgageConflict.conflict);
assert.equal(mortgageConflict.conflict?.field, "unpaid_principal");
assert.equal(mortgageConflict.draft.loanAmountValue, 960_000);

const westCoastConflict = applyExtractedFields(
  draft({
    ...afterLooks,
    productIntent: "refinance",
    loanAmountValue: 600_000,
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: { servicer: "West Coast Servicing", unpaid_principal: "612000" },
  },
);
assert.ok(westCoastConflict.conflict);
assert.equal(westCoastConflict.conflict?.field, "unpaid_principal");
assert.equal(westCoastConflict.conflict?.fileValue, "600000");
assert.equal(westCoastConflict.conflict?.documentValue, "612000");
assert.equal(westCoastConflict.draft.facts?.servicer, undefined);
assert.equal(westCoastConflict.draft.facts?.unpaid_principal, undefined);
assert.match(nextFoxAsk(westCoastConflict.draft).text, /600,000/);
assert.match(nextFoxAsk(westCoastConflict.draft).text, /612,000/);
const westCoastUsedDoc = resolveFactConflict(westCoastConflict.draft, "document");
assert.equal(westCoastUsedDoc.facts?.unpaid_principal?.value, "612000");
assert.equal(westCoastUsedDoc.loanAmountValue, 612_000);
assert.equal(westCoastUsedDoc.facts?.servicer, undefined);
assert.ok(
  previewFacts(westCoastUsedDoc).every(
    (fact) => fact.id !== "servicer" || !/612/.test(fact.value),
  ),
);
assert.ok(
  previewFacts(westCoastUsedDoc).some(
    (fact) => fact.id === "unpaid_principal" && fact.label === "Unpaid principal" && /\$612,000/.test(fact.value),
  ),
);
assert.match(nextFoxAsk(westCoastUsedDoc).text, /West Coast Servicing/);
assert.match(nextFoxAsk(westCoastUsedDoc).text, /Use this/);
const westCoastNamed = resolveProposal(westCoastUsedDoc, "accept");
assert.equal(westCoastNamed.facts?.servicer?.value, "West Coast Servicing");
assert.equal(westCoastNamed.facts?.unpaid_principal?.value, "612000");
assert.ok(
  previewFacts(westCoastNamed).some(
    (fact) => fact.id === "servicer" && fact.label === "Servicer" && fact.value === "West Coast Servicing",
  ),
);
assert.ok(
  previewFacts(westCoastNamed).every((fact) => fact.id !== "servicer" || !/612/.test(fact.value)),
);
assert.ok(
  previewFacts(westCoastNamed).some(
    (fact) => fact.id === "unpaid_principal" && fact.label === "Unpaid principal" && /\$612,000/.test(fact.value),
  ),
);

const typedAddress = draft({
  ...afterLooks,
  facts: {
    property_address: {
      field: "property_address",
      value: "14 OAK STREET",
      source: "client",
      confirmed: true,
    },
  },
});
assert.ok(!layer2Plan(typedAddress).some((item) => item.label === "Property address"));
assert.ok(layer2Plan(typedAddress).some((item) => item.label === "Purchase contract"));

const stripped = sanitizeExtractedFields("government_id", {
  full_name: "Jordan Lee",
  id_last4: "987654321",
  date_of_birth: "1990-04-12",
  dob: "1990-04-12",
  ssn: "123-45-6789",
  fico: "742",
  credit_score: "741",
  state: "CA",
});
assert.equal(stripped.full_name, "Jordan Lee");
assert.equal(stripped.id_last4, "4321");
assert.equal(stripped.ssn, undefined);
assert.equal(stripped.date_of_birth, undefined);
assert.equal(stripped.dob, undefined);
assert.equal(stripped.fico, undefined);
assert.equal(stripped.credit_score, undefined);
assert.ok(stripped.id_last4 !== stripped.ssn);

const afterPaystubDoc = draft({
  ...afterLooks,
  documents: [
    {
      slot: "paystubs",
      name: "paystub.pdf",
      type: "application/pdf",
      size: 12000,
      receivedAt: "2026-08-20T00:00:00.000Z",
      status: "extracted",
      extractClass: "paystub",
      bytesRef: "fox-intake/paystub.pdf",
    },
  ],
});
const missingAfterPaystub = missingExtractClasses(afterPaystubDoc);
assert.deepEqual(missingAfterPaystub, ["government_id", "w2"]);
assert.match(missingAskCopy(missingAfterPaystub), /government ID and W-2/i);
assert.ok(!missingAfterPaystub.includes("paystub"));
assert.ok(!missingAfterPaystub.includes("purchase_contract"));

const selfMissing = missingExtractClasses(
  draft({
    ...afterLooks,
    productIntent: "refinance",
    incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
    propertyValueAmount: undefined,
  }),
);
assert.ok(selfMissing.includes("government_id"));
assert.ok(selfMissing.includes("tax_return"));
assert.ok(!selfMissing.includes("mortgage_statement"));
assert.ok(!selfMissing.includes("purchase_contract"));
assert.ok(!selfMissing.includes("paystub"));

const skippedRemaining = skipRemainingClasses(afterPaystubDoc);
assert.equal(skippedRemaining.documentsSkipped, true);
assert.ok(skippedRemaining.skippedClasses?.includes("government_id"));
assert.ok(skippedRemaining.skippedClasses?.includes("w2"));
assert.ok(!skippedRemaining.skippedClasses?.includes("paystub"));
assert.equal(workspacePrompt(skippedRemaining), "housing");

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
applyExtractWrite(
  "2026-08-20T00:00:00.000Z",
  "paystub.pdf",
  { extractClass: "paystub", confidence: 0.9, fields: { employer_name: "Harbor Steel", gross_period: "7200" } },
);
const noDocYet = getFoxDraft();
assert.equal(noDocYet.facts?.employer_name, undefined);
receiveDocument({
  slot: "paystubs",
  name: "paystub.pdf",
  type: "application/pdf",
  size: 12000,
  receivedAt: "2026-08-20T00:00:00.000Z",
  bytesRef: "fox-intake/paystub.pdf",
});
const wrote = applyExtractWrite(
  "2026-08-20T00:00:00.000Z",
  "paystub.pdf",
  { extractClass: "paystub", confidence: 0.9, fields: { employer_name: "Harbor Steel", gross_period: "7200" } },
);
assert.equal(wrote.draft.facts?.employer_name, undefined);
assert.equal(wrote.draft.productIntent, "buy");
assert.equal(wrote.draft.awaitingPayFrequency, true);
assert.equal(wrote.draft.pendingProposal?.field, "employer_name");
assert.ok(previewFacts(wrote.draft).some((fact) => fact.id === "employer" && fact.value === "Harbor Steel"));
assert.ok(previewFacts(wrote.draft).some((fact) => fact.id === "pay" && /7,200/.test(fact.value)));
applyCapture({ field: "accept-proposal" });
const wroteAccepted = getFoxDraft();
assert.equal(wroteAccepted.facts?.employer_name?.value, "Harbor Steel");
assert.equal(wroteAccepted.facts?.gross_period?.value, "7200");
assert.equal(workspacePrompt(wroteAccepted), "pay-frequency");
assert.match(nextFoxAsk(wroteAccepted).text, /How often is this paycheck/);
assert.ok(statusCopy(wroteAccepted) === "ready" || statusCopy(wroteAccepted) === "gathering");
assert.ok(previewFacts(wroteAccepted).some((fact) => fact.id === "originator"));
assert.ok(previewFacts(wroteAccepted).some((fact) => fact.id === "next"));
assert.ok(previewFacts(wroteAccepted).some((fact) => fact.id === "docs" && /Paystubs in/.test(fact.value)));
assert.ok(previewFacts(wroteAccepted).every((fact) => fact.id !== "docs" || !/Other in/.test(fact.value)));
assert.ok(previewFacts(wroteAccepted).every((fact) => fact.id !== "product" || fact.value === "Buy"));
const failedWrite = applyExtractWrite(
  "2026-08-20T00:00:00.000Z",
  "paystub.pdf",
  { extractClass: "paystub", confidence: 0.9, fields: { gross_period: "1" } },
  "Fox could not read this file. Type a note or skip. No dollar amounts were invented.",
  true,
);
assert.equal(failedWrite.draft.facts?.gross_period?.value, "7200");
assert.equal(failedWrite.quietLines[0], FAILED_READ_NOTE);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
receiveDocument({
  slot: slotFromName("paystub-acme.png"),
  name: "paystub-acme.png",
  type: "image/png",
  size: 24000,
  receivedAt: "2026-08-20T01:00:00.000Z",
  bytesRef: "fox-intake/paystub-acme.png",
});
const failedOther = applyExtractWrite(
  "2026-08-20T01:00:00.000Z",
  "paystub-acme.png",
  { extractClass: "other", confidence: 0, fields: {} },
  FAILED_READ_NOTE,
  true,
);
assert.equal(failedOther.draft.documents[0]?.slot, "paystubs");
assert.equal(failedOther.draft.documents[0]?.extractClass, "paystub");
assert.equal(failedOther.draft.documents[0]?.status, "received");
assert.equal(failedOther.draft.facts?.employer_name, undefined);
assert.equal(failedOther.quietLines[0], FAILED_READ_NOTE);
assert.ok(previewFacts(failedOther.draft).some((fact) => fact.id === "docs" && /Paystubs in/.test(fact.value)));
assert.ok(previewFacts(failedOther.draft).every((fact) => fact.id !== "docs" || !/Other in/.test(fact.value)));
assert.equal(failedOther.draft.productIntent, "buy");
assert.ok(!missingExtractClasses(failedOther.draft).includes("government_id"));

const unreadIdDraft = draft({
  ...afterIncome,
  docsStarted: true,
  looksRightHold: true,
  documents: [
    {
      slot: "id",
      name: "id.pdf",
      type: "application/pdf",
      size: 8000,
      receivedAt: "2026-08-27T00:00:00.000Z",
      status: "received",
      extractClass: "government_id",
      note: FAILED_READ_NOTE,
    },
  ],
});
assert.equal(docReactionAsk(unreadIdDraft, "government_id"), null);
assert.equal(nextDocInvite(unreadIdDraft), "paystub");
assert.equal(workspacePromptCopy("documents", unreadIdDraft).text, DOC_INVITE_COPY.paystub);
assert.doesNotMatch(workspacePromptCopy("documents", unreadIdDraft).text, /government ID/i);
assert.ok(!stillUsefulSection(unreadIdDraft)?.items.some((item) => item.label === "Government ID"));
assert.ok(stillUsefulSection(unreadIdDraft)?.items.some((item) => item.label === "Latest two paystubs"));
assert.ok(previewFacts(unreadIdDraft).some((fact) => fact.id === "docs" && /ID in/.test(fact.value)));
assert.equal(canLooksRight(unreadIdDraft), false);
assert.notEqual(workspacePrompt(unreadIdDraft), "review");
const unreadStubDraft = draft({
  ...unreadIdDraft,
  documents: [
    ...unreadIdDraft.documents,
    {
      slot: "paystubs",
      name: "paystub.pdf",
      type: "application/pdf",
      size: 8000,
      receivedAt: "2026-08-27T00:01:00.000Z",
      status: "received",
      extractClass: "paystub",
      note: FAILED_READ_NOTE,
    },
  ],
});
assert.equal(nextDocInvite(unreadStubDraft), "w2");
assert.doesNotMatch(workspacePromptCopy("documents", unreadStubDraft).text, /paystub/i);
assert.ok(stillUsefulSection(unreadStubDraft)?.items.some((item) => item.label === "Latest two paystubs"));
assert.ok(previewFacts(unreadStubDraft).some((fact) => fact.id === "docs" && /Paystubs in/.test(fact.value)));
const unreadW2Draft = draft({
  ...unreadStubDraft,
  documents: [
    ...unreadStubDraft.documents,
    {
      slot: "w2",
      name: "w2.pdf",
      type: "application/pdf",
      size: 8000,
      receivedAt: "2026-08-27T00:02:00.000Z",
      status: "received",
      extractClass: "w2",
      note: FAILED_READ_NOTE,
    },
  ],
});
assert.equal(nextDocInvite(unreadW2Draft), null);
assert.ok(stillUsefulSection(unreadW2Draft)?.items.some((item) => item.label === "Latest two paystubs"));
assert.ok(stillUsefulSection(unreadW2Draft)?.items.some((item) => item.label === "W-2 most recent two years"));
assert.equal(canLooksRight(unreadW2Draft), false);
assert.notEqual(workspacePrompt(unreadW2Draft), "review");
assert.ok(
  !(workspacePromptCopy(workspacePrompt(unreadW2Draft), unreadW2Draft).actions ?? []).some(
    (item) => item.label === "Looks right",
  ),
);

resetWorkspaceForEntry("acr", "buy");
receiveDocument({
  slot: "id",
  name: "id.pdf",
  type: "application/pdf",
  size: 8000,
  receivedAt: "2026-08-27T03:00:00.000Z",
});
const unreadIdWrite = applyExtractWrite(
  "2026-08-27T03:00:00.000Z",
  "id.pdf",
  { extractClass: "government_id", confidence: 0.9, fields: {} },
);
assert.equal(unreadIdWrite.quietLines[0], FAILED_READ_NOTE);
assert.equal(unreadIdWrite.draft.documents[0]?.status, "received");
assert.equal(unreadIdWrite.draft.looksRightHold, true);
applyCapture({ field: "occupancy", value: "primary" });
assert.equal(getFoxDraft().looksRightHold, true);

const readyPaystub = draft({
  ...afterLooks,
  documents: [
    {
      slot: "paystubs",
      name: "paystub-acme.png",
      type: "image/png",
      size: 24000,
      receivedAt: "2026-08-20T01:00:00.000Z",
      status: "extracted",
      extractClass: "paystub",
    },
  ],
});
assert.ok(!missingExtractClasses(readyPaystub).includes("paystub"));
const receivedPaystub = draft({
  ...afterLooks,
  documents: [
    {
      slot: "paystubs",
      name: "paystub-acme.png",
      type: "image/png",
      size: 24000,
      receivedAt: "2026-08-20T01:00:00.000Z",
      status: "received",
    },
  ],
});
assert.ok(!missingExtractClasses(receivedPaystub).includes("paystub"));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
receiveDocument({
  slot: slotFromName("jordan-paystub.pdf"),
  name: "jordan-paystub.pdf",
  type: "application/pdf",
  size: 18000,
  receivedAt: "2026-08-20T02:00:00.000Z",
  bytesRef: "fox-intake/jordan-paystub.pdf",
});
const leakedOther = applyExtractWrite(
  "2026-08-20T02:00:00.000Z",
  "jordan-paystub.pdf",
  { extractClass: "other", confidence: 0.31, fields: { employer_name: "Should Not Write" } },
  "Document received",
  false,
);
assert.equal(leakedOther.draft.documents[0]?.slot, "paystubs");
assert.equal(leakedOther.draft.documents[0]?.extractClass, "paystub");
assert.equal(leakedOther.draft.facts?.employer_name, undefined);
assert.equal(leakedOther.draft.productIntent, "buy");
assert.ok(previewFacts(leakedOther.draft).some((fact) => fact.id === "docs" && /Paystubs in/.test(fact.value)));
assert.ok(previewFacts(leakedOther.draft).every((fact) => fact.id !== "docs" || !/Other in/.test(fact.value)));
assert.ok(previewFacts(leakedOther.draft).every((fact) => fact.id !== "product" || fact.value === "Buy"));

receiveDocument({
  slot: "id",
  name: "license-id.png",
  type: "image/png",
  size: 8000,
  receivedAt: "2026-08-20T02:10:00.000Z",
});
const idOther = applyExtractWrite(
  "2026-08-20T02:10:00.000Z",
  "license-id.png",
  { extractClass: "other", confidence: 0.4, fields: {} },
  "Document received",
  false,
);
assert.ok(previewFacts(idOther.draft).some((fact) => fact.id === "docs" && /ID in/.test(fact.value)));
assert.ok(previewFacts(idOther.draft).every((fact) => fact.id !== "docs" || !/Other in/.test(fact.value)));

const otherAmountDraft = draft({
  path: "acr",
  productIntent: "other",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
});
assert.equal(workspacePrompt(otherAmountDraft), "amount");
const otherPurpose = workspacePromptCopy("amount", otherAmountDraft);
assert.equal(otherPurpose.text, "What is that number for?");
assert.doesNotMatch(otherPurpose.text, /rough amount|What’s a rough amount/i);
assert.deepEqual(
  (otherPurpose.actions ?? []).filter((item) => item.capture?.field === "amountPurpose").map((item) => item.label),
  ["Purchase price", "Loan amount", "HELOC line"],
);
const namedOther = workspaceReply("Purchase price", otherAmountDraft);
assert.equal(namedOther?.capture?.field, "amountPurpose");
assert.match(namedOther?.text ?? "", /purchase price/i);

const incomeModuleSrc = readFileSync(join(root, "lib/income/suggest.ts"), "utf8");
assert.match(incomeModuleSrc, /"one-year"/);
assert.match(incomeModuleSrc, /"two-year-average"/);
assert.match(incomeModuleSrc, /"later-year-lower"/);
assert.match(incomeModuleSrc, /"period-frequency"/);
assert.match(incomeModuleSrc, /"ytd-months"/);
assert.match(incomeModuleSrc, /"w2-annual"/);
assert.match(incomeModuleSrc, /"both-ask"/);
assert.match(incomeModuleSrc, /Box 1 monthly/);
assert.match(incomeModuleSrc, /Why do they differ/);
assert.doesNotMatch(incomeModuleSrc, /Using the lower/);
assert.match(incomeModuleSrc, /suggestScheduleCIncome/);
assert.match(incomeModuleSrc, /suggestWageIncome/);
assert.match(incomeModuleSrc, /No 1084 UI/);
assert.doesNotMatch(incomeModuleSrc, /1084 form|underwriting form|borrower form/i);
assert.doesNotMatch(incomeModuleSrc, /export function wageMonthly/);
const incomeAdapterSrc = readFileSync(join(root, "components/fox/qualifyingIncome.ts"), "utf8");
assert.ok(incomeAdapterSrc.includes('from "@/lib/income/suggest"'));
assert.ok(incomeAdapterSrc.includes("suggestScheduleCIncome"));
assert.ok(incomeAdapterSrc.includes("suggestWageIncome"));
assert.doesNotMatch(incomeAdapterSrc, /export function wageMonthly/);
assert.doesNotMatch(incomeAdapterSrc, /function wageMonthly/);
const guidelineStoreSrc = readFileSync(join(root, "lib/guidelines/conventional.ts"), "utf8");
assert.match(guidelineStoreSrc, /CONVENTIONAL_GUIDELINE_VERSION/);
assert.match(guidelineStoreSrc, /queryConventionalGuidelines/);
assert.match(guidelineStoreSrc, /fannie/);
assert.match(guidelineStoreSrc, /freddie/);
assert.doesNotMatch(guidelineStoreSrc, /agency: "fha"|agency: "va"/);
assert.equal(queryConventionalGuidelines().every((row) => row.agency === "fannie" || row.agency === "freddie"), true);
assert.match(guidelineStoreSrc, /function lookup\(/);
assert.match(guidelineStoreSrc, /function flags\(/);
assert.match(guidelineStoreSrc, /function escalate\(/);
assert.match(guidelineStoreSrc, /function completeness\(/);
assert.match(guidelineStoreSrc, /function readinessFromFile\(/);
assert.doesNotMatch(guidelineStoreSrc, /I can prepare a file\. I cannot approve or say you qualify/);
assert.doesNotMatch(guidelineStoreSrc, /I can prepare a file\. I cannot say you qualify/);
assert.match(guidelineStoreSrc, /flags\.loan_over_price/);
assert.match(guidelineStoreSrc, /The loan is larger than the purchase price/);
assert.doesNotMatch(guidelineStoreSrc, /HOA questionnaire|condo project docs|Form 1076/);
assert.doesNotMatch(
  readFileSync(join(root, "components/fox/fileWrite.ts"), "utf8"),
  /HOA questionnaire|condo project docs|condo-hoa|Form 1076/,
);
const answerPathSrc = readFileSync(join(root, "lib/guidelines/answer.ts"), "utf8");
assert.match(answerPathSrc, /interpretQuestion/);
assert.match(answerPathSrc, /applyHardRails/);
assert.match(answerPathSrc, /topicFromFile/);
assert.match(answerPathSrc, /answerFromFile/);
assert.match(
  storeLookup("language.will_i_qualify", { askedWillIQualify: true }).borrowerLine,
  /This file is still thin\./,
);
assert.equal(readinessFromFile({ askedWillIQualify: true }).kind, "thin");
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "se_schedule_c",
    received: ["tax_return"],
    taxReturnCount: 1,
  }).line,
  READINESS_STRONG,
);
assert.match(READINESS_STRONG, /Final underwriting still decides/);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 20000,
    loanAmount: 830000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
  }).kind,
  "not_ready",
);
assert.match(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 20000,
    loanAmount: 830000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
  }).line,
  /Not ready yet — This loan is a large share of the price/,
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub"],
  }).kind,
  "not_ready",
);
const walkMissingStub = readinessFromFile({
  product: "buy",
  purposeHint: "purchase",
  occupancy: "primary",
  state: "CA",
  purchasePrice: 500000,
  downPayment: 20000,
  loanAmount: 480000,
  statedCreditBand: "760+",
  incomeType: "w2_base",
});
assert.equal(walkMissingStub.kind, "not_ready");
assert.match(
  walkMissingStub.line,
  /Not ready yet — A latest paystub and a W-2 are still missing\./,
);
assert.doesNotMatch(walkMissingStub.line, /Not enough yet to tell|large share of the price|you don’t qualify/i);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    incomeType: "w2_base",
  }).kind,
  "thin",
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    incomeType: "w2_base",
  }).kind,
  "thin",
);
assert.match(readinessFromFile({ unresolvedConflict: true }).line, /Not ready yet — The File has a conflict on this number\./);
assert.match(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    purchasePrice: 500000,
    loanAmount: 600000,
    commitmentRequired: true,
  }).line,
  /Not ready yet — The loan is larger than the purchase price\./,
);
assert.doesNotMatch(
  readinessFromFile({ askedWillIQualify: true }).line,
  /I can prepare a file\. I cannot approve or say you qualify/,
);
assert.doesNotMatch(READINESS_STRONG, /You are approved|This is locked|guaranteed|You qualify\b/);
assert.match(
  readinessFromFile({
    namedGovvie: true,
    govProgram: "fha",
    product: "buy",
    purposeHint: "purchase",
  }).line,
  /Not ready yet — That’s an FHA path\./,
);
assert.match(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 20000,
    loanAmount: 830000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    debts: [{ name: "the auto loan" }],
  }).line,
  /This loan is a large share of the price/,
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 20000,
    loanAmount: 830000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
  }).line,
  /Paying off/,
);

const afterIncomeType = draft({
  ...afterCredit,
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "w2" },
});
assert.equal(workspacePrompt(afterIncomeType), "other-reo");
assert.doesNotMatch(workspacePromptCopy("time-on-job", afterIncomeType).text, /other monthly debts/i);
const afterTimeOnJobAsk = draft({
  ...afterIncomeType,
  timeOnJobAsked: true,
});
assert.equal(workspacePrompt(afterTimeOnJobAsk), "other-reo");
assert.equal(workspacePromptCopy("debts", afterTimeOnJobAsk).text, MONTHLY_DEBTS_ASK);
assert.deepEqual(
  (workspacePromptCopy("debts", afterTimeOnJobAsk).actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
assert.equal(parseMonthlyDebtAmount("800"), 800);
assert.equal(parseMonthlyDebtAmount("$800"), 800);
assert.equal(parseMonthlyDebtAmount("about 800"), 800);
assert.equal(parseMonthlyDebtAmount("800 a month"), 800);
assert.equal(parseMonthlyDebtAmount("1200 including the mortgage"), 1200);
for (const spoken of ["800", "$800", "about 800", "800 a month"]) {
  const written = workspaceReply(spoken, onStep(afterTimeOnJobAsk, "debts"));
  assert.equal(written?.capture?.field, "statedMonthlyDebts");
  assert.doesNotMatch(written?.text ?? "", /Use this|Still right/i);
  assert.ok(!(written?.actions ?? []).some((item) => item.label === "Use this" || item.label === "Change"));
}
const debtConfirmDraft = {
  ...afterTimeOnJobAsk,
  pendingProposal: {
    field: "statedMonthlyDebts",
    value: "800",
    label: "Monthly debts",
    kind: "computed" as const,
    note: SUGGESTED_DEBTS_NOTE,
  },
};
const usedDebts = resolveProposal(debtConfirmDraft, "accept");
assert.equal(usedDebts.statedMonthlyDebts, 800);
assert.equal(usedDebts.monthlyDebtsAsked, true);
assert.equal(usedDebts.pendingProposal, null);
assert.ok(
  previewFacts(usedDebts).some(
    (fact) =>
      fact.id === "debts" &&
      fact.label === "Monthly debts" &&
      fact.value === "$800" &&
      fact.note === STATED_NOT_FROM_CREDIT,
  ),
);
const useDebts = workspaceReply("Use this", debtConfirmDraft);
assert.equal(useDebts?.capture?.field, "accept-proposal");
assert.match(useDebts?.text ?? "", /other real estate|Skip is fine/i);
const leaveBlankDebts = workspaceReply("Leave blank", debtConfirmDraft);
assert.equal(leaveBlankDebts?.capture?.field, "decline-proposal");
assert.match(leaveBlankDebts?.text ?? "", /Left that line blank|other real estate|Skip is fine/i);
assert.deepEqual(
  (leaveBlankDebts?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
assert.equal(resolveProposal(debtConfirmDraft, "decline").statedMonthlyDebts, undefined);
const skipDebts = workspaceReply("Skip", onStep(afterTimeOnJobAsk, "debts"));
assert.equal(skipDebts?.capture?.field, "skip-monthly-debts");
assert.equal(skipDebts?.text?.includes("other monthly debts"), false);
assert.match(skipDebts?.text ?? "", /other real estate|Skip is fine/i);
assert.deepEqual(
  (skipDebts?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const notYetDebts = workspaceReply("Not yet", onStep(afterTimeOnJobAsk, "debts"));
assert.equal(notYetDebts?.capture?.field, "skip-monthly-debts");
assert.ok(
  canLooksRight(
    readyForReview({ ...afterIncomeType, monthlyDebtsAsked: true, availableAssetsAsked: true, propertyTypeAsked: true, timeOnJobAsked: true, currentHousingAsked: true, declarationAsked: true, householdAsked: true, borrowerNameAsked: true, otherReoAsked: true }),
  ),
);
const skippedDebtFile = draft({
  ...afterIncomeType,
  monthlyDebtsAsked: true,
  availableAssetsAsked: true,
  propertyTypeAsked: true,
  timeOnJobAsked: true,
  currentHousingAsked: true,
  declarationAsked: true,
  householdAsked: true,
  borrowerNameAsked: true,
  otherReoAsked: true,
});
assert.equal(skippedDebtFile.statedMonthlyDebts, undefined);
assert.ok(
  previewFacts(skippedDebtFile).some(
    (fact) => fact.id === "debts" && fact.value === "—" && fact.note === STATED_NOT_FROM_CREDIT,
  ),
);
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("stated monthly debts"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedMonthlyDebts: 800,
  }).stillUseful.includes("stated monthly debts"),
);
const includeMortgage = workspaceReply("1200 including the mortgage", onStep({
  ...afterTimeOnJobAsk,
  facts: {
    current_pi: { field: "current_pi", value: "400", source: "document", confirmed: true },
  },
}, "debts"));
assert.equal(includeMortgage?.capture?.field, "include-mortgage-debts");
assert.match(includeMortgage?.text ?? "", /includes this mortgage/i);
assert.match(includeMortgage?.text ?? "", /\$400/);
assert.match(includeMortgage?.text ?? "", /\$800/);
assert.ok((includeMortgage?.actions ?? []).some((item) => item.label === "Subtract"));
assert.doesNotMatch(includeMortgage?.text ?? "", /I’ll use \$1,200|wrote \$1,200/i);
const subtractMortgage = workspaceReply("Subtract", onStep({
  ...afterTimeOnJobAsk,
  debtMortgageAsked: true,
  pendingDebtMortgage: { included: 1200, mortgage: 400 },
}, "debts"));
assert.equal(subtractMortgage?.capture?.field, "subtract-mortgage");
assert.doesNotMatch(subtractMortgage?.text ?? "", /Use this|Still right/i);
assert.match(subtractMortgage?.text ?? "", /available funds|kind of home|other real estate/i);
const debtsOnFile = draft({
  ...afterTimeOnJobAsk,
  monthlyDebtsAsked: true,
  statedMonthlyDebts: 800,
  correcting: "debts",
  correctingLine: "debts",
});
const debtsEditAsk = workspacePromptCopy("debts", debtsOnFile);
assert.equal(debtsEditAsk.text, MONTHLY_DEBTS_ASK);
assert.doesNotMatch(debtsEditAsk.text, /Still right/i);
const midDebtEdit = workspaceReply("900", debtsOnFile);
assert.equal(midDebtEdit?.capture?.field, "statedMonthlyDebts");
assert.doesNotMatch(midDebtEdit?.text ?? "", /Use this|Still right/i);
assert.equal(emptyDraft().statedMonthlyDebts, undefined);
assert.equal(emptyDraft().monthlyDebtsAsked, undefined);

const emptyDebtsQualify = workspaceReply("will i qualify", afterIncome);
assert.doesNotMatch(emptyDebtsQualify?.text ?? "", /\bDTI\b|stated DTI|your DTI is/i);
const eightHundredFile = draft({
  ...afterIncome,
  statedMonthlyDebts: 800,
  monthlyDebtsAsked: true,
  facts: {
    qualifying_income: {
      field: "qualifying_income",
      value: "9000",
      source: "suggested",
      confirmed: true,
    },
  },
});
const eightHundredQualify = workspaceReply("will i qualify", eightHundredFile);
assert.doesNotMatch(eightHundredQualify?.text ?? "", /\bDTI\b|stated DTI|your DTI is|\d+\s*%/i);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedMonthlyDebts: 800,
    suggestedMonthlyIncome: 9000,
  }).line,
  /\bDTI\b|stated DTI|your DTI is|\d+\s*%/,
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedMonthlyDebts: 800,
    suggestedMonthlyIncome: 9000,
  }).kind,
  "strong",
);
assert.match(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedMonthlyDebts: 800,
    suggestedMonthlyIncome: 9000,
  }).line,
  /Final underwriting still decides/,
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedMonthlyDebts: 8000,
    suggestedMonthlyIncome: 9000,
  }).kind,
  "not_ready",
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedMonthlyDebts: 8000,
    suggestedMonthlyIncome: 9000,
  }).line,
  /\bDTI\b|stated DTI|your DTI is|\d+\s*%/,
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub"],
    statedMonthlyDebts: 8000,
    suggestedMonthlyIncome: 9000,
  }).kind,
  "not_ready",
);

const afterDebtsAsk = draft({
  ...afterTimeOnJobAsk,
  monthlyDebtsAsked: true,
});
assert.equal(workspacePrompt(afterDebtsAsk), "other-reo");
assert.equal(workspacePromptCopy("assets", afterDebtsAsk).text, AVAILABLE_ASSETS_ASK);
assert.deepEqual(
  (workspacePromptCopy("assets", afterDebtsAsk).actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
assert.equal(parseAvailableAssetsAmount("50000"), 50000);
assert.equal(parseAvailableAssetsAmount("$50,000"), 50000);
assert.equal(parseAvailableAssetsAmount("50k"), 50000);
assert.equal(parseAvailableAssetsAmount("about 50k"), 50000);
for (const spoken of ["50000", "$50,000", "50k", "about 50k"]) {
  const written = workspaceReply(spoken, onStep(afterDebtsAsk, "assets"));
  assert.equal(written?.capture?.field, "statedAvailableAssets");
  assert.doesNotMatch(written?.text ?? "", /Use this|Still right/i);
  assert.ok(!(written?.actions ?? []).some((item) => item.label === "Use this" || item.label === "Change"));
}
const assetConfirmDraft = {
  ...afterDebtsAsk,
  pendingProposal: {
    field: "statedAvailableAssets",
    value: "50000",
    label: "Stated available assets",
    kind: "computed" as const,
    note: SUGGESTED_ASSETS_NOTE,
  },
};
const usedAssets = resolveProposal(assetConfirmDraft, "accept");
assert.equal(usedAssets.statedAvailableAssets, 50000);
assert.equal(usedAssets.availableAssetsAsked, true);
assert.ok(
  previewFacts(usedAssets).some(
    (fact) =>
      fact.id === "assets" &&
      fact.label === "Stated available assets" &&
      fact.value === "$50,000" &&
      fact.note === SUGGESTED_ASSETS_NOTE,
  ),
);
const leaveBlankAssets = workspaceReply("Leave blank", assetConfirmDraft);
assert.equal(leaveBlankAssets?.capture?.field, "decline-proposal");
assert.equal(resolveProposal(assetConfirmDraft, "decline").statedAvailableAssets, undefined);
assert.match(leaveBlankAssets?.text ?? "", /Left that line blank|other real estate|Skip is fine/i);
assert.deepEqual(
  (leaveBlankAssets?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skipAssets = workspaceReply("Skip", onStep(afterDebtsAsk, "assets"));
assert.equal(skipAssets?.capture?.field, "skip-available-assets");
assert.match(skipAssets?.text ?? "", /other real estate|Skip is fine/i);
assert.deepEqual(
  (skipAssets?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skippedAssetsFile = draft({ ...afterDebtsAsk, availableAssetsAsked: true });
assert.equal(skippedAssetsFile.statedAvailableAssets, undefined);
assert.ok(
  previewFacts(skippedAssetsFile).some(
    (fact) => fact.id === "assets" && fact.value === "—" && fact.note === SUGGESTED_ASSETS_NOTE,
  ),
);
const skipQualify = workspaceReply("will i qualify", skippedAssetsFile);
assert.doesNotMatch(skipQualify?.text ?? "", /\bDTI\b|months? reserves|you don.t qualify|N months/i);
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("stated available assets"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedAvailableAssets: 50000,
  }).stillUseful.includes("stated available assets"),
);

const tenKConfirm = {
  ...afterDebtsAsk,
  pendingProposal: {
    field: "statedAvailableAssets",
    value: "10000",
    label: "Stated available assets",
    kind: "computed" as const,
    note: SUGGESTED_ASSETS_NOTE,
  },
};
const tenKFile = resolveProposal(tenKConfirm, "accept");
assert.equal(tenKFile.statedAvailableAssets, 10000);
const fundsShortFile = draft({
  ...tenKFile,
  propertyValueAmount: 850000,
  downPaymentAmount: 170000,
  loanAmountValue: 680000,
});
const fundsShortAsk = workspaceReply("will i qualify", fundsShortFile);
assert.match(
  fundsShortAsk?.text ?? "",
  /Not ready yet —/,
);
assert.doesNotMatch(fundsShortAsk?.text ?? "", /you don.t qualify|months? reserves|stated DTI|\d+\s*%|you are approved/i);
assert.match(fundsShortAsk?.text ?? "", /paystub|W-2|available funds|Start with ID|Skip/i);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedAvailableAssets: 10000,
  }).kind,
  "not_ready",
);
assert.match(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedAvailableAssets: 10000,
  }).line,
  /Available funds look short of the \$170,000 down payment/,
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedAvailableAssets: 10000,
  }).line,
  /paystub|months?|you don.t qualify/,
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedAvailableAssets: 170000,
  }).kind,
  "strong",
);
assert.match(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedAvailableAssets: 170000,
  }).line,
  /Final underwriting still decides/,
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    statedAvailableAssets: 170000,
  }).line,
  /reserves are enough|N months|months? reserves/,
);
const assetsOnFile = draft({
  ...afterDebtsAsk,
  availableAssetsAsked: true,
  statedAvailableAssets: 50000,
  correcting: "assets",
  correctingLine: "assets",
});
assert.equal(workspacePromptCopy("assets", assetsOnFile).text, AVAILABLE_ASSETS_ASK);
assert.doesNotMatch(workspacePromptCopy("assets", assetsOnFile).text, /Still right/i);
const midAssetEdit = workspaceReply("60000", assetsOnFile);
assert.equal(midAssetEdit?.capture?.field, "statedAvailableAssets");
assert.doesNotMatch(midAssetEdit?.text ?? "", /Use this|Still right/i);
assert.equal(structureFixPrompt("assets"), "assets");
assert.equal(emptyDraft().statedAvailableAssets, undefined);

const typedThenExtract = applyExtractedFields(
  draft({ ...afterDebtsAsk, availableAssetsAsked: true, statedAvailableAssets: 10000 }),
  {
    extractClass: "bank_statement",
    confidence: 0.93,
    fields: {
      institution: "FIRST NATIONAL",
      period_end: "2026-07-31",
      ending_balance: "18400",
    },
  },
);
assert.equal(typedThenExtract.draft.statedAvailableAssets, 10000);
assert.equal(typedThenExtract.draft.pendingConflict?.field, "statedAvailableAssets");
assert.match(conflictAskCopy(typedThenExtract.draft.pendingConflict!), /\$18,400/);
assert.match(conflictAskCopy(typedThenExtract.draft.pendingConflict!), /\$10,000/);
assert.deepEqual(
  (workspacePromptCopy("confirm-proposal", typedThenExtract.draft).actions ?? []).map((item) => item.label),
  ["Keep the typed number", "Use document"],
);
const keptTyped = resolveFactConflict(typedThenExtract.draft, "file");
assert.equal(keptTyped.statedAvailableAssets, 10000);
const usedDocAssets = resolveFactConflict(typedThenExtract.draft, "document");
assert.equal(usedDocAssets.statedAvailableAssets, 18400);

const afterAssetsAsk = draft({
  ...afterDebtsAsk,
  availableAssetsAsked: true,
});
assert.equal(workspacePrompt(afterAssetsAsk), "other-reo");
assert.equal(workspacePromptCopy("property-type", afterAssetsAsk).text, PROPERTY_TYPE_ASK);
assert.deepEqual(
  (workspacePromptCopy("property-type", afterAssetsAsk).actions ?? []).map((item) => item.label),
  ["House", "Condo", "2–4", "Skip", "Not yet"],
);
assert.equal(parsePropertyType("single family"), "sfr");
assert.equal(parsePropertyType("sfr"), "sfr");
assert.equal(parsePropertyType("condo"), "condo");
assert.equal(parsePropertyType("duplex"), "two_to_four");
assert.equal(parsePropertyType("2 unit"), "two_to_four");
assert.equal(parsePropertyType("fourplex"), "two_to_four");
assert.equal(parsePropertyType("manufactured"), null);
assert.equal(parsePropertyType("coop"), null);
for (const spoken of ["Condo", "condo", "condominium"]) {
  const proposed = workspaceReply(spoken, onStep(afterAssetsAsk, "property-type"));
  assert.equal(proposed?.capture?.field, "propertyType");
  assert.equal(proposed?.text, OTHER_REO_ASK);
}
const houseProposed = workspaceReply("House", onStep(afterAssetsAsk, "property-type"));
assert.equal(houseProposed?.capture?.field, "propertyType");
assert.equal(houseProposed?.text, OTHER_REO_ASK);
const twoFourProposed = workspaceReply("2–4", onStep(afterAssetsAsk, "property-type"));
assert.equal(twoFourProposed?.capture?.field, "propertyType");
assert.equal(twoFourProposed?.text, OTHER_REO_ASK);
const condoConfirmDraft = {
  ...afterAssetsAsk,
  pendingProposal: {
    field: "propertyType",
    value: "condo",
    label: "Property type",
    kind: "computed" as const,
    note: SUGGESTED_PROPERTY_NOTE,
  },
};
const usedCondo = resolveProposal(condoConfirmDraft, "accept");
assert.equal(usedCondo.propertyType, "condo");
assert.equal(usedCondo.propertyTypeAsked, true);
assert.ok(
  previewFacts(usedCondo).some(
    (fact) =>
      fact.id === "property-type" &&
      fact.label === "Property type" &&
      fact.value === "Condo" &&
      fact.note === SUGGESTED_PROPERTY_NOTE,
  ),
);
const leaveBlankType = workspaceReply("Leave blank", condoConfirmDraft);
assert.equal(leaveBlankType?.capture?.field, "decline-proposal");
assert.equal(resolveProposal(condoConfirmDraft, "decline").propertyType, undefined);
assert.match(leaveBlankType?.text ?? "", /Left that line blank|other real estate|Skip is fine/i);
assert.deepEqual(
  (leaveBlankType?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skipType = workspaceReply("Skip", onStep(afterAssetsAsk, "property-type"));
assert.equal(skipType?.capture?.field, "skip-property-type");
assert.match(skipType?.text ?? "", /other real estate|Skip is fine/i);
assert.deepEqual(
  (skipType?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skippedTypeFile = draft({ ...afterAssetsAsk, propertyTypeAsked: true });
assert.equal(skippedTypeFile.propertyType, undefined);
assert.ok(
  previewFacts(skippedTypeFile).some(
    (fact) => fact.id === "property-type" && fact.value === "—" && fact.note === SUGGESTED_PROPERTY_NOTE,
  ),
);
const skipTypeQualify = workspaceReply("will i qualify", skippedTypeFile);
assert.doesNotMatch(
  skipTypeQualify?.text ?? "",
  /warrantability|county limit|condos are not eligible|you don.t qualify|you are approved|\bDTI\b/i,
);
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("property type"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    propertyType: "sfr",
  }).stillUseful.includes("property type"),
);

const valenciaExtract = applyExtractedFields(afterLooks, {
  extractClass: "purchase_contract",
  confidence: 0.93,
  fields: {
    property_address: "1840 Valencia St",
    purchase_price: "1200000",
  },
});
assert.equal(valenciaExtract.draft.subjectAddress, undefined);
assert.equal(valenciaExtract.draft.facts?.property_address, undefined);
assert.equal(valenciaExtract.draft.pendingProposal?.field, "property_address");
assert.equal(valenciaExtract.draft.pendingProposal?.value, "1840 Valencia St");
assert.equal(
  nextFoxAsk(valenciaExtract.draft).text,
  "The contract shows 1840 Valencia St. Suggested · not underwritten. Use this?",
);
assert.ok((nextFoxAsk(valenciaExtract.draft).actions ?? []).some((item) => item.label === "Use this"));
assert.ok((nextFoxAsk(valenciaExtract.draft).actions ?? []).some((item) => item.label === "Change"));
assert.doesNotMatch(nextFoxAsk(valenciaExtract.draft).text, /questionnaire|warrantability|HOA|county limit/i);
const valenciaAccepted = resolveProposal(valenciaExtract.draft, "accept");
assert.equal(valenciaAccepted.subjectAddress, "1840 Valencia St");
assert.equal(valenciaAccepted.facts?.property_address?.value, "1840 Valencia St");
assert.equal(valenciaAccepted.pendingProposal, null);

const valenciaPriceConflict = applyExtractedFields(
  draft({
    ...afterLooks,
    propertyValueAmount: 850000,
    downPaymentAmount: 170000,
    loanAmountValue: 680000,
  }),
  {
    extractClass: "purchase_contract",
    confidence: 0.93,
    fields: {
      property_address: "1840 Valencia St",
      purchase_price: "1200000",
    },
  },
);
assert.equal(valenciaPriceConflict.conflict?.field, "purchase_price");
assert.equal(valenciaPriceConflict.draft.propertyValueAmount, 850000);
assert.equal(valenciaPriceConflict.draft.subjectAddress, undefined);
assert.doesNotMatch(conflictAskCopy(valenciaPriceConflict.conflict!), /questionnaire|warrantability/i);

const typedThenAddress = applyExtractedFields(
  draft({ ...afterLooks, subjectAddress: "10 Main St" }),
  {
    extractClass: "purchase_contract",
    confidence: 0.93,
    fields: { property_address: "1840 Valencia St" },
  },
);
assert.equal(typedThenAddress.draft.subjectAddress, "10 Main St");
assert.equal(typedThenAddress.draft.pendingConflict?.field, "property_address");
assert.deepEqual(
  (workspacePromptCopy("confirm-proposal", typedThenAddress.draft).actions ?? []).map((item) => item.label),
  ["Keep the typed one", "Use document"],
);
assert.equal(resolveFactConflict(typedThenAddress.draft, "file").subjectAddress, "10 Main St");
assert.equal(resolveFactConflict(typedThenAddress.draft, "document").subjectAddress, "1840 Valencia St");

const volunteerAddress = workspaceReply("the address is 1840 Valencia", skippedTypeFile);
assert.equal(volunteerAddress?.capture?.field, "propose-subject-address");
assert.match(volunteerAddress?.text ?? "", /That’s 1840 Valencia/);
assert.match(volunteerAddress?.text ?? "", /Suggested · not underwritten/);

const condoFile = draft({ ...usedCondo, propertyTypeAsked: true, propertyType: "condo" });
const condoQualify = workspaceReply("will i qualify", condoFile);
assert.match(condoQualify?.text ?? "", /This file is still thin\.|Not ready yet —/);
assert.doesNotMatch(
  condoQualify?.text ?? "",
  /you don.t qualify|warrantability|county limit|condos are not eligible|you are approved|\bDTI\b|you qualify\b/i,
);
assert.match(condoQualify?.text ?? "", /thin|Start with ID|Skip|kind of home/i);
assert.doesNotMatch(
  condoQualify?.text ?? "",
  /HOA questionnaire|condo project docs|Form 1076|\bCPM\b|\bPERS\b/i,
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "condo",
  }).kind,
  "thin",
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
  }).line,
  /warrantability|county limit|underwriting before we go further/,
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
  }).kind,
  "strong",
);
const midTypeEdit = draft({
  ...afterAssetsAsk,
  propertyTypeAsked: true,
  propertyType: "condo",
  correcting: "property-type",
  correctingLine: "property-type",
});
assert.equal(workspacePromptCopy("property-type", midTypeEdit).text, PROPERTY_TYPE_ASK);
assert.doesNotMatch(workspacePromptCopy("property-type", midTypeEdit).text, /Still right/i);
const midHouse = workspaceReply("House", midTypeEdit);
assert.equal(midHouse?.capture?.field, "propertyType");
assert.equal(midHouse?.text, OTHER_REO_ASK);
assert.equal(emptyDraft().propertyType, undefined);
assert.equal(structureFixPrompt("property-type"), "property-type");

const propertySrc = [
  readFileSync(join(root, "components/fox/propertyType.ts"), "utf8"),
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
].join("\n");
assert.doesNotMatch(propertySrc, /condo questionnaire|warrantability engine|HOA dues line|PropertyRadar/i);
assert.doesNotMatch(READINESS_UW_REVIEW, /warrantability|county limit|condos are not eligible/i);

const afterTypeAsk = draft({
  ...afterAssetsAsk,
  propertyTypeAsked: true,
  propertyType: "sfr",
});
assert.equal(workspacePrompt(afterTypeAsk), "other-reo");
assert.equal(workspacePrompt(afterIncomeType), "other-reo");
assert.equal(workspacePromptCopy("time-on-job", afterIncomeType).text, TIME_ON_JOB_ASK);
assert.deepEqual(
  (workspacePromptCopy("time-on-job", afterIncomeType).actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
assert.equal(parseTimeOnJobMonths("3"), 3);
assert.equal(parseTimeOnJobMonths("3 years"), 36);
assert.equal(parseTimeOnJobMonths("18 months"), 18);
assert.equal(parseTimeOnJobMonths("6 months"), 6);
assert.ok((parseTimeOnJobMonths("since 2021") ?? 0) > 24);
assert.equal(parseTimeOnJobMonths("about 2 years"), 24);
assert.equal(displayTimeOnJob(36), "3 years");
assert.equal(displayTimeOnJob(6), "6 months");
assert.equal(parseHireDate("March 2023")?.label, "March 2023");
assert.equal(
  workspacePrompt(
    draft({
      ...afterAssetsAsk,
      incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
      propertyTypeAsked: true,
    }),
  ),
  "other-reo",
);
const seAfterType = draft({
  ...afterAssetsAsk,
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
  propertyTypeAsked: true,
  yearsInBusinessAsked: true,
});
assert.equal(workspacePrompt(seAfterType), "other-reo");
assert.doesNotMatch(workspacePromptCopy("current-housing", seAfterType).text, /How long have you been at this job/);
const typedThree = workspaceReply("3", onStep(afterIncomeType, "time-on-job"));
assert.equal(typedThree?.capture?.field, "statedTimeOnJob");
assert.doesNotMatch(typedThree?.text ?? "", /Use this|Still right|3 years/i);
assert.ok(!(typedThree?.actions ?? []).some((item) => item.label === "Use this" || item.label === "Change"));
const writtenThree = writeStatedTimeOnJob(afterIncomeType, 3, "3");
assert.equal(writtenThree.statedTimeOnJob, 3);
assert.equal(writtenThree.statedTimeOnJobLabel, "3");
assert.ok(
  previewFacts(writtenThree).some(
    (fact) => fact.id === "time-on-job" && fact.value === "3",
  ),
);
const typedThreeYears = workspaceReply("3 years", onStep(afterIncomeType, "time-on-job"));
assert.equal(typedThreeYears?.capture?.field, "statedTimeOnJob");
assert.doesNotMatch(typedThreeYears?.text ?? "", /Use this|Still right/i);
const writtenThreeYears = writeStatedTimeOnJob(afterIncomeType, 36, "3 years");
assert.equal(writtenThreeYears.statedTimeOnJob, 36);
assert.equal(writtenThreeYears.statedTimeOnJobLabel, "3 years");
assert.ok(
  previewFacts(writtenThreeYears).some(
    (fact) => fact.id === "time-on-job" && fact.value === "3 years",
  ),
);
const monthsProposed = workspaceReply("6 months", onStep(afterIncomeType, "time-on-job"));
assert.equal(monthsProposed?.capture?.field, "statedTimeOnJob");
assert.doesNotMatch(monthsProposed?.text ?? "", /Use this|Still right/i);
const yearsConfirmDraft = {
  ...afterIncomeType,
  pendingProposal: {
    field: "statedTimeOnJob",
    value: "36",
    label: "Time on job",
    kind: "computed" as const,
    note: SUGGESTED_TIME_ON_JOB_NOTE,
  },
};
const usedYears = resolveProposal(yearsConfirmDraft, "accept");
assert.equal(usedYears.statedTimeOnJob, 36);
assert.equal(usedYears.timeOnJobAsked, true);
assert.ok(
  previewFacts(usedYears).some(
    (fact) =>
      fact.id === "time-on-job" &&
      fact.label === "Time on job" &&
      fact.value === "3 years" &&
      fact.note === SUGGESTED_TIME_ON_JOB_NOTE,
  ),
);
const leaveBlankJob = workspaceReply("Leave blank", yearsConfirmDraft);
assert.equal(leaveBlankJob?.capture?.field, "decline-proposal");
assert.equal(resolveProposal(yearsConfirmDraft, "decline").statedTimeOnJob, undefined);
assert.match(leaveBlankJob?.text ?? "", /Left that line blank|other real estate|Skip is fine/i);
assert.deepEqual(
  (leaveBlankJob?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skipJob = workspaceReply("Skip", onStep(afterIncomeType, "time-on-job"));
assert.equal(skipJob?.capture?.field, "skip-time-on-job");
assert.match(skipJob?.text ?? "", /other real estate|Skip is fine/i);
assert.deepEqual(
  (skipJob?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skippedJobFile = draft({ ...afterTypeAsk, timeOnJobAsked: true });
assert.equal(skippedJobFile.statedTimeOnJob, undefined);
assert.ok(
  previewFacts(skippedJobFile).some(
    (fact) => fact.id === "time-on-job" && fact.value === "—" && fact.note === SUGGESTED_TIME_ON_JOB_NOTE,
  ),
);
const skipJobQualify = workspaceReply("will i qualify", skippedJobFile);
assert.doesNotMatch(
  skipJobQualify?.text ?? "",
  /you don.t qualify|you need two years|VOE|verification of employment|you are approved|\bDTI\b|start date/i,
);
assert.doesNotMatch(skipJobQualify?.text ?? "", /I can run this past underwriting before we go further/);
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("time on job"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedTimeOnJob: 36,
  }).stillUseful.includes("time on job"),
);
assert.ok(
  !storeCompleteness("buy", { purposeHint: "purchase", incomeType: "se_schedule_c" }).stillUseful.includes("time on job"),
);
assert.ok(
  !documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
  }).includes("time on job" as never),
);

const hireDateFacts = { ...(afterLooks.facts ?? {}) };
delete hireDateFacts.qualifying_income;
delete hireDateFacts.statedTimeOnJob;
delete hireDateFacts.hire_date;
const hireDateBase = draft({
  ...afterLooks,
  facts: hireDateFacts,
  pendingProposal: null,
  pendingConflict: null,
  pendingHireDate: null,
  statedTimeOnJob: undefined,
  timeOnJobAsked: true,
  awaitingPayFrequency: false,
});
const hireDateWrite = applyExtractedFields(hireDateBase, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: {
    employer_name: "Acme",
    pay_period_end: "2026-07-31",
    pay_frequency: "biweekly",
    gross_period: "4230.77",
    ytd_gross: "67692.32",
    hire_date: "March 2023",
  },
});
assert.equal(hireDateWrite.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(hireDateWrite.draft.statedTimeOnJob, undefined);
assert.equal(hireDateWrite.draft.facts?.hire_date, undefined);
assert.equal(hireDateWrite.draft.pendingHireDate?.label, "March 2023");
assert.ok((hireDateWrite.draft.pendingHireDate?.months ?? 0) >= 36);
const afterIncomeUse = resolveProposal(hireDateWrite.draft, "accept");
assert.equal(afterIncomeUse.pendingProposal?.field, "statedTimeOnJob");
assert.equal(afterIncomeUse.pendingProposal?.hireLabel, "March 2023");
assert.equal(afterIncomeUse.statedTimeOnJob, undefined);
assert.match(
  proposalAskCopy(afterIncomeUse.pendingProposal!),
  /The paystub shows a hire date of March 2023\. That’s about 3 years\. Suggested · not underwritten\. Use this\?/,
);
const hired = resolveProposal(afterIncomeUse, "accept");
assert.equal(hired.statedTimeOnJob, hireDateWrite.draft.pendingHireDate?.months);
assert.equal(hired.pendingProposal, null);
const noHireOnPage = printedSampleFromBytes(readFileSync(join(root, "scripts/fixtures/paystub-acme.png")));
assert.equal(noHireOnPage?.extractClass, "paystub");
assert.equal(noHireOnPage?.fields.hire_date, undefined);
const hireOnPage = printedSampleFromBytes(
  readFileSync(join(root, "scripts/fixtures/paystub-hire-march-2023.png")),
);
assert.equal(hireOnPage?.extractClass, "paystub");
assert.match(hireOnPage?.fields.hire_date ?? "", /MARCH 2023/i);

const typedThenHire = applyExtractedFields(
  draft({ ...afterTypeAsk, timeOnJobAsked: true, statedTimeOnJob: 36 }),
  {
    extractClass: "paystub",
    confidence: 0.94,
    fields: {
      employer_name: "Acme",
      hire_date: "March 2023",
    },
  },
);
assert.equal(typedThenHire.draft.statedTimeOnJob, 36);
assert.equal(typedThenHire.draft.pendingConflict?.field, "statedTimeOnJob");
assert.deepEqual(
  (workspacePromptCopy("confirm-proposal", typedThenHire.draft).actions ?? []).map((item) => item.label),
  ["Keep the typed one", "Use document"],
);
assert.equal(resolveFactConflict(typedThenHire.draft, "file").statedTimeOnJob, 36);
assert.equal(
  resolveFactConflict(typedThenHire.draft, "document").statedTimeOnJob,
  Number(typedThenHire.draft.pendingConflict?.documentValue),
);

const sixMonthsFile = draft({
  ...afterTypeAsk,
  timeOnJobAsked: true,
  statedTimeOnJob: 6,
  propertyType: "sfr",
});
const sixQualify = workspaceReply("will i qualify", sixMonthsFile);
assert.match(sixQualify?.text ?? "", /Not ready yet —|This file is still thin\./);
assert.doesNotMatch(
  sixQualify?.text ?? "",
  /you don.t qualify|you need two years|VOE|verification of employment|you are approved|\bDTI\b|you qualify\b/i,
);
assert.match(sixQualify?.text ?? "", /Start with ID|Skip|How long have you been at this job|paystub|W-2|thin/i);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    statedTimeOnJob: 6,
  }).kind,
  "not_ready",
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "condo",
    statedTimeOnJob: 6,
  }).reason,
  "condo-needs-review",
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    statedTimeOnJob: 24,
  }).kind,
  "strong",
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    propertyType: "sfr",
    statedTimeOnJob: 36,
  }).line,
  /seasoned|two years of employment|verification of employment/i,
);
const midJobEdit = draft({
  ...afterTypeAsk,
  timeOnJobAsked: true,
  statedTimeOnJob: 36,
  correcting: "time-on-job",
  correctingLine: "time-on-job",
});
assert.equal(workspacePromptCopy("time-on-job", midJobEdit).text, TIME_ON_JOB_ASK);
assert.doesNotMatch(workspacePromptCopy("time-on-job", midJobEdit).text, /Still right/i);
const midSix = workspaceReply("6 months", midJobEdit);
assert.equal(midSix?.capture?.field, "statedTimeOnJob");
assert.doesNotMatch(midSix?.text ?? "", /Use this|Still right/i);
assert.equal(emptyDraft().statedTimeOnJob, undefined);
assert.equal(structureFixPrompt("time-on-job"), "time-on-job");

const jobSrc = [
  readFileSync(join(root, "components/fox/timeOnJob.ts"), "utf8"),
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
].join("\n");
assert.doesNotMatch(jobSrc, /employment-history maze|prior-job form|add-another-job|gap quiz|verification of employment|\bVOE\b/i);
assert.doesNotMatch(jobSrc, /you need two years|you don.t qualify/i);

const afterJobAsk = draft({
  ...afterTypeAsk,
  timeOnJobAsked: true,
});
assert.equal(workspacePrompt(afterJobAsk), "other-reo");
assert.equal(workspacePromptCopy("current-housing", afterJobAsk).text, CURRENT_HOUSING_ASK);
assert.deepEqual(
  (workspacePromptCopy("current-housing", afterJobAsk).actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
assert.equal(parseCurrentHousingAmount("2200"), 2200);
assert.equal(parseCurrentHousingAmount("$2,200"), 2200);
assert.equal(parseCurrentHousingAmount("about 2200"), 2200);
const refiAfterJob = draft({
  ...afterJobAsk,
  productIntent: "refinance",
  cashOut: false,
});
assert.equal(workspacePrompt(refiAfterJob), "other-reo");
assert.doesNotMatch(workspacePromptCopy("documents", refiAfterJob).text, /pay now for housing/);
for (const spoken of ["2200", "$2,200", "about 2200"]) {
  const written = workspaceReply(spoken, onStep(afterJobAsk, "current-housing"));
  assert.equal(written?.capture?.field, "statedCurrentHousing");
  assert.doesNotMatch(written?.text ?? "", /Use this|Still right/i);
  assert.ok(!(written?.actions ?? []).some((item) => item.label === "Use this" || item.label === "Change"));
}
const housingConfirmDraft = {
  ...afterJobAsk,
  pendingProposal: {
    field: "statedCurrentHousing",
    value: "2200",
    label: "Current housing",
    kind: "computed" as const,
    note: SUGGESTED_HOUSING_NOTE,
  },
};
const usedHousing = resolveProposal(housingConfirmDraft, "accept");
assert.equal(usedHousing.statedCurrentHousing, 2200);
assert.equal(usedHousing.currentHousingAsked, true);
assert.ok(
  previewFacts(usedHousing).some(
    (fact) =>
      fact.id === "current-housing" &&
      fact.label === "Current housing" &&
      fact.value === "$2,200" &&
      fact.note === SUGGESTED_HOUSING_NOTE,
  ),
);
const leaveBlankHousing = workspaceReply("Leave blank", housingConfirmDraft);
assert.equal(leaveBlankHousing?.capture?.field, "decline-proposal");
assert.equal(resolveProposal(housingConfirmDraft, "decline").statedCurrentHousing, undefined);
assert.match(leaveBlankHousing?.text ?? "", /Left that line blank|other real estate|Skip is fine/i);
assert.deepEqual(
  (leaveBlankHousing?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skipHousing = workspaceReply("Skip", onStep(afterJobAsk, "current-housing"));
assert.equal(skipHousing?.capture?.field, "skip-current-housing");
assert.match(skipHousing?.text ?? "", /other real estate|Skip is fine/i);
assert.deepEqual(
  (skipHousing?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skippedHousingFile = draft({ ...afterJobAsk, currentHousingAsked: true });
assert.equal(skippedHousingFile.statedCurrentHousing, undefined);
assert.ok(
  previewFacts(skippedHousingFile).some(
    (fact) => fact.id === "current-housing" && fact.value === "—" && fact.note === SUGGESTED_HOUSING_NOTE,
  ),
);
const skipHousingQualify = workspaceReply("will i qualify", skippedHousingFile);
assert.doesNotMatch(
  skipHousingQualify?.text ?? "",
  /you don.t qualify|payment shock|shock percent|you are approved|\bDTI\b/i,
);
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("current housing"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedCurrentHousing: 2200,
  }).stillUseful.includes("current housing"),
);
assert.ok(
  !documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
  }).includes("current housing" as never),
);

const housingOnPage = applyExtractedFields(
  draft({
    ...afterLooks,
    productIntent: "refinance",
    cashOut: false,
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    facts: {},
    pendingProposal: null,
    statedCurrentHousing: undefined,
    statedMonthlyDebts: undefined,
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "OAK SERVICING",
      unpaid_principal: "960000",
      current_pi: "3400",
      property_address: "14 OAK STREET",
    },
  },
);
assert.equal(housingOnPage.draft.statedCurrentHousing, undefined);
assert.equal(housingOnPage.draft.facts?.current_pi, undefined);
assert.equal(housingOnPage.draft.pendingProposal?.field, "statedCurrentHousing");
assert.match(
  nextFoxAsk(housingOnPage.draft).text,
  /The statement shows a current payment of about \$3,400\. Suggested · not underwritten\. Use this\?/,
);
const usedStatementPay = resolveProposal(housingOnPage.draft, "accept");
assert.equal(usedStatementPay.statedCurrentHousing, 3400);
assert.equal(usedStatementPay.facts?.current_pi?.value, "3400");
assert.equal(usedStatementPay.facts?.servicer?.value, "OAK SERVICING");
assert.equal(usedStatementPay.loanAmountValue, 960_000);
assert.equal(usedStatementPay.statedMonthlyDebts, undefined);
assert.equal(subjectMortgagePayment(usedStatementPay), 3400);
const noPaymentOnPage = applyExtractedFields(
  draft({
    ...afterLooks,
    productIntent: "refinance",
    cashOut: false,
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    facts: {},
    pendingProposal: null,
    statedCurrentHousing: undefined,
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "OAK SERVICING",
      unpaid_principal: "960000",
      property_address: "14 OAK STREET",
    },
  },
);
assert.equal(noPaymentOnPage.draft.statedCurrentHousing, undefined);
assert.equal(noPaymentOnPage.draft.facts?.current_pi, undefined);
assert.notEqual(noPaymentOnPage.draft.pendingProposal?.field, "statedCurrentHousing");
assert.match(nextFoxAsk(noPaymentOnPage.draft).text, /OAK SERVICING/);
assert.doesNotMatch(nextFoxAsk(noPaymentOnPage.draft).text, /current payment of about/);
const noPayAccepted = resolveProposal(noPaymentOnPage.draft, "accept");
assert.equal(noPayAccepted.statedCurrentHousing, undefined);
assert.equal(noPayAccepted.facts?.current_pi, undefined);
assert.equal(noPayAccepted.loanAmountValue, 960_000);
assert.equal(noPayAccepted.facts?.servicer?.value, "OAK SERVICING");

const housingQualifyFile = draft({
  ...afterJobAsk,
  currentHousingAsked: true,
  statedCurrentHousing: 2200,
  propertyType: "sfr",
});
const housingQualify = workspaceReply("will i qualify", housingQualifyFile);
assert.doesNotMatch(
  housingQualify?.text ?? "",
  /you don.t qualify|payment shock|shock percent|you are approved|\bDTI\b|you qualify\b/i,
);
assert.match(housingQualify?.text ?? "", /paystub|W-2|notepad|Start with ID|Skip/i);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    statedCurrentHousing: 2200,
  }).kind,
  "strong",
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    propertyType: "sfr",
    statedCurrentHousing: 2200,
  }).line,
  /payment shock|affordable|PITI/,
);
const midHousingEdit = draft({
  ...afterJobAsk,
  currentHousingAsked: true,
  statedCurrentHousing: 2200,
  correcting: "current-housing",
  correctingLine: "current-housing",
});
assert.equal(workspacePromptCopy("current-housing", midHousingEdit).text, CURRENT_HOUSING_ASK);
assert.doesNotMatch(workspacePromptCopy("current-housing", midHousingEdit).text, /Still right/i);
const midHousing = workspaceReply("2800", midHousingEdit);
assert.equal(midHousing?.capture?.field, "statedCurrentHousing");
assert.doesNotMatch(midHousing?.text ?? "", /Use this|Still right/i);
assert.equal(emptyDraft().statedCurrentHousing, undefined);
assert.equal(structureFixPrompt("current-housing"), "current-housing");

const housingSrc = [
  readFileSync(join(root, "components/fox/currentHousing.ts"), "utf8"),
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
].join("\n");
assert.doesNotMatch(housingSrc, /landlord maze|lease term|own-vs-rent form|HOA add-on|payment-shock worksheet/i);
assert.doesNotMatch(housingSrc, /payment shock is|you don.t qualify/i);

const afterHousingAsk = draft({
  ...afterJobAsk,
  currentHousingAsked: true,
  propertyType: "sfr",
  propertyTypeAsked: true,
});
assert.equal(workspacePrompt(afterHousingAsk), "other-reo");
assert.equal(workspacePromptCopy("declarations", afterHousingAsk).text, DECLARATIONS_ASK);
assert.deepEqual(
  (workspacePromptCopy("declarations", afterHousingAsk).actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
assert.equal(parseDeclarations("no"), "none");
assert.equal(parseDeclarations("none"), "none");
assert.equal(parseDeclarations("bk in 2018"), "event");
assert.equal(parseDeclarations("I had a foreclosure"), "event");
assert.equal(parseDeclarations("yes"), undefined);
assert.equal(parseDeclarations("yes", { allowBareYes: true }), "event");

const skipDeclarationsReply = workspaceReply("Skip", onStep(afterHousingAsk, "declarations"));
assert.equal(skipDeclarationsReply?.capture?.field, "skip-declarations");
assert.equal(skipDeclarationsReply?.text, OTHER_REO_ASK);
assert.deepEqual(
  (skipDeclarationsReply?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const skippedDeclarationsFile = draft({ ...afterHousingAsk, declarationAsked: true });
assert.equal(skippedDeclarationsFile.statedDeclaration, undefined);
assert.ok(
  previewFacts(skippedDeclarationsFile).some(
    (fact) => fact.id === "declarations" && fact.value === "—" && fact.note === SUGGESTED_DECLARATION_NOTE,
  ),
);
const skipDeclarationsQualify = workspaceReply("will i qualify", skippedDeclarationsFile);
assert.doesNotMatch(
  skipDeclarationsQualify?.text ?? "",
  /you don.t qualify|waiting period|7-year|ineligible for conventional|you are approved|\bDTI\b|I can run this past underwriting/i,
);
assert.match(skipDeclarationsQualify?.text ?? "", /paystub|W-2|notepad|Start with ID|Skip/i);
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("declarations"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedDeclaration: "none",
  }).stillUseful.includes("declarations"),
);
assert.ok(
  !documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
  }).includes("declarations" as never),
);

const noneChip = workspaceReply("None", onStep(afterHousingAsk, "declarations"));
assert.equal(noneChip?.capture?.field, "statedDeclaration");
assert.equal(noneChip?.text, OTHER_REO_ASK);
const noneConfirmDraft = {
  ...afterHousingAsk,
  pendingProposal: {
    field: "statedDeclaration",
    value: "none",
    label: "Declarations",
    kind: "computed" as const,
    note: SUGGESTED_DECLARATION_NOTE,
  },
};
const usedNone = resolveProposal(noneConfirmDraft, "accept");
assert.equal(usedNone.statedDeclaration, "none");
assert.equal(usedNone.declarationAsked, true);
assert.equal(usedNone.creditEvent, undefined);
assert.ok(
  previewFacts(usedNone).some(
    (fact) =>
      fact.id === "declarations" &&
      fact.label === "Declarations" &&
      fact.value === "None" &&
      fact.note === SUGGESTED_DECLARATION_NOTE,
  ),
);
const noneQualify = workspaceReply("will i qualify", usedNone);
assert.doesNotMatch(
  noneQualify?.text ?? "",
  /credit is clean|bureau pull|you don.t qualify|waiting period|you are approved/i,
);
assert.match(noneQualify?.text ?? "", /paystub|W-2|notepad|Start with ID|Skip/i);

const yesChip = workspaceReply("Yes", onStep(afterHousingAsk, "declarations"));
assert.equal(yesChip?.capture?.field, "statedDeclaration");
assert.equal(yesChip?.text, DECLARATION_TIMING_ASK);
assert.ok(!(yesChip?.actions ?? []).some((item) => item.label === "Use this" || item.label === "Still right"));
assert.doesNotMatch(yesChip?.text ?? "", /waiting period|7-year|you don.t qualify|ineligible/i);
assert.deepEqual(
  (yesChip?.actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
const timingReply = workspaceReply("March 2021", draft({
  ...afterHousingAsk,
  declarationAsked: true,
  statedDeclaration: "event",
}));
assert.equal(timingReply?.capture?.field, "declarationTiming");
assert.equal(timingReply?.capture && "value" in timingReply.capture ? timingReply.capture.value : "", "March 2021");
assert.doesNotMatch(timingReply?.text ?? "", /waiting period|7-year|you don.t qualify|Use this|Still right/i);
assert.equal(
  draft({
    ...afterHousingAsk,
    declarationAsked: true,
    statedDeclaration: "event",
    declarationTiming: "March 2021",
  }).declarationTiming,
  "March 2021",
);
assert.ok(
  previewFacts(
    draft({
      ...afterHousingAsk,
      declarationAsked: true,
      statedDeclaration: "event",
      declarationTiming: "2019",
    }),
  ).some((fact) => fact.id === "declarations" && /2019/.test(fact.value)),
);
assert.equal(parseDeclarationTiming("about 4 years"), "about 4 years");
assert.equal(parseDeclarationTiming("2019"), "2019");
const eventConfirmDraft = {
  ...afterHousingAsk,
  pendingProposal: {
    field: "statedDeclaration",
    value: "event",
    label: "Declarations",
    kind: "computed" as const,
    note: SUGGESTED_DECLARATION_NOTE,
  },
};
const leaveBlankEvent = workspaceReply("Leave blank", eventConfirmDraft);
assert.equal(leaveBlankEvent?.capture?.field, "decline-proposal");
assert.equal(resolveProposal(eventConfirmDraft, "decline").statedDeclaration, undefined);
assert.match(leaveBlankEvent?.text ?? "", /Left that line blank|other real estate|Skip is fine/i);
assert.deepEqual(
  (leaveBlankEvent?.actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
const usedEvent = resolveProposal(eventConfirmDraft, "accept");
assert.equal(usedEvent.statedDeclaration, "event");
assert.equal(usedEvent.declarationAsked, true);
assert.ok(
  previewFacts(usedEvent).some(
    (fact) =>
      fact.id === "declarations" &&
      fact.value === "Something to review" &&
      fact.note === SUGGESTED_DECLARATION_NOTE,
  ),
);
const eventQualify = workspaceReply("will i qualify", usedEvent);
assert.match(eventQualify?.text ?? "", /Not ready yet —|This file is still thin\./);
assert.doesNotMatch(
  eventQualify?.text ?? "",
  /you don.t qualify|waiting period|7-year|ineligible for conventional|you are approved|\bDTI\b|you qualify\b/i,
);
assert.match(eventQualify?.text ?? "", /Start with ID|Skip|Pricing waits|thin|paystub/i);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    namedDistress: true,
    statedDeclaration: "event",
  }).kind,
  "not_ready",
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    statedDeclaration: "none",
  }).kind,
  "strong",
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    statedDeclaration: "event",
    namedDistress: true,
  }).line,
  /waiting period|7-year|chapter|you don.t qualify|ineligible/,
);

const typedForeclosure = workspaceReply("I had a foreclosure", afterHousingAsk);
assert.equal(typedForeclosure?.capture?.field, "statedDeclaration");
assert.equal(typedForeclosure?.text, DECLARATION_TIMING_ASK);
assert.doesNotMatch(typedForeclosure?.text ?? "", /chapter|discharged|dismissed|2018|form|waiting period|you don.t qualify/i);
assert.equal(afterHousingAsk.statedDeclaration, undefined);
assert.equal(afterHousingAsk.creditEvent, undefined);

const midDeclarationsEdit = draft({
  ...afterHousingAsk,
  declarationAsked: true,
  statedDeclaration: "event",
  creditEvent: "foreclosure",
  correcting: "declarations",
  correctingLine: "declarations",
});
assert.equal(workspacePromptCopy("declarations", midDeclarationsEdit).text, DECLARATIONS_ASK);
assert.doesNotMatch(workspacePromptCopy("declarations", midDeclarationsEdit).text, /Still right/i);
const midNone = workspaceReply("None", midDeclarationsEdit);
assert.equal(midNone?.capture?.field, "statedDeclaration");
assert.equal(midNone?.text, OTHER_REO_ASK);
const midNoneWritten = resolveProposal(
  {
    ...midDeclarationsEdit,
    pendingProposal: {
      field: "statedDeclaration",
      value: "none",
      label: "Declarations",
      kind: "computed" as const,
      note: SUGGESTED_DECLARATION_NOTE,
    },
  },
  "accept",
);
assert.equal(midNoneWritten.statedDeclaration, "none");
assert.equal(midNoneWritten.creditEvent, undefined);
assert.equal(emptyDraft().statedDeclaration, undefined);
assert.equal(structureFixPrompt("declarations"), "declarations");

const declarationsSrc = [
  readFileSync(join(root, "components/fox/declarations.ts"), "utf8"),
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
].join("\n");
assert.doesNotMatch(declarationsSrc, /1003 declarations maze|citizenship quiz|lawsuit form|alimony form|child-support form|co-signer maze/i);
assert.doesNotMatch(declarationsSrc, /waiting period|7-year clock|you are ineligible for conventional|you don.t qualify/i);

const afterDeclarationsAsk = draft({
  ...afterHousingAsk,
  declarationAsked: true,
  statedDeclaration: "none",
  propertyType: "sfr",
  propertyTypeAsked: true,
});
assert.equal(workspacePrompt(afterDeclarationsAsk), "other-reo");
assert.doesNotMatch(
  `${workspacePromptCopy(workspacePrompt(afterDeclarationsAsk), afterDeclarationsAsk).text} ${workspacePromptCopy(workspacePrompt(afterDeclarationsAsk), afterDeclarationsAsk).followUp ?? ""}`,
  /on your own|with someone|another borrower|What name should I put/i,
);
assert.equal(parseHousehold("just me"), "alone");
assert.equal(parseHousehold("me and my spouse"), "with_someone");
assert.equal(parseHousehold("with my partner"), "with_someone");
assert.equal(parseHousehold("Yes", { allowBare: true }), "with_someone");
assert.equal(parseHousehold("None", { allowBare: true }), "alone");

const afterNameForHousehold = draft({
  ...afterDeclarationsAsk,
  borrowerNameAsked: true,
  borrowerName: "Jordan Hale",
  otherReoAsked: true,
  statedOtherReo: "none",
});
assert.equal(workspacePrompt(afterNameForHousehold), "documents");
assert.doesNotMatch(
  `${workspacePromptCopy("documents", afterNameForHousehold).text} ${workspacePromptCopy("documents", afterNameForHousehold).followUp ?? ""}`,
  /on your own|with someone|another borrower/i,
);

const afterPrimaryDocsStarted = draft({
  ...afterNameForHousehold,
  docsStarted: true,
});
assert.equal(workspacePrompt(afterPrimaryDocsStarted), "documents");
assert.equal(workspacePromptCopy("documents", afterPrimaryDocsStarted).text, DOC_INVITE_COPY.government_id);
assert.doesNotMatch(
  workspacePromptCopy("documents", afterPrimaryDocsStarted).text,
  /another borrower|What name should I put/i,
);

const afterPrimaryPass = skipAvailableAssets(
  skipCitizenship(
    skipSubjectAddress(
      draft({
        ...afterNameForHousehold,
        docsStarted: true,
        skippedClasses: ["government_id", "paystub", "w2"],
      }),
    ),
  ),
);
assert.ok(stillUsefulSection(afterPrimaryPass)?.items.some((item) => item.label === "Latest return"));
assert.equal(workspacePrompt(afterPrimaryPass), "review");
assert.match(
  workspacePromptCopy("review", afterPrimaryPass).text,
  /complete enough to move|look right/i,
);
assert.doesNotMatch(
  workspacePromptCopy("review", afterPrimaryPass).text,
  /another borrower|Is there another borrower/i,
);
const afterLooksRight = draft({ ...afterPrimaryPass, sampleAccepted: true });
assert.equal(workspacePrompt(afterLooksRight), "household");
assert.equal(workspacePromptCopy("household", afterLooksRight).text, HOUSEHOLD_ASK);
assert.match(HOUSEHOLD_ASK, /another borrower/i);
assert.doesNotMatch(HOUSEHOLD_ASK, /on your own|with someone/i);
assert.deepEqual(
  (workspacePromptCopy("household", afterLooksRight).actions ?? []).map((item) => item.label),
  ["Yes", "None", "Skip", "Not yet"],
);

const skipHouseholdReply = workspaceReply("Skip", afterLooksRight);
assert.equal(skipHouseholdReply?.capture?.field, "skip-household");
assert.match(
  skipHouseholdReply?.text ?? "",
  /Estimated housing|look right|government ID|Start with ID|Upload this|Still useful/i,
);
const skippedHouseholdFile = draft({ ...afterLooksRight, householdAsked: true });
assert.equal(skippedHouseholdFile.statedHousehold, undefined);
assert.ok(
  previewFacts(skippedHouseholdFile).some(
    (fact) => fact.id === "household" && fact.value === "—" && fact.note === SUGGESTED_HOUSEHOLD_NOTE,
  ),
);
const skipHouseholdQualify = workspaceReply("will i qualify", skippedHouseholdFile);
assert.doesNotMatch(
  skipHouseholdQualify?.text ?? "",
  /you don.t qualify|spouse must|community.property|you are approved|\bDTI\b|I can run this past underwriting/i,
);
assert.match(skipHouseholdQualify?.text ?? "", /paystub|W-2|notepad|Start with ID|Skip/i);
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("household"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedHousehold: "alone",
  }).stillUseful.includes("household"),
);
assert.ok(
  storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedHousehold: "with_someone",
  }).stillUseful.includes("other borrower details"),
);
assert.ok(
  !documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
  }).includes("household" as never),
);

const aloneChip = workspaceReply("None", afterLooksRight);
assert.equal(aloneChip?.capture?.field, "statedHousehold");
assert.match(
  aloneChip?.text ?? "",
  /Estimated housing|look right|government ID|Start with ID|Upload this|Still useful/i,
);
const aloneConfirmDraft = {
  ...afterLooksRight,
  pendingProposal: {
    field: "statedHousehold",
    value: "alone",
    label: "Household",
    kind: "computed" as const,
    note: SUGGESTED_HOUSEHOLD_NOTE,
  },
};
const usedAlone = resolveProposal(aloneConfirmDraft, "accept");
assert.equal(usedAlone.statedHousehold, "alone");
assert.equal(usedAlone.householdAsked, true);
assert.ok(
  previewFacts(usedAlone).some(
    (fact) =>
      fact.id === "household" &&
      fact.label === "Household" &&
      fact.value === "None" &&
      fact.note === SUGGESTED_HOUSEHOLD_NOTE,
  ),
);

const withSomeoneChip = workspaceReply("Yes", afterLooksRight);
assert.equal(withSomeoneChip?.capture?.field, "statedHousehold");
assert.equal(withSomeoneChip?.text, COBORROWER_HANDOFF);
assert.equal(withSomeoneChip?.text, "Now working on Borrower 2.");
assert.match(withSomeoneChip?.followUp ?? "", /Borrower 2’s government ID/);
assert.doesNotMatch(withSomeoneChip?.text ?? "", /What name should I put|What’s their name|occupancy|purchase price|estimated FICO|SSN|income type|second borrower card/i);
assert.deepEqual(
  (withSomeoneChip?.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const withSomeoneConfirmDraft = {
  ...afterLooksRight,
  pendingProposal: {
    field: "statedHousehold",
    value: "with_someone",
    label: "Household",
    kind: "computed" as const,
    note: SUGGESTED_HOUSEHOLD_NOTE,
  },
};
const leaveBlankHousehold = workspaceReply("Leave blank", withSomeoneConfirmDraft);
assert.equal(leaveBlankHousehold?.capture?.field, "decline-proposal");
assert.equal(resolveProposal(withSomeoneConfirmDraft, "decline").statedHousehold, undefined);
assert.match(leaveBlankHousehold?.text ?? "", /Left that line blank|government ID|Start with ID|Upload this|another borrower/i);
const usedWithSomeone = resolveProposal(withSomeoneConfirmDraft, "accept");
assert.equal(usedWithSomeone.statedHousehold, "with_someone");
assert.equal(usedWithSomeone.householdAsked, true);
assert.equal(usedWithSomeone.workingOnCoborrower, true);
assert.equal(workspacePrompt(usedWithSomeone), "documents");
assert.equal(workspacePromptCopy("documents", usedWithSomeone).text, COBORROWER_HANDOFF);
assert.match(workspacePromptCopy("documents", usedWithSomeone).followUp ?? "", /Borrower 2’s government ID/);
assert.ok(
  previewFacts(usedWithSomeone).some(
    (fact) =>
      fact.id === "borrower" &&
      fact.label === "Borrower 1" &&
      fact.value === "Jordan Hale",
  ),
);
assert.ok(previewFacts(usedWithSomeone).every((fact) => fact.id !== "borrower" || fact.label !== "Borrower"));
assert.doesNotMatch(
  `${workspacePromptCopy("documents", usedWithSomeone).text} ${workspacePromptCopy("documents", usedWithSomeone).followUp ?? ""}`,
  /What name should I put|What’s their name/i,
);
assert.ok(
  previewFacts(usedWithSomeone).some(
    (fact) =>
      fact.id === "household" &&
      fact.value === "Yes" &&
      fact.note === SUGGESTED_HOUSEHOLD_NOTE,
  ),
);
const withSomeoneQualify = workspaceReply("will i qualify", usedWithSomeone);
assert.doesNotMatch(
  withSomeoneQualify?.text ?? "",
  /you don.t qualify|spouse must|community.property|you are approved|\bDTI\b|I can run this past underwriting/i,
);
assert.match(withSomeoneQualify?.text ?? "", /paystub|W-2|notepad|Start with ID|Skip/i);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    statedDeclaration: "none",
    statedHousehold: "with_someone",
  }).kind,
  "strong",
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    propertyType: "sfr",
    statedDeclaration: "none",
    statedHousehold: "with_someone",
  }).kind,
  "not_ready",
);

const typedSpouse = workspaceReply("me and my spouse", afterDeclarationsAsk);
assert.equal(typedSpouse?.capture?.field, "statedHousehold");
assert.equal(typedSpouse?.text, OTHER_REO_ASK);
assert.doesNotMatch(typedSpouse?.text ?? "", /what is their name|SSN|income type|second borrower/i);
assert.equal(afterDeclarationsAsk.statedHousehold, undefined);

const midHouseholdEdit = draft({
  ...afterDeclarationsAsk,
  householdAsked: true,
  statedHousehold: "with_someone",
  correcting: "household",
  correctingLine: "household",
});
assert.equal(workspacePromptCopy("household", midHouseholdEdit).text, HOUSEHOLD_ASK);
assert.doesNotMatch(workspacePromptCopy("household", midHouseholdEdit).text, /Still right/i);
const midAlone = workspaceReply("On my own", midHouseholdEdit);
assert.equal(midAlone?.capture?.field, "statedHousehold");
assert.equal(midAlone?.text, OTHER_REO_ASK);
const midAloneWritten = resolveProposal(
  {
    ...midHouseholdEdit,
    pendingProposal: {
      field: "statedHousehold",
      value: "alone",
      label: "Household",
      kind: "computed" as const,
      note: SUGGESTED_HOUSEHOLD_NOTE,
    },
  },
  "accept",
);
assert.equal(midAloneWritten.statedHousehold, "alone");
assert.equal(emptyDraft().statedHousehold, undefined);
assert.equal(structureFixPrompt("household"), "household");

const householdSrc = [
  readFileSync(join(root, "components/fox/household.ts"), "utf8"),
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
].join("\n");
assert.doesNotMatch(householdSrc, /marital-status form|title vesting|community-property lecture|non-occupant quiz|second income type/i);
assert.doesNotMatch(householdSrc, /your spouse must be on the loan|you don.t qualify/i);
assert.doesNotMatch(householdSrc, /Are you buying this on your own/);

const w2SketchNoName = draft({
  ...afterDeclarationsAsk,
  otherReoAsked: true,
  statedOtherReo: "none",
});
assert.equal(workspacePrompt(w2SketchNoName), "documents");
assert.notEqual(workspacePrompt(w2SketchNoName), "borrower-name");
assert.notEqual(workspacePrompt(w2SketchNoName), "household");
assert.doesNotMatch(
  `${workspacePromptCopy("documents", w2SketchNoName).text} ${workspacePromptCopy("documents", w2SketchNoName).followUp ?? ""}`,
  /What name should I put|another borrower/i,
);
assert.match(workspacePromptCopy("documents", w2SketchNoName).followUp ?? "", /government ID/i);
const w2StartId = workspaceReply("Start with ID", w2SketchNoName);
assert.equal(w2StartId?.text, DOC_INVITE_COPY.government_id);
assert.doesNotMatch(w2StartId?.text ?? "", /What name should I put|another borrower/i);
const w2AfterStart = draft({ ...w2SketchNoName, docsStarted: true });
assert.equal(workspacePrompt(w2AfterStart), "documents");
assert.notEqual(workspacePrompt(w2AfterStart), "household");
assert.notEqual(workspacePrompt(w2AfterStart), "borrower-name");
const w2SkipId = skipCurrentInvite(w2AfterStart);
assert.equal(workspacePrompt(w2SkipId), "borrower-name");
assert.equal(workspacePromptCopy("borrower-name", w2SkipId).text, BORROWER_NAME_ASK);
assert.equal(w2SkipId.documentsSkipped, false);
const w2Named = draft({ ...w2SkipId, borrowerNameAsked: true, borrowerName: "Jane Test" });
assert.equal(workspacePrompt(w2Named), "documents");
assert.equal(workspacePromptCopy("documents", w2Named).text, DOC_INVITE_COPY.paystub);
assert.notEqual(workspacePrompt(w2Named), "household");
const w2AfterSkipPaystub = skipCurrentInvite(w2Named);
assert.equal(workspacePrompt(w2AfterSkipPaystub), "documents");
assert.equal(workspacePromptCopy("documents", w2AfterSkipPaystub).text, DOC_INVITE_COPY.w2);
assert.doesNotMatch(
  `${workspacePromptCopy("documents", w2AfterSkipPaystub).text} ${workspacePromptCopy("documents", w2AfterSkipPaystub).followUp ?? ""}`,
  /another borrower|Is there another borrower|Now working on Borrower 2/i,
);
const w2PassDone = skipAvailableAssets(skipCitizenship(skipSubjectAddress(skipCurrentInvite(w2AfterSkipPaystub))));
assert.equal(workspacePrompt(w2PassDone), "review");
assert.match(workspacePromptCopy("review", w2PassDone).text, /complete enough to move|look right/i);
assert.doesNotMatch(
  workspacePromptCopy("review", w2PassDone).text,
  /another borrower|Is there another borrower/i,
);
const w2LooksRight = draft({ ...w2PassDone, sampleAccepted: true });
assert.equal(workspacePrompt(w2LooksRight), "household");
assert.equal(workspacePromptCopy("household", w2LooksRight).text, HOUSEHOLD_ASK);
const w2YesBorrower2 = workspaceReply("Yes", w2LooksRight);
assert.equal(w2YesBorrower2?.text, COBORROWER_HANDOFF);
assert.match(w2YesBorrower2?.followUp ?? "", /Borrower 2’s government ID/);
const idReadFailed = draft({
  ...w2SketchNoName,
  docsStarted: true,
  documents: [
    {
      slot: "id",
      name: "blurry.png",
      type: "image/png",
      size: 4000,
      receivedAt: "2026-08-25T00:00:00.000Z",
      status: "failed",
      extractClass: "government_id",
    },
  ],
});
assert.equal(workspacePrompt(idReadFailed), "borrower-name");
const namedFromId = draft({
  ...w2SketchNoName,
  docsStarted: true,
  borrowerName: "Jane Test",
  skippedClasses: ["government_id"],
});
assert.notEqual(workspacePrompt(namedFromId), "borrower-name");

const seSketchNoName = draft({
  ...afterDeclarationsAsk,
  incomeType: { ...afterDeclarationsAsk.incomeType, value: "self-employed" },
  yearsInBusinessAsked: true,
  otherReoAsked: true,
  statedOtherReo: "none",
});
assert.equal(workspacePrompt(seSketchNoName), "documents");
assert.notEqual(workspacePrompt(seSketchNoName), "borrower-name");
assert.notEqual(workspacePrompt(seSketchNoName), "household");
const seAfterStart = draft({ ...seSketchNoName, docsStarted: true });
assert.equal(workspacePrompt(seAfterStart), "documents");
assert.equal(workspacePromptCopy("documents", seAfterStart).text, DOC_INVITE_COPY.government_id);
assert.notEqual(workspacePrompt(seAfterStart), "household");
const seSkipId = skipCurrentInvite(seAfterStart);
assert.equal(workspacePrompt(seSkipId), "borrower-name");
const seNamed = draft({ ...seSkipId, borrowerNameAsked: true, borrowerName: "Jane Test" });
assert.equal(workspacePrompt(seNamed), "documents");
assert.equal(workspacePromptCopy("documents", seNamed).text, DOC_INVITE_COPY.tax_return);
assert.notEqual(workspacePrompt(seNamed), "household");
const sePassDone = skipCurrentInvite(seNamed);
assert.equal(workspacePrompt(sePassDone), "documents");
assert.equal(workspacePromptCopy("documents", sePassDone).text, DOC_INVITE_COPY.prior_year_return);
assert.doesNotMatch(
  `${workspacePromptCopy("documents", sePassDone).text} ${workspacePromptCopy("documents", sePassDone).followUp ?? ""}`,
  /another borrower|Is there another borrower|Now working on Borrower 2/i,
);
const seRemainderDone = skipAvailableAssets(skipCitizenship(skipSubjectAddress(skipCurrentInvite(sePassDone))));
assert.equal(workspacePrompt(seRemainderDone), "review");
assert.doesNotMatch(workspacePromptCopy("review", seRemainderDone).text, /another borrower/i);
assert.equal(workspacePrompt(draft({ ...seRemainderDone, sampleAccepted: true })), "household");

const seOtherReoYes = draft({
  ...afterDeclarationsAsk,
  incomeType: { ...afterDeclarationsAsk.incomeType, value: "self-employed" },
  yearsInBusinessAsked: true,
  otherReoAsked: true,
  statedOtherReo: "yes",
});
assert.equal(workspacePrompt(seOtherReoYes), "documents");
assert.match(
  workspacePromptCopy("documents", seOtherReoYes).followUp ?? "",
  /Mortgage statements for all properties owned/i,
);
assert.doesNotMatch(
  `${workspacePromptCopy("documents", seOtherReoYes).text} ${workspacePromptCopy("documents", seOtherReoYes).followUp ?? ""}`,
  /What name should I put|another borrower/i,
);
const seOtherStart = workspaceReply("Start with ID", seOtherReoYes);
assert.equal(seOtherStart?.text, DOC_INVITE_COPY.government_id);
assert.doesNotMatch(
  `${seOtherStart?.text ?? ""} ${seOtherStart?.followUp ?? ""}`,
  /What name should I put|another borrower|Now working on the other borrower/i,
);
assert.deepEqual(
  (seOtherStart?.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const seOtherStarted = draft({ ...seOtherReoYes, docsStarted: true });
assert.equal(workspacePrompt(seOtherStarted), "documents");
assert.equal(workspacePromptCopy("documents", seOtherStarted).text, DOC_INVITE_COPY.government_id);
assert.notEqual(workspacePrompt(seOtherStarted), "borrower-name");
assert.notEqual(workspacePrompt(seOtherStarted), "household");
assert.notEqual(workspacePrompt({ ...seOtherStarted, docsHeld: true }), "household");
assert.notEqual(workspacePrompt({ ...seOtherStarted, docsHeld: true }), "borrower-name");
const seOtherSkipId = skipCurrentInvite(seOtherStarted);
assert.equal(workspacePrompt(seOtherSkipId), "borrower-name");
const seOtherNamed = draft({
  ...seOtherSkipId,
  borrowerNameAsked: true,
  borrowerName: "Jane Test",
});
assert.equal(workspacePrompt(seOtherNamed), "documents");
assert.equal(workspacePromptCopy("documents", seOtherNamed).text, DOC_INVITE_COPY.tax_return);
assert.notEqual(workspacePrompt(seOtherNamed), "household");
const seOtherReturnIn = skipCurrentInvite(seOtherNamed);
assert.equal(workspacePrompt(seOtherReturnIn), "documents");
assert.equal(workspacePromptCopy("documents", seOtherReturnIn).text, DOC_INVITE_COPY.prior_year_return);
assert.doesNotMatch(
  `${workspacePromptCopy("documents", seOtherReturnIn).text} ${workspacePromptCopy("documents", seOtherReturnIn).followUp ?? ""}`,
  /another borrower|Is there another borrower/i,
);
assert.ok(
  stillUsefulSection(seOtherReturnIn)?.items.some(
    (item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS,
  ),
);
const seOtherRemainderDone = skipAvailableAssets(skipCitizenship(skipSubjectAddress(skipCurrentInvite(seOtherReturnIn))));
assert.equal(workspacePrompt(seOtherRemainderDone), "review");
const seOtherLooksRight = draft({ ...seOtherRemainderDone, sampleAccepted: true });
assert.equal(workspacePrompt(seOtherLooksRight), "household");
const seOtherYes = workspaceReply("Yes", seOtherLooksRight);
assert.equal(seOtherYes?.text, COBORROWER_HANDOFF);
assert.match(seOtherYes?.followUp ?? "", /Borrower 2’s government ID/);
assert.doesNotMatch(seOtherYes?.text ?? "", /What name should I put|What’s their name/i);
assert.deepEqual(
  (seOtherYes?.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const seOtherOnCoborrower = draft({
  ...seOtherReturnIn,
  householdAsked: true,
  statedHousehold: "with_someone",
  workingOnCoborrower: true,
});
assert.equal(workspacePrompt(seOtherOnCoborrower), "documents");
assert.equal(workspacePromptCopy("documents", seOtherOnCoborrower).text, COBORROWER_HANDOFF);
const seOtherSkipCoborrowerId = skipCurrentInvite(seOtherOnCoborrower);
assert.equal(workspacePrompt(seOtherSkipCoborrowerId), "coborrower-name");
assert.equal(
  workspacePromptCopy("coborrower-name", seOtherSkipCoborrowerId).text,
  "What name should I put for Borrower 2?",
);

const coborrowerFromDocs = draft({
  ...afterPrimaryPass,
  householdAsked: true,
  statedHousehold: "with_someone",
  facts: {
    coborrower_name: {
      field: "coborrower_name",
      value: "Alex Hale",
      source: "document",
      confirmed: false,
    },
  },
});
assert.equal(workspacePrompt(coborrowerFromDocs), "documents");
assert.equal(workspacePromptCopy("documents", coborrowerFromDocs).text, COBORROWER_HANDOFF);
const coborrowerAfterSkipId = skipCurrentInvite(coborrowerFromDocs);
assert.equal(workspacePrompt(coborrowerAfterSkipId), "coborrower-name");
assert.match(workspacePromptCopy("coborrower-name", coborrowerAfterSkipId).text, /Alex Hale/);
assert.match(workspacePromptCopy("coborrower-name", coborrowerAfterSkipId).text, /Borrower 2/);
assert.deepEqual(
  (workspacePromptCopy("coborrower-name", coborrowerAfterSkipId).actions ?? []).map((item) => item.label),
  ["Use this", "Change"],
);
assert.doesNotMatch(
  workspacePromptCopy("coborrower-name", coborrowerAfterSkipId).text,
  /occupancy|purchase price|estimated FICO|How is income earned/i,
);
const namedCoborrower = workspaceReply("Alex Hale", {
  ...coborrowerAfterSkipId,
  correcting: "coborrower-name",
});
assert.equal(namedCoborrower?.capture?.field, "coborrowerName");
assert.doesNotMatch(namedCoborrower?.text ?? "", /occupancy|purchase price|estimated FICO/i);
const namedCoborrowerFile = draft({
  ...coborrowerAfterSkipId,
  coborrowerNameAsked: true,
  coborrowerName: "Alex Hale",
});
assert.ok(
  previewFacts(namedCoborrowerFile).some(
    (fact) =>
      fact.id === "coborrower-name" &&
      fact.label === "Borrower 2" &&
      fact.value === "Alex Hale",
  ),
);
assert.ok(
  previewFacts(namedCoborrowerFile).some(
    (fact) => fact.id === "borrower" && fact.label === "Borrower 1" && fact.value === "Jordan Hale",
  ),
);

const coborrowerIdExtract = applyExtractedFields(
  draft({
    ...seOtherOnCoborrower,
    documents: [
      {
        slot: "id",
        name: "coborrower-id.png",
        type: "image/png",
        size: 4000,
        receivedAt: "2026-08-22T00:00:00.000Z",
        status: "reading",
        party: "coborrower",
      },
    ],
  }),
  {
    extractClass: "government_id",
    confidence: 0.94,
    fields: { full_name: "Jane Test" },
  },
);
assert.equal(coborrowerIdExtract.draft.pendingProposal?.field, "coborrowerName");
assert.equal(coborrowerIdExtract.draft.pendingProposal?.label, "Borrower 2");
assert.equal(
  docReactionAsk(coborrowerIdExtract.draft, "government_id")?.text,
  "I read Jane Test on Borrower 2’s ID. Use that?",
);
assert.doesNotMatch(
  docReactionAsk(coborrowerIdExtract.draft, "government_id")?.text ?? "",
  /paystub|tax return|What name should I put/i,
);

const afterHouseholdAsk = draft({
  ...afterDeclarationsAsk,
  otherReoAsked: true,
  statedOtherReo: "none",
  docsStarted: true,
  skippedClasses: ["government_id"],
});
assert.equal(workspacePrompt(afterHouseholdAsk), "borrower-name");
assert.equal(workspacePromptCopy("borrower-name", afterHouseholdAsk).text, BORROWER_NAME_ASK);
assert.deepEqual(
  (workspacePromptCopy("borrower-name", afterHouseholdAsk).actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
assert.equal(parseBorrowerName("Jordan Hale"), "Jordan Hale");
assert.equal(parseBorrowerName("it's Jordan"), "Jordan");
assert.equal(parseBorrowerName("JORDAN HALE"), "Jordan Hale");

const skipBorrowerReply = workspaceReply("Skip", afterHouseholdAsk);
assert.equal(skipBorrowerReply?.capture?.field, "skip-borrower-name");
assert.match(skipBorrowerReply?.text ?? "", /latest paystub|Skip is fine/i);
assert.deepEqual(
  (skipBorrowerReply?.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const skippedBorrowerFile = draft({ ...afterHouseholdAsk, borrowerNameAsked: true });
assert.equal(skippedBorrowerFile.borrowerName, undefined);
assert.ok(
  previewFacts(skippedBorrowerFile).some(
    (fact) =>
      fact.id === "borrower" &&
      fact.label === "Borrower" &&
      fact.value === "—" &&
      fact.note === SUGGESTED_BORROWER_NOTE,
  ),
);
const skipBorrowerQualify = workspaceReply("will i qualify", skippedBorrowerFile);
assert.doesNotMatch(
  skipBorrowerQualify?.text ?? "",
  /you don.t qualify|SSN|social security|identity is verified|KYC|you are approved/i,
);
assert.match(skipBorrowerQualify?.text ?? "", /paystub|W-2|notepad|Start with ID|Skip/i);
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("borrower"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    borrowerName: "Jordan Hale",
  }).stillUseful.includes("borrower"),
);
assert.ok(
  !documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
  }).includes("borrower" as never),
);

const typedName = workspaceReply("Jordan Hale", afterHouseholdAsk);
assert.equal(typedName?.capture?.field, "borrowerName");
assert.doesNotMatch(typedName?.text ?? "", /Use this|Still right/i);
assert.ok(!(typedName?.actions ?? []).some((item) => item.label === "Use this" || item.label === "Change"));
const nameConfirmDraft = {
  ...afterHouseholdAsk,
  pendingProposal: {
    field: "borrowerName",
    value: "Jordan Hale",
    label: "Borrower",
    kind: "computed" as const,
    note: SUGGESTED_BORROWER_NOTE,
  },
};
const usedName = resolveProposal(nameConfirmDraft, "accept");
assert.equal(usedName.borrowerName, "Jordan Hale");
assert.equal(usedName.contact.fullName.value, "Jordan Hale");
assert.ok(
  previewFacts(usedName).some(
    (fact) =>
      fact.id === "borrower" &&
      fact.label === "Borrower" &&
      fact.value === "Jordan Hale" &&
      fact.note === SUGGESTED_BORROWER_NOTE,
  ),
);
const leaveBlankName = workspaceReply("Leave blank", nameConfirmDraft);
assert.equal(leaveBlankName?.capture?.field, "decline-proposal");
assert.equal(resolveProposal(nameConfirmDraft, "decline").borrowerName, undefined);
assert.match(leaveBlankName?.text ?? "", /Left that line blank|latest paystub|Skip is fine/i);
assert.deepEqual(
  (leaveBlankName?.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);

const namedQualify = workspaceReply("will i qualify", usedName);
assert.doesNotMatch(
  namedQualify?.text ?? "",
  /you don.t qualify|SSN|identity is verified|KYC|you are approved|you qualify\b/i,
);
assert.match(namedQualify?.text ?? "", /paystub|W-2|notepad|Start with ID|Skip/i);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    statedDeclaration: "none",
    statedHousehold: "alone",
    borrowerName: "Jordan Hale",
  }).kind,
  "strong",
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    propertyType: "sfr",
    borrowerName: "Jordan Hale",
  }).kind,
  "not_ready",
);

const midBorrowerEdit = draft({
  ...afterHouseholdAsk,
  borrowerNameAsked: true,
  borrowerName: "Jordan Hale",
  contact: {
    ...emptyDraft().contact,
    fullName: { ...emptyDraft().contact.fullName, value: "Jordan Hale" },
  },
  correcting: "borrower-name",
  correctingLine: "borrower-name",
});
assert.equal(workspacePromptCopy("borrower-name", midBorrowerEdit).text, BORROWER_NAME_ASK);
assert.doesNotMatch(workspacePromptCopy("borrower-name", midBorrowerEdit).text, /Still right/i);
const midAda = workspaceReply("Ada Lovelace", midBorrowerEdit);
assert.equal(midAda?.capture?.field, "borrowerName");
assert.doesNotMatch(midAda?.text ?? "", /Use this|Still right/i);
const midAdaWritten = resolveProposal(
  {
    ...midBorrowerEdit,
    pendingProposal: {
      field: "borrowerName",
      value: "Ada Lovelace",
      label: "Borrower",
      kind: "computed" as const,
      note: SUGGESTED_BORROWER_NOTE,
    },
  },
  "accept",
);
assert.equal(midAdaWritten.borrowerName, "Ada Lovelace");
assert.equal(emptyDraft().borrowerName, undefined);
assert.equal(structureFixPrompt("borrower"), "borrower-name");

const typedThenId = applyExtractedFields(usedName, {
  extractClass: "government_id",
  confidence: 0.94,
  fields: { full_name: "Maya Chen" },
});
assert.equal(typedThenId.draft.borrowerName, "Jordan Hale");
assert.equal(typedThenId.conflict?.field, "borrowerName");
assert.deepEqual(
  (workspacePromptCopy("confirm-proposal", typedThenId.draft).actions ?? []).map((item) => item.label),
  ["Use document", "Keep the typed name"],
);

const borrowerSrc = [
  readFileSync(join(root, "components/fox/borrowerName.ts"), "utf8"),
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
].join("\n");
assert.doesNotMatch(borrowerSrc, /KYC vendor|citizenship quiz|present-address form|second-borrower name maze/i);
assert.doesNotMatch(borrowerSrc, /\bITIN\b|full SSN|ask for SSN|identity is verified/i);

const afterNameAsk = draft({
  ...afterDeclarationsAsk,
  borrowerNameAsked: true,
  borrowerName: "Jordan Hale",
});
assert.equal(workspacePrompt(afterNameAsk), "other-reo");
assert.equal(workspacePromptCopy("other-reo", afterNameAsk).text, OTHER_REO_ASK);
assert.deepEqual(
  (workspacePromptCopy("other-reo", afterNameAsk).actions ?? []).map((item) => item.label),
  ["None", "Yes", "Skip", "Not yet"],
);
assert.equal(parseOtherReo("no", { allowBare: true }), "none");
assert.equal(parseOtherReo("none", { allowBare: true }), "none");
assert.equal(parseOtherReo("just this"), "none");
assert.equal(parseOtherReo("I have a rental"), "yes");
assert.equal(parseOtherReo("yes", { allowBare: true }), "yes");
assert.equal(parseOtherReo("None"), undefined);

const skipOtherReoReply = workspaceReply("Skip", afterNameAsk);
assert.equal(skipOtherReoReply?.capture?.field, "skip-other-reo");
assert.match(skipOtherReoReply?.text ?? "", /sketch|government ID|Start with ID/i);
assert.deepEqual(
  (skipOtherReoReply?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Skip", "Not yet"],
);
const skippedOtherReoFile = draft({ ...afterNameAsk, otherReoAsked: true });
assert.equal(skippedOtherReoFile.statedOtherReo, undefined);
assert.ok(
  previewFacts(skippedOtherReoFile).some(
    (fact) => fact.id === "other-reo" && fact.value === "—" && fact.note === SUGGESTED_OTHER_REO_NOTE,
  ),
);
const skipOtherReoQualify = workspaceReply("will i qualify", skippedOtherReoFile);
assert.doesNotMatch(
  skipOtherReoQualify?.text ?? "",
  /you don.t qualify|two months reserves|reserve-month|you are approved|rental income/i,
);
assert.match(skipOtherReoQualify?.text ?? "", /paystub|W-2|notepad|Start with ID|Skip/i);
assert.ok(storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" }).stillUseful.includes("other real estate"));
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedOtherReo: "none",
  }).stillUseful.includes("other real estate"),
);
assert.ok(
  storeCompleteness("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedOtherReo: "yes",
  }).stillUseful.includes("other property details"),
);
assert.ok(
  !documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
  }).includes("other-reo" as never),
);
assert.ok(
  documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    statedOtherReo: "yes",
  }).includes("mortgage_statement"),
);
assert.ok(
  stillUsefulSection(
    draft({
      ...afterNameAsk,
      statedOtherReo: "yes",
      otherReoAsked: true,
      occupancyChoice: { field: "occupancy", value: "investment", source: "client", confirmed: true },
    }),
  )?.items.some((item) => /lease/i.test(item.label)),
);
assert.ok(
  !stillUsefulSection(
    draft({
      ...afterNameAsk,
      statedOtherReo: "yes",
      otherReoAsked: true,
      occupancyChoice: { field: "occupancy", value: "primary", source: "client", confirmed: true },
    }),
  )?.items.some((item) => /lease/i.test(item.label)),
);

const noneReoChip = workspaceReply("None", afterNameAsk);
assert.equal(noneReoChip?.capture?.field, "statedOtherReo");
assert.match(noneReoChip?.text ?? "", /paystub|W-2|ID|Skip/i);
const noneReoConfirmDraft = {
  ...afterNameAsk,
  pendingProposal: {
    field: "statedOtherReo",
    value: "none",
    label: "Other real estate",
    kind: "computed" as const,
    note: SUGGESTED_OTHER_REO_NOTE,
  },
};
assert.ok(
  previewFacts(noneReoConfirmDraft).some(
    (fact) => fact.id === "other-reo" && fact.value === "None" && fact.note === SUGGESTED_OTHER_REO_NOTE,
  ),
);
const usedNoneReo = resolveProposal(noneReoConfirmDraft, "accept");
assert.equal(usedNoneReo.statedOtherReo, "none");
assert.equal(usedNoneReo.otherReoAsked, true);
assert.ok(
  previewFacts(usedNoneReo).some(
    (fact) =>
      fact.id === "other-reo" &&
      fact.label === "Other real estate" &&
      fact.value === "None" &&
      fact.note === SUGGESTED_OTHER_REO_NOTE,
  ),
);
const leaveBlankOtherReo = workspaceReply("Leave blank", noneReoConfirmDraft);
assert.equal(leaveBlankOtherReo?.capture?.field, "decline-proposal");
assert.equal(resolveProposal(noneReoConfirmDraft, "decline").statedOtherReo, undefined);
assert.match(leaveBlankOtherReo?.text ?? "", /Left that line blank|sketch|government ID/i);
assert.deepEqual(
  (leaveBlankOtherReo?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Skip", "Not yet"],
);
assert.ok(
  !previewFacts(resolveProposal(noneReoConfirmDraft, "decline")).some(
    (fact) => fact.id === "other-reo" && fact.value === "None",
  ),
);

const typedRental = workspaceReply("I have a rental", afterNameAsk);
assert.equal(typedRental?.capture?.field, "statedOtherReo");
assert.match(`${typedRental?.text ?? ""} ${typedRental?.followUp ?? ""}`, /Mortgage statements for all properties owned/i);
assert.match(typedRental?.text ?? "", /paystub|W-2|ID|Skip/i);
assert.doesNotMatch(typedRental?.text ?? "", /address|HOA|rent|value|add another property/i);
assert.equal(
  stillUsefulSection(
    draft({
      ...afterNameAsk,
      statedOtherReo: "yes",
      otherReoAsked: true,
    }),
  )?.items.some((item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS),
  true,
);
assert.match(
  shortListSpeak(draft({ ...afterNameAsk, statedOtherReo: "yes", otherReoAsked: true })),
  /Mortgage statements for all properties owned/,
);
const yesConfirmDraft = {
  ...afterNameAsk,
  pendingProposal: {
    field: "statedOtherReo",
    value: "yes",
    label: "Other real estate",
    kind: "computed" as const,
    note: SUGGESTED_OTHER_REO_NOTE,
  },
};
const usedYes = resolveProposal(yesConfirmDraft, "accept");
assert.equal(usedYes.statedOtherReo, "yes");
assert.ok(
  previewFacts(usedYes).some(
    (fact) =>
      fact.id === "other-reo" &&
      fact.value === "Yes" &&
      fact.note === SUGGESTED_OTHER_REO_NOTE,
  ),
);
assert.doesNotMatch(
  workspaceReply("will i qualify", usedYes)?.text ?? "",
  /you don.t qualify|two months reserves|you are approved|I can run this past underwriting/i,
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "sfr",
    statedDeclaration: "none",
    statedHousehold: "alone",
    borrowerName: "Jordan Hale",
    statedOtherReo: "yes",
  }).kind,
  "strong",
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    propertyType: "sfr",
    statedOtherReo: "yes",
  }).kind,
  "not_ready",
);

const midOtherReoEdit = draft({
  ...afterNameAsk,
  otherReoAsked: true,
  statedOtherReo: "none",
  correcting: "other-reo",
  correctingLine: "other-reo",
});
assert.equal(workspacePromptCopy("other-reo", midOtherReoEdit).text, OTHER_REO_ASK);
assert.doesNotMatch(workspacePromptCopy("other-reo", midOtherReoEdit).text, /Still right/i);
const midYes = workspaceReply("Yes", midOtherReoEdit);
assert.equal(midYes?.capture?.field, "statedOtherReo");
assert.match(midYes?.text ?? "", /paystub|W-2|ID|Skip/i);
const midYesWritten = resolveProposal(
  {
    ...midOtherReoEdit,
    pendingProposal: {
      field: "statedOtherReo",
      value: "yes",
      label: "Other real estate",
      kind: "computed" as const,
      note: SUGGESTED_OTHER_REO_NOTE,
    },
  },
  "accept",
);
assert.equal(midYesWritten.statedOtherReo, "yes");
assert.equal(emptyDraft().statedOtherReo, undefined);
assert.equal(structureFixPrompt("other-reo"), "other-reo");

const purchaseMortgageHint = applyExtractedFields(
  draft({
    ...afterLooks,
    productIntent: "buy",
    cashOut: false,
    facts: {},
    pendingProposal: null,
    pendingConflict: null,
    statedCurrentHousing: undefined,
    statedOtherReo: undefined,
    otherReoAsked: true,
    pendingOtherReo: null,
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "OAK SERVICING",
      unpaid_principal: "960000",
      current_pi: "1800",
    },
  },
);
assert.equal(purchaseMortgageHint.draft.statedOtherReo, undefined);
assert.equal(purchaseMortgageHint.draft.pendingProposal?.field, "statedCurrentHousing");
assert.equal(purchaseMortgageHint.draft.pendingOtherReo, true);
const afterHousingHint = resolveProposal(purchaseMortgageHint.draft, "accept");
assert.equal(afterHousingHint.statedOtherReo, undefined);
assert.equal(afterHousingHint.pendingProposal?.field, "statedOtherReo");
assert.equal(afterHousingHint.pendingProposal?.value, "yes");
assert.equal(
  nextFoxAsk(afterHousingHint).text,
  "I’ll note other real estate. Suggested · not underwritten. Use this?",
);
const usedHint = resolveProposal(afterHousingHint, "accept");
assert.equal(usedHint.statedOtherReo, "yes");
const declinedHint = resolveProposal(afterHousingHint, "decline");
assert.equal(declinedHint.statedOtherReo, undefined);

const refiMortgageNotOther = applyExtractedFields(
  draft({
    ...afterLooks,
    productIntent: "refinance",
    statedOtherReo: undefined,
    pendingProposal: null,
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "OAK SERVICING",
      unpaid_principal: "960000",
      current_pi: "4800",
    },
  },
);
assert.equal(refiMortgageNotOther.draft.statedOtherReo, undefined);
assert.notEqual(refiMortgageNotOther.draft.pendingProposal?.field, "statedOtherReo");
assert.ok(!refiMortgageNotOther.draft.pendingOtherReo);
const refiHousingAccepted = resolveProposal(refiMortgageNotOther.draft, "accept");
assert.equal(refiHousingAccepted.statedOtherReo, undefined);
assert.notEqual(refiHousingAccepted.pendingProposal?.field, "statedOtherReo");

const otherReoSrc = [
  readFileSync(join(root, "components/fox/otherReo.ts"), "utf8"),
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
].join("\n");
assert.doesNotMatch(otherReoSrc, /REO schedule|add another property|reserve-month engine|rental-income worksheet/i);
assert.doesNotMatch(otherReoSrc, /you need two months reserves|you don.t qualify/i);

const thinExport = draft({ path: "acr", productIntent: "buy" });
assert.equal(exportSketchReady(thinExport), false);
assert.equal(derivedExportStatus(thinExport), "not_ready");
assert.equal(fileExportOf(thinExport).status, "not_ready");
assert.equal(markExported(thinExport, "mapped_json").fileExport, undefined);
assert.match(mappedJsonText(thinExport), /"status": "not_ready"/);
assert.doesNotMatch(mappedJsonText(thinExport), /"status": "ready"|"status": "exported"/);
assert.doesNotMatch(mappedJsonText(thinExport), /"ssn"\s*:|"citizenship"\s*:|"dateOfBirth"\s*:/);
assert.match(fnma32Text(thinExport), /Label: not_ready/);
assert.doesNotMatch(fnma32Text(thinExport), /01A\||02A\||03A\|SSN|03A\|Citizenship|ITIN|000-00-0000/);

const fullExport = draft({
  ...afterIncome,
  borrowerName: "Jordan Hale",
  statedMonthlyDebts: 800,
  statedAvailableAssets: 240000,
  propertyType: "sfr",
  statedCurrentHousing: 3200,
  statedDeclaration: "none",
  statedHousehold: "alone",
  statedOtherReo: "none",
  facts: {
    ...(afterIncome.facts ?? {}),
    id_last4: { field: "id_last4", value: "1234", source: "document", confirmed: false },
  },
});
const exportPack = fileExportOf(fullExport);
assert.equal(exportSketchReady(fullExport), true);
assert.equal(exportPack.status, "gaps");
assert.equal(exportPack.mapped.purchasePrice?.value, 1200000);
assert.equal(exportPack.mapped.downPayment?.value, 240000);
assert.equal(exportPack.mapped.loanAmount?.value, 960000);
assert.equal(exportPack.mapped.occupancy?.value, "Primary");
assert.equal(exportPack.mapped.incomeType?.value, "W-2");
assert.equal(exportPack.mapped.borrowerName?.value, "Jordan Hale");
assert.equal(exportPack.mapped.borrowerName?.note, SUGGESTED_BORROWER_NOTE);
assert.equal(exportPack.mapped.ssn, undefined);
assert.ok(!("ssn" in exportPack.mapped));
assert.ok(!("citizenship" in exportPack.mapped));
assert.ok(exportPack.gaps.some((item) => item.key === "ssn"));
assert.ok(exportPack.gaps.some((item) => item.key === "citizenship"));
assert.ok(exportPack.gaps.some((item) => item.key === "present_mailing_address"));
assert.ok(exportPack.gaps.some((item) => item.key === "dob"));
assert.ok(exportPack.gaps.some((item) => item.key === "employer_name"));
assert.ok(exportPack.gaps.some((item) => item.key === "full_account_numbers"));
const mappedJson = mappedJsonText(fullExport);
assert.match(mappedJson, /"status": "gaps"/);
assert.match(mappedJson, /"purchasePrice"/);
assert.match(mappedJson, /1200000/);
assert.match(mappedJson, /Suggested · not underwritten/);
assert.doesNotMatch(mappedJson, /"ssn"\s*:|"citizenship"\s*:|"dateOfBirth"\s*:/);
assert.doesNotMatch(mappedJson, /000-00-0000|ITIN/);
const fnma = fnma32Text(fullExport);
assert.match(fnma, /Label: incomplete/);
assert.match(fnma, /01A\|PurchasePrice\|1200000/);
assert.match(fnma, /01A\|LoanAmount\|960000/);
assert.match(fnma, /02A\|Occupancy\|Primary/);
assert.match(fnma, /05A\|IncomeType\|W-2/);
assert.doesNotMatch(fnma, /ITIN|US Citizen|000-00-0000/);
assert.doesNotMatch(fnma, /03A\|SSN|03A\|Citizenship|03A\|TIN|03A\|DateOfBirth/);
const employerFile = draft({
  ...fullExport,
  facts: {
    ...fullExport.facts,
    employer_name: { field: "employer_name", value: "ACME CORP", source: "document", confirmed: true },
  },
});
assert.equal(mappedFileFacts(employerFile).employerName?.value, "ACME CORP");
assert.ok(!exportGaps(employerFile).some((item) => item.key === "employer_name"));
assert.ok(exportGaps(employerFile).some((item) => item.key === "ssn"));
const exportedFile = markExported(fullExport, "fnma_32");
assert.equal(exportedFile.fileExport?.status, "exported");
assert.equal(fileExportOf(exportedFile).status, "exported");
assert.equal(fileExportOf(exportedFile).format, "fnma_32");
assert.ok((exportedFile.events ?? []).some((event) => event.kind === "staff-export"));
assert.equal(emptyDraft().fileExport, undefined);

const occupancyExportChips = (workspacePromptCopy("occupancy", atOccupancy).actions ?? []).map(
  (item) => item.label,
);
assertAnswerThenRestore(
  workspaceReply("did you send my file?", atOccupancy),
  new RegExp(STAFF_EXPORT_BORROWER_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  { labels: occupancyExportChips },
);
assert.equal(
  workspaceReply("did you send my file?", atOccupancy)?.text?.startsWith(STAFF_EXPORT_BORROWER_COPY),
  true,
);
assertAnswerThenRestore(
  workspaceReply("did you send my file", afterIncome),
  new RegExp(STAFF_EXPORT_BORROWER_COPY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  { labels: ["Start with ID", "Skip", "Not yet"] },
);
const sentFileReply = workspaceReply("did you send my file?", afterIncome);
assert.doesNotMatch(sentFileReply?.text ?? "", /DU says|exported to Fannie|in underwriting/i);
assert.doesNotMatch(STAFF_EXPORT_BORROWER_COPY, /DU says|exported to Fannie|the file is in underwriting/i);
assert.doesNotMatch(workspaceReply("what about my 1003?", afterIncome)?.text ?? "", /download your application|Desktop Underwriter says/i);

const exportGapsOnUseful = stillUsefulSection(afterLooks)?.items ?? [];
assert.ok(!exportGapsOnUseful.some((item) => /ssn|citizenship|mailing address|date of birth|account number/i.test(item.label)));
assert.ok(!exportGapsOnUseful.some((item) => /ssn|citizenship|mailing address|date of birth|account number/i.test(item.ask ?? "")));
const usefulWithFoxLine = stillUsefulSection(
  draft({
    ...afterLooks,
    conditions: [
      {
        id: "human-ssn",
        title: "SSN",
        foxLine: "A licensed originator asked for a government ID so we can capture SSN securely later.",
        waitingOn: "borrower",
        needed: "fact",
        status: "open",
        stillUseful: true,
      },
    ],
  }),
);
assert.ok(usefulWithFoxLine?.items.some((item) => item.label === "SSN"));
const usefulWithoutFoxLine = stillUsefulSection(
  draft({
    ...afterLooks,
    conditions: [
      {
        id: "auto-ssn",
        title: "SSN",
        foxLine: "",
        waitingOn: "borrower",
        needed: "fact",
        status: "open",
        stillUseful: true,
      },
    ],
  }),
);
assert.ok(!usefulWithoutFoxLine?.items.some((item) => item.label === "SSN"));

const staffExportSrc = [
  readFileSync(join(root, "components/fox/staffExport.ts"), "utf8"),
  readFileSync(join(root, "components/fox/LoReview.tsx"), "utf8"),
].join("\n");
assert.match(staffExportSrc, /Download mapped_json/);
assert.match(staffExportSrc, /Download FNMA 3.2/);
assert.match(staffExportSrc, /Staff \/ LOS only/);
assert.doesNotMatch(staffExportSrc, /citizenship: "US Citizen"|fake ITIN|000-00-0000|SSN: 000/);
const startBorrowerSrc = [
  readFileSync(join(root, "components/fox/StartWorkspace.tsx"), "utf8"),
  readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8"),
].join("\n");
assert.doesNotMatch(startBorrowerSrc, /Download mapped_json|Download FNMA 3.2|onyx-file-mapped|onyx-file-fnma/);
assert.doesNotMatch(startBorrowerSrc, /\b1003\b|download your application|sent to Desktop Underwriter/);
assert.doesNotMatch(
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
  /Download mapped_json|Download FNMA 3.2|onyx-file-mapped/,
);

const debtsSrc = [
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
  readFileSync(join(root, "components/fox/monthlyDebts.ts"), "utf8"),
  readFileSync(join(root, "components/fox/types.ts"), "utf8"),
  readFileSync(join(root, "components/fox/FilePreview.tsx"), "utf8"),
].join("\n");
assert.doesNotMatch(debtsSrc, /add another liability|liability form|itemized liabilit/i);
assert.doesNotMatch(debtsSrc, /tradeline|bureau pull|soft pull|hard pull|pullCredit|credit-pull/i);
assert.doesNotMatch(debtsSrc, /student loan card|auto loan card|HOA dues form/i);
const assetsSrc = [
  readFileSync(join(root, "components/fox/availableAssets.ts"), "utf8"),
  readFileSync(join(root, "components/fox/workspace.ts"), "utf8"),
].join("\n");
assert.doesNotMatch(assetsSrc, /gift maze|earnest money|large[- ]deposit quiz|add another account|itemized account/i);
assert.doesNotMatch(assetsSrc, /reserve-month engine|you need two months reserves|N months of reserves/i);
assert.match(guidelineStoreSrc, /statedAvailableAssets/);
assert.doesNotMatch(fundsShortLine({ statedAvailableAssets: 10000, downPayment: 170000 }) ?? "", /you don.t qualify|you are approved|stated DTI|months? reserves/i);
assert.match(guidelineStoreSrc, /statedMonthlyDebts/);
assert.doesNotMatch(guidelineStoreSrc, /stated DTI|your DTI is/i);
assert.equal(storeLookup("language.cost", {}).borrowerLine, COST_LINE);
assert.equal(storeLookup("flags.govvie", { namedGovvie: true }).borrowerLine, GOVVIE_LINE);
assert.equal(storeLookup("flags.govvie", { namedGovvie: true }).caution, GOVVIE_LINE);
assert.notEqual(storeCompleteness("buy", { purposeHint: "purchase" }).layer, "agency_ready");
assert.ok(!storeCompleteness("buy", { purposeHint: "purchase" }).stillUseful.some((item) => /1003|SSN|HOA|reserve-months/i.test(item)));
const purchaseLayer = storeCompleteness("buy", { purposeHint: "purchase", incomeType: "w2_base" });
assert.ok(purchaseLayer.stillUseful.includes("ID"));
assert.ok(purchaseLayer.stillUseful.includes("latest paystub"));
assert.ok(purchaseLayer.stillUseful.includes("W-2"));
assert.ok(purchaseLayer.stillUseful.includes("contract"));
assert.ok(purchaseLayer.stillUseful.includes("bank statement"));
assert.ok(!purchaseLayer.stillUseful.includes("income docs"));
assert.deepEqual(
  documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "w2_base",
    received: ["government_id", "paystub", "w2"],
    paystubCount: 2,
    w2Count: 2,
    twoYearWageHistory: true,
  }),
  ["property-address", "purchase_contract", "bank_statement"],
);
assert.deepEqual(
  documentedStillUsefulIds("buy", {
    purposeHint: "purchase",
    incomeType: "se_schedule_c",
    received: ["government_id", "tax_return"],
    taxReturnCount: 2,
    hasScheduleC: true,
  }),
  ["ytd-pnl", "property-address", "purchase_contract", "bank_statement"],
);
assert.ok(
  documentedStillUsefulIds("refinance", {
    purposeHint: "lcor",
    incomeType: "w2_base",
  }).includes("mortgage_statement"),
);
assert.ok(
  !documentedStillUsefulIds("refinance", {
    purposeHint: "lcor",
    incomeType: "w2_base",
  }).includes("bank_statement"),
);
assert.ok(
  documentedStillUsefulIds("refinance", {
    purposeHint: "lcor",
    incomeType: "w2_base",
    fundsInPlay: true,
  }).includes("bank_statement"),
);
assert.equal(storeFlags({ namedGovvie: true, product: "buy", purposeHint: "purchase", state: "CA" }).previewRateAllowed, false);
assert.equal(storeEscalate({ namedGovvie: true }).action, "escalate");
assert.equal(storeEscalate({ requestedHuman: true }).borrowerLine, ESCALATE_LINE);

const workspaceSrc = readFileSync(join(root, "components/fox/workspace.ts"), "utf8");
assert.ok(workspaceSrc.includes('from "@/lib/guidelines/answer"'));
assert.ok(workspaceSrc.includes("answerFromFile"));
assert.doesNotMatch(workspaceSrc, /That usually means the price or the loan amount is wrong/);
assert.ok(!workspaceSrc.includes("I can keep this file current. Ask anything, or take the next step when you’re ready."));
assert.ok(!workspaceSrc.includes("What’s a rough amount?"));
assert.ok(!workspaceSrc.includes('label: "Amount"'));
assert.ok(!workspaceSrc.includes('label: "Numbers"'));
assert.ok(!workspaceSrc.includes("${spoken} ${reply.text}"));
assert.ok(!/Drop what you have\. Skip is fine/.test(workspaceSrc));
assert.ok(!/832,?750/.test(workspaceSrc));
assert.ok(
  workspaceSrc.includes("1_249_125") ||
    workspaceSrc.includes("1249125") ||
    guidelineStoreSrc.includes("1_249_125"),
);

assert.ok(readFileSync(join(root, "scripts/fixtures/return-2023.png")).length > 0);
assert.ok(readFileSync(join(root, "scripts/fixtures/return-declining-2024.png")).length > 0);
assert.ok(readFileSync(join(root, "scripts/fixtures/entity-ordinary-2024.png")).length > 0);
const pngBytes = readFileSync(join(root, "scripts/fixtures/paystub-acme.png"));
const dataUrl = imageDataUrl(pngBytes, "image/png");
assert.ok(dataUrl.startsWith("data:image/png;base64,"));
const chatBody = visionChatBody("grok-2-vision-1212", "classify", dataUrl);
const imagePart = chatBody.messages[1]?.content[1] as {
  type: string;
  image_url?: { url?: string };
};
assert.equal(imagePart.type, "image_url");
assert.equal(imagePart.image_url?.url, dataUrl);
assert.equal(extractClassFromFilename("paystub-acme.png"), "paystub");

applyCapture({ field: "keep-file-fact" });
applyCapture({ field: "use-document-fact" });

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
const beforeProceed = getFoxDraft();
assert.ok(statusCopy(beforeProceed) === "ready" || statusCopy(beforeProceed) === "gathering");
assert.equal(nextActorOf(beforeProceed), "You");
assert.ok(previewFacts(beforeProceed).some((fact) => fact.id === "originator"));
const skipThen = workspaceReply("Skip for now", beforeProceed);
assert.equal(skipThen?.capture?.field, "skip-docs");
assert.notEqual(skipThen?.capture?.field, "proceed");
applyCapture({ field: "skip-docs" });
const skippedNotQueued = getFoxDraft();
assert.equal(motionOf(skippedNotQueued), "ready");
assert.equal(statusCopy(skippedNotQueued), "ready");
assert.ok(!openReviewWorkItem(skippedNotQueued));
applyCapture({ field: "proceed" });
const emailGate = getFoxDraft();
assert.equal(emailGate.pendingFinish, "proceed");
assert.equal(emailGate.emailCaptureAsked, true);
assert.notEqual(motionOf(emailGate), "in_queue");
assert.equal(workspacePromptCopy("done", emailGate).text, MOTION_COPY.emailAsk);
assert.match(workspacePromptCopy("done", emailGate).text, /good email|remind you/i);
assert.deepEqual(
  (workspacePromptCopy("done", emailGate).actions ?? []).map((item) => item.label),
  ["Skip"],
);
assert.ok(!openReviewWorkItem(emailGate));
assert.equal(workspaceReply("Proceed", beforeProceed)?.text, MOTION_COPY.emailAsk);
assert.equal(workspaceUpdateCopy({ field: "proceed" }, beforeProceed), MOTION_COPY.emailAsk);
applyCapture({ field: "email", value: "borrower@example.com" });
const queued = getFoxDraft();
assert.equal(motionOf(queued), "in_queue");
assert.equal(statusCopy(queued), "in_queue");
assert.equal(nextActorOf(queued), "ONYX");
assert.ok(previewFacts(queued).some((fact) => fact.id === "originator"));
assert.ok(previewFacts(queued).some((fact) => fact.id === "next" && fact.value === "ONYX"));
assert.ok(previewFacts(queued).some((fact) => fact.id === "file"));
assert.ok(previewFacts(queued).some((fact) => fact.id === "status" && fact.value === "in_queue"));
assert.ok(!/agency_partial|agency_ready/.test(fileCompleteness(queued)?.copy ?? ""));
const reviewItem = openReviewWorkItem(queued);
assert.equal(reviewItem?.kind, "review");
assert.ok(reviewItem?.state === "open" || reviewItem?.state === "nudged");
assert.equal(workspacePromptCopy("done", queued).text, MOTION_COPY.in_queue);
assert.doesNotMatch(workspacePromptCopy("done", queued).text, /will contact you|we’ll be in touch|your lo has the file|we pulled|pulled your credit|fico/i);
assert.equal(creditPullPermitted(queued), true);
assert.equal(creditPullPermitted({ ...queued, motion: "escalated" }), true);
assert.doesNotMatch(MOTION_COPY.in_queue, /we pulled|pulled your credit|your score is/i);
const queuedActions = workspacePromptCopy("done", queued).actions ?? [];
const queuedLabels = queuedActions.map((item) => item.label);
assert.deepEqual(queuedLabels, ["What happens next?", "Upload more", "Ask Fox", "Request human"]);
assert.ok(!queuedLabels.includes("Upload this"));
assert.ok(!queuedLabels.includes("Skip"));
assert.ok(!queuedLabels.includes("Not yet"));
assert.equal(queuedActions.find((item) => item.label === "Request human")?.quiet, true);
const whatNext = workspaceReply("What happens next?", queued);
assert.equal(whatNext?.text, MOTION_COPY.whatHappensNext);
assert.doesNotMatch(whatNext?.text ?? "", /government ID|Purchase contract|Bank statement|will contact you|we’ll be in touch|your lo has the file|ssn|we pulled|fico/i);
assert.ok((whatNext?.actions ?? []).some((item) => item.label === "Upload more"));
assert.ok((whatNext?.actions ?? []).some((item) => item.label === "Ask Fox"));
assert.ok(!(whatNext?.actions ?? []).some((item) => item.label === "Upload this"));
assert.notEqual((whatNext?.actions ?? [])[0]?.label, "Request human");
const askFox = workspaceReply("Ask Fox", queued);
assert.equal(askFox?.text, MOTION_COPY.askFox);
assert.doesNotMatch(askFox?.text ?? "", /government ID|will contact you|we’ll be in touch|your lo has the file|ssn|we pulled/i);
assert.ok((askFox?.actions ?? []).some((item) => item.label === "What happens next?"));
assert.ok(!(askFox?.actions ?? []).some((item) => item.label === "Skip"));
assert.doesNotMatch(workspacePromptCopy("done", queued).followUp ?? "", /government ID|Purchase contract|Bank statement/i);
assert.equal(workspacePromptCopy("done", queued).text, MOTION_COPY.in_queue);
assert.ok((queued.previewOutbox ?? []).some((item) => item.to === "borrower@example.com"));
assert.ok((queued.events ?? []).some((event) => event.kind === "proceed"));

sitExpireReview();
assert.equal(reviewIsSitting(getFoxDraft()), true);
const nudged = nudgeReview();
assert.equal(nudged.threadLine, MOTION_COPY.nudge);
assert.equal(openReviewWorkItem(getFoxDraft())?.state, "nudged");
assert.equal(motionOf(getFoxDraft()), "in_queue");
assert.ok(getFoxMessages().some((message) => message.text === MOTION_COPY.nudge));

const returned = returnToFox({ note: "Need the latest W-2.", needsDoc: true });
assert.equal(returned.threadLine, "Need the latest W-2.");
assert.doesNotMatch(returned.threadLine, /government id/i);
assert.equal(motionOf(getFoxDraft()), "needs_you");
assert.equal(nextActorOf(getFoxDraft()), "You");
assert.equal(statusCopy(getFoxDraft()), "needs_you");
assert.ok((getFoxDraft().events ?? []).some((event) => event.kind === "return-to-fox" && event.text === "Need the latest W-2."));
assert.ok(previewFacts(getFoxDraft()).some((fact) => fact.id === "status" && fact.value === "needs_you"));
assert.ok(previewFacts(getFoxDraft()).some((fact) => fact.id === "next" && fact.value === "You"));
assert.ok(getFoxMessages().some((message) => message.text === "Need the latest W-2."));

const queuedDocs = queued.documents;
const queuedEmail = queued.contact.email.value;
assert.equal(shouldResumeWorkspaceEntry(), true);
const resumedQueue = continueWorkspaceFromEntry("acr");
assert.equal(motionOf(resumedQueue), "needs_you");
assert.equal(resumedQueue.productIntent, "buy");
assert.equal(resumedQueue.propertyValueAmount, 1_200_000);
assert.equal(resumedQueue.contact.email.value, queuedEmail);
assert.equal(resumedQueue.documents.length, queuedDocs.length);
assert.ok(resumedQueue.sampleAccepted);
assert.ok(previewFacts(resumedQueue).some((fact) => fact.id === "originator"));
assert.ok(getFoxMessages().some((message) => message.text === "Need the latest W-2."));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("850000", "680000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
applyCapture({ field: "email", value: "walk@onyx.test" });
applyCapture({ field: "proceed" });
const walkQueued = getFoxDraft();
assert.equal(motionOf(walkQueued), "in_queue");
assert.equal(walkQueued.scenario, null);
const walkRows = fileScenarioRows(walkQueued);
assert.ok(walkRows.some(([label, value]) => label === "Product" && value === "Buy"));
assert.ok(walkRows.some(([label, value]) => label === "Purchase price" && value === "$850,000"));
assert.ok(walkRows.some(([label, value]) => label === "Loan amount" && value === "$680,000"));
assert.ok(walkRows.some(([label, value]) => label === "Down payment"));
assert.equal(shouldResumeWorkspaceEntry(walkQueued), true);
const stillQueued = continueWorkspaceFromEntry("acr");
assert.equal(motionOf(stillQueued), "in_queue");
assert.equal(stillQueued.propertyValueAmount, 850000);
assert.equal(stillQueued.contact.email.value, "walk@onyx.test");
assert.ok(stillQueued.workItems?.some((item) => item.kind === "review"));
applyPreviewMotionControls({ nudge: "now" });
assert.equal(motionOf(getFoxDraft()), "in_queue");
assert.equal(getFoxDraft().propertyValueAmount, 850000);
assert.ok(getFoxMessages().some((message) => message.text === MOTION_COPY.nudge));
const paystubReturn = returnToFox({ note: "Need a clearer paystub.", needsDoc: true });
assert.equal(paystubReturn.threadLine, "Need a clearer paystub.");
assert.doesNotMatch(paystubReturn.threadLine, /government id/i);
assert.equal(motionOf(getFoxDraft()), "needs_you");
const afterReturnNav = continueWorkspaceFromEntry("acr");
assert.equal(motionOf(afterReturnNav), "needs_you");
assert.equal(afterReturnNav.propertyValueAmount, 850000);
assert.equal(afterReturnNav.productIntent, "buy");
assert.ok(afterReturnNav.sampleAccepted);
assert.ok(getFoxMessages().some((message) => message.text === "Need a clearer paystub."));
assert.ok(getFoxMessages().every((message) => !/i need government id from you/i.test(message.text)));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("1200000", "960000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
applyCapture({ field: "email", value: "hold@example.com" });
const missingBeforeHold = missingExtractClasses(getFoxDraft());
applyCapture({ field: "not-yet" });
const held = getFoxDraft();
assert.equal(motionOf(held), "on_hold");
assert.equal(statusCopy(held), "on_hold");
assert.equal(nextActorOf(held), "You");
assert.equal(workspacePromptCopy("done", held).text, MOTION_COPY.on_hold);
assert.deepEqual(missingExtractClasses(held), missingBeforeHold);
assert.ok(!openReviewWorkItem(held));
applyCapture({ field: "upload-more" });
const more = getFoxDraft();
assert.equal(more.docsOpen, true);
assert.ok(motionOf(more) === "gathering" || motionOf(more) === "ready");
assert.notEqual(motionOf(more), "in_queue");

applyCapture({ field: "talk-originator" });
assert.equal(motionOf(getFoxDraft()), "escalated");
assert.equal(nextActorOf(getFoxDraft()), "ONYX");
assert.equal(workspacePromptCopy("done", getFoxDraft()).text, MOTION_COPY.escalated);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("850000", "680000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
applyCapture({ field: "email", value: "queue-more@onyx.test" });
applyCapture({ field: "proceed" });
const queueForMore = getFoxDraft();
assert.equal(motionOf(queueForMore), "in_queue");
assert.ok(openReviewWorkItem(queueForMore));
const missingOnQueue = missingExtractClasses(queueForMore);
applyCapture({ field: "upload-more" });
const moreFromQueue = getFoxDraft();
assert.equal(moreFromQueue.docsOpen, true);
assert.equal(motionOf(moreFromQueue), "in_queue");
assert.ok(openReviewWorkItem(moreFromQueue));
assert.deepEqual(missingExtractClasses(moreFromQueue), missingOnQueue);
const moreFromQueueAsk = workspacePromptCopy("done", moreFromQueue);
assert.match(moreFromQueueAsk.text, /ONYX has this/);
assert.doesNotMatch(moreFromQueueAsk.text, /Government ID,|Purchase contract|Bank statement/i);
assert.ok((moreFromQueueAsk.actions ?? []).some((item) => item.label === "What happens next?"));
assert.ok((moreFromQueueAsk.actions ?? []).some((item) => item.label === "Ask Fox"));
assert.notEqual((moreFromQueueAsk.actions ?? [])[0]?.label, "Request human");
receiveDocument({
  slot: "id",
  name: "id.pdf",
  type: "application/pdf",
  size: 8000,
  receivedAt: "2026-08-21T00:00:00.000Z",
});
const afterQueueUpload = getFoxDraft();
assert.ok(openReviewWorkItem(afterQueueUpload));
assert.equal(afterQueueUpload.workItems?.filter((item) => item.kind === "review").length, 1);
assert.ok(motionOf(afterQueueUpload) === "gathering" || motionOf(afterQueueUpload) === "in_queue");
const afterQueueUploadAsk = workspacePromptCopy("done", afterQueueUpload);
assert.ok((afterQueueUploadAsk.actions ?? []).some((item) => item.label === "What happens next?"));
assert.ok((afterQueueUploadAsk.actions ?? []).some((item) => item.label === "Upload more"));
assert.ok((afterQueueUploadAsk.actions ?? []).some((item) => item.label === "Ask Fox"));
assert.ok((afterQueueUploadAsk.actions ?? []).some((item) => item.label === "Request human"));
assert.notEqual((afterQueueUploadAsk.actions ?? [])[0]?.label, "Request human");
applyCapture({ field: "talk-originator" });
assert.equal(motionOf(getFoxDraft()), "escalated");
assert.equal(nextActorOf(getFoxDraft()), "ONYX");
assert.ok(openReviewWorkItem(getFoxDraft()));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("500000", "400000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
applyCapture({ field: "email", value: "mvs@onyx.test" });
applyCapture({ field: "proceed" });
const mvsQueued = getFoxDraft();
assert.equal(motionOf(mvsQueued), "in_queue");
assert.equal(statusCopy(mvsQueued), "in_queue");
assert.equal(nextActorOf(mvsQueued), "ONYX");
assert.equal(waitingOnOf(mvsQueued), "onyx");
assert.ok(previewFacts(mvsQueued).some((fact) => fact.id === "status" && fact.value === "in_queue"));
assert.ok(previewFacts(mvsQueued).some((fact) => fact.id === "next" && fact.value === "ONYX"));
assert.ok(previewFacts(mvsQueued).some((fact) => fact.id === "waiting" && fact.value === "onyx"));
assert.equal(openReviewWorkItem(mvsQueued)?.kind, "review");
assert.ok(openReviewWorkItem(mvsQueued)?.state === "open" || openReviewWorkItem(mvsQueued)?.state === "nudged");
assert.equal((mvsQueued.workItems ?? []).filter((item) => item.kind === "review" && (item.state === "open" || item.state === "nudged")).length, 1);
assert.equal(workspacePromptCopy("done", mvsQueued).text, MOTION_COPY.in_queue);
assert.doesNotMatch(
  `${MOTION_COPY.in_queue} ${statusCopy(mvsQueued)} ${nextActorOf(mvsQueued)}`,
  /LO will contact you|we’ll be in touch|waiting for your originator/i,
);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("850000", "680000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "skip-time-on-job" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
applyCapture({ field: "skip-current-housing" });
applyCapture({ field: "skip-declarations" });
applyCapture({ field: "statedOtherReo", value: "none" });
applyCapture({ field: "start-docs" });
applyCapture({ field: "skip-docs" });
applyCapture({ field: "skip-borrower-name" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, DOC_INVITE_COPY.paystub);
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
applyCapture({ field: "skip-docs" });
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "property-address");
applyCapture({ field: "skip-property-address" });
assert.equal(workspacePrompt(getFoxDraft()), "citizenship");
applyCapture({ field: "skip-citizenship" });
assert.equal(workspacePrompt(getFoxDraft()), "assets");
applyCapture({ field: "skip-available-assets" });
assert.equal(workspacePrompt(getFoxDraft()), "review");
applyCapture({ field: "confirm-draft" });
if (workspacePrompt(getFoxDraft()) === "household") applyCapture({ field: "skip-household" });
if (workspacePrompt(getFoxDraft()) === "housing") applyCapture({ field: "skip-housing" });
applyCapture({ field: "email", value: "thin-queue@onyx.test" });
applyCapture({ field: "proceed" });
const thinQueued = getFoxDraft();
assert.equal(thinQueued.statedOtherReo, "none");
assert.equal(motionOf(thinQueued), "in_queue");
assert.equal(statusCopy(thinQueued), "in_queue");
assert.equal(nextActorOf(thinQueued), "ONYX");
assert.equal(workspacePromptCopy("done", thinQueued).text, "ONYX has this.");
assert.ok(previewFacts(thinQueued).some((fact) => fact.id === "status" && fact.value === "in_queue"));
assert.ok(previewFacts(thinQueued).some((fact) => fact.id === "next" && fact.value === "ONYX"));
assert.doesNotMatch(workspacePromptCopy("done", thinQueued).followUp ?? "", /government ID|Purchase contract|Mortgage statements for all properties owned/i);
assert.ok(
  !(stillUsefulSection(thinQueued)?.items ?? []).some(
    (item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS,
  ),
);
assert.ok(stillUsefulSection(thinQueued) && stillUsefulSection(thinQueued)!.items.length > 0);
assert.match(fileCompleteness(thinQueued)?.copy ?? "", new RegExp(`^sketch · \\d+ of ${CONVENTIONAL_FILE_SLOT_TOTAL}$`));
assert.ok(!/agency_ready/.test(fileCompleteness(thinQueued)?.copy ?? ""));
assert.ok(openReviewWorkItem(thinQueued));
const thinQualify = workspaceReply("will i qualify", thinQueued);
assert.doesNotMatch(thinQualify?.text ?? "", /you qualify|you are approved|you don.t qualify/i);
assert.match(`${thinQualify?.text ?? ""} ${thinQualify?.followUp ?? ""}`, /ONYX has this/);
assert.ok((thinQualify?.actions ?? []).some((item) => item.label === "What happens next?"));
assert.notEqual((thinQualify?.actions ?? [])[0]?.label, "Request human");

sitExpireReview();
assert.equal(reviewIsSitting(getFoxDraft()), true);
const mvsNudge = nudgeReview();
assert.equal(mvsNudge.threadLine, MOTION_COPY.nudge);
assert.match(mvsNudge.threadLine ?? "", /I pushed this/);
assert.ok(getFoxMessages().some((message) => message.text === MOTION_COPY.nudge));
assert.equal(motionOf(getFoxDraft()), "in_queue");

const silentReturn = returnToFox({ foxLine: "   " });
assert.equal(silentReturn.error, SILENT_RETURN_ERROR);
assert.equal(silentReturn.threadLine, "");
assert.equal(motionOf(getFoxDraft()), "in_queue");
assert.ok(!getFoxMessages().some((message) => message.text === SILENT_RETURN_ERROR));

const mvsReturn = returnToFox({
  foxLine: PAYSTUB_RETURN_LINE,
  next: "needs_you",
  needsDoc: true,
});
assert.equal(mvsReturn.threadLine, PAYSTUB_RETURN_LINE);
assert.equal(motionOf(getFoxDraft()), "needs_you");
assert.equal(nextActorOf(getFoxDraft()), "You");
assert.equal(waitingOnOf(getFoxDraft()), "borrower");
assert.ok(getFoxMessages().some((message) => message.text === PAYSTUB_RETURN_LINE));
assert.ok(
  stillUsefulSection(getFoxDraft())?.items.some((item) => /paystub/i.test(item.label)),
);
assert.ok((getFoxDraft().conditions ?? []).some((item) => item.stillUseful && item.waitingOn === "borrower"));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("500000", "400000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
applyCapture({ field: "email", value: "mvs-ask@onyx.test" });
applyCapture({ field: "proceed" });
const mvsAsk = getFoxDraft();
const queueChips = ["What happens next?", "Upload more", "Ask Fox"];
assertAnswerThenRestore(workspaceReply("What happens next?", mvsAsk), /ONYX|government ID|paystub/i, {
  labels: queueChips,
});
assertAnswerThenRestore(workspaceReply("will I qualify?", mvsAsk), /Not ready yet —/, {
  labels: queueChips,
});
assertAnswerThenRestore(workspaceReply("what will this cost me", mvsAsk), /fee quote|won.t invent/i, {
  labels: queueChips,
});
assert.doesNotMatch(
  stripReadinessAnswer(workspaceReply("will I qualify?", mvsAsk)?.text ?? ""),
  /you are approved|you will qualify|lock this|LO will contact/i,
);

const homepageFiles = [
  "app/(marketing)/page.tsx",
  "components/MembershipHero.tsx",
  "components/AcrBlock.tsx",
  "components/Closer.tsx",
  "components/fox/FoxShell.tsx",
].map((file) => readFileSync(join(root, file), "utf8"));
const homepageSource = homepageFiles.join("\n");
assert.equal(HOME_FOX_LINE, PATH_ASK_TEXT);
assert.ok(homepageSource.includes("HOME_FOX_LINE"));
assert.ok(readFileSync(join(root, "components/fox/homeIdle.ts"), "utf8").includes(PATH_ASK_TEXT));
assert.ok(!/Does this look right\?/.test(homepageSource));
assert.ok(!/Here’s a sample structure/.test(homepageSource));
assert.ok(!homepageSource.includes("HowItWorks"));
assert.ok(!homepageSource.includes("ComparisonTable"));
assert.ok(!homepageSource.includes("ProofStats"));
assert.ok(!homepageSource.includes("RateCard"));
assert.ok(!/talk to a licensed originator/i.test(homepageSource));
assert.ok(!/next step/i.test(homepageSource));
assert.ok(readFileSync(join(root, "components/MembershipHero.tsx"), "utf8").includes("HOME_IDLE_TEXT"));
const heroCss = readFileSync(join(root, "styles/hero.css"), "utf8");
assert.doesNotMatch(heroCss, /\.membership-hero__actions \{\s*display:\s*none;/);
assert.match(heroCss, /flex-direction:\s*column/);
assert.match(heroCss, /@media \(min-width: 1024px\)[\s\S]*flex-direction:\s*row/);
assert.ok(readFileSync(join(root, "components/MembershipHero.tsx"), "utf8").includes("Start your relationship"));
assert.ok(readFileSync(join(root, "components/MembershipHero.tsx"), "utf8").includes("Just need a mortgage"));
assert.ok(!homepageSource.includes("Start over"));
assert.ok(!readFileSync(join(root, "components/Closer.tsx"), "utf8").includes("Start over"));
const startPathSource = readFileSync(join(root, "components/products/startPath.ts"), "utf8");
assert.ok(startPathSource.includes('"/start?path=acr&fresh=1"') || startPathSource.includes("/start?path=acr&fresh=1"));
assert.ok(startPathSource.includes('"/start?path=loan&fresh=1"') || startPathSource.includes("/start?path=loan&fresh=1"));
assert.ok(startPathSource.includes("HOMEPAGE_FRESH_KEY"));
const homeIdleSource = readFileSync(join(root, "components/fox/homeIdle.ts"), "utf8");
assert.ok(homeIdleSource.includes("&intent=buy"));
assert.doesNotMatch(homeIdleSource, /intent=buy.*fresh=1|fresh=1.*intent=buy/);
const loReviewNav = readFileSync(join(root, "components/fox/LoReview.tsx"), "utf8");
assert.ok(loReviewNav.includes("/start?nudge=now"));
assert.doesNotMatch(loReviewNav, /\/start\?nudge=now.*fresh|fresh=1.*nudge=now/);

const startWorkspace = readFileSync(join(root, "components/fox/StartWorkspace.tsx"), "utf8");
assert.ok(!startWorkspace.includes("useDocumentReads"));
assert.ok(startWorkspace.includes("shouldResumeWorkspaceEntry"));
assert.ok(startWorkspace.includes("continueWorkspaceFromEntry"));
assert.ok(startWorkspace.includes("applyPreviewMotionControls"));
assert.ok(startWorkspace.includes('searchParams.get("suggest")'));
assert.ok(startWorkspace.includes('searchParams.get("fresh")'));
assert.ok(startWorkspace.includes("fresh: homepageFresh") || startWorkspace.includes("{ fresh: homepageFresh }"));
const dropSource = readFileSync(join(root, "components/fox/DocumentDrop.tsx"), "utf8");
assert.ok(dropSource.includes("/api/docs/upload"));
assert.ok(dropSource.includes("/api/docs/extract"));
assert.ok(dropSource.includes("FormData"));
assert.ok(dropSource.includes('form.append("file"'));
assert.ok(dropSource.includes("docs-handoff"));
assert.ok(dropSource.includes("await file.arrayBuffer()"));
assert.ok(dropSource.indexOf("await fetch(\"/api/docs/extract\"") < dropSource.indexOf("void storeBytes"));
assert.ok(!dropSource.includes("await storeBytes"));
assert.ok(!dropSource.includes("fileToBase64"));
assert.ok(dropSource.includes("quietLines: [FAILED_READ_NOTE]"));
assert.ok(dropSource.includes('aria-label="Upload"'));
assert.ok(dropSource.includes("onyx:fox-pick-file"));
assert.ok(dropSource.includes("requestFoxPickFile"));
assert.ok(!dropSource.includes(">Documents<"));
assert.ok(!dropSource.includes("/api/chat"));
assert.ok(!dropSource.includes("/api/heloc-quote"));
assert.ok(!dropSource.includes("/api/rateflow-quote"));
assert.ok(!dropSource.includes("setTimeout"));
const alwaysOn = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
assert.ok(alwaysOn.includes("/api/rateflow-quote"));
assert.ok(!alwaysOn.includes("/api/heloc-quote"));
assert.ok(!alwaysOn.includes("BANKINGBRIDGE_"));
assert.ok(
  alwaysOn.includes("file is prepared") ||
    alwaysOn.includes("still useful") ||
    alwaysOn.includes("this file can move") ||
    alwaysOn.includes("docs help next") ||
    alwaysOn.includes("upload what you have"),
);
assert.ok(alwaysOn.includes('prompt === "done"'));
assert.ok(alwaysOn.includes("FOX_THREAD_LINE_EVENT"));
assert.ok(alwaysOn.includes("shouldResumeWorkspaceEntry"));
assert.ok(alwaysOn.includes("fileExists(live)"));
assert.ok(!alwaysOn.includes('text: "Drop a file here."'));
assert.ok(!alwaysOn.includes("motionAskText({ ...live, docsOpen: true })"));
assert.ok(!alwaysOn.includes("motionAskText"));
assert.ok(alwaysOn.includes('workspacePromptCopy("done", live)'));
assert.ok(alwaysOn.includes("DECLINING_INCOME_CAUTION"));
assert.ok(alwaysOn.includes("isDeadFileWriteLine"));
assert.ok(alwaysOn.includes("docReactionAsk"));
assert.ok(alwaysOn.includes("isUnreadNote"));
assert.ok(alwaysOn.includes("shouldDeferStillUsefulAsk"));
assert.ok(alwaysOn.includes("holdDocsAskFox"));
assert.ok(dropSource.includes("shouldDeferStillUsefulAsk"));
assert.ok(!alwaysOn.includes("Updated identity from ID."));
assert.ok(!alwaysOn.includes("Updated income from tax return."));
assert.ok(!alwaysOn.includes("Updated from the document."));
assert.ok(!workspaceSrc.includes("Updated from the document."));
assert.ok(alwaysOn.includes("inertSupersededIncomeConfirms"));
assert.ok(alwaysOn.includes("Start over"));
assert.ok(alwaysOn.includes("startOverWorkspace"));
const storeSource = readFileSync(join(root, "components/fox/store.ts"), "utf8");
assert.ok(storeSource.includes("onyx.foxIntake.draft") || storeSource.includes("INTAKE_STORAGE_KEY"));
assert.ok(storeSource.includes("START_PATH_KEY"));
assert.ok(storeSource.includes("localStorage.removeItem"));
assert.ok(storeSource.includes("sessionStorage.removeItem"));
assert.ok(alwaysOn.includes("suggest ?? \"\"") || alwaysOn.includes('suggest ?? ""'));
assert.ok(storeSource.includes("function shouldResumeWorkspaceEntry") || storeSource.includes("export function shouldResumeWorkspaceEntry"));
assert.ok(storeSource.includes("fileExists(draft)"));
assert.ok(storeSource.includes("markHomepageFreshStart"));
assert.ok(storeSource.includes("startOverWorkspace(path)"));
assert.ok(!storeSource.includes("if (workspaceSessionStarted())"));
const motionSource = readFileSync(join(root, "components/fox/motion.ts"), "utf8");
assert.ok(motionSource.includes("function creditPullPermitted") || motionSource.includes("export function creditPullPermitted"));
assert.ok(motionSource.includes('motion === "in_queue"'));
assert.doesNotMatch(motionSource, /we pulled your credit|experian|equifax|transunion/i);
assert.ok(!motionSource.includes("Government ID. Most recent tax return. Prior-year return if available."));
assert.ok(motionSource.includes("This file can move. Proceed, or say not yet."));
assert.ok(motionSource.includes("ONYX has this."));
assert.doesNotMatch(motionSource, /LO will contact you/);
assert.ok(workspaceSrc.includes("CREDIT_STATED_NOTE") || workspaceSrc.includes("Stated · not a pull"));
assert.ok(workspaceSrc.includes("CREDIT_RANGE_ASK") || workspaceSrc.includes("What is your estimated FICO?"));
assert.doesNotMatch(workspaceSrc, /What credit range should I use for the estimate/);
assert.ok(!CREDIT_WORKSPACE_BUBBLES.some((item) => item.label === "Not sure" || item.value === "720-759" || item.value === "680-719"));
assert.doesNotMatch(
  readFileSync(join(root, "components/fox/household.ts"), "utf8"),
  /Are you buying this on your own, or with someone/,
);
assert.ok(alwaysOn.includes('startAsk === "credit"') || alwaysOn.includes("startAsk === \"credit\""));
assert.match(alwaysOn, /numberAsk \? "numeric"/);
assert.doesNotMatch(workspaceSrc, /we pulled your credit/i);
assert.ok(!homepageSource.includes("we pulled your credit"));
assert.ok(homepageSource.includes("HeroStartLink") || readFileSync(join(root, "components/MembershipHero.tsx"), "utf8").includes("HeroStartLink"));
const loReviewSource = readFileSync(join(root, "components/fox/LoReview.tsx"), "utf8");
assert.ok(loReviewSource.includes("fileScenarioRows"));
assert.ok(loReviewSource.includes("fileExportOf"));
assert.ok(loReviewSource.includes("Download mapped_json"));
assert.ok(loReviewSource.includes("Download FNMA 3.2"));
assert.ok(loReviewSource.includes("markFileExported"));
assert.ok(loReviewSource.includes("canDownload ?"));
assert.ok(loReviewSource.includes("Downloads stay off until the sketch"));
const startCss = readFileSync(join(root, "styles/start.css"), "utf8");
assert.ok(startCss.includes("scroll-padding-bottom"));
assert.ok(startCss.includes("scroll-margin-bottom") || startCss.includes("scroll-margin-top"));
assert.doesNotMatch(startCss, /min-height: 520px/);
assert.doesNotMatch(startCss, /padding-bottom: 168px/);
const foxSource = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
assert.ok(foxSource.includes("productIntentFromAction"));
assert.ok(workspaceSrc.includes("function productIntentFromAction") || workspaceSrc.includes("export function productIntentFromAction"));
assert.ok(workspaceSrc.includes("openingProductAskOpen"));
assert.ok(storeSource.includes("openingProductAskOpen"));
assert.ok(!foxSource.includes("composerPlaceholder("));
assert.ok(foxSource.includes('placeholder=""') || foxSource.includes("placeholder={"));
assert.ok(foxSource.includes("autoFocus={needsTyping}") || foxSource.includes("autoFocus={isStart || needsTyping}"));
assert.ok(workspaceSrc.includes("HOLD_DOCS_COPY") || workspaceSrc.includes("I’ll hold documents"));
assert.doesNotMatch(composerPlaceholder(afterIncome), /Ask ONYX Fox|Enter /);
assert.ok(foxSource.includes("lastFoxTurn"));
assert.ok(foxSource.includes("requestFoxPickFile"));
assert.ok(foxSource.includes("editLine"));
assert.ok(foxSource.includes("keep-line") || workspaceSrc.includes("keep-line"));
assert.ok(foxSource.includes("scrollIntoView"));
assert.ok(foxSource.includes('block: "end"'));
assert.ok(foxSource.includes("scrollDeltaToFollowLastLine"));
assert.ok(foxSource.includes("WorkspaceFileDock"));
assert.ok(foxSource.includes("scrollMarginTop") || foxSource.includes("scrollMarginBottom"));
assert.ok(startCss.includes("fox-file-chip"));
assert.ok(startCss.includes("file-sheet"));
assert.doesNotMatch(startCss, /max-height: min\(18dvh, 88px\)/);
assert.equal(scrollDeltaToClearAsk({ top: 514, bottom: 580 }, 514), 74);
assert.equal(scrollDeltaToClearAsk({ top: 100, bottom: 160 }, 700), 0);
assert.equal(scrollDeltaToClearAsk({ top: 4, bottom: 70 }, 700), -8);
assert.equal(scrollDeltaToFollowLastLine({ top: 514, bottom: 580 }, 514), 74);
assert.equal(scrollDeltaToFollowLastLine({ top: 100, bottom: 160 }, 700), 88);
assert.equal(scrollDeltaToFollowLastLine({ top: 4, bottom: 70 }, 700), -8);
assert.ok(foxSource.includes('line: field'));

const filePreview = readFileSync(join(root, "components/fox/FilePreview.tsx"), "utf8");
assert.ok(filePreview.includes("!draft.workspaceFlow"));
assert.ok(filePreview.includes("draft.docsOpen"));
assert.ok(filePreview.includes("sampleAccepted"));
assert.ok(filePreview.includes("fox-file-chip"));
assert.ok(filePreview.includes("file-sheet"));
assert.ok(filePreview.includes("Still useful"));
assert.ok(filePreview.includes("NOTHING_URGENT") || filePreview.includes("Nothing urgent missing."));
assert.equal(NOTHING_URGENT, "Nothing urgent missing.");
assert.ok(!filePreview.includes("helps next"));
assert.ok(!readFileSync(join(root, "components/fox/fileWrite.ts"), "utf8").includes(".slice(0, 3)"));
assert.ok(filePreview.includes("requestFoxFix"));
assert.ok(filePreview.includes("file-preview__edit"));
assert.ok(filePreview.includes('Edit ${fact.label}') || filePreview.includes("Edit "));
assert.ok(startCss.includes("fox-structure-notepad"));
assert.ok(startCss.includes("file-preview__edit"));
assert.ok(startCss.includes("text-decoration: underline"));
assert.doesNotMatch(startCss, /\.file-preview__edit[^{]*\{[^}]*display:\s*none/);
assert.doesNotMatch(startCss, /\.file-preview__row--tap[^{]*:hover[^{]*\.file-preview__edit/);
assert.ok(!filePreview.includes('workspacePrompt(draft) === "documents"'));
assert.ok(filePreview.includes("DocumentDrop"));
assert.ok(filePreview.includes('fact.id === "next"'));
assert.ok(filePreview.includes('fact.id === "file"') || filePreview.includes('id === "file"'));
const completenessSource = readFileSync(join(root, "components/fox/completeness.ts"), "utf8");
assert.ok(completenessSource.includes("function timelineFilled"));
assert.ok(completenessSource.includes("function currentAskIdle"));
assert.ok(completenessSource.includes("timelineFilled(draft)"));
assert.ok(completenessSource.includes("currentAskIdle(draft)"));
assert.ok(completenessSource.includes("propertyAddressSettled(draft)"));
assert.ok(completenessSource.includes("!historyGapNeeded(draft)"));
assert.ok(workspaceSrc.includes("function withFoxFirst") || workspaceSrc.includes("withFoxFirst"));
assert.ok(workspaceSrc.includes('if (!timelineFilled(draft) && !draft.timelineAsked) return "timeline"'));
assert.ok(workspaceSrc.includes("The notepad looks complete enough to move. Does it look right?"));
assert.ok(workspaceSrc.includes("What should I change?"));
assert.ok(!workspaceSrc.includes("Tap any line on the structure."));
assert.ok(foxSource.includes("docsHeld"));
assert.ok(!workspaceSrc.includes("Here’s the file. Does this look right?"));
assert.ok(workspaceSrc.includes("nextDocInvite"));
assert.ok(workspaceSrc.includes('label: "Upload this"'));
assert.ok(workspaceSrc.includes('label: "Start with ID"'));
assert.ok(workspaceSrc.includes("sketchAndStartDocsCopy") || workspaceSrc.includes("That’s the sketch."));
assert.ok(foxSource.includes("notepad looks complete") || workspaceSrc.includes("notepad looks complete"));
assert.ok(foxSource.includes("fox-bubble__edit"));
assert.ok(!foxSource.includes("fox-bubble__facts"));
assert.ok(!workspaceSrc.includes("Government ID. Most recent tax return. Prior-year return if available."));
assert.ok(workspaceSrc.includes("editingConfirmedDown") || workspaceSrc.includes("Still right?"));
assert.ok(workspaceSrc.includes('label: "Keep this"'));
assert.ok(workspaceSrc.includes("keep-line"));

const acrHero = readFileSync(join(root, "components/acr/AcrHero.tsx"), "utf8");
assert.ok(!/next right move/.test(acrHero));
const unlock = readFileSync(join(root, "components/acr/UnlockPath.tsx"), "utf8");
assert.ok(!/Unlock on the desk/.test(unlock));
assert.ok(unlock.includes("When the timing is wrong, Fox waits."));
const reward = readFileSync(join(root, "components/acr/RewardFolio.tsx"), "utf8");
assert.ok(!/Explore a scenario to see an estimated reward range/.test(reward));
const scout = readFileSync(join(root, "components/acr/DeskPreview.tsx"), "utf8");
assert.ok(scout.includes("PUBLIC_SCOUT_WAIT"));
assert.ok(!scout.includes("Equity available"));
const scoutCopy = readFileSync(join(root, "components/acr/acrHome.ts"), "utf8");
assert.ok(scoutCopy.includes("When the timing is wrong, Fox waits."));

async function extractAdapterSmoke() {
  const thrown = await classifyAndExtract(new Uint8Array([1, 2, 3, 4]), "image/png", {
    async classify() {
      throw new Error("xAI 400: image part must be a data URL");
    },
    async extract() {
      throw new Error("should not extract");
    },
  });
  assert.equal(thrown.failed, true);
  assert.equal(thrown.extractClass, "other");
  assert.deepEqual(thrown.fields, {});
  assert.ok(thrown.warnings.includes("failed"));

  const afterClassifyThrow = await classifyAndExtract(new Uint8Array([1, 2, 3, 4]), "image/png", {
    async classify() {
      return { class: "paystub" as const, confidence: 0.91, readable: true };
    },
    async extract() {
      throw new Error("xAI 503 model down");
    },
  });
  assert.equal(afterClassifyThrow.failed, true);
  assert.equal(afterClassifyThrow.extractClass, "paystub");
  assert.deepEqual(afterClassifyThrow.fields, {});

  const blank = await classifyAndExtract(new Uint8Array(80), "image/png", {
    async classify() {
      return { class: "other" as const, confidence: 0.05, readable: false };
    },
    async extract() {
      throw new Error("should not invent");
    },
  });
  assert.equal(blank.failed, true);
  assert.deepEqual(blank.fields, {});

  const hintedK1 = await classifyAndExtract(
    new Uint8Array([1, 2, 3, 4]),
    "image/png",
    {
      async classify() {
        return { class: "other" as const, confidence: 0.35, readable: true };
      },
      async extract(_bytes, _media, extractClass) {
        assert.equal(extractClass, "tax_return");
        return {
          fields: {
            tax_year: "2024",
            return_kind: "k1",
            k1_ordinary_income: "40000",
          },
          warnings: [],
        };
      },
    },
    "tax_return",
  );
  assert.equal(hintedK1.failed, undefined);
  assert.equal(hintedK1.extractClass, "tax_return");
  assert.equal(hintedK1.fields.k1_ordinary_income, "40000");

  const filenameDoesNotInvent = await classifyAndExtract(
    new Uint8Array([1, 2, 3, 4]),
    "image/png",
    {
      async classify() {
        throw new Error("xAI 400: image part must be a data URL");
      },
      async extract() {
        throw new Error("must not invent from filename");
      },
    },
    "w2",
    "w2-ot-bonus-2025.png",
  );
  assert.equal(filenameDoesNotInvent.failed, true);
  assert.deepEqual(filenameDoesNotInvent.fields, {});
  assert.equal(filenameDoesNotInvent.fields.overtime, undefined);

  const adapterMissedOt = await classifyAndExtract(
    new Uint8Array([1, 2, 3, 4]),
    "image/png",
    {
      async classify() {
        return { class: "w2" as const, confidence: 0.9, readable: true };
      },
      async extract() {
        return { fields: { tax_year: "2025", employer_name: "HARBOR STEEL", wages: "84000" }, warnings: [] };
      },
    },
    "w2",
    "w2-ot-bonus-2025.png",
  );
  assert.equal(adapterMissedOt.fields.wages, "84000");
  assert.equal(adapterMissedOt.fields.overtime, undefined);

  const unreadHarborFilename = await classifyAndExtract(
    new Uint8Array([1, 2, 3, 4]),
    "image/png",
    {
      async classify() {
        return { class: "paystub" as const, confidence: 0.2, readable: false };
      },
      async extract() {
        throw new Error("must not invent from filename");
      },
    },
    "paystub",
    "paystub-harbor.png",
  );
  assert.equal(unreadHarborFilename.failed, true);
  assert.deepEqual(unreadHarborFilename.fields, {});

  const failingAdapter = {
    async classify() {
      throw new Error("adapter down — read the page");
    },
    async extract() {
      throw new Error("adapter down — read the page");
    },
  };
  const otFromPage = printedSampleFromBytes(readFileSync(join(root, "scripts/fixtures/w2-ot-bonus-2025.png")));
  assert.equal(otFromPage?.extractClass, "w2");
  assert.equal(otFromPage?.fields.overtime, "6000");
  assert.equal(otFromPage?.fields.wages, "84000");
  assert.equal(otFromPage?.fields.employer_name, "HARBOR STEEL");
  const stubFromPage = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/paystub-ot-bonus-2026.png")),
  );
  assert.equal(stubFromPage?.extractClass, "paystub");
  assert.equal(stubFromPage?.fields.overtime_ytd, "12000");
  assert.equal(stubFromPage?.fields.gross_period, "7000");
  const schCFromPage = printedSampleFromBytes(readFileSync(join(root, "scripts/fixtures/return-2023.png")));
  assert.equal(schCFromPage?.extractClass, "tax_return");
  assert.equal(schCFromPage?.fields.return_kind, "schedule_c");
  assert.equal(schCFromPage?.fields.schedule_c_net_profit, "80000");
  assert.equal(schCFromPage?.fields.depreciation, "8000");
  assert.equal(schCFromPage?.fields.depletion, "0");
  assert.equal(schCFromPage?.fields.business_use_of_home, "0");
  const decliningFromPage = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/return-declining-2024.png")),
  );
  assert.equal(decliningFromPage?.fields.schedule_c_net_profit, "66000");
  assert.equal(decliningFromPage?.fields.depreciation, "6000");
  assert.equal(decliningFromPage?.fields.depletion, undefined);
  const k1FromPage = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/entity-ordinary-2024.png")),
  );
  assert.equal(k1FromPage?.extractClass, "tax_return");
  assert.equal(k1FromPage?.fields.return_kind, "k1");
  assert.equal(k1FromPage?.fields.k1_ordinary_income, "40000");
  assert.equal(k1FromPage?.fields.k1_distributions, undefined);

  const pageOt = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/w2-ot-bonus-2025.png")),
    "image/png",
    failingAdapter,
  );
  assert.equal(pageOt.extractClass, "w2");
  assert.equal(pageOt.fields.overtime, "6000");
  assert.equal(pageOt.fields.wages, "84000");
  const pageSchC = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/return-2023.png")),
    "image/png",
    failingAdapter,
  );
  assert.equal(pageSchC.extractClass, "tax_return");
  assert.equal(pageSchC.fields.schedule_c_net_profit, "80000");
  assert.equal(pageSchC.fields.depreciation, "8000");

  const sabotageBytes = readFileSync(join(root, "scripts/fixtures/bank-statement-sabotage.png"));
  const sabotageComment = readPngPrintedLines(sabotageBytes);
  const sabotageVisible = readPngVisibleLines(sabotageBytes);
  assert.ok(sabotageComment?.some((line) => /HARBOR STEEL/.test(line)));
  assert.ok(sabotageComment?.some((line) => /OVERTIME: \$6,000/.test(line)));
  assert.ok(sabotageVisible?.some((line) => /FIRST NATIONAL/.test(line)));
  assert.ok(!sabotageVisible?.some((line) => /HARBOR STEEL/.test(line)));
  const sabotage = await classifyAndExtract(
    sabotageBytes,
    "image/png",
    failingAdapter,
    "w2",
    "w2-ot-bonus-2025.png",
  );
  assert.equal(sabotage.extractClass, "bank_statement");
  assert.equal(sabotage.fields.institution, "FIRST NATIONAL");
  assert.equal(sabotage.fields.ending_balance, "18400");
  assert.equal(sabotage.fields.period_end, "2026-07-31");
  assert.equal(sabotage.fields.overtime, undefined);
  assert.equal(sabotage.fields.employer_name, undefined);
  assert.equal(sabotage.fields.wages, undefined);
  const lyingAdapter = {
    async classify() {
      return { class: "w2" as const, confidence: 0.99, readable: true };
    },
    async extract() {
      return {
        fields: { tax_year: "2025", employer_name: "HARBOR STEEL", wages: "84000", overtime: "6000" },
        warnings: [],
      };
    },
  };
  const sabotageOverLie = await classifyAndExtract(
    sabotageBytes,
    "image/png",
    lyingAdapter,
    "w2",
    "w2-ot-bonus-2025.png",
  );
  assert.equal(sabotageOverLie.extractClass, "bank_statement");
  assert.equal(sabotageOverLie.fields.institution, "FIRST NATIONAL");
  assert.equal(sabotageOverLie.fields.ending_balance, "18400");
  assert.equal(sabotageOverLie.fields.overtime, undefined);
  assert.equal(sabotageOverLie.fields.wages, undefined);
  assert.deepEqual(
    EXTRACT_SCHEMA_KEYS.bank_statement.slice(),
    ["institution", "period_end", "ending_balance", "account_type", "account_last4", "present_address"],
  );
  assert.deepEqual(
    EXTRACT_SCHEMA_KEYS.purchase_contract.slice(),
    [
      "property_address",
      "purchase_price",
      "close_date",
      "property_type",
      "year_built",
      "units",
      "annual_taxes",
      "hoa_monthly",
    ],
  );
  assert.deepEqual(
    EXTRACT_SCHEMA_KEYS.mortgage_statement.slice(),
    [
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
  );

  const pageBank = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/bank-statement-first-national.png")),
  );
  assert.equal(pageBank?.extractClass, "bank_statement");
  assert.equal(pageBank?.fields.institution, "FIRST NATIONAL");
  assert.equal(pageBank?.fields.ending_balance, "18400");
  const pageContract = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/purchase-contract-oak.png")),
  );
  assert.equal(pageContract?.extractClass, "purchase_contract");
  assert.equal(pageContract?.fields.property_address, "14 OAK STREET");
  assert.equal(pageContract?.fields.purchase_price, "1200000");
  const pageMortgage = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/mortgage-statement-oak.png")),
  );
  assert.equal(pageMortgage?.extractClass, "mortgage_statement");
  assert.equal(pageMortgage?.fields.servicer, "OAK SERVICING");
  assert.equal(pageMortgage?.fields.unpaid_principal, "960000");
  assert.equal(pageMortgage?.fields.current_pi, "4800");
  const pageMortgageNoPi = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/mortgage-statement-oak-no-pi.png")),
  );
  assert.equal(pageMortgageNoPi?.extractClass, "mortgage_statement");
  assert.equal(pageMortgageNoPi?.fields.unpaid_principal, "960000");
  assert.equal(pageMortgageNoPi?.fields.current_pi, undefined);
  const pagePine = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/mortgage-statement-pine.png")),
  );
  assert.equal(pagePine?.extractClass, "mortgage_statement");
  assert.equal(pagePine?.fields.current_pi, "3850");
  assert.equal(pagePine?.fields.property_address, "88 PINE ROAD");
  const pageCedar = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/mortgage-statement-cedar.png")),
  );
  assert.equal(pageCedar?.extractClass, "mortgage_statement");
  assert.equal(pageCedar?.fields.current_pi, "1800");
  const pageId = printedSampleFromBytes(
    readFileSync(join(root, "scripts/fixtures/government-id-jordan.png")),
  );
  assert.equal(pageId?.extractClass, "government_id");
  assert.equal(pageId?.fields.full_name, "JORDAN HALE");
  assert.equal(pageId?.fields.present_address, undefined);
  const deadVision = {
    async classify(): Promise<never> {
      throw new Error("xAI 503");
    },
    async extract(): Promise<never> {
      throw new Error("xAI 503");
    },
  };
  const pineWithoutVision = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/mortgage-statement-pine.png")),
    "image/png",
    deadVision,
  );
  assert.equal(pineWithoutVision.extractClass, "mortgage_statement");
  assert.equal(pineWithoutVision.fields.current_pi, "3850");
  assert.equal(pineWithoutVision.failed, undefined);
  const idWithoutVision = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-jordan.png")),
    "image/png",
    deadVision,
  );
  assert.equal(idWithoutVision.extractClass, "government_id");
  assert.equal(idWithoutVision.fields.full_name, "JORDAN HALE");
  assert.equal(idWithoutVision.fields.present_address, undefined);

  const pdfId = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-jordan.pdf")),
    "application/pdf",
    deadVision,
  );
  assert.equal(pdfId.extractClass, "government_id");
  assert.equal(pdfId.fields.full_name, "JORDAN HALE");
  assert.equal(pdfId.fields.present_address, undefined);
  assert.equal(pdfId.failed, undefined);
  const pdfStub = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/paystub-acme.pdf")),
    "application/pdf",
    deadVision,
  );
  assert.equal(pdfStub.extractClass, "paystub");
  assert.equal(pdfStub.fields.employer_name, "ACME");
  assert.equal(pdfStub.fields.gross_period, "4230.77");
  assert.equal(pdfStub.fields.ytd_gross, "29615.39");
  const pdfW2 = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/w2-ot-bonus-2025.pdf")),
    "application/pdf",
    deadVision,
  );
  assert.equal(pdfW2.extractClass, "w2");
  assert.equal(pdfW2.fields.employer_name, "HARBOR STEEL");
  assert.equal(pdfW2.fields.wages, "84000");
  const blankPdf = await classifyAndExtract(
    new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
    "application/pdf",
    deadVision,
  );
  assert.equal(blankPdf.failed, true);
  assert.deepEqual(blankPdf.fields, {});
  assert.ok(blankPdf.warnings.includes("no-text-layer"));

  const aliasIdPdf = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-name-alias.pdf")),
    "application/pdf",
    deadVision,
  );
  assert.equal(aliasIdPdf.extractClass, "government_id");
  assert.equal(aliasIdPdf.fields.full_name, "JORDAN HALE");
  assert.equal(aliasIdPdf.fields.present_address, "14 OAK STREET");
  const aliasStubPdf = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/paystub-gross-pay-alias.pdf")),
    "application/pdf",
    deadVision,
  );
  assert.equal(aliasStubPdf.extractClass, "paystub");
  assert.equal(aliasStubPdf.fields.employer_name, "HARBOR STEEL");
  assert.equal(aliasStubPdf.fields.gross_period, "7000");
  assert.equal(aliasStubPdf.fields.ytd_gross, "49000");
  const aliasW2Pdf = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/w2-box1-alias.pdf")),
    "application/pdf",
    deadVision,
  );
  assert.equal(aliasW2Pdf.extractClass, "w2");
  assert.equal(aliasW2Pdf.fields.employer_name, "HARBOR STEEL");
  assert.equal(aliasW2Pdf.fields.wages, "84000");
  const unlabeledPdf = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-unlabeled-text.pdf")),
    "application/pdf",
    deadVision,
    null,
    "id.pdf",
  );
  assert.equal(unlabeledPdf.failed, true);
  assert.deepEqual(unlabeledPdf.fields, {});
  assert.equal(unlabeledPdf.fields.full_name, undefined);
  const noLayerPdf = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-no-text-layer.pdf")),
    "application/pdf",
    deadVision,
    null,
    "id.pdf",
  );
  assert.equal(noLayerPdf.failed, true);
  assert.ok(noLayerPdf.warnings.includes("no-text-layer"));
  assert.equal(noLayerPdf.extractClass, "government_id");

  const extractSrc = readFileSync(join(root, "lib/docs/extract.ts"), "utf8");
  assert.doesNotMatch(extractSrc, /printedSampleFromFilename|BY_NAME/);
  assert.match(extractSrc, /readPrintedSample\(bytes\)/);
  const classifiedK1 = await classifyAndExtract(new Uint8Array([9, 8, 7]), "image/png", {
    async classify() {
      return { class: "k1" as never, confidence: 0.9, readable: true };
    },
    async extract(_bytes, _media, extractClass) {
      assert.equal(extractClass, "tax_return");
      return { fields: { tax_year: "2024", return_kind: "k1", k1_ordinary_income: "40000" }, warnings: [] };
    },
  });
  assert.equal(classifiedK1.extractClass, "tax_return");
  assert.equal(classifiedK1.fields.k1_ordinary_income, "40000");

  const { POST: extractRoutePost } = await import("../app/api/docs/extract/route");
  const pineBytes = readFileSync(join(root, "scripts/fixtures/mortgage-statement-pine.png"));
  const form = new FormData();
  form.append(
    "file",
    new File([pineBytes], "doc-mortgage.png", { type: "image/png" }),
    "doc-mortgage.png",
  );
  form.append("name", "doc-mortgage.png");
  form.append("type", "image/png");
  form.append("bytesRef", "https://example.blob.vercel-storage.com/missing-should-not-be-read");
  const handedOff = await extractRoutePost(
    new Request("http://local/api/docs/extract", { method: "POST", body: form }),
  );
  const handed = (await handedOff.json()) as {
    class?: string;
    fields?: Record<string, string>;
    failed?: boolean;
    source?: string;
  };
  assert.equal(handedOff.status, 200);
  assert.equal(handed.source, "file");
  assert.equal(handed.failed, false);
  assert.equal(handed.class, "mortgage_statement");
  assert.equal(handed.fields?.current_pi, "3850");
  const extractRouteSrc = readFileSync(join(root, "app/api/docs/extract/route.ts"), "utf8");
  assert.match(extractRouteSrc, /source: "file"/);
  assert.match(extractRouteSrc, /readPrivateBytes/);
  const storageSrc = readFileSync(join(root, "lib/docs/storage.ts"), "utf8");
  assert.match(storageSrc, /useCache: false/);
  assert.match(storageSrc, /blob\.vercel-storage\.com|blobRefsToTry/);
}

function assertNoSketchReplay(text: string) {
  assert.doesNotMatch(
    text,
    /primary residence|second home|investment|estimated FICO|income earned|How long have you been at this job|What’s your name|other real estate|another borrower/i,
  );
}

assert.equal(workspacePrompt(afterIncome), "documents");
const handOffAsk = workspacePromptCopy("documents", afterIncome);
assert.match(handOffAsk.text, /That’s the sketch/i);
const loanEditHandOff = beginFileEdit({ ...afterIncome, correctingLine: "loan" }, "amount");
assert.equal(loanEditHandOff.correcting, "amount");
assert.equal(loanEditHandOff.resumeAfterEdit, "documents");
assert.equal(workspacePrompt(loanEditHandOff), "amount");
const skipLoanHandOff = workspaceReply("Skip", loanEditHandOff);
assert.equal(skipLoanHandOff?.capture?.field, "skip-amount");
assert.match(skipLoanHandOff?.text ?? "", /That’s the sketch/i);
assertNoSketchReplay(skipLoanHandOff?.text ?? "");
assert.equal(
  workspacePrompt({
    ...loanEditHandOff,
    amountAsked: true,
    loanAmountValue: undefined,
    correcting: null,
    correctingLine: null,
  }),
  "documents",
);
const typedLoanHandOff = workspaceReply("960000", loanEditHandOff);
assert.equal(typedLoanHandOff?.capture?.field, "loanAmount");
assert.match(typedLoanHandOff?.text ?? "", /That’s the sketch/i);
assertNoSketchReplay(typedLoanHandOff?.text ?? "");

const seOnTaxReturn = skipCurrentInvite({ ...seIncome, docsStarted: true });
assert.equal(workspacePrompt(seOnTaxReturn), "documents");
assert.equal(workspacePromptCopy("documents", seOnTaxReturn).text, DOC_INVITE_COPY.tax_return);
const loanEditMidDocs = beginFileEdit({ ...seOnTaxReturn, correctingLine: "loan" }, "amount");
assert.equal(loanEditMidDocs.resumeAfterEdit, "documents");
assert.equal(workspacePrompt(loanEditMidDocs), "amount");
assert.notEqual(workspacePrompt(loanEditMidDocs), "documents");
const skipLoanMidDocs = workspaceReply("Skip", loanEditMidDocs);
assert.equal(skipLoanMidDocs?.capture?.field, "skip-amount");
assert.equal(skipLoanMidDocs?.text, DOC_INVITE_COPY.tax_return);
assertNoSketchReplay(skipLoanMidDocs?.text ?? "");
const typedLoanMidDocs = workspaceReply("960000", loanEditMidDocs);
assert.equal(typedLoanMidDocs?.capture?.field, "loanAmount");
assert.equal(typedLoanMidDocs?.text, DOC_INVITE_COPY.tax_return);

const occEditMidDocs = beginFileEdit(seOnTaxReturn, "occupancy");
assert.equal(occEditMidDocs.resumeAfterEdit, "documents");
const secondHomeEdit = workspaceReply("Second home", occEditMidDocs);
assert.equal(secondHomeEdit?.capture?.field, "occupancy");
assert.equal(secondHomeEdit?.capture && "value" in secondHomeEdit.capture ? secondHomeEdit.capture.value : "", "second-home");
assert.equal(secondHomeEdit?.text, DOC_INVITE_COPY.tax_return);
assertNoSketchReplay(secondHomeEdit?.text ?? "");
const afterSecondHome = {
  ...seOnTaxReturn,
  occupancyChoice: { ...seOnTaxReturn.occupancyChoice, value: "second-home" },
  occupancyAsked: true,
};
assert.equal(
  fileSummaryFacts(afterSecondHome).find((fact) => fact.id === "occupancy")?.value,
  "Second home",
);
assert.ok(
  !fileSummaryFacts(afterSecondHome).some((fact) => fact.id === "occupancy" && fact.value === "Primary"),
);

const nameEditMidDocs = beginFileEdit(seOnTaxReturn, "borrower-name");
assert.equal(nameEditMidDocs.resumeAfterEdit, "documents");
const nameEditReply = workspaceReply("Ada Lovelace", nameEditMidDocs);
assert.equal(nameEditReply?.capture?.field, "borrowerName");
assert.equal(nameEditReply?.text, DOC_INVITE_COPY.tax_return);
assertNoSketchReplay(nameEditReply?.text ?? "");

const jobEditMidDocs = beginFileEdit(
  { ...afterIncome, docsStarted: true, statedTimeOnJob: 36, statedTimeOnJobLabel: "3 years", timeOnJobAsked: true },
  "time-on-job",
);
assert.equal(jobEditMidDocs.resumeAfterEdit, "documents");
const jobEditReply = workspaceReply("18 months", jobEditMidDocs);
assert.equal(jobEditReply?.capture?.field, "statedTimeOnJob");
assert.equal(workspacePromptCopy("documents", { ...afterIncome, docsStarted: true }).text, DOC_INVITE_COPY.government_id);
assert.match(jobEditReply?.text ?? "", /government ID|Start with ID/i);

const handOffNoHousehold = draft({
  ...afterIncome,
  householdAsked: false,
  statedHousehold: undefined,
});
assert.equal(workspacePrompt(handOffNoHousehold), "documents");
const loanEditNoHousehold = beginFileEdit(handOffNoHousehold, "amount");
assert.equal(loanEditNoHousehold.resumeAfterEdit, "documents");
assert.equal(
  workspacePrompt({
    ...loanEditNoHousehold,
    amountAsked: true,
    loanAmountValue: undefined,
    correcting: null,
    correctingLine: null,
  }),
  "documents",
);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "850000" });
applyCapture({ field: "propose-funds", value: "170000:680000" });
applyCapture({ field: "accept-proposal" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "skip-time-on-job" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
applyCapture({ field: "skip-current-housing" });
applyCapture({ field: "skip-declarations" });
applyCapture({ field: "skip-borrower-name" });
applyCapture({ field: "skip-other-reo" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(getFoxDraft().householdAsked, undefined);
const storeHandOff = workspacePromptCopy("documents", getFoxDraft()).text;
applyCapture({ field: "correct", value: "amount", line: "loan" });
assert.equal(getFoxDraft().correcting, "amount");
assert.equal(getFoxDraft().resumeAfterEdit, "documents");
assert.equal(workspacePrompt(getFoxDraft()), "amount");
applyCapture({ field: "skip-amount" });
assert.equal(getFoxDraft().correcting, null);
assert.equal(getFoxDraft().resumeAfterEdit, "documents");
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, storeHandOff);
assert.equal(getFoxDraft().occupancyChoice.value, "primary");
assert.equal(getFoxDraft().creditBand, "760+");
assert.equal(getFoxDraft().incomeType.value, "w2");
assert.equal(getFoxDraft().borrowerNameAsked, true);
assert.equal(getFoxDraft().otherReoAsked, true);
assert.notEqual(workspacePrompt(getFoxDraft()), "occupancy");
assert.notEqual(workspacePrompt(getFoxDraft()), "credit");
assert.notEqual(workspacePrompt(getFoxDraft()), "income");
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
applyCapture({ field: "correct", value: "occupancy", line: "occupancy" });
assert.equal(getFoxDraft().resumeAfterEdit, "documents");
applyCapture({ field: "occupancy", value: "second-home" });
assert.equal(getFoxDraft().occupancyChoice.value, "second-home");
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(
  fileSummaryFacts(getFoxDraft()).find((fact) => fact.id === "occupancy")?.value,
  "Second home",
);
applyCapture({ field: "start-docs" });
assert.equal(getFoxDraft().resumeAfterEdit, undefined);
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, DOC_INVITE_COPY.government_id);
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
assert.notEqual(workspacePrompt(getFoxDraft()), "borrower-name");

const skipLoanStatus = workspaceUpdateCopy(
  { field: "skip-amount" },
  draft({
    ...afterFunds,
    correcting: "amount",
    correctingLine: "loan",
    propertyValueAmount: 850000,
    loanAmountValue: 680000,
  }),
);
assert.match(skipLoanStatus, /loan amount left blank/i);
assert.doesNotMatch(skipLoanStatus, /purchase price/i);
const writeLoanStatus = workspaceUpdateCopy(
  { field: "loanAmount", value: "640000" },
  draft({
    ...afterFunds,
    correcting: "amount",
    correctingLine: "loan",
    propertyValueAmount: 850000,
  }),
);
assert.match(writeLoanStatus, /loan amount/i);
assert.doesNotMatch(writeLoanStatus, /purchase price/i);

function assertFicoStaysOnIncome(reply: ReturnType<typeof workspaceReply>) {
  assert.equal(reply?.capture?.field, "creditRange");
  assert.match(reply?.text ?? "", /income earned/i);
  assert.doesNotMatch(reply?.text ?? "", /how long ago|their name|another borrower/i);
}

assertFicoStaysOnIncome(workspaceReply("720–739", afterFunds));
assertFicoStaysOnIncome(workspaceReply("742", afterFunds));
assert.equal(parseDeclarationTiming("742"), undefined);
assert.equal(parseDeclarationTiming("720-739"), undefined);
assert.equal(parseDeclarationTiming("720–739"), undefined);
assert.equal(parseDeclarations("742"), undefined);
assert.equal(parseDeclarations("720–739"), undefined);
assert.equal(parseDeclarationTiming("March 2021"), "March 2021");
assert.equal(parseDeclarations("I had a foreclosure"), "event");

const ficoWithLeftover = workspaceReply(
  "720–739",
  draft({
    ...afterFunds,
    statedDeclaration: "event",
    declarationAsked: true,
    statedHousehold: "with_someone",
    householdAsked: true,
    docsStarted: true,
    coborrowerName: "Alex",
  }),
);
assertFicoStaysOnIncome(ficoWithLeftover);
assert.equal(
  workspacePrompt({
    ...afterFunds,
    creditAsked: true,
    creditBand: "720-739",
    statedDeclaration: "event",
    declarationAsked: true,
  }),
  "income",
);

assert.notEqual(workspacePrompt(afterCredit), "declaration-timing");
assert.notEqual(workspacePrompt(afterCredit), "coborrower-name");
assert.notEqual(workspacePrompt(afterIncome), "coborrower-name");
assert.notEqual(
  workspacePrompt(draft({ ...afterIncome, docsStarted: true, householdAsked: false })),
  "coborrower-name",
);
assert.equal(
  workspacePrompt(
    draft({
      ...afterIncome,
      docsStarted: true,
      householdAsked: true,
      statedHousehold: "with_someone",
    }),
  ),
  "documents",
);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "850000" });
applyCapture({ field: "propose-funds", value: "170000:680000" });
applyCapture({ field: "accept-proposal" });
assert.equal(workspacePrompt(getFoxDraft()), "credit");
applyCapture({ field: "creditRange", value: "720-739" });
assert.equal(getFoxDraft().creditBand, "720-739");
assert.equal(workspacePrompt(getFoxDraft()), "income");
assert.notEqual(workspacePrompt(getFoxDraft()), "declaration-timing");
assert.notEqual(workspacePrompt(getFoxDraft()), "coborrower-name");
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
applyCapture({ field: "creditRange", value: "742" });
assert.equal(getFoxDraft().creditBand, "742");
assert.equal(workspacePrompt(getFoxDraft()), "income");
applyCapture({ field: "correct", value: "amount", line: "loan" });
applyCapture({ field: "skip-amount" });
assert.match(workspaceUpdateCopy({ field: "skip-amount" }, getFoxDraft()), /loan amount left blank/i);
assert.doesNotMatch(workspaceUpdateCopy({ field: "skip-amount" }, getFoxDraft()), /purchase price/i);
assert.equal(getFoxDraft().propertyValueAmount, 850000);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "850000" });
applyCapture({ field: "propose-funds", value: "170000:680000" });
applyCapture({ field: "accept-proposal" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "skip-time-on-job" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
applyCapture({ field: "skip-current-housing" });
applyCapture({ field: "skip-declarations" });
assert.equal(workspacePrompt(getFoxDraft()), "other-reo");
assert.notEqual(workspacePrompt(getFoxDraft()), "borrower-name");
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
applyCapture({ field: "skip-other-reo" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.doesNotMatch(
  `${workspacePromptCopy("documents", getFoxDraft()).text} ${workspacePromptCopy("documents", getFoxDraft()).followUp ?? ""}`,
  /What name should I put|another borrower/i,
);
applyCapture({ field: "start-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, DOC_INVITE_COPY.government_id);
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
assert.notEqual(workspacePrompt(getFoxDraft()), "borrower-name");
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "borrower-name");
applyCapture({ field: "skip-borrower-name" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, DOC_INVITE_COPY.paystub);
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, DOC_INVITE_COPY.w2);
assert.doesNotMatch(
  `${workspacePromptCopy("documents", getFoxDraft()).text} ${workspacePromptCopy("documents", getFoxDraft()).followUp ?? ""}`,
  /another borrower|Is there another borrower/i,
);
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "property-address");
applyCapture({ field: "skip-property-address" });
assert.equal(workspacePrompt(getFoxDraft()), "citizenship");
applyCapture({ field: "skip-citizenship" });
assert.equal(workspacePrompt(getFoxDraft()), "assets");
applyCapture({ field: "skip-available-assets" });
assert.equal(workspacePrompt(getFoxDraft()), "review");
assert.doesNotMatch(workspacePromptCopy("review", getFoxDraft()).text, /another borrower/i);
applyCapture({ field: "confirm-draft" });
assert.equal(workspacePrompt(getFoxDraft()), "household");
assert.equal(workspacePromptCopy("household", getFoxDraft()).text, HOUSEHOLD_ASK);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
applyCapture({ field: "propertyValue", value: "850000" });
applyCapture({ field: "propose-funds", value: "170000:680000" });
applyCapture({ field: "accept-proposal" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "self-employed" });
applyCapture({ field: "skip-years-in-business" });
applyCapture({ field: "skip-monthly-debts" });
applyCapture({ field: "skip-available-assets" });
applyCapture({ field: "skip-property-type" });
applyCapture({ field: "skip-current-housing" });
applyCapture({ field: "skip-declarations" });
assert.equal(workspacePrompt(getFoxDraft()), "other-reo");
assert.notEqual(workspacePrompt(getFoxDraft()), "borrower-name");
applyCapture({ field: "skip-other-reo" });
applyCapture({ field: "start-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, DOC_INVITE_COPY.government_id);
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "borrower-name");
applyCapture({ field: "skip-borrower-name" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, DOC_INVITE_COPY.tax_return);
assert.notEqual(workspacePrompt(getFoxDraft()), "household");
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "documents");
assert.equal(workspacePromptCopy("documents", getFoxDraft()).text, DOC_INVITE_COPY.prior_year_return);
assert.doesNotMatch(
  `${workspacePromptCopy("documents", getFoxDraft()).text} ${workspacePromptCopy("documents", getFoxDraft()).followUp ?? ""}`,
  /another borrower|Is there another borrower/i,
);
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "property-address");
applyCapture({ field: "skip-property-address" });
assert.equal(workspacePrompt(getFoxDraft()), "citizenship");
applyCapture({ field: "skip-citizenship" });
assert.equal(workspacePrompt(getFoxDraft()), "assets");
applyCapture({ field: "skip-available-assets" });
assert.equal(workspacePrompt(getFoxDraft()), "review");
applyCapture({ field: "confirm-draft" });
assert.equal(workspacePrompt(getFoxDraft()), "household");

const conventionalW2Walk = draft({
  ...afterIncome,
  otherReoAsked: true,
  statedOtherReo: "none",
});
assert.equal(workspacePrompt(conventionalW2Walk), "documents");
assert.notEqual(workspacePrompt(conventionalW2Walk), "declarations");
assert.notEqual(workspacePrompt(conventionalW2Walk), "assets");
assert.doesNotMatch(
  `${workspacePromptCopy("documents", conventionalW2Walk).text} ${workspacePromptCopy("documents", conventionalW2Walk).followUp ?? ""}`,
  /APN|legal description|year built|HOA|citizenship|alimony|judgment|2-year|address history|liability worksheet|1003/i,
);
const w2FileFacts = previewFacts(conventionalW2Walk);
assert.ok(w2FileFacts.some((fact) => fact.id === "file-property" && /Primary/.test(fact.value) && /address —/.test(fact.value)));
assert.ok(w2FileFacts.some((fact) => fact.id === "file-assets" && /institution —/.test(fact.value) && /last4 —/.test(fact.value)));
assert.ok(w2FileFacts.some((fact) => fact.id === "file-liabilities" && fact.value === "Credit report later"));
assert.ok(w2FileFacts.some((fact) => fact.id === "file-declarations" && fact.value === "—"));
assert.ok(w2FileFacts.every((fact) => fact.id !== "file-history"));
assert.ok(w2FileFacts.every((fact) => !/^history-/.test(fact.id)));
assert.equal(fileCompleteness(conventionalW2Walk)?.copy, `sketch · 4 of ${CONVENTIONAL_FILE_SLOT_TOTAL}`);
const w2Slots = conventionalSlotReport(conventionalW2Walk);
assert.deepEqual(w2Slots.present, [
  "loan.amounts",
  "credit.stated",
  "income.type",
  "property.occupancyStatus",
]);
assert.ok(w2Slots.empty.includes("property.apn"));
assert.ok(w2Slots.empty.includes("property.legalDescription"));
assert.ok(w2Slots.empty.includes("property.yearBuilt"));
assert.ok(w2Slots.empty.includes("property.taxes"));
assert.ok(w2Slots.empty.includes("property.hoa"));
assert.ok(w2Slots.empty.includes("assets.institution"));
assert.ok(w2Slots.empty.includes("assets.suggestedBalance"));
assert.ok(w2Slots.empty.includes("declarations.citizenship"));
assert.ok(w2Slots.empty.includes("declarations.l_intentToOccupy"));
assert.ok(w2Slots.empty.includes("history.addressHistory"));
const lateCitizenship = draft({
  ...conventionalW2Walk,
  agencyDeclarations: { citizenship: "us_citizen" },
});
assert.equal(workspacePrompt(lateCitizenship), "documents");
assert.ok(previewFacts(lateCitizenship).some((fact) => fact.id === "file-declarations" && /US citizen/.test(fact.value)));
assert.ok(conventionalSlotReport(lateCitizenship).present.includes("declarations.citizenship"));
assert.ok(!requiredStructureLines(lateCitizenship).some((line) => /citizen/i.test(line.label)));
assert.equal(mayaNamed.facts?.ssn, undefined);
assert.equal(mayaNamed.facts?.id_last4?.field === "ssn", false);

const conventionalSeWalk = draft({
  ...withIncome(afterCredit, "self-employed"),
  otherReoAsked: true,
  statedOtherReo: "none",
});
assert.equal(workspacePrompt(conventionalSeWalk), "documents");
assert.ok(previewFacts(conventionalSeWalk).some((fact) => fact.id === "file-property"));
assert.ok(previewFacts(conventionalSeWalk).some((fact) => fact.id === "file-assets"));
assert.ok(previewFacts(conventionalSeWalk).some((fact) => fact.id === "file-liabilities"));
assert.ok(previewFacts(conventionalSeWalk).some((fact) => fact.id === "file-declarations"));
assert.ok(previewFacts(conventionalSeWalk).every((fact) => fact.id !== "file-history"));
assert.ok(previewFacts(conventionalSeWalk).every((fact) => !/^history-/.test(fact.id)));
assert.match(fileCompleteness(conventionalSeWalk)?.copy ?? "", new RegExp(`^sketch · 4 of ${CONVENTIONAL_FILE_SLOT_TOTAL}$`));

const conventionalRefiWalk = draft({
  path: "acr",
  productIntent: "refinance",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  propertyValueAmount: 1_200_000,
  loanAmountValue: 960_000,
  amountAsked: true,
  valueAsked: true,
  creditAsked: true,
  creditBand: "760+",
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "w2" },
  otherReoAsked: true,
  statedOtherReo: "none",
});
assert.equal(workspacePrompt(conventionalRefiWalk), "documents");
assert.ok(previewFacts(conventionalRefiWalk).some((fact) => fact.id === "file-property"));
assert.ok(previewFacts(conventionalRefiWalk).some((fact) => fact.id === "file-liabilities" && fact.value === "Credit report later"));
assert.ok(stillUsefulSection(conventionalRefiWalk)?.items.some((item) => item.label === "Mortgage statement"));
assert.match(fileCompleteness(conventionalRefiWalk)?.copy ?? "", new RegExp(`^sketch · 4 of ${CONVENTIONAL_FILE_SLOT_TOTAL}$`));

const conventionalSrc = readFileSync(join(root, "components/fox/conventionalFile.ts"), "utf8");
assert.doesNotMatch(conventionalSrc, /ask for APN|legal description quiz|year-built form|HOA dues line|liability worksheet|1003 maze|citizenship quiz/i);
assert.doesNotMatch(conventionalSrc, /you qualify|credit pull now|full account number|SSN capture/i);

assert.equal(
  storeFlags({ statedCreditBand: "680-719", occupancy: "investment", purposeHint: "cash_out" }).caution,
  "I’ll keep gathering. Pricing waits.",
);
assert.equal(
  storeFlags({ occupancy: "second", product: "buy", purposeHint: "purchase", state: "CA" }).caution,
  SECOND_HOME_CAUTION,
);
assert.equal(
  storeFlags({ propertyType: "two_to_four", occupancy: "primary" }).caution,
  TWO_TO_FOUR_CAUTION,
);
assert.equal(
  storeFlags({ manufactured: true, occupancy: "primary" }).caution,
  MANUFACTURED_CAUTION,
);
assert.equal(
  storeFlags({
    propertyType: "condo",
    condoIneligibleNamed: true,
    occupancy: "primary",
  }).caution,
  CONDO_NON_WARRANTABLE_CAUTION,
);
assert.equal(
  storeFlags({ unsupportedRental: true, occupancy: "primary" }).caution,
  RENTAL_UNSUPPORTED_CAUTION,
);
assert.equal(condoFlag({ propertyType: "condo", condoHasHoaDocs: true, condoHasProjectFacts: true }), "warrantable");
assert.equal(condoFlag({ propertyType: "condo" }), "needs_review");
assert.equal(condoFlag({ propertyType: "condo", condoIneligibleNamed: true }), "non_warrantable");
assert.equal(condoFlag({ coop: true }), "needs_review");
assert.equal(condoFlag({ pud: true, propertyType: "sfr" }), undefined);
assert.equal(sketchedLtvFromFacts({ purchasePrice: 500000, loanAmount: 400000 }), 0.8);
assert.equal(suggestScheduleERental({ rentalIncomeOrLoss: 12000, depreciation: 6000, interest: 3000, hoa: 1200, taxes: 2400, insurance: 1200 })?.monthly, 2150);
assert.equal(suggestScheduleERental({ rentalIncomeOrLoss: 12000, depreciation: 6000 })?.monthly, 1500);
assert.equal(suggestLeaseRental({ grossMonthlyRent: 4000, twoMonthsDeposits: true })?.monthly, 3000);
assert.equal(suggestLeaseRental({ grossMonthlyRent: 4000 })?.thinner, true);
assert.equal(
  rentalNetConfirmCopy({ net: 1500, method: "schedule_e", completeCount: 1 }),
  "Suggested net rental is $1,500 · not underwritten. I’m using Schedule E minus this property’s PITIA. Use this?",
);
assert.equal(
  rentalNetConfirmCopy({ net: -3293, method: "lease_75", completeCount: 1 }),
  "Suggested net rental is −$3,293 · not underwritten. That would count as a monthly liability. I’m using 75% of the lease minus this property’s PITIA. Use this?",
);
assert.doesNotMatch(
  rentalConfirmCopy("lease_75", 2250) ?? "",
  /Suggested rental income is \$2,250 · not underwritten\. I’m using 75% of the lease\. Use this\?/,
);
const rentalExtract = applyRentalIncomeFromExtract(afterLooks, "other", {
  schedule_e_rental_income: "12000",
  schedule_e_depreciation: "6000",
});
assert.ok(!rentalExtract.pendingProposal);
assert.equal(rentalExtract.rentalThinReason, "statement");
assert.equal(rentalExtract.rentalGrossMonthly, 1500);
assert.equal(rentalExtract.facts?.qualifying_income, undefined);
assert.equal(resolveProposal(rentalExtract, "accept").facts?.[SUGGESTED_NET_RENTAL_FIELD], undefined);
assert.equal(resolveProposal(rentalExtract, "decline").facts?.[SUGGESTED_NET_RENTAL_FIELD], undefined);
const leaseExtract = applyRentalIncomeFromExtract(afterLooks, "other", { gross_monthly_rent: "4000" });
assert.ok(!leaseExtract.pendingProposal);
assert.equal(leaseExtract.rentalGrossMonthly, 3000);
assert.match(rentalNetConfirmCopy({ net: 3000, method: "lease_75", completeCount: 1 }) ?? "", /75% of the lease/);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "condo",
    condoHasHoaDocs: true,
    condoHasProjectFacts: true,
  }).kind,
  "strong",
);
assert.equal(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "condo",
  }).kind,
  "thin",
);
assert.doesNotMatch(
  readinessFromFile({
    product: "buy",
    purposeHint: "purchase",
    occupancy: "primary",
    state: "CA",
    purchasePrice: 850000,
    downPayment: 170000,
    loanAmount: 680000,
    statedCreditBand: "760+",
    incomeType: "w2_base",
    received: ["paystub", "w2"],
    propertyType: "condo",
  }).line,
  /HOA questionnaire|condo project docs|Form 1076|\bCPM\b|\bPERS\b/i,
);
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    occupancy: "primary",
    propertyType: "condo",
    condoNewOrConverted: true,
  }).stillUseful.some((item) => /HOA questionnaire|condo project docs|Form 1076|\bCPM\b|\bPERS\b/i.test(item)),
);
assert.ok(
  storeCompleteness("buy", {
    purposeHint: "purchase",
    occupancy: "investment",
    rentalNamed: true,
  }).stillUseful.includes(RENTAL_DOCS_WOULD_HELP),
);
assert.ok(
  !storeCompleteness("buy", {
    purposeHint: "purchase",
    occupancy: "investment",
    rentalNamed: true,
    hasLease: true,
  }).stillUseful.includes(RENTAL_DOCS_WOULD_HELP),
);
assert.doesNotMatch(
  [READINESS_STRONG, GOVVIE_LINE, CASH_OUT_CAUTION, CONDO_NON_WARRANTABLE_CAUTION, RENTAL_UNSUPPORTED_CAUTION].join(" "),
  /you qualify|you are approved|\bDU\b|\bLPA\b|I can prepare a file\. I cannot approve or say you qualify/,
);
assert.doesNotMatch(guidelineStoreSrc, /0\.97/);

assert.equal(interpretQuestion("I have Airbnb income")?.topicId, "income.rental_thin");
assert.equal(interpretQuestion("it’s a condotel")?.topicId, "condo.non_warrantable");
assert.equal(interpretQuestion("it's a new construction condo")?.topicId, "condo.needs_review");
assert.equal(foxAnswer("I have Airbnb income", factsFromDraft(investBuy))?.text, RENTAL_UNSUPPORTED_CAUTION);
assert.equal(foxAnswer("it’s a condotel", factsFromDraft(investBuy))?.text, CONDO_NON_WARRANTABLE_CAUTION);
const airbnbAsk = workspaceReply("I have Airbnb income", investBuy);
assert.match(airbnbAsk?.text ?? "", /I don’t have a rental path for that yet\. I’ll keep gathering\./);
assert.doesNotMatch(airbnbAsk?.text ?? "", /I can answer from this file/);
assert.equal(airbnbAsk?.capture?.field, "note");
assert.equal(guidelineCaution(investBuy), INVESTMENT_CAUTION);
assert.ok((airbnbAsk?.actions ?? []).some((item) => item.label === "Upload this" || item.label === "Skip" || item.label === "Start with ID"));
const condotelAsk = workspaceReply("it’s a condotel", investBuy);
assert.match(condotelAsk?.text ?? "", /This condo looks like it needs a licensed review\. I can keep preparing the file\./);
assert.doesNotMatch(condotelAsk?.text ?? "", /I can answer from this file/);
assert.equal(guidelineCaution(investBuy), INVESTMENT_CAUTION);
assert.ok((condotelAsk?.actions ?? []).some((item) => item.label === "Upload this" || item.label === "Skip" || item.label === "Start with ID"));
const newCondoAsk = workspaceReply("it's a new construction condo", investBuy);
assert.match(newCondoAsk?.text ?? "", /Noted\. This is a new-construction condo\./);
assert.doesNotMatch(newCondoAsk?.text ?? "", /HOA questionnaire|condo project docs|Form 1076|\bCPM\b|\bPERS\b/i);
assert.doesNotMatch(newCondoAsk?.text ?? "", /I can answer from this file/);
assert.equal(foxAnswer("it's a new construction condo", factsFromDraft(investBuy))?.text, CONDO_NEW_CONSTRUCTION_ACK);
assert.deepEqual(foxAnswer("it's a new construction condo", factsFromDraft(investBuy))?.collect, []);
assert.equal(guidelineCaution(investBuy), INVESTMENT_CAUTION);
assert.ok((newCondoAsk?.actions ?? []).some((item) => item.label === "Upload this" || item.label === "Skip" || item.label === "Start with ID"));
const investBuySfr = draft({
  ...investBuy,
  propertyType: "sfr",
  propertyTypeAsked: true,
});
assert.equal(guidelineCaution(investBuySfr), INVESTMENT_CAUTION);
const usefulBefore = stillUsefulSection(investBuySfr)?.items.map((item) => item.label) ?? [];
assert.ok(!usefulBefore.some((label) => /HOA questionnaire|condo project docs|Form 1076|\bCPM\b|\bPERS\b/i.test(label)));
const newCondoAskSfr = workspaceReply("it's a new construction condo", investBuySfr);
assert.match(newCondoAskSfr?.text ?? "", /Noted\. This is a new-construction condo\./);
assert.doesNotMatch(newCondoAskSfr?.text ?? "", /HOA questionnaire|condo project docs|Form 1076|\bCPM\b|\bPERS\b/i);
assert.doesNotMatch(newCondoAskSfr?.text ?? "", /I can answer from this file/);
assert.equal(newCondoAskSfr?.capture?.field, "note");
assert.ok((newCondoAskSfr?.actions ?? []).some((item) => item.label === "Upload this" || item.label === "Skip" || item.label === "Start with ID"));
const afterNewCondo = persistGuidelineNote(investBuySfr, "it's a new construction condo");
assert.equal(afterNewCondo.facts?.condo_needs_review?.value, "needs_review");
assert.equal(afterNewCondo.propertyType, "sfr");
const usefulAfter = stillUsefulSection(afterNewCondo)?.items ?? [];
assert.ok(!usefulAfter.some((item) => /HOA questionnaire|condo project docs|Form 1076|\bCPM\b|\bPERS\b/i.test(`${item.label} ${item.ask}`)));
assert.deepEqual(
  usefulAfter.map((item) => item.label),
  usefulBefore,
);
assert.equal(guidelineCaution(afterNewCondo), INVESTMENT_CAUTION);
assert.equal(
  previewFacts(afterNewCondo).filter((fact) => fact.id === "caution").length,
  previewFacts(investBuySfr).filter((fact) => fact.id === "caution").length,
);
assert.ok(previewFacts(afterNewCondo).some((fact) => fact.id === "caution" && fact.value === INVESTMENT_CAUTION));

assert.equal(parseStatedMonthlyLease("I have a lease for 3000 a month"), 3000);
assert.equal(parseStatedMonthlyLease("rent is 3000", { occupancy: "investment" }), 3000);
assert.equal(parseStatedMonthlyLease("tenant pays 3000 a month"), 3000);
assert.equal(parseStatedMonthlyLease("I have a lease"), null);
assert.equal(parseStatedMonthlyLease("I have Airbnb income"), null);
assert.equal(parseStatedMonthlyLease("rent is 3000", { occupancy: "primary" }), null);
assert.equal(interpretQuestion("I have a lease for 3000 a month")?.topicId, "income.rental_lease");
assert.equal(interpretQuestion("I have Airbnb income")?.topicId, "income.rental_thin");
assert.equal(rentalSuggest(null, { grossMonthlyRent: 3000 })?.monthly, 2250);
assert.equal(rentalSuggest({ rentalIncomeOrLoss: 12000, depreciation: 6000 })?.monthly, 1500);
const investHousingEst = housingEstimate({
  purpose: "purchase",
  loanAmount: 680000,
  purchasePrice: 850000,
});
assert.ok(investHousingEst);
const investNetWritten = 2250 - investHousingEst!.estimatedHousing;
assert.equal(investNetWritten, -3293);
assert.equal(
  netRentalCashFlow([
    { id: "subject", kind: "subject", grossMonthly: 2250, method: "lease_75", pitia: investHousingEst!.estimatedHousing, pitiaSource: "estimated_housing" },
  ]).aggregateNet,
  -3293,
);
assert.equal(
  netRentalCashFlow([
    { id: "a", kind: "subject", grossMonthly: 2250, method: "lease_75", pitia: 2000, pitiaSource: "estimated_housing" },
    { id: "b", kind: "reo", grossMonthly: 1800, method: "schedule_e", pitia: 1500, pitiaSource: "statement" },
  ]).aggregateNet,
  550,
);
assert.equal(
  rentalNetConfirmCopy({ net: 550, method: "aggregate", completeCount: 2 }),
  "Suggested net rental is $550 · not underwritten. I’m using all rental properties I can net. Use this?",
);
assert.equal(netRentalCashFlow([{ id: "subject", kind: "subject", grossMonthly: 2250, method: "lease_75" }]).role, "thin");

const thinHousingAsk = workspaceReply("I have a lease for 3000 a month", investBuy);
assert.equal(thinHousingAsk?.text, RENTAL_NEED_HOUSING);
assert.doesNotMatch(thinHousingAsk?.text ?? "", /Suggested rental income is \$2,250/);
assert.doesNotMatch(thinHousingAsk?.text ?? "", /I can answer from this file/);
assert.equal(thinHousingAsk?.capture?.field, "propose-rental-lease");
assert.equal(guidelineCaution(investBuy), INVESTMENT_CAUTION);

const skippedInvestHousing = skipEstimatedHousing(draft({ ...investBuy, housingAsked: true }));
assert.equal(workspaceReply("I have a lease for 3000 a month", skippedInvestHousing)?.text, RENTAL_NEED_HOUSING);

const otherReoNoStatement = draft({
  ...investBuy,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  statedOtherReo: "yes",
  otherReoAsked: true,
});
const otherReoThin = workspaceReply("I have a lease for 3000 a month", otherReoNoStatement);
assert.equal(otherReoThin?.text, RENTAL_NEED_STATEMENT);
assert.ok((stillUsefulSection(otherReoNoStatement)?.items ?? []).some((item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS) || (stillUsefulSection(proposeTypedLeaseRental(otherReoNoStatement, "I have a lease for 3000 a month")!)?.items ?? []).some((item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS));

const twoFourPrimary = draft({
  ...investBuy,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  propertyType: "two_to_four",
  propertyTypeAsked: true,
});
assert.equal(proposeTypedLeaseRental(twoFourPrimary, "I have a lease for 3000 a month"), null);

const investHoused = draft({
  ...investBuy,
  estimatedHousing: investHousingEst!.estimatedHousing,
  housingAsked: true,
  sampleAccepted: true,
  subjectAddressAsked: true,
});
const leaseAsk = workspaceReply("I have a lease for 3000 a month", investHoused);
assert.match(
  leaseAsk?.text ?? "",
  /Suggested net rental is −\$3,293 · not underwritten\. That would count as a monthly liability\. I’m using 75% of the lease minus this property’s PITIA\. Use this\?/,
);
assert.doesNotMatch(leaseAsk?.text ?? "", /Suggested rental income is \$2,250/);
assert.doesNotMatch(leaseAsk?.text ?? "", /I can answer from this file/);
assert.doesNotMatch(leaseAsk?.text ?? "", /Schedule E/);
assert.equal(leaseAsk?.capture?.field, "propose-rental-lease");
assert.equal(leaseAsk?.capture && "value" in leaseAsk.capture ? leaseAsk.capture.value : "", "3000");
assert.ok((leaseAsk?.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((leaseAsk?.actions ?? []).some((item) => item.label === "Change"));
assert.equal(guidelineCaution(investHoused), INVESTMENT_CAUTION);
const leaseProposed = proposeTypedLeaseRental(investHoused, "I have a lease for 3000 a month");
assert.equal(leaseProposed?.pendingProposal?.field, SUGGESTED_NET_RENTAL_FIELD);
assert.equal(leaseProposed?.pendingProposal?.value, "-3293");
assert.equal(leaseProposed?.facts?.[SUGGESTED_NET_RENTAL_FIELD], undefined);
assert.equal(leaseProposed?.rentalGrossMonthly, 2250);
assert.ok((stillUsefulSection(investBuy)?.items ?? []).some((item) => item.label === RENTAL_DOCS_WOULD_HELP));
assert.equal(workspaceReply("Use this", leaseProposed!)?.capture?.field, "accept-proposal");
const leaseUsed = resolveProposal(leaseProposed!, "accept");
assert.equal(leaseUsed.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.value, "-3293");
assert.equal(leaseUsed.suggestedNetRental, -3293);
assert.equal(leaseUsed.rentalNetRole, "liability");
assert.equal(leaseUsed.facts?.qualifying_income, undefined);
assert.equal(guidelineCaution(leaseUsed), INVESTMENT_CAUTION);
assert.ok(previewFacts(leaseUsed).some((fact) => fact.id === "suggestedNetRental" && fact.value === "−$3,293"));
assert.ok(previewFacts(leaseUsed).some((fact) => fact.id === "suggestedNetRental" && fact.note === SUGGESTED_NET_NOTE));
assert.ok(previewFacts(leaseUsed).some((fact) => fact.id === "rentalGrossMonthly" && fact.value === "$2,250"));
assert.ok(previewFacts(leaseUsed).some((fact) => fact.id === "rentalPitiaUsed" && fact.value === `$${investHousingEst!.estimatedHousing.toLocaleString("en-US")}`));
assert.ok(previewFacts(leaseUsed).some((fact) => fact.id === "rentalNetRole" && fact.value === "liability"));
assert.ok(previewFacts(leaseUsed).some((fact) => fact.id === "income" && /−\$3,293/.test(fact.value)));
assert.equal(fileCompleteness(investBuy)?.copy, `sketch · 4 of ${CONVENTIONAL_FILE_SLOT_TOTAL}`);
assert.equal(fileCompleteness(leaseUsed)?.copy, `sketch · 5 of ${CONVENTIONAL_FILE_SLOT_TOTAL}`);
assert.ok(!(stillUsefulSection(leaseUsed)?.items ?? []).some((item) => item.label === RENTAL_DOCS_WOULD_HELP));
const leaseDeclined = resolveProposal(leaseProposed!, "decline");
assert.equal(leaseDeclined.facts?.[SUGGESTED_NET_RENTAL_FIELD], undefined);
assert.equal(leaseDeclined.suggestedNetRental, undefined);
assert.ok(!previewFacts(leaseDeclined).some((fact) => fact.id === "suggestedNetRental"));
assert.equal(workspaceReply("Change", leaseProposed!)?.capture?.field, "change-proposal");
assert.equal(workspaceReply("Skip", leaseProposed!)?.capture?.field, "decline-proposal");
const rentIsAsk = workspaceReply("rent is 3000", investHoused);
assert.equal(rentIsAsk?.capture?.field, "propose-rental-lease");
assert.match(rentIsAsk?.text ?? "", /−\$3,293/);
assert.match(workspaceReply("tenant pays 3000 a month", investHoused)?.text ?? "", /Suggested net rental is −\$3,293/);
assert.match(workspaceReply("I have Airbnb income", investBuy)?.text ?? "", /I don’t have a rental path for that yet\. I’ll keep gathering\./);

const leaseUsedWithDti = syncCalculatorDraft(
  draft({
    ...leaseUsed,
    statedMonthlyDebts: 800,
    monthlyDebtsAsked: true,
    facts: {
      ...(leaseUsed.facts ?? {}),
      qualifying_income: {
        field: "qualifying_income",
        value: "9000",
        source: "suggested",
        confirmed: true,
      },
    },
  }),
);
assert.ok(previewFacts(leaseUsedWithDti).some((fact) => fact.id === "stated-dti" && fact.note === STATED_NOT_FROM_CREDIT));
assert.ok(previewFacts(leaseUsedWithDti).some((fact) => fact.id === "suggestedNetRental" && fact.value === "−$3,293"));
assert.equal(guidelineCaution(leaseUsedWithDti), INVESTMENT_CAUTION);
assert.notEqual(guidelineCaution(leaseUsedWithDti), RENTAL_NET_COST_CAUTION);

const calcPurchase = ltvCltv({
  purpose: "purchase",
  loanAmount: 680000,
  purchasePrice: 850000,
});
assert.equal(calcPurchase?.ltv, 680000 / 850000);
assert.equal(calcPurchase?.cltv, calcPurchase?.ltv);
assert.equal(formatRatioPercent(calcPurchase!.ltv), "80.0%");
const calcWithSub = ltvCltv({
  purpose: "purchase",
  loanAmount: 680000,
  purchasePrice: 850000,
  subordinateBalance: 20000,
});
assert.equal(calcWithSub?.cltv, 700000 / 850000);
const calcRefi = ltvCltv({
  purpose: "refi",
  loanAmount: 400000,
  propertyValue: 500000,
});
assert.equal(calcRefi?.ltv, 0.8);
const highLtvCalc = ltvCltv({ purpose: "purchase", loanAmount: 765000, purchasePrice: 850000 });
assert.ok(highLtvCalc && highLtvCalc.ltv > 0.8);
const housing = housingEstimate({
  purpose: "purchase",
  loanAmount: 680000,
  purchasePrice: 850000,
});
assert.equal(housing?.principalAndInterest, monthlyPrincipalAndInterest(680000));
assert.equal(housing?.taxes, Math.round((850000 * 0.0125) / 12));
assert.equal(housing?.hoi, Math.round((850000 * 0.0035) / 12));
assert.equal(housing?.miApplies, false);
assert.equal(housing?.monthlyMI, 0);
assert.equal(
  housing?.estimatedHousing,
  housing!.principalAndInterest + housing!.taxes + housing!.hoi,
);
assert.match(housingConfirmCopy(housing!.estimatedHousing), /Estimated housing is about \$/);
assert.match(housingConfirmCopy(housing!.estimatedHousing), /Estimated · not final\. Use this\?/);
const housingHigh = housingEstimate({
  purpose: "purchase",
  loanAmount: 765000,
  purchasePrice: 850000,
});
assert.equal(housingHigh?.miApplies, true);
assert.equal(housingHigh?.monthlyMI, null);
assert.equal(
  housingHigh?.estimatedHousing,
  housingHigh!.principalAndInterest + housingHigh!.taxes + housingHigh!.hoi,
);
assert.doesNotMatch(JSON.stringify(housingHigh), /monthlyMI":[1-9]/);
const ltvFacts = previewFacts(investBuy);
assert.ok(ltvFacts.some((fact) => fact.id === "ltv" && fact.note === ESTIMATED_NOT_FINAL));
assert.ok(ltvFacts.some((fact) => fact.id === "cltv" && fact.note === ESTIMATED_NOT_FINAL));
assert.ok(!ltvFacts.some((fact) => /HOA questionnaire|condo project docs/i.test(`${fact.label} ${fact.value}`)));
const housingFile = writeEstimatedHousing(investBuy, housing!.estimatedHousing);
assert.equal(housingFile.estimatedHousing, housing!.estimatedHousing);
assert.ok(previewFacts(housingFile).some((fact) => fact.id === "housing" && fact.note === ESTIMATED_NOT_FINAL));
assert.ok(previewFacts(housingFile).some((fact) => fact.id === "pi" && (fact.note ?? "").includes(SAMPLE_INDICATIVE_NOT_LIVE)));
assert.equal(
  workspacePrompt(draft({ ...investBuy, sampleAccepted: true })),
  "housing",
);
const housingAsk = workspaceReply(
  "Use this",
  draft({ ...investBuy, sampleAccepted: true }),
);
assert.match(
  housingAsk?.text ?? "",
  /Estimated housing is about \$|About how much do you pay each month|This file can move|Proceed|What is the (property address|address of the home you are buying)/,
);
assert.equal(housingAsk?.capture?.field, "estimatedHousing");
const skippedHousing = skipEstimatedHousing(housingFile);
assert.equal(skippedHousing.estimatedHousing, undefined);
assert.equal(skippedHousing.housingAsked, true);
assert.equal(MONTHLY_DEBTS_ASK, STATED_DTI_ASK);
assert.equal(parseMonthlyDebtAmount("400, 200 and 150"), 750);
const incomeReady = draft({
  ...housingFile,
  facts: {
    ...(housingFile.facts ?? {}),
    qualifying_income: {
      field: "qualifying_income",
      value: "4000",
      source: "suggested",
      confirmed: true,
    },
  },
});
assert.equal(statedDti(housingFile.estimatedHousing, 8000, 4000), (housingFile.estimatedHousing! + 8000) / 4000);
const dtiOver = statedDti(housing!.estimatedHousing, 20000, 4000);
assert.ok(dtiOver != null && dtiOver >= HIGH_STATED_DTI);
const dtiFile = syncCalculatorDraft(
  draft({
    ...incomeReady,
    statedMonthlyDebts: 20000,
    monthlyDebtsAsked: true,
  }),
);
assert.ok((dtiFile.statedDti ?? 0) >= 1);
assert.equal(guidelineCaution(dtiFile), INVESTMENT_CAUTION);
assert.ok(previewFacts(dtiFile).some((fact) => fact.id === "stated-dti" && fact.note === STATED_NOT_FROM_CREDIT));
const primaryDti = syncCalculatorDraft(
  draft({
    path: "acr",
    productIntent: "buy",
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    occupancyAsked: true,
    estimatedHousing: housing!.estimatedHousing,
    housingAsked: true,
    statedMonthlyDebts: 20000,
    monthlyDebtsAsked: true,
    loanAmountValue: 680000,
    propertyValueAmount: 850000,
    facts: {
      qualifying_income: {
        field: "qualifying_income",
        value: "4000",
        source: "suggested",
        confirmed: true,
      },
    },
  }),
);
assert.equal(guidelineCaution(primaryDti), HIGH_STATED_DTI_CAUTION);
assert.equal(qualifyingIncomeConfirmCopy(9000), "Suggested monthly income is $9,000. Use this?");
assert.equal(rentalSuggest({ rentalIncomeOrLoss: 12000, depreciation: 6000 })?.monthly, 1500);
assert.equal(rentalSuggest(null, { grossMonthlyRent: 4000 })?.monthly, 3000);
assert.equal(assetNotes({ occupancy: "primary", propertyType: "sfr" }).reservesNote, "no_minimum_1unit_primary");
assert.equal(assetNotes({ occupancy: "investment", propertyType: "sfr" }).reservesNote, "reserves_review");
assert.equal(assetNotes({ occupancy: "primary", propertyType: "sfr", qualifyingIncome: 4000, extractedDeposit: 2001 }).largeDepositFlag, true);
assert.equal(assetNotes({ occupancy: "primary", giftNamed: true }).giftFundsNoted, true);
assert.doesNotMatch(
  [PI_SAMPLE_LINE, housingConfirmCopy(1000), HIGH_STATED_DTI_CAUTION, qualifyingIncomeConfirmCopy(1000)].join(" "),
  /you qualify|you are approved|\bDU\b|\bLPA\b|HOA questionnaire|reserve months|months of reserves/i,
);
assert.doesNotMatch(readFileSync(join(root, "lib/calculators/conventional.ts"), "utf8"), /homemade MI|premium table|0\.52|0\.62/);
assert.doesNotMatch(
  stillUsefulSection(housingFile)?.items.map((item) => item.label).join(" ") ?? "",
  /HOA questionnaire|condo project docs/,
);

const w2PrimaryWalk = draft({
  ...afterLooks,
  monthlyDebtsAsked: false,
  statedMonthlyDebts: undefined,
  facts: {
    ...(afterLooks.facts ?? {}),
    qualifying_income: {
      field: "qualifying_income",
      value: "12000",
      source: "suggested",
      confirmed: true,
    },
  },
});
assert.equal(workspacePrompt(w2PrimaryWalk), "housing");
const w2Housing = workspaceReply("Use this", w2PrimaryWalk);
assert.equal(w2Housing?.capture?.field, "estimatedHousing");
const afterW2Housing = writeEstimatedHousing(w2PrimaryWalk, housing!.estimatedHousing);
assert.notEqual(workspacePrompt(afterW2Housing), "debts");
assert.equal(workspacePrompt(afterW2Housing), "property-address");
assert.equal(nextFoxAsk(afterW2Housing).text, PURCHASE_ADDRESS_ASK);
assert.equal(nextFoxAsk(afterW2Housing).text, "What is the address of the home you are buying?");
assert.deepEqual(
  (nextFoxAsk(afterW2Housing).actions ?? []).map((item) => item.label),
  ["Skip"],
);
assert.doesNotMatch(nextFoxAsk(afterW2Housing).text, /year built|taxes|HOA|APN/i);
const afterW2Address = skipSubjectAddress(afterW2Housing);
assert.equal(workspacePrompt(afterW2Address), "done");
assert.ok(previewFacts(afterW2Housing).some((fact) => fact.id === "ltv" && fact.value === "80.0%"));
assert.ok(previewFacts(afterW2Housing).some((fact) => fact.id === "housing" && fact.note === ESTIMATED_NOT_FINAL));
const afterW2Debts = syncCalculatorDraft(draft({ ...afterW2Housing, statedMonthlyDebts: 800, monthlyDebtsAsked: true }));
assert.ok((afterW2Debts.statedDti ?? 0) < 1);
assert.ok(previewFacts(afterW2Debts).some((fact) => fact.id === "stated-dti" && fact.note === STATED_NOT_FROM_CREDIT));
assert.equal(guidelineCaution(afterW2Debts), undefined);

const sePrimaryWalk = draft({
  ...w2PrimaryWalk,
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
  yearsInBusinessAsked: true,
  facts: {
    ...w2PrimaryWalk.facts,
    years_in_business: {
      field: "years_in_business",
      value: "5",
      source: "client",
      confirmed: true,
    },
  },
});
assert.equal(qualifyingIncomeConfirmCopy(9000), "Suggested monthly income is $9,000. Use this?");
assert.equal(workspacePrompt(sePrimaryWalk), "housing");

const investRentalWalk = draft({
  ...investBuy,
  sampleAccepted: true,
});
assert.equal(rentalSuggest({ rentalIncomeOrLoss: 12000, depreciation: 6000 })?.monthly, 1500);
assert.match(rentalNetConfirmCopy({ net: 1500, method: "schedule_e", completeCount: 1 }) ?? "", /I’m using Schedule E minus this property’s PITIA\. Use this\?/);
assert.equal(guidelineCaution(investRentalWalk), INVESTMENT_CAUTION);
assert.notEqual(guidelineCaution(investRentalWalk), HIGH_STATED_DTI_CAUTION);

const higherLtvWalk = draft({
  path: "acr",
  productIntent: "buy",
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  occupancyAsked: true,
  loanAmountValue: 765000,
  propertyValueAmount: 850000,
  sampleAccepted: true,
});
assert.ok((draftLtvCltv(higherLtvWalk)?.ltv ?? 0) > 0.8);
assert.equal(guidelineCaution(higherLtvWalk), HIGH_LTV_CAUTION);
assert.equal(draftHousingEstimate(higherLtvWalk)?.miApplies, true);
assert.equal(draftHousingEstimate(higherLtvWalk)?.monthlyMI, null);
assert.ok(previewFacts(higherLtvWalk).some((fact) => fact.id === "mi" && /amount waits/.test(fact.value)));
assert.doesNotMatch(JSON.stringify(draftHousingEstimate(higherLtvWalk)), /monthlyMI":[1-9]/);

const uploadDuringHousing = workspaceReply("Upload docs", seCoachLooks);
assert.equal(uploadDuringHousing?.capture?.field, "upload-more");
const proceedDuringHousing = workspaceReply("Proceed", beforeProceed);
assert.equal(proceedDuringHousing?.text, MOTION_COPY.emailAsk);
const housingChange = workspaceReply("Change", w2PrimaryWalk);
assert.equal(housingChange?.capture?.field, "needs-correction");
assert.equal(housingChange?.text, CORRECT_ASK);
assert.doesNotMatch(housingChange?.text ?? "", /property type|citizen|co-borrower|Borrower 2/i);
assert.ok((housingChange?.actions ?? []).some((item) => item.label === "Housing payment"));
assert.ok(!(housingChange?.actions ?? []).some((item) => item.label === "Use this"));
const afterHousingChange = draft({ ...w2PrimaryWalk, correcting: "correct" });
assert.equal(workspacePrompt(afterHousingChange), "correct");
assert.notEqual(workspacePrompt(afterHousingChange), "property-type");
assert.notEqual(workspacePrompt(afterHousingChange), "citizenship");
assert.notEqual(workspacePrompt(afterHousingChange), "coborrower-name");

const file32W2None = draft({
  ...afterLooks,
  housingAsked: true,
  estimatedHousing: 5400,
  monthlyDebtsAsked: true,
  statedMonthlyDebts: 800,
  statedOtherReo: "none",
  otherReoAsked: true,
});
assert.equal(workspacePrompt(file32W2None), "property-address");
assert.equal(nextFoxAsk(file32W2None).text, PURCHASE_ADDRESS_ASK);
assert.equal(nextFoxAsk(file32W2None).text, "What is the address of the home you are buying?");
assert.deepEqual(
  (nextFoxAsk(file32W2None).actions ?? []).map((item) => item.label),
  ["Skip"],
);
assert.ok(!(nextFoxAsk(file32W2None).actions ?? []).some((item) => /house|condo|2–4|year built|taxes|HOA|APN/i.test(item.label)));
assert.doesNotMatch(
  nextFoxAsk(file32W2None).text,
  /year built|taxes|HOA|APN|questionnaire/i,
);
const file32W2Ready = skipSubjectAddress(file32W2None);
assert.equal(workspacePrompt(file32W2Ready), "done");
assert.equal(file32W2Ready.subjectAddress, undefined);
assert.equal(file32W2Ready.facts?.property_address, undefined);
assert.equal(isSimplePrimaryW2File(file32W2None), true);
const file32W2Done = workspacePromptCopy("done", file32W2Ready);
assert.notEqual(file32W2Done.followUp, CITIZENSHIP_ASK);
assert.notEqual(file32W2Done.followUp, FORMER_HISTORY_ASK);
assert.doesNotMatch(
  `${file32W2Done.text} ${file32W2Done.followUp ?? ""}`,
  /citizen|permanent resident|visa|SSN|date of birth|year built|APN|legal description|HOA dues|HOA questionnaire|asset worksheet|former (address|employer)|a–m|a-m declarations/i,
);
assert.ok((file32W2Done.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok(!requiredStructureLines(file32W2None).some((line) => /citizen/i.test(line.label)));
assert.equal(assetsMatter(file32W2None), false);
assert.notEqual(workspacePrompt(file32W2Ready), "assets");
assert.notEqual(workspacePrompt(file32W2Ready), "declarations");
assert.equal(otherReoRows(file32W2None).length, 0);
assert.ok(stillUsefulSection(file32W2Ready)?.items.some((item) => item.label === "Property address"));
assert.ok(
  !(stillUsefulSection(file32W2None)?.items ?? []).some((item) =>
    /HOA questionnaire|condo project docs|Mortgage statements for all properties owned/i.test(item.label),
  ),
);
const file32W2Skipped = skipCitizenship(file32W2Ready);
assert.equal(file32W2None.agencyDeclarations?.citizenship, undefined);
assert.equal(file32W2Skipped.agencyDeclarations?.citizenship, undefined);
assert.equal(workspacePrompt(file32W2Skipped), "done");
const file32W2Slots = conventionalSlotReport(file32W2None);
assert.deepEqual(file32W2Slots.present, [
  "loan.amounts",
  "credit.stated",
  "income.type",
  "property.occupancyStatus",
]);
assert.ok(file32W2Slots.empty.includes("property.address"));
assert.ok(file32W2Slots.empty.includes("property.yearBuilt"));
assert.ok(file32W2Slots.empty.includes("property.apn"));
assert.ok(file32W2Slots.empty.includes("property.legalDescription"));
assert.ok(file32W2Slots.empty.includes("property.taxes"));
assert.ok(file32W2Slots.empty.includes("property.hoa"));
assert.ok(file32W2Slots.empty.includes("property.units"));
assert.ok(file32W2Slots.empty.includes("declarations.citizenship"));
assert.ok(file32W2Slots.empty.includes("declarations.a_outstandingJudgments"));
assert.ok(file32W2Slots.empty.includes("declarations.b_bankruptcy"));
assert.ok(file32W2Slots.empty.includes("assets.institution"));
assert.ok(file32W2Slots.empty.includes("history.addressHistory"));
assert.ok(file32W2Slots.empty.includes("history.employmentHistory"));

const addressStillOpen = draft({
  ...file32W2Skipped,
  skippedStillUseful: ["second-year-w2", "tax_return"],
  borrowerName: "Jordan Hale",
  documents: [
    {
      slot: "id",
      name: "license.png",
      type: "image/png",
      size: 4000,
      receivedAt: "2026-08-25T00:00:00.000Z",
      status: "extracted",
      extractClass: "government_id",
    },
    {
      slot: "paystubs",
      name: "paystub.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-25T00:00:00.000Z",
      status: "extracted",
      extractClass: "paystub",
    },
    {
      slot: "paystubs",
      name: "paystub-2.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-25T00:00:01.000Z",
      status: "extracted",
      extractClass: "paystub",
    },
    {
      slot: "w2",
      name: "w2.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-25T00:00:00.000Z",
      status: "extracted",
      extractClass: "w2",
    },
    {
      slot: "w2",
      name: "w2-prior.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-25T00:00:02.000Z",
      status: "extracted",
      extractClass: "w2",
    },
  ],
});
assert.equal(nextStillUsefulItem(addressStillOpen)?.id, "property-address");
const addressSkipped = skipCurrentStillUseful(addressStillOpen);
assert.ok((addressSkipped.skippedStillUseful ?? []).includes("property-address"));
assert.ok(!layer2Plan(addressSkipped).some((item) => item.id === "property-address"));
assert.ok(conventionalSlotReport(addressSkipped).empty.includes("property.address"));
assert.equal(conventionalFileFromDraft(addressSkipped).property.address, undefined);

const file32Se = draft({
  ...file32W2Ready,
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
  yearsInBusinessAsked: true,
  facts: {
    ...(file32W2None.facts ?? {}),
    years_in_business: {
      field: "years_in_business",
      value: "5",
      source: "client",
      confirmed: true,
    },
  },
});
assert.equal(workspacePrompt(file32Se), "done");
assert.notEqual(workspacePromptCopy("done", file32Se).followUp, CITIZENSHIP_ASK);
assert.ok(!(workspacePromptCopy("done", file32Se).actions ?? []).some((item) => /citizen|Permanent resident|Other/i.test(item.label) && item.label !== "Request human"));
assert.notEqual(workspacePrompt(file32Se), "assets");
assert.equal(otherReoRows(file32Se).length, 0);
const file32SeSkipped = skipCitizenship(file32Se);
const file32SeSlots = conventionalSlotReport(file32SeSkipped);
assert.ok(file32SeSlots.present.includes("income.type"));
assert.ok(file32SeSlots.present.includes("history.employmentHistory"));
assert.ok(file32SeSlots.empty.includes("property.address"));
assert.ok(file32SeSlots.empty.includes("declarations.citizenship"));
assert.ok(file32SeSlots.empty.includes("assets.institution"));

const file32Invest = draft({
  ...leaseUsed,
  housingAsked: true,
  monthlyDebtsAsked: true,
  statedMonthlyDebts: 400,
  statedOtherReo: "none",
  otherReoAsked: true,
  propertyTypeAsked: true,
  subjectAddressAsked: true,
});
assert.equal(assetsMatter(file32Invest), true);
assert.equal(workspacePrompt(file32Invest), "done");
assert.notEqual(workspacePromptCopy("done", file32Invest).followUp, CITIZENSHIP_ASK);
assert.ok(!(workspacePromptCopy("done", file32Invest).actions ?? []).some((item) => item.label === "US citizen" || item.label === "Permanent resident"));
assert.notEqual(workspacePrompt(file32Invest), "assets");
assert.equal(otherReoRows(file32Invest).length, 0);
assert.equal(file32Invest.suggestedNetRental, -3293);
assert.equal(file32Invest.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.value, "-3293");
const file32InvestSkipped = skipCitizenship(file32Invest);
const file32InvestSlots = conventionalSlotReport(file32InvestSkipped);
assert.ok(file32InvestSlots.present.includes("income.rental"));
assert.ok(file32InvestSlots.present.includes("property.occupancyStatus"));
assert.ok(file32InvestSlots.empty.includes("property.address"));
assert.ok(file32InvestSlots.empty.includes("declarations.citizenship"));
assert.ok(file32InvestSlots.empty.includes("assets.institution"));

const file32OtherReoYes = draft({
  ...afterLooks,
  housingAsked: true,
  monthlyDebtsAsked: true,
  statedMonthlyDebts: 800,
  statedOtherReo: "yes",
  otherReoAsked: true,
  subjectAddress: "14 OAK STREET",
});
assert.equal(otherReoRows(file32OtherReoYes).length, 0);
assert.ok(
  (stillUsefulSection(file32OtherReoYes)?.items ?? []).some(
    (item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS,
  ),
);
const otherReoStatement = applyExtractedFields(file32OtherReoYes, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "RIVER SERVICING",
    unpaid_principal: "220000",
    current_pi: "1450",
    property_address: "88 PINE ROAD",
    occupancy: "investment",
  },
});
const otherReoRowsAfter = otherReoRows(otherReoStatement.draft);
assert.equal(otherReoRowsAfter.length, 1);
assert.equal(otherReoRowsAfter[0]?.address, "88 PINE ROAD");
assert.equal(otherReoRowsAfter[0]?.unpaidPrincipal, "220000");
assert.equal(otherReoRowsAfter[0]?.payment, "1450");
assert.ok(!otherReoRowsAfter.some((row) => /14 oak street/i.test(row.address ?? "")));
assert.equal(otherReoStatement.draft.subjectAddress, "14 OAK STREET");
assert.equal(otherReoStatement.draft.statedCurrentHousing, undefined);
assert.notEqual(otherReoStatement.draft.pendingProposal?.field, "statedCurrentHousing");
assert.equal(otherReoStatement.draft.pendingProposal?.field, "otherReoPayment");
assert.match(nextFoxAsk(otherReoStatement.draft).text, /other property/);
assert.doesNotMatch(nextFoxAsk(otherReoStatement.draft).text, /housing now/);
assert.match(otherPropertyPaymentConfirmCopy(1450), /other property/);
assert.doesNotMatch(otherPropertyPaymentConfirmCopy(1450), /housing now/);
const subjectMortgage = applyExtractedFields(file32OtherReoYes, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "OAK SERVICING",
    unpaid_principal: "960000",
    current_pi: "4800",
    property_address: "14 OAK STREET",
  },
});
assert.equal(otherReoRows(subjectMortgage.draft).length, 0);
const noneReoMortgage = applyExtractedFields(
  draft({ ...file32OtherReoYes, statedOtherReo: "none" }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "RIVER SERVICING",
      unpaid_principal: "220000",
      current_pi: "1450",
      property_address: "88 PINE ROAD",
    },
  },
);
assert.equal(otherReoRows(noneReoMortgage.draft).length, 0);
const file32YesSlots = conventionalSlotReport(otherReoStatement.draft);
assert.ok(file32YesSlots.present.includes("property.address"));
assert.ok(file32YesSlots.empty.includes("declarations.citizenship"));
assert.equal(conventionalFileFromDraft(otherReoStatement.draft).otherProperties.length, 1);

const shortTenure = draft({
  ...file32W2Ready,
  statedTimeOnJob: 8,
  timeOnJobAsked: true,
  formerHistoryAsked: false,
});
assert.equal(isSimplePrimaryW2File(shortTenure), true);
assert.equal(workspacePrompt(shortTenure), "done");
assert.notEqual(workspacePromptCopy("done", shortTenure).followUp, FORMER_HISTORY_ASK);
assert.equal((shortTenure.addressHistory ?? []).length, 0);
assert.equal((shortTenure.employmentHistory ?? []).length, 0);
const seShortTenure = draft({
  ...file32SeSkipped,
  statedTimeOnJob: 8,
  timeOnJobAsked: true,
  formerHistoryAsked: false,
});
assert.equal(isSimplePrimaryW2File(seShortTenure), false);
assert.equal(workspacePrompt(seShortTenure), "done");
assert.notEqual(workspacePromptCopy("done", seShortTenure).followUp, FORMER_HISTORY_ASK);
assert.notEqual(workspacePrompt(seShortTenure), "former-history");
const formerSkipped = skipFormerHistory(seShortTenure);
assert.equal((formerSkipped.addressHistory ?? []).length, 0);
assert.equal(workspacePrompt(formerSkipped), "done");

const presentFromId = applyExtractedFields(file32W2Skipped, {
  extractClass: "government_id",
  confidence: 0.94,
  fields: {
    full_name: "Ada Borrower",
    present_address: "9 WILLOW LANE",
  },
});
assert.equal((presentFromId.draft.addressHistory ?? []).length, 0);
assert.ok(
  (presentFromId.draft.pendingProposal?.extras ?? []).some(
    (item) => item.field === "present_address" && item.value === "9 WILLOW LANE",
  ),
);
const presentAccepted = resolveProposal(presentFromId.draft, "accept");
assert.ok(
  (presentAccepted.addressHistory ?? []).some((item) => item.label === "9 WILLOW LANE"),
);
assert.notEqual(presentAccepted.subjectAddress, "9 WILLOW LANE");
assert.ok(conventionalSlotReport(presentAccepted).present.includes("history.addressHistory"));
assert.ok(
  previewFacts(presentAccepted).some(
    (fact) => fact.id === "history-address" && fact.value === "9 WILLOW LANE",
  ),
);

const harborHistoryBase = draft({
  ...skipCitizenship(file32W2None),
  propertyTypeAsked: true,
  timeOnJobAsked: true,
  currentHousingAsked: true,
  documents: [
    {
      slot: "id",
      name: "government-id-jordan.pdf",
      type: "application/pdf",
      size: 4000,
      receivedAt: "2026-08-25T00:00:00.000Z",
      status: "extracted",
      extractClass: "government_id",
    },
  ],
});
const jordanIdNoAddress = applyExtractedFields(harborHistoryBase, {
  extractClass: "government_id",
  confidence: 0.94,
  fields: { full_name: "JORDAN HALE" },
});
assert.equal(jordanIdNoAddress.draft.facts?.present_address, undefined);
assert.equal((jordanIdNoAddress.draft.addressHistory ?? []).length, 0);
assert.ok(!(jordanIdNoAddress.draft.pendingProposal?.extras ?? []).some((item) => item.field === "present_address"));
const jordanNamed = resolveProposal(jordanIdNoAddress.draft, "accept");
assert.equal(jordanNamed.borrowerName, "Jordan Hale");
assert.equal((jordanNamed.addressHistory ?? []).length, 0);
assert.ok(previewFacts(jordanNamed).every((fact) => fact.id !== "history-address"));

const harborW2History = applyExtractedFields(jordanNamed, {
  extractClass: "w2",
  confidence: 0.94,
  fields: { tax_year: "2025", employer_name: "Harbor Steel", wages: "84000" },
});
assert.equal(harborW2History.draft.facts?.hire_date, undefined);
assert.ok(
  (harborW2History.draft.employmentHistory ?? []).some((item) => item.label === "Harbor Steel" && !item.from),
);
assert.ok(
  previewFacts(harborW2History.draft).some(
    (fact) => fact.id === "history-employment" && fact.value === "Harbor Steel" && !/[–-]/.test(fact.value),
  ),
);
assert.ok(previewFacts(harborW2History.draft).every((fact) => fact.id !== "file-history"));
assert.doesNotMatch(
  previewFacts(harborW2History.draft)
    .filter((fact) => fact.id.startsWith("history-"))
    .map((fact) => fact.value)
    .join(" "),
  /address —|employment —/,
);
assert.ok(
  previewFacts(harborW2History.draft).every(
    (fact) => !/2-year slots|extract first/i.test(`${fact.note ?? ""} ${fact.value}`),
  ),
);
const harborIncomeUsed = resolveProposal(harborW2History.draft, "accept");
assert.equal(harborIncomeUsed.facts?.employer_name?.value, "Harbor Steel");
assert.equal(workspacePrompt(harborIncomeUsed), "former-history");
assert.equal(nextFoxAsk(harborIncomeUsed).text, FORMER_HISTORY_ASK);
assert.equal(nextFoxAsk(harborIncomeUsed).text, whoBeforeAsk("Harbor Steel"));
assert.equal(canLooksRight(harborIncomeUsed), false);
assert.ok(!(nextFoxAsk(harborIncomeUsed).actions ?? []).some((item) => item.label === "Looks right"));
assert.deepEqual(
  (nextFoxAsk(harborIncomeUsed).actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
assert.doesNotMatch(nextFoxAsk(harborIncomeUsed).text, /employer name|what.?s your employer|how long/i);

const harborPreLooksBase = draft({
  ...skipDocInvites(afterIncome),
  householdAsked: false,
  statedHousehold: undefined,
});
assert.equal(harborPreLooksBase.sampleAccepted, undefined);
const harborPreLooksId = applyExtractedFields(
  draft({
    ...harborPreLooksBase,
    documents: [
      {
        slot: "id",
        name: "government-id-jordan.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-08-27T00:00:00.000Z",
        status: "extracted",
        extractClass: "government_id",
      },
    ],
  }),
  {
    extractClass: "government_id",
    confidence: 0.94,
    fields: { full_name: "JORDAN HALE" },
  },
);
const harborPreLooksNamed = resolveProposal(harborPreLooksId.draft, "accept");
assert.equal((harborPreLooksNamed.addressHistory ?? []).length, 0);
const harborPreLooksStub = applyExtractedFields(harborPreLooksNamed, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: printedOtStub!.fields,
});
assert.equal(workspacePrompt(harborPreLooksStub.draft), "pay-frequency");
assert.notEqual(workspacePrompt(harborPreLooksStub.draft), "former-history");
const harborPreLooksBiweekly = applyPayFrequencyAnswer(harborPreLooksStub.draft, "biweekly");
const harborPreLooksStubUsed = resolveProposal(harborPreLooksBiweekly, "accept");
const harborPreLooksBoth = applyExtractedFields(harborPreLooksStubUsed, {
  extractClass: "w2",
  confidence: 0.94,
  fields: printedOtW2!.fields,
});
assert.equal(harborPreLooksBoth.draft.awaitingBothMonthlyReason, true);
assert.equal(harborPreLooksBoth.draft.facts?.qualifying_income, undefined);
assert.equal(workspacePrompt(harborPreLooksBoth.draft), "both-monthly-reason");
assert.equal(
  nextFoxAsk(harborPreLooksBoth.draft).text,
  "The paystub is $15,167 a month. The W-2 Box 1 is $7,000 a month. Why do they differ?",
);
assert.notEqual(workspacePrompt(harborPreLooksBoth.draft), "former-history");
assert.notEqual(workspacePrompt(harborPreLooksBoth.draft), "review");
assert.ok(
  (harborPreLooksBoth.draft.employmentHistory ?? []).some(
    (item) => /HARBOR STEEL/i.test(item.label ?? "") && !item.from,
  ),
);
assert.ok(
  previewFacts(harborPreLooksBoth.draft).some(
    (fact) => fact.id === "history-employment" && /HARBOR STEEL/i.test(fact.value) && !fact.note,
  ),
);
const harborPreLooksSkip = applyBothMonthlyReasonAnswer(harborPreLooksBoth.draft, "skip");
assert.equal(harborPreLooksSkip.pendingProposal?.value, "7000");
assert.equal(workspacePrompt(harborPreLooksSkip), "confirm-proposal");
assert.notEqual(workspacePrompt(harborPreLooksSkip), "former-history");
assert.notEqual(workspacePrompt(harborPreLooksSkip), "review");
const harborPreLooksIncome = resolveProposal(harborPreLooksSkip, "accept");
assert.equal(harborPreLooksIncome.facts?.qualifying_income?.value, "7000");
assert.equal(harborPreLooksIncome.sampleAccepted, undefined);
assert.equal(workspacePrompt(harborPreLooksIncome), "former-history");
assert.equal(nextFoxAsk(harborPreLooksIncome).text, whoBeforeAsk("Harbor Steel"));
assert.equal(nextFoxAsk(harborPreLooksIncome).text, "Who did you work for before Harbor Steel?");
assert.equal(canLooksRight(harborPreLooksIncome), false);
assert.ok(!(nextFoxAsk(harborPreLooksIncome).actions ?? []).some((item) => item.label === "Looks right"));
assert.deepEqual(
  (nextFoxAsk(harborPreLooksIncome).actions ?? []).map((item) => item.label),
  ["Skip", "Not yet"],
);
const harborPreLooksWhoSkip = skipFormerHistory(harborPreLooksIncome);
assert.equal(workspacePrompt(harborPreLooksWhoSkip), "former-history");
assert.equal(nextFoxAsk(harborPreLooksWhoSkip).text, WHERE_BEFORE_ASK);
assert.equal(nextFoxAsk(harborPreLooksWhoSkip).text, "Where did you live before this?");
assert.equal(canLooksRight(harborPreLooksWhoSkip), false);
const harborPreLooksReady = skipFormerHistory(
  draft({ ...harborPreLooksWhoSkip, looksRightHold: false }),
);
assert.equal(workspacePrompt(harborPreLooksReady), "property-address");
assert.equal(nextFoxAsk(harborPreLooksReady).text, PURCHASE_ADDRESS_ASK);
assert.equal(nextFoxAsk(harborPreLooksReady).text, "What is the address of the home you are buying?");
assert.deepEqual(
  (nextFoxAsk(harborPreLooksReady).actions ?? []).map((item) => item.label),
  ["Skip"],
);
assert.ok(!(nextFoxAsk(harborPreLooksReady).actions ?? []).some((item) => item.label === "Looks right"));
assert.ok(!(nextFoxAsk(harborPreLooksReady).actions ?? []).some((item) => /house|condo|2–4/i.test(item.label)));
assert.doesNotMatch(
  nextFoxAsk(harborPreLooksReady).text,
  /year built|taxes|HOA|APN|questionnaire|look right/i,
);
assert.equal(canLooksRight(harborPreLooksReady), false);
assert.equal((harborPreLooksReady.addressHistory ?? []).length, 0);
assert.ok((harborPreLooksReady.employmentHistory ?? []).some((item) => /HARBOR STEEL/i.test(item.label ?? "") && !item.from));
const harborPreLooksSkipAddress = skipSubjectAddress(harborPreLooksReady);
assert.equal(harborPreLooksSkipAddress.subjectAddress, undefined);
assert.equal(harborPreLooksSkipAddress.occupancyChoice.value, harborPreLooksReady.occupancyChoice.value);
assert.equal(harborPreLooksSkipAddress.propertyType, harborPreLooksReady.propertyType);
assert.equal(workspacePrompt(harborPreLooksSkipAddress), "citizenship");
assert.equal(nextFoxAsk(harborPreLooksSkipAddress).text, CITIZENSHIP_ASK);
assert.equal(nextFoxAsk(harborPreLooksSkipAddress).text, "For this file, US citizen, permanent resident, or other?");
assert.deepEqual(
  (nextFoxAsk(harborPreLooksSkipAddress).actions ?? []).map((item) => item.label),
  ["US citizen", "Permanent resident", "Other", "Skip"],
);
assert.ok(!(nextFoxAsk(harborPreLooksSkipAddress).actions ?? []).some((item) => item.label === "Looks right"));
assert.ok(!(nextFoxAsk(harborPreLooksSkipAddress).actions ?? []).some((item) => item.label === "Proceed"));
assert.ok(!(nextFoxAsk(harborPreLooksSkipAddress).actions ?? []).some((item) => item.label === "Not yet"));
assert.ok(!(nextFoxAsk(harborPreLooksSkipAddress).actions ?? []).some((item) => item.label === "Request human"));
assert.doesNotMatch(nextFoxAsk(harborPreLooksSkipAddress).text, /visa|SSN|date of birth/i);
assert.equal(canLooksRight(harborPreLooksSkipAddress), false);
const harborPreLooksSkipCitizen = skipCitizenship(harborPreLooksSkipAddress);
assert.equal(harborPreLooksSkipCitizen.agencyDeclarations?.citizenship, undefined);
assert.equal(harborPreLooksSkipCitizen.facts?.citizenship, undefined);
assert.equal(workspacePrompt(harborPreLooksSkipCitizen), "assets");
assert.equal(nextFoxAsk(harborPreLooksSkipCitizen).text, BANK_STATEMENT_ASK);
assert.equal(
  nextFoxAsk(harborPreLooksSkipCitizen).text,
  "I need two recent bank statements to show funds for the down payment. Drop them here, or Skip.",
);
assert.deepEqual(
  (nextFoxAsk(harborPreLooksSkipCitizen).actions ?? []).map((item) => item.label),
  ["Skip"],
);
assert.ok(!(nextFoxAsk(harborPreLooksSkipCitizen).actions ?? []).some((item) => item.label === "Looks right"));
assert.ok(!(nextFoxAsk(harborPreLooksSkipCitizen).actions ?? []).some((item) => item.label === "Not yet"));
assert.doesNotMatch(nextFoxAsk(harborPreLooksSkipCitizen).text, /cash|available funds|last4|account number|declarations maze/i);
assert.equal(canLooksRight(harborPreLooksSkipCitizen), false);
const harborPreLooksSkipAssets = skipAvailableAssets(harborPreLooksSkipCitizen);
assert.equal(harborPreLooksSkipAssets.statedAvailableAssets, undefined);
assert.equal(harborPreLooksSkipAssets.facts?.institution, undefined);
assert.equal(harborPreLooksSkipAssets.facts?.ending_balance, undefined);
assert.equal(conventionalFileFromDraft(harborPreLooksSkipAssets).assets.institution, undefined);
assert.equal(conventionalFileFromDraft(harborPreLooksSkipAssets).assets.suggestedBalance, undefined);
assert.equal(conventionalFileFromDraft(harborPreLooksSkipAssets).assets.last4, undefined);
assert.ok(
  previewFacts(harborPreLooksSkipAssets).some(
    (fact) => fact.id === "assets" && fact.value === "—" && fact.label === "Stated available assets",
  ),
);
assert.ok(
  previewFacts(harborPreLooksSkipAssets).some(
    (fact) =>
      fact.id === "file-assets" &&
      /institution —/.test(fact.value) &&
      /balance —/.test(fact.value) &&
      /last4 —/.test(fact.value),
  ),
);
assert.ok(previewFacts(harborPreLooksSkipAssets).every((fact) => !/18,400|18400/.test(fact.value)));
assert.equal(workspacePrompt(harborPreLooksSkipAssets), "review");
assert.equal(canLooksRight(harborPreLooksSkipAssets), true);
assert.ok((nextFoxAsk(harborPreLooksSkipAssets).actions ?? []).some((item) => item.label === "Looks right"));
assert.ok(stillUsefulSection(harborPreLooksSkipAddress)?.items.some((item) => item.label === "Property address"));
const harborPreLooksTyped = workspaceReply("14 Oak Street", harborPreLooksReady);
assert.equal(harborPreLooksTyped?.capture?.field, "propose-subject-address");
assert.match(harborPreLooksTyped?.text ?? "", /That’s 14 Oak Street/);
assert.doesNotMatch(harborPreLooksTyped?.text ?? "", /look right|year built|taxes|HOA|APN/i);
const harborPreLooksWritten = resolveProposal(
  proposeSubjectAddress(harborPreLooksReady, "14 Oak Street"),
  "accept",
);
assert.equal(harborPreLooksWritten.subjectAddress, "14 Oak Street");
assert.equal(harborPreLooksWritten.occupancyChoice.value, harborPreLooksReady.occupancyChoice.value);
assert.equal(harborPreLooksWritten.propertyType, harborPreLooksReady.propertyType);
assert.equal(workspacePrompt(harborPreLooksWritten), "citizenship");
assert.equal(canLooksRight(harborPreLooksWritten), false);
assert.ok(!(nextFoxAsk(harborPreLooksWritten).actions ?? []).some((item) => item.label === "Looks right"));
const harborPreLooksCitizen = writeCitizenship(harborPreLooksWritten, "us_citizen");
assert.equal(harborPreLooksCitizen.agencyDeclarations?.citizenship, "us_citizen");
assert.ok(
  previewFacts(harborPreLooksCitizen).some(
    (fact) => fact.id === "citizenship" && fact.value === "US citizen",
  ),
);
assert.ok(
  previewFacts(harborPreLooksCitizen).some(
    (fact) => fact.id === "file-declarations" && /US citizen/.test(fact.value),
  ),
);
assert.equal(workspacePrompt(harborPreLooksCitizen), "assets");
assert.equal(nextFoxAsk(harborPreLooksCitizen).text, BANK_STATEMENT_ASK);
assert.equal(
  nextFoxAsk(harborPreLooksCitizen).text,
  "I need two recent bank statements to show funds for the down payment. Drop them here, or Skip.",
);
assert.equal(canLooksRight(harborPreLooksCitizen), false);
assert.ok(!(nextFoxAsk(harborPreLooksCitizen).actions ?? []).some((item) => item.label === "Looks right"));
const harborPreLooksCitizenSkipAssets = skipAvailableAssets(harborPreLooksCitizen);
assert.equal(harborPreLooksCitizenSkipAssets.statedAvailableAssets, undefined);
assert.equal(conventionalFileFromDraft(harborPreLooksCitizenSkipAssets).assets.institution, undefined);
assert.ok(
  previewFacts(harborPreLooksCitizenSkipAssets).some(
    (fact) => fact.id === "assets" && fact.value === "—" && fact.label === "Stated available assets",
  ),
);
assert.ok(
  previewFacts(harborPreLooksCitizenSkipAssets).some(
    (fact) =>
      fact.id === "file-assets" &&
      /institution —/.test(fact.value) &&
      /balance —/.test(fact.value),
  ),
);
assert.equal(workspacePrompt(harborPreLooksCitizenSkipAssets), "review");
assert.equal(canLooksRight(harborPreLooksCitizenSkipAssets), true);
const harborPreLooksOther = writeCitizenship(harborPreLooksWritten, "other");
assert.equal(harborPreLooksOther.agencyDeclarations?.citizenship, "other");
assert.ok(
  previewFacts(harborPreLooksOther).some(
    (fact) => fact.id === "citizenship" && fact.value === "Other",
  ),
);
assert.equal(workspacePrompt(harborPreLooksOther), "assets");
assert.equal(canLooksRight(harborPreLooksOther), false);
assert.notEqual(harborPreLooksOther.motion, "escalated");
assert.ok(!(nextFoxAsk(harborPreLooksOther).actions ?? []).some((item) => item.label === "Request human"));
const harborOtherReply = workspaceReply("Other", harborPreLooksWritten);
assert.equal(harborOtherReply?.capture?.field, "citizenship");
assert.equal(
  harborOtherReply?.capture && "value" in harborOtherReply.capture ? harborOtherReply.capture.value : "",
  "other",
);
assert.doesNotMatch(harborOtherReply?.text ?? "", /request human|visa/i);
assert.equal(
  productIntentFromAction({
    label: "Other",
    capture: { field: "citizenship", value: "other" },
  }),
  null,
);
const harborPreLooksOtherSkipAssets = skipAvailableAssets(harborPreLooksOther);
assert.equal(workspacePrompt(harborPreLooksOtherSkipAssets), "review");
assert.ok((nextFoxAsk(harborPreLooksOtherSkipAssets).actions ?? []).some((item) => item.label === "Looks right"));
assert.ok(!(nextFoxAsk(harborPreLooksOther).actions ?? []).some((item) => item.label === "Request human"));
assert.notEqual(workspacePrompt(harborPreLooksOther), "citizenship");
assert.notEqual(workspacePrompt(harborPreLooksOther), "review");
const harborTypedCash = workspaceReply("50000", harborPreLooksCitizen);
assert.notEqual(harborTypedCash?.capture?.field, "statedAvailableAssets");
assert.equal(harborPreLooksCitizen.statedAvailableAssets, undefined);
const printedBank = printedSampleFromBytes(
  readFileSync(join(root, "scripts/fixtures/bank-statement-first-national.png")),
);
assert.equal(printedBank?.extractClass, "bank_statement");
assert.equal(printedBank?.fields.institution, "FIRST NATIONAL");
assert.equal(printedBank?.fields.ending_balance, "18400");
assert.equal(printedBank?.fields.account_last4, undefined);
const harborStatementIn = applyExtractedFields(harborPreLooksCitizen, {
  extractClass: "bank_statement",
  confidence: 0.94,
  fields: {
    institution: printedBank!.fields.institution,
    period_end: printedBank!.fields.period_end ?? "2026-07-31",
    ending_balance: printedBank!.fields.ending_balance,
    account_last4: "1234",
    account_number: "9999888877771234",
  },
});
assert.equal(harborStatementIn.draft.facts?.institution, undefined);
assert.equal(harborStatementIn.draft.facts?.ending_balance, undefined);
assert.equal(harborStatementIn.draft.facts?.account_last4, undefined);
assert.equal(harborStatementIn.draft.statedAvailableAssets, undefined);
assert.equal(harborStatementIn.draft.pendingProposal?.field, "statedAvailableAssets");
assert.equal(harborStatementIn.draft.pendingProposal?.value, printedBank!.fields.ending_balance);
assert.ok(!(harborStatementIn.draft.pendingProposal?.extras ?? []).some((item) => item.field === "account_last4"));
assert.match(nextFoxAsk(harborStatementIn.draft).text, /FIRST NATIONAL/);
assert.match(nextFoxAsk(harborStatementIn.draft).text, /\$18,400/);
assert.match(nextFoxAsk(harborStatementIn.draft).text, /Suggested · not underwritten/);
assert.doesNotMatch(nextFoxAsk(harborStatementIn.draft).text, /last4|account number|invent/i);
assert.equal(harborStatementIn.draft.statedAvailableAssets, undefined);
assert.ok(
  previewFacts(harborStatementIn.draft).every(
    (fact) =>
      (fact.id !== "assets" || fact.value === "—") &&
      fact.id !== "bank" &&
      (fact.id !== "file-assets" ||
        (/institution —/.test(fact.value) &&
          /balance —/.test(fact.value) &&
          /last4 —/.test(fact.value) &&
          !/FIRST NATIONAL|18,400|18400/.test(fact.value))),
  ),
);
assert.ok(
  previewFacts(harborStatementIn.draft).every(
    (fact) => fact.id === "docs" || !/18,400|18400|FIRST NATIONAL/.test(`${fact.value} ${fact.note ?? ""}`),
  ),
);
assert.equal(canLooksRight(harborStatementIn.draft), false);
assert.ok(!(nextFoxAsk(harborStatementIn.draft).actions ?? []).some((item) => item.label === "Looks right"));
const harborStatementUsed = resolveProposal(harborStatementIn.draft, "accept");
assert.equal(harborStatementUsed.facts?.institution?.value, "FIRST NATIONAL");
assert.equal(harborStatementUsed.facts?.ending_balance?.value, "18400");
assert.equal(harborStatementUsed.facts?.account_last4, undefined);
assert.doesNotMatch(JSON.stringify(harborStatementUsed.facts ?? {}), /9999888877771234/);
assert.equal(conventionalFileFromDraft(harborStatementUsed).assets.institution, "FIRST NATIONAL");
assert.equal(conventionalFileFromDraft(harborStatementUsed).assets.suggestedBalance, "18400");
assert.equal(conventionalFileFromDraft(harborStatementUsed).assets.last4, undefined);
assert.ok(
  previewFacts(harborStatementUsed).some(
    (fact) =>
      fact.id === "file-assets" &&
      /FIRST NATIONAL/.test(fact.value) &&
      /\$18,400/.test(fact.value) &&
      !/last4 \d/.test(fact.value),
  ),
);
assert.ok(
  previewFacts(harborStatementUsed).some(
    (fact) => fact.id === "file-assets" && /Suggested · not underwritten|From statements/.test(fact.note ?? ""),
  ),
);
assert.equal(workspacePrompt(harborStatementUsed), "review");
assert.equal(canLooksRight(harborStatementUsed), true);
assert.ok((nextFoxAsk(harborStatementUsed).actions ?? []).some((item) => item.label === "Looks right"));
assert.notEqual(nextFoxAsk(harborStatementUsed).text, BANK_STATEMENT_ASK);
assert.ok(
  stillUsefulSection(harborStatementUsed)?.items.some((item) => item.label === "Second bank statement"),
);
assert.ok(
  previewFacts(harborStatementUsed).some(
    (fact) => fact.id === "assets" && fact.value === "$18,400" && fact.label === "Stated available assets",
  ),
);
assert.ok(
  previewFacts(harborPreLooksWritten).some(
    (fact) => fact.id === "address" && fact.label === "Property address" && fact.value === "14 Oak Street",
  ),
);
assert.notEqual(harborPreLooksWritten.facts?.present_address?.value, "14 Oak Street");
const harborPreLooksWhereTyped = writeFormerHistoryNote(
  draft({ ...harborPreLooksWhoSkip, looksRightHold: false }),
  "12 Pine Road",
);
assert.equal(harborPreLooksWhereTyped.subjectAddress, undefined);
assert.equal(harborPreLooksWhereTyped.facts?.property_address, undefined);
assert.ok((harborPreLooksWhereTyped.addressHistory ?? []).some((item) => item.label === "12 Pine Road"));
assert.equal(workspacePrompt(harborPreLooksWhereTyped), "property-address");
assert.equal(nextFoxAsk(harborPreLooksWhereTyped).text, PURCHASE_ADDRESS_ASK);
assert.doesNotMatch(nextFoxAsk(harborPreLooksWhereTyped).text, /12 Pine Road|WILLOW|ID shows/i);
assert.deepEqual(
  (nextFoxAsk(harborPreLooksWhereTyped).actions ?? []).map((item) => item.label),
  ["Skip"],
);

const harborWhoTyped = workspaceReply("Riverside Mill", harborIncomeUsed);
assert.equal(harborWhoTyped?.capture?.field, "formerHistory");
assert.ok(
  (harborWhoTyped?.capture && "value" in harborWhoTyped.capture ? harborWhoTyped.capture.value : "") ===
    "Riverside Mill",
);
const harborAfterWho = writeFormerHistoryNote(harborIncomeUsed, "Riverside Mill");
assert.ok((harborAfterWho.employmentHistory ?? []).some((item) => item.label === "Harbor Steel" && !item.from));
assert.ok((harborAfterWho.employmentHistory ?? []).some((item) => item.label === "Riverside Mill" && item.to === "former"));
assert.equal(workspacePrompt(harborAfterWho), "former-history");
assert.equal(nextFoxAsk(harborAfterWho).text, WHERE_BEFORE_ASK);
const harborWhereSkip = skipFormerHistory(harborAfterWho);
assert.equal(workspacePrompt(harborWhereSkip), "property-address");
assert.equal(nextFoxAsk(harborWhereSkip).text, PURCHASE_ADDRESS_ASK);
assert.equal(nextFoxAsk(harborWhereSkip).text, "What is the address of the home you are buying?");
assert.deepEqual(
  (nextFoxAsk(harborWhereSkip).actions ?? []).map((item) => item.label),
  ["Skip"],
);
assert.ok(!(nextFoxAsk(harborWhereSkip).actions ?? []).some((item) => /house|condo|2–4/i.test(item.label)));
assert.doesNotMatch(
  nextFoxAsk(harborWhereSkip).text,
  /year built|taxes|HOA|APN|questionnaire/i,
);
assert.equal((harborWhereSkip.addressHistory ?? []).length, 0);
const harborOccupancy = harborWhereSkip.occupancyChoice.value;
const harborType = harborWhereSkip.propertyType;
const harborTyped = workspaceReply("14 Oak Street", harborWhereSkip);
assert.equal(harborTyped?.capture?.field, "propose-subject-address");
assert.match(harborTyped?.text ?? "", /That’s 14 Oak Street/);
assert.match(harborTyped?.text ?? "", /Suggested · not underwritten/);
assert.match(harborTyped?.text ?? "", /Use this/);
assert.doesNotMatch(harborTyped?.text ?? "", /year built|taxes|HOA|APN|questionnaire/i);
const harborAddressWritten = resolveProposal(
  proposeSubjectAddress(harborWhereSkip, "14 Oak Street"),
  "accept",
);
assert.equal(harborAddressWritten.subjectAddress, "14 Oak Street");
assert.equal(harborAddressWritten.facts?.property_address?.value, "14 Oak Street");
assert.equal(harborAddressWritten.occupancyChoice.value, harborOccupancy);
assert.equal(harborAddressWritten.propertyType, harborType);
assert.ok(
  previewFacts(harborAddressWritten).some(
    (fact) =>
      fact.id === "address" &&
      fact.label === "Property address" &&
      fact.value === "14 Oak Street" &&
      fact.note === SUGGESTED_PROPERTY_NOTE,
  ),
);
assert.ok(!layer2Plan(harborAddressWritten).some((item) => item.label === "Property address"));
const harborSkippedAddress = skipSubjectAddress(harborWhereSkip);
assert.equal(harborSkippedAddress.subjectAddress, undefined);
assert.equal(harborSkippedAddress.facts?.property_address, undefined);
assert.equal(harborSkippedAddress.occupancyChoice.value, harborOccupancy);
assert.equal(harborSkippedAddress.propertyType, harborType);
assert.ok(stillUsefulSection(harborSkippedAddress)?.items.some((item) => item.label === "Property address"));
assert.equal(workspaceReply("Skip", harborWhereSkip)?.capture?.field, "skip-property-address");
assert.doesNotMatch(
  `${nextFoxAsk(harborWhereSkip).text} ${nextFoxAsk(harborSkippedAddress).text} ${nextFoxAsk(harborSkippedAddress).followUp ?? ""}`,
  /year built|annual taxes|HOA questionnaire|APN|legal description/i,
);
const harborIdStreet = draft({
  ...harborWhereSkip,
  facts: {
    ...(harborWhereSkip.facts ?? {}),
    present_address: {
      field: "present_address",
      value: "9 WILLOW LANE",
      source: "document",
      confirmed: true,
    },
  },
});
assert.equal(workspacePrompt(harborIdStreet), "property-address");
assert.equal(nextFoxAsk(harborIdStreet).text, PURCHASE_ADDRESS_ASK);
assert.equal(nextFoxAsk(harborIdStreet).text, "What is the address of the home you are buying?");
assert.doesNotMatch(nextFoxAsk(harborIdStreet).text, /ID shows|9 WILLOW LANE/i);
assert.deepEqual(
  (nextFoxAsk(harborIdStreet).actions ?? []).map((item) => item.label),
  ["Skip"],
);
assert.ok(!(nextFoxAsk(harborIdStreet).actions ?? []).some((item) => item.label === "Use this"));
assert.ok(!(nextFoxAsk(harborIdStreet).actions ?? []).some((item) => /house|condo|2–4/i.test(item.label)));
assert.equal(workspaceReply("Use this", harborIdStreet)?.capture?.field, undefined);
assert.notEqual(harborIdStreet.subjectAddress, "9 WILLOW LANE");
const harborIdSkipped = skipSubjectAddress(harborIdStreet);
assert.equal(harborIdSkipped.subjectAddress, undefined);
assert.equal(harborIdSkipped.facts?.property_address, undefined);
assert.equal(harborIdSkipped.occupancyChoice.value, harborIdStreet.occupancyChoice.value);
assert.equal(harborIdSkipped.propertyType, harborIdStreet.propertyType);
const harborPurchaseContract = draft({
  ...harborPreLooksReady,
  documents: [
    ...(harborPreLooksReady.documents ?? []),
    {
      slot: "other",
      name: "purchase-contract-oak.png",
      type: "image/png",
      size: 4000,
      receivedAt: "2026-08-27T00:00:00.000Z",
      status: "extracted",
      extractClass: "purchase_contract",
    },
  ],
  facts: {
    ...(harborPreLooksReady.facts ?? {}),
    present_address: {
      field: "present_address",
      value: "9 WILLOW LANE",
      source: "document",
      confirmed: true,
    },
    property_address: {
      field: "property_address",
      value: "1840 VALENCIA ST",
      source: "document",
      confirmed: false,
    },
  },
});
assert.equal(workspacePrompt(harborPurchaseContract), "property-address");
assert.equal(
  nextFoxAsk(harborPurchaseContract).text,
  "The contract shows 1840 VALENCIA ST. Suggested · not underwritten. Use this?",
);
assert.doesNotMatch(nextFoxAsk(harborPurchaseContract).text, /ID shows|9 WILLOW LANE/i);
assert.ok((nextFoxAsk(harborPurchaseContract).actions ?? []).some((item) => item.label === "Use this"));
assert.ok((nextFoxAsk(harborPurchaseContract).actions ?? []).some((item) => item.label === "Skip"));
const harborContractUsed = workspaceReply("Use this", harborPurchaseContract);
assert.equal(harborContractUsed?.capture?.field, "subjectAddress");
assert.equal(
  harborContractUsed?.capture && "value" in harborContractUsed.capture
    ? harborContractUsed.capture.value
    : "",
  "1840 VALENCIA ST",
);
const harborContractWritten = writeSubjectAddress(harborPurchaseContract, "1840 VALENCIA ST");
assert.equal(harborContractWritten.subjectAddress, "1840 VALENCIA ST");
assert.notEqual(harborContractWritten.subjectAddress, "9 WILLOW LANE");
assert.equal(harborContractWritten.occupancyChoice.value, harborPurchaseContract.occupancyChoice.value);
assert.equal(harborContractWritten.propertyType, harborPurchaseContract.propertyType);
const refiPrimaryIdStreet = draft({
  ...skipDocInvites(refiReady),
  formerHistoryAsked: true,
  formerAddressAsked: true,
  formerEmploymentAsked: true,
  facts: {
    ...(refiReady.facts ?? {}),
    present_address: {
      field: "present_address",
      value: "9 WILLOW LANE",
      source: "document",
      confirmed: true,
    },
  },
});
assert.equal(workspacePrompt(refiPrimaryIdStreet), "property-address");
assert.equal(
  nextFoxAsk(refiPrimaryIdStreet).text,
  "The ID shows 9 WILLOW LANE. Suggested · not underwritten. Use this?",
);
assert.ok((nextFoxAsk(refiPrimaryIdStreet).actions ?? []).some((item) => item.label === "Use this"));
assert.ok((nextFoxAsk(refiPrimaryIdStreet).actions ?? []).some((item) => item.label === "Skip"));
const refiIdUsed = workspaceReply("Use this", refiPrimaryIdStreet);
assert.equal(refiIdUsed?.capture?.field, "subjectAddress");
assert.equal(
  refiIdUsed?.capture && "value" in refiIdUsed.capture ? refiIdUsed.capture.value : "",
  "9 WILLOW LANE",
);
const refiIdWritten = writeSubjectAddress(refiPrimaryIdStreet, "9 WILLOW LANE");
assert.equal(refiIdWritten.subjectAddress, "9 WILLOW LANE");
assert.equal(refiIdWritten.occupancyChoice.value, refiPrimaryIdStreet.occupancyChoice.value);
assert.equal(refiIdWritten.propertyType, refiPrimaryIdStreet.propertyType);
const helocPrimaryIdStreet = draft({
  ...skipDocInvites(helocReady),
  formerHistoryAsked: true,
  formerAddressAsked: true,
  formerEmploymentAsked: true,
  facts: {
    ...(helocReady.facts ?? {}),
    present_address: {
      field: "present_address",
      value: "9 WILLOW LANE",
      source: "document",
      confirmed: true,
    },
  },
});
assert.equal(workspacePrompt(helocPrimaryIdStreet), "property-address");
assert.equal(
  nextFoxAsk(helocPrimaryIdStreet).text,
  "The ID shows 9 WILLOW LANE. Suggested · not underwritten. Use this?",
);
const helocIdUsed = workspaceReply("Use this", helocPrimaryIdStreet);
assert.equal(helocIdUsed?.capture?.field, "subjectAddress");

const harborHireSuggest = applyExtractedFields(
  draft({ ...file32W2Skipped, propertyTypeAsked: true, timeOnJobAsked: true, currentHousingAsked: true }),
  {
  extractClass: "paystub",
  confidence: 0.94,
  fields: { employer_name: "Harbor Steel", hire_date: "March 2023" },
});
assert.equal(harborHireSuggest.draft.pendingProposal?.field, "statedTimeOnJob");
assert.match(nextFoxAsk(harborHireSuggest.draft).text, /hire date of March 2023/);
assert.ok((harborHireSuggest.draft.employmentHistory ?? []).some((item) => item.label === "Harbor Steel"));
const harborHireUsed = resolveProposal(harborHireSuggest.draft, "accept");
assert.ok(
  (harborHireUsed.employmentHistory ?? []).some(
    (item) => item.label === "Harbor Steel" && item.from === "March 2023",
  ),
);
assert.ok(
  previewFacts(harborHireUsed).some(
    (fact) => fact.id === "history-employment" && /Harbor Steel/.test(fact.value) && /March 2023/.test(fact.value),
  ),
);
assert.notEqual(workspacePrompt(harborHireUsed), "former-history");
assert.notEqual(nextFoxAsk(harborHireUsed).text, FORMER_HISTORY_ASK);

const contractProperty = applyExtractedFields(file32W2Skipped, {
  extractClass: "purchase_contract",
  confidence: 0.93,
  fields: {
    property_address: "14 OAK STREET",
    purchase_price: "1200000",
    close_date: "2026-10-15",
    property_type: "house",
    year_built: "1998",
    units: "1",
    annual_taxes: "8400",
    hoa_monthly: "0",
  },
});
const file32ContractAccepted = resolveProposal(contractProperty.draft, "accept");
assert.equal(file32ContractAccepted.subjectAddress, "14 OAK STREET");
assert.equal(file32ContractAccepted.propertyType, "sfr");
assert.equal(file32ContractAccepted.propertyYearBuilt, "1998");
assert.equal(file32ContractAccepted.propertyUnits, "1");
assert.equal(file32ContractAccepted.propertyTaxes, "8400");
const file32ContractSlots = conventionalSlotReport(file32ContractAccepted);
assert.ok(file32ContractSlots.present.includes("property.address"));
assert.ok(file32ContractSlots.present.includes("property.propertyType"));
assert.ok(file32ContractSlots.present.includes("property.yearBuilt"));
assert.ok(file32ContractSlots.present.includes("property.units"));
assert.ok(file32ContractSlots.present.includes("property.taxes"));

const sequenceW2 = readyForReview(
  draft({
    ...afterIncome,
    otherReoAsked: true,
    statedOtherReo: "none",
  }),
);
assert.ok(sequenceW2.timelineChoice.value);
assert.ok(canLooksRight(sequenceW2));
assert.equal(workspacePrompt(sequenceW2), "review");
assert.match(workspacePromptCopy("review", sequenceW2).text, /Does it look right/);
const sequenceSkipTimeline = draft({ ...sequenceW2, timelineChoice: emptyDraft().timelineChoice, timelineAsked: true });
assert.equal(sequenceSkipTimeline.timelineChoice.value, "");
assert.equal(canLooksRight(sequenceSkipTimeline), false);
assert.equal(workspacePrompt(sequenceSkipTimeline), "timeline");
assert.ok(!(workspacePromptCopy("timeline", sequenceSkipTimeline).actions ?? []).some((item) => item.label === "Looks right"));

const sequenceDocHold = applyExtractedFields(sequenceW2, {
  extractClass: "w2",
  confidence: 0.93,
  fields: { employer_name: "ACME", wages: "120000" },
});
assert.equal(sequenceDocHold.draft.looksRightHold, true);
assert.equal(canLooksRight(sequenceDocHold.draft), false);
assert.notEqual(workspacePrompt(sequenceDocHold.draft), "review");
assert.doesNotMatch(nextFoxAsk(sequenceDocHold.draft).text, /Does it look right/);
const afterHoldCleared = draft({ ...sequenceDocHold.draft, looksRightHold: false, pendingProposal: null });
assert.ok(canLooksRight(afterHoldCleared) || nextDocInvite(afterHoldCleared));
if (canLooksRight(afterHoldCleared)) {
  assert.equal(workspacePrompt(afterHoldCleared), "review");
}

const investLeaseSketch = draft({
  path: "acr",
  productIntent: "buy",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "investment" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  valueAsked: true,
  propertyValueAmount: 850000,
  downAsked: true,
  downPaymentAmount: 170000,
  amountAsked: true,
  loanAmountValue: 680000,
});
assert.equal(workspacePrompt(investLeaseSketch), "subject-lease");
assert.equal(workspacePromptCopy("subject-lease", investLeaseSketch).text, SUBJECT_LEASE_ASK);
assert.ok((workspacePromptCopy("subject-lease", investLeaseSketch).actions ?? []).some((item) => item.label === "Skip"));
const typedLease = workspaceReply("3000", investLeaseSketch);
assert.equal(typedLease?.capture?.field, "statedSubjectLease");
assert.notEqual(workspacePrompt(investLeaseSketch), "housing");
assert.notEqual(workspacePrompt(investLeaseSketch), "property-type");
const investAfterLooks = draft({
  ...investLeaseSketch,
  creditAsked: true,
  creditBand: "760+",
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "w2" },
  otherReoAsked: true,
  statedOtherReo: "none",
  sampleAccepted: true,
  workspaceDraftStatus: "with-originator",
  phase: "confirmed",
});
assert.equal(workspacePrompt(investAfterLooks), "subject-lease");
assert.notEqual(workspacePrompt(investAfterLooks), "housing");
assert.notEqual(workspacePrompt(investAfterLooks), "property-type");
const leasedThenHousing = draft({
  ...investAfterLooks,
  subjectLeaseAsked: true,
  rentalGrossMonthly: 3000,
});
assert.equal(workspacePrompt(leasedThenHousing), "housing");

const walkedOtherReoMortgage = applyExtractedFields(
  draft({
    ...afterLooks,
    statedOtherReo: "yes",
    otherReoAsked: true,
    statedCurrentHousing: undefined,
    currentHousingAsked: false,
    pendingProposal: null,
    pendingConflict: null,
    facts: {},
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "RIVER SERVICING",
      unpaid_principal: "385000",
      current_pi: "3850",
    },
  },
);
assert.equal(walkedOtherReoMortgage.draft.statedCurrentHousing, undefined);
assert.notEqual(walkedOtherReoMortgage.draft.pendingProposal?.field, "statedCurrentHousing");
assert.equal(otherReoRows(walkedOtherReoMortgage.draft)[0]?.payment, "3850");
assert.match(nextFoxAsk(walkedOtherReoMortgage.draft).text, /other property/);
assert.doesNotMatch(nextFoxAsk(walkedOtherReoMortgage.draft).text, /housing now/);

const afterCoborrowerNone = draft({
  ...afterLooks,
  housingAsked: true,
  estimatedHousing: 5543,
  statedHousehold: "none",
  householdAsked: true,
  subjectAddressAsked: true,
});
assert.notEqual(workspacePrompt(afterCoborrowerNone), "debts");
assert.doesNotMatch(nextFoxAsk(afterCoborrowerNone).text, /other debts, not counting this house/);
assert.doesNotMatch(nextFoxAsk(afterCoborrowerNone).text, /About how much do you pay each month on other debts/);

assert.equal(file32Invest.suggestedNetRental, -3293);
assert.ok(!requiredStructureLines(file32W2None).some((line) => /citizen/i.test(line.label)));
assert.equal(otherReoRows(draft({ ...file32W2None, statedOtherReo: "none" })).length, 0);

assert.equal(
  netOtherPropertyFile([
    { id: "a", rent: 3000, piti: 1450 },
  ]).fileNet,
  800,
);
assert.equal(
  netOtherPropertyFile([
    { id: "a", rent: 3000, piti: 1450 },
    { id: "b", rent: 2000, piti: 1800 },
  ]).fileNet,
  500,
);
assert.equal(netOtherPropertyFile([{ id: "thin", rent: 3000 }]).fileNet, null);
assert.equal(netOtherPropertyFile([{ id: "empty", piti: 1450 }]).fileNet, null);
assert.equal(
  fileNetConfirmCopy({ net: 800, completeCount: 1 }),
  "Suggested net rental is $800 · not underwritten. I’m using 75% of the lease minus this property’s PITI. Use this?",
);
assert.equal(
  fileNetConfirmCopy({ net: -300, completeCount: 1 }),
  "Suggested net rental is −$300 · not underwritten. That would count as a monthly liability. I’m using 75% of the lease minus this property’s PITI. Use this?",
);
assert.equal(
  fileNetConfirmCopy({ net: 500, completeCount: 2 }),
  "Suggested net rental is $500 · not underwritten. I’m using the other properties I can net. Use this?",
);
assert.equal(
  fileNetConfirmCopy({ net: -200, completeCount: 2 }),
  "Suggested net rental is −$200 · not underwritten. I’m using the other properties I can net. Use this?",
);

const noneFileNet = draft({ ...file32OtherReoYes, statedOtherReo: "none", otherProperties: [] });
assert.equal(draftOtherPropertyFileNet(noneFileNet).fileNet, null);
assert.equal(noneFileNet.suggestedFileNet, undefined);
assert.notEqual(noneFileNet.suggestedFileNet, 0);
assert.equal(
  applyExtractedFields(noneFileNet, {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "RIVER SERVICING",
      unpaid_principal: "220000",
      current_pi: "1450",
      property_address: "88 PINE ROAD",
      occupancy: "investment",
      gross_monthly_rent: "3000",
    },
  }).draft.pendingProposal?.field !== SUGGESTED_FILE_NET_FIELD,
  true,
);
const noneExtract = applyExtractedFields(noneFileNet, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "RIVER SERVICING",
    unpaid_principal: "220000",
    current_pi: "1450",
    property_address: "88 PINE ROAD",
    occupancy: "investment",
    gross_monthly_rent: "3000",
  },
});
assert.equal(otherReoRows(noneExtract.draft).length, 0);
assert.equal(draftOtherPropertyFileNet(noneExtract.draft).fileNet, null);
assert.equal(noneExtract.draft.suggestedFileNet, undefined);
assert.notEqual(noneExtract.draft.pendingProposal?.value, "0");
assert.doesNotMatch(nextFoxAsk(noneExtract.draft).text, /Suggested net rental is \$0/);

const oneOtherRental = applyExtractedFields(file32OtherReoYes, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "RIVER SERVICING",
    unpaid_principal: "220000",
    current_pi: "1450",
    property_address: "88 PINE ROAD",
    occupancy: "investment",
    gross_monthly_rent: "3000",
  },
});
assert.equal(otherReoRows(oneOtherRental.draft).length, 1);
assert.equal(otherReoRows(oneOtherRental.draft)[0]?.leaseGross, "3000");
assert.equal(otherReoRows(oneOtherRental.draft)[0]?.payment, "1450");
assert.equal(oneOtherRental.draft.pendingProposal?.field, SUGGESTED_FILE_NET_FIELD);
assert.equal(oneOtherRental.draft.pendingProposal?.value, "800");
assert.equal(oneOtherRental.draft.pendingProposal?.note, SUGGESTED_FILE_NET_NOTE);
assert.equal(
  nextFoxAsk(oneOtherRental.draft).text,
  "Suggested net rental is $800 · not underwritten. I’m using 75% of the lease minus this property’s PITI. Use this?",
);
assert.match(nextFoxAsk(oneOtherRental.draft).text, /\$800/);
assert.doesNotMatch(nextFoxAsk(oneOtherRental.draft).text, /housing now/);
assert.ok((nextFoxAsk(oneOtherRental.draft).actions ?? []).some((item) => item.label === "Use this"));
assert.equal(oneOtherRental.draft.facts?.[SUGGESTED_FILE_NET_FIELD], undefined);
assert.equal(oneOtherRental.draft.suggestedFileNet, undefined);
assert.equal(oneOtherRental.draft.statedCurrentHousing, undefined);
assert.equal(oneOtherRental.draft.statedMonthlyDebts, file32OtherReoYes.statedMonthlyDebts);
assert.equal(oneOtherRental.draft.facts?.current_pi, file32OtherReoYes.facts?.current_pi);
assert.equal(subjectMortgagePayment(oneOtherRental.draft), subjectMortgagePayment(file32OtherReoYes));
assert.equal(otherReoRows(oneOtherRental.draft)[0]?.pitia, undefined);
const oneUsed = resolveProposal(oneOtherRental.draft, "accept");
assert.equal(oneUsed.suggestedFileNet, 800);
assert.notEqual(oneUsed.suggestedFileNet, 2250);
assert.equal(oneUsed.fileNetRole, "income");
assert.equal(oneUsed.facts?.[SUGGESTED_FILE_NET_FIELD]?.value, "800");
assert.ok(previewFacts(oneUsed).some((fact) => fact.id === "suggestedFileNet" && fact.value === "$800"));
assert.ok(previewFacts(oneUsed).some((fact) => fact.id === "suggestedFileNet" && fact.note === SUGGESTED_FILE_NET_NOTE));
const oneSkipped = resolveProposal(oneOtherRental.draft, "decline");
assert.equal(oneSkipped.suggestedFileNet, undefined);
assert.equal(oneSkipped.facts?.[SUGGESTED_FILE_NET_FIELD], undefined);
assert.ok(!previewFacts(oneSkipped).some((fact) => fact.id === "suggestedFileNet"));
assert.equal(workspaceReply("Skip", oneOtherRental.draft)?.capture?.field, "decline-proposal");

const rentNoPiti = applyExtractedFields(file32OtherReoYes, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "RIVER SERVICING",
    unpaid_principal: "220000",
    property_address: "88 PINE ROAD",
    occupancy: "investment",
    gross_monthly_rent: "3000",
  },
});
assert.equal(otherReoRows(rentNoPiti.draft)[0]?.leaseGross, "3000");
assert.equal(draftOtherPropertyFileNet(rentNoPiti.draft).fileNet, null);
assert.notEqual(rentNoPiti.draft.pendingProposal?.field, SUGGESTED_FILE_NET_FIELD);
assert.equal(OTHER_REO_MORTGAGE_STATEMENTS, "Mortgage statements for all properties owned.");
assert.ok(
  (stillUsefulSection(rentNoPiti.draft)?.items ?? []).some(
    (item) => item.label === "Mortgage statements for all properties owned.",
  ),
);

const twoOtherRentals = applyExtractedFields(oneOtherRental.draft, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "LAKE SERVICING",
    unpaid_principal: "180000",
    current_pi: "1800",
    property_address: "12 CEDAR COURT",
    occupancy: "investment",
    monthly_rent: "2000",
  },
});
assert.equal(otherReoRows(twoOtherRentals.draft).length, 2);
assert.equal(draftOtherPropertyFileNet(twoOtherRentals.draft).fileNet, 500);
assert.equal(twoOtherRentals.draft.pendingProposal?.field, SUGGESTED_FILE_NET_FIELD);
assert.equal(twoOtherRentals.draft.pendingProposal?.value, "500");
assert.equal(
  nextFoxAsk(twoOtherRentals.draft).text,
  "Suggested net rental is $500 · not underwritten. I’m using the other properties I can net. Use this?",
);
assert.match(nextFoxAsk(twoOtherRentals.draft).text, /\$500/);
assert.equal(
  (nextFoxAsk(twoOtherRentals.draft).actions ?? []).filter((item) => item.label === "Use this").length,
  1,
);
const twoUsed = resolveProposal(twoOtherRentals.draft, "accept");
assert.equal(twoUsed.suggestedFileNet, 500);
assert.notEqual(twoUsed.suggestedFileNet, 2250);
assert.equal(twoUsed.suggestedNetRental, undefined);
assert.ok(!previewFacts(twoUsed).some((fact) => fact.id === "suggestedNetRental"));
assert.equal(twoUsed.pendingProposal, null);

const mixedThin = applyExtractedFields(oneUsed, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "HILL SERVICING",
    unpaid_principal: "99000",
    property_address: "5 MAPLE PLACE",
    occupancy: "investment",
    gross_monthly_rent: "2500",
  },
});
assert.equal(otherReoRows(mixedThin.draft).length, 2);
assert.equal(draftOtherPropertyFileNet(mixedThin.draft).fileNet, 800);
assert.equal(draftOtherPropertyFileNet(mixedThin.draft).completeCount, 1);
assert.ok(draftOtherPropertyFileNet(mixedThin.draft).rows.some((row) => row.thin && row.rent === 2500));
assert.ok(
  (stillUsefulSection(mixedThin.draft)?.items ?? []).some(
    (item) => item.label === OTHER_REO_MORTGAGE_STATEMENTS,
  ),
);
assert.equal(mixedThin.draft.suggestedFileNet, 800);

const noneAfterUse = writeStatedOtherReo(oneUsed, "none");
assert.equal(noneAfterUse.suggestedFileNet, undefined);
assert.equal(draftOtherPropertyFileNet(noneAfterUse).fileNet, null);
assert.equal(otherReoRows(noneAfterUse).length, 0);
assert.notEqual(noneAfterUse.pendingProposal?.field, SUGGESTED_FILE_NET_FIELD);

const oneNegative = applyExtractedFields(file32OtherReoYes, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "BIRCH SERVICING",
    unpaid_principal: "160000",
    current_pi: "1800",
    property_address: "9 BIRCH WAY",
    occupancy: "investment",
    gross_monthly_rent: "2000",
  },
});
assert.equal(oneNegative.draft.pendingProposal?.value, "-300");
assert.equal(
  nextFoxAsk(oneNegative.draft).text,
  "Suggested net rental is −$300 · not underwritten. That would count as a monthly liability. I’m using 75% of the lease minus this property’s PITI. Use this?",
);

const noInventedPiti = applyExtractedFields(file32OtherReoYes, {
  extractClass: "mortgage_statement",
  confidence: 0.93,
  fields: {
    servicer: "RIVER SERVICING",
    unpaid_principal: "220000",
    current_pi: "1450",
    property_address: "77 WILLOW LANE",
    occupancy: "investment",
    gross_monthly_rent: "3000",
    annual_taxes: "8400",
    hoa_monthly: "200",
  },
});
assert.equal(draftOtherPropertyFileNet(noInventedPiti.draft).fileNet, 800);
assert.equal(otherReoRows(noInventedPiti.draft)[0]?.pitia, undefined);
assert.equal(otherReoRows(noInventedPiti.draft)[0]?.payment, "1450");
assert.equal(noInventedPiti.draft.facts?.annual_taxes, file32OtherReoYes.facts?.annual_taxes);
assert.equal(noInventedPiti.draft.facts?.hoa_monthly, file32OtherReoYes.facts?.hoa_monthly);
assert.equal(noInventedPiti.draft.statedMonthlyDebts, file32OtherReoYes.statedMonthlyDebts);
assert.equal(noInventedPiti.draft.statedCurrentHousing, undefined);

const investWithOther = applyExtractedFields(
  draft({
    ...file32Invest,
    statedOtherReo: "yes",
    otherReoAsked: true,
    pendingProposal: null,
    subjectAddress: "14 OAK STREET",
  }),
  {
    extractClass: "mortgage_statement",
    confidence: 0.93,
    fields: {
      servicer: "RIVER SERVICING",
      unpaid_principal: "220000",
      current_pi: "1450",
      property_address: "88 PINE ROAD",
      occupancy: "investment",
      gross_monthly_rent: "3000",
    },
  },
);
assert.equal(investWithOther.draft.suggestedNetRental, -3293);
assert.equal(investWithOther.draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.value, "-3293");
assert.equal(draftOtherPropertyFileNet(investWithOther.draft).fileNet, 800);
assert.equal(investWithOther.draft.pendingProposal?.field, SUGGESTED_FILE_NET_FIELD);
assert.equal(investWithOther.draft.pendingProposal?.value, "800");
const investFileUsed = resolveProposal(investWithOther.draft, "accept");
assert.equal(investFileUsed.suggestedNetRental, -3293);
assert.equal(investFileUsed.suggestedFileNet, 800);
assert.ok(previewFacts(investFileUsed).some((fact) => fact.id === "suggestedNetRental" && fact.value === "−$3,293"));
assert.ok(previewFacts(investFileUsed).some((fact) => fact.id === "suggestedFileNet" && fact.value === "$800"));
assert.ok(previewFacts(investFileUsed).some((fact) => fact.id === "income" && /−\$3,293/.test(fact.value)));
assert.doesNotMatch(
  previewFacts(investFileUsed).find((fact) => fact.id === "income")?.value ?? "",
  /\$800/,
);

assert.equal(promoteExtractClass("other", { current_pi: "3850", servicer: "RIVER SERVICING" }), "mortgage_statement");
assert.equal(promoteExtractClass("other", { full_name: "JORDAN HALE" }), "government_id");
const otherClassMortgage = applyExtractedFields(file32OtherReoYes, {
  extractClass: "other",
  confidence: 0.2,
  fields: {
    servicer: "RIVER SERVICING",
    unpaid_principal: "385000",
    current_pi: "3850",
    property_address: "88 PINE ROAD",
  },
});
assert.equal(otherReoRows(otherClassMortgage.draft)[0]?.payment, "3850");
assert.equal(otherClassMortgage.draft.pendingProposal?.field, "otherReoPayment");
assert.equal(
  nextFoxAsk(otherClassMortgage.draft).text,
  "That’s $3,850 a month on the other property. Suggested · not underwritten. Use this?",
);
assert.equal(otherClassMortgage.draft.statedCurrentHousing, undefined);

const pineBytes = applyExtractedFields(file32OtherReoYes, {
  extractClass: "mortgage_statement",
  confidence: 0.94,
  fields: printedSampleFromBytes(readFileSync(join(root, "scripts/fixtures/mortgage-statement-pine.png")))?.fields ?? {},
});
assert.equal(otherReoRows(pineBytes.draft)[0]?.payment, "3850");
assert.equal(otherReoRows(pineBytes.draft)[0]?.address, "88 PINE ROAD");
assert.match(nextFoxAsk(pineBytes.draft).text, /\$3,850 a month on the other property/);
assert.equal(parseOtherPropertyRent("the other property rents for 3000 a month"), 3000);
assert.equal(parseOtherPropertyRent("rent is 3000"), null);
assert.deepEqual(
  parseOtherPropertyRental("I also own another rental. It rents for 2000 and the PITI is 1800"),
  { rent: 2000, piti: 1800, newRow: true },
);
assert.equal(
  parseOtherPropertyRent("I also own another rental. It rents for 2000 and the PITI is 1800"),
  null,
);
const pineThenRent = applyTypedOtherPropertyRent(pineBytes.draft, 3000);
assert.equal(otherReoRows(pineThenRent)[0]?.leaseGross, "3000");
assert.equal(draftOtherPropertyFileNet(pineThenRent).fileNet, -1600);
assert.equal(pineThenRent.pendingProposal?.field, SUGGESTED_FILE_NET_FIELD);
assert.match(nextFoxAsk(pineThenRent).text, /−\$1,600/);
assert.equal(pineThenRent.statedCurrentHousing, undefined);
const typedRentReply = workspaceReply("the other property rents for 3000 a month", pineBytes.draft);
assert.equal(typedRentReply?.capture?.field, "otherReoRent");
assert.match(typedRentReply?.text ?? "", /−\$1,600|Suggested net rental/);

const cedarBytes = applyExtractedFields(pineThenRent, {
  extractClass: "mortgage_statement",
  confidence: 0.94,
  fields: printedSampleFromBytes(readFileSync(join(root, "scripts/fixtures/mortgage-statement-cedar.png")))?.fields ?? {},
});
assert.equal(otherReoRows(cedarBytes.draft).length, 2);
const twoRentalWalk = applyTypedOtherPropertyRent(cedarBytes.draft, 2000);
assert.equal(draftOtherPropertyFileNet(twoRentalWalk).fileNet, -1900);
assert.equal(twoRentalWalk.pendingProposal?.value, "-1900");
assert.match(nextFoxAsk(twoRentalWalk).text, /I’m using the other properties I can net/);

const liveSecondRental =
  "I also own another rental. It rents for 2000 and the PITI is 1800";
assert.notEqual(workspaceReply(liveSecondRental, pineThenRent)?.capture?.field, "decline-proposal");
assert.doesNotMatch(workspaceReply(liveSecondRental, pineThenRent)?.text ?? "", /Left that line blank/);
const typedSecondRental = workspaceReply(liveSecondRental, pineThenRent);
assert.equal(typedSecondRental?.capture?.field, "otherReoRental");
assert.match(
  typedSecondRental?.text ?? "",
  /Suggested net rental is −\$1,900 · not underwritten\. I’m using the other properties I can net\. Use this\?/,
);
const twoTypedRows = applyTypedOtherPropertyRental(pineThenRent, {
  rent: 2000,
  piti: 1800,
  newRow: true,
});
assert.equal(otherReoRows(twoTypedRows).length, 2);
assert.equal(otherReoRows(twoTypedRows)[0]?.leaseGross, "3000");
assert.equal(otherReoRows(twoTypedRows)[0]?.payment, "3850");
assert.equal(otherReoRows(twoTypedRows)[1]?.leaseGross, "2000");
assert.equal(otherReoRows(twoTypedRows)[1]?.payment, "1800");
assert.equal(draftOtherPropertyFileNet(twoTypedRows).fileNet, -1900);
assert.equal(twoTypedRows.pendingProposal?.value, "-1900");
assert.equal(
  nextFoxAsk(twoTypedRows).text,
  "Suggested net rental is −$1,900 · not underwritten. I’m using the other properties I can net. Use this?",
);
assert.equal(twoTypedRows.statedCurrentHousing, undefined);
assert.equal(workspaceReply("no", pineThenRent)?.capture?.field, "decline-proposal");
const usedFirstFileNet = resolveProposal(pineThenRent, "accept");
assert.equal(usedFirstFileNet.suggestedFileNet, -1600);
const afterAcceptedSecond = applyTypedOtherPropertyRental(usedFirstFileNet, {
  rent: 2000,
  piti: 1800,
  newRow: true,
});
assert.equal(otherReoRows(afterAcceptedSecond).length, 2);
assert.equal(otherReoRows(afterAcceptedSecond)[0]?.leaseGross, "3000");
assert.equal(draftOtherPropertyFileNet(afterAcceptedSecond).fileNet, -1900);
assert.equal(afterAcceptedSecond.pendingProposal?.value, "-1900");
assert.match(nextFoxAsk(afterAcceptedSecond).text, /I’m using the other properties I can net/);
assert.match(nextFoxAsk(afterAcceptedSecond).text, /−\$1,900/);

const namedFromIdPage = applyExtractedFields(
  draft({
    ...afterLooks,
    borrowerName: undefined,
    pendingProposal: null,
    contact: { ...emptyDraft().contact, fullName: { ...emptyDraft().contact.fullName, value: "" } },
  }),
  {
    extractClass: "government_id",
    confidence: 0.94,
    fields: printedSampleFromBytes(readFileSync(join(root, "scripts/fixtures/government-id-jordan.png")))?.fields ?? {},
  },
);
assert.equal(namedFromIdPage.draft.pendingProposal?.field, "borrowerName");
assert.match(namedFromIdPage.draft.pendingProposal?.value ?? "", /Jordan Hale/i);

assert.equal(YEARS_IN_BUSINESS_ASK, "How long have you had this business?");
assert.doesNotMatch(YEARS_IN_BUSINESS_ASK, /running this/);
assert.equal(workspacePromptCopy("timeline", afterOcc).text, "What’s the timeline?");
const namedTenure = draft({
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
  awaitingYearsInBusiness: true,
  facts: {
    employer_name: {
      field: "employer_name",
      value: "Harbor Goods",
      source: "document",
      confirmed: true,
    },
  },
});
assert.equal(yearsInBusinessAskCopy(namedTenure), "How long have you had Harbor Goods?");
assert.equal(nextFoxAsk(namedTenure).text, "How long have you had Harbor Goods?");
assert.doesNotMatch(nextFoxAsk(namedTenure).text, /running this/);

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("850000", "680000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "self-employed" });
for (let i = 0; i < 12; i += 1) {
  const prompt = workspacePrompt(getFoxDraft());
  if (prompt === "years-in-business") break;
  if (prompt === "other-reo") {
    applyCapture({ field: "statedOtherReo", value: "none" });
    continue;
  }
  if (prompt === "borrower-name") {
    applyCapture({ field: "skip-borrower-name" });
    continue;
  }
  if (prompt === "documents" || prompt === "household" || nextDocInvite(getFoxDraft())) {
    applyCapture({ field: "skip-docs" });
    continue;
  }
  break;
}
assert.equal(workspacePrompt(getFoxDraft()), "years-in-business");
assert.equal(nextFoxAsk(getFoxDraft()).text, YEARS_IN_BUSINESS_ASK);
assert.doesNotMatch(nextFoxAsk(getFoxDraft()).text, /running this|What’s the timeline\?/);
applyCapture({ field: "skip-years-in-business" });
for (let i = 0; i < 8; i += 1) {
  const prompt = workspacePrompt(getFoxDraft());
  if (prompt === "review") {
    applyCapture({ field: "confirm-draft" });
    continue;
  }
  if (prompt === "former-history") {
    applyCapture({ field: "skip-former-history" });
    continue;
  }
  if (prompt === "property-address") {
    applyCapture({ field: "skip-property-address" });
    continue;
  }
  if (prompt === "citizenship") {
    applyCapture({ field: "skip-citizenship" });
    continue;
  }
  if (prompt === "assets") {
    applyCapture({ field: "skip-available-assets" });
    continue;
  }
  if (prompt === "household") {
    applyCapture({ field: "skip-household" });
    continue;
  }
  if (prompt === "coborrower-name") {
    applyCapture({ field: "skip-coborrower-name" });
    continue;
  }
  if (prompt === "housing") break;
  break;
}
assert.equal(workspacePrompt(getFoxDraft()), "housing");
const walkHousingChange = workspaceReply("Change", getFoxDraft());
assert.equal(walkHousingChange?.capture?.field, "needs-correction");
assert.equal(walkHousingChange?.text, CORRECT_ASK);
assert.doesNotMatch(walkHousingChange?.text ?? "", /property type|citizen|Borrower 2|co-borrower/i);
applyCapture({ field: "needs-correction" });
assert.equal(workspacePrompt(getFoxDraft()), "correct");
applyCapture({ field: "keep-line" });
if (workspacePrompt(getFoxDraft()) === "housing") {
  applyCapture({ field: "skip-housing" });
}
for (let i = 0; i < 8; i += 1) {
  const prompt = workspacePrompt(getFoxDraft());
  if (prompt === "done") break;
  if (prompt === "property-type") {
    applyCapture({ field: "skip-property-type" });
    continue;
  }
  if (prompt === "property-address") {
    applyCapture({ field: "skip-property-address" });
    continue;
  }
  if (prompt === "citizenship") {
    applyCapture({ field: "skip-citizenship" });
    continue;
  }
  if (prompt === "assets") {
    applyCapture({ field: "skip-available-assets" });
    continue;
  }
  break;
}
assert.equal(workspacePrompt(getFoxDraft()), "done");
assert.equal(getFoxDraft().contact.email.value, "");
const walkProceed = workspaceReply("Proceed", getFoxDraft());
assert.equal(walkProceed?.text, MOTION_COPY.emailAsk);
assert.deepEqual((walkProceed?.actions ?? []).map((item) => item.label), ["Skip"]);
applyCapture({ field: "proceed" });
assert.equal(getFoxDraft().pendingFinish, "proceed");
assert.notEqual(motionOf(getFoxDraft()), "in_queue");
assert.equal(workspacePromptCopy("done", getFoxDraft()).text, MOTION_COPY.emailAsk);
applyCapture({ field: "email", value: "founder-walk@onyx.test" });
assert.equal(motionOf(getFoxDraft()), "in_queue");
assert.equal(workspacePromptCopy("done", getFoxDraft()).text, MOTION_COPY.in_queue);
const walkQueueChips = (workspacePromptCopy("done", getFoxDraft()).actions ?? []).map((item) => item.label);
assert.deepEqual(walkQueueChips, ["What happens next?", "Upload more", "Ask Fox", "Request human"]);
assert.ok(!walkQueueChips.includes("Upload this"));
assert.ok(!walkQueueChips.includes("Skip"));
assert.ok(!walkQueueChips.includes("Not yet"));

resetWorkspaceForEntry("acr", "buy");
applyCapture({ field: "occupancy", value: "primary" });
applyCapture({ field: "timeline", value: "ready-now" });
capturePurchaseFunds("500000", "400000");
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
confirmLooksRight();
if (workspacePrompt(getFoxDraft()) === "housing") applyCapture({ field: "skip-housing" });
applyCapture({ field: "proceed" });
assert.equal(workspacePromptCopy("done", getFoxDraft()).text, MOTION_COPY.emailAsk);
applyCapture({ field: "skip-email" });
assert.equal(getFoxDraft().contact.email.value, "");
assert.equal(getFoxDraft().emailSkipped, true);
assert.equal(motionOf(getFoxDraft()), "in_queue");
assert.equal(workspacePromptCopy("done", getFoxDraft()).text, MOTION_COPY.in_queue);

extractAdapterSmoke()
  .then(() => {
    console.log("desk smoke ok");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
