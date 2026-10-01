/**
 * Ticket 73 leftover. Reader map only. Writer after Use this.
 * Does not write File 38f1b63c. Does not rewrite walker case 72.
 * Printed lines only — do not invent a founder PDF or an Agfa fixture.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyPageByFormHeader } from "../lib/docs/formHeader";
import {
  extractClassFromReaderMap,
  fieldsOnReaderMap,
  paystubExtractOpens,
  readerBusinessLines,
  readerMapFromLook,
  readerMapFromPrintedLines,
  readerMapNeverOpensStub,
  readerWageLine,
} from "../lib/docs/readerMap";
import {
  applyExtractedFields,
  docsInDisplayLabels,
  federalReturnConfirmCopy,
  hasLockedSuggestion,
  looksLikePaystubFields,
} from "../components/fox/fileWrite";
import { proposalAskCopy, resolveProposal } from "../components/fox/completeness";
import { applyExtractWrite, emptyDraft, loadIntakeDraft, receiveDocument, startOverWorkspace } from "../components/fox/store";
import { loudWageFromPrintedLines } from "../lib/docs/printedSample";
import { classifyAndExtract } from "../lib/docs/extract";
import { FAILED_READ_NOTE, NO_TEXT_LAYER_NOTE, linePastReceivedStamp, receivedDropCopy } from "../lib/docs/accept";
import { docReactionAsk, nextFoxAsk, previewFacts, statusCopy, workspacePrompt } from "../components/fox/workspace";
import { waitingOnCopy } from "../components/fox/motion";
import { readerMapOpensReturnCard } from "../lib/docs/readerMap";
import { INCOME_BUBBLES } from "../components/fox/types";

const PERSONAL = [
  "Form 1040",
  "U.S. Individual Income Tax Return",
  "Sichiv Ho",
  "Vouch Eim Soy",
  "California wages $96,000",
  "Shareholder HO & SOY INC",
  "Agfa Monotype Corporation",
];

const RETURN_THREE = [
  "Form 1040",
  "U.S. Individual Income Tax Return",
  "2024",
  "Sichiv Ho",
  "Vouch Eim Soy",
  "Schedule C",
  "Vouch Eim Soy",
  "Schedule E Supplemental Income and Loss",
  "L&H VENTURES LLC",
  "partnership",
  "$60,343 passive",
  "Schedule K-1 (Form 1120-S)",
  "HO & SOY INC",
  "S corporation",
  "26,351",
  "26,351",
  "If you did not get a Form W-2, see instructions. Household employee wages not reported on Form(s) W-2  1g  $8,919",
];

/** IRS line shapes. Amounts sit on the income line, not on the next heading. */
const FORM_LAYER = [
  "Form 1040",
  "U.S. Individual Income Tax Return",
  "2024",
  "Sichiv Ho",
  "Vouch Eim Soy",
  "Schedule C (Form 1040)",
  "Profit or Loss From Business",
  "Department of the Treasury",
  "Internal Revenue Service",
  "Yes No",
  "Name of proprietor",
  "Vouch Eim Soy",
  "Schedule E (Form 1040)",
  "Supplemental Income and Loss",
  "Part II Income or Loss From Partnerships and S Corporations",
  "L&H VENTURES LLC",
  "P",
  "passive income 60,343",
  "Schedule K-1 (Form 1120-S)",
  "Shareholder's Share of Income",
  "HO & SOY INC",
  "S corporation",
  "Employer identification number 92-3033949",
  "1 Ordinary business income (loss) 26,351",
  "Schedule K-1 (Form 1120-S)",
  "HO & SOY INC",
  "1 Ordinary business income (loss) 26,351",
  "If you did not get a Form W-2, see instructions. Household employee wages not reported on Form(s) W-2  1g  $8,919",
];

/** Headings and nearby dollars. Not the income lines. Must not become a card. */
const SOUP_LAYER = [
  "Form 1040",
  "U.S. Individual Income Tax Return",
  "2024",
  "Department of the Treasury",
  "Internal Revenue Service",
  "VOUCH EIM SOY",
  "SICHIV HO",
  "Yes No",
  "Business income or (loss). Attach Schedule C",
  "Schedule C (Form 1040)",
  "Profit or Loss From Business",
  "Department of the Treasury",
  "Internal Revenue Service",
  "Yes No",
  "Schedule E (Form 1040)",
  "Supplemental Income and Loss",
  "L&H VENTURES LLC",
  "passive",
  "2,563,436",
  "Schedule K-1 (Form 1120-S)",
  "HO & SOY INC",
  "S corporation",
  "EIN 92-3033949",
  "3,033,949",
  "1,545",
  "8,867",
  "2,024",
  "1,040",
  "8,863",
  "wages $8,919",
];

/**
 * Printed rows from the packet. The income amount is on the entity row and on the
 * ordinary-income line. A header total and an EIN body are on the page and are not those lines.
 */
const ROW_LAYER = [
  "Form 1040",
  "U.S. Individual Income Tax Return",
  "2024",
  "Sichiv Ho",
  "Schedule C (Form 1040)",
  "Profit or Loss From Business",
  "Name of proprietor",
  "Vouch Eim Soy",
  "Schedule E (Form 1040)",
  "Supplemental Income and Loss",
  "Passive income 2,563,436",
  "L&H VENTURES LLC P 92-3033949 60,343",
  "Schedule K-1 (Form 1120-S)",
  "HO & SOY INC",
  "S corporation",
  "EIN 92-3033949",
  "3,033,949",
  "1 Ordinary business income (loss) 26,351",
  "Schedule K-1 (Form 1120-S)",
  "HO & SOY INC",
  "EIN 92-3033949",
  "1 Ordinary business income (loss)",
  "26,351",
];

/** The walked card: form titles joined with and, then the entity and a collapsed wage. */
const HEADING_AND_WAGE = [
  "Form 1040",
  "U.S. Individual Income Tax Return",
  "2024",
  "Filing Status",
  "Standard Deduction",
  "Digital Assets",
  "Social Security",
  "VOUCH EIM SOY",
  "SICHIV HO",
  "Yes No",
  "Internal Revenue Service",
  "Schedule C (Form 1040)",
  "Profit or Loss From Business",
  "Schedule E (Form 1040)",
  "Supplemental Income and Loss",
  "L&H VENTURES LLC",
  "passive",
  "2,563,436",
  "Schedule K-1 (Form 1120-S)",
  "HO & SOY INC",
  "S corporation",
  "EIN 92-3033949",
  "Wages, salaries, tips, etc. Attach Form(s) W-2 8,919",
];

/** Helvetica pages from the leftover lines. Not a founder PDF stand-in. */
function printedReturnPdf(linesOrPages: readonly string[] | readonly (readonly string[])[]) {
  const pages =
    linesOrPages.length > 0 && Array.isArray(linesOrPages[0])
      ? (linesOrPages as readonly (readonly string[])[])
      : [linesOrPages as readonly string[]];
  const streams = pages.map((lines) => {
    const commands = ["BT", "/F1 12 Tf", "72 720 Td"];
    for (const [index, line] of lines.entries()) {
      if (index) commands.push("0 -18 Td");
      commands.push(`(${line.replace(/[()\\]/g, "\\$&")}) Tj`);
    }
    commands.push("ET");
    return commands.join("\n");
  });
  const fontId = 3 + pages.length * 2;
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
  ];
  streams.forEach((stream, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });
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
  return new Uint8Array(Buffer.concat(chunks));
}

/** Same Grok look as live. Names-only + 1g. Not the three-business card. */
const garbledLook = {
  async read() {
    return {
      extractClass: "tax_return" as const,
      confidence: 0.94,
      fields: {
        tax_year: "2024",
        full_name: "SICHIY HO AND VOUCH EIM SOY",
        entity_name: "L&H VENTURES LLC",
        wages: "8919",
      },
      warnings: [],
      readerMap: {
        forms: ["1040" as const],
        names: ["SICHIY HO AND VOUCH EIM SOY"],
        entities: ["L&H VENTURES LLC"],
        lines: [{ kind: "wages", value: "8919", label: "If you did not g Wages from Form , line 6 … 1g" }],
        missing: [],
      },
    };
  },
  async classify() {
    return { class: "tax_return" as const, confidence: 0.94, readable: true };
  },
  async extract() {
    return {
      fields: {
        tax_year: "2024",
        full_name: "SICHIY HO AND VOUCH EIM SOY",
        wages: "8919",
      },
      warnings: [],
    };
  },
};

/** Names-only look. Does not open the card. The text layer has to. */
const namesOnlyLook = {
  async read() {
    return {
      extractClass: "tax_return" as const,
      confidence: 0.94,
      fields: {
        tax_year: "2024",
        full_name: "SICHIY HO AND VOUCH EIM SOY",
      },
      warnings: [],
      readerMap: {
        forms: ["1040" as const],
        names: ["SICHIY HO AND VOUCH EIM SOY"],
        entities: [] as string[],
        lines: [] as { kind: string; value: string; label?: string }[],
        missing: [],
      },
    };
  },
  async classify() {
    return { class: "tax_return" as const, confidence: 0.94, readable: true };
  },
  async extract() {
    return {
      fields: {
        tax_year: "2024",
        full_name: "SICHIY HO AND VOUCH EIM SOY",
      },
      warnings: [],
    };
  },
};

function looksRightDraft() {
  return {
    ...emptyDraft(),
    path: "acr" as const,
    productIntent: "buy" as const,
    workspaceFlow: true,
    sampleAccepted: true,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" as const, confirmed: true },
  };
}

async function main() {
  const map = readerMapFromPrintedLines(PERSONAL);
  assert.ok(map.forms.includes("1040"), `forms ${map.forms.join(",")}`);
  assert.ok(map.names.some((name) => /Sichiv Ho/i.test(name)), `names ${map.names.join(" · ")}`);
  assert.ok(map.names.some((name) => /Vouch Eim Soy/i.test(name)), `names ${map.names.join(" · ")}`);
  assert.ok(map.entities.some((name) => /HO\s*&\s*SOY INC/i.test(name)), `entities ${map.entities.join(" · ")}`);
  assert.ok(map.lines.some((line) => line.kind === "wages" && line.value === "96000"));
  assert.ok(map.missing.includes("employer"));
  assert.ok(map.missing.includes("pay_period"));
  assert.ok(map.missing.includes("period_gross"));
  assert.equal(readerMapNeverOpensStub(map), true);
  assert.equal(readerMapOpensReturnCard(map), true);
  assert.equal(extractClassFromReaderMap(map), "tax_return");
  assert.equal(loudWageFromPrintedLines(PERSONAL), null);
  assert.doesNotMatch(JSON.stringify(map), /Agfa|Monotype/i);

  const lookOnly = readerMapFromLook(
    {
      forms: ["1040"],
      names: ["Sichiv Ho"],
      entities: ["HO & SOY INC", "L&H VENTURES LLC"],
      lines: [
        { kind: "k1", value: "26351", label: "HO & SOY INC · S corp" },
        { kind: "k1", value: "26351", label: "HO & SOY INC · S corp" },
        { kind: "schedule_e", value: "60343", label: "L&H VENTURES LLC · partnership · passive" },
      ],
    },
    null,
  );
  assert.equal(
    readerBusinessLines(lookOnly).filter((line) => line.kind === "k1" && line.value === "26351").length,
    2,
    "look path without printed still keeps both K-1 lines",
  );
  assert.equal(
    readerBusinessLines(lookOnly).filter((line) => line.kind === "schedule_e" && line.value === "26351").length,
    0,
  );

  const formMap = readerMapFromPrintedLines(FORM_LAYER);
  const formBusinesses = readerBusinessLines(formMap);
  assert.equal(
    formBusinesses.filter((line) => line.kind === "schedule_c" && /Vouch Eim Soy/i.test(line.value)).length,
    1,
  );
  assert.equal(
    formBusinesses.filter((line) => line.kind === "schedule_c").length,
    1,
    `chrome is not a Schedule C — ${JSON.stringify(formBusinesses)}`,
  );
  assert.ok(
    formBusinesses.some((line) => line.kind === "schedule_e" && line.value === "60343" && /L&H VENTURES LLC/i.test(line.label ?? "")),
    `form layer schedule e ${JSON.stringify(formBusinesses)}`,
  );
  assert.equal(
    formBusinesses.filter((line) => line.kind === "k1" && line.value === "26351" && /HO\s*&\s*SOY INC/i.test(line.label ?? "")).length,
    2,
    `form layer keeps both ordinary K-1 lines ${JSON.stringify(formBusinesses)}`,
  );
  const rowMap = readerMapFromPrintedLines(ROW_LAYER);
  const rowBusinesses = readerBusinessLines(rowMap);
  assert.equal(
    rowBusinesses.filter((line) => line.kind === "schedule_c" && /Vouch Eim Soy/i.test(line.value)).length,
    1,
    `row schedule c ${JSON.stringify(rowBusinesses)}`,
  );
  assert.ok(
    rowBusinesses.some((line) => line.kind === "schedule_e" && line.value === "60343" && /L&H VENTURES LLC/i.test(line.label ?? "")),
    `row schedule e keeps the entity amount ${JSON.stringify(rowBusinesses)}`,
  );
  assert.equal(
    rowBusinesses.filter((line) => line.kind === "schedule_e" && line.value === "2563436").length,
    0,
    "a passive header total is not the Schedule E line",
  );
  assert.equal(
    rowBusinesses.filter((line) => line.kind === "k1" && line.value === "26351" && /HO\s*&\s*SOY INC/i.test(line.label ?? "")).length,
    2,
    `row keeps both ordinary K-1 lines ${JSON.stringify(rowBusinesses)}`,
  );
  assert.equal(
    rowBusinesses.filter((line) => line.value === "3033949").length,
    0,
    "an EIN body is not a K-1 line",
  );
  assert.equal(readerMapOpensReturnCard(rowMap), true);
  assert.equal(readerWageLine(formMap), null);
  assert.ok(!formMap.names.some((item) => /internal revenue|yes no/i.test(item)));
  assert.equal(readerMapOpensReturnCard(formMap), true);

  const soupMap = readerMapFromPrintedLines(SOUP_LAYER);
  const soupBusinesses = readerBusinessLines(soupMap);
  assert.equal(soupBusinesses.length, 0, `a heading soup is not a read — ${JSON.stringify(soupBusinesses)}`);
  assert.equal(readerWageLine(soupMap), null, "a bare wages line is not a wage to offer");
  assert.equal(readerMapOpensReturnCard(soupMap), false, "a soup must not keep Use this");
  assert.ok(!soupMap.names.some((item) => /internal revenue|yes no/i.test(item)));
  assert.doesNotMatch(JSON.stringify(soupMap), /2563436|3033949|8919|1545|8867|8863/);

  assert.equal(paystubExtractOpens({ employer_name: "Harbor Cafe" }), false);
  assert.equal(paystubExtractOpens({ employer_name: "Harbor Cafe", gross_period: "400" }), false);
  assert.equal(
    paystubExtractOpens({
      employer_name: "Harbor Cafe",
      pay_period_end: "2026-07-31",
      gross_period: "400",
    }),
    true,
  );
  assert.equal(
    paystubExtractOpens({
      employer_name: "Agfa Monotype Corporation",
      pay_period_end: "2026-07-31",
      gross_period: "400",
    }),
    false,
  );
  assert.equal(hasLockedSuggestion("paystub", { employer_name: "Harbor Cafe" }), false);
  assert.equal(looksLikePaystubFields({ employer_name: "Harbor Cafe", gross_period: "400" }), false);
  assert.equal(
    fieldsOnReaderMap(
      {
        employer_name: "Alameda Health System",
        pay_period_end: "08/15/2026",
        gross_period: "16824.30",
      },
      {
        forms: ["paystub"],
        names: ["ALAMEDA HEALTH SYSTEM"],
        entities: [],
        lines: [{ kind: "wages", value: "225.80", label: "Total Gross" }],
        missing: [],
      },
    ).gross_period,
    "16824.30",
    "stub period gross stays; a wages line is not the period",
  );

  assert.equal(classifyPageByFormHeader("Form 8879 IRS e-file Signature Authorization"), "form_8879");
  assert.equal(
    classifyPageByFormHeader("Form 540 California Resident Income Tax Return Sichiv Ho"),
    "form_540",
  );
  assert.equal(
    classifyPageByFormHeader("Form 7203 S Corporation Shareholder Stock and Debt Basis Limitations"),
    "form_7203",
  );
  assert.equal(
    classifyPageByFormHeader("Schedule K-1 (Form 1120-S) Shareholder's Share HO & SOY INC"),
    "k1",
  );
  for (const page of [
    ["Form 8879", "IRS e-file Signature Authorization", "Sichiv Ho"],
    ["Form 540", "California Resident Income Tax Return", "Sichiv Ho"],
    ["Form 7203", "S Corporation Shareholder Stock and Debt Basis Limitations"],
    ["Schedule K-1 (Form 1120-S)", "Shareholder's Share", "HO & SOY INC"],
  ]) {
    const next = readerMapFromPrintedLines(page);
    assert.equal(readerMapNeverOpensStub(next), true, `never stub ${page[0]}`);
    assert.notEqual(extractClassFromReaderMap(next), "paystub");
    assert.equal(loudWageFromPrintedLines(page), null);
  }

  const receivedAt = "2026-09-30T04:00:00.000Z";
  const name = "Sichiv Vouch 2024 personal.pdf";
  loadIntakeDraft({
    ...looksRightDraft(),
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: 12000,
        receivedAt,
        status: "received",
      },
    ],
  });
  const beforeUse = applyExtractWrite(receivedAt, name, {
    extractClass: "paystub",
    confidence: 0.9,
    fields: { employer_name: "Agfa Monotype Corporation", wages: "8919" },
    readerMap: map,
  });
  assert.equal(beforeUse.draft.facts?.employer_name, undefined);
  assert.equal(beforeUse.draft.facts?.wages, undefined, "invented wages do not write before Use this");
  assert.doesNotMatch(JSON.stringify(beforeUse.draft.pendingProposal ?? {}), /Agfa|Monotype|8,919|8919/i);
  assert.ok(
    !docsInDisplayLabels(beforeUse.draft).includes("Paystubs in"),
    `reader must not stamp Paystubs in — ${docsInDisplayLabels(beforeUse.draft).join(" · ")}`,
  );
  const liveCard = proposalAskCopy(beforeUse.draft.pendingProposal);
  assert.match(liveCard, /HO\s*&\s*SOY INC/i, `reader map must come back as a card — ${liveCard}`);
  assert.match(liveCard, /96,000/, `card must offer the on-page wage — ${liveCard}`);
  assert.doesNotMatch(liveCard, /8,919|8919/);
  assert.deepEqual(
    (nextFoxAsk(beforeUse.draft).actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  const payBefore = previewFacts(beforeUse.draft).find((fact) => fact.id === "pay" || fact.label === "Pay");
  assert.ok(
    !payBefore || !/8,919|8919/.test(payBefore.value),
    `pad must not write Pay · Wages $8,919 — ${payBefore?.value ?? "none"}`,
  );

  const skippedLive = resolveProposal(beforeUse.draft, "decline");
  assert.equal(skippedLive.facts?.wages, undefined);
  assert.equal(skippedLive.facts?.entity_name, undefined);
  assert.equal(skippedLive.facts?.tax_year, undefined);
  assert.ok(!docsInDisplayLabels(skippedLive).includes("Paystubs in"));
  assert.ok(!docsInDisplayLabels(skippedLive).includes("Tax return in"));

  const emptyFieldsMap = applyExtractedFields(looksRightDraft(), {
    extractClass: "w2",
    confidence: 0.5,
    fields: { wages: "8919" },
    readerMap: map,
  });
  assert.equal(emptyFieldsMap.draft.facts?.wages, undefined);
  const emptyMapCard = proposalAskCopy(emptyFieldsMap.draft.pendingProposal);
  assert.match(emptyMapCard, /HO\s*&\s*SOY INC/i, `map-only extract is still a card — ${emptyMapCard}`);
  assert.match(emptyMapCard, /96,000/);
  assert.doesNotMatch(emptyMapCard, /8,919|8919/);
  assert.deepEqual(
    (nextFoxAsk(emptyFieldsMap.draft).actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );

  const receivedOnly = {
    ...emptyDraft(),
    workspaceFlow: true,
    documents: [
      {
        slot: "other" as const,
        name,
        type: "application/pdf",
        size: 12000,
        receivedAt,
        status: "received" as const,
      },
    ],
  };
  assert.equal(workspacePrompt(receivedOnly), "intent", "received without extract is not the card");
  assert.doesNotMatch(nextFoxAsk(receivedOnly).text, /Schedule C under Vouch Eim Soy/i);
  assert.doesNotMatch(nextFoxAsk(receivedOnly).text, /HO\s*&\s*SOY/i);

  const rowExtract = await classifyAndExtract(
    printedReturnPdf(ROW_LAYER),
    "application/pdf",
    namesOnlyLook,
    null,
    name,
  );
  assert.notEqual(rowExtract.failed, true, "a row with the income lines is not a failed read");
  assert.ok(!(rowExtract.warnings ?? []).includes("unmapped-text"));
  assert.ok(!(rowExtract.warnings ?? []).includes("no-text-layer"));
  const rowExtracted = readerBusinessLines(rowExtract.readerMap);
  assert.ok(
    rowExtracted.some((line) => line.kind === "schedule_c" && /Vouch Eim Soy/i.test(line.value)),
    `extract row schedule c ${JSON.stringify(rowExtracted)}`,
  );
  assert.ok(
    rowExtracted.some((line) => line.kind === "schedule_e" && line.value === "60343" && /L&H VENTURES LLC/i.test(line.label ?? "")),
    `extract row schedule e ${JSON.stringify(rowExtracted)}`,
  );
  assert.equal(
    rowExtracted.filter((line) => line.kind === "k1" && line.value === "26351").length,
    2,
    `extract row keeps both K-1 lines ${JSON.stringify(rowExtracted)}`,
  );
  assert.equal(rowExtracted.some((line) => line.value === "2563436" || line.value === "3033949"), false);
  const rowAt = "2026-09-30T04:09:00.000Z";
  loadIntakeDraft({
    ...emptyDraft(),
    workspaceFlow: true,
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: 1200,
        receivedAt: rowAt,
        status: "received",
      },
    ],
  });
  const rowWrite = applyExtractWrite(
    rowAt,
    name,
    {
      extractClass: rowExtract.extractClass,
      confidence: rowExtract.confidence,
      fields: rowExtract.fields,
      readerMap: rowExtract.readerMap,
    },
    undefined,
    false,
  );
  const rowAsk = rowWrite.draft.pendingProposal ? proposalAskCopy(rowWrite.draft.pendingProposal) : "";
  assert.match(rowAsk, /Schedule C under Vouch Eim Soy/i);
  assert.match(rowAsk, /L&H VENTURES LLC/);
  assert.match(rowAsk, /60,343/);
  assert.match(rowAsk, /HO\s*&\s*SOY INC/);
  assert.match(rowAsk, /26,351/);
  assert.doesNotMatch(rowAsk, /2,563,436|3,033,949/);
  assert.match(rowAsk, /Use this/);
  assert.ok(!rowWrite.draft.incomeType.value);

  const blankPdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  const blankLook = {
    async read() {
      return {
        extractClass: "other" as const,
        confidence: 0.2,
        fields: {
          tax_year: "2024",
          full_name: "SICHIY HO AND VOUCH EIM SOY",
        },
        warnings: ["failed"],
        failed: true,
        readerMap: {
          forms: ["1040" as const],
          names: ["SICHIY HO AND VOUCH EIM SOY"],
          entities: [] as string[],
          lines: [] as { kind: string; value: string; label?: string }[],
          missing: [],
        },
      };
    },
    async classify() {
      return { class: "other" as const, confidence: 0.2, readable: true };
    },
    async extract() {
      return { fields: {}, warnings: ["failed"] };
    },
  };
  const blankExtract = await classifyAndExtract(
    blankPdf,
    "application/pdf",
    blankLook,
    null,
    "blank.pdf",
  );
  assert.equal(
    readerMapOpensReturnCard(blankExtract.readerMap),
    false,
    "a names-only look on a blank PDF must not invent the three-business card",
  );
  assert.equal(
    readerBusinessLines(blankExtract.readerMap).filter((line) => line.kind === "schedule_c" && /Vouch Eim Soy/i.test(line.value)).length,
    0,
  );
  assert.equal(
    readerBusinessLines(blankExtract.readerMap).filter((line) => line.kind === "schedule_e" && line.value === "60343").length,
    0,
  );
  assert.equal(
    readerBusinessLines(blankExtract.readerMap).filter((line) => line.kind === "k1" && line.value === "26351").length,
    0,
    "blank look must not hand both K-1 lines",
  );

  const dropped = printedReturnPdf(RETURN_THREE);
  assert.equal(
    readerMapOpensReturnCard(readerMapFromLook({
      forms: ["1040"],
      names: ["SICHIY HO AND VOUCH EIM SOY"],
      entities: [],
      lines: [],
    })),
    false,
    "names-only look does not open the card",
  );
  const extracted = await classifyAndExtract(
    dropped,
    "application/pdf",
    namesOnlyLook,
    null,
    name,
  );
  assert.notEqual(extracted.failed, true, "a real return drop is not unread");
  assert.equal(extracted.extractClass, "tax_return");
  assert.equal(readerMapOpensReturnCard(extracted.readerMap), true, "extract must open the card from the page");
  const extractedBusinesses = readerBusinessLines(extracted.readerMap);
  assert.ok(
    extractedBusinesses.some((line) => line.kind === "schedule_c" && /Vouch Eim Soy/i.test(line.value)),
    `extract schedule c ${JSON.stringify(extractedBusinesses)}`,
  );
  assert.ok(
    extractedBusinesses.some((line) => line.kind === "schedule_e" && line.value === "60343" && /L&H VENTURES LLC/i.test(line.label ?? "")),
    `extract schedule e ${JSON.stringify(extractedBusinesses)}`,
  );
  assert.equal(
    extractedBusinesses.filter((line) => line.kind === "k1" && line.value === "26351" && /HO\s*&\s*SOY INC/i.test(line.label ?? "")).length,
    2,
    `extract keeps both K-1 lines ${JSON.stringify(extractedBusinesses)}`,
  );
  const thinFace = [
    "Form 1040",
    "U.S. Individual Income Tax Return",
    "2024",
    "Electronic filing cover sheet only",
  ];
  const laterPacket = printedReturnPdf([thinFace, thinFace, thinFace, RETURN_THREE]);
  const later = await classifyAndExtract(laterPacket, "application/pdf", namesOnlyLook, null, name);
  assert.notEqual(later.failed, true, "schedules past the first three pages are still the pdf.js card");
  assert.equal(readerMapOpensReturnCard(later.readerMap), true);
  const laterBusinesses = readerBusinessLines(later.readerMap);
  assert.ok(
    laterBusinesses.some((line) => line.kind === "schedule_c" && /Vouch Eim Soy/i.test(line.value)),
    `later page schedule c ${JSON.stringify(laterBusinesses)}`,
  );
  assert.ok(
    laterBusinesses.some((line) => line.kind === "schedule_e" && line.value === "60343" && /L&H VENTURES LLC/i.test(line.label ?? "")),
    `later page schedule e ${JSON.stringify(laterBusinesses)}`,
  );
  assert.equal(
    laterBusinesses.filter((line) => line.kind === "k1" && line.value === "26351" && /HO\s*&\s*SOY INC/i.test(line.label ?? "")).length,
    2,
    `later page keeps both K-1 lines ${JSON.stringify(laterBusinesses)}`,
  );
  const laterAt = "2026-09-30T04:05:00.000Z";
  loadIntakeDraft({
    ...emptyDraft(),
    workspaceFlow: true,
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: laterPacket.byteLength,
        receivedAt: laterAt,
        status: "received",
      },
    ],
  });
  const laterGuest = applyExtractWrite(laterAt, name, {
    extractClass: later.extractClass,
    confidence: later.confidence,
    fields: later.fields,
    readerMap: later.readerMap,
  });
  assert.ok(!laterGuest.draft.path, "guest /start has no path yet");
  assert.equal(workspacePrompt(laterGuest.draft), "confirm-proposal");
  assert.notEqual(laterGuest.draft.incomeType.value, "both");
  assert.ok(!laterGuest.draft.incomeType.value, "Income stays empty until the borrower chooses");
  const laterAsk = nextFoxAsk(laterGuest.draft);
  assert.doesNotMatch(laterAsk.text, /received/i, "a later-page return drop is the card, not a received line");
  assert.match(laterAsk.text, /Schedule C under Vouch Eim Soy/i);
  assert.match(laterAsk.text, /L&H VENTURES LLC/i);
  assert.match(laterAsk.text, /60,343/);
  assert.match(laterAsk.text, /HO\s*&\s*SOY INC/i);
  assert.match(laterAsk.text, /26,351/);
  assert.deepEqual(
    (laterAsk.actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  const laterPad = previewFacts(laterGuest.draft);
  assert.ok(!laterPad.some((fact) => fact.id === "income" || fact.label === "Income"));
  startOverWorkspace("acr");
  const acrAt = "2026-09-30T04:05:30.000Z";
  receiveDocument({
    slot: "other",
    name,
    type: "application/pdf",
    size: laterPacket.byteLength,
    receivedAt: acrAt,
  });
  const acrGuest = applyExtractWrite(acrAt, name, {
    extractClass: later.extractClass,
    confidence: later.confidence,
    fields: later.fields,
    readerMap: later.readerMap,
  });
  const acrAsk = docReactionAsk(acrGuest.draft, "tax_return") ?? nextFoxAsk(acrGuest.draft);
  const acrLine = linePastReceivedStamp({
    lastRole: "system",
    lastText: receivedDropCopy(name),
    receivedName: name,
    cardText: acrAsk.text,
  });
  assert.ok(acrLine, "Start over must not leave the received stamp as the last line");
  assert.doesNotMatch(acrLine ?? "", /· received/i);
  assert.match(acrLine ?? "", /Schedule C under Vouch Eim Soy/i);
  assert.match(acrLine ?? "", /L&H VENTURES LLC/i);
  assert.match(acrLine ?? "", /60,343/);
  assert.match(acrLine ?? "", /HO\s*&\s*SOY INC/i);
  assert.match(acrLine ?? "", /26,351/);
  assert.notEqual(acrGuest.draft.incomeType.value, "both");
  assert.ok(!acrGuest.draft.incomeType.value);
  assert.equal(statusCopy(acrGuest.draft), "needs_you");
  assert.equal(waitingOnCopy(acrGuest.draft), "borrower");
  const thinPacket = printedReturnPdf([thinFace, thinFace, thinFace]);
  const thinNamed = await classifyAndExtract(thinPacket, "application/pdf", namesOnlyLook, null, "thin-face.pdf");
  const thinNamedBusinesses = readerBusinessLines(thinNamed.readerMap);
  assert.equal(thinNamedBusinesses.filter((line) => line.kind === "schedule_c").length, 0);
  assert.equal(
    thinNamedBusinesses.filter((line) => line.kind === "schedule_e" && line.value === "60343").length,
    0,
  );
  assert.equal(thinNamedBusinesses.filter((line) => line.kind === "k1" && line.value === "26351").length, 0);
  const emptyLook = {
    async read() {
      return {
        extractClass: "other" as const,
        confidence: 0.2,
        fields: {},
        warnings: ["failed"],
        failed: true,
      };
    },
    async classify() {
      return { class: "other" as const, confidence: 0.2, readable: false };
    },
    async extract() {
      return { fields: {}, warnings: ["failed"] };
    },
  };
  const thin = await classifyAndExtract(thinPacket, "application/pdf", emptyLook, null, "thin-face.pdf");
  assert.equal(thin.failed, true, "a short text layer with no lock is not a return card");
  assert.ok((thin.warnings ?? []).includes("unmapped-text"), "text that did not map is not an empty layer");
  assert.ok(!(thin.warnings ?? []).includes("no-text-layer"));
  assert.equal(readerMapOpensReturnCard(thin.readerMap), false);
  const thinBusinesses = readerBusinessLines(thin.readerMap);
  assert.equal(thinBusinesses.filter((line) => line.kind === "schedule_c").length, 0);
  assert.equal(thinBusinesses.filter((line) => line.kind === "schedule_e" && line.value === "60343").length, 0);
  assert.equal(thinBusinesses.filter((line) => line.kind === "k1" && line.value === "26351").length, 0);
  const unreadFace = await classifyAndExtract(thinPacket, "application/pdf", namesOnlyLook, null, name);
  assert.equal(unreadFace.failed, true, "a personal.pdf layer without the schedule lines is not a names-only card");
  assert.ok((unreadFace.warnings ?? []).includes("unmapped-text"));
  assert.ok(!(unreadFace.warnings ?? []).includes("no-text-layer"));
  assert.equal(readerMapOpensReturnCard(unreadFace.readerMap), false);
  const unreadAt = "2026-09-30T04:06:00.000Z";
  loadIntakeDraft({
    ...emptyDraft(),
    workspaceFlow: true,
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: thinPacket.byteLength,
        receivedAt: unreadAt,
        status: "received",
      },
    ],
  });
  const unreadWrite = applyExtractWrite(
    unreadAt,
    name,
    {
      extractClass: unreadFace.extractClass,
      confidence: unreadFace.confidence,
      fields: unreadFace.fields,
      readerMap: unreadFace.readerMap,
    },
    FAILED_READ_NOTE,
    true,
  );
  assert.ok(!unreadWrite.draft.pendingProposal, "layer failure must not leave a names-only Use this");
  assert.ok(unreadWrite.quietLines.includes(FAILED_READ_NOTE));
  assert.equal(
    unreadWrite.quietLines.filter((line) => line === FAILED_READ_NOTE).length,
    1,
    "the failed read is one line",
  );
  assert.ok(!unreadWrite.quietLines.includes(NO_TEXT_LAYER_NOTE));
  assert.ok(!unreadWrite.draft.incomeType.value);
  const unreadLine = unreadWrite.quietLines.find((line) => line === FAILED_READ_NOTE) ?? "";
  assert.equal(unreadLine, FAILED_READ_NOTE, "text without the income lines is a failed read");
  assert.doesNotMatch(unreadLine, /no text layer/i);
  const soupPacket = printedReturnPdf(SOUP_LAYER);
  const soupExtract = await classifyAndExtract(soupPacket, "application/pdf", namesOnlyLook, null, name);
  assert.equal(soupExtract.failed, true, "a names-and-numbers soup is not a return card");
  assert.ok((soupExtract.warnings ?? []).includes("unmapped-text"));
  assert.ok(!(soupExtract.warnings ?? []).includes("no-text-layer"));
  assert.equal(readerMapOpensReturnCard(soupExtract.readerMap), false);
  assert.equal(readerBusinessLines(soupExtract.readerMap).length, 0);
  const soupAt = "2026-09-30T04:07:00.000Z";
  loadIntakeDraft({
    ...emptyDraft(),
    workspaceFlow: true,
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: soupPacket.byteLength,
        receivedAt: soupAt,
        status: "received",
      },
    ],
  });
  const soupWrite = applyExtractWrite(
    soupAt,
    name,
    {
      extractClass: soupExtract.extractClass,
      confidence: soupExtract.confidence,
      fields: soupExtract.fields,
      readerMap: soupExtract.readerMap,
    },
    FAILED_READ_NOTE,
    true,
  );
  assert.ok(!soupWrite.draft.pendingProposal, "a soup must not keep Use this");
  assert.ok(soupWrite.quietLines.includes(FAILED_READ_NOTE));
  assert.ok(!soupWrite.quietLines.includes(NO_TEXT_LAYER_NOTE));
  const soupLine = soupWrite.quietLines.find((line) => line === FAILED_READ_NOTE) ?? "";
  assert.equal(soupLine, FAILED_READ_NOTE, "a soup with text is a failed read");
  assert.doesNotMatch(
    soupWrite.draft.pendingProposal ? proposalAskCopy(soupWrite.draft.pendingProposal) : soupLine ?? "",
    /2,563,436|3,033,949|8,919|Internal Revenue|Yes No/,
  );
  const headingMap = readerMapFromPrintedLines(HEADING_AND_WAGE);
  assert.ok(!headingMap.names.some((item) => /filing status|standard deduction|digital assets|social security|internal revenue|yes no/i.test(item)));
  assert.equal(readerWageLine(headingMap), null, "a collapsed wages label is not a wage to offer");
  assert.equal(readerBusinessLines(headingMap).length, 0);
  assert.equal(readerMapOpensReturnCard(headingMap), false, "entity plus wages must not open Use this");
  const headingAsked = applyExtractedFields(emptyDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2024",
      full_name: "Filing Status and Standard Deduction",
      entity_name: "L&H VENTURES LLC",
      wages: "8919",
      wage_line_label: "wages",
    },
    readerMap: headingMap,
  });
  assert.ok(!headingAsked.draft.pendingProposal, "a heading soup must not keep Use this");
  const headingPacket = printedReturnPdf(HEADING_AND_WAGE);
  const headingExtract = await classifyAndExtract(
    headingPacket,
    "application/pdf",
    namesOnlyLook,
    null,
    name,
  );
  assert.equal(headingExtract.failed, true, "form titles and a wage are not the return card");
  assert.ok((headingExtract.warnings ?? []).includes("unmapped-text"));
  assert.ok(!(headingExtract.warnings ?? []).includes("no-text-layer"));
  assert.equal(readerMapOpensReturnCard(headingExtract.readerMap), false);
  const headingAt = "2026-09-30T04:08:00.000Z";
  loadIntakeDraft({
    ...emptyDraft(),
    workspaceFlow: true,
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: headingPacket.byteLength,
        receivedAt: headingAt,
        status: "received",
      },
    ],
  });
  const headingWrite = applyExtractWrite(
    headingAt,
    name,
    {
      extractClass: headingExtract.extractClass,
      confidence: headingExtract.confidence,
      fields: headingExtract.fields,
      readerMap: headingExtract.readerMap,
    },
    FAILED_READ_NOTE,
    true,
  );
  assert.ok(!headingWrite.draft.pendingProposal);
  assert.ok(headingWrite.quietLines.includes(FAILED_READ_NOTE));
  assert.equal(headingWrite.quietLines.filter((line) => line === FAILED_READ_NOTE).length, 1);
  assert.ok(!headingWrite.quietLines.includes(NO_TEXT_LAYER_NOTE));
  const headingLine = headingWrite.quietLines.find((line) => line === FAILED_READ_NOTE) ?? "";
  assert.equal(headingLine, FAILED_READ_NOTE);
  assert.doesNotMatch(headingLine, /no text layer|8,919|L&H VENTURES|Use this|Filing Status/);
  assert.doesNotMatch(
    unreadWrite.draft.pendingProposal ? proposalAskCopy(unreadWrite.draft.pendingProposal) : "",
    /Schedule C under Vouch Eim Soy|60,343|26,351/,
  );
  const three = extracted.readerMap;
  assert.ok(three?.forms.includes("1040"));
  assert.ok(three?.forms.includes("schedule_c"));
  assert.ok(three?.forms.includes("schedule_e"));
  assert.ok(three?.forms.includes("k1"));
  assert.ok(three?.names.some((name) => /Sichiv Ho/i.test(name)));
  assert.doesNotMatch((three?.names ?? []).join(" "), /SICHIY/i);
  assert.ok(three?.entities.some((name) => /L&H VENTURES LLC/i.test(name)));
  assert.ok(three?.entities.some((name) => /HO\s*&\s*SOY INC/i.test(name)));
  assert.equal(readerWageLine(three), null, "1g household employee wages are not a wage to offer");
  assert.ok(!three?.lines.some((line) => line.kind === "wages" && line.value === "8919"));
  const garbled = readerMapFromLook(
    {
      forms: ["1040"],
      names: ["SICHIY HO AND VOUCH EIM SOY"],
      entities: ["L&H VENTURES LLC"],
      lines: [
        { kind: "wages", value: "8919", label: "If you did not g Wages from Form , line 6 … 1g" },
      ],
    },
    RETURN_THREE,
  );
  assert.ok(garbled.names.some((name) => /Sichiv Ho/i.test(name)));
  assert.doesNotMatch(garbled.names.join(" "), /SICHIY/i);
  assert.ok(garbled.entities.some((name) => /HO\s*&\s*SOY INC/i.test(name)));
  assert.equal(readerWageLine(garbled), null);
  assert.equal(readerMapOpensReturnCard(garbled), true);
  const lookBusinesses = readerBusinessLines(garbled);
  assert.equal(
    lookBusinesses.filter((line) => line.kind === "k1" && line.value === "26351" && /HO\s*&\s*SOY INC/i.test(line.label ?? "")).length,
    2,
    `look path keeps both K-1 lines ${JSON.stringify(lookBusinesses)}`,
  );
  assert.equal(
    lookBusinesses.filter((line) => line.kind === "schedule_e" && line.value === "26351").length,
    0,
    `look path does not speak a K-1 dollar as Schedule E ${JSON.stringify(lookBusinesses)}`,
  );
  assert.ok(
    lookBusinesses.some((line) => line.kind === "schedule_e" && line.value === "60343" && /L&H VENTURES LLC/i.test(line.label ?? "")),
    `look path Schedule E stays the on-page L&H line ${JSON.stringify(lookBusinesses)}`,
  );
  loadIntakeDraft({
    ...emptyDraft(),
    workspaceFlow: true,
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: dropped.byteLength,
        receivedAt,
        status: "received",
      },
    ],
  });
  const guestStart = applyExtractWrite(receivedAt, name, {
    extractClass: extracted.extractClass,
    confidence: extracted.confidence,
    fields: extracted.fields,
    readerMap: extracted.readerMap,
  });
  assert.ok(!guestStart.draft.path, "guest /start has no path yet");
  assert.equal(workspacePrompt(guestStart.draft), "confirm-proposal", "a received line is not the write — the pending card is");
  assert.notEqual(guestStart.draft.incomeType.value, "both", "a drop must not set Income to Both");
  assert.ok(!guestStart.draft.incomeType.value, "Income stays empty until the borrower chooses");
  const guestAsk = nextFoxAsk(guestStart.draft);
  const guestChips = (guestAsk.actions ?? []).map((item) => item.label);
  assert.deepEqual(guestChips, ["Use this", "Change"], `guest /start first drop is still a card — ${guestAsk.text}`);
  assert.ok(!guestChips.includes("Not now"));
  assert.doesNotMatch(guestAsk.text, /received/i);
  assert.match(guestAsk.text, /Sichiv Ho/i);
  assert.doesNotMatch(guestAsk.text, /SICHIY/i);
  assert.match(guestAsk.text, /Schedule C under Vouch Eim Soy/i);
  assert.match(guestAsk.text, /L&H VENTURES LLC/i);
  assert.match(guestAsk.text, /60,343/);
  assert.match(guestAsk.text, /HO\s*&\s*SOY INC/i);
  assert.match(guestAsk.text, /26,351/);
  assert.doesNotMatch(guestAsk.text, /8,919|8919/);
  const guestPad = previewFacts(guestStart.draft);
  assert.ok(!guestPad.some((fact) => fact.id === "income" || fact.label === "Income"));
  assert.ok(
    !guestPad.some((fact) => /L&H|HO\s*&\s*SOY|Sichiv|8,919|8919|60,343|26,351/i.test(`${fact.label} ${fact.value}`)),
    `pad stays empty of the return — ${JSON.stringify(guestPad)}`,
  );
  const guestSkip = resolveProposal(guestStart.draft, "decline");
  assert.ok(!guestSkip.incomeType.value);
  assert.equal(guestSkip.facts?.wages, undefined);
  assert.equal(guestSkip.facts?.entity_name, undefined);
  assert.ok(INCOME_BUBBLES.some((item) => item.value === "both" && item.label === "Both"));
  loadIntakeDraft({
    ...guestStart.draft,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "both" },
  });
  const wiped = startOverWorkspace("acr");
  assert.ok(!wiped.incomeType.value, "Start over still clears income");

  loadIntakeDraft({
    ...emptyDraft(),
    workspaceFlow: true,
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: dropped.byteLength,
        receivedAt,
        status: "received",
      },
    ],
  });
  const lookWrite = applyExtractWrite(receivedAt, name, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2024",
      full_name: "SICHIY HO AND VOUCH EIM SOY",
      entity_name: "L&H VENTURES LLC",
      wages: "8919",
    },
    readerMap: garbled,
  });
  assert.notEqual(lookWrite.draft.incomeType.value, "both", "look path must not set Income to Both");
  assert.ok(!lookWrite.draft.incomeType.value, "Income stays empty until the borrower chooses");
  const lookCard = proposalAskCopy(lookWrite.draft.pendingProposal);
  assert.match(lookCard, /Sichiv Ho/i);
  assert.doesNotMatch(lookCard, /SICHIY/i);
  assert.match(lookCard, /Schedule C under Vouch Eim Soy/i);
  assert.match(lookCard, /L&H VENTURES LLC/i);
  assert.match(lookCard, /60,343/);
  assert.match(lookCard, /HO\s*&\s*SOY INC/i);
  assert.match(lookCard, /26,351/);
  assert.doesNotMatch(lookCard, /8,919|8919/);

  const threeSkip = resolveProposal(lookWrite.draft, "decline");
  assert.equal(threeSkip.facts?.wages, undefined);
  assert.equal(threeSkip.facts?.entity_name, undefined);
  assert.ok(!docsInDisplayLabels(threeSkip).includes("Paystubs in"));

  const inventedOnly = applyExtractedFields(looksRightDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { wages: "8919", form_1040: "1" },
  });
  assert.equal(inventedOnly.draft.facts?.wages, undefined, "a wage without a reader line does not write");
  const inventedCopy = inventedOnly.draft.pendingProposal
    ? proposalAskCopy(inventedOnly.draft.pendingProposal)
    : "";
  assert.doesNotMatch(inventedCopy, /8,919|8919|96,000/);

  const namesOnly = applyExtractedFields(looksRightDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { tax_year: "2024", full_name: "Sichiv Ho and Vouch Eim Soy" },
  });
  const namesOnlyCopy = proposalAskCopy(namesOnly.draft.pendingProposal);
  assert.match(namesOnlyCopy, /2024 return/i);
  assert.doesNotMatch(namesOnlyCopy, /96,000|96000|HO\s*&\s*SOY/i, "names-only extract does not invent a wage or entity");

  const proposed = applyExtractedFields(looksRightDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2024",
      full_name: "Sichiv Ho and Vouch Eim Soy",
      employer_name: "Agfa Monotype Corporation",
    },
    readerMap: map,
  });
  assert.equal(proposed.draft.facts?.employer_name, undefined);
  assert.equal(proposed.draft.facts?.tax_year, undefined);
  assert.equal(proposed.draft.facts?.entity_name, undefined, "entity stays off File until Use this");
  assert.equal(proposed.draft.facts?.wages, undefined, "wage stays off File until Use this");
  assert.doesNotMatch(JSON.stringify(proposed.draft.pendingProposal ?? {}), /Agfa|Monotype/i);
  const card = proposalAskCopy(proposed.draft.pendingProposal);
  assert.match(card, /2024 return/i);
  assert.match(card, /Sichiv Ho/i);
  assert.match(card, /Vouch Eim Soy/i);
  assert.match(card, /HO\s*&\s*SOY INC/i, `card must name the entity — ${card}`);
  assert.match(card, /96,000/, `card must offer the on-page wage — ${card}`);
  assert.doesNotMatch(card, /Agfa|Monotype/i);
  assert.notEqual(federalReturnConfirmCopy({ tax_year: "2024", full_name: "Sichiv Ho and Vouch Eim Soy" }).includes("96,000"), true);
  const ask = nextFoxAsk(proposed.draft);
  assert.deepEqual(
    (ask.actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  const skipped = resolveProposal(proposed.draft, "decline");
  assert.equal(skipped.facts?.tax_year, undefined);
  assert.equal(skipped.facts?.employer_name, undefined);
  assert.equal(skipped.facts?.entity_name, undefined);
  assert.equal(skipped.facts?.wages, undefined);
  assert.ok(!docsInDisplayLabels(skipped).includes("Paystubs in"));

  const used = resolveProposal(proposed.draft, "accept");
  assert.doesNotMatch(JSON.stringify(used.facts ?? {}), /Agfa|Monotype/i);
  assert.match(String(used.facts?.entity_name?.value ?? ""), /HO\s*&\s*SOY INC/i);
  assert.equal(used.facts?.wages?.value, "96000");
  assert.ok(!docsInDisplayLabels(used).includes("Paystubs in"), "personal return is not Paystubs in");

  const alwaysOnSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "components/fox/AlwaysOnFox.tsx"),
    "utf8",
  );
  assert.match(alwaysOnSrc, /receivedDropCopy/);
  assert.match(alwaysOnSrc, /paintPastReceived\(/);
  assert.match(alwaysOnSrc, /withoutTrailingFoxReprint/);
  assert.match(alwaysOnSrc, /paintPastReceived\(\s*alignThreadEmployerName/);
  assert.match(alwaysOnSrc, /if \(detail\.received\)/);
  assert.match(
    alwaysOnSrc,
    /if \(!detail\.extractClass && !detail\.emptyRead && !\(detail\.quietLines \?\? \[\]\)\.length\) \{\s*return next;/,
    "received-only without extract still waits",
  );
  assert.doesNotMatch(
    alwaysOnSrc,
    /if \(detail\.received\) \{[\s\S]{0,500}pendingProposal && shouldSpeakPendingConfirm/,
    "received must not speak a card that was already pending",
  );
  assert.match(
    alwaysOnSrc,
    /pendingProposal && shouldSpeakPendingConfirm/,
    "extract on the same intake still speaks the confirm card",
  );
  assert.match(
    alwaysOnSrc,
    /if \(detail\.emptyRead\) \{[\s\S]{0,500}isUnreadNote\(line\)/,
    "a failed layer speaks the unread note after received",
  );
  assert.match(
    alwaysOnSrc,
    /if \(detail\.emptyRead && isUnreadNote\(line\)\) continue;/,
    "the unread note is the fox line once, not also a system line",
  );
  const dropSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "components/fox/DocumentDrop.tsx"),
    "utf8",
  );
  assert.match(
    dropSrc,
    /applyExtractWrite[\s\S]{0,900}emitDocIntake\(\{[\s\S]{0,80}received: emptyRead,\s*extractClass: applied\.extractClass/,
    "the drop emits received with the extract write",
  );
  assert.doesNotMatch(
    dropSrc,
    /emitDocIntake\(\{ received: emptyRead \}\);\s*try \{/,
    "do not emit received before extract returns",
  );
  const workspaceSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "components/fox/workspace.ts"),
    "utf8",
  );
  assert.match(workspaceSrc, /if \(!draft\.path\)/);
  assert.match(
    workspaceSrc,
    /pendingProposal && shouldSpeakPendingConfirm\(draft\)\) return "confirm-proposal"/,
    "guest /start without a path still speaks the pending card",
  );

  const extractSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "lib/docs/extract.ts"), "utf8");
  assert.match(extractSrc, /Same Grok look/);
  assert.match(extractSrc, /async read\(/);
  assert.match(extractSrc, /if \(adapter\.read\)/);
  assert.match(extractSrc, /readerMapOpensReturnCard/);
  assert.match(extractSrc, /printedLooksLikePersonal1040\(walked\)/);
  assert.match(extractSrc, /readReturnTextLayer/);
  assert.match(extractSrc, /pdf\.js glyphs first/);
  const classifyExportAt = extractSrc.indexOf("export async function classifyAndExtract");
  assert.ok(classifyExportAt > 0);
  assert.ok(
    extractSrc.indexOf("readReturnTextLayer", classifyExportAt) > classifyExportAt,
    "the return card layer is a pdf.js read, not a scrape then a null",
  );
  assert.doesNotMatch(
    extractSrc.slice(classifyExportAt),
    /printedLinesForExtract/,
    "classifyAndExtract must not scrape first then null a 1040",
  );
  assert.doesNotMatch(
    extractSrc,
    /else if \(printedLooksLikePersonal1040\(layer\) \|\| printedLooksLikeNeverStubForm\(layer\)\) \{\s*layer = null;/,
    "trying pdf.js after the scrape is not a read of the packet",
  );
  assert.match(extractSrc, /keepReaderReturnCard/);
  assert.match(extractSrc, /household employee/);
  assert.doesNotMatch(extractSrc, /hold the class until Use this/);
  assert.doesNotMatch(extractSrc, /Sichiv/);
  assert.doesNotMatch(extractSrc, /L&H VENTURES/);
  assert.doesNotMatch(extractSrc, /SICHIY/);
  const fileWriteSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "components/fox/fileWrite.ts"),
    "utf8",
  );
  assert.doesNotMatch(fileWriteSrc, /HO & SOY INC/, "entity is not a hardcoded card");
  assert.doesNotMatch(fileWriteSrc, /Sichiv Ho/, "names are not a hardcoded card");
  assert.doesNotMatch(fileWriteSrc, /L&H VENTURES/, "L&H is not a hardcoded card");
  assert.doesNotMatch(fileWriteSrc, /96,000/, "wage is not a hardcoded card");
  assert.doesNotMatch(fileWriteSrc, /60,343/, "Schedule E dollar is not a hardcoded card");
  assert.doesNotMatch(fileWriteSrc, /26,351/, "K-1 dollar is not a hardcoded card");
  assert.doesNotMatch(fileWriteSrc, /SICHIY/);

  const walker72 = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "assert-walker-case-72.ts"),
    "utf8",
  );
  assert.match(walker72, /W-2 in · ID in/);
  const leftoverSrc = readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.match(leftoverSrc, /classifyAndExtract/);
  assert.match(leftoverSrc, /printedReturnPdf\(RETURN_THREE\)/);
  assert.match(leftoverSrc, /namesOnlyLook/);
  assert.doesNotMatch(
    leftoverSrc,
    /readPdfJsTextLayer\(dropped\)/,
    "a direct pdf.js read in the leftover is not the product path",
  );
  assert.doesNotMatch(
    leftoverSrc,
    /readPdfJsTextLayer\(blankPdf\)/,
    "the blank leftover must go through classifyAndExtract so the failed layer is named",
  );
  const pdfAt = leftoverSrc.indexOf("printedReturnPdf(RETURN_THREE)");
  const extractAt = leftoverSrc.indexOf("classifyAndExtract(\n    dropped");
  const garbledWriteAt = leftoverSrc.search(/applyExtractWrite\([\s\S]{0,240}readerMap: garbled/);
  assert.ok(
    pdfAt > 0 && extractAt > pdfAt && garbledWriteAt > extractAt,
    "the three-line card comes from classifyAndExtract, not garbled before the PDF",
  );
  assert.doesNotMatch(
    leftoverSrc,
    /readerMapFromPrintedLines\(RETURN_THREE\)/,
    "the three-line fixture is the extract map, not in-memory lines before the drop",
  );
  const printedFn = extractSrc.slice(
    extractSrc.indexOf("async function printedLinesForExtract"),
    extractSrc.indexOf("async function readReturnTextLayer"),
  );
  assert.match(printedFn, /printedLooksLikePersonal1040\(raw\)/);
  assert.match(printedFn, /return readPdfJsTextLayer\(bytes, filename\)/);
  assert.match(
    printedFn,
    /if \(printedLooksLikePersonal1040\(raw\) \|\| printedLooksLikeNeverStubForm\(raw\)\) \{\s*return readPdfJsTextLayer/,
    "a 1040 scrape is not the printed layer — pdf.js has to read it",
  );
  assert.match(leftoverSrc, /classifyAndExtract\(\s*blankPdf,[\s\S]{0,80}"blank\.pdf"/);
  assert.doesNotMatch(
    leftoverSrc,
    /classifyAndExtract\(\s*blankPdf,[\s\S]{0,80}\bname\b/,
    "a failed layer must not wear the real packet name",
  );
  assert.doesNotMatch(
    leftoverSrc,
    /classifyAndExtract\(\s*dropped,[\s\S]{0,80}garbledLook/,
    "guest extract must not run against the opening look",
  );
  assert.match(leftoverSrc, /received without extract is not the card/);
  assert.doesNotMatch(
    leftoverSrc,
    /const guestStart = applyExtractWrite\([^)]*readerMap: garbled/,
    "guest /start leftover must not hand a finished map to applyExtractWrite",
  );
  assert.doesNotMatch(
    leftoverSrc,
    /async read\(\) \{[\s\S]{0,400}kind: "schedule_c", value: "Vouch Eim Soy"/,
    "a look adapter must not return the finished three-business card",
  );
  console.log(
    "assert-reader-writer-split: map only · stub triple · 1040/8879/540/7203/K-1 never stub · Use this writes a reader line · Skip empty · no Paystubs in",
  );
}

void main();
