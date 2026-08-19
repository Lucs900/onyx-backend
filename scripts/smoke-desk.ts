import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  FOX_DISCLOSURE,
  PRODUCT_INTENT_BUBBLES,
} from "../components/fox/types";
import {
  previewFacts,
  productIntentFromQuery,
  sampleRateApplies,
  SAMPLE_NOTE,
  SAMPLE_RATE_LABEL,
  starterText,
  structureFixPrompt,
  workspacePrompt,
  workspacePromptCopy,
  workspaceReply,
} from "../components/fox/workspace";
import { HOME_IDLE_TEXT, homePathActions, homeProductActions } from "../components/fox/homeIdle";

function draft(partial: Record<string, unknown> = {}) {
  return { ...emptyDraft(), workspaceFlow: true, ...partial };
}

const chips = PRODUCT_INTENT_BUBBLES.map((item) => item.value);
assert.deepEqual(chips, ["buy", "refinance", "heloc", "jumbo", "other"]);
assert.equal(productIntentFromQuery("use-equity"), "heloc");
assert.equal(productIntentFromQuery("jumbo"), "jumbo");
assert.equal(sampleRateApplies("buy"), true);
assert.equal(sampleRateApplies("refinance"), true);
assert.equal(sampleRateApplies("heloc"), false);
assert.equal(sampleRateApplies("jumbo"), false);
assert.equal(sampleRateApplies("other"), false);

const idle = homePathActions();
assert.deepEqual(
  idle.map((item) => item.label),
  ["Start your relationship", "Just need a mortgage"],
);
assert.ok(!HOME_IDLE_TEXT.toLowerCase().includes("equity"));
assert.deepEqual(
  homeProductActions("acr").map((item) => item.label),
  ["Buy", "Refinance", "HELOC", "Jumbo", "Other"],
);

const withPath = draft({ path: "acr" });
assert.equal(workspacePrompt(withPath), "product");
assert.ok(starterText("acr").includes("We’ll keep this desk open after close"));
assert.ok(starterText("loan-only").includes("This is the loan"));

const productAsk = workspacePromptCopy("product", withPath);
assert.deepEqual(
  (productAsk.actions ?? []).map((item) => item.label),
  ["Buy", "Refinance", "HELOC", "Jumbo", "Other"],
);
assert.ok(!(productAsk.actions ?? []).some((item) => /use equity/i.test(item.label)));

const afterProduct = draft({
  path: "acr",
  productIntent: "buy",
});
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

const afterPrice = draft({
  path: "acr",
  productIntent: "buy",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  valueAsked: true,
  propertyValueAmount: 600000,
});
assert.equal(workspacePrompt(afterPrice), "documents");

const afterSkip = draft({
  ...afterPrice,
  documentsSkipped: true,
});
assert.equal(workspacePrompt(afterSkip), "review");

const review = workspacePromptCopy("review", afterSkip);
assert.equal(review.followUp, "Does this look right?");
assert.ok(!(review.facts ?? []).some((fact) => fact.id === "payment"));
assert.ok((review.facts ?? []).some((fact) => fact.id === "rate" && fact.value.includes(SAMPLE_RATE_LABEL)));
assert.ok((review.facts ?? []).some((fact) => fact.note === SAMPLE_NOTE));

const helocReady = draft({
  path: "loan-only",
  productIntent: "heloc",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  amountAsked: true,
  loanAmountValue: 365000,
  documentsSkipped: true,
});
const helocFacts = previewFacts(helocReady);
assert.ok(helocFacts.some((fact) => fact.id === "rate" && fact.value === "Pricing when the file is ready"));
assert.ok(!helocFacts.some((fact) => /6\.750|9\.68|1,210|move forward/i.test(`${fact.value} ${fact.note ?? ""}`)));
assert.ok(!helocFacts.some((fact) => fact.id === "reward"));
assert.ok(!helocFacts.some((fact) => /fico|credit/i.test(fact.label)));

const jumboFacts = previewFacts(draft({ ...helocReady, productIntent: "jumbo" }));
assert.ok(jumboFacts.some((fact) => fact.value === "Pricing when the file is ready"));
assert.ok(!jumboFacts.some((fact) => fact.value.includes(SAMPLE_RATE_LABEL)));

const correct = workspacePromptCopy("correct", afterSkip);
assert.equal(correct.text, "Tap any line on the structure.");
assert.ok(!correct.actions?.length);

const acrDone = workspacePromptCopy("done", draft({ path: "acr", sampleAccepted: true }));
assert.ok(acrDone.text.includes("We’ll keep this desk open after close"));
assert.ok(acrDone.text.includes("Letter is originator-issued"));
assert.equal(acrDone.followUp, FOX_DISCLOSURE);
assert.ok(!(acrDone.actions ?? []).some((item) => /app link|email/i.test(item.label)));

const loanDone = workspacePromptCopy("done", draft({ path: "loan-only", sampleAccepted: true }));
assert.ok(loanDone.text.includes("This is the loan"));
assert.ok((loanDone.actions ?? []).some((item) => item.label === "What is ACR?"));

assert.equal(structureFixPrompt("path"), "path-switch");
assert.equal(structureFixPrompt("occupancy"), "occupancy");
assert.equal(structureFixPrompt("rate"), null);

const noPathReply = workspaceReply("hello", draft());
assert.ok(noPathReply?.text.includes("Start your relationship"));

const pathSetReply = workspaceReply("Start your relationship", draft());
assert.equal(pathSetReply?.capture?.field, "path");
assert.ok(!/which path should i use/i.test(pathSetReply?.text ?? ""));

console.log("desk smoke ok");
