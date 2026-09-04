/**
 * Composer-drop Schedule E Part I worksheet 17.
 * Rents minus cash expenses / 12 only. 75%, taxable rental, PITIA, and filename are not sources.
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
  loudK1FromPrintedLines,
  loudScheduleCFromPrintedLines,
  loudScheduleEFromPrintedLines,
  loudWageFromPrintedLines,
} from "../lib/docs/printedSample";
import {
  applyExtractedFields,
  nextDocInvite,
  nextScheduleENamedK1Label,
  stillUsefulLabels,
} from "../components/fox/fileWrite";
import { applyLooksRightMotion, applyProceedMotion, applyUploadMoreMotion } from "../components/fox/motion";
import { applyExtractWrite, emptyDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import { monthlyQualifyingFromExtract } from "../components/fox/qualifyingIncome";
import { resolveProposal } from "../components/fox/completeness";
import { SUGGESTED_RENTAL_CASH_FLOW_NOTE } from "../lib/income/suggest";
import { nextFoxAsk, previewFacts, workspacePrompt, workspacePromptCopy } from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on a text-layer Schedule E PDF");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on a text-layer Schedule E PDF");
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
    subjectAddress: "88 Clipper Street, San Francisco, CA 94114",
  };
}

function walkSe(): FoxIntakeDraft {
  return {
    ...seSketch(),
    propertyValueAmount: 850_000,
    downPaymentAmount: 170_000,
    loanAmountValue: 680_000,
    propertyType: "house",
    propertyTypeAsked: true,
    propertyZip: "94114",
    propertyZipAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    skippedClasses: ["government_id"],
  };
}

function assertNoForbiddenIncome(fields: Record<string, string | undefined>) {
  assert.equal(fields.schedule_c_net_profit, undefined);
  assert.equal(fields.k1_ordinary_income, undefined);
  assert.equal(fields.k1_distributions, undefined);
  assert.equal(fields.wages, undefined);
  assert.equal(fields.gross_monthly_rent, undefined);
  assert.equal(fields.monthly_rent, undefined);
  assert.equal(fields.lease_gross, undefined);
  assert.equal(fields.property_address, undefined);
  assert.notEqual(fields.schedule_e_rents_received, "24400");
  assert.notEqual(fields.schedule_e_rents_received, "31500");
  assert.notEqual(fields.schedule_e_rents_received, "2550");
  assert.notEqual(fields.schedule_e_rents_received, "6200");
  assert.notEqual(fields.schedule_e_cash_expenses, "24400");
  assert.notEqual(fields.schedule_e_cash_expenses, "6200");
  assert.notEqual(fields.schedule_e_cash_expenses, "31500");
}

async function main() {
  const seventeen = await classifyAndExtract(
    load("17-schedule-e-2025-sanchez-rental.pdf"),
    "application/pdf",
    deadVision,
  );
  assert.notEqual(seventeen.failed, true);
  assert.equal(seventeen.extractClass, "tax_return");
  assert.equal(seventeen.fields.return_kind, "schedule_e");
  assert.equal(seventeen.fields.tax_year, "2025");
  assert.equal(seventeen.fields.schedule_e_rents_received, "42000");
  assert.equal(seventeen.fields.schedule_e_cash_expenses, "11400");
  assert.match(seventeen.fields.schedule_e_property_address ?? "", /210 Sanchez Street/i);
  assert.match(seventeen.fields.schedule_e_part2_names ?? "", /Bay Street Partners LLC/i);
  assert.match(seventeen.fields.schedule_e_part2_names ?? "", /Harbor Studio Inc/i);
  assertNoForbiddenIncome(seventeen.fields);
  assert.doesNotMatch(seventeen.fields.schedule_e_property_address ?? "", /Clipper|Filbert/i);

  const seventeenBytes = load("17-schedule-e-2025-sanchez-rental.pdf");
  const layer = readPdfTextLayer(seventeenBytes) ?? [];
  assert.ok(layer.length, "fixture 17 must have a PDF text layer");
  const collapsed = [layer.join(" ")];
  const collapsedE = loudScheduleEFromPrintedLines(collapsed);
  assert.equal(collapsedE?.extractClass, "tax_return");
  assert.equal(collapsedE?.fields.return_kind, "schedule_e");
  assert.equal(collapsedE?.fields.schedule_e_rents_received, "42000");
  assert.equal(collapsedE?.fields.schedule_e_cash_expenses, "11400");
  assert.equal(collapsedE?.fields.tax_year, "2025");
  assertNoForbiddenIncome(collapsedE?.fields ?? {});
  assert.equal(loudWageFromPrintedLines(layer), null);
  assert.equal(loudWageFromPrintedLines(collapsed), null);
  assert.equal(loudK1FromPrintedLines(layer), null);
  assert.equal(loudScheduleCFromPrintedLines(layer), null);

  const liveHint = await classifyAndExtract(
    seventeenBytes,
    "application/pdf",
    deadVision,
    "tax_return",
    "17-schedule-e-2025-sanchez-rental.pdf",
  );
  assert.notEqual(liveHint.failed, true);
  assert.equal(liveHint.fields.schedule_e_rents_received, "42000");
  assert.equal(liveHint.fields.schedule_e_cash_expenses, "11400");
  assert.equal(liveHint.fields.return_kind, "schedule_e");

  const form = new FormData();
  form.append(
    "file",
    new File([Buffer.from(seventeenBytes)], "17-schedule-e-2025-sanchez-rental.pdf", {
      type: "application/pdf",
    }),
    "17-schedule-e-2025-sanchez-rental.pdf",
  );
  form.append("name", "17-schedule-e-2025-sanchez-rental.pdf");
  form.append("type", "application/pdf");
  form.append("hint", "tax_return");
  const routed = await extractRoute(
    new Request("http://localhost/api/docs/extract", { method: "POST", body: form }),
  );
  const routedJson = (await routed.json()) as {
    class?: string;
    failed?: boolean;
    note?: string;
    fields?: Record<string, string>;
  };
  assert.notEqual(routedJson.failed, true);
  assert.notEqual(routedJson.note, FAILED_READ_NOTE);
  assert.equal(routedJson.class, "tax_return");
  assert.equal(routedJson.fields?.return_kind, "schedule_e");
  assert.equal(routedJson.fields?.schedule_e_rents_received, "42000");
  assert.equal(routedJson.fields?.schedule_e_cash_expenses, "11400");
  assert.equal(routedJson.fields?.k1_ordinary_income, undefined);

  const cover = await classifyAndExtract(
    load("19-1040-cover-2024-jordan-hale.pdf"),
    "application/pdf",
    deadVision,
  );
  assert.ok(!cover.fields.schedule_e_rents_received);
  assert.ok(!cover.fields.k1_ordinary_income);

  const ten = await classifyAndExtract(
    load("10-1040-schedule-c-2024-hale-design.pdf"),
    "application/pdf",
    deadVision,
  );
  assert.equal(ten.fields.return_kind, "schedule_c");
  assert.ok(!ten.fields.schedule_e_rents_received);

  const thirteen = await classifyAndExtract(
    load("13-k1-1065-2024-bay-street.pdf"),
    "application/pdf",
    deadVision,
  );
  assert.equal(thirteen.fields.return_kind, "1065");
  assert.equal(thirteen.fields.k1_ordinary_income, "40000");
  assert.ok(!thirteen.fields.schedule_e_rents_received);

  const from17 = monthlyQualifyingFromExtract(seSketch(), "tax_return", seventeen.fields);
  assert.equal(from17?.monthly, 2550);
  assert.equal(from17?.basis, "schedule_e");
  assert.equal(from17?.methodNote, "rents minus cash expenses / 12");
  assert.notEqual(from17?.monthly, 3150);
  assert.notEqual(from17?.monthly, 2033);
  assert.notEqual(from17?.monthly, 3333);

  const propose17 = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: seventeen.fields,
  });
  assert.equal(propose17.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(propose17.draft.pendingProposal?.value, "2550");
  assert.equal(propose17.draft.pendingProposal?.note, SUGGESTED_RENTAL_CASH_FLOW_NOTE);
  assert.equal(propose17.draft.pendingProposal?.methodNote, "rents minus cash expenses / 12");
  assert.ok(!propose17.draft.facts?.qualifying_income);
  assert.ok(!propose17.draft.facts?.schedule_e_rents_received);
  assert.ok(!propose17.draft.facts?.schedule_e_cash_expenses);
  const proposedFacts = previewFacts(propose17.draft);
  assert.ok(!proposedFacts.some((fact) => fact.id === "qualifying"));
  assert.ok(!proposedFacts.some((fact) => /2,550|2550/.test(fact.value)));
  assert.ok(proposedFacts.every((fact) => fact.id !== "income" || !/\$/.test(fact.value)));
  assert.equal(propose17.draft.pendingProposal?.field, "qualifying_income");
  assert.ok(!(propose17.draft.pendingProposal?.extras ?? []).some((item) => /pitia/i.test(item.field)));
  assert.notEqual(propose17.draft.pendingProposal?.field, "suggested_net_rental");
  assert.notEqual(propose17.draft.facts?.k1_ordinary_income?.value, "40000");
  assert.notEqual(propose17.draft.facts?.schedule_c_net_profit?.value, "88000");
  assert.match(propose17.draft.subjectAddress ?? "", /88 Clipper Street/i);
  assert.doesNotMatch(propose17.draft.subjectAddress ?? "", /Sanchez|Filbert/i);
  assert.equal(nextScheduleENamedK1Label(propose17.draft), "Bay Street K-1");
  assert.ok(stillUsefulLabels(propose17.draft).includes("Bay Street K-1"));
  assert.ok(!stillUsefulLabels(propose17.draft).includes("Harbor Studio K-1"));

  const coverWrite = applyExtractedFields(seSketch(), {
    extractClass: cover.extractClass,
    confidence: cover.confidence,
    fields: cover.fields,
  });
  assert.notEqual(coverWrite.draft.pendingProposal?.field, "qualifying_income");
  assert.ok(!coverWrite.draft.facts?.qualifying_income);

  const afterProceed = applyUploadMoreMotion(applyProceedMotion(seSketch()));
  const afterProceedWrite = applyExtractedFields(afterProceed, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: seventeen.fields,
  });
  assert.equal(afterProceedWrite.draft.pendingProposal?.value, "2550");
  assert.equal(afterProceedWrite.draft.pendingProposal?.note, SUGGESTED_RENTAL_CASH_FLOW_NOTE);
  assert.ok(!afterProceedWrite.draft.facts?.qualifying_income);

  const queuedWalk: FoxIntakeDraft = {
    ...walkSe(),
    sampleAccepted: true,
    phase: "confirmed",
    motion: "in_queue",
    workspaceDraftStatus: "ready",
  };
  const afterQueueMore = applyUploadMoreMotion(queuedWalk);
  const afterQueueAt = "2026-09-04T22:02:00.000Z";
  loadIntakeDraft(afterQueueMore);
  receiveDocument({
    slot: "other",
    name: "17-schedule-e-2025-sanchez-rental.pdf",
    type: "application/pdf",
    size: 2048,
    receivedAt: afterQueueAt,
  });
  const afterQueueWrite = applyExtractWrite(
    afterQueueAt,
    "17-schedule-e-2025-sanchez-rental.pdf",
    {
      extractClass: "tax_return",
      confidence: 0.94,
      fields: seventeen.fields,
    },
  );
  assert.equal(afterQueueWrite.draft.pendingProposal?.value, "2550");
  assert.equal(afterQueueWrite.draft.pendingProposal?.note, SUGGESTED_RENTAL_CASH_FLOW_NOTE);
  assert.ok(!afterQueueWrite.draft.facts?.qualifying_income);
  assert.equal(workspacePrompt(afterQueueWrite.draft), "confirm-proposal");
  const afterQueueAsk = nextFoxAsk(afterQueueWrite.draft);
  assert.match(afterQueueAsk.text, /\$2,550/);
  assert.match(afterQueueAsk.text, /Use this/);
  assert.ok((afterQueueAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.doesNotMatch(afterQueueAsk.text, /ONYX has this for review/i);
  assert.ok(!previewFacts(afterQueueWrite.draft).some((fact) => fact.id === "qualifying"));
  assert.ok(!previewFacts(afterQueueWrite.draft).some((fact) => /2,550|2550/.test(fact.value)));

  const receivedAt = "2026-09-04T22:00:00.000Z";
  loadIntakeDraft(walkSe());
  receiveDocument({
    slot: "other",
    name: "17-schedule-e-2025-sanchez-rental.pdf",
    type: "application/pdf",
    size: 2048,
    receivedAt,
  });
  const liveWrite = applyExtractWrite(
    receivedAt,
    "17-schedule-e-2025-sanchez-rental.pdf",
    {
      extractClass: "tax_return",
      confidence: 0.94,
      fields: seventeen.fields,
    },
  );
  assert.ok(!liveWrite.quietLines.some((line) => line === FAILED_READ_NOTE));
  assert.equal(liveWrite.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(liveWrite.draft.pendingProposal?.value, "2550");
  assert.equal(liveWrite.draft.pendingProposal?.note, SUGGESTED_RENTAL_CASH_FLOW_NOTE);
  assert.ok(!liveWrite.draft.facts?.qualifying_income?.confirmed);
  const liveAsk = workspacePromptCopy("confirm-proposal", liveWrite.draft);
  assert.match(liveAsk.text, /\$2,550/);
  assert.match(liveAsk.text, /rents minus cash expenses \/ 12/);
  assert.match(liveAsk.text, /Suggested rental cash flow · not underwritten/);
  assert.doesNotMatch(liveAsk.text, /75%|PITIA|Clipper|Filbert|\$3,333|\$4,000|24,400/i);
  assert.ok((liveAsk.actions ?? []).some((item) => item.label === "Use this"));
  const looks = applyLooksRightMotion(liveWrite.draft);
  assert.equal(looks.pendingProposal?.value, "2550");
  assert.ok(!looks.sampleAccepted);
  const queued = applyProceedMotion(liveWrite.draft);
  assert.notEqual(queued.motion, "in_queue");
  assert.equal(queued.pendingProposal?.value, "2550");

  const used = resolveProposal(liveWrite.draft, "accept");
  assert.equal(used.facts?.qualifying_income?.value, "2550");
  assert.equal(used.facts?.qualifying_income?.confirmed, true);
  assert.ok(previewFacts(used).some((fact) => fact.id === "qualifying" && /2,550/.test(fact.value)));
  assert.match(used.subjectAddress ?? "", /88 Clipper Street/i);
  assert.doesNotMatch(used.subjectAddress ?? "", /Sanchez|Filbert/i);
  assert.ok(!used.facts?.suggested_net_rental?.value);
  assert.ok(!used.facts?.rental_pitia_used?.value);
  assert.notEqual(used.facts?.k1_ordinary_income?.value, "40000");
  assert.notEqual(used.facts?.qualifying_income?.value, "3150");
  assert.notEqual(used.facts?.qualifying_income?.value, "2033");

  const unreadAt = "2026-09-04T22:01:00.000Z";
  loadIntakeDraft(walkSe());
  receiveDocument({
    slot: "other",
    name: "17-schedule-e-2025-sanchez-rental.pdf",
    type: "application/pdf",
    size: 2048,
    receivedAt: unreadAt,
  });
  const unreadWrite = applyExtractWrite(
    unreadAt,
    "17-schedule-e-2025-sanchez-rental.pdf",
    { extractClass: "other", confidence: 0, fields: {} },
    undefined,
    true,
  );
  assert.notEqual(unreadWrite.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(nextDocInvite(unreadWrite.draft), "tax_return");
  assert.ok(!applyLooksRightMotion(unreadWrite.draft).sampleAccepted);
  assert.notEqual(applyProceedMotion(unreadWrite.draft).motion, "in_queue");

  const kindOnly = applyExtractedFields(walkSe(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { return_kind: "schedule_e", tax_year: "2025" },
  });
  assert.notEqual(kindOnly.draft.pendingProposal?.field, "qualifying_income");
  assert.ok(!kindOnly.draft.facts?.qualifying_income);

  console.log("assert-schedule-e-extract: 17=$2,550 · Clipper untouched · Part II not income");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
