/**
 * Founder 1120-S gold numbers from docs/13-1120s-entity-return.md.
 * No founder PDF bytes on the VM. Harbor 23/24 are smoke only — not ACCEPT.
 * Disclaimer / 8879 / “express or implied” never become Employer.
 * Ordinary is line 21 / Schedule K line 1. Officer wages stay outside ordinary.
 * Skip-1040 on SE still asks for the business return.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { classifyPageByFormHeader } from "../lib/docs/formHeader";
import { junkEmployerName, loudEntityReturnFromPrintedLines, loudWageFromPrintedLines } from "../lib/docs/printedSample";
import {
  applyExtractedFields,
  BUSINESS_RETURN_ASK,
  docInviteBlocksLooksRight,
  extractClassFromFilename,
  skipCurrentInvite,
} from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal } from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import { leftoverUseThisOnOlderTurns, sealStoredFoxThread } from "../components/fox/liveCoupon";
import { nextFoxAsk, previewFacts, workspacePromptCopy } from "../components/fox/workspace";
import { monthlyQualifyingFromExtract } from "../components/fox/qualifyingIncome";
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

const FOUNDER_1120S_PAGES = [
  [
    "Form 8879-S",
    "IRS e-file Signature Authorization for Form 1120-S",
    "2024",
    "WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED",
    "PIN 12345",
  ],
  [
    "Form 1120-S",
    "U.S. Income Tax Return for an S Corporation",
    "2024",
    "Name of corporation HO & SOY INC",
    "7 Compensation of officers                         96,000",
    "14 Depreciation                                    8,000",
    "21 Ordinary business income (loss)                 52,702",
  ],
  [
    "Schedule K (Form 1120-S)",
    "Shareholders' Pro Rata Share Items",
    "1 Ordinary business income (loss) (page 1, line 21)   52,702",
  ],
];

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

async function main() {
  const doctrine = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "13-1120s-entity-return.md");
  assert.equal(existsSync(doctrine), true, "docs/13-1120s-entity-return.md");
  assert.match(readFileSync(doctrine, "utf8"), /\$4,392/);
  assert.match(readFileSync(doctrine, "utf8"), /Harbor 23 \/ 24 — smoke only/);

  assert.equal(
    classifyPageByFormHeader("Form 8879-S IRS e-file Signature Authorization for Form 1120-S EXPRESS OR IMPLIED"),
    "form_8879",
  );
  assert.equal(
    classifyPageByFormHeader(
      "Form 1120-S U.S. Income Tax Return for an S Corporation Name of corporation HO & SOY INC 21 Ordinary business income 52702",
    ),
    "form_1120s",
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

  const lines = FOUNDER_1120S_PAGES.flat();
  assert.equal(loudWageFromPrintedLines(lines), null, "1120-S is not a paystub");
  const loud = loudEntityReturnFromPrintedLines(lines);
  assert.ok(loud, "loud 1120-S extract");
  assert.equal(loud?.extractClass, "tax_return");
  assert.equal(loud?.fields.return_kind, "1120s");
  assert.equal(loud?.fields.entity_name, "HO & SOY INC");
  assert.equal(loud?.fields.entity_ordinary_income, "52702");
  assert.equal(loud?.fields.officer_compensation, "96000");
  assert.notEqual(loud?.fields.employer_name, "EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED");
  assert.equal(loud?.fields.employer_name, undefined);

  const bytes = multiPagePdf(FOUNDER_1120S_PAGES);
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
  assert.notEqual(extracted.fields.employer_name, "EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED");
  assert.equal(extracted.fields.employer_name, undefined);
  assert.notEqual(extracted.fields.entity_ordinary_income, "96000");

  const computed = monthlyQualifyingFromExtract(seSketch(), "tax_return", extracted.fields);
  assert.equal(computed?.monthly, 4392);
  assert.equal(computed?.basis, "entity");
  assert.match(computed?.methodNote ?? "", /household ordinary/);
  assert.doesNotMatch(computed?.methodNote ?? "", /ordinary \+ dep/);
  assert.equal(computed?.officerCompensation, "96000");
  assert.equal(computed?.entityName, "HO & SOY INC");
  assert.notEqual(extracted.fields.entity_ordinary_income, extracted.fields.officer_compensation);
  assert.notEqual(extracted.fields.entity_depreciation, "8000", "line 14 Depreciation is not a 1084 add-back");

  const strayDep = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    ...extracted.fields,
    entity_depreciation: "8000",
  });
  assert.equal(strayDep?.monthly, 4392, "stray 1120-S depreciation must not steal household ordinary");
  assert.match(strayDep?.methodNote ?? "", /household ordinary/);

  const half = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    ...extracted.fields,
    ownership_percent: "50",
  });
  assert.equal(half?.monthly, 2196);
  assert.match(half?.methodNote ?? "", /per 50% owner/);

  const proposed = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: extracted.fields,
  });
  assert.equal(proposed.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(proposed.draft.pendingProposal?.value, "4392");
  assert.equal(proposed.draft.pendingProposal?.note, SUGGESTED_INCOME_NOTE);
  assert.ok(!proposed.draft.facts?.qualifying_income, "File empty until Use this");
  assert.ok(!proposed.draft.facts?.entity_ordinary_income);
  assert.ok(!proposed.draft.facts?.employer_name);
  assert.ok(
    !previewFacts(proposed.draft).some((fact) => fact.id === "qualifying" && /4,392|4392/.test(fact.value)),
    "qualifying File line stays empty until Use this",
  );

  const ask = workspacePromptCopy("confirm-proposal", proposed.draft);
  assert.match(ask.text, /\$4,392/);
  assert.match(ask.text, /Form 1120-S/);
  assert.match(ask.text, /HO & SOY INC/);
  assert.match(ask.text, /household ordinary/i);
  assert.match(ask.text, /\$96,000/);
  assert.match(ask.text, /wages, not inside ordinary/i);
  assert.match(ask.text, /Suggested qualifying income · not underwritten/);
  assert.doesNotMatch(ask.text, /EXPRESS OR IMPLIED|INCLUDING BUT NOT LIMITED/i);
  assert.ok((ask.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok((ask.actions ?? []).some((item) => item.label === "Change"));

  const used = resolveProposal(proposed.draft, "accept");
  assert.equal(used.facts?.qualifying_income?.value, "4392");
  assert.equal(used.facts?.qualifying_income?.confirmed, true);

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

  console.log("assert-1120s-entity-return: HO & SOY INC $4,392 household ordinary · officer $96,000 wages");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
