import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { greeting, promptCopy } from "../components/fox/script";
import {
  applyCapture,
  applyExtractWrite,
  beginWorkspaceFromHero,
  continueWorkspaceFromEntry,
  emptyDraft,
  getFoxDraft,
  getFoxMessages,
  receiveDocument,
  resetWorkspaceForEntry,
  setFoxMessages,
  workspaceSessionStarted,
} from "../components/fox/store";
import {
  applyExtractedFields,
  missingAskCopy,
  missingExtractClasses,
  resolveFactConflict,
  sanitizeExtractedFields,
  skipRemainingClasses,
} from "../components/fox/fileWrite";
import {
  CREDIT_WORKSPACE_BUBBLES,
  FOX_DISCLOSURE,
  PRODUCT_INTENT_BUBBLES,
} from "../components/fox/types";
import {
  docsRequestForIncome,
  fileSummaryFacts,
  migrateRestoredFoxMessages,
  parseWorkspaceEdit,
  PATH_ASK_TEXT,
  previewFacts,
  REWARD_PREPARED_COPY,
  productIntentFromQuery,
  sampleRateApplies,
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
assert.ok(/purchase price/i.test(buyAfterTime?.text ?? ""));

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

const notSure = withIncome(draft({ ...afterPrice, creditAsked: true, creditBand: "not-sure" }));
assert.equal(workspacePrompt(notSure), "review");

const otherIncome = withIncome(afterCredit, "other");
assert.equal(workspacePrompt(otherIncome), "review");
assert.notEqual(workspacePrompt(otherIncome), "documents");

const creditFacts = previewFacts(afterIncome);
assert.ok(creditFacts.some((fact) => fact.id === "path" && fact.value === "Relationship desk"));
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
const helocAcrFacts = previewFacts(helocAcrReady);
assert.ok(helocAcrFacts.some((fact) => fact.id === "path" && fact.value === "Relationship desk"));
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
assert.ok(jumboFacts.some((fact) => fact.id === "rate" && fact.value === "Pricing when the file is ready"));
const jumboReward = jumboFacts.find((fact) => fact.id === "reward");
assert.equal(jumboReward?.value, "Prepared when you join");
assert.ok(!/\$[\d,]/.test(jumboReward?.value ?? ""));

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
assert.equal(statusCopy(afterLooks), "Assigned / reviewing");
const assignedFacts = previewFacts(afterLooks);
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
assert.ok(/file is prepared/i.test(done.text));
assert.ok(/licensed originator is assigned/i.test(done.text));
assert.ok(!/I’m preparing this desk/i.test(done.text));
assert.ok(!/we’ll be in touch|will contact you/i.test(done.text));
assert.ok((done.actions ?? []).some((item) => item.label === "Upload docs"));
assert.ok((done.actions ?? []).some((item) => item.label === "Request human"));
assert.ok(!(done.actions ?? []).some((item) => item.href === "/advisor"));
assert.ok(!(done.actions ?? []).some((item) => /talk to a licensed originator/i.test(item.label)));

const human = workspaceReply("Request human", afterLooks);
assert.ok(human);
assert.notEqual(human.text, done.text);
assert.ok(!/I’m preparing this desk/i.test(human.text ?? ""));
assert.ok(!/we’ll be in touch|will contact you/i.test(human.text ?? ""));
assert.equal(human.capture?.field, "talk-originator");

const afterHuman = workspacePromptCopy("done", { ...afterLooks, originatorRequested: true });
assert.ok(/still on this desk/i.test(afterHuman.text));
assert.ok(!(afterHuman.actions ?? []).some((item) => item.label === "Request human"));
assert.ok(!/I’m preparing this desk/i.test(afterHuman.text));

const loanDone = workspacePromptCopy(
  "done",
  draft({ path: "loan-only", sampleAccepted: true, workspaceDraftStatus: "with-originator" }),
);
assert.ok(/loan file is prepared/i.test(loanDone.text));
assert.ok((loanDone.actions ?? []).some((item) => item.label === "What is ACR?"));

assert.equal(structureFixPrompt("path"), "path-switch");
assert.equal(structureFixPrompt("occupancy"), "occupancy");
assert.equal(structureFixPrompt("numbers", afterPrice), "value");
assert.equal(structureFixPrompt("numbers", helocReady), "amount");
assert.equal(structureFixPrompt("rate"), null);
assert.equal(structureFixPrompt("reward"), null);
assert.equal(structureFixPrompt("letter"), null);
assert.equal(structureFixPrompt("scout"), null);
assert.equal(structureFixPrompt("status"), null);
assert.equal(structureFixPrompt("originator"), null);
assert.ok(structureExplainCopy("rate", afterIncome)?.text.includes("cannot set"));
assert.ok(FOX_DISCLOSURE.includes("cannot approve"));

assert.equal(slotFromFilename("w2-2024.pdf"), "w2");
assert.equal(resetWorkspaceForEntry("acr", "buy").productIntent, "buy");

const pathSetReply = workspaceReply("Start your relationship", draft());
assert.equal(pathSetReply?.capture?.field, "path");
assert.ok(!(pathSetReply?.followUp ?? "").includes(FOX_DISCLOSURE));

const w2Docs = workspacePromptCopy("documents", afterIncome);
assert.match(w2Docs.text, /paystubs? or a w-2/i);
assert.doesNotMatch(w2Docs.text, /tax returns|business docs/i);
assert.ok((w2Docs.actions ?? []).some((item) => item.capture?.field === "skip-docs"));
assert.ok((w2Docs.actions ?? []).some((item) => /skip/i.test(item.label)));
const w2Request = docsRequestForIncome("w2");
assert.deepEqual(w2Request.labels, ["Paystubs", "W-2"]);
assert.ok(!w2Request.labels.includes("Bank statements"));
assert.ok(!w2Request.labels.includes("ID"));

const selfDocs = workspacePromptCopy("documents", withIncome(afterCredit, "self-employed"));
assert.match(selfDocs.text, /tax returns or business docs/i);
assert.doesNotMatch(selfDocs.text, /paystub|w-2/i);
assert.ok((selfDocs.actions ?? []).some((item) => item.capture?.field === "skip-docs"));
const selfRequest = docsRequestForIncome("self-employed");
assert.deepEqual(selfRequest.labels, ["Tax returns", "Business docs"]);
assert.ok(!selfRequest.labels.includes("Paystubs"));
assert.ok(!selfRequest.labels.includes("W-2"));

const bothRequest = docsRequestForIncome("both");
assert.ok(bothRequest.labels.includes("Paystubs"));
assert.ok(bothRequest.labels.includes("Tax returns"));

const otherRequest = docsRequestForIncome("other");
assert.deepEqual(otherRequest.labels, []);
assert.match(otherRequest.text, /drop what you have/i);
assert.doesNotMatch(otherRequest.text, /paystub|w-2|tax return|bank statements/i);
const otherDocs = workspacePromptCopy("documents", withIncome(afterCredit, "other"));
assert.ok((otherDocs.actions ?? []).some((item) => item.capture?.field === "skip-docs"));

const dropAfterLooks = workspacePromptCopy("documents", {
  ...afterLooks,
  docsOpen: true,
  correcting: "documents",
});
assert.ok((dropAfterLooks.actions ?? []).some((item) => item.capture?.field === "skip-docs"));
assert.ok((dropAfterLooks.actions ?? []).some((item) => /skip/i.test(item.label)));

const skippedLooks = draft({ ...afterLooks, documentsSkipped: true, docsOpen: false, correcting: null });
assert.equal(workspacePrompt(skippedLooks), "done");
assert.equal(statusCopy(skippedLooks), "Assigned / reviewing");
assert.ok(previewFacts(skippedLooks).some((fact) => fact.id === "docs" && fact.value === "Skipped"));
assert.ok(previewFacts(skippedLooks).some((fact) => fact.id === "originator"));

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
assert.equal(statusCopy(confirmed), "Assigned / reviewing");
assert.equal(confirmed.phase, "confirmed");
applyCapture({ field: "open-docs" });
const opened = getFoxDraft();
assert.equal(opened.docsOpen, true);
assert.equal(opened.phase, "confirmed");
assert.equal(workspacePrompt(opened), "done");
assert.equal(statusCopy(opened), "Assigned / reviewing");
applyCapture({ field: "skip-docs" });
const afterSkip = getFoxDraft();
assert.equal(afterSkip.documentsSkipped, true);
assert.equal(afterSkip.docsOpen, false);
assert.equal(afterSkip.phase, "confirmed");
assert.equal(afterSkip.workspaceDraftStatus, "with-originator");
assert.equal(workspacePrompt(afterSkip), "done");
assert.equal(statusCopy(afterSkip), "Assigned / reviewing");
assert.ok(previewFacts(afterSkip).some((fact) => fact.id === "docs" && fact.value === "Skipped"));
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
assert.ok(previewFacts(paystubWrite.draft).some((fact) => fact.id === "employer" && fact.value === "Harbor Steel"));
assert.ok(previewFacts(paystubWrite.draft).some((fact) => fact.id === "pay" && /7,200/.test(fact.value)));
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
assert.ok(selfMissing.includes("mortgage_statement"));
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
assert.equal(workspacePrompt(wrote.draft), "done");
assert.equal(statusCopy(wrote.draft), "Assigned / reviewing");
assert.equal(wrote.draft.workspaceDraftStatus, "with-originator");
const failedWrite = applyExtractWrite(
  "2026-08-20T00:00:00.000Z",
  "paystub.pdf",
  { extractClass: "paystub", confidence: 0.9, fields: { gross_period: "1" } },
  "Fox could not read this file. Type a note or skip. No dollar amounts were invented.",
  true,
);
assert.equal(failedWrite.draft.facts?.gross_period?.value, "7200");

applyCapture({ field: "keep-file-fact" });
applyCapture({ field: "use-document-fact" });

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
const dropSource = readFileSync(join(root, "components/fox/DocumentDrop.tsx"), "utf8");
assert.ok(dropSource.includes("/api/docs/upload"));
assert.ok(dropSource.includes("/api/docs/extract"));
assert.ok(!dropSource.includes("/api/chat"));
assert.ok(!dropSource.includes("/api/heloc-quote"));
assert.ok(!dropSource.includes("setTimeout"));
const filePreview = readFileSync(join(root, "components/fox/FilePreview.tsx"), "utf8");
assert.ok(filePreview.includes("!draft.workspaceFlow"));
assert.ok(!filePreview.includes("docsOpen"));

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

console.log("desk smoke ok");
