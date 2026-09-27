/**
 * Founder 1120-S gold numbers from docs/13-1120s-entity-return.md.
 * No founder PDF bytes on the VM. Harbor 23/24 are smoke only — not ACCEPT.
 * 8879-CORP is not the entity return. Line 21 on this 1120-S is deductions.
 * Ordinary is page 1 line 22 / Schedule K line 1 = $52,702.
 * Two 50% K-1s at $26,351. $4,392 is company ordinary, not this borrower’s QI.
 * Use this waits for K-1 Box 1 ($2,196) or own-all.
 * EIN / SSN stay off File. Skip-1040 on SE still asks for the business return.
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
import { nextFoxAsk, previewFacts, workspacePromptCopy, workspaceReply } from "../components/fox/workspace";
import { OTHER_K1_LOAN_ASK, skipOtherK1Loan, writeOtherK1Loan } from "../components/fox/household";
import { applyOwnAllEntity, monthlyQualifyingFromExtract } from "../components/fox/qualifyingIncome";
import { SUGGESTED_INCOME_NOTE } from "../lib/income/suggest";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on a text-layer 1120-S PDF");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on a text-layer 1120-S PDF");
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

const FOUNDER_8879_PAGE = [
  "Form 8879-CORP",
  "E-file Authorization for Corporations",
  "2024",
  "Name of corporation HO & SOY INC",
  "Employer identification number 92-30339499",
  "3 Total income (Form 1120-S, line 6)               360,572",
  "WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED",
  "PIN 92300",
];

const FOUNDER_1120S_FACE = [
  "Form 1120-S",
  "U.S. Income Tax Return for an S Corporation",
  "2024",
  "Name of corporation HO & SOY INC",
  "Employer identification number 92-30339499",
  "1c Gross receipts or sales                         535,394",
  "6 Total income (loss). Add lines 3 through 5       360,572",
  "7 Compensation of officers                         96,000",
  "14 Depreciation not claimed on Form 1125-A         3,180",
  "21 Other deductions (attach statement)             99,936",
  "22 Ordinary business income (loss)                 52,702",
];

const FOUNDER_SCHEDULE_K = [
  "Schedule K (Form 1120-S)",
  "Shareholders' Pro Rata Share Items",
  "1 Ordinary business income (loss) (page 1, line 22)   52,702",
];

const FOUNDER_K1_PAGE = [
  "Schedule K-1 (Form 1120-S) 2024",
  "Shareholder's Share of Income, Deductions, Credits, etc.",
  "Corporation HO & SOY INC",
  "Shareholder identifying number 566-79-1312",
  "Current year allocation percentage 50%",
  "1 Ordinary business income (loss)                  26,351",
];

const FOUNDER_ENTITY_PAGES = [FOUNDER_8879_PAGE, FOUNDER_1120S_FACE, FOUNDER_SCHEDULE_K];
const FOUNDER_PACKET_PAGES = [...FOUNDER_ENTITY_PAGES, FOUNDER_K1_PAGE, FOUNDER_K1_PAGE];

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
        confirmedAt: "2026-09-13T00:00:00.000Z",
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
        name: "Ho Soy Inc 2024 Tax returns 1120S.pdf",
        type: "application/pdf",
        size: 8000,
        receivedAt: "2026-09-13T00:00:00.000Z",
        status: "extracted",
        extractClass: "tax_return",
      },
    ],
  };
}

async function main() {
  const doctrine = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "13-1120s-entity-return.md");
  assert.equal(existsSync(doctrine), true, "docs/13-1120s-entity-return.md");
  const doctrineText = readFileSync(doctrine, "utf8");
  assert.match(doctrineText, /\$4,392/);
  assert.match(doctrineText, /company ordinary/);
  assert.match(doctrineText, /line 22/);
  assert.match(doctrineText, /8879-CORP/);
  assert.match(doctrineText, /\$2,196/);
  assert.match(doctrineText, /Harbor 23 \/ 24 — smoke only/);
  assert.doesNotMatch(doctrineText, /Use this on this packet is household/);

  assert.equal(
    classifyPageByFormHeader("Form 8879-CORP E-file Authorization for Corporations EXPRESS OR IMPLIED"),
    "form_8879",
  );
  assert.notEqual(
    classifyPageByFormHeader("Form 8879-CORP E-file Authorization for Corporations Form 1120-S, line 6 360,572"),
    "form_1120s",
  );
  assert.equal(
    classifyPageByFormHeader(
      "Form 1120-S U.S. Income Tax Return for an S Corporation Name of corporation HO & SOY INC 22 Ordinary business income 52702",
    ),
    "form_1120s",
  );
  assert.equal(
    classifyPageByFormHeader(
      "Schedule K-1 (Form 1120-S) 2024 Shareholder's Share Current year allocation percentage 50% 1 Ordinary business income 26351",
    ),
    "k1",
  );
  assert.notEqual(
    classifyPageByFormHeader("Form 1120-S U.S. Income Tax Return for an S Corporation"),
    "form_1040",
  );
  assert.equal(
    extractClassFromFilename("Ho Soy Inc 2024 Tax returns 1120S.pdf"),
    "tax_return",
  );

  assert.equal(junkEmployerName("EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED"), true);
  assert.equal(junkEmployerName("INCLUDING BUT NOT LIMITED"), true);
  assert.equal(junkEmployerName("HO & SOY INC"), false);

  assert.equal(loudEntityReturnFromPrintedLines(FOUNDER_8879_PAGE), null, "8879-CORP is not the entity return");
  assert.equal(loudWageFromPrintedLines(FOUNDER_8879_PAGE), null, "8879-CORP is not a paystub");

  const faceLines = FOUNDER_ENTITY_PAGES.flat();
  assert.equal(loudWageFromPrintedLines(faceLines), null, "1120-S is not a paystub");
  const loud = loudEntityReturnFromPrintedLines(faceLines);
  assert.ok(loud, "loud 1120-S extract");
  assert.equal(loud?.extractClass, "tax_return");
  assert.equal(loud?.fields.return_kind, "1120s");
  assert.equal(loud?.fields.entity_name, "HO & SOY INC");
  assert.equal(loud?.fields.entity_ordinary_income, "52702");
  assert.equal(loud?.fields.officer_compensation, "96000");
  assert.notEqual(loud?.fields.entity_ordinary_income, "360572");
  assert.notEqual(loud?.fields.entity_ordinary_income, "99936");
  assert.notEqual(loud?.fields.entity_ordinary_income, "26351");
  assert.notEqual(loud?.fields.entity_ordinary_income, "96000");
  assert.equal(loud?.fields.ein, undefined);
  assert.equal(loud?.fields.ssn, undefined);
  assert.notEqual(loud?.fields.employer_name, "EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED");
  assert.equal(loud?.fields.employer_name, undefined);

  const packetLines = FOUNDER_PACKET_PAGES.flat();
  const loudPacket = loudEntityReturnFromPrintedLines(packetLines);
  assert.ok(loudPacket, "1120-S face still wins when K-1 pages follow");
  assert.equal(loudPacket?.fields.entity_ordinary_income, "52702");
  assert.notEqual(loudPacket?.fields.entity_ordinary_income, "26351");

  const k1 = loudK1FromPrintedLines(FOUNDER_K1_PAGE);
  assert.ok(k1, "loud K-1 extract");
  assert.equal(k1?.fields.k1_ordinary_income, "26351");
  assert.equal(k1?.fields.ownership_percent, "50");
  assert.notEqual(k1?.fields.k1_ordinary_income, "52702");
  const k1Only = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    tax_year: "2024",
    return_kind: "k1",
    k1_ordinary_income: "26351",
    ownership_percent: "50",
    entity_name: "HO & SOY INC",
  });
  assert.equal(k1Only?.monthly, 2196, "K-1-only is $2,196 per 50% owner");
  assert.equal(k1Only?.basis, "k1");

  const bytes = multiPagePdf(FOUNDER_PACKET_PAGES);
  const extracted = await classifyAndExtract(
    bytes,
    "application/pdf",
    deadVision,
    null,
    "Ho Soy Inc 2024 Tax returns 1120S.pdf",
  );
  assert.notEqual(extracted.failed, true);
  assert.equal(extracted.extractClass, "tax_return");
  assert.equal(extracted.fields.return_kind, "1120s");
  assert.equal(extracted.fields.entity_name, "HO & SOY INC");
  assert.equal(extracted.fields.entity_ordinary_income, "52702");
  assert.equal(extracted.fields.officer_compensation, "96000");
  assert.notEqual(extracted.fields.entity_ordinary_income, "360572");
  assert.notEqual(extracted.fields.entity_ordinary_income, "99936");
  assert.notEqual(extracted.fields.entity_ordinary_income, "26351");
  assert.notEqual(extracted.fields.entity_ordinary_income, "96000");
  assert.notEqual(extracted.fields.entity_ordinary_income, "535394");
  assert.notEqual(extracted.fields.employer_name, "EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED");
  assert.equal(extracted.fields.employer_name, undefined);
  assert.equal(extracted.fields.ein, undefined);
  assert.equal(extracted.fields.fein, undefined);
  assert.equal(extracted.fields.ssn, undefined);
  assert.doesNotMatch(JSON.stringify(extracted.fields), /92-30339499|566-79-1312/);

  assert.equal(extracted.fields.k1_ordinary_income, "26351");
  const computed = monthlyQualifyingFromExtract(seSketch(), "tax_return", extracted.fields);
  assert.equal(computed?.monthly, 2196);
  assert.equal(computed?.basis, "k1");
  assert.equal(computed?.companyOrdinaryMonthly, 4392);
  assert.match(computed?.methodNote ?? "", /K-1 Box 1/);
  assert.doesNotMatch(computed?.methodNote ?? "", /household ordinary/);
  assert.doesNotMatch(computed?.methodNote ?? "", /ordinary \+ dep/);
  assert.equal(computed?.officerCompensation, "96000");
  assert.equal(computed?.entityName, "HO & SOY INC");
  assert.notEqual(extracted.fields.entity_ordinary_income, extracted.fields.officer_compensation);
  assert.equal(extracted.fields.entity_depreciation, undefined, "line 14 Depreciation is not a 1084 add-back");

  const faceOnly = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    tax_year: "2024",
    return_kind: "1120s",
    entity_name: "HO & SOY INC",
    entity_ordinary_income: "52702",
    officer_compensation: "96000",
  });
  assert.equal(faceOnly?.needsOwnership, true, "1120-S header has no ownership");
  assert.equal(faceOnly?.monthly, 0);
  assert.equal(faceOnly?.companyOrdinaryMonthly, 4392);
  assert.match(faceOnly?.methodNote ?? "", /company ordinary/);

  const strayDep = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    tax_year: "2024",
    return_kind: "1120s",
    entity_name: "HO & SOY INC",
    entity_ordinary_income: "52702",
    officer_compensation: "96000",
    entity_depreciation: "3180",
  });
  assert.equal(strayDep?.needsOwnership, true, "stray 1120-S depreciation must not steal company ordinary");
  assert.equal(strayDep?.companyOrdinaryMonthly, 4392);

  const half = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    tax_year: "2024",
    return_kind: "1120s",
    entity_name: "HO & SOY INC",
    entity_ordinary_income: "52702",
    officer_compensation: "96000",
    ownership_percent: "50",
  });
  assert.equal(half?.needsOwnership, true, "50% on the header is still not this borrower’s QI");
  assert.equal(half?.monthly, 0);
  assert.equal(half?.companyOrdinaryMonthly, 4392);

  const hold = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2024",
      return_kind: "1120s",
      entity_name: "HO & SOY INC",
      entity_ordinary_income: "52702",
      officer_compensation: "96000",
    },
  });
  assert.equal(hold.draft.pendingProposal?.field, "company_ordinary");
  assert.equal(hold.draft.pendingProposal?.value, "4392");
  assert.ok(!hold.draft.facts?.qualifying_income, "File empty until Use this");
  const holdAsk = workspacePromptCopy("confirm-proposal", hold.draft);
  assert.match(holdAsk.text, /Form 1120-S/);
  assert.match(holdAsk.text, /HO & SOY INC/);
  assert.match(holdAsk.text, /Company ordinary is \$4,392/i);
  assert.match(holdAsk.text, /I need the K-1, or confirm you own all of it/i);
  assert.match(holdAsk.text, /\$96,000/);
  assert.doesNotMatch(holdAsk.text, /household/i);
  assert.ok(!(holdAsk.actions ?? []).some((item) => item.label === "Use this"), "no Use this before K-1 or own-all");
  assert.ok((holdAsk.actions ?? []).some((item) => item.label === "I own all of it"));

  const owned = applyOwnAllEntity(hold.draft);
  assert.equal(owned.pendingProposal?.field, "qualifying_income");
  assert.equal(owned.pendingProposal?.value, "4392");
  const ownedAsk = workspacePromptCopy("confirm-proposal", owned);
  assert.match(ownedAsk.text, /Company ordinary is \$4,392/i);
  assert.match(ownedAsk.text, /You own all of it/);
  assert.ok((ownedAsk.actions ?? []).some((item) => item.label === "Use this"));
  const ownedUsed = resolveProposal(owned, "accept");
  assert.equal(ownedUsed.facts?.qualifying_income?.value, "4392");
  assert.ok((ownedUsed.employmentHistory ?? []).some((row) => /HO & SOY INC/i.test(row.label ?? "")));
  assert.doesNotMatch(nextFoxAsk(ownedUsed).text, /other K-1|on this loan/i, "own-all is not the two-K-1 ask");
  assert.ok(!stillUsefulLabels(ownedUsed).includes("Other K-1"), "own-all does not park Other K-1");

  const proposed = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: extracted.fields,
  });
  assert.equal(proposed.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(proposed.draft.pendingProposal?.value, "2196");
  assert.equal(proposed.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
  assert.ok(!proposed.draft.facts?.qualifying_income, "File empty until Use this");
  assert.ok(!proposed.draft.facts?.entity_ordinary_income);
  assert.ok(!proposed.draft.facts?.employer_name);
  assert.ok(!proposed.draft.facts?.ein);
  assert.ok(!proposed.draft.facts?.ssn);
  assert.ok(!proposed.draft.facts?.company_ordinary, "company ordinary extra is not a File write");
  assert.doesNotMatch(JSON.stringify(proposed.draft.facts ?? {}), /92-30339499|566-79-1312/);
  assert.ok(
    !previewFacts(proposed.draft).some((fact) => fact.id === "qualifying" && /2,196|2196|4,392|4392/.test(fact.value)),
    "qualifying File line stays empty until Use this",
  );

  const ask = workspacePromptCopy("confirm-proposal", proposed.draft);
  assert.match(ask.text, /Form 1120-S/);
  assert.match(ask.text, /HO & SOY INC/);
  assert.match(ask.text, /Company ordinary is \$4,392/i);
  assert.match(ask.text, /K-1 Box 1 is \$2,196/i);
  assert.match(ask.text, /\$96,000/);
  assert.match(ask.text, /wages, not inside ordinary/i);
  assert.match(ask.text, /Suggested qualifying income · not underwritten/);
  assert.doesNotMatch(ask.text, /household/i);
  assert.doesNotMatch(ask.text, /EXPRESS OR IMPLIED|INCLUDING BUT NOT LIMITED/i);
  assert.doesNotMatch(ask.text, /92-30339499|566-79-1312/);
  assert.ok((ask.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok((ask.actions ?? []).some((item) => item.label === "Change"));

  const used = resolveProposal(proposed.draft, "accept");
  assert.equal(used.facts?.qualifying_income?.value, "2196");
  assert.equal(used.facts?.qualifying_income?.confirmed, true);
  assert.notEqual(used.facts?.qualifying_income?.value, "8000");
  assert.ok(!used.facts?.officer_compensation, "officer wages are not QI");
  assert.ok((used.employmentHistory ?? []).some((row) => /HO & SOY INC/i.test(row.label ?? "")));
  assert.ok(
    previewFacts(used).some(
      (fact) => fact.label === "Employment" && /HO & SOY INC/i.test(fact.value),
    ),
    "Employment writes HO & SOY INC",
  );
  assert.ok(
    !previewFacts(used).some(
      (fact) => fact.label === "Employment" && /^Self-employed\b/i.test(fact.value),
    ),
    "Employment must not stay Self-employed",
  );
  assert.equal(used.incomeType.value, "self-employed");
  assert.ok(!stillUsefulLabels(used).includes("K-1 distributions"));
  assert.ok(!stillUsefulLabels(used).some((label) => /prior-year|Form 1040|Harbor Studio K-1|Bay Street K-1/i.test(label)));
  assert.doesNotMatch(stillUsefulAskCopy(used), /K-1 distributions|Form 1040/i);
  assert.equal(nextFoxAsk(used).text, OTHER_K1_LOAN_ASK);
  assert.match(nextFoxAsk(used).text, /other K-1/i);
  assert.match(nextFoxAsk(used).text, /is that person on this loan/i);
  assert.doesNotMatch(nextFoxAsk(used).text, /purchase contract/i, "ask before purchase contract");
  assert.doesNotMatch(nextFoxAsk(used).text, /Form 1040|Harbor Studio K-1|Bay Street K-1/i);
  assert.ok(stillUsefulLabels(used).includes("Other K-1"), "Other K-1 sits on Still useful until Yes or No");
  assert.ok(!used.statedHousehold, "Use this does not invent a co-borrower");
  assert.notEqual(nextDocInvite(used), "tax_return");
  assert.notEqual(nextDocInvite(used), "prior_year_return");
  assert.doesNotMatch(nextFoxAsk(proposed.draft).text, /other K-1|on this loan/i, "QI card first");

  const yesAsk = workspaceReply("Yes", used);
  assert.match(yesAsk?.text ?? "", /K-1 Box 1 is \$2,196/);
  assert.doesNotMatch(yesAsk?.text ?? "", /purchase contract/i);
  const yes = writeOtherK1Loan(used, true);
  assert.equal(yes.statedHousehold, undefined, "Yes does not invent a co-borrower");
  assert.ok(!yes.coborrowerName);
  assert.ok(!yes.workingOnCoborrower);
  assert.equal(yes.pendingProposal?.field, "other_k1_box1");
  assert.equal(yes.pendingProposal?.value, "2196");
  assert.match(nextFoxAsk(yes).text, /K-1 Box 1 is \$2,196/);
  const yesUsed = resolveProposal(yes, "accept");
  assert.equal(yesUsed.facts?.qualifying_income?.value, "2196", "first row stays this borrower’s Box 1");
  assert.equal(yesUsed.facts?.other_k1_box1?.value, "2196", "second row is the other Box 1");
  assert.equal(yesUsed.facts?.combined_ordinary?.value, "4392");
  assert.ok(!yesUsed.facts?.officer_compensation, "officer wages stay out until a W-2");
  assert.equal(yesUsed.statedHousehold, undefined, "Yes write still invents no co-borrower");
  assert.ok(
    previewFacts(yesUsed).some((fact) => fact.label === "Qualifying income" && /2,196/.test(fact.value)),
  );
  assert.ok(
    previewFacts(yesUsed).some((fact) => fact.label === "K-1 Box 1" && /2,196/.test(fact.value)),
    "second $2,196 row",
  );
  assert.ok(
    previewFacts(yesUsed).some((fact) => fact.label === "Combined ordinary" && /4,392/.test(fact.value)),
  );
  assert.ok(
    !previewFacts(yesUsed).some((fact) => fact.label === "Qualifying income" && /4,392/.test(fact.value)),
    "do not write company ordinary as one person’s QI",
  );
  assert.ok(!stillUsefulLabels(yesUsed).includes("Other K-1"));
  assert.doesNotMatch(nextFoxAsk(yesUsed).text, /other K-1 — is that person on this loan/i);

  const no = writeOtherK1Loan(used, false);
  assert.equal(no.facts?.qualifying_income?.value, "2196");
  assert.ok(!no.facts?.other_k1_box1);
  assert.equal(no.statedHousehold, undefined, "No does not invent a co-borrower");
  assert.ok(!stillUsefulLabels(no).includes("Other K-1"), "No takes Other K-1 off Still useful");
  assert.doesNotMatch(nextFoxAsk(no).text, /other K-1 — is that person on this loan/i);

  const skipped = skipOtherK1Loan(used);
  assert.equal(skipped.facts?.qualifying_income?.value, "2196");
  assert.ok(stillUsefulLabels(skipped).includes("Other K-1"), "Skip keeps Other K-1 on Still useful");
  assert.doesNotMatch(nextFoxAsk(skipped).text, /other K-1 — is that person on this loan/i);

  const noPctFields = { ...extracted.fields };
  delete noPctFields.ownership_percent;
  const noPct = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: noPctFields,
  });
  const noPctUsed = resolveProposal(noPct.draft, "accept");
  assert.equal(noPctUsed.facts?.qualifying_income?.value, "2196");
  assert.equal(nextFoxAsk(noPctUsed).text, OTHER_K1_LOAN_ASK, "two 50% K-1s without a printed 50 still ask");
  assert.doesNotMatch(nextFoxAsk(noPctUsed).text, /purchase contract/i);

  const pctMark = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { ...extracted.fields, ownership_percent: "50%" },
  });
  assert.equal(nextFoxAsk(resolveProposal(pctMark.draft, "accept")).text, OTHER_K1_LOAN_ASK);

  const leftoverThread: FoxMessage[] = sealStoredFoxThread([
    { id: "card", role: "fox", text: ask.text, actions: ask.actions },
    { id: "used", role: "client", text: "Use this" },
    { id: "next", role: "fox", text: nextFoxAsk(used).text, actions: nextFoxAsk(used).actions },
  ]);
  assert.equal(leftoverUseThisOnOlderTurns(leftoverThread, used), 0);

  const skip1040 = skipCurrentInvite(seSketch());
  assert.equal(skip1040.federalReturnSkipped, true);
  assert.ok(!(skip1040.skippedClasses ?? []).includes("tax_return"));
  assert.equal(nextFoxAsk(skip1040).text, BUSINESS_RETURN_ASK);
  assert.equal(docInviteBlocksLooksRight(skip1040), true);
  assert.equal(canLooksRight(skip1040), false, "Skip-1040 on SE must still ask for the business return");

  const skipBusiness = skipCurrentInvite(skip1040);
  assert.ok((skipBusiness.skippedClasses ?? []).includes("tax_return"));

  const afterSkipDrop = applyExtractedFields(withEntityDoc(skip1040), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: extracted.fields,
  });
  const afterSkipUsed = resolveProposal(afterSkipDrop.draft, "accept");
  assert.equal(afterSkipUsed.facts?.qualifying_income?.value, "2196");
  assert.ok((afterSkipUsed.employmentHistory ?? []).some((row) => /HO & SOY INC/i.test(row.label ?? "")));
  assert.equal(nextFoxAsk(afterSkipUsed).text, OTHER_K1_LOAN_ASK);
  assert.doesNotMatch(nextFoxAsk(afterSkipUsed).text, /Form 1040/i);
  assert.notEqual(nextDocInvite(afterSkipUsed), "tax_return");
  assert.notEqual(nextDocInvite(afterSkipUsed), "prior_year_return");
  assert.ok(!stillUsefulLabels(afterSkipUsed).includes("K-1 distributions"));
  assert.ok(!stillUsefulLabels(afterSkipUsed).some((label) => /Form 1040|prior-year/i.test(label)));

  const twoK1Names = applyExtractedFields(withEntityDoc(skip1040), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      ...extracted.fields,
      cover_k1_names: "HO; SOY",
      schedule_e_part2_names: "HO; SOY",
    },
  });
  const twoK1Used = resolveProposal(twoK1Names.draft, "accept");
  assert.equal(twoK1Used.facts?.qualifying_income?.value, "2196");
  assert.equal(nextFoxAsk(twoK1Used).text, OTHER_K1_LOAN_ASK);
  assert.ok(!stillUsefulLabels(twoK1Used).some((label) => /HO K-1|SOY K-1/i.test(label)));

  console.log("assert-1120s-entity-return: HO & SOY INC $2,196 · other K-1 Yes/No/Skip before purchase contract");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
