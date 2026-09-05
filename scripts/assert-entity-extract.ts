/**
 * Composer-drop Form 1065 / 1120-S / 1120 entity returns 21 / 23 / 25.
 * Ownership × entity totals + GP named to Hale. K-1 ordinary-only upgrades on one row.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { POST as extractRoute } from "../app/api/docs/extract/route";
import { classifyAndExtract } from "../lib/docs/extract";
import { FAILED_READ_NOTE } from "../lib/docs/accept";
import { readPdfTextLayer } from "../lib/docs/pdfText";
import {
  loudEntityReturnFromPrintedLines,
  loudK1FromPrintedLines,
  loudScheduleCFromPrintedLines,
  loudScheduleEFromPrintedLines,
  loudWageFromPrintedLines,
} from "../lib/docs/printedSample";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { applyLooksRightMotion, applyProceedMotion, applyUploadMoreMotion } from "../components/fox/motion";
import { applyExtractWrite, emptyDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import { monthlyQualifyingFromExtract } from "../components/fox/qualifyingIncome";
import { resolveProposal } from "../components/fox/completeness";
import { SUGGESTED_INCOME_NOTE } from "../lib/income/suggest";
import {
  entityIntakeAsk,
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  workspacePromptCopy,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on a text-layer entity PDF");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on a text-layer entity PDF");
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

function assertNoWrongSchema(fields: Record<string, string | undefined>) {
  assert.equal(fields.schedule_c_net_profit, undefined);
  assert.equal(fields.schedule_e_rents_received, undefined);
  assert.equal(fields.schedule_e_cash_expenses, undefined);
  assert.equal(fields.k1_ordinary_income, undefined);
  assert.equal(fields.wages, undefined);
  assert.notEqual(fields.entity_ordinary_income, "66400");
  assert.notEqual(fields.entity_ordinary_income, "5533");
  assert.notEqual(fields.entity_ordinary_income, "55400");
  assert.notEqual(fields.entity_ordinary_income, "4617");
}

async function extractFile(name: string) {
  return classifyAndExtract(load(name), "application/pdf", deadVision);
}

function writeLive(draft: FoxIntakeDraft, name: string, fields: Record<string, string>, at: string) {
  loadIntakeDraft(draft);
  receiveDocument({
    slot: "other",
    name,
    type: "application/pdf",
    size: 2048,
    receivedAt: at,
  });
  return applyExtractWrite(at, name, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields,
  });
}

async function main() {
  const twentyOne = await extractFile("21-1065-2024-bay-street.pdf");
  assert.notEqual(twentyOne.failed, true);
  assert.equal(twentyOne.extractClass, "tax_return");
  assert.equal(twentyOne.fields.return_kind, "1065");
  assert.equal(twentyOne.fields.tax_year, "2024");
  assert.equal(twentyOne.fields.entity_ordinary_income, "100000");
  assert.equal(twentyOne.fields.entity_8825_rental, "5000");
  assert.equal(twentyOne.fields.entity_depreciation, "15000");
  assert.equal(twentyOne.fields.entity_amortization, "2000");
  assert.equal(twentyOne.fields.entity_te, "1000");
  assert.equal(twentyOne.fields.entity_guaranteed_payments, "18000");
  assert.equal(twentyOne.fields.ownership_percent, "40");
  assertNoWrongSchema(twentyOne.fields);
  assert.doesNotMatch(twentyOne.fields.entity_name ?? "", /Sanchez/i);

  const twentyOneBytes = load("21-1065-2024-bay-street.pdf");
  const layer21 = readPdfTextLayer(twentyOneBytes) ?? [];
  assert.ok(layer21.length, "fixture 21 must have a PDF text layer");
  const collapsed21 = [layer21.join(" ")];
  const loud21 = loudEntityReturnFromPrintedLines(collapsed21);
  assert.equal(loud21?.fields.entity_ordinary_income, "100000");
  assert.equal(loud21?.fields.ownership_percent, "40");
  assert.equal(loudK1FromPrintedLines(layer21), null);
  assert.equal(loudScheduleCFromPrintedLines(layer21), null);
  assert.equal(loudScheduleEFromPrintedLines(layer21), null);
  assert.equal(loudWageFromPrintedLines(layer21), null);

  const form = new FormData();
  form.append(
    "file",
    new File([Buffer.from(twentyOneBytes)], "21-1065-2024-bay-street.pdf", { type: "application/pdf" }),
    "21-1065-2024-bay-street.pdf",
  );
  form.append("name", "21-1065-2024-bay-street.pdf");
  form.append("type", "application/pdf");
  form.append("hint", "tax_return");
  const routed = await extractRoute(new Request("http://localhost/api/docs/extract", { method: "POST", body: form }));
  const routedJson = (await routed.json()) as { class?: string; failed?: boolean; fields?: Record<string, string> };
  assert.notEqual(routedJson.failed, true);
  assert.equal(routedJson.class, "tax_return");
  assert.equal(routedJson.fields?.entity_ordinary_income, "100000");
  assert.equal(routedJson.fields?.k1_ordinary_income, undefined);

  const twentyThree = await extractFile("23-1120s-2024-harbor-studio.pdf");
  assert.equal(twentyThree.fields.return_kind, "1120s");
  assert.equal(twentyThree.fields.entity_ordinary_income, "48000");
  assert.equal(twentyThree.fields.entity_depreciation, "8000");
  assert.equal(twentyThree.fields.entity_te, "600");
  assert.equal(twentyThree.fields.ownership_percent, "100");
  assert.equal(twentyThree.fields.wages, undefined);
  assertNoWrongSchema(twentyThree.fields);

  const twentyFive = await extractFile("25-1120-2024-thin-c-corp.pdf");
  assert.equal(twentyFive.fields.return_kind, "1120");
  assert.equal(twentyFive.fields.entity_taxable_income, "22000");
  assert.equal(twentyFive.fields.entity_ordinary_income, undefined);
  assert.equal(twentyFive.fields.k1_ordinary_income, undefined);
  assert.equal(twentyFive.fields.schedule_c_net_profit, undefined);

  const from21 = monthlyQualifyingFromExtract(seSketch(), "tax_return", twentyOne.fields);
  assert.equal(from21?.monthly, 5533);
  assert.equal(from21?.basis, "entity");
  assert.match(from21?.methodNote ?? "", /8825 rental/);
  assert.match(from21?.methodNote ?? "", /40%/);
  assert.match(from21?.methodNote ?? "", /GP to Hale/);
  assert.notEqual(from21?.monthly, 3333);
  assert.notEqual(from21?.monthly, 3150);

  const from23 = monthlyQualifyingFromExtract(seSketch(), "tax_return", twentyThree.fields);
  assert.equal(from23?.monthly, 4617);
  assert.equal(from23?.basis, "entity");
  assert.match(from23?.methodNote ?? "", /ordinary \+ dep/);
  assert.notEqual(from23?.monthly, 4000);
  assert.notEqual(from23?.monthly, 3000);

  const from25 = monthlyQualifyingFromExtract(seSketch(), "tax_return", twentyFive.fields);
  assert.equal(from25, null);

  const propose21 = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: twentyOne.fields,
  });
  assert.equal(propose21.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(propose21.draft.pendingProposal?.value, "5533");
  assert.equal(propose21.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
  assert.ok(!propose21.draft.facts?.qualifying_income);
  assert.ok(!propose21.draft.facts?.entity_ordinary_income);
  assert.ok(!previewFacts(propose21.draft).some((fact) => fact.id === "qualifying"));
  assert.ok(!previewFacts(propose21.draft).some((fact) => /5,533|5533/.test(fact.value)));
  assert.match(propose21.draft.subjectAddress ?? "", /Valencia/i);
  assert.doesNotMatch(propose21.draft.subjectAddress ?? "", /Clipper|Sanchez/i);
  const ask21 = workspacePromptCopy("confirm-proposal", propose21.draft);
  assert.match(ask21.text, /\$5,533/);
  assert.match(ask21.text, /Form 1065/);
  assert.match(ask21.text, /8825 rental/);
  assert.match(ask21.text, /Suggested qualifying income · not underwritten/);
  assert.ok((ask21.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok((ask21.actions ?? []).some((item) => item.label === "Change"));

  const used21 = resolveProposal(propose21.draft, "accept");
  assert.equal(used21.facts?.qualifying_income?.value, "5533");
  assert.equal(used21.facts?.qualifying_income?.confirmed, true);

  const thirteen = await extractFile("13-k1-1065-2024-bay-street.pdf");
  const k1First = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: thirteen.fields,
  });
  assert.equal(k1First.draft.pendingProposal?.value, "3333");
  const usedK1 = resolveProposal(k1First.draft, "accept");
  assert.equal(usedK1.facts?.qualifying_income?.value, "3333");
  const upgrade21 = applyExtractedFields(usedK1, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: twentyOne.fields,
  });
  assert.equal(upgrade21.draft.pendingProposal?.value, "5533");
  assert.equal(upgrade21.draft.facts?.qualifying_income?.value, "3333");
  assert.ok(!upgrade21.draft.facts?.qualifying_income || upgrade21.draft.pendingProposal?.value === "5533");
  const usedUpgrade = resolveProposal(upgrade21.draft, "accept");
  assert.equal(usedUpgrade.facts?.qualifying_income?.value, "5533");
  assert.notEqual(usedUpgrade.facts?.qualifying_income?.value, "8866");

  const fifteen = await extractFile("15-k1-1120s-2024-harbor-studio.pdf");
  const k1Harbor = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: fifteen.fields,
  });
  assert.equal(k1Harbor.draft.pendingProposal?.value, "4000");
  const usedHarbor = resolveProposal(k1Harbor.draft, "accept");
  const upgrade23 = applyExtractedFields(usedHarbor, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: twentyThree.fields,
  });
  assert.equal(upgrade23.draft.pendingProposal?.value, "4617");
  assert.equal(upgrade23.draft.facts?.qualifying_income?.value, "4000");
  const usedHarborUpgrade = resolveProposal(upgrade23.draft, "accept");
  assert.equal(usedHarborUpgrade.facts?.qualifying_income?.value, "4617");

  const propose23 = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: twentyThree.fields,
  });
  assert.equal(propose23.draft.pendingProposal?.value, "4617");
  const ask23 = workspacePromptCopy("confirm-proposal", propose23.draft);
  assert.match(ask23.text, /\$4,617/);
  assert.match(ask23.text, /Form 1120-S/);
  assert.doesNotMatch(ask23.text, /36,000|W-2/i);

  const propose25 = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: twentyFive.fields,
  });
  assert.notEqual(propose25.draft.pendingProposal?.field, "qualifying_income");
  assert.ok(!propose25.draft.facts?.qualifying_income);
  assert.ok(!propose25.draft.facts?.schedule_c_net_profit);

  const queued: FoxIntakeDraft = {
    ...used21,
    pendingProposal: null,
    sampleAccepted: true,
    phase: "confirmed",
    motion: "in_queue",
    workspaceDraftStatus: "ready",
  };
  const afterMore = applyUploadMoreMotion(queued);
  const moreAt = "2026-09-04T23:10:00.000Z";
  const moreWrite = writeLive(afterMore, "21-1065-2024-bay-street.pdf", twentyOne.fields, moreAt);
  assert.equal(moreWrite.draft.pendingProposal?.value, "5533");
  assert.equal(workspacePrompt(moreWrite.draft), "confirm-proposal");
  const moreAsk = entityIntakeAsk(moreWrite.draft, "tax_return") ?? nextFoxAsk(moreWrite.draft);
  assert.match(moreAsk.text, /\$5,533/);
  assert.ok((moreAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.doesNotMatch(moreAsk.text, /ONYX has this for review/i);
  assert.ok(!applyLooksRightMotion(propose21.draft).sampleAccepted);
  assert.notEqual(applyProceedMotion(propose21.draft).motion, "in_queue");

  const unreadAt = "2026-09-04T23:11:00.000Z";
  loadIntakeDraft(seSketch());
  receiveDocument({
    slot: "other",
    name: "21-1065-2024-bay-street.pdf",
    type: "application/pdf",
    size: 2048,
    receivedAt: unreadAt,
  });
  const unread = applyExtractWrite(
    unreadAt,
    "21-1065-2024-bay-street.pdf",
    { extractClass: "other", confidence: 0, fields: {} },
    undefined,
    true,
  );
  assert.notEqual(unread.draft.pendingProposal?.field, "qualifying_income");
  assert.ok(!unread.draft.facts?.qualifying_income);

  console.log("assert-entity-extract: 21=$5,533 · 23=$4,617 · 25 no SE · K-1 upgrades one row");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
