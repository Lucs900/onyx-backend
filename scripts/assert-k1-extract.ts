/**
 * Composer-drop K-1 worksheets 13 / 15 and 1040 cover 19.
 * Box 1 ordinary / 12 only. Filename, Expected 1084, and coaching /12 are not sources.
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
import { K1_ORDINARY_NOTE, SUGGESTED_INCOME_NOTE } from "../lib/income/suggest";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on a text-layer K-1 PDF");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on a text-layer K-1 PDF");
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
  const thirteen = await classifyAndExtract(
    load("13-k1-1065-2024-bay-street.pdf"),
    "application/pdf",
    deadVision,
  );
  assert.notEqual(thirteen.failed, true);
  assert.equal(thirteen.extractClass, "tax_return");
  assert.equal(thirteen.fields.return_kind, "1065");
  assert.equal(thirteen.fields.tax_year, "2024");
  assert.equal(thirteen.fields.k1_ordinary_income, "40000");
  assert.equal(thirteen.fields.schedule_c_net_profit, undefined);
  assert.equal(thirteen.fields.wages, undefined);
  assert.equal(thirteen.fields.ending_balance, undefined);
  assert.notEqual(thirteen.fields.k1_ordinary_income, "66400");
  assert.notEqual(thirteen.fields.k1_ordinary_income, "2000");
  assert.notEqual(thirteen.fields.k1_ordinary_income, "18000");
  assert.notEqual(thirteen.fields.k1_ordinary_income, "35000");
  assert.notEqual(thirteen.fields.k1_ordinary_income, "3333");
  assert.equal(thirteen.fields.k1_distributions, undefined);

  const fifteen = await classifyAndExtract(
    load("15-k1-1120s-2024-harbor-studio.pdf"),
    "application/pdf",
    deadVision,
  );
  assert.notEqual(fifteen.failed, true);
  assert.equal(fifteen.extractClass, "tax_return");
  assert.equal(fifteen.fields.return_kind, "1120s");
  assert.equal(fifteen.fields.tax_year, "2024");
  assert.equal(fifteen.fields.k1_ordinary_income, "48000");
  assert.equal(fifteen.fields.wages, undefined);
  assert.equal(fifteen.fields.schedule_c_net_profit, undefined);
  assert.notEqual(fifteen.fields.k1_ordinary_income, "36000");
  assert.notEqual(fifteen.fields.k1_ordinary_income, "55400");
  assert.notEqual(fifteen.fields.k1_ordinary_income, "4000");

  const cover = await classifyAndExtract(
    load("19-1040-cover-2024-jordan-hale.pdf"),
    "application/pdf",
    deadVision,
  );
  assert.ok(!cover.fields.schedule_c_net_profit);
  assert.ok(!cover.fields.k1_ordinary_income);

  const ten = await classifyAndExtract(
    load("10-1040-schedule-c-2024-hale-design.pdf"),
    "application/pdf",
    deadVision,
  );
  assert.equal(ten.extractClass, "tax_return");
  assert.equal(ten.fields.return_kind, "schedule_c");
  assert.equal(ten.fields.schedule_c_net_profit, "88000");
  assert.ok(!ten.fields.k1_ordinary_income);

  const pngK1 = await classifyAndExtract(
    new Uint8Array(readFileSync(join(root, "scripts/fixtures/entity-ordinary-2024.png"))),
    "image/png",
    deadVision,
  );
  assert.equal(pngK1.extractClass, "tax_return");
  assert.equal(pngK1.fields.return_kind, "k1");
  assert.equal(pngK1.fields.k1_ordinary_income, "40000");

  const from13 = monthlyQualifyingFromExtract(seSketch(), "tax_return", thirteen.fields);
  assert.equal(from13?.monthly, 3333);
  assert.equal(from13?.basis, "k1");
  assert.equal(from13?.caution, K1_ORDINARY_NOTE);

  const from15 = monthlyQualifyingFromExtract(seSketch(), "tax_return", fifteen.fields);
  assert.equal(from15?.monthly, 4000);
  assert.equal(from15?.basis, "k1");

  const propose13 = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: thirteen.fields,
  });
  assert.equal(propose13.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(propose13.draft.pendingProposal?.value, "3333");
  assert.equal(propose13.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
  assert.ok(!propose13.draft.facts?.qualifying_income?.confirmed);

  const propose15 = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: fifteen.fields,
  });
  assert.equal(propose15.draft.pendingProposal?.value, "4000");
  assert.ok(!propose15.draft.facts?.qualifying_income?.confirmed);

  const coverWrite = applyExtractedFields(seSketch(), {
    extractClass: cover.extractClass,
    confidence: cover.confidence,
    fields: cover.fields,
  });
  assert.notEqual(coverWrite.draft.pendingProposal?.field, "qualifying_income");
  assert.ok(!coverWrite.draft.facts?.qualifying_income);

  const wageOnFile = applyExtractedFields(
    {
      ...seSketch(),
      facts: {
        ...seSketch().facts,
        wages: { field: "wages", value: "36000", source: "suggested", confirmed: true },
        qualifying_income: { field: "qualifying_income", value: "3000", source: "suggested", confirmed: true },
        wage_monthly: { field: "wage_monthly", value: "3000", source: "suggested", confirmed: true },
      },
    },
    {
      extractClass: "tax_return",
      confidence: 0.94,
      fields: fifteen.fields,
    },
  );
  assert.equal(wageOnFile.draft.pendingProposal?.parts?.k1, "4000");
  assert.match(wageOnFile.draft.pendingProposal?.methodNote ?? "", /combined wage \+ K-1/i);
  assert.notEqual(wageOnFile.draft.pendingProposal?.value, "4000");
  assert.notEqual(wageOnFile.draft.pendingProposal?.parts?.k1, "7000");

  const afterProceed = applyUploadMoreMotion(applyProceedMotion(seSketch()));
  const afterProceedWrite = applyExtractedFields(afterProceed, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: thirteen.fields,
  });
  assert.equal(afterProceedWrite.draft.pendingProposal?.value, "3333");

  console.log("assert-k1-extract: 13=$3,333 · 15=$4,000 · cover writes nothing");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
