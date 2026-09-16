/**
 * Written K-1 / Schedule C / 1065 loss is not a dead file and not a denial.
 * will I qualify / does this work / can I still proceed → UW-review only.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { factsFromDraft, resolveProposal } from "../components/fox/completeness";
import { workspaceReply } from "../components/fox/workspace";
import { asksWillIQualify } from "../lib/guidelines/answer";
import { READINESS_STRONG, READINESS_UW_REVIEW, readinessFromFile } from "../lib/guidelines/conventional";
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
  READINESS_UW_REVIEW,
);
assert.doesNotMatch(READINESS_UW_REVIEW, /you qualify|you don.t qualify|cannot proceed|keep preparing/i);
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
assert.equal(readinessFromFile(factsFromDraft(seLossUsed)).line, READINESS_UW_REVIEW);
assert.match(
  workspaceReply("will I qualify", seLossUsed)?.text ?? "",
  new RegExp(READINESS_UW_REVIEW.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
);
assert.doesNotMatch(
  workspaceReply("does this work", seLossUsed)?.text ?? "",
  /you qualify|you don.t qualify|this file cannot proceed|conventionally strong/i,
);

console.log("assert-named-loss-readiness: UW-review on written loss · profit stays strong");
