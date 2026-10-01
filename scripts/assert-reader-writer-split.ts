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
import { applyExtractWrite, emptyDraft, loadIntakeDraft, startOverWorkspace } from "../components/fox/store";
import { loudWageFromPrintedLines } from "../lib/docs/printedSample";
import { classifyAndExtract } from "../lib/docs/extract";
import { nextFoxAsk, previewFacts, workspacePrompt } from "../components/fox/workspace";
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

/** Helvetica page from the leftover lines. Not a founder PDF stand-in. */
function printedReturnPdf(lines: readonly string[]) {
  const commands = ["BT", "/F1 12 Tf", "72 720 Td"];
  for (const [index, line] of lines.entries()) {
    if (index) commands.push("0 -18 Td");
    commands.push(`(${line.replace(/[()\\]/g, "\\$&")}) Tj`);
  }
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
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
  assert.match(extractSrc, /return readReturnTextLayer\(bytes, mediaType, filename\)/);
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
