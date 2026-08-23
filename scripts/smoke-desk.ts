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
import {
  SUGGESTED_NOTE,
  SUGGESTED_INCOME_NOTE,
  HIGH_LTV_CAUTION,
  PRICING_WAITS,
  YEARS_IN_BUSINESS_ASK,
  writeYearsInBusiness,
  canLooksRight,
  fileCompleteness,
  guidelineCaution,
  loanExceedsPurchasePrice,
  proposalAskCopy,
  resolveProposal,
  showsAgencyCompleteness,
} from "../components/fox/completeness";
import {
  DECLINING_INCOME_CAUTION,
  QUALIFYING_INCOME_FIELD,
  laterYearIncomeLower,
  monthlyFromAnnual,
  monthlyQualifyingFromExtract,
  parseExtractMoney,
  readTaxCashflows,
  scheduleCAnnual,
  stableOrDecliningAnnual,
} from "../components/fox/qualifyingIncome";
import {
  MOTION_COPY,
  applyLooksRightMotion,
  creditPullPermitted,
  gatheringCopy,
  gatheringList,
  motionOf,
  nextActorOf,
  openReviewWorkItem,
  reviewIsSitting,
} from "../components/fox/motion";
import {
  EXTRACT_SCHEMA_KEYS,
  applyExtractedFields,
  isDeadFileWriteLine,
  extractClassFromFilename,
  fileStillUsefulNote,
  missingAskCopy,
  missingExtractClasses,
  preferFilenameClass,
  receivedClassOf,
  receivedTaxReturnCount,
  stillUsefulAskCopy,
  stillUsefulLabels,
  taxReturnFilename,
  resolveFactConflict,
  sanitizeExtractedFields,
  skipRemainingClasses,
  slotFromFilename as slotFromName,
} from "../components/fox/fileWrite";
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
  HELOC_OFFER_COPY,
  JUMBO_OFFER_COPY,
  JUMBO_PURPOSE_ASK,
  lastFoxTurn,
  loanLooksAboveCeiling,
  migrateRestoredFoxMessages,
  inertSupersededIncomeConfirms,
  namedOutOfState,
  parseFundsAmount,
  parseWorkspaceEdit,
  CREDIT_RANGE_ASK,
  CREDIT_RANGE_FOLLOW,
  CREDIT_STATED_NOTE,
  PATH_ASK_TEXT,
  previewFacts,
  previewRateApplies,
  PRICING_WHEN_READY,
  productIntentFromText,
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
  docReactionAsk,
  nextFoxAsk,
  shouldDeferStillUsefulAsk,
  parseYearsInBusiness,
  workspaceUpdateCopy,
  skipCurrentInvite,
  DOC_INVITE_COPY,
} from "../components/fox/workspace";
import { HOME_IDLE_TEXT, homePathActions, homeProductActions } from "../components/fox/homeIdle";
import { assertOnyxFixtures } from "./assert-onyx-fixtures";

assertOnyxFixtures();

function draft(partial: Record<string, unknown> = {}) {
  return { ...emptyDraft(), workspaceFlow: true, ...partial };
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
  assert.ok((latest.actions ?? []).some((item) => item.label === "Leave blank"));
  assert.notEqual(latest.text, MOTION_COPY.in_queue);
  assert.doesNotMatch(latest.text, /ONYX has this for review/);
  const queued = queuedMidConfirm(live);
  assert.equal(shouldDeferStillUsefulAsk(queued), true);
  assert.equal(workspacePrompt(queued), "confirm-proposal");
  const queuedAsk = nextFoxAsk(queued);
  assert.match(queuedAsk.text, amount);
  assert.ok((queuedAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok((queuedAsk.actions ?? []).some((item) => item.label === "Leave blank"));
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
  for (let i = 0; i < 8 && workspacePrompt(next) === "documents"; i += 1) {
    next = { ...next, ...skipCurrentInvite(next) };
  }
  return next;
}

function confirmLooksRight() {
  for (let i = 0; i < 8 && workspacePrompt(getFoxDraft()) === "documents"; i += 1) {
    applyCapture({ field: "skip-docs" });
  }
  return applyCapture({ field: "confirm-draft" });
}

function withIncome(
  base: ReturnType<typeof draft>,
  value: "w2" | "self-employed" | "both" | "other" = "w2",
) {
  return draft({
    ...base,
    incomeAsked: true,
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
assert.match(unclearProduct?.text ?? "", /what are you looking to do/i);
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
assert.equal(workspacePrompt(afterOcc), "value");
assert.notEqual(workspacePrompt(afterOcc), "timeline");
assert.equal(amountAskText(afterOcc), "What’s the purchase price?");
const occThenPrice = workspaceReply("Primary", draft({ path: "acr", productIntent: "buy" }));
assert.equal(occThenPrice?.capture?.field, "occupancy");
assert.match(occThenPrice?.text ?? "", /purchase price/i);
assert.doesNotMatch(occThenPrice?.text ?? "", /^Primary\.|Primary\. What’s the purchase price/i);
assert.doesNotMatch(occThenPrice?.text ?? "", /timeline|ready now|30–90|just exploring/i);
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
assert.match(buyAfterOcc?.text ?? "", /What’s the purchase price\?/);
assert.doesNotMatch(buyAfterOcc?.text ?? "", /^Primary\./);
assert.doesNotMatch(buyAfterOcc?.text ?? "", /rough amount|^what’s a rough amount/i);

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
assert.ok((percent20?.actions ?? []).some((item) => item.label === "Leave blank"));
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
assert.doesNotMatch(`${creditAsk.text} ${creditAsk.followUp ?? ""}`, /fico|we pulled|pulled your credit|live score/i);
assert.deepEqual(
  (creditAsk.actions ?? []).map((item) => item.label),
  ["760+", "720–759", "680–719", "Not sure"],
);
assert.deepEqual(
  CREDIT_WORKSPACE_BUBBLES.map((item) => item.label),
  ["760+", "720–759", "680–719", "Not sure"],
);
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
assert.match(incomeReply?.text ?? "", /sketch/i);
assert.match(incomeReply?.text ?? "", /notepad/i);
assert.match(incomeReply?.followUp ?? "", /government ID/i);
assert.deepEqual(
  (incomeReply?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Skip", "Not yet"],
);
assert.ok(!(incomeReply?.actions ?? []).some((item) => item.label === "Upload this"));

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
assert.match(creditEditAsk.text, /still right/i);
assert.ok((creditEditAsk.actions ?? []).some((item) => item.label === "Keep this"));
const midCreditEdit = workspaceReply("720–759", getFoxDraft());
assert.equal(midCreditEdit?.capture?.field, "creditRange");
if (midCreditEdit?.capture) applyCapture(midCreditEdit.capture);
assert.equal(getFoxDraft().creditBand, "720-759");
assert.equal(getFoxDraft().propertyValueAmount, 1200000);
assert.equal(getFoxDraft().incomeType.value, "w2");
applyCapture({ field: "correct", value: "income", line: "income" });
const incomeEditAsk = workspacePromptCopy("income", getFoxDraft());
assert.match(incomeEditAsk.text, /still right/i);
assert.ok((incomeEditAsk.actions ?? []).some((item) => item.label === "Keep this"));
const incomeEdit = workspaceReply("Self-employed", getFoxDraft());
assert.equal(incomeEdit?.capture?.field, "incomeType");
if (incomeEdit?.capture) applyCapture(incomeEdit.capture);
assert.equal(getFoxDraft().incomeType.value, "self-employed");
assert.equal(getFoxDraft().propertyValueAmount, 1200000);
assert.equal(getFoxDraft().downPaymentAmount, 240000);
assert.equal(getFoxDraft().creditBand, "720-759");
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
assert.equal(workspacePrompt(getFoxDraft()), "product");
assert.equal(workspacePrompt(afterIncome), "documents");
assert.match(workspacePromptCopy("documents", afterIncome).text, /sketch/i);
assert.match(workspacePromptCopy("documents", afterIncome).followUp ?? "", /government ID/i);
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
assert.equal(workspacePrompt({ ...afterIncome, propertyValueAmount: 900000 }), "documents");
const afterIncomeReady = skipDocInvites(afterIncome);
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
assert.ok(canLooksRight(skipDocInvites(noTimelineFile)));
assert.equal(workspacePrompt(noTimelineFile), "documents");
assert.equal(workspacePrompt(skipDocInvites(noTimelineFile)), "review");
assert.ok(previewFacts(noTimelineFile).some((fact) => fact.id === "timeline" && fact.value === "—"));
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
assert.equal(workspacePrompt(skipDocInvites(notSure)), "review");

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
assert.ok(creditFacts.some((fact) => fact.id === "file" && /sketch/.test(fact.value)));
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
assert.ok(creditFacts.some((fact) => fact.id === "rate" && fact.value.includes(SAMPLE_RATE_LABEL)));
assert.ok(creditFacts.some((fact) => fact.id === "rate" && fact.note === PREVIEW_RATE_NOTE));
const convReward = creditFacts.find((fact) => fact.id === "reward");
assert.equal(convReward?.value, "Prepared when you join");
assert.ok(!/\$[\d,]/.test(convReward?.value ?? ""));
assert.ok(!/446|604/.test(convReward?.value ?? ""));
assert.equal(structureFixPrompt("credit"), "credit");
assert.equal(structureFixPrompt("income"), "income");

const recap = fileSummaryFacts(afterIncome);
const recapRate = recap.find((fact) => fact.id === "rate");
assert.ok(recapRate?.value.includes(SAMPLE_RATE_LABEL));
assert.ok(recapRate?.value.includes(PREVIEW_RATE_NOTE));
assert.ok(recap.some((fact) => fact.id === "income" && fact.value === "W-2"));

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
assert.equal(workspacePrompt(skipDocInvites(afterOccEdit)), "review");
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
assert.ok(canLooksRight(skipDocInvites(helocReady)));
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
assert.ok(canLooksRight(skipDocInvites(refiReady)));
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
assert.ok(investFacts.some((fact) => fact.id === "caution" && fact.value === PRICING_WAITS));
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
assert.match(fhaNamed?.text ?? "", /FHA/);
assert.match(fhaNamed?.text ?? "", /cannot show a preview rate/i);
assert.ok((fhaNamed?.actions ?? []).some((item) => item.label === "Request human"));
const fhaReady = draft({ ...afterIncome, govProgram: "fha" });
assert.ok(!previewRateApplies(fhaReady));
assert.ok(previewFacts(fhaReady).some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(previewFacts(fhaReady).some((fact) => fact.id === "product" && fact.value === "Buy"));

const bkNamed = workspaceReply("I have an active bankruptcy", afterIncome);
assert.equal(bkNamed?.capture?.field, "creditEvent");
assert.match(bkNamed?.text ?? "", /still Proceed/);
assert.doesNotMatch(bkNamed?.text ?? "", /will contact you/i);
const bkReady = draft({
  ...afterIncome,
  sampleAccepted: true,
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

const matrixLooksRight = workspaceReply("Looks right", skipDocInvites(investBuy));
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
assert.equal(correct.text, "Tap any line on the structure.");
assert.ok(!correct.actions?.length);
const leftoverCorrect = promptCopy("correct");
assert.equal(leftoverCorrect.text, "Tap any line on the structure.");
assert.ok(!leftoverCorrect.actions?.length);

const afterLooks = draft({
  ...afterIncome,
  sampleAccepted: true,
  workspaceDraftStatus: "with-originator",
  phase: "confirmed",
});
assert.equal(workspacePrompt(afterLooks), "done");
assert.equal(statusCopy(afterLooks), "gathering");
assert.equal(nextActorOf(afterLooks), "You");
assert.notEqual(statusCopy(afterLooks), "Assigned / reviewing");
const assignedFacts = previewFacts(afterLooks);
assert.ok(assignedFacts.some((fact) => fact.id === "status" && fact.value === "gathering"));
assert.ok(assignedFacts.some((fact) => fact.id === "next" && fact.value === "You"));
assert.ok(assignedFacts.some((fact) => fact.id === "file"));
assert.equal(fileCompleteness(afterLooks)?.state, "sketch");
assert.match(fileCompleteness(afterLooks)?.copy ?? "", /sketch · \d of 5/);
assert.ok(!/agency_partial|agency_ready/.test(fileCompleteness(afterLooks)?.copy ?? ""));
assert.ok(
  assignedFacts.some(
    (fact) => fact.id === "file" && /sketch · \d of 5/.test(fact.value) && !/agency_partial|agency_ready/.test(fact.value),
  ),
);
assert.match(fileStillUsefulNote(afterLooks) ?? "", /still useful: ID/i);
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
assert.match(fileCompleteness(docsBeforeLooks)?.copy ?? "", /sketch · \d of 5/);
assert.ok(!/agency_partial|agency_ready/.test(fileCompleteness(docsBeforeLooks)?.copy ?? ""));
assert.ok(
  previewFacts(docsBeforeLooks).some(
    (fact) => fact.id === "file" && /sketch · \d of 5/.test(fact.value) && !/agency_partial/.test(fact.value),
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
assert.equal(workspacePrompt(skipCurrentInvite(w2AfterStub)), "review");
const w2Request = docsRequestForIncome("w2");
assert.deepEqual(w2Request.labels, ["government ID", "latest paystub", "W-2"]);
assert.ok(!w2Request.labels.includes("Bank statements"));

const seIncome = withIncome(afterCredit, "self-employed");
const selfLooks = workspaceReply("Looks right", skipDocInvites(seIncome));
assert.equal(selfLooks?.capture?.field, "confirm-draft");
assert.match(selfLooks?.text ?? "", /file can move|proceed/i);
assert.doesNotMatch(selfLooks?.text ?? "", /government ID|most recent tax return|prior-year return if available|upload what you have|upload docs/i);
assert.ok(!(selfLooks?.actions ?? []).some((item) => item.label === "Upload docs"));
assert.ok((selfLooks?.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok((selfLooks?.actions ?? []).some((item) => item.label === "Not yet"));
const seCoachLooks = applyLooksRightMotion(skipDocInvites(seIncome));
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
assert.match(seIncomeReply?.text ?? "", /sketch/i);
assert.match(seIncomeReply?.text ?? "", /self-employed/i);
assert.match(seIncomeReply?.followUp ?? "", /government ID/i);
assert.deepEqual(
  (seIncomeReply?.actions ?? []).map((item) => item.label),
  ["Start with ID", "Skip", "Not yet"],
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
assert.equal(workspacePrompt(skippedLooks), "done");
assert.equal(statusCopy(skippedLooks), "ready");
assert.equal(nextActorOf(skippedLooks), "You");
assert.ok(previewFacts(skippedLooks).some((fact) => fact.id === "docs" && fact.value === "Skipped"));
assert.ok(previewFacts(skippedLooks).some((fact) => fact.id === "originator"));
assert.ok(previewFacts(skippedLooks).some((fact) => fact.id === "next" && fact.value === "You"));

const skipReply = workspaceReply("Skip for now", { ...afterLooks, correcting: "documents", docsOpen: true });
assert.equal(skipReply?.capture?.field, "skip-docs");
assert.equal(workspacePrompt({ ...afterLooks, documentsSkipped: true, correcting: null, docsOpen: false }), "done");

assert.equal(workspacePrompt({ ...afterLooks, correcting: "occupancy" }), "occupancy");
assert.notEqual(workspacePrompt({ ...afterLooks, correcting: "occupancy" }), "documents");
assert.equal(
  workspacePrompt({
    ...afterLooks,
    correcting: null,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "second-home" },
  }),
  "done",
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
assert.equal(getFoxDraft().documentsSkipped, false);
assert.equal(workspacePrompt(getFoxDraft()), "documents");
applyCapture({ field: "skip-docs" });
applyCapture({ field: "skip-docs" });
applyCapture({ field: "skip-docs" });
assert.equal(workspacePrompt(getFoxDraft()), "review");
confirmLooksRight();
const confirmed = getFoxDraft();
assert.equal(workspacePrompt(confirmed), "done");
assert.equal(statusCopy(confirmed), "ready");
assert.equal(nextActorOf(confirmed), "You");
assert.equal(confirmed.phase, "confirmed");
assert.ok(confirmed.sampleAccepted);
assert.notEqual(motionOf(confirmed), "in_queue");
applyCapture({ field: "open-docs" });
const opened = getFoxDraft();
assert.equal(opened.docsOpen, true);
assert.equal(opened.phase, "confirmed");
assert.equal(workspacePrompt(opened), "done");
assert.ok(statusCopy(opened) === "ready" || statusCopy(opened) === "gathering");
applyCapture({ field: "skip-docs" });
const afterSkip = getFoxDraft();
assert.equal(afterSkip.documentsSkipped, true);
assert.equal(afterSkip.docsOpen, false);
assert.equal(afterSkip.phase, "confirmed");
assert.notEqual(motionOf(afterSkip), "in_queue");
assert.equal(statusCopy(afterSkip), "ready");
assert.equal(workspacePrompt(afterSkip), "done");
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
assert.equal(paystubWrite.draft.facts?.employer_name?.value, "Harbor Steel");
assert.equal(paystubWrite.draft.facts?.gross_period?.value, "7200");
assert.equal(paystubWrite.draft.facts?.pay_period_end?.value, "2026-07-31");
assert.equal(paystubWrite.draft.facts?.employer_name?.source, "extracted-unconfirmed");
assert.equal(paystubWrite.draft.facts?.employer_name?.confirmed, true);
assert.equal(paystubWrite.draft.facts?.ssn, undefined);
assert.equal(workspacePrompt(paystubWrite.draft), "confirm-proposal");
assert.equal(paystubWrite.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
assert.equal(paystubWrite.draft.pendingProposal?.value, "7200");
assert.equal(paystubWrite.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
assert.equal(paystubWrite.draft.facts?.qualifying_income, undefined);
assert.equal(paystubWrite.draft.productIntent, afterLooks.productIntent);
assert.ok(previewFacts(paystubWrite.draft).some((fact) => fact.id === "employer" && fact.value === "Harbor Steel"));
assert.ok(previewFacts(paystubWrite.draft).some((fact) => fact.id === "pay" && /7,200/.test(fact.value)));
assert.ok(
  previewFacts(paystubWrite.draft).some(
    (fact) =>
      fact.id === "qualifying" &&
      /7,200/.test(fact.value) &&
      fact.note === SUGGESTED_INCOME_NOTE,
  ),
);
assert.ok(previewFacts(paystubWrite.draft).every((fact) => fact.id !== "product" || fact.value !== "Other"));
assert.equal(structureFixPrompt("employer"), null);
assert.equal(structureFixPrompt("pay"), null);

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
assert.ok(w2Useful.includes("second-year W-2"));
assert.ok(w2Useful.includes("government ID"));
assert.ok(w2Useful.includes("latest paystub"));
assert.ok(!missingExtractClasses(w2AfterLooks).includes("w2"));
assert.ok(w2Useful.length > missingExtractClasses(w2AfterLooks).length);
assert.match(fileStillUsefulNote(w2AfterLooks) ?? "", /still useful: ID/i);
assert.match(fileStillUsefulNote(w2AfterLooks) ?? "", /second-year W-2/i);
assert.match(gatheringList(w2AfterLooks), /second-year W-2/i);
assert.equal(gatheringCopy(w2AfterLooks), MOTION_COPY.ready);
assert.ok(
  previewFacts(w2AfterLooks).some(
    (fact) => fact.id === "file" && /still useful: ID/i.test(fact.note ?? ""),
  ),
);
assert.equal(fileCompleteness(w2AfterLooks)?.state, "sketch");
assert.match(fileCompleteness(w2AfterLooks)?.copy ?? "", /sketch · \d of 5/);
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

assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("schedule_c_net_profit"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("return_kind"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("k1_ordinary_income"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("k1_distributions"));
assert.ok(EXTRACT_SCHEMA_KEYS.tax_return.includes("amortization"));
assert.ok(EXTRACT_SCHEMA_KEYS.paystub.includes("pay_frequency"));
assert.equal(stableOrDecliningAnnual(120000, 96000), 96000);
assert.equal(stableOrDecliningAnnual(96000, 120000), 108000);
assert.equal(parseExtractMoney("(12,000)"), -12000);
assert.equal(parseExtractMoney("-$8,000"), -8000);
assert.equal(scheduleCAnnual({ netProfit: -24000, depreciation: 0 }), -24000);
assert.equal(monthlyFromAnnual(-24000), -2000);
assert.equal(scheduleCAnnual({ netProfit: 80000, depreciation: 8000 }), 88000);
assert.equal(monthlyFromAnnual(72000), 6000);
assert.equal(monthlyFromAnnual(40000), 3333);

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
assert.equal(mayaId.draft.contact.fullName.value, "Maya Chen");
const mayaAsk = docReactionAsk(mayaId.draft, "government_id");
assert.match(mayaAsk?.text ?? "", /Nice to meet you, Maya/);
assert.match(mayaAsk?.text ?? "", /keep this file working|clearer picture|lower cost|stronger equity/);
assert.match(mayaAsk?.text ?? "", /most recent tax return/);
assert.doesNotMatch(
  mayaAsk?.text ?? "",
  /Updated identity from ID|approv|eligible|you qualify|sales/i,
);
assert.deepEqual(
  (mayaAsk?.actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
const jordanId = applyExtractedFields(
  draft({
    ...seIncome,
    docsStarted: true,
    documents: [
      {
        slot: "id",
        name: "jordan-id.png",
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
    fields: { full_name: "JORDAN HALE" },
  },
);
const jordanAsk = docReactionAsk(jordanId.draft, "government_id");
assert.match(jordanAsk?.text ?? "", /Nice to meet you, Jordan/);
assert.doesNotMatch(jordanAsk?.text ?? "", /JORDAN/);
const mayaThenReturn = applyExtractedFields(mayaId.draft, {
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
assert.equal(workspacePromptCopy("documents", mayaAccepted).text, YEARS_IN_BUSINESS_ASK);
const mayaYears = workspaceReply("How long have you been running this?", mayaAccepted);
assert.equal(mayaYears?.capture, undefined);
const mayaYearsIn = workspaceReply("5 years", mayaAccepted);
assert.equal(mayaYearsIn?.capture?.field, "yearsInBusiness");
assert.match(mayaYearsIn?.text ?? "", /prior-year return|stable/i);
assert.doesNotMatch(mayaYearsIn?.text ?? "", /Years in business|Updated income from tax return/);

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
assert.match(seAsk, /From the return I’m suggesting/);
assert.match(seAsk, /Suggested qualifying income · not underwritten/);
assert.match(seAsk, /9,000/);
assert.doesNotMatch(seAsk, /1084|\bDU\b|approved|eligible|you qualify|don’t qualify|agency_ready/i);
const seLiveAsk = workspacePromptCopy("confirm-proposal", seReturn.draft);
assert.match(seLiveAsk.text, /Got the 2024 return/);
assert.match(seLiveAsk.text, /\$9,000/);
assert.match(seLiveAsk.text, /Suggested qualifying income · not underwritten/);
assert.match(seLiveAsk.text, /Use this/);
assert.doesNotMatch(seLiveAsk.text, /Updated income from tax return/);
assert.ok((seLiveAsk.actions ?? []).some((item) => item.label === "Use this"));
assert.ok((seLiveAsk.actions ?? []).some((item) => item.label === "Leave blank"));
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
assert.match(stillUsefulAskCopy(seWalk.draft), /government ID and prior-year return/i);
assert.doesNotMatch(stillUsefulAskCopy(seWalk.draft), /government ID and tax return/i);
assert.match(gatheringList(seWalk.draft), /government ID and prior-year return/i);
assert.equal(gatheringCopy(seWalk.draft), MOTION_COPY.ready);
assert.doesNotMatch(gatheringList(seWalk.draft), /government ID and tax return/i);
assert.match(fileStillUsefulNote(seWalk.draft) ?? "", /still useful: ID · prior-year return/i);
assert.doesNotMatch(fileStillUsefulNote(seWalk.draft) ?? "", /tax return/i);
assert.match(workspacePromptCopy("documents", seWalk.draft).text, /government ID and prior-year return/i);
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
assert.match(fileStillUsefulNote(seWalkWrite.draft) ?? "", /prior-year return/i);
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
assert.match(stillUsefulAskCopy(seBothYears.draft), /^Government ID\.$/);
assert.match(gatheringList(seBothYears.draft), /government ID/i);
assert.doesNotMatch(gatheringList(seBothYears.draft), /tax return|prior-year return/i);
assert.equal(gatheringCopy(seBothYears.draft), MOTION_COPY.ready);
assert.match(fileStillUsefulNote(seBothYears.draft) ?? "", /^still useful: ID$/);
assert.doesNotMatch(fileStillUsefulNote(seBothYears.draft) ?? "", /tax return|prior-year return|return/i);
assert.match(workspacePromptCopy("documents", seBothYears.draft).text, /^Government ID\.$/);
assert.doesNotMatch(workspacePromptCopy("documents", seBothYears.draft).text, /tax return|prior-year/i);
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
assert.equal((workspacePromptCopy("documents", seAccepted).actions ?? []).length, 0);
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
    (fact) => fact.id === "years-in-business" && /5 years/.test(fact.value),
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
assert.match(workspacePromptCopy("years-in-business", yearsWritten).text, /5 years/);
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
assert.equal(workspacePromptCopy("done", queuedBlank).followUp, YEARS_IN_BUSINESS_ASK);
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
assert.ok((seTwoYearAsk.actions ?? []).some((item) => item.label === "Leave blank"));
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
assert.match(proposalAskCopy(seDecliningYearTwo.draft.pendingProposal!), /Suggested qualifying income · not underwritten/);
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
assert.match(entityAsk.text, /Got the 2024 return/);
assert.match(entityAsk.text, /3,333/);
assert.ok((entityAsk.actions ?? []).some((action) => action.label === "Use this"));
assert.ok((entityAsk.actions ?? []).some((action) => action.label === "Leave blank"));
assertIncomeChipsHoldOverQueue(entityOrdinary.draft, /3,333/);
assert.match(proposalAskCopy(entityOrdinary.draft.pendingProposal!), /3,333/);
assert.match(proposalAskCopy(entityOrdinary.draft.pendingProposal!), /Suggested qualifying income · not underwritten/);
assert.ok(stillUsefulLabels(entityOrdinary.draft).includes("K-1 distributions"));
assert.ok(stillUsefulLabels(entityOrdinary.draft).includes("government ID"));
assert.ok(!stillUsefulLabels(entityOrdinary.draft).includes("prior-year return"));
assert.match(stillUsefulAskCopy(entityOrdinary.draft), /government ID and K-1 distributions/i);
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
assert.equal(w2Extract.draft.facts?.qualifying_income, undefined);
assert.equal(workspacePrompt(w2Extract.draft), "confirm-proposal");

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
assert.ok(canLooksRight(skipDocInvites(highLtvBuy)));
assert.equal(guidelineCaution(highLtvBuy), HIGH_LTV_CAUTION);
assert.ok(previewFacts(highLtvBuy).some((fact) => fact.id === "caution" && fact.value === HIGH_LTV_CAUTION));
assert.doesNotMatch(HIGH_LTV_CAUTION, /approv|eligible|ineligible|\bDU\b|\bAUS\b|you qualify|will contact you/i);
const highLtvLooks = workspaceReply("Looks right", skipDocInvites(highLtvBuy));
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
assert.ok(canLooksRight(skipDocInvites(nonsenseBuy)));
const nonsenseLooks = applyLooksRightMotion(skipDocInvites(nonsenseBuy));
assert.equal(motionOf(nonsenseLooks), "escalated");
assert.equal(nextActorOf(nonsenseLooks), "ONYX");
assert.ok(canLooksRight(skipDocInvites(nonsenseBuy)));
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
assert.match(cashOutNamed?.text ?? "", /cannot show a preview rate/i);
assert.ok(!previewRateApplies(draft({ ...refiReady, cashOut: true })));
assert.ok(previewFacts(draft({ ...refiReady, cashOut: true })).some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));

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

const stripped = sanitizeExtractedFields("government_id", {
  full_name: "Jordan Lee",
  id_last4: "987654321",
  ssn: "123-45-6789",
  fico: "742",
  credit_score: "741",
  state: "CA",
});
assert.equal(stripped.full_name, "Jordan Lee");
assert.equal(stripped.id_last4, "4321");
assert.equal(stripped.ssn, undefined);
assert.equal(stripped.fico, undefined);
assert.equal(stripped.credit_score, undefined);

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
assert.equal(workspacePrompt(skippedRemaining), "done");

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
assert.equal(wrote.draft.facts?.employer_name?.value, "Harbor Steel");
assert.equal(wrote.draft.productIntent, "buy");
assert.equal(workspacePrompt(wrote.draft), "done");
assert.ok(statusCopy(wrote.draft) === "ready" || statusCopy(wrote.draft) === "gathering");
assert.ok(previewFacts(wrote.draft).some((fact) => fact.id === "originator"));
assert.ok(previewFacts(wrote.draft).some((fact) => fact.id === "next"));
assert.ok(previewFacts(wrote.draft).some((fact) => fact.id === "employer" && fact.value === "Harbor Steel"));
assert.ok(previewFacts(wrote.draft).some((fact) => fact.id === "pay" && /7,200/.test(fact.value)));
assert.ok(previewFacts(wrote.draft).some((fact) => fact.id === "docs" && /Paystubs in/.test(fact.value)));
assert.ok(previewFacts(wrote.draft).every((fact) => fact.id !== "docs" || !/Other in/.test(fact.value)));
assert.ok(previewFacts(wrote.draft).every((fact) => fact.id !== "product" || fact.value === "Buy"));
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
assert.equal(failedOther.draft.documents[0]?.status, "failed");
assert.equal(failedOther.draft.facts?.employer_name, undefined);
assert.equal(failedOther.quietLines[0], FAILED_READ_NOTE);
assert.ok(previewFacts(failedOther.draft).some((fact) => fact.id === "docs" && /Paystubs in/.test(fact.value)));
assert.ok(previewFacts(failedOther.draft).every((fact) => fact.id !== "docs" || !/Other in/.test(fact.value)));
assert.equal(failedOther.draft.productIntent, "buy");
assert.ok(!missingExtractClasses(failedOther.draft).includes("government_id"));

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

const workspaceSrc = readFileSync(join(root, "components/fox/workspace.ts"), "utf8");
assert.ok(!workspaceSrc.includes("What’s a rough amount?"));
assert.ok(!workspaceSrc.includes('label: "Amount"'));
assert.ok(!workspaceSrc.includes('label: "Numbers"'));
assert.ok(!workspaceSrc.includes("${spoken} ${reply.text}"));
assert.ok(!/Drop what you have\. Skip is fine/.test(workspaceSrc));
assert.ok(!/832,?750/.test(workspaceSrc));
assert.ok(workspaceSrc.includes("1_249_125") || workspaceSrc.includes("1249125"));

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
assert.equal(motionOf(emailGate), "in_queue");
assert.equal(statusCopy(emailGate), "in_queue");
assert.equal(nextActorOf(emailGate), "ONYX");
assert.equal(workspacePromptCopy("done", emailGate).text, MOTION_COPY.in_queue);
assert.doesNotMatch(workspacePromptCopy("done", emailGate).text, /good email|remind you/i);
assert.ok(
  (workspacePromptCopy("done", emailGate).actions ?? []).some((item) => item.label === "What happens next?"),
);
assert.ok(openReviewWorkItem(emailGate));
assert.equal(workspaceReply("Proceed", beforeProceed)?.text, MOTION_COPY.in_queue);
assert.equal(workspaceUpdateCopy({ field: "proceed" }, beforeProceed), MOTION_COPY.in_queue);
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
assert.ok(queuedLabels.includes("What happens next?"));
assert.ok(queuedLabels.includes("Upload more"));
assert.ok(queuedLabels.includes("Ask Fox"));
assert.ok(queuedLabels.includes("Request human"));
assert.notEqual(queuedLabels[0], "Request human");
assert.ok(queuedLabels.indexOf("What happens next?") < queuedLabels.indexOf("Request human"));
assert.ok(queuedLabels.indexOf("Upload more") < queuedLabels.indexOf("Request human"));
assert.ok(queuedLabels.indexOf("Ask Fox") < queuedLabels.indexOf("Request human"));
assert.equal(queuedActions.find((item) => item.label === "Request human")?.quiet, true);
const whatNext = workspaceReply("What happens next?", queued);
assert.equal(whatNext?.text, MOTION_COPY.whatHappensNext);
assert.doesNotMatch(whatNext?.text ?? "", /will contact you|we’ll be in touch|your lo has the file/i);
assert.ok((whatNext?.actions ?? []).some((item) => item.label === "Upload more"));
assert.ok((whatNext?.actions ?? []).some((item) => item.label === "Ask Fox"));
assert.notEqual((whatNext?.actions ?? [])[0]?.label, "Request human");
const askFox = workspaceReply("Ask Fox", queued);
assert.equal(askFox?.text, MOTION_COPY.askFox);
assert.doesNotMatch(askFox?.text ?? "", /will contact you|we’ll be in touch|your lo has the file/i);
assert.ok((askFox?.actions ?? []).some((item) => item.label === "What happens next?"));
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
assert.match(moreFromQueueAsk.text, /file can move|ONYX has this for review/i);
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

const homepageFiles = [
  "app/(marketing)/page.tsx",
  "components/MembershipHero.tsx",
  "components/AcrBlock.tsx",
  "components/Closer.tsx",
  "components/fox/FoxShell.tsx",
].map((file) => readFileSync(join(root, file), "utf8"));
const homepageSource = homepageFiles.join("\n");
assert.ok(!homepageSource.includes(PATH_ASK_TEXT));
assert.ok(!/Does this look right\?/.test(homepageSource));
assert.ok(!/Here’s a sample structure/.test(homepageSource));
assert.ok(!homepageSource.includes("HowItWorks"));
assert.ok(!homepageSource.includes("ComparisonTable"));
assert.ok(!homepageSource.includes("ProofStats"));
assert.ok(!homepageSource.includes("RateCard"));
assert.ok(!/talk to a licensed originator/i.test(homepageSource));
assert.ok(!/next step/i.test(homepageSource));
assert.ok(readFileSync(join(root, "components/MembershipHero.tsx"), "utf8").includes("HOME_IDLE_TEXT"));
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
assert.ok(dropSource.includes("quietLines: [FAILED_READ_NOTE]"));
assert.ok(dropSource.includes('aria-label="Upload"'));
assert.ok(dropSource.includes("onyx:fox-pick-file"));
assert.ok(dropSource.includes("requestFoxPickFile"));
assert.ok(!dropSource.includes(">Documents<"));
assert.ok(!dropSource.includes("/api/chat"));
assert.ok(!dropSource.includes("/api/heloc-quote"));
assert.ok(!dropSource.includes("setTimeout"));
const alwaysOn = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
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
assert.ok(alwaysOn.includes("motionAskText"));
assert.ok(alwaysOn.includes("DECLINING_INCOME_CAUTION"));
assert.ok(alwaysOn.includes("isDeadFileWriteLine"));
assert.ok(alwaysOn.includes("docReactionAsk"));
assert.ok(alwaysOn.includes("shouldDeferStillUsefulAsk"));
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
assert.ok(workspaceSrc.includes("CREDIT_STATED_NOTE") || workspaceSrc.includes("Stated · not a pull"));
assert.ok(workspaceSrc.includes("CREDIT_RANGE_ASK") || workspaceSrc.includes("What credit range should I use for the estimate?"));
assert.doesNotMatch(workspaceSrc, /we pulled your credit/i);
assert.ok(!homepageSource.includes("we pulled your credit"));
assert.ok(homepageSource.includes("HeroStartLink") || readFileSync(join(root, "components/MembershipHero.tsx"), "utf8").includes("HeroStartLink"));
const loReviewSource = readFileSync(join(root, "components/fox/LoReview.tsx"), "utf8");
assert.ok(loReviewSource.includes("fileScenarioRows"));
const startCss = readFileSync(join(root, "styles/start.css"), "utf8");
assert.ok(startCss.includes("scroll-padding-bottom"));
assert.ok(startCss.includes("scroll-margin-bottom"));
const foxSource = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
assert.ok(!foxSource.includes("composerPlaceholder("));
assert.ok(foxSource.includes('placeholder=""') || foxSource.includes("placeholder={"));
assert.ok(foxSource.includes("autoFocus={isStart") || foxSource.includes("autoFocus={isStart || needsTyping}"));
assert.ok(workspaceSrc.includes("HOLD_DOCS_COPY") || workspaceSrc.includes("I’ll hold documents"));
assert.doesNotMatch(composerPlaceholder(afterIncome), /Ask ONYX Fox|Enter /);
assert.ok(foxSource.includes("lastFoxTurn"));
assert.ok(foxSource.includes("requestFoxPickFile"));
assert.ok(foxSource.includes("editLine"));
assert.ok(foxSource.includes("keep-line") || workspaceSrc.includes("keep-line"));
assert.ok(foxSource.includes("scrollIntoView"));
assert.ok(foxSource.includes("fox-workspace-dock"));
assert.ok(foxSource.includes("scrollMarginBottom"));
assert.ok(foxSource.includes('line: field'));

const filePreview = readFileSync(join(root, "components/fox/FilePreview.tsx"), "utf8");
assert.ok(filePreview.includes("!draft.workspaceFlow"));
assert.ok(filePreview.includes("draft.docsOpen"));
assert.ok(filePreview.includes("sampleAccepted"));
assert.ok(filePreview.includes("fox-structure-notepad"));
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
assert.ok(!completenessSource.includes("if (!draft.timelineChoice.value) return false;"));
assert.ok(workspaceSrc.includes("function withFoxFirst") || workspaceSrc.includes("withFoxFirst"));
assert.ok(!workspaceSrc.includes('if (!draft.timelineAsked && !draft.timelineChoice.value) return "timeline"'));
assert.ok(workspaceSrc.includes("The notepad looks complete enough to move. Does it look right?"));
assert.ok(!workspaceSrc.includes("Here’s the file. Does this look right?"));
assert.ok(workspaceSrc.includes("nextDocInvite"));
assert.ok(workspaceSrc.includes('label: "Upload this"'));
assert.ok(workspaceSrc.includes('label: "Start with ID"'));
assert.ok(workspaceSrc.includes("sketchAndStartDocsCopy") || workspaceSrc.includes("That’s the sketch."));
assert.ok(foxSource.includes("notepad looks complete") || workspaceSrc.includes("notepad looks complete"));
assert.ok(!foxSource.includes("fox-bubble__edit"));
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
}

extractAdapterSmoke()
  .then(() => {
    console.log("desk smoke ok");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
