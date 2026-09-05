/**
 * Same-business Harbor W-2 $36,000 attaches to Harbor K-1 / 1120-S.
 * One row, two methods, combined written only after Use this.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import { resolveProposal } from "../components/fox/completeness";
import { previewFacts, workspacePromptCopy } from "../components/fox/workspace";
import {
  employersClose,
  monthlyQualifyingFromExtract,
} from "../components/fox/qualifyingIncome";
import { SUGGESTED_INCOME_NOTE } from "../lib/income/suggest";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on a text-layer Harbor W-2");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on a text-layer Harbor W-2");
  },
};

function load(name: string) {
  return new Uint8Array(readFileSync(join(root, "sample-docs", name)));
}

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
    skippedClasses: ["government_id"],
  };
}

async function extractFile(name: string) {
  return classifyAndExtract(load(name), "application/pdf", deadVision);
}

function chipLabels(draft: FoxIntakeDraft) {
  return (workspacePromptCopy("confirm-proposal", draft).actions ?? []).map((item) => item.label);
}

function assertSameBusinessPropose(draft: FoxIntakeDraft, monthly: string, priorQi: string) {
  assert.equal(draft.pendingProposal?.field, "qualifying_income");
  assert.equal(draft.pendingProposal?.value, monthly);
  assert.equal(draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
  assert.match(draft.pendingProposal?.methodNote ?? "", /W-2 wages/i);
  assert.ok(
    /entity cash flow/i.test(draft.pendingProposal?.methodNote ?? "") ||
      /K-1 ordinary/i.test(draft.pendingProposal?.methodNote ?? ""),
  );
  assert.equal(draft.pendingProposal?.parts?.wage, "3000");
  assert.notEqual(draft.pendingProposal?.parts?.k1, "3000");
  assert.notEqual(draft.pendingProposal?.value, draft.pendingProposal?.parts?.k1);
  assert.equal(draft.facts?.qualifying_income?.value, priorQi);
  assert.equal(draft.awaitingBothMonthlyReason, false);
  const chips = chipLabels(draft);
  assert.ok(chips.includes("Use this"));
  assert.ok(chips.includes("Change"));
  assert.ok(!chips.includes("Raise"));
  assert.ok(!chips.includes("Raise / new base"));
  assert.ok(!chips.includes("OT"));
  assert.ok(!chips.includes("Overtime / bonus"));
  assert.ok(!chips.includes("Second job"));
  const employers = previewFacts(draft).filter((fact) => fact.id === "employer" || fact.label === "Employment");
  assert.equal(employers.length, 1);
  assert.match(employers[0]?.value ?? "", /Harbor Studio/i);
  assert.equal((draft.employmentHistory ?? []).length, 1);
  assert.ok(employersClose(draft.employmentHistory?.[0]?.label, "Harbor Studio Inc"));
  assert.ok(!previewFacts(draft).some((fact) => fact.id === "qualifying" && new RegExp(monthly).test(fact.value)));
}

async function main() {
  const twentySix = await extractFile("26-w2-2024-harbor-studio.pdf");
  assert.notEqual(twentySix.failed, true);
  assert.equal(twentySix.extractClass, "w2");
  assert.equal(twentySix.fields.employer_name, "Harbor Studio Inc");
  assert.equal(twentySix.fields.wages, "36000");
  assert.equal(twentySix.fields.medicare_wages, "36000");
  assert.equal(twentySix.fields.box5, "36000");
  assert.equal(twentySix.fields.tax_year, "2024");
  assert.doesNotMatch(JSON.stringify(twentySix.fields), /\b\d{3}-\d{2}-\d{4}\b|ssn/i);

  const fifteen = await extractFile("15-k1-1120s-2024-harbor-studio.pdf");
  const twentyThree = await extractFile("23-1120s-2024-harbor-studio.pdf");
  assert.ok(employersClose(twentySix.fields.employer_name, fifteen.fields.entity_name));
  assert.ok(employersClose(twentySix.fields.employer_name, twentyThree.fields.entity_name));

  const used15 = resolveProposal(
    applyExtractedFields(seSketch(), {
      extractClass: "tax_return",
      confidence: 0.94,
      fields: fifteen.fields,
    }).draft,
    "accept",
  );
  assert.equal(used15.facts?.qualifying_income?.value, "4000");
  const plus15 = applyExtractedFields(used15, {
    extractClass: twentySix.extractClass,
    confidence: 0.94,
    fields: twentySix.fields,
  });
  const from15 = monthlyQualifyingFromExtract(used15, twentySix.extractClass, twentySix.fields);
  assert.equal(from15?.monthly, 7000);
  assert.equal(from15?.basis, "combined");
  assert.equal(from15?.parts?.wage, 3000);
  assert.equal(from15?.parts?.k1, 4000);
  assertSameBusinessPropose(plus15.draft, "7000", "4000");
  const ask15 = workspacePromptCopy("confirm-proposal", plus15.draft);
  assert.match(ask15.text, /\$7,000/);
  assert.match(ask15.text, /W-2 wages/i);
  assert.match(ask15.text, /K-1 ordinary/i);
  assert.doesNotMatch(ask15.text, /Raise|Second job|Overtime/i);
  const usedCombo15 = resolveProposal(plus15.draft, "accept");
  assert.equal(usedCombo15.facts?.qualifying_income?.value, "7000");
  assert.equal((usedCombo15.employmentHistory ?? []).length, 1);

  const used23 = resolveProposal(
    applyExtractedFields(seSketch(), {
      extractClass: "tax_return",
      confidence: 0.94,
      fields: twentyThree.fields,
    }).draft,
    "accept",
  );
  assert.equal(used23.facts?.qualifying_income?.value, "4617");
  const plus23 = applyExtractedFields(used23, {
    extractClass: twentySix.extractClass,
    confidence: 0.94,
    fields: twentySix.fields,
  });
  const from23 = monthlyQualifyingFromExtract(used23, twentySix.extractClass, twentySix.fields);
  assert.equal(from23?.monthly, 7617);
  assert.equal(from23?.basis, "combined");
  assert.equal(from23?.parts?.wage, 3000);
  assert.equal(from23?.parts?.k1, 4617);
  assertSameBusinessPropose(plus23.draft, "7617", "4617");
  const ask23 = workspacePromptCopy("confirm-proposal", plus23.draft);
  assert.match(ask23.text, /\$7,617/);
  assert.match(ask23.text, /W-2 wages/i);
  assert.match(ask23.text, /entity cash flow/i);
  assert.doesNotMatch(ask23.text, /Raise|Second job|Overtime/i);
  const usedCombo23 = resolveProposal(plus23.draft, "accept");
  assert.equal(usedCombo23.facts?.qualifying_income?.value, "7617");
  assert.equal((usedCombo23.employmentHistory ?? []).length, 1);
  assert.ok(employersClose(usedCombo23.employmentHistory?.[0]?.label, "Harbor Studio Inc"));

  console.log("assert-same-business-w2: 15+26=$7,000 · 23+26=$7,617 · one Harbor row");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
