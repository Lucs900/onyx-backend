/**
 * Founder 1065 gold numbers from docs/14-1065-parass-entity-return.md.
 * No founder PDF bytes on the VM. Harbor 21 is smoke only — not ACCEPT.
 * Classify from the page, not the filename “2024 1120 - …”.
 * Line 23 ordinary is a loss $172,428. Company ordinary is not one person’s QI.
 * Suggest the 90% K-1 Box 1 first: −$12,932 · named loss · Suggested.
 * Line 9 $365,050 is employee wages. No SSN. Do not invent $725.
 * Who-card chips: Sunita · Pritika · Both · Skip. Use this only after pick.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { classifyPageByFormHeader } from "../lib/docs/formHeader";
import {
  junkEmployerName,
  loudEntityReturnFromPrintedLines,
  loudK1FromPrintedLines,
  loudWageFromPrintedLines,
} from "../lib/docs/printedSample";
import {
  applyExtractedFields,
  BUSINESS_RETURN_ASK,
  docInviteBlocksLooksRight,
  extractClassFromFilename,
  nextDocInvite,
  skipCurrentInvite,
  stillUsefulAskCopy,
  stillUsefulLabels,
} from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal } from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import { leftoverUseThisOnOlderTurns, sealStoredFoxThread } from "../components/fox/liveCoupon";
import { deskStripActions, nextFoxAsk, previewFacts, workspacePromptCopy, workspaceReply } from "../components/fox/workspace";
import { skipOtherK1Loan, writeOtherK1Loan } from "../components/fox/household";
import {
  applyOwnAllEntity,
  monthlyQualifyingFromExtract,
  selectK1WhoOnLoan,
  writeOtherK1Box1,
} from "../components/fox/qualifyingIncome";
import { NAMED_LOSS_SUGGEST_NOTE } from "../lib/income/ledger";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on a text-layer 1065 PDF");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on a text-layer 1065 PDF");
  },
};

function multiPagePdf(pages: string[][]) {
  const kids: string[] = [];
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  const contentObjects: string[] = [];
  const pageObjects: string[] = [];
  for (const [index, lines] of pages.entries()) {
    const commands = ["BT", "/F1 12 Tf", "72 720 Td"];
    for (const [lineIndex, line] of lines.entries()) {
      if (lineIndex) commands.push("0 -18 Td");
      commands.push(`(${line.replace(/[()\\]/g, "\\$&")}) Tj`);
    }
    commands.push("ET");
    const stream = commands.join("\n");
    contentObjects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const contentNum = 3 + index * 2;
    const pageNum = contentNum + 1;
    pageObjects.push(`<< /Type /Page /Parent 2 0 R /Contents ${contentNum} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] >>`);
    kids.push(`${pageNum} 0 R`);
  }
  objects.push(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`);
  for (let i = 0; i < pages.length; i += 1) {
    objects.push(contentObjects[i] ?? "");
    objects.push(pageObjects[i] ?? "");
  }
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body));
}

const FOUNDER_1065_FACE = [
  "Form 1065",
  "U.S. Return of Partnership Income",
  "2024",
  "Name of partnership Parass Foods LLC",
  "Employer identification number 88-1234567",
  "1c Gross receipts or sales                         980,000",
  "8 Total income (loss)                              619,857",
  "9 Salaries and wages (other than to partners)      365,050",
  "16a Depreciation (if required, attach Form 4562)    22,451",
  "21 Other deductions (attach statement)             237,473",
  "22 Total deductions                                792,285",
  "23 Ordinary business income (loss). Subtract line 22 from line 8    23 (172,428)",
];

const FOUNDER_K1_90 = [
  "Schedule K-1 (Form 1065) 2024",
  "Partner's Share of Income, Deductions, Credits, etc.",
  "Partnership Parass Foods LLC",
  "Partner identifying number 999-00-0001",
  "J Partner's share of profit, loss, and capital (see instructions):",
  "Beginning Ending",
  "Profit 90.0000000 % 90.0000000 %",
  "Loss 90.0000000 % 90.0000000 %",
  "Capital 90.0000000 % 90.0000000 %",
  "F Name, city, state, and ZIP code for partner",
  "Sunita Singh",
  "1 Ordinary business income (loss)                  (155,185)",
  "14 Self-employment earnings (loss)",
  "C 557,087",
];

const FOUNDER_K1_10 = [
  "Schedule K-1 (Form 1065) 2024",
  "Partner's Share of Income, Deductions, Credits, etc.",
  "Partnership Parass Foods LLC",
  "Partner identifying number 999-00-0002",
  "J Partner's share of profit, loss, and capital (see instructions):",
  "Beginning Ending",
  "Profit 10.0000000 % 10.0000000 %",
  "Loss 10.0000000 % 10.0000000 %",
  "Capital 10.0000000 % 10.0000000 %",
  "F Name, city, state, and ZIP code for partner",
  "Pritika Rajanshi",
  "1 Ordinary business income (loss)                  (17,243)",
  "14 Self-employment earnings (loss)",
  "C 61,899",
];

const FOUNDER_ENTITY_PAGES = [FOUNDER_1065_FACE];
const FOUNDER_PACKET_PAGES = [...FOUNDER_ENTITY_PAGES, FOUNDER_K1_90, FOUNDER_K1_10];
const MISLEADING_FILENAME = "2024 1120 - Parass Foods LLC.pdf";

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
    facts: {
      years_in_business: {
        field: "years_in_business",
        value: "5",
        source: "client",
        confirmed: true,
        confirmedAt: "2026-09-15T00:00:00.000Z",
      },
    },
  };
}

function withEntityDoc(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    documents: [
      {
        slot: "other",
        name: MISLEADING_FILENAME,
        type: "application/pdf",
        size: 8000,
        receivedAt: "2026-09-15T00:00:00.000Z",
        status: "extracted",
        extractClass: "tax_return",
      },
    ],
  };
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const doctrine = join(root, "docs", "14-1065-parass-entity-return.md");
  assert.equal(existsSync(doctrine), true, "docs/14-1065-parass-entity-return.md");
  const doctrineText = readFileSync(doctrine, "utf8");
  assert.match(doctrineText, /Parass Foods LLC/);
  assert.match(doctrineText, /\$172,428/);
  assert.match(doctrineText, /−\$12,932/);
  assert.match(doctrineText, /−\$1,437/);
  assert.match(doctrineText, /365,050/);
  assert.doesNotMatch(doctrineText, /\$725/);
  assert.match(doctrineText, /business return/);
  assert.doesNotMatch(doctrineText, /Form 1120-S or the entity return/);

  assert.equal(
    classifyPageByFormHeader("Form 1065 U.S. Return of Partnership Income Name of partnership Parass Foods LLC 23 Ordinary business income (loss) (172,428)"),
    "form_1065",
  );
  assert.notEqual(
    classifyPageByFormHeader("Form 1065 U.S. Return of Partnership Income Name of partnership Parass Foods LLC"),
    "form_1120s",
  );
  assert.equal(
    classifyPageByFormHeader(
      "Schedule K-1 (Form 1065) 2024 Partner's Share of Income J Partner's share of profit, loss, and capital Profit 90.0000000 % 1 Ordinary business income (loss) (155,185)",
    ),
    "k1",
  );
  assert.equal(extractClassFromFilename(MISLEADING_FILENAME), "tax_return");
  assert.equal(BUSINESS_RETURN_ASK, "I still need the business return.");
  assert.doesNotMatch(BUSINESS_RETURN_ASK, /1120-S/);

  assert.equal(junkEmployerName("Parass Foods LLC"), false);
  assert.equal(loudWageFromPrintedLines(FOUNDER_1065_FACE), null, "1065 is not a paystub");

  const faceLines = FOUNDER_ENTITY_PAGES.flat();
  const loud = loudEntityReturnFromPrintedLines(faceLines);
  assert.ok(loud, "loud 1065 extract");
  assert.equal(loud?.extractClass, "tax_return");
  assert.equal(loud?.fields.return_kind, "1065");
  assert.equal(loud?.fields.entity_name, "Parass Foods LLC");
  assert.equal(loud?.fields.entity_ordinary_income, "-172428");
  assert.notEqual(loud?.fields.entity_ordinary_income, "365050");
  assert.notEqual(loud?.fields.entity_ordinary_income, "619857");
  assert.notEqual(loud?.fields.entity_ordinary_income, "792285");
  assert.notEqual(loud?.fields.entity_ordinary_income, "237473");
  assert.notEqual(loud?.fields.entity_ordinary_income, "22451");
  assert.equal(loud?.fields.wages, undefined);
  assert.equal(loud?.fields.ein, undefined);
  assert.equal(loud?.fields.ssn, undefined);

  const packetLines = FOUNDER_PACKET_PAGES.flat();
  const loudPacket = loudEntityReturnFromPrintedLines(packetLines);
  assert.ok(loudPacket, "1065 face still wins when K-1 pages follow");
  assert.equal(loudPacket?.fields.return_kind, "1065");
  assert.equal(loudPacket?.fields.entity_ordinary_income, "-172428");
  assert.notEqual(loudPacket?.fields.entity_ordinary_income, "-155185");

  const k1 = loudK1FromPrintedLines(FOUNDER_K1_90);
  assert.ok(k1, "loud 90% K-1 extract");
  assert.equal(k1?.fields.k1_ordinary_income, "-155185");
  assert.equal(k1?.fields.ownership_percent, "90", "Item J 90.0000000 % is 90");
  assert.equal(k1?.fields.k1_partner_name, "Sunita Singh");
  assert.notEqual(k1?.fields.k1_ordinary_income, "-172428");
  assert.notEqual(k1?.fields.k1_ordinary_income, "557087");
  const k1Ten = loudK1FromPrintedLines(FOUNDER_K1_10);
  assert.equal(k1Ten?.fields.k1_ordinary_income, "-17243");
  assert.equal(k1Ten?.fields.ownership_percent, "10", "Item J 10.0000000 % is 10");
  assert.equal(k1Ten?.fields.k1_partner_name, "Pritika Rajanshi");
  assert.notEqual(k1Ten?.fields.k1_ordinary_income, "61899");
  const leakedTen = loudK1FromPrintedLines(
    FOUNDER_K1_10.map((line) => (line === "Pritika Rajanshi" ? "Sunita Singh" : line)),
  );
  assert.equal(leakedTen?.fields.k1_partner_name, "Pritika Rajanshi", "10% Box 1 never prints Sunita");
  assert.notEqual(leakedTen?.fields.k1_partner_name, "Sunita Singh");
  const k1Only = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    tax_year: "2024",
    return_kind: "k1",
    k1_ordinary_income: "-155185",
    ownership_percent: "90",
    entity_name: "Parass Foods LLC",
  });
  assert.equal(k1Only?.monthly, -12932, "90% K-1-only is −$12,932");
  assert.equal(k1Only?.basis, "k1");

  const bytes = multiPagePdf(FOUNDER_PACKET_PAGES);
  const extracted = await classifyAndExtract(
    bytes,
    "application/pdf",
    deadVision,
    null,
    MISLEADING_FILENAME,
  );
  assert.notEqual(extracted.failed, true);
  assert.equal(extracted.extractClass, "tax_return");
  assert.equal(extracted.fields.return_kind, "1065");
  assert.equal(extracted.fields.entity_name, "Parass Foods LLC");
  assert.equal(extracted.fields.entity_ordinary_income, "-172428");
  assert.equal(extracted.fields.k1_ordinary_income, "-155185");
  assert.equal(extracted.fields.ownership_percent, "90");
  assert.equal(extracted.fields.other_k1_ordinary_income, "-17243");
  assert.equal(extracted.fields.k1_partner_name, "Sunita Singh");
  assert.equal(extracted.fields.other_k1_partner_name, "Pritika Rajanshi");
  assert.notEqual(extracted.fields.k1_ordinary_income, "-17243");
  assert.notEqual(extracted.fields.entity_ordinary_income, "365050");
  assert.notEqual(extracted.fields.entity_ordinary_income, "619857");
  assert.notEqual(extracted.fields.entity_ordinary_income, "792285");
  assert.notEqual(extracted.fields.k1_ordinary_income, "557087");
  assert.equal(extracted.fields.wages, undefined);
  assert.equal(extracted.fields.employer_name, undefined);
  assert.equal(extracted.fields.ein, undefined);
  assert.equal(extracted.fields.fein, undefined);
  assert.equal(extracted.fields.ssn, undefined);
  assert.doesNotMatch(JSON.stringify(extracted.fields), /999-00-0001|999-00-0002|88-1234567|725/);

  const harbor21 = join(root, "sample-docs", "21-1065-2024-bay-street.pdf");
  if (existsSync(harbor21)) {
    const harborMisnamed = await classifyAndExtract(
      new Uint8Array(readFileSync(harbor21)),
      "application/pdf",
      deadVision,
      null,
      "2024 1120 - bay-street.pdf",
    );
    assert.equal(harborMisnamed.fields.return_kind, "1065", "Harbor 21 page stays 1065 under a 1120 filename");
    assert.notEqual(harborMisnamed.fields.return_kind, "1120s");
    assert.notEqual(harborMisnamed.fields.entity_ordinary_income, "-172428", "Harbor smoke is not Parass gold");
    assert.notEqual(harborMisnamed.fields.k1_ordinary_income, "-155185");
    assert.notEqual(harborMisnamed.fields.entity_name, "Parass Foods LLC");
  }

  const computed = monthlyQualifyingFromExtract(seSketch(), "tax_return", extracted.fields);
  assert.equal(computed?.monthly, -12932);
  assert.equal(computed?.basis, "k1");
  assert.equal(computed?.companyOrdinaryMonthly, -14369);
  assert.match(computed?.methodNote ?? "", /K-1 Box 1/);
  assert.doesNotMatch(computed?.methodNote ?? "", /household ordinary/);
  assert.equal(computed?.entityName, "Parass Foods LLC");
  assert.notEqual(computed?.monthly, 725);
  assert.notEqual(computed?.monthly, -725);

  const faceOnly = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    tax_year: "2024",
    return_kind: "1065",
    entity_name: "Parass Foods LLC",
    entity_ordinary_income: "-172428",
  });
  assert.equal(faceOnly?.needsOwnership, true, "1065 header has no ownership");
  assert.equal(faceOnly?.monthly, 0);
  assert.equal(faceOnly?.companyOrdinaryMonthly, -14369);
  assert.match(faceOnly?.methodNote ?? "", /company ordinary/);

  const hold = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2024",
      return_kind: "1065",
      entity_name: "Parass Foods LLC",
      entity_ordinary_income: "-172428",
    },
  });
  assert.equal(hold.draft.pendingProposal?.field, "company_ordinary");
  assert.equal(hold.draft.pendingProposal?.value, "-14369");
  assert.ok(!hold.draft.facts?.qualifying_income, "File empty until Use this");
  const holdAsk = workspacePromptCopy("confirm-proposal", hold.draft);
  assert.match(holdAsk.text, /Form 1065/);
  assert.match(holdAsk.text, /Parass Foods LLC/);
  assert.match(holdAsk.text, /Company ordinary is −\$14,369/i);
  assert.match(holdAsk.text, /I need the K-1, or confirm you own all of it/i);
  assert.doesNotMatch(holdAsk.text, /1120-S/);
  assert.doesNotMatch(holdAsk.text, /725/);
  assert.ok(!(holdAsk.actions ?? []).some((item) => item.label === "Use this"), "no Use this before K-1 or own-all");
  assert.ok((holdAsk.actions ?? []).some((item) => item.label === "I own all of it"));

  const owned = applyOwnAllEntity(hold.draft);
  assert.equal(owned.pendingProposal?.field, "qualifying_income");
  assert.equal(owned.pendingProposal?.value, "-14369");
  const ownedAsk = workspacePromptCopy("confirm-proposal", owned);
  assert.match(ownedAsk.text, /Form 1065/);
  assert.match(ownedAsk.text, /You own all of it/);
  assert.ok((ownedAsk.actions ?? []).some((item) => item.label === "Use this"));
  const ownedUsed = resolveProposal(owned, "accept");
  assert.equal(ownedUsed.facts?.qualifying_income?.value, "-14369");
  assert.doesNotMatch(nextFoxAsk(ownedUsed).text, /other K-1|on this loan/i, "own-all is not the two-K-1 ask");
  assert.ok(!stillUsefulLabels(ownedUsed).includes("Other K-1"), "own-all does not park Other K-1");

  const proposed = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: extracted.fields,
  });
  assert.equal(proposed.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(proposed.draft.pendingProposal?.value, "-12932");
  assert.equal(proposed.draft.pendingProposal?.note, NAMED_LOSS_SUGGEST_NOTE);
  assert.ok(!proposed.draft.facts?.qualifying_income, "File empty until Use this");
  assert.ok(!proposed.draft.facts?.entity_ordinary_income);
  assert.ok(!proposed.draft.facts?.employer_name);
  assert.ok(!proposed.draft.facts?.ein);
  assert.ok(!proposed.draft.facts?.ssn);
  assert.ok(!proposed.draft.facts?.wages);
  assert.doesNotMatch(JSON.stringify(proposed.draft.facts ?? {}), /999-00-0001|999-00-0002|88-1234567|725/);
  assert.ok(
    !previewFacts(proposed.draft).some((fact) => fact.id === "qualifying" && /12,932|12932|14,369|14369|725/.test(fact.value)),
    "qualifying File line stays empty until Use this",
  );

  const ask = workspacePromptCopy("confirm-proposal", proposed.draft);
  assert.match(ask.text, /Form 1065/);
  assert.match(ask.text, /Parass Foods LLC/);
  assert.match(ask.text, /two K-1s/);
  assert.match(ask.text, /Sunita Singh 90% · −\$12,932 a month/);
  assert.match(ask.text, /Pritika Rajanshi 10% · −\$1,437 a month/);
  assert.match(ask.text, /Company ordinary · −\$14,369 a month/);
  assert.doesNotMatch(ask.text, /Sunita Singh 10%/);
  assert.doesNotMatch(ask.text, /your K-1/i);
  assert.match(ask.text, /Named loss · not confirmed cash flow/);
  assert.match(ask.text, /Suggested · not underwritten/);
  assert.match(ask.text, /Who is on this loan\?/);
  assert.doesNotMatch(ask.text, /1120-S/);
  assert.doesNotMatch(ask.text, /365,050|employee wages|725/);
  assert.doesNotMatch(ask.text, /999-00-0001|999-00-0002|88-1234567/);
  assert.deepEqual(
    (ask.actions ?? []).map((item) => item.label),
    ["Sunita", "Pritika", "Both", "Skip"],
  );
  assert.ok(!(ask.actions ?? []).some((item) => item.label === "Yes"));
  assert.ok(!(ask.actions ?? []).some((item) => item.label === "No"));
  assert.ok(!(ask.actions ?? []).some((item) => item.label === "Use this"), "Use this waits until they pick a person");
  assert.ok(!(ask.actions ?? []).some((item) => item.label === "Change"));
  assert.deepEqual(
    deskStripActions([{ id: "who", role: "fox", text: ask.text, actions: ask.actions }], proposed.draft).map(
      (item) => item.label,
    ),
    ["Sunita", "Pritika", "Both", "Skip"],
    "who-turn live chips stay Sunita · Pritika · Both · Skip",
  );

  const leaked = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      ...extracted.fields,
      k1_partner_name: "Sunita Singh",
      other_k1_partner_name: "Sunita Singh",
    },
  });
  const leakedAsk = workspacePromptCopy("confirm-proposal", leaked.draft);
  assert.match(leakedAsk.text, /Pritika Rajanshi 10% · −\$1,437 a month/);
  assert.doesNotMatch(leakedAsk.text, /Sunita Singh 10%/);

  const usedTooSoon = resolveProposal(proposed.draft, "accept");
  assert.ok(!usedTooSoon.facts?.qualifying_income, "Use this does not write before who");
  assert.equal(usedTooSoon.pendingProposal?.value, "-12932");

  const picked = selectK1WhoOnLoan(proposed.draft, "primary");
  assert.ok(!picked.facts?.qualifying_income, "chip does not write until Use this");
  const pickedAsk = workspacePromptCopy("confirm-proposal", picked);
  assert.match(pickedAsk.text, /Sunita Singh 90% · −\$12,932 a month/);
  assert.doesNotMatch(pickedAsk.text, /your K-1/i);
  assert.ok((pickedAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok(
    deskStripActions([{ id: "picked", role: "fox", text: pickedAsk.text, actions: pickedAsk.actions }], picked).some(
      (item) => item.label === "Use this",
    ),
  );
  const sunita = resolveProposal(picked, "accept");
  assert.equal(sunita.facts?.qualifying_income?.value, "-12932");
  assert.equal(sunita.facts?.qualifying_income?.confirmed, true);
  assert.ok(!sunita.facts?.other_k1_box1);
  assert.ok(!sunita.statedHousehold, "who-chip does not invent a co-borrower");
  assert.ok(!sunita.coborrowerName);
  assert.ok(!sunita.facts?.wages, "employee wages are not QI");
  assert.ok((sunita.employmentHistory ?? []).some((row) => /Parass Foods LLC/i.test(row.label ?? "")));
  assert.ok(!stillUsefulLabels(sunita).includes("Other K-1"), "Sunita only drops Other K-1");
  assert.doesNotMatch(nextFoxAsk(sunita).text, /Who is on this loan|other K-1 — is that person/i);

  const pritika = resolveProposal(selectK1WhoOnLoan(proposed.draft, "other"), "accept");
  assert.equal(pritika.facts?.qualifying_income?.value, "-1437");
  assert.ok(!pritika.facts?.other_k1_box1);
  assert.ok(
    !previewFacts(pritika).some((fact) => fact.label === "Qualifying income" && /14,369/.test(fact.value)),
    "Pritika is not company ordinary",
  );

  const both = writeOtherK1Box1(resolveProposal(selectK1WhoOnLoan(proposed.draft, "both"), "accept"));
  assert.equal(both.facts?.qualifying_income?.value, "-12932");
  assert.equal(both.facts?.other_k1_box1?.value, "-1437");
  assert.equal(both.facts?.combined_ordinary?.value, "-14369");
  assert.ok(!both.statedHousehold, "Both does not invent a co-borrower");
  assert.ok(
    previewFacts(both).some((fact) => fact.label === "Qualifying income" && /12,932/.test(fact.value)),
  );
  assert.ok(previewFacts(both).some((fact) => fact.label === "K-1 Box 1" && /1,437/.test(fact.value)));
  assert.ok(previewFacts(both).some((fact) => fact.label === "Combined ordinary" && /14,369/.test(fact.value)));
  assert.ok(
    !previewFacts(both).some((fact) => fact.label === "Qualifying income" && /14,369/.test(fact.value)),
    "do not write company ordinary as one person’s QI",
  );

  const yesTyped = workspaceReply("Yes", proposed.draft);
  assert.doesNotMatch(yesTyped?.text ?? "", /725/);
  const no = writeOtherK1Loan(proposed.draft, false);
  assert.ok(!no.facts?.qualifying_income, "No on the who-card without a write keeps File empty");

  const skipped = skipOtherK1Loan(proposed.draft);
  assert.ok(!skipped.facts?.qualifying_income, "Skip does not write QI");
  assert.ok(stillUsefulLabels(skipped).includes("Other K-1"), "Skip parks Other K-1");
  assert.ok(!skipped.statedHousehold);

  const leftoverThread: FoxMessage[] = sealStoredFoxThread([
    { id: "card", role: "fox", text: ask.text, actions: ask.actions },
    { id: "used", role: "client", text: "Sunita Singh" },
    { id: "next", role: "fox", text: nextFoxAsk(sunita).text, actions: nextFoxAsk(sunita).actions },
  ]);
  assert.equal(leftoverUseThisOnOlderTurns(leftoverThread, sunita), 0);

  const skip1040 = skipCurrentInvite(seSketch());
  assert.equal(skip1040.federalReturnSkipped, true);
  assert.ok(!(skip1040.skippedClasses ?? []).includes("tax_return"));
  assert.equal(nextFoxAsk(skip1040).text, BUSINESS_RETURN_ASK);
  assert.doesNotMatch(nextFoxAsk(skip1040).text, /1120-S|entity return/i);
  assert.equal(docInviteBlocksLooksRight(skip1040), true);
  assert.equal(canLooksRight(skip1040), false, "Skip-1040 on SE must still ask for the business return");

  const afterSkipDrop = applyExtractedFields(withEntityDoc(skip1040), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: extracted.fields,
  });
  const afterSkipAsk = workspacePromptCopy("confirm-proposal", afterSkipDrop.draft);
  assert.match(afterSkipAsk.text, /Form 1065/);
  assert.match(afterSkipAsk.text, /Who is on this loan/);
  const afterSkipUsed = resolveProposal(selectK1WhoOnLoan(afterSkipDrop.draft, "primary"), "accept");
  assert.equal(afterSkipUsed.facts?.qualifying_income?.value, "-12932");
  assert.ok((afterSkipUsed.employmentHistory ?? []).some((row) => /Parass Foods LLC/i.test(row.label ?? "")));
  assert.doesNotMatch(nextFoxAsk(afterSkipUsed).text, /Form 1040|1120-S/i);
  assert.notEqual(nextDocInvite(afterSkipUsed), "tax_return");
  assert.ok(!stillUsefulLabels(afterSkipUsed).includes("K-1 distributions"));

  console.log("assert-1065-entity-return: Parass two named K-1s · Who is on this loan");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
