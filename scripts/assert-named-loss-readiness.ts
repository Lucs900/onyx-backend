/**
 * Written K-1 / Schedule C / 1065 loss is not a dead file and not a denial.
 * will I qualify is one beat. Next ask restores on its own line.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { factsFromDraft, resolveProposal } from "../components/fox/completeness";
import { nextFoxAsk, workspaceReply } from "../components/fox/workspace";
import { asksWillIQualify } from "../lib/guidelines/answer";
import { READINESS_NAMED_LOSS, READINESS_STRONG, readinessFromFile } from "../lib/guidelines/conventional";
import type { FoxIntakeDraft } from "../components/fox/types";

function seSketch(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 850_000,
    downPaymentAmount: 170_000,
    loanAmountValue: 680_000,
    valueAsked: true,
    amountAsked: true,
    subjectAddress: "1840 Valencia Street, San Francisco, CA 94110",
    propertyType: "house",
    propertyTypeAsked: true,
    propertyZip: "94110",
    propertyZipAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    documents: [
      {
        slot: "other",
        name: "return-2024.png",
        type: "image/png",
        size: 8000,
        receivedAt: "2026-09-15T00:00:00.000Z",
        status: "extracted",
        extractClass: "tax_return",
      },
    ],
  };
}

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
    namedLoss: true,
    suggestedMonthlyIncome: -12932,
  }).kind,
  "uw_review",
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
    incomeType: "se_schedule_c",
    received: ["tax_return"],
    taxReturnCount: 1,
    namedLoss: true,
    suggestedMonthlyIncome: -12932,
  }).line,
  READINESS_NAMED_LOSS,
);
assert.equal(
  READINESS_NAMED_LOSS,
  "This is a named loss on the file. Suggested, not confirmed cash flow. The file can still move. Underwriting reviews it.",
);
assert.doesNotMatch(READINESS_NAMED_LOSS, /purchase contract|occupancy|Not ready yet|you qualify|cannot proceed/i);
assert.ok(asksWillIQualify("will I qualify"));
assert.ok(asksWillIQualify("does this work"));
assert.ok(asksWillIQualify("can I still proceed"));
assert.ok(!asksWillIQualify("Proceed"));
assert.ok(!asksWillIQualify("what happens after Proceed?"));

const seLoss = applyExtractedFields(seSketch(), {
  extractClass: "tax_return",
  confidence: 0.92,
  fields: {
    tax_year: "2024",
    return_kind: "schedule_c",
    schedule_c_net_profit: "(24000)",
    depreciation: "0",
  },
});
const seLossUsed = resolveProposal(seLoss.draft, "accept");
assert.equal(seLossUsed.facts?.qualifying_income?.value, "-2000");
assert.equal(readinessFromFile(factsFromDraft(seLossUsed)).kind, "uw_review");
assert.equal(readinessFromFile(factsFromDraft(seLossUsed)).line, READINESS_NAMED_LOSS);
const seLossQualify = workspaceReply("will I qualify", seLossUsed);
assert.equal(seLossQualify?.text, READINESS_NAMED_LOSS);
assert.doesNotMatch(seLossQualify?.text ?? "", /I can answer from this file|purchase contract|occupancy|Not ready yet/i);
assert.notEqual(seLossQualify?.followUp, seLossQualify?.text);
assert.doesNotMatch(
  workspaceReply("does this work", seLossUsed)?.text ?? "",
  /you qualify|you don.t qualify|this file cannot proceed|conventionally strong|purchase contract|I can answer from this file/i,
);
const zipOnlyLoss = {
  ...seLossUsed,
  subjectAddress: "",
  propertyZip: "94110",
  propertyZipAsked: true,
  skippedClasses: [...new Set([...(seLossUsed.skippedClasses ?? []), "government_id", "prior_year_return"])],
};
const zipOnlyQualify = workspaceReply("will I qualify", zipOnlyLoss);
assert.equal(zipOnlyQualify?.text, READINESS_NAMED_LOSS);
assert.equal(zipOnlyQualify?.followUp, nextFoxAsk(zipOnlyLoss).text);
assert.doesNotMatch(zipOnlyQualify?.text ?? "", /I can answer from this file|purchase contract/i);

console.log("assert-named-loss-readiness: named-loss qualify beat · next ask own line");
