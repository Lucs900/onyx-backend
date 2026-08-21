import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { greeting, promptCopy } from "../components/fox/script";
import {
  applyCapture,
  applyExtractWrite,
  beginWorkspaceFromHero,
  applyPreviewMotionControls,
  continueWorkspaceFromEntry,
  emptyDraft,
  getFoxDraft,
  getFoxMessages,
  nudgeReview,
  receiveDocument,
  resetWorkspaceForEntry,
  returnToFox,
  setFoxMessages,
  shouldResumeWorkspaceEntry,
  sitExpireReview,
  workspaceSessionStarted,
} from "../components/fox/store";
import {
  MOTION_COPY,
  motionOf,
  nextActorOf,
  openReviewWorkItem,
  reviewIsSitting,
} from "../components/fox/motion";
import {
  applyExtractedFields,
  extractClassFromFilename,
  missingAskCopy,
  missingExtractClasses,
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
  docsRequestForIncome,
  FHFA_HIGH_COST_CEILING_2026,
  fileScenarioRows,
  fileSummaryFacts,
  GEO_STOP_COPY,
  HELOC_OFFER_COPY,
  JUMBO_OFFER_COPY,
  JUMBO_PURPOSE_ASK,
  loanLooksAboveCeiling,
  migrateRestoredFoxMessages,
  namedOutOfState,
  parseWorkspaceEdit,
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
  workspaceUpdateCopy,
} from "../components/fox/workspace";
import { HOME_IDLE_TEXT, homePathActions, homeProductActions } from "../components/fox/homeIdle";
import { assertOnyxFixtures } from "./assert-onyx-fixtures";

assertOnyxFixtures();

function draft(partial: Record<string, unknown> = {}) {
  return { ...emptyDraft(), workspaceFlow: true, ...partial };
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

const afterTime = draft({
  path: "loan-only",
  productIntent: "heloc",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
});
assert.equal(workspacePrompt(afterTime), "amount");

const buyAfterTime = workspaceReply("Ready now", afterOcc);
assert.equal(buyAfterTime?.capture?.field, "timeline");
assert.equal(buyAfterTime?.text, "What’s the purchase price?");
assert.doesNotMatch(buyAfterTime?.text ?? "", /rough amount|^what’s a rough amount/i);

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
assert.equal(workspacePrompt(afterPrice), "credit");
assert.notEqual(workspacePrompt(afterPrice), "review");
assert.notEqual(workspacePrompt(afterPrice), "documents");

const creditAsk = workspacePromptCopy("credit", afterPrice);
assert.deepEqual(
  (creditAsk.actions ?? []).map((item) => item.label),
  ["760+", "720–759", "680–719", "Not sure"],
);
assert.deepEqual(
  CREDIT_WORKSPACE_BUBBLES.map((item) => item.label),
  ["760+", "720–759", "680–719", "Not sure"],
);

const afterCredit = draft({
  ...afterPrice,
  creditAsked: true,
  creditBand: "760+",
});
assert.equal(workspacePrompt(afterCredit), "income");
assert.notEqual(workspacePrompt(afterCredit), "review");
assert.notEqual(workspacePrompt(afterCredit), "documents");

const creditReply = workspaceReply("760+", afterPrice);
assert.equal(creditReply?.capture?.field, "creditRange");
assert.ok(/income earned/i.test(creditReply?.text ?? ""));

const incomeAsk = workspacePromptCopy("income", afterCredit);
assert.deepEqual(
  (incomeAsk.actions ?? []).map((item) => item.label),
  ["W-2", "Self-employed", "Both", "Other"],
);

const afterIncome = withIncome(afterCredit, "w2");
assert.equal(workspacePrompt(afterIncome), "review");
assert.notEqual(workspacePrompt(afterIncome), "documents");
const looksRight = workspaceReply("Looks right", afterIncome);
assert.equal(looksRight?.capture?.field, "confirm-draft");
assert.match(looksRight?.text ?? "", /still useful/i);
assert.match(looksRight?.text ?? "", /government ID, latest paystub, and W-2/i);
assert.match(looksRight?.text ?? "", /skip is fine/i);
assert.doesNotMatch(`${looksRight?.text ?? ""} ${looksRight?.followUp ?? ""}`, /drop what you have|will contact you|we’ll be in touch|your lo has the file/i);
assert.ok((looksRight?.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok((looksRight?.actions ?? []).some((item) => item.label === "Upload more"));
assert.ok((looksRight?.actions ?? []).some((item) => item.label === "Not yet"));
assert.ok((looksRight?.actions ?? []).some((item) => /skip/i.test(item.label)));
assert.ok((looksRight?.actions ?? []).some((item) => item.label === "Request human"));

const notSure = withIncome(draft({ ...afterPrice, creditAsked: true, creditBand: "not-sure" }));
assert.equal(workspacePrompt(notSure), "review");

const otherIncome = withIncome(afterCredit, "other");
assert.equal(workspacePrompt(otherIncome), "review");
assert.notEqual(workspacePrompt(otherIncome), "documents");

const creditFacts = previewFacts(afterIncome);
assert.ok(creditFacts.some((fact) => fact.id === "path" && fact.value === "Relationship desk"));
assert.ok(creditFacts.some((fact) => fact.id === "numbers" && fact.label === "Purchase price"));
assert.ok(creditFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
assert.equal(structureAmountLabel(afterIncome), "Purchase price");
assert.ok(creditFacts.some((fact) => fact.id === "credit" && fact.value === "760+"));
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
assert.equal(workspacePrompt(afterOccEdit), "review");
assert.notEqual(workspacePrompt({ ...afterIncome, correcting: "occupancy" }), "documents");
assert.equal(workspacePrompt({ ...afterIncome, correcting: "credit" }), "credit");
assert.equal(workspacePrompt({ ...afterIncome, correcting: "income" }), "income");

const creditEdit = parseWorkspaceEdit("change credit to 760+");
assert.equal(creditEdit?.capture?.field, "creditRange");
assert.equal(creditEdit?.capture && "value" in creditEdit.capture ? creditEdit.capture.value : "", "760+");
const creditAskEdit = parseWorkspaceEdit("edit credit");
assert.equal(creditAskEdit?.correct, "credit");
assert.ok(!/not on this sketch/i.test(creditAskEdit?.confirm ?? ""));

const review = workspacePromptCopy("review", afterIncome);
assert.equal(review.followUp, "Does this look right?");
assert.ok((review.facts ?? []).some((fact) => fact.id === "credit"));
assert.ok((review.facts ?? []).some((fact) => fact.id === "income"));
assert.ok((review.facts ?? []).some((fact) => fact.value.includes(PREVIEW_RATE_NOTE)));

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
assert.ok(helocFacts.some((fact) => fact.id === "numbers" && fact.label === "HELOC line"));
assert.ok(helocFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
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
const refiReady = withIncome(
  draft({
    path: "acr",
    productIntent: "refinance",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    amountAsked: true,
    loanAmountValue: 640000,
    creditAsked: true,
    creditBand: "760+",
  }),
);
const refiFacts = previewFacts(refiReady);
assert.ok(refiFacts.some((fact) => fact.id === "numbers" && fact.label === "Loan amount"));
assert.ok(refiFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
assert.equal(structureAmountLabel(refiReady), "Loan amount");
assert.equal(amountAskText(refiAfterTime), "What’s the approximate loan or payoff amount?");

const helocAcrFacts = previewFacts(helocAcrReady);
assert.ok(helocAcrFacts.some((fact) => fact.id === "path" && fact.value === "Relationship desk"));
assert.ok(helocAcrFacts.some((fact) => fact.id === "numbers" && fact.label === "HELOC line"));
assert.ok(helocAcrFacts.some((fact) => fact.id === "rate" && fact.value === "Pricing when the file is ready"));
const helocReward = helocAcrFacts.find((fact) => fact.id === "reward");
assert.equal(helocReward?.value, "Prepared when you join");
assert.ok(!/\$[\d,]/.test(helocReward?.value ?? ""));
assert.ok(!/446|604/.test(helocReward?.value ?? ""));

const jumboAcrReady = withIncome(
  draft({
    path: "acr",
    productIntent: "jumbo",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    valueAsked: true,
    propertyValueAmount: 1500000,
    creditAsked: true,
    creditBand: "760+",
  }),
);
const jumboFacts = previewFacts(jumboAcrReady);
assert.ok(jumboFacts.some((fact) => fact.id === "numbers" && fact.label === "Purchase price"));
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
  draft({
    ...jumboRefiAfterTime,
    amountAsked: true,
    loanAmountValue: 1_600_000,
    creditAsked: true,
    creditBand: "760+",
  }),
);
const jumboRefiFacts = previewFacts(jumboRefiReady);
assert.ok(jumboRefiFacts.some((fact) => fact.id === "product" && fact.value === "Jumbo"));
assert.ok(jumboRefiFacts.some((fact) => fact.id === "numbers" && fact.label === "Loan amount"));
assert.ok(jumboRefiFacts.every((fact) => fact.label !== "Amount" && fact.label !== "Numbers"));
assert.ok(jumboRefiFacts.some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(!jumboRefiFacts.some((fact) => fact.value.includes(SAMPLE_RATE_LABEL)));
const jumboRefiReward = jumboRefiFacts.find((fact) => fact.id === "reward");
assert.equal(jumboRefiReward?.value, REWARD_PREPARED_COPY);
assert.ok(!/\$[\d,]/.test(jumboRefiReward?.value ?? ""));

const investBuy = withIncome(
  draft({
    path: "acr",
    productIntent: "buy",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "investment" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    valueAsked: true,
    propertyValueAmount: 850000,
    creditAsked: true,
    creditBand: "760+",
  }),
);
assert.ok(!previewRateApplies(investBuy));
const investFacts = previewFacts(investBuy);
assert.ok(investFacts.some((fact) => fact.id === "numbers" && fact.label === "Purchase price"));
assert.ok(investFacts.some((fact) => fact.id === "rate" && fact.value === PRICING_WHEN_READY));
assert.ok(!investFacts.some((fact) => fact.value.includes(SAMPLE_RATE_LABEL)));
assert.equal(investFacts.find((fact) => fact.id === "reward")?.value, REWARD_PREPARED_COPY);

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
  draft({
    ...highBuyAfterTime,
    valueAsked: true,
    propertyValueAmount: 1_500_000,
    jumboOffered: true,
    creditAsked: true,
    creditBand: "760+",
  }),
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

const matrixLooksRight = workspaceReply("Looks right", investBuy);
assert.equal(matrixLooksRight?.capture?.field, "confirm-draft");
assert.match(matrixLooksRight?.text ?? "", /government ID, latest paystub, and W-2/i);
assert.ok((matrixLooksRight?.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok((matrixLooksRight?.actions ?? []).some((item) => item.label === "Upload more"));
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
assert.match(done.text, /still useful/i);
assert.match(done.text, /government ID/i);
assert.match(done.text, /skip is fine/i);
assert.ok(!/I’m preparing this desk/i.test(done.text));
assert.ok(!/we’ll be in touch|will contact you|your lo has the file/i.test(done.text));
assert.ok((done.actions ?? []).some((item) => item.label === "Proceed"));
assert.ok((done.actions ?? []).some((item) => item.label === "Upload more"));
assert.ok((done.actions ?? []).some((item) => item.label === "Not yet"));
assert.ok((done.actions ?? []).some((item) => /skip/i.test(item.label)));
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
  nextActor: "Outside",
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
assert.equal(structureFixPrompt("numbers", afterPrice), "value");
assert.equal(structureFixPrompt("numbers", helocReady), "amount");
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

const pathSetReply = workspaceReply("Start your relationship", draft());
assert.equal(pathSetReply?.capture?.field, "path");
assert.ok(!(pathSetReply?.followUp ?? "").includes(FOX_DISCLOSURE));

const w2Docs = workspacePromptCopy("documents", afterIncome);
assert.match(w2Docs.text, /government ID/i);
assert.match(w2Docs.text, /latest paystub/i);
assert.match(w2Docs.text, /W-2/);
assert.doesNotMatch(w2Docs.text, /drop what you have|skip is fine|tax return/i);
assert.ok((w2Docs.actions ?? []).some((item) => item.capture?.field === "skip-docs"));
assert.ok((w2Docs.actions ?? []).some((item) => /skip/i.test(item.label)));
const w2Request = docsRequestForIncome("w2");
assert.deepEqual(w2Request.labels, ["government ID", "latest paystub", "W-2"]);
assert.ok(!w2Request.labels.includes("Bank statements"));

const selfDocs = workspacePromptCopy("documents", withIncome(afterCredit, "self-employed"));
assert.match(selfDocs.text, /government ID and tax return/i);
assert.doesNotMatch(selfDocs.text, /paystub|w-2|drop what you have/i);
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
assert.ok((dropAfterLooks.actions ?? []).some((item) => item.capture?.field === "skip-docs"));
assert.ok((dropAfterLooks.actions ?? []).some((item) => /skip/i.test(item.label)));

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
applyCapture({ field: "creditRange", value: "760+" });
assert.equal(workspacePrompt(getFoxDraft()), "income");
applyCapture({ field: "incomeType", value: "w2" });
assert.equal(getFoxDraft().documentsSkipped, false);
assert.equal(workspacePrompt(getFoxDraft()), "review");
applyCapture({ field: "confirm-draft" });
const confirmed = getFoxDraft();
assert.equal(workspacePrompt(confirmed), "done");
assert.equal(statusCopy(confirmed), "gathering");
assert.equal(nextActorOf(confirmed), "You");
assert.equal(confirmed.phase, "confirmed");
assert.ok(confirmed.sampleAccepted);
assert.notEqual(motionOf(confirmed), "in_queue");
applyCapture({ field: "open-docs" });
const opened = getFoxDraft();
assert.equal(opened.docsOpen, true);
assert.equal(opened.phase, "confirmed");
assert.equal(workspacePrompt(opened), "done");
assert.equal(statusCopy(opened), "gathering");
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
applyCapture({ field: "propertyValue", value: "1200000" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "other" });
assert.equal(getFoxDraft().documentsSkipped, false);
assert.equal(workspacePrompt(getFoxDraft()), "review");

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
assert.equal(paystubWrite.quietLines[0], "Updated income from paystub.");
assert.equal(paystubWrite.draft.facts?.employer_name?.value, "Harbor Steel");
assert.equal(paystubWrite.draft.facts?.gross_period?.value, "7200");
assert.equal(paystubWrite.draft.facts?.employer_name?.source, "extracted-unconfirmed");
assert.equal(paystubWrite.draft.facts?.employer_name?.confirmed, true);
assert.equal(paystubWrite.draft.facts?.ssn, undefined);
assert.equal(workspacePrompt(paystubWrite.draft), "done");
assert.equal(paystubWrite.draft.productIntent, afterLooks.productIntent);
assert.ok(previewFacts(paystubWrite.draft).some((fact) => fact.id === "employer" && fact.value === "Harbor Steel"));
assert.ok(previewFacts(paystubWrite.draft).some((fact) => fact.id === "pay" && /7,200/.test(fact.value)));
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
  state: "CA",
});
assert.equal(stripped.full_name, "Jordan Lee");
assert.equal(stripped.id_last4, "4321");
assert.equal(stripped.ssn, undefined);

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
applyCapture({ field: "propertyValue", value: "1200000" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "confirm-draft" });
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
assert.equal(statusCopy(wrote.draft), "gathering");
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
applyCapture({ field: "propertyValue", value: "1200000" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "confirm-draft" });
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
assert.ok(missingExtractClasses(failedOther.draft).includes("paystub"));
assert.ok(missingExtractClasses(failedOther.draft).includes("government_id"));
assert.ok(missingExtractClasses(failedOther.draft).includes("w2"));

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
applyCapture({ field: "propertyValue", value: "1200000" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "confirm-draft" });
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
assert.ok(!/Drop what you have\. Skip is fine/.test(workspaceSrc));
assert.ok(!/832,?750/.test(workspaceSrc));
assert.ok(workspaceSrc.includes("1_249_125") || workspaceSrc.includes("1249125"));

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
applyCapture({ field: "propertyValue", value: "1200000" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "confirm-draft" });
const beforeProceed = getFoxDraft();
assert.equal(statusCopy(beforeProceed), "gathering");
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
assert.notEqual(motionOf(emailGate), "in_queue");
assert.equal(workspacePromptCopy("done", emailGate).text, MOTION_COPY.emailAsk);
applyCapture({ field: "email", value: "borrower@example.com" });
const queued = getFoxDraft();
assert.equal(motionOf(queued), "in_queue");
assert.equal(statusCopy(queued), "in_queue");
assert.equal(nextActorOf(queued), "ONYX");
assert.ok(previewFacts(queued).some((fact) => fact.id === "originator"));
assert.ok(previewFacts(queued).some((fact) => fact.id === "next" && fact.value === "ONYX"));
const reviewItem = openReviewWorkItem(queued);
assert.equal(reviewItem?.kind, "review");
assert.ok(reviewItem?.state === "open" || reviewItem?.state === "nudged");
assert.equal(workspacePromptCopy("done", queued).text, MOTION_COPY.in_queue);
assert.doesNotMatch(workspacePromptCopy("done", queued).text, /will contact you|we’ll be in touch|your lo has the file/i);
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
applyCapture({ field: "propertyValue", value: "850000" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "confirm-draft" });
applyCapture({ field: "email", value: "walk@onyx.test" });
applyCapture({ field: "proceed" });
const walkQueued = getFoxDraft();
assert.equal(motionOf(walkQueued), "in_queue");
assert.equal(walkQueued.scenario, null);
const walkRows = fileScenarioRows(walkQueued);
assert.ok(walkRows.some(([label, value]) => label === "Product" && value === "Buy"));
assert.ok(walkRows.some(([label, value]) => label === "Purchase price" && value === "$850,000"));
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
applyCapture({ field: "propertyValue", value: "1200000" });
applyCapture({ field: "creditRange", value: "760+" });
applyCapture({ field: "incomeType", value: "w2" });
applyCapture({ field: "confirm-draft" });
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
assert.equal(nextActorOf(getFoxDraft()), "Outside");
assert.equal(workspacePromptCopy("done", getFoxDraft()).text, MOTION_COPY.escalated);

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

const startWorkspace = readFileSync(join(root, "components/fox/StartWorkspace.tsx"), "utf8");
assert.ok(!startWorkspace.includes("useDocumentReads"));
assert.ok(startWorkspace.includes("shouldResumeWorkspaceEntry"));
assert.ok(startWorkspace.includes("continueWorkspaceFromEntry"));
const dropSource = readFileSync(join(root, "components/fox/DocumentDrop.tsx"), "utf8");
assert.ok(dropSource.includes("/api/docs/upload"));
assert.ok(dropSource.includes("/api/docs/extract"));
assert.ok(dropSource.includes("quietLines: [FAILED_READ_NOTE]"));
assert.ok(!dropSource.includes("/api/chat"));
assert.ok(!dropSource.includes("/api/heloc-quote"));
assert.ok(!dropSource.includes("setTimeout"));
const alwaysOn = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
assert.ok(alwaysOn.includes("file is prepared") || alwaysOn.includes("still useful") || alwaysOn.includes("this file can move"));
assert.ok(alwaysOn.includes('prompt === "done"'));
assert.ok(alwaysOn.includes("FOX_THREAD_LINE_EVENT"));
assert.ok(alwaysOn.includes("shouldResumeWorkspaceEntry"));
assert.ok(alwaysOn.includes("fileExists(live)"));
const storeSource = readFileSync(join(root, "components/fox/store.ts"), "utf8");
assert.ok(storeSource.includes("function shouldResumeWorkspaceEntry") || storeSource.includes("export function shouldResumeWorkspaceEntry"));
assert.ok(storeSource.includes("fileExists(draft)"));
const loReviewSource = readFileSync(join(root, "components/fox/LoReview.tsx"), "utf8");
assert.ok(loReviewSource.includes("fileScenarioRows"));
const filePreview = readFileSync(join(root, "components/fox/FilePreview.tsx"), "utf8");
assert.ok(filePreview.includes("!draft.workspaceFlow"));
assert.ok(!filePreview.includes("docsOpen"));
assert.ok(filePreview.includes('fact.id === "next"'));

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
}

extractAdapterSmoke()
  .then(() => {
    console.log("desk smoke ok");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
