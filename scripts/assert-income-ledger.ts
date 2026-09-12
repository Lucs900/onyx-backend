/**
 * Income-as-ledger leftover.
 * Stub QI stays. Schedule E / partnership are their own CFBW rows.
 * Losses do not net into W-2 QI. Cover wages do not overwrite QI.
 * Cover wages far above File W-2s ask once. Gross is a File fact, not QI.
 */
import assert from "node:assert/strict";
import {
  applyExtractedFields,
  nextScheduleENamedK1Label,
  stillUsefulLabels,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import {
  applyCoverWageGapAnswer,
  QUALIFYING_INCOME_FIELD,
  qualifyingIncomeDisplay,
} from "../components/fox/qualifyingIncome";
import { SUGGESTED_INCOME_NOTE, SUGGESTED_RENTAL_CASH_FLOW_NOTE } from "../lib/income/suggest";
import { resolveProposal } from "../components/fox/completeness";
import { applyExtractWrite, emptyDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import { coverWageGapAsk, nextFoxAsk, previewFacts } from "../components/fox/workspace";
import {
  COVER_WAGE_GAP_ASK,
  GROSS_RECEIPTS_FIELD,
  GROSS_RECEIPTS_NOTE,
  INCOME_LEDGER_FIELD,
  NAMED_LOSS_FIELD,
  coverWagesFarAboveFileW2s,
  hasRealIncomeLedgerDollars,
  incomeLedgerFieldsFromPrintedLines,
  incomeLedgerRowsFromFields,
} from "../lib/income/ledger";
import { classifyAndExtract } from "../lib/docs/extract";
import type { FoxIntakeDraft } from "../components/fox/types";

function multiPagePdf(pages: string[][]) {
  const kids: string[] = [];
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  const pageObjects: string[] = [];
  const contentObjects: string[] = [];
  for (const [index, lines] of pages.entries()) {
    const commands = ["BT", "/F1 12 Tf", "72 720 Td"];
    for (const [lineIndex, line] of lines.entries()) {
      if (lineIndex) commands.push("0 -18 Td");
      commands.push(`(${line.replace(/[()\\]/g, "\\$&")}) Tj`);
    }
    commands.push("ET");
    const stream = commands.join("\n");
    contentObjects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageObj = 3 + index;
    const contentObj = 3 + pages.length + index;
    kids.push(`${pageObj} 0 R`);
    pageObjects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> >>`,
    );
  }
  objects.push(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`);
  objects.push(...pageObjects, ...contentObjects);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(chunks.reduce((sum, part) => sum + part.length, 0));
    chunks.push(Buffer.from(`${index + 1} 0 obj\n${body}\nendobj\n`));
  });
  const xrefAt = chunks.reduce((sum, part) => sum + part.length, 0);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(Buffer.from(xref));
  chunks.push(
    Buffer.from(`trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefAt}\n%%EOF\n`),
  );
  return Buffer.concat(chunks);
}

function wageQiDraft(): FoxIntakeDraft {
  const now = "2026-09-11T20:00:00.000Z";
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    sampleAccepted: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 850_000,
    downPaymentAmount: 170_000,
    loanAmountValue: 680_000,
    valueAsked: true,
    amountAsked: true,
    subjectAddress: "88 Clipper Street, San Francisco, CA 94114",
    propertyZip: "94114",
    propertyZipAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
    monthlyDebtsAsked: true,
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageStubAsked: true,
    stubExtractAccepted: true,
    priorStubAsked: true,
    wageFrequencyAsked: true,
    facts: {
      qualifying_income: {
        field: QUALIFYING_INCOME_FIELD,
        value: "36453",
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      qualifying_method: {
        field: "qualifying_method",
        value: "W-2 Box 5 + stub",
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      wage_monthly: {
        field: "wage_monthly",
        value: "36453",
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      w2_monthly: {
        field: "w2_monthly",
        value: "36453",
        source: "computed",
        confirmed: true,
        confirmedAt: now,
      },
      medicare_wages: {
        field: "medicare_wages",
        value: "437436",
        source: "document",
        confirmed: true,
        confirmedAt: now,
      },
      w2_box5: {
        field: "w2_box5",
        value: "437436",
        source: "document",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

function writeLive(draft: FoxIntakeDraft, name: string, fields: Record<string, string>, at: string) {
  loadIntakeDraft(draft);
  receiveDocument({
    slot: "other",
    name,
    type: "application/pdf",
    size: 223455,
    receivedAt: at,
    extractClass: "tax_return",
  });
  return applyExtractWrite(at, name, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields,
  });
}

async function main() {
  assert.equal(coverWagesFarAboveFileW2s(600000, 437436), true);
  assert.equal(coverWagesFarAboveFileW2s(437436, 437436), false);
  assert.equal(coverWagesFarAboveFileW2s(400000, 437436), false);

  const printed = incomeLedgerFieldsFromPrintedLines([
    "Form 1040 2025",
    "1a Wages, salaries, tips $520,000.00",
    "Rent/royalty/partnership/estate (Schedule E): -$294,564.00",
    "Ordinary business income  Bay Street Partners LLC  $18,000",
    "Gross receipts $1,200,000",
  ]);
  assert.equal(printed.wages, "520000");
  assert.equal(printed.schedule_e_rents_received, "-294564");
  assert.equal(printed.k1_ordinary_income, "18000");
  assert.equal(printed.gross_receipts, "1200000");
  const schedule1 = incomeLedgerFieldsFromPrintedLines([
    "Form 1040 2025",
    "1a Wages, salaries, tips, etc. $520,000.00",
    "3 Business income or (loss). Attach Schedule C  0",
    "5 Rental real estate, royalties, partnerships, S corporations. Attach Schedule E  (294,564.00)",
    "Ordinary business income  Bay Street Partners LLC  $18,000",
    "Gross receipts or sales $1,200,000",
  ]);
  assert.equal(schedule1.wages, "520000");
  assert.equal(schedule1.schedule_e_rents_received, "-294564");
  assert.equal(schedule1.k1_ordinary_income, "18000");
  assert.equal(schedule1.gross_receipts, "1200000");
  assert.equal(schedule1.schedule_c_net_profit, undefined, "zero Schedule 1 C is not a row");
  const fromSchedule1 = incomeLedgerRowsFromFields(schedule1);
  assert.ok(
    fromSchedule1.some((row) => row.kind === "named_loss" && Number(row.monthly) < 0),
    "Schedule 1 partnership/Sch E net is a named loss, not ignored",
  );
  assert.ok(hasRealIncomeLedgerDollars(schedule1));

  const columnar = incomeLedgerFieldsFromPrintedLines([
    "U.S. Individual Income Tax Return",
    "Form 1040 2025",
    "Schedule E Supplemental Income and Loss",
    "Part I Income or Loss From Rental Real Estate",
    "42000  3 Rents received",
    "11400  Cash expenses (ex-depreciation)",
    "Income or (loss) from partnerships and S corporations  (294,564)",
  ]);
  assert.equal(columnar.schedule_e_rents_received, "42000");
  assert.equal(columnar.schedule_e_cash_expenses, "11400");
  assert.equal(columnar.k1_ordinary_income, "-294564");
  const columnarRows = incomeLedgerRowsFromFields(columnar);
  assert.ok(columnarRows.some((row) => row.kind === "schedule_e" && row.monthly === "2550"));
  assert.ok(columnarRows.some((row) => row.kind === "named_loss" && Number(row.monthly) < 0));
  const fromFields = incomeLedgerRowsFromFields({
    tax_year: "2025",
    full_name: "Allan Combes",
    wages: "520000",
    schedule_e_rents_received: "42000",
    schedule_e_cash_expenses: "11400",
    k1_ordinary_income: "-294564",
    schedule_e_part2_names: "Bay Street Partners LLC",
    gross_receipts: "1200000",
    business_name: "Bay Street Partners LLC",
  });
  assert.ok(
    fromFields.some((row) => row.kind === "schedule_e"),
    `Schedule E row missing — ${fromFields.map((row) => row.kind).join(",")}`,
  );
  assert.ok(
    fromFields.some((row) => row.kind === "named_loss" || (row.kind === "k1" && Number(row.monthly) < 0)),
    `loss row missing — ${fromFields.map((row) => `${row.kind}:${row.monthly}`).join(",")}`,
  );

  const base = wageQiDraft();
  const pageReadAt = "2026-09-12T01:00:00.000Z";
  const pageReadName = "2025 1040 - Combes Allan and Renz.pdf";
  const page = writeLive(
    base,
    pageReadName,
    {
      tax_year: "2025",
      full_name: "Allan Combes",
      wages: "600000",
      schedule_e_rents_received: "42000",
      schedule_e_cash_expenses: "11400",
      k1_ordinary_income: "-294564",
      schedule_e_part2_names: "Bay Street Partners LLC",
      gross_receipts: "1200000",
      business_name: "Bay Street Partners LLC",
    },
    pageReadAt,
  );
  assert.equal(page.draft.facts?.qualifying_income?.value, "36453", "stub QI stays");
  assert.equal(page.draft.pendingProposal?.field, "tax_year", "year + name confirm still first");
  assert.equal(page.draft.pendingProposal?.value, "2025");
  assert.equal(
    page.draft.pendingProposal?.extras?.find((item) => item.field === "wages"),
    undefined,
    "cover wages are not a Use this extra",
  );
  assert.equal(page.draft.facts?.wages, undefined, "cover wages do not write File");
  assert.notEqual(page.draft.facts?.[QUALIFYING_INCOME_FIELD]?.value, "43333");
  assert.ok(
    (page.draft.incomeLedger ?? []).some((row) => row.kind === "schedule_e" && row.status === "suggested"),
    "Schedule E is a suggested row",
  );
  assert.ok(
    (page.draft.incomeLedger ?? []).some((row) => row.kind === "named_loss" && row.status === "suggested"),
    "loss is a named row",
  );
  assert.equal(page.draft.facts?.[GROSS_RECEIPTS_FIELD]?.value, "1200000");
  const grossFact = previewFacts(page.draft).find((fact) => fact.id === "gross-receipts");
  assert.ok(grossFact, "gross receipts lands on File");
  assert.match(grossFact?.note ?? "", /not qualifying income/i);
  assert.doesNotMatch(
    previewFacts(page.draft)
      .filter((fact) => fact.id === "qualifying")
      .map((fact) => fact.value)
      .join(" "),
    /1,200,000|1200000/,
  );
  assert.ok(!page.draft.facts?.qualifying_income || page.draft.facts.qualifying_income.value === "36453");

  const afterYear = resolveProposal(page.draft, "accept");
  assert.equal(afterYear.facts?.qualifying_income?.value, "36453", "QI stays on year Use this");
  assert.equal(afterYear.facts?.tax_year?.value, "2025");
  assert.equal(afterYear.facts?.wages, undefined);
  assert.equal(afterYear.awaitingCoverWageGap, true, "cover wages far above File W-2s ask once");
  const gapAsk = nextFoxAsk(afterYear);
  assert.equal(gapAsk.text, COVER_WAGE_GAP_ASK);
  assert.deepEqual(
    (gapAsk.actions ?? []).map((item) => item.label),
    ["Another job", "Spouse", "Skip"],
  );
  assert.equal(coverWageGapAsk().text, COVER_WAGE_GAP_ASK);

  const afterSkipGap = applyCoverWageGapAnswer(afterYear, "skip");
  assert.equal(afterSkipGap.coverWageGapAsked, true);
  assert.equal(afterSkipGap.awaitingCoverWageGap, false);
  assert.equal(afterSkipGap.facts?.qualifying_income?.value, "36453");
  assert.equal(afterSkipGap.pendingProposal?.field, INCOME_LEDGER_FIELD);
  assert.equal(afterSkipGap.facts?.schedule_e_monthly, undefined, "File empty on Schedule E until Use this");
  const eAsk = nextFoxAsk(afterSkipGap);
  assert.match(eAsk.text, /Schedule E/i);
  assert.match(eAsk.text, /Use this/i);
  assert.ok((eAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.doesNotMatch(eAsk.text, /36,453/);

  const usedE = resolveProposal(afterSkipGap, "accept");
  assert.equal(usedE.facts?.qualifying_income?.value, "36453", "Schedule E Use this does not replace QI");
  assert.ok(usedE.facts?.schedule_e_monthly?.confirmed);
  assert.ok(
    previewFacts(usedE).some((fact) => /Schedule E/i.test(fact.label) && fact.value.includes("$")),
    "Schedule E writes its own File row",
  );

  const afterLeaveLoss = resolveProposal(usedE, "decline");
  assert.equal(afterLeaveLoss.facts?.qualifying_income?.value, "36453", "leaving a loss blank does not net QI");
  assert.equal(afterLeaveLoss.facts?.[NAMED_LOSS_FIELD], undefined);
  assert.ok(
    (afterLeaveLoss.incomeLedger ?? []).some((row) => row.kind === "named_loss" && row.status === "skipped"),
    "Skip keeps the loss off QI",
  );

  const lossOpen = writeLive(
    wageQiDraft(),
    "2025-k1-loss.pdf",
    {
      tax_year: "2025",
      return_kind: "k1",
      k1_ordinary_income: "-24000",
      entity_name: "Bay Street Partners LLC",
    },
    "2026-09-12T01:10:00.000Z",
  );
  assert.equal(lossOpen.draft.facts?.qualifying_income?.value, "36453");
  assert.notEqual(lossOpen.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);
  const lossRow = (lossOpen.draft.incomeLedger ?? []).find((row) => row.kind === "named_loss");
  assert.ok(lossRow, "K-1 hole is a named loss row");
  assert.ok(Number(lossRow?.monthly) < 0);

  const coverWithLines = applyExtractedFields(wageQiDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2025",
      return_kind: "cover",
      wages: "600000",
      schedule_e_rents_received: "42000",
      schedule_e_cash_expenses: "11400",
      k1_ordinary_income: "-294564",
      schedule_e_part2_names: "Bay Street Partners LLC",
    },
  });
  assert.equal(coverWithLines.draft.facts?.qualifying_income?.value, "36453", "cover lines do not overwrite QI");
  assert.ok(
    (coverWithLines.draft.incomeLedger ?? []).some((row) => row.kind === "schedule_e"),
    "cover Schedule E line is still its own row",
  );
  assert.ok(
    (coverWithLines.draft.incomeLedger ?? []).some((row) => row.kind === "named_loss"),
    "cover partnership loss is still a named row",
  );

  const coverWages = applyExtractedFields(wageQiDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2025",
      full_name: "Allan Combes",
      wages: "600000",
      return_kind: "1040",
    },
  });
  assert.equal(coverWages.draft.facts?.qualifying_income?.value, "36453");
  assert.equal(coverWages.draft.facts?.wages, undefined);
  assert.notEqual(coverWages.draft.pendingProposal?.field, QUALIFYING_INCOME_FIELD);

  const scheduleCOwnRow = applyExtractedFields(wageQiDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2025",
      return_kind: "schedule_c",
      schedule_c_net_profit: "88000",
      business_name: "Hale Design Studio",
    },
  });
  assert.equal(scheduleCOwnRow.draft.facts?.qualifying_income?.value, "36453");
  assert.equal(scheduleCOwnRow.draft.pendingProposal?.field, INCOME_LEDGER_FIELD);
  assert.equal(scheduleCOwnRow.draft.facts?.se_monthly, undefined, "File empty until Use this");
  const usedC = resolveProposal(scheduleCOwnRow.draft, "accept");
  assert.equal(usedC.facts?.qualifying_income?.value, "36453");
  assert.equal(usedC.facts?.se_monthly?.value, "7333");

  const useful = (stillUsefulSection({ ...afterYear, sampleAccepted: true })?.items ?? []).map((item) => item.label);
  assert.ok(useful.length >= 0);

  const secondGap = applyCoverWageGapAnswer(afterSkipGap, "another-job");
  assert.equal(secondGap.coverWageGapAsked, true);
  assert.equal(secondGap.awaitingCoverWageGap, false);

  const lineNumberE = applyExtractedFields(wageQiDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2025",
      return_kind: "schedule_e",
      schedule_e_rents_received: "3",
      schedule_e_cash_expenses: "5",
    },
  });
  assert.equal(lineNumberE.draft.facts?.qualifying_income?.value, "36453", "Alameda QI held");
  assert.ok(
    !(lineNumberE.draft.incomeLedger ?? []).some((row) => row.kind === "schedule_e" && row.monthly === "2"),
    "line numbers are not a $2 rental row",
  );
  assert.notEqual(lineNumberE.draft.pendingProposal?.value, "2");
  const painted = qualifyingIncomeDisplay(lineNumberE.draft);
  assert.ok(painted, "wage QI stays on File");
  assert.doesNotMatch(painted?.note ?? "", /rental cash flow/i);
  assert.match(painted?.note ?? "", /qualifying income/i);
  assert.notEqual(painted?.note, SUGGESTED_RENTAL_CASH_FLOW_NOTE);
  assert.equal(painted?.note, SUGGESTED_INCOME_NOTE);
  assert.ok(!previewFacts(lineNumberE.draft).some((fact) => /rental cash flow/i.test(fact.note ?? "")));
  assert.equal(nextScheduleENamedK1Label(lineNumberE.draft), null);
  assert.ok(
    !stillUsefulLabels(lineNumberE.draft).includes("Bay Street K-1"),
    "Still useful does not invent Bay Street K-1",
  );

  const tinyNet = incomeLedgerRowsFromFields({
    tax_year: "2025",
    return_kind: "schedule_e",
    schedule_e_rents_received: "24",
    schedule_e_cash_expenses: "0",
  });
  assert.ok(
    !tinyNet.some((row) => row.kind === "schedule_e"),
    "tiny Schedule E net is not a rental suggest",
  );

  const packet = multiPagePdf([
    [
      "Form 1040",
      "U.S. Individual Income Tax Return",
      "2025",
      "Your first name and middle initial Allan",
      "Last name Combes",
      "Spouse Renz Combes",
    ],
    [
      "Schedule E (Form 1040) 2025",
      "Supplemental Income and Loss",
      "Part I Income or Loss From Rental Real Estate",
      "42000  3 Rents received",
      "11400  Cash expenses (ex-depreciation)",
      "Income or (loss) from partnerships and S corporations  (294,564)",
    ],
  ]);
  const namesOnly = {
    async classify() {
      return { class: "tax_return" as const, confidence: 0.94, readable: true };
    },
    async extract() {
      return { fields: { tax_year: "2025", full_name: "ALLAN COMBES and RENZ COMBES" }, warnings: [] };
    },
  };
  const packetRead = await classifyAndExtract(
    packet,
    "application/pdf",
    namesOnly,
    "tax_return",
    "2025 1040 - Combes Allan and Renz.pdf",
  );
  assert.notEqual(packetRead.failed, true, "1040 + Sch E lines must not unread when dollars are on the page");
  assert.equal(packetRead.fields.tax_year, "2025");
  assert.match(packetRead.fields.full_name ?? "", /COMBES/i);
  assert.equal(packetRead.fields.schedule_e_rents_received, "42000");
  assert.equal(packetRead.fields.schedule_e_cash_expenses, "11400");
  assert.equal(packetRead.fields.k1_ordinary_income, "-294564");
  assert.ok(hasRealIncomeLedgerDollars(packetRead.fields));

  const unreadPacket = multiPagePdf([
    [
      "Form 1040",
      "U.S. Individual Income Tax Return",
      "2025",
      "Your first name and middle initial Allan",
      "Last name Combes",
    ],
    [
      "Schedule E (Form 1040) 2025",
      "Supplemental Income and Loss",
      "Part I Income or Loss From Rental Real Estate",
      "3 Rents received",
      "5 Cash expenses (ex-depreciation)",
    ],
  ]);
  const unreadRead = await classifyAndExtract(
    unreadPacket,
    "application/pdf",
    namesOnly,
    "tax_return",
    "2025 1040 - Combes Allan and Renz.pdf",
  );
  assert.equal(unreadRead.failed, true, "Sch E lines with no real dollars are unread, not names-only");
  assert.deepEqual(unreadRead.fields, {});

  const recovered = await classifyAndExtract(
    unreadPacket,
    "application/pdf",
    {
      ...namesOnly,
      async extractLedger() {
        return {
          fields: {
            schedule_e_rents_received: "42000",
            schedule_e_cash_expenses: "11400",
            k1_ordinary_income: "-294564",
          },
          warnings: [],
        };
      },
    },
    "tax_return",
    "2025 1040 - Combes Allan and Renz.pdf",
  );
  assert.notEqual(recovered.failed, true);
  assert.equal(recovered.fields.full_name, "ALLAN COMBES and RENZ COMBES");
  assert.equal(recovered.fields.schedule_e_rents_received, "42000");
  assert.equal(recovered.fields.k1_ordinary_income, "-294564");

  console.log(
    "assert-income-ledger: stub QI stays · Sch E / partnership own rows · loss does not net · cover wages held · gap once · gross not QI · no invented $2 · QI label stays stub · no fixture K-1 · 1040 packet reads Sch E/K-1 or unread",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
