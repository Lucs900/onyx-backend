/**
 * Composer-drop Schedule C worksheets 10–12.
 * Classify + extract from PDF text. Filename and Expected 1084 are not sources.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { applyProceedMotion, applyUploadMoreMotion } from "../components/fox/motion";
import { emptyDraft } from "../components/fox/store";
import { monthlyQualifyingFromExtract } from "../components/fox/qualifyingIncome";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on a text-layer Schedule C PDF");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on a text-layer Schedule C PDF");
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
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    valueAsked: true,
    amountAsked: true,
  };
}

async function main() {
const ten = await classifyAndExtract(
  load("10-1040-schedule-c-2024-hale-design.pdf"),
  "application/pdf",
  deadVision,
);
assert.equal(ten.failed, undefined);
assert.equal(ten.extractClass, "tax_return");
assert.equal(ten.fields.return_kind, "schedule_c");
assert.equal(ten.fields.tax_year, "2024");
assert.equal(ten.fields.business_name, "Hale Design Studio");
assert.equal(ten.fields.schedule_c_net_profit, "88000");
assert.equal(ten.fields.nonrecurring_other_income, "4000");
assert.equal(ten.fields.depletion, "500");
assert.equal(ten.fields.depreciation, "12000");
assert.equal(ten.fields.business_use_of_home, "3000");
assert.equal(ten.fields.amortization, undefined);
assert.notEqual(ten.fields.schedule_c_net_profit, "98700");
assert.notEqual(ten.fields.schedule_c_net_profit, "142000");

const eleven = await classifyAndExtract(
  load("11-1040-schedule-c-2025-hale-design.pdf"),
  "application/pdf",
  deadVision,
);
assert.equal(eleven.extractClass, "tax_return");
assert.equal(eleven.fields.tax_year, "2025");
assert.equal(eleven.fields.schedule_c_net_profit, "108000");
assert.equal(eleven.fields.nonrecurring_other_income, "4000");
assert.equal(eleven.fields.depreciation, "12000");

const twelve = await classifyAndExtract(
  load("12-1040-schedule-c-2025-hale-design-declining.pdf"),
  "application/pdf",
  deadVision,
);
assert.equal(twelve.extractClass, "tax_return");
assert.equal(twelve.fields.tax_year, "2025");
assert.equal(twelve.fields.schedule_c_net_profit, "72000");
assert.notEqual(twelve.fields.schedule_c_net_profit, "82700");

const cover = await classifyAndExtract(
  load("19-1040-cover-2024-jordan-hale.pdf"),
  "application/pdf",
  deadVision,
);
assert.notEqual(cover.fields.schedule_c_net_profit, "88000");
assert.ok(!cover.fields.schedule_c_net_profit);

const farm = await classifyAndExtract(
  load("18-schedule-f-2025-hale-farm.pdf"),
  "application/pdf",
  deadVision,
);
assert.ok(!farm.fields.schedule_c_net_profit);

const k1 = await classifyAndExtract(
  load("13-k1-1065-2024-bay-street.pdf"),
  "application/pdf",
  deadVision,
);
assert.ok(!k1.fields.schedule_c_net_profit);

const pngK1 = await classifyAndExtract(
  new Uint8Array(readFileSync(join(root, "scripts/fixtures/entity-ordinary-2024.png"))),
  "image/png",
  deadVision,
);
assert.equal(pngK1.extractClass, "tax_return");
assert.equal(pngK1.fields.return_kind, "k1");
assert.equal(pngK1.fields.k1_ordinary_income, "40000");
assert.ok(!pngK1.fields.schedule_c_net_profit);

const png = await classifyAndExtract(
  new Uint8Array(readFileSync(join(root, "scripts/fixtures/return-2023.png"))),
  "image/png",
  deadVision,
);
assert.equal(png.extractClass, "tax_return");
assert.equal(png.fields.schedule_c_net_profit, "80000");
assert.equal(png.fields.depreciation, "8000");

const one = monthlyQualifyingFromExtract(seSketch(), "tax_return", ten.fields);
assert.equal(one?.monthly, 8292);
assert.equal(one?.method, "one-year");
assert.match(one?.methodNote ?? "", /Schedule C one-year/);

const yearOne = applyExtractedFields(seSketch(), {
  extractClass: "tax_return",
  confidence: 0.94,
  fields: ten.fields,
});
assert.equal(yearOne.draft.pendingProposal?.field, "qualifying_income");
assert.equal(yearOne.draft.pendingProposal?.value, "8292");
assert.ok(!yearOne.draft.facts?.qualifying_income?.confirmed);

const average = applyExtractedFields(yearOne.draft, {
  extractClass: "tax_return",
  confidence: 0.94,
  fields: eleven.fields,
});
assert.equal(average.draft.pendingProposal?.value, "9125");
assert.match(average.draft.pendingProposal?.note ?? average.draft.pendingProposal?.methodNote ?? "", /average|Suggested/i);

const decliningBase = applyExtractedFields(seSketch(), {
  extractClass: "tax_return",
  confidence: 0.94,
  fields: ten.fields,
});
const declining = applyExtractedFields(decliningBase.draft, {
  extractClass: "tax_return",
  confidence: 0.94,
  fields: twelve.fields,
});
assert.equal(declining.draft.pendingProposal?.value, "6958");

const afterProceed = applyUploadMoreMotion(applyProceedMotion(seSketch()));
const afterProceedWrite = applyExtractedFields(afterProceed, {
  extractClass: "tax_return",
  confidence: 0.94,
  fields: ten.fields,
});
assert.equal(afterProceedWrite.draft.pendingProposal?.value, "8292");

console.log("assert-schedule-c-extract: 10/11/12 extract + v1 suggest + cover/farm no invent");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
