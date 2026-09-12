/**
 * Income-as-ledger leftover.
 * Stub QI stays. Schedule E / partnership are their own CFBW rows.
 * Losses do not net into W-2 QI. Cover wages do not overwrite QI.
 * Walk all pages. Classify by form header. 8879 is not a 1040.
 * Household wages CFBW from the Form 1040 page. Do not invent Sch E. Gross is a File fact, not QI.
 */
import assert from "node:assert/strict";
import {
  applyExtractedFields,
  nextScheduleENamedK1Label,
  stillUsefulLabels,
  stillUsefulSection,
  TAX_RETURN_NAME_FIELD,
} from "../components/fox/fileWrite";
import {
  applyCoverWageGapAnswer,
  HOUSEHOLD_WAGES_FIELD,
  isHouseholdWagesProposal,
  QUALIFYING_INCOME_FIELD,
  qualifyingIncomeDisplay,
} from "../components/fox/qualifyingIncome";
import { SUGGESTED_INCOME_NOTE, SUGGESTED_RENTAL_CASH_FLOW_NOTE } from "../lib/income/suggest";
import { resolveProposal } from "../components/fox/completeness";
import { FAILED_READ_NOTE } from "../lib/docs/accept";
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
import { classifyAndExtract, shouldGrokTaxReturnPagesFirst } from "../lib/docs/extract";
import { classifyPageByFormHeader } from "../lib/docs/formHeader";
import { loudTranscriptFromPrintedLines } from "../lib/docs/printedSample";
import {
  PACKET_LINES_MISSING_LINE,
  PACKET_SCHEDULES_MISSING_LINE,
  PACKET_WAGES_UNREAD_LINE,
  taxReturnPacketHoldAsk,
  taxReturnPacketNeedsRead,
} from "../components/fox/fileWrite";
import type { ExtractClass, FoxIntakeDraft } from "../components/fox/types";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

  const face2025 = incomeLedgerFieldsFromPrintedLines([
    "Form 1040 2025",
    "1a Total amount from Form(s) W-2, box 1          87,432.00",
    "1b Household employee wages not reported on Form(s) W-2",
    "1z Wages, salaries, tips, etc. Add lines 1a through 1h          87,432.00",
  ]);
  assert.equal(face2025.wages, "87432", "Form 1040 line 1z / 1a W-2 total is household wages");
  assert.notEqual(face2025.wages, "1");
  assert.notEqual(face2025.wages, "2");

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
  assert.equal(taxReturnPacketNeedsRead(afterYear), true, "after name write, keep reading later pages");
  assert.ok(!afterYear.awaitingCoverWageGap);
  assert.equal(
    isHouseholdWagesProposal(afterYear.pendingProposal),
    true,
    "names Use this offers page-1 household wages immediately",
  );
  assert.equal(coverWageGapAsk().text, COVER_WAGE_GAP_ASK);
  const wageAsk = nextFoxAsk(afterYear);
  assert.match(wageAsk.text, /household wages of \$600,000/i);
  assert.match(wageAsk.text, /not qualifying income/i);
  assert.match(wageAsk.text, /Use this/i);
  assert.deepEqual(
    (wageAsk.actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  assert.ok(
    !(wageAsk.actions ?? []).some((item) => item.label === "Proceed"),
    "do not jump to finish chips over household-wages Use this",
  );

  loadIntakeDraft(afterYear);
  const afterPage1 = applyExtractWrite(pageReadAt, pageReadName, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      packet_read: "schedules",
      wages: "600000",
      schedule_e_rents_received: "42000",
      schedule_e_cash_expenses: "11400",
      k1_ordinary_income: "-294564",
    },
  });
  assert.equal(afterPage1.draft.facts?.qualifying_income?.value, "36453", "household wages do not overwrite QI");
  assert.equal(afterPage1.draft.facts?.wages, undefined, "cover wages stay off File wages");
  assert.equal(isHouseholdWagesProposal(afterPage1.draft.pendingProposal), true);

  const afterHousehold = resolveProposal(afterPage1.draft, "accept");
  assert.equal(afterHousehold.facts?.qualifying_income?.value, "36453");
  assert.equal(afterHousehold.facts?.wages, undefined);
  assert.equal(afterHousehold.facts?.[HOUSEHOLD_WAGES_FIELD]?.value, "600000");
  assert.equal(afterHousehold.pendingProposal?.field, INCOME_LEDGER_FIELD);
  assert.equal(afterHousehold.facts?.schedule_e_monthly, undefined, "File empty on Schedule E until Use this");
  const eAsk = nextFoxAsk(afterHousehold);
  assert.match(eAsk.text, /Schedule E/i);
  assert.match(eAsk.text, /Use this/i);
  assert.ok((eAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.doesNotMatch(eAsk.text, /36,453/);

  const usedE = resolveProposal(afterHousehold, "accept");
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

  const secondGap = applyCoverWageGapAnswer(afterHousehold, "another-job");
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

  const labelOnlyPacket = multiPagePdf([
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
  const keepNames = await classifyAndExtract(
    labelOnlyPacket,
    "application/pdf",
    namesOnly,
    "tax_return",
    "2025 1040 - Combes Allan and Renz.pdf",
  );
  assert.notEqual(keepNames.failed, true, "do not unread a 1040 packet as invent-nothing success");
  assert.equal(keepNames.fields.tax_year, "2025");
  assert.match(keepNames.fields.full_name ?? "", /COMBES/i);

  const scanPacket = multiPagePdf([
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
      "42000  3 Rents received",
      "11400  Cash expenses (ex-depreciation)",
    ],
  ]);
  let ledgerPages = 0;
  const recovered = await classifyAndExtract(
    scanPacket,
    "application/pdf",
    {
      ...namesOnly,
      async extractLedger() {
        ledgerPages += 1;
        return {
          fields: {
            wages: "520000",
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
  assert.ok(ledgerPages >= 1, "later packet pages go to Grok like a W-2 page image");
  assert.notEqual(recovered.failed, true);
  assert.equal(recovered.fields.full_name, "ALLAN COMBES and RENZ COMBES");
  assert.equal(recovered.fields.wages, "520000");
  assert.equal(recovered.fields.schedule_e_rents_received, "42000");
  assert.equal(recovered.fields.k1_ordinary_income, "-294564");
  const recoveredRows = incomeLedgerRowsFromFields(recovered.fields);
  assert.ok(recoveredRows.some((row) => row.kind === "schedule_e"));
  assert.ok(recoveredRows.some((row) => row.kind === "named_loss" && Number(row.monthly) < 0));

  const walkName = "2025 1040 Combes Allan and Renz.pdf";
  assert.equal(shouldGrokTaxReturnPagesFirst("w2", walkName), true);

  const stealLines = [
    "Form 1040",
    "U.S. Individual Income Tax Return",
    "Tax year: 2025",
    "Filing Status",
    "Married Taxpayer Filing Joint Return",
    "Your first name and middle initial Allan",
    "Last name Combes",
    "Spouse Renz Combes",
  ];
  const stealPrinted = loudTranscriptFromPrintedLines(stealLines);
  assert.ok(stealPrinted, "printed 1040 + Filing Status used to steal the packet as a transcript");
  assert.equal(stealPrinted?.fields.full_name, undefined, "transcript steal drops both names");
  const stealPdf = multiPagePdf([stealLines]);
  const stealCalls: { mediaType: string; extractClass?: ExtractClass; ledger?: boolean }[] = [];
  const stealRead = await classifyAndExtract(
    stealPdf,
    "application/pdf",
    {
      async classify(bytes, mediaType) {
        stealCalls.push({ mediaType });
        return { class: "tax_return", confidence: 0.94, readable: true };
      },
      async extract(bytes, mediaType, extractClass) {
        stealCalls.push({ mediaType, extractClass });
        return { fields: { tax_year: "2025", full_name: "ALLAN COMBES and RENZ COMBES" }, warnings: [] };
      },
      async extractLedger(bytes, mediaType) {
        stealCalls.push({ mediaType, ledger: true });
        return {
          fields: {
            wages: "520000",
            schedule_e_rents_received: "42000",
            schedule_e_cash_expenses: "11400",
            k1_ordinary_income: "-294564",
          },
          warnings: [],
        };
      },
    },
    "w2",
    walkName,
  );
  assert.ok(
    stealCalls.some((call) => call.extractClass === "tax_return"),
    "page-image Grok must fire on the walk 1040 — not the printed transcript steal",
  );
  assert.ok(
    stealCalls.every((call) => call.mediaType.startsWith("image/")),
    `Grok must receive page images — ${stealCalls.map((call) => call.mediaType).join(",")}`,
  );
  assert.ok(
    stealCalls.some((call) => call.ledger),
    "same W-2 page-image look must run the locked ledger schema on this page",
  );
  assert.notEqual(stealRead.failed, true);
  assert.equal(stealRead.fields.tax_year, "2025");
  assert.match(stealRead.fields.full_name ?? "", /ALLAN COMBES/i);
  assert.match(stealRead.fields.full_name ?? "", /RENZ COMBES/i);
  assert.equal(stealRead.fields.wages, "520000");
  assert.equal(
    stealRead.fields.schedule_e_rents_received,
    undefined,
    "do not take Schedule E from a Form 1040 face",
  );
  assert.equal(stealRead.fields.k1_ordinary_income, undefined, "do not invent a K-1 from a 1040 face");

  let onePageLedger = 0;
  const onePage = await classifyAndExtract(
    multiPagePdf([
      [
        "Form 1040",
        "U.S. Individual Income Tax Return",
        "2025",
        "Your first name and middle initial Allan",
        "Last name Combes",
      ],
    ]),
    "application/pdf",
    {
      ...namesOnly,
      async extractLedger(bytes, mediaType) {
        onePageLedger += 1;
        assert.ok(mediaType.startsWith("image/"), `ledger Grok got ${mediaType}`);
        return {
          fields: {
            wages: "520000",
            schedule_e_rents_received: "42000",
            schedule_e_cash_expenses: "11400",
            k1_ordinary_income: "-294564",
          },
          warnings: [],
        };
      },
    },
    "tax_return",
    walkName,
  );
  assert.ok(onePageLedger >= 1, "pageCount 1 still sends the page image to Grok ledger");
  assert.equal(onePage.fields.wages, "520000");
  assert.equal(
    onePage.fields.schedule_e_rents_received,
    undefined,
    "a Form 1040 face is not a Schedule E page",
  );

  const coverOnlyAt = "2026-09-12T16:00:00.000Z";
  const coverOnly = writeLive(
    wageQiDraft(),
    walkName,
    { tax_year: "2025", full_name: "ALLAN COMBES and RENZ ARIANE COMBES" },
    coverOnlyAt,
  );
  assert.equal(coverOnly.draft.pendingProposal?.field, "tax_year");
  const afterCoverWrite = resolveProposal(coverOnly.draft, "accept");
  assert.equal(afterCoverWrite.facts?.qualifying_income?.value, "36453");
  assert.equal(afterCoverWrite.facts?.tax_year?.value, "2025");
  assert.match(String(afterCoverWrite.facts?.[TAX_RETURN_NAME_FIELD]?.value ?? ""), /RENZ ARIANE COMBES/);
  assert.equal(taxReturnPacketNeedsRead(afterCoverWrite), true, "cover write keeps reading the same PDF");
  assert.equal(taxReturnPacketHoldAsk(afterCoverWrite), false, "no bytesRef — leftovers keep finish chips");
  assert.equal(afterCoverWrite.pendingProposal, null);
  assert.equal((afterCoverWrite.incomeLedger ?? []).length, 0);

  loadIntakeDraft(afterCoverWrite);
  const afterPacket = applyExtractWrite(coverOnlyAt, walkName, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      packet_read: "schedules",
      wages: "600000",
      schedule_e_rents_received: "42000",
      schedule_e_cash_expenses: "11400",
      k1_ordinary_income: "-294564",
    },
  });
  assert.equal(afterPacket.draft.facts?.qualifying_income?.value, "36453", "packet read does not overwrite QI");
  assert.equal(afterPacket.draft.facts?.wages, undefined, "cover wages stay off File");
  assert.equal(afterPacket.draft.taxReturnPacketRead, "done");
  assert.equal(isHouseholdWagesProposal(afterPacket.draft.pendingProposal), true, "Form 1040 wages are household CFBW");
  assert.ok(
    (afterPacket.draft.incomeLedger ?? []).some((row) => row.kind === "schedule_e" && row.status === "suggested"),
  );
  assert.ok(
    (afterPacket.draft.incomeLedger ?? []).some((row) => row.kind === "named_loss" && row.status === "suggested"),
  );
  const afterPacketWages = resolveProposal(afterPacket.draft, "accept");
  assert.equal(afterPacketWages.facts?.qualifying_income?.value, "36453");
  assert.equal(afterPacketWages.facts?.[HOUSEHOLD_WAGES_FIELD]?.value, "600000");
  assert.equal(afterPacketWages.pendingProposal?.field, INCOME_LEDGER_FIELD);
  const packetEAsk = nextFoxAsk(afterPacketWages);
  assert.match(packetEAsk.text, /Schedule E/i);
  assert.match(packetEAsk.text, /Use this/i);

  const emptyCoverAt = "2026-09-12T16:10:00.000Z";
  const emptyCover = writeLive(
    wageQiDraft(),
    walkName,
    { tax_year: "2025", full_name: "ALLAN COMBES and RENZ ARIANE COMBES" },
    emptyCoverAt,
  );
  const emptyWritten = resolveProposal(emptyCover.draft, "accept");
  loadIntakeDraft(emptyWritten);
  const emptyPacket = applyExtractWrite(emptyCoverAt, walkName, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { packet_read: "empty", form_1040: "1" },
  });
  assert.equal(emptyPacket.draft.facts?.qualifying_income?.value, "36453");
  assert.ok(emptyPacket.quietLines.includes(PACKET_WAGES_UNREAD_LINE), "1040 face with unread 1z/1a is not “not on these pages”");
  assert.ok(!emptyPacket.quietLines.includes(PACKET_LINES_MISSING_LINE));
  assert.ok(!emptyPacket.quietLines.includes(FAILED_READ_NOTE));
  assert.equal(emptyPacket.draft.taxReturnPacketSpoken, true);
  assert.doesNotMatch(emptyPacket.draft.documents.find((doc) => doc.name === walkName)?.note ?? "", /could not read/i);
  const emptyAgain = applyExtractWrite(emptyCoverAt, walkName, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { packet_read: "empty", form_1040: "1" },
  });
  assert.ok(!emptyAgain.quietLines.includes(PACKET_WAGES_UNREAD_LINE), "unread Form 1040 wages is spoken once");
  assert.ok(!emptyAgain.quietLines.includes(PACKET_LINES_MISSING_LINE));
  assert.ok(!emptyAgain.quietLines.includes(PACKET_SCHEDULES_MISSING_LINE));

  const wagesOnlyAt = "2026-09-12T16:20:00.000Z";
  const wagesOnlyCover = writeLive(
    wageQiDraft(),
    walkName,
    { tax_year: "2025", full_name: "ALLAN COMBES and RENZ ARIANE COMBES" },
    wagesOnlyAt,
  );
  const wagesOnlyWritten = resolveProposal(wagesOnlyCover.draft, "accept");
  loadIntakeDraft(wagesOnlyWritten);
  const wagesOnlyPacket = applyExtractWrite(wagesOnlyAt, walkName, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { packet_read: "schedules", wages: "87432" },
  });
  assert.equal(wagesOnlyPacket.draft.facts?.qualifying_income?.value, "36453");
  assert.equal(isHouseholdWagesProposal(wagesOnlyPacket.draft.pendingProposal), true);
  assert.equal(
    (wagesOnlyPacket.draft.incomeLedger ?? []).some((row) => row.kind === "schedule_e"),
    false,
    "do not invent Schedule E",
  );
  const wagesOnlyUsed = resolveProposal(wagesOnlyPacket.draft, "accept");
  assert.equal(wagesOnlyUsed.facts?.[HOUSEHOLD_WAGES_FIELD]?.value, "87432");
  assert.equal(wagesOnlyUsed.facts?.qualifying_income?.value, "36453");
  assert.notEqual(wagesOnlyUsed.pendingProposal?.field, INCOME_LEDGER_FIELD);

  let packetPhaseLedger = 0;
  const packetPhase = await classifyAndExtract(
    multiPagePdf([
      ["Form 1040", "2025", "Allan Combes"],
      ["Schedule E (Form 1040) 2025", "42000  3 Rents received", "11400  Cash expenses (ex-depreciation)"],
    ]),
    "application/pdf",
    {
      async classify() {
        throw new Error("packet phase must not classify");
      },
      async extract() {
        throw new Error("packet phase is ledger Grok, not year+name extract");
      },
      async extractLedger(bytes, mediaType) {
        packetPhaseLedger += 1;
        assert.ok(mediaType.startsWith("image/"));
        return {
          fields: {
            wages: "520000",
            schedule_e_rents_received: "42000",
            schedule_e_cash_expenses: "11400",
            k1_ordinary_income: "-294564",
          },
          warnings: [],
        };
      },
    },
    "tax_return",
    walkName,
    "packet",
  );
  assert.ok(packetPhaseLedger >= 1, "phase=packet Groks page images with the locked ledger schema");
  assert.equal(packetPhase.fields.packet_read, "schedules");
  assert.equal(packetPhase.fields.wages, "520000");
  assert.equal(packetPhase.fields.schedule_e_rents_received, "42000");
  assert.notEqual(packetPhase.failed, true);

  assert.equal(
    classifyPageByFormHeader("Form 8879 IRS e-file Signature Authorization 2025 ALLAN COMBES"),
    "form_8879",
  );
  assert.notEqual(
    classifyPageByFormHeader("Form 8879 IRS e-file Signature Authorization — Form 1040"),
    "form_1040",
    "8879 is not a 1040",
  );
  assert.equal(
    classifyPageByFormHeader(
      "Form 1040 U.S. Individual Income Tax Return 1z Wages, salaries, tips 455,802.00",
    ),
    "form_1040",
  );
  assert.equal(
    classifyPageByFormHeader("Schedule E (Form 1040) 2025 Supplemental Income and Loss Part I"),
    "schedule_e",
  );

  const headerWalkPdf = multiPagePdf([
    [
      "Form 8879",
      "IRS e-file Signature Authorization",
      "2025",
      "ALLAN COMBES",
      "RENZ ARIANE COMBES",
    ],
    [
      "Form 1040",
      "U.S. Individual Income Tax Return",
      "2025",
      "Your first name and middle initial Allan",
      "Last name Combes",
      "Spouse Renz Ariane Combes",
      "1a Total amount from Form(s) W-2, box 1          455,802.00",
      "1b Household employee wages not reported on Form(s) W-2",
      "1z Wages, salaries, tips, etc. Add lines 1a through 1h          455,802.00",
    ],
    [
      "Schedule E (Form 1040) 2025",
      "Supplemental Income and Loss",
      "Part I Income or Loss From Rental Real Estate",
      "42000  3 Rents received",
      "11400  Cash expenses (ex-depreciation)",
    ],
  ]);
  const headerWalk = await classifyAndExtract(
    headerWalkPdf,
    "application/pdf",
    namesOnly,
    "tax_return",
    walkName,
  );
  assert.notEqual(headerWalk.failed, true);
  assert.equal(headerWalk.fields.wages, "455802", "wages live on the Form 1040 page, not the 8879 cover");
  assert.equal(headerWalk.fields.schedule_e_rents_received, "42000");
  assert.equal(headerWalk.fields.schedule_e_cash_expenses, "11400");
  const headerPacket = await classifyAndExtract(
    headerWalkPdf,
    "application/pdf",
    namesOnly,
    "tax_return",
    walkName,
    "packet",
  );
  assert.equal(headerPacket.fields.form_1040, "1");
  assert.equal(headerPacket.fields.wages, "455802");
  const headerAt = "2026-09-12T17:00:00.000Z";
  const headerCover = writeLive(
    wageQiDraft(),
    walkName,
    {
      tax_year: "2025",
      full_name: "ALLAN COMBES and RENZ ARIANE COMBES",
      wages: "455802",
      schedule_e_rents_received: "42000",
      schedule_e_cash_expenses: "11400",
    },
    headerAt,
  );
  assert.equal(headerCover.draft.pendingProposal?.field, "tax_year");
  const afterHeaderNames = resolveProposal(headerCover.draft, "accept");
  assert.equal(afterHeaderNames.facts?.qualifying_income?.value, "36453", "cover wages do not overwrite QI");
  assert.equal(isHouseholdWagesProposal(afterHeaderNames.pendingProposal), true);
  assert.equal(afterHeaderNames.pendingProposal?.value, "455802");
  const headerWagesAsk = nextFoxAsk(afterHeaderNames);
  assert.match(headerWagesAsk.text, /\$455,802/);
  assert.match(headerWagesAsk.text, /Use this/);
  assert.ok(
    (headerWagesAsk.actions ?? []).some((action) => /use this/i.test(action.label)),
    "wages card is Use this · Change, not finish chips",
  );
  assert.ok(!(headerWagesAsk.actions ?? []).some((action) => /proceed/i.test(action.label)));
  const afterHeaderWages = resolveProposal(afterHeaderNames, "accept");
  assert.equal(afterHeaderWages.facts?.[HOUSEHOLD_WAGES_FIELD]?.value, "455802");
  assert.equal(afterHeaderWages.facts?.qualifying_income?.value, "36453");
  assert.equal(afterHeaderWages.pendingProposal?.field, INCOME_LEDGER_FIELD);
  const headerEAsk = nextFoxAsk(afterHeaderWages);
  assert.match(headerEAsk.text, /Schedule E/i);
  assert.match(headerEAsk.text, /Use this/i);

  const only8879At = "2026-09-12T17:20:00.000Z";
  const only8879Cover = writeLive(
    wageQiDraft(),
    walkName,
    { tax_year: "2025", full_name: "ALLAN COMBES and RENZ ARIANE COMBES" },
    only8879At,
  );
  const only8879Written = resolveProposal(only8879Cover.draft, "accept");
  loadIntakeDraft(only8879Written);
  const only8879Packet = applyExtractWrite(only8879At, walkName, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { packet_read: "empty" },
  });
  assert.ok(
    !only8879Packet.quietLines.includes(PACKET_WAGES_UNREAD_LINE),
    "missing 1040 on page 1 is not a missing 1040 in the packet",
  );

  const extractSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "lib/docs/extract.ts"), "utf8");
  const routeSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "app/api/docs/extract/route.ts"), "utf8");
  const classifyAt = extractSrc.indexOf("async function classifyAndExtractUnmerged");
  assert.ok(classifyAt > 0);
  const grokFirstAt = extractSrc.indexOf("shouldGrokTaxReturnPagesFirst(hint, filename)", classifyAt);
  const printedAt = extractSrc.indexOf("printedLinesForExtract", classifyAt);
  assert.ok(
    grokFirstAt > classifyAt && printedAt > grokFirstAt,
    "1040-named packet Groks page images before printed pdf.js",
  );
  assert.match(extractSrc, /Castaneda page→image→Grok/);
  assert.doesNotMatch(extractSrc, /take\(1\)/);
  assert.doesNotMatch(extractSrc, /grokPage1HouseholdWages|PAGE1_HOUSEHOLD_WAGES_PROMPT/);
  assert.match(extractSrc, /classifyPageByFormHeader|classifyTaxReturnPages/);
  assert.match(extractSrc, /8879 is not a 1040/);
  assert.match(extractSrc, /phase === "packet"/);
  assert.match(extractSrc, /extractTaxReturnPacket|packet_read/);
  assert.match(extractSrc, /line 1z \(Wages, salaries, tips, etc\.\)/);
  assert.match(extractSrc, /Never line 1b household employee wages/);
  assert.match(extractSrc, /FORM_1040_HOUSEHOLD_WAGES_PROMPT|line 1z \(Wages, salaries, tips, etc\. Add lines 1a/);
  assert.match(extractSrc, /taxReturnPagesToGrok|schedule_e/);
  assert.match(extractSrc, /assignLedgerKeepFirst/);
  const fileWriteSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "components/fox/fileWrite.ts"),
    "utf8",
  );
  assert.doesNotMatch(fileWriteSrc, /wages on page 1/);
  assert.match(routeSrc, /maxDuration = 300/);
  assert.doesNotMatch(routeSrc, /maxDuration = 60/);

  const stubAt = "2026-09-12T12:00:00.000Z";
  const returnAt = "2026-09-12T12:05:00.000Z";
  loadIntakeDraft({
    ...wageQiDraft(),
    documents: [
      {
        slot: "paystubs",
        name: "Jan 2 2026 Alameda Health System Pay Stub.pdf",
        type: "application/pdf",
        size: 143369,
        receivedAt: stubAt,
        status: "extracted",
        extractClass: "paystub",
      },
      {
        slot: "other",
        name: "2025 1040 - Combes Allan and Renz.pdf",
        type: "application/pdf",
        size: 223455,
        receivedAt: returnAt,
        status: "received",
        extractClass: "tax_return",
      },
    ],
  });
  const unreadReturn = applyExtractWrite(returnAt, "2025 1040 - Combes Allan and Renz.pdf", {
    extractClass: "tax_return",
    confidence: 0.2,
    fields: {},
  });
  assert.ok(unreadReturn.quietLines.includes(FAILED_READ_NOTE));
  assert.equal(unreadReturn.draft.facts?.qualifying_income?.value, "36453");
  const docs = previewFacts(unreadReturn.draft).find((fact) => fact.id === "docs")?.value ?? "";
  assert.match(docs, /Paystubs in/);
  assert.match(docs, /Tax return/);
  assert.match(docs, /could not read/);
  assert.doesNotMatch(
    docs,
    /^Paystubs in · received · could not read$/,
    "unread line belongs to the return, not the written stub",
  );
  const stubDoc = unreadReturn.draft.documents.find((doc) => doc.slot === "paystubs");
  assert.equal(stubDoc?.status, "extracted");
  assert.ok(!/could not read/i.test(stubDoc?.note ?? ""));

  console.log(
    "assert-income-ledger: stub QI stays · form-header walk · 8879 is not a 1040 · household wages CFBW · Sch E / partnership own rows · loss does not net · cover wages held · gross not QI · no invented $2 · QI label stays stub · no fixture K-1 · packet page images → Grok · cover write then keep reading · unread is the return",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
