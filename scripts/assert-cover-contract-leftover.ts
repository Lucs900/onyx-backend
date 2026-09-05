/**
 * Contract ZIP 94114, 1040 cover map, paperclip extract, Looks right / citizenship gates.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import {
  applyExtractedFields,
  nextCoverScheduleLabels,
  rejectIncomingFile,
  stillUsefulLabels,
} from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import { canLooksRight, resolveProposal } from "../components/fox/completeness";
import { applyLooksRightMotion } from "../components/fox/motion";
import { citizenshipNeeded } from "../components/fox/citizenship";
import { workspacePrompt } from "../components/fox/workspace";
import { searchedKeyFor } from "../lib/rateflow/fromDraft";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on leftover fixtures");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on leftover fixtures");
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
    subjectAddress: "94123",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectAddressAsked: true,
    propertyType: "house",
    propertyTypeAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    liveQuote: { key: "old|94123", rate: 6.125, asOf: "2026-09-05" },
    liveQuoteKey: "old|94123",
    liveQuoteStatus: "ready",
    facts: {
      present_address: {
        field: "present_address",
        value: "412 Filbert Street, San Francisco, CA 94123",
        source: "document",
        confirmed: true,
      },
      property_address: {
        field: "property_address",
        value: "94123",
        source: "client",
        confirmed: true,
      },
    },
  };
}

async function extractFile(name: string) {
  return classifyAndExtract(load(name), "application/pdf", deadVision);
}

async function main() {
  const nine = await extractFile("09-purchase-contract-clipper.pdf");
  assert.notEqual(nine.failed, true);
  assert.equal(nine.extractClass, "purchase_contract");
  assert.match(nine.fields.property_address ?? "", /88 Clipper Street/i);
  assert.match(nine.fields.property_address ?? "", /94114/);
  assert.equal(nine.fields.purchase_price, "850000");
  assert.equal(nine.fields.seller_credit, "5000");

  const proposed = applyExtractedFields(seSketch(), {
    extractClass: "purchase_contract",
    confidence: 0.94,
    fields: nine.fields,
  });
  assert.equal(canLooksRight(proposed.draft), false);
  const used = resolveProposal(
    {
      ...proposed.draft,
      pendingConflict: null,
      pendingProposal: {
        field: "property_address",
        value: nine.fields.property_address ?? "",
        label: "property address",
        kind: "document",
      },
      lastPurchaseContractFields: nine.fields,
      documents: [
        {
          slot: "other",
          name: "09-purchase-contract-clipper.pdf",
          type: "application/pdf",
          size: 815,
          receivedAt: "2026-09-05T17:00:00.000Z",
          status: "extracted",
          extractClass: "purchase_contract",
        },
      ],
    },
    "accept",
  );
  assert.match(used.subjectAddress ?? "", /88 Clipper Street/i);
  assert.match(used.subjectAddress ?? "", /94114/);
  assert.equal(used.propertyZip, "94114");
  assert.doesNotMatch(used.subjectAddress ?? "", /94123|Filbert/i);
  assert.match(used.facts?.present_address?.value ?? "", /Filbert/i);
  assert.match(used.facts?.present_address?.value ?? "", /94123/);
  assert.notEqual(used.propertyZip, "94123");
  assert.equal(used.liveQuote, undefined);
  assert.notEqual(searchedKeyFor(used), searchedKeyFor(seSketch()));

  const nineteen = await extractFile("19-1040-cover-2024-jordan-hale.pdf");
  const twenty = await extractFile("20-1040-cover-2025-jordan-hale.pdf");
  for (const cover of [nineteen, twenty]) {
    assert.notEqual(cover.failed, true);
    assert.equal(cover.extractClass, "tax_return");
    assert.equal(cover.fields.return_kind, "cover");
    assert.ok(cover.fields.tax_year === "2024" || cover.fields.tax_year === "2025");
    assert.match(cover.fields.cover_schedules ?? "", /schedule_c/);
    assert.match(cover.fields.cover_schedules ?? "", /schedule_e/);
    assert.match(cover.fields.cover_schedules ?? "", /k1/);
    assert.equal(cover.fields.schedule_c_net_profit, undefined);
    assert.equal(cover.fields.k1_ordinary_income, undefined);
    assert.equal(cover.fields.schedule_e_rents_received, undefined);
    assert.equal(cover.fields.wages, undefined);
    assert.doesNotMatch(cover.fields.property_address ?? "", /Filbert|94123/);
  }

  const withQi: FoxIntakeDraft = {
    ...seSketch(),
    facts: {
      ...seSketch().facts,
      qualifying_income: {
        field: "qualifying_income",
        value: "9125",
        source: "suggested",
        confirmed: true,
      },
      schedule_c_net_profit: {
        field: "schedule_c_net_profit",
        value: "88000",
        source: "document",
        confirmed: true,
      },
      tax_cashflows: {
        field: "tax_cashflows",
        value: JSON.stringify([
          {
            tax_year: "2024",
            return_kind: "schedule_c",
            schedule_c_net_profit: "88000",
            depreciation: "",
            depletion: "",
            business_use_of_home: "",
            nonrecurring_other_income: "",
            amortization: "",
            casualty_loss: "",
            mileage_depreciation: "",
            k1_ordinary_income: "",
            k1_distributions: "",
            schedule_e_rents_received: "",
            schedule_e_cash_expenses: "",
            schedule_e_part2_names: "",
            schedule_e_property_address: "",
            entity_ordinary_income: "",
            entity_8825_rental: "",
            entity_depreciation: "",
            entity_amortization: "",
            entity_te: "",
            entity_guaranteed_payments: "",
            ownership_percent: "",
            entity_taxable_income: "",
            entity_name: "",
          },
        ]),
        source: "extracted-unconfirmed",
        confirmed: true,
      },
    },
  };
  const coverWrite = applyExtractedFields(withQi, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: nineteen.fields,
  });
  assert.notEqual(coverWrite.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(coverWrite.draft.facts?.qualifying_income?.value, "9125");
  assert.ok(!coverWrite.quietLines.some((line) => /couldn’t read|unreadable|failed read/i.test(line)));
  const mapped = nextCoverScheduleLabels({
    ...coverWrite.draft,
    facts: { ...coverWrite.draft.facts, cover_schedules: { field: "cover_schedules", value: nineteen.fields.cover_schedules ?? "", source: "document", confirmed: true } },
  });
  assert.ok(!mapped.includes("Schedule C"));
  assert.ok(mapped.some((label) => label === "K-1" || label === "Schedule E" || label === "Schedule F"));
  const useful = stillUsefulLabels({
    ...coverWrite.draft,
    facts: { ...coverWrite.draft.facts, cover_schedules: { field: "cover_schedules", value: nineteen.fields.cover_schedules ?? "", source: "document", confirmed: true } },
  });
  assert.ok(!useful.includes("Schedule C"));
  assert.ok(useful.some((label) => label === "K-1" || label === "Schedule E" || label === "1065" || label === "1120-S"));

  assert.equal(rejectIncomingFile(withQi, "19-1040-cover-2024-jordan-hale.pdf", "application/pdf", 3114), null);
  assert.equal(canLooksRight({ ...proposed.draft, pendingProposal: proposed.draft.pendingProposal }), false);
  const afterUse = { ...used, pendingProposal: null, looksRightHold: false };
  const looks = applyLooksRightMotion(afterUse);
  assert.equal(citizenshipNeeded({ ...looks, sampleAccepted: true }), false);
  assert.notEqual(workspacePrompt({ ...looks, sampleAccepted: true }), "citizenship");

  const twentyWrite = applyExtractedFields(withQi, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: twenty.fields,
  });
  assert.equal(twentyWrite.draft.facts?.qualifying_income?.value, "9125");

  console.log("assert-cover-contract-leftover: 09 ZIP 94114 · 19/20 cover map · Looks right gated");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
