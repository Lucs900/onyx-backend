/**
 * First-session Grok page-read slice.
 * Drop → page image → Grok → class schema only → confirm-before-write.
 * Printed Harbor fixtures stay confirm, not unread. Do not invent a paystub PDF.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIRST_SESSION_CLASSES,
  FIRST_SESSION_LOCKED_KEYS,
  LAST_YEAR_FEDERAL_RETURN_ASK,
  LAST_YEAR_RETURN_STILL_USEFUL,
  LAST_YEAR_W2_STILL_USEFUL,
  TAX_RETURN_PAGE_READ_KEYS,
  applyExtractedFields,
  displayFactValue,
  docInviteBlocksLooksRight,
  federalReturnConfirmCopy,
  hasLockedSuggestion,
  transcriptFollowUpAsk,
  transcriptSignalCopy,
  canSpeakDocStamp,
  hasDocStamp,
  transcriptSpeakKey,
  transcriptOfferDone,
  withTranscriptSpoken,
  isBoxNumberAsDollars,
  isFirstSessionClass,
  lockFirstSessionFields,
  lockTaxReturnPageReadFields,
  looksLikeFederalReturnFields,
  looksLikeTaxReturnFields,
  looksLikeTaxReturnPageReadFields,
  taxReturnWrittenOnFile,
  taxReturnStructureValue,
  TAX_RETURN_NAME_FIELD,
  nextDocInvite,
  skipCurrentInvite,
  skipUnreadDoc,
  stillUsefulSection,
  unreadDocOpen,
} from "../components/fox/fileWrite";
import { canLooksRight, proposalAskCopy, resolveProposal, shouldSpeakPendingConfirm } from "../components/fox/completeness";
import { applyLooksRightMotion } from "../components/fox/motion";

import { applyExtractWrite, emptyDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import {
  fieldsFromPrintedLines,
  looksLike1040Transcript,
  loudTranscriptFromPrintedLines,
} from "../lib/docs/printedSample";
import {
  alignThreadEmployerName,
  canSpeakStubExtract,
  replaceTruncatedEmployerName,
  shouldProposeStubExtract,
  applyPayFrequencyAnswer,
  PRIOR_STUB_ASK,
  skipPriorStub,
  skipWageDocs,
  speakEmployerName,
  stubExtractConfirmCopy,
  stubPeriodConfirmOpen,
  WAGE_DOCS_ASK,
  WAGE_STUB_DROP_ASK,
  wageEmploymentFileLine,
  maybeProposeQualifyingFromTaxFile,
} from "../components/fox/qualifyingIncome";
import { FAILED_READ_NOTE, isUnreadNote } from "../lib/docs/accept";
import { classifyAndExtract, FOX_GROK_MODEL, pageImageForGrok, taxReturnPageHint } from "../lib/docs/extract";
import { drawnPageHasInk, renderPdfFirstPage } from "../lib/docs/pdfText";
import {
  amountAskText,
  deskStripActions,
  DOC_INVITE_COPY,
  nextFoxAsk,
  payFrequencyAsk,
  priorStubAsk,
  docReactionAsk,
  previewFacts,
  unreadDocActions,
  workspacePrompt,
  workspacePromptCopy,
} from "../components/fox/workspace";
import {
  applyIdExtractAsk,
  applyTranscriptSignalAsk,
  dropLeftoverAmountAsksForOpenUseThis,
  freezeUsedFoxTurns,
  leftoverSkipOnAskText,
  leftoverSkipOnOlderTurns,
  leftoverSkipOnReceivedLines,
  leftoverUseThisOnOlderTurns,
  liveSkipChipRows,
  sealStoredFoxThread,
  splitLeftoverOfferWithLaterFollowUp,
  withChipsOnlyOnLiveFoxTurn,
  withoutDuplicateHistoryInvite,
  withoutDuplicateReceivedLine,
  withoutDuplicateTranscriptAsk,
  withoutLeftoverDocInvitesAfterTranscript,
  paintThreadActions,
  paintedFoxActions,
  shouldHoldAskForOpenUseThis,
  shouldHoldDocInviteForOpenUseThis,
} from "../components/fox/liveCoupon";
import type { ExtractClass, FoxAction, FoxIntakeDraft, FoxMessage } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const CSTC_STUB_PDF_REL = "scripts/fixtures/28-paystub-cstc-pay-matt-260422.pdf";
export const CSTC_STUB_B64_REL = "scripts/fixtures/28-paystub-cstc-pay-matt-260422.pdf.b64";
export const CSTC_STUB_B64_DIR_REL = "scripts/fixtures/28-paystub-cstc-pay-matt-260422.pdf.b64.d";
/** Founder drop: 20 chunks × ≤4000 chars; total b64 77916 → PDF 58436 bytes. */
export const CSTC_STUB_EXPECTED_CHUNKS = 20;
export const CSTC_STUB_EXPECTED_B64_CHARS = 77916;
export const CSTC_STUB_EXPECTED_PDF_BYTES = 58436;

export const MATT_CSTC_STUB_CANDIDATES = [
  CSTC_STUB_PDF_REL,
  "scripts/fixtures/pay-matt-cstc-260422.pdf",
  "sample-docs/pay-matt-cstc-260422.pdf",
  "scripts/fixtures/PAY-MATT-CSTC-260422.pdf",
  "sample-docs/PAY MATT CSTC 260422.pdf",
];

function isPdfBytes(bytes: Uint8Array) {
  return bytes.length > 80 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

/** Helvetica Form 1040 first page. Same path as the 223,455-byte Combes walk — not a 1×1 PNG. */
function form1040PagePdf(lines: string[]) {
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
  return Buffer.concat(chunks);
}

function placeholderB64(text: string) {
  const t = text.trim();
  return !t || t === "PLACEHOLDER_LOAD_FROM_FILE" || t.startsWith("FILE_CONTENT_FROM_");
}

function assembleCstcStubB64(): string | null {
  const dir = join(root, CSTC_STUB_B64_DIR_REL);
  if (existsSync(dir)) {
    const parts = readdirSync(dir)
      .filter((name) => /^\d+$/.test(name))
      .sort();
    if (parts.length) {
      const text = parts.map((name) => readFileSync(join(dir, name), "utf8")).join("");
      const compact = text.replace(/\s+/g, "");
      const complete =
        parts.length >= CSTC_STUB_EXPECTED_CHUNKS || compact.length >= CSTC_STUB_EXPECTED_B64_CHARS;
      if (complete && !placeholderB64(text) && /^[A-Za-z0-9+/=\s]+$/.test(text)) return text;
    }
  }
  const b64Path = join(root, CSTC_STUB_B64_REL);
  if (!existsSync(b64Path)) return null;
  const text = readFileSync(b64Path, "utf8");
  if (placeholderB64(text) || !/^[A-Za-z0-9+/=\s]+$/.test(text)) return null;
  if (text.replace(/\s+/g, "").length < CSTC_STUB_EXPECTED_B64_CHARS) return null;
  return text;
}

/** Decode founder .b64 / chunk dir to the PDF path. Never writes a substitute. */
export function decodeCstcPaystubFixture(): string | null {
  const pdfPath = join(root, CSTC_STUB_PDF_REL);
  if (existsSync(pdfPath)) {
    const bytes = readFileSync(pdfPath);
    if (isPdfBytes(bytes) && bytes.length >= CSTC_STUB_EXPECTED_PDF_BYTES - 64) return pdfPath;
  }
  const text = assembleCstcStubB64();
  if (!text) return null;
  const buf = Buffer.from(text.replace(/\s+/g, ""), "base64");
  if (!isPdfBytes(buf) || buf.length < CSTC_STUB_EXPECTED_PDF_BYTES - 64) return null;
  writeFileSync(pdfPath, buf);
  return pdfPath;
}

export function mattCstcPaystubPath(): string | null {
  const decoded = decodeCstcPaystubFixture();
  if (decoded) return decoded;
  for (const rel of MATT_CSTC_STUB_CANDIDATES) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const bytes = readFileSync(path);
    if (isPdfBytes(bytes)) return path;
  }
  return null;
}

/** Same bytes Lukasz paperclipped. Do not invent a substitute stub. */
export const ALAMEDA_STUB_SHA256 =
  "e1a59410473c0a6d78d663ccc84a2175d4dd55f83f9b46f21fe70bbad86c028b";
export const ALAMEDA_STUB_EXPECTED_PDF_BYTES = 143369;
export const ALAMEDA_STUB_PDF_REL = "scripts/fixtures/Jan 2 2026 Alameda Health System Pay Stub.pdf";
export const ALAMEDA_STUB_ALIAS_REL = "scripts/fixtures/29-paystub-alameda-health-jan-2-2026.pdf";
export const ALAMEDA_STUB_CANDIDATES = [ALAMEDA_STUB_PDF_REL, ALAMEDA_STUB_ALIAS_REL];

/** Founder paperclip. Byte-exact only — do not invent a substitute transcript. */
export const COMBES_RETURN_SHA256 =
  "7c81b8fd413719e4dfbd71b5f67e356dd2c76367cfc3abab5546d8aaf617ae8b";
export const COMBES_RETURN_EXPECTED_PDF_BYTES = 21319;
export const COMBES_RETURN_PDF_REL = "scripts/fixtures/30-1040-2024-tax-return-combes.pdf";
export const COMBES_RETURN_CANDIDATES = [
  COMBES_RETURN_PDF_REL,
  "scripts/fixtures/2024 Tax Return Combes.pdf",
  "onyx-fixtures/30-1040-2024-tax-return-combes.pdf",
];

export function combesReturnPath(): string | null {
  for (const rel of COMBES_RETURN_CANDIDATES) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const bytes = readFileSync(path);
    if (!isPdfBytes(bytes) || bytes.length !== COMBES_RETURN_EXPECTED_PDF_BYTES) continue;
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest === COMBES_RETURN_SHA256) return path;
  }
  return null;
}

/** Founder walk Form 1040. Byte-exact only — do not invent a substitute 1040. */
export const COMBES_WALK_1040_EXPECTED_PDF_BYTES = 223455;
export const COMBES_WALK_1040_CANDIDATES = [
  "scripts/fixtures/2025 1040 - Combes Allan and Renz.pdf",
  "sample-docs/2025 1040 - Combes Allan and Renz.pdf",
  "onyx-fixtures/2025 1040 - Combes Allan and Renz.pdf",
];

export function combesWalk1040Path(): string | null {
  for (const rel of COMBES_WALK_1040_CANDIDATES) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const bytes = readFileSync(path);
    if (!isPdfBytes(bytes) || bytes.length !== COMBES_WALK_1040_EXPECTED_PDF_BYTES) continue;
    return path;
  }
  return null;
}

/** Founder-stated printed text. Not a substitute PDF. Exemption 06 is not a dependent count. */
export const COMBES_TRANSCRIPT_LINES = [
  "Form 1040 Tax Return Transcript",
  "ALLA & REN ARIA COMB",
  "Report for Tax Period Ending: 12-31-2023",
  "Filing status: Married Taxpayer Filing Joint Return",
  "Dependent 1 Name control: COMB SSN: XXX-XX-3571",
  "Dependent 2 Name control: COMB SSN: XXX-XX-2759",
  "Dependent 3 Name control: COMB SSN: XXX-XX-0886",
  "Dependent 4 Name control: COMB SSN: XXX-XX-4586",
  "Exemption number: 06",
  "Total wages: $356,636.00",
  "Form W-2 wages: $356,636.00",
  "Taxable pension/annuity amount: $45,617.00",
  "Business income or loss (Schedule C): $0.00",
  "Rent/royalty/partnership/estate (Schedule E): -$294,564.00",
];

export function alamedaPaystubPath(): string | null {
  for (const rel of ALAMEDA_STUB_CANDIDATES) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const bytes = readFileSync(path);
    if (!isPdfBytes(bytes) || bytes.length !== ALAMEDA_STUB_EXPECTED_PDF_BYTES) continue;
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest === ALAMEDA_STUB_SHA256) return path;
  }
  return null;
}

export function isBundledWageDocsAsk(text: string) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return (
    /last year.?s W-2 and a (recent )?paystub/i.test(value) ||
    /W-2 and a (recent )?paystub/i.test(value) ||
    (/W-2/i.test(value) && /paystub/i.test(value) && /Skip if you want to type it/i.test(value))
  );
}

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on first-session printed fixtures");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on first-session printed fixtures");
  },
};

function sample(name: string) {
  return readFileSync(join(root, "sample-docs", name));
}

function sketch(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    downPaymentAmount: 240_000,
    valueAsked: true,
    amountAsked: true,
    subjectAddress: "14 Oak Street, San Francisco, CA 94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
  };
}

function noSecrets(fields: Record<string, string>) {
  const blob = JSON.stringify(fields);
  assert.doesNotMatch(blob, /\b\d{3}-\d{2}-\d{4}\b/);
  assert.doesNotMatch(blob, /\bssn\b/i);
  assert.doesNotMatch(blob, /routing/i);
}

async function read(
  name: string,
  hint: ExtractClass | null,
  bytes = sample(name),
) {
  return classifyAndExtract(bytes, "application/pdf", deadVision, hint, name);
}

function confirmEmptyUntilUseThis(
  extractClass: ExtractClass,
  fields: Record<string, string>,
) {
  const proposed = applyExtractedFields(sketch(), {
    extractClass,
    confidence: 0.94,
    fields,
  });
  noSecrets(fields);
  return proposed;
}

async function main() {
  assert.equal(FOX_GROK_MODEL, "grok-3");
  assert.deepEqual([...FIRST_SESSION_CLASSES], [
    "government_id",
    "w2",
    "paystub",
    "bank_statement",
    "purchase_contract",
    "tax_return",
  ]);
  assert.ok(isFirstSessionClass("w2"));
  assert.equal(isFirstSessionClass("mortgage_statement"), false);

  const crossed = lockFirstSessionFields("paystub", {
    employer_name: "CSTC",
    medicare_wages: "36460.08",
    purchase_price: "800000",
    full_name: "Matthew Castaneda",
    ssn: "123-45-6789",
  });
  assert.equal(crossed.employer_name, "CSTC");
  assert.equal(crossed.medicare_wages, undefined);
  assert.equal(crossed.purchase_price, undefined);
  assert.equal(crossed.full_name, undefined);
  assert.deepEqual(lockFirstSessionFields("mortgage_statement", { unpaid_principal: "1" }), {});

  const id = await read("01-ca-id-jordan-hale.pdf", "government_id");
  assert.equal(id.extractClass, "government_id");
  assert.notEqual(id.failed, true);
  assert.match(id.fields.full_name ?? "", /Jordan Hale/i);
  assert.doesNotMatch(JSON.stringify(id.fields), /[A-Z]\d{7}/);
  const idCard = confirmEmptyUntilUseThis("government_id", { full_name: id.fields.full_name ?? "" });
  assert.notEqual(idCard.draft.contact.fullName?.confirmed, true);
  const idUsed = resolveProposal(idCard.draft, "accept");
  assert.match(idUsed.contact.fullName?.value ?? idUsed.borrowerName ?? "", /Jordan Hale/i);

  const adp = join(root, "scripts/fixtures/27-w2-2025-adp-matthew-castaneda.pdf");
  assert.ok(existsSync(adp), "ADP W-2 fixture missing");
  const w2 = await classifyAndExtract(
    readFileSync(adp),
    "application/pdf",
    deadVision,
    "w2",
    "27-w2-2025-adp-matthew-castaneda.pdf",
  );
  assert.equal(w2.extractClass, "w2");
  const box5 = w2.fields.medicare_wages ?? w2.fields.box5 ?? "";
  assert.ok(!isBoxNumberAsDollars(box5));
  assert.match(box5, /36460\.08/);
  assert.match(w2.fields.employer_name ?? "", /Comprehensive Skills Training/i);

  const stub = await read("07-paystub-biweekly-loud.pdf", "paystub");
  assert.equal(stub.extractClass, "paystub");
  assert.notEqual(stub.failed, true);
  assert.match(stub.fields.employer_name ?? "", /Harbor Pacific Design Inc/i);
  assert.ok(stub.fields.gross_period || stub.fields.pay_period_end);
  confirmEmptyUntilUseThis("paystub", {
    employer_name: stub.fields.employer_name ?? "",
    gross_period: stub.fields.gross_period ?? "",
    pay_period_end: stub.fields.pay_period_end ?? "",
    pay_frequency: stub.fields.pay_frequency ?? "",
    ytd_gross: stub.fields.ytd_gross ?? "",
  });

  const bank = await read("05-bank-statement-pacific-coast-jul-2026.pdf", "bank_statement");
  assert.equal(bank.extractClass, "bank_statement");
  assert.notEqual(bank.failed, true);
  assert.ok(bank.fields.institution || bank.fields.ending_balance);
  assert.notEqual(bank.fields.ending_balance, "7");
  assert.doesNotMatch(JSON.stringify(bank.fields), /\b\d{8,17}\b/);

  const contract = await read("02-purchase-contract-valencia.pdf", "purchase_contract");
  assert.equal(contract.extractClass, "purchase_contract");
  assert.notEqual(contract.failed, true);
  assert.match(contract.fields.property_address ?? "", /1840 Valencia/i);
  assert.doesNotMatch(contract.fields.property_address ?? "", /^94123$/);
  assert.ok(contract.fields.purchase_price);

  const tax = await read("11-1040-schedule-c-2025-hale-design.pdf", "tax_return");
  assert.equal(tax.extractClass, "tax_return");
  assert.notEqual(tax.failed, true);
  assert.ok(
    tax.fields.schedule_c_net_profit ||
      tax.fields.k1_ordinary_income ||
      tax.fields.return_kind,
  );

  const unread = await read(
    "government-id-no-text-layer.pdf",
    "other",
    readFileSync(join(root, "scripts/fixtures/government-id-no-text-layer.pdf")),
  );
  assert.equal(unread.failed, true);
  assert.deepEqual(unread.fields, {});

  const stubConfirm = applyExtractedFields(sketch(), {
    extractClass: "paystub",
    confidence: 0.94,
    fields: {
      employer_name: "Comprehensive Skills Training Center",
      pay_period_end: "04/22/2026",
      gross_period: "1806.67",
      ytd_gross: "14453.36",
    },
  });
  assert.ok(stubConfirm.draft.pendingProposal, "paystub File stays empty until Use this");
  assert.match(JSON.stringify(stubConfirm.draft.pendingProposal), /1806\.67/);
  assert.equal(displayFactValue("gross_period", "1806.67"), "$1,806.67");
  assert.notEqual(stubConfirm.draft.facts?.gross_period?.confirmed, true);

  const afterW2 = resolveProposal(
    applyExtractedFields(sketch(), {
      extractClass: "w2",
      confidence: 0.94,
      fields: {
        employer_name: "Comprehensive Skills Training Center",
        tax_year: "2025",
        medicare_wages: "36460.08",
        box5: "36460.08",
      },
    }).draft,
    "accept",
  );
  assert.equal((afterW2.employmentHistory ?? []).length, 1);
  assert.match(afterW2.employmentHistory?.[0]?.label ?? "", /Comprehensive Skills Training Center/);
  const stubFields = {
    employer_name: "Comprehensive Skills Training Cente",
    pay_period_end: "04/22/2026",
    gross_period: "1806.67",
    ytd_gross: "14453.36",
  };
  assert.equal(canSpeakStubExtract(afterW2, stubFields), true);
  const stubAfterW2 = applyExtractedFields(afterW2, {
    extractClass: "paystub",
    confidence: 0.94,
    fields: stubFields,
  });
  assert.ok(stubAfterW2.draft.pendingProposal, "after W-2, period pay confirms without frequency");
  assert.match(JSON.stringify(stubAfterW2.draft.pendingProposal), /1806\.67/);
  assert.notEqual(stubAfterW2.draft.facts?.gross_period?.confirmed, true);
  assert.equal(shouldSpeakPendingConfirm(stubAfterW2.draft), true);
  assert.equal(nextDocInvite(stubAfterW2.draft), null);
  assert.equal(workspacePrompt(stubAfterW2.draft), "confirm-proposal");
  const stubConfirmAsk = nextFoxAsk(stubAfterW2.draft);
  assert.match(stubConfirmAsk.text, /Period \$1,806\.67/);
  assert.match(stubConfirmAsk.text, /Comprehensive Skills Training Center/);
  assert.doesNotMatch(stubConfirmAsk.text, /Cente\./);
  assert.doesNotMatch(stubConfirmAsk.text, /government ID/i);
  assert.deepEqual(
    (stubConfirmAsk.actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  const idWhileOpen = workspacePromptCopy("documents", stubAfterW2.draft);
  assert.match(idWhileOpen.text, /Period \$1,806\.67/);
  assert.doesNotMatch(idWhileOpen.text, /government ID/i);
  assert.equal(
    shouldHoldDocInviteForOpenUseThis(
      stubConfirmAsk.text,
      stubConfirmAsk.actions,
      DOC_INVITE_COPY.government_id,
    ),
    true,
  );
  const stubUsed = resolveProposal(stubAfterW2.draft, "accept");
  assert.equal((stubUsed.employmentHistory ?? []).length, 1, "Use this must keep one CSTC Employment row");
  assert.match(stubUsed.employmentHistory?.[0]?.label ?? "", /Comprehensive Skills Training Center/);
  assert.doesNotMatch(stubUsed.employmentHistory?.[0]?.label ?? "", /Cente$/);
  assert.equal(stubUsed.facts?.employer_name?.value, "Comprehensive Skills Training Center");
  assert.equal(stubUsed.facts?.gross_period?.confirmed, true);
  assert.equal(stubUsed.facts?.gross_period?.value, "1806.67");
  assert.match(wageEmploymentFileLine(afterW2), /Box 5 \$36,460\.08/);
  assert.doesNotMatch(wageEmploymentFileLine(afterW2), /Period/);
  assert.equal(
    wageEmploymentFileLine(stubUsed),
    "Comprehensive Skills Training Center, Box 5 $36,460.08, Period $1,806.67",
  );
  assert.ok(
    previewFacts(stubUsed).some(
      (fact) =>
        fact.label === "Employment" &&
        /Comprehensive Skills Training Center/.test(fact.value) &&
        /Box 5 \$36,460\.08/.test(fact.value) &&
        /Period \$1,806\.67/.test(fact.value),
    ),
  );
  const useThisChips: FoxAction[] = [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
  const stubConfirmThread: FoxMessage[] = [
    {
      id: "w2",
      role: "fox",
      text: "Box 5 $36,460.08. Comprehensive Skills Training Center. Use this?",
      actions: useThisChips,
    },
    {
      id: "stub",
      role: "fox",
      text: stubConfirmAsk.text,
      actions: useThisChips,
    },
  ];
  assert.doesNotMatch(nextFoxAsk(stubUsed).text, /Period \$1,806\.67/);
  assert.match(nextFoxAsk(stubUsed).text, /prior paystub/i);
  assert.doesNotMatch(nextFoxAsk(stubUsed).text, /government ID|Form 1040|How often is this paycheck/i);
  const idAfterStub = applyIdExtractAsk(stubConfirmThread, {
    id: "prior",
    role: "fox",
    text: priorStubAsk().text,
    actions: priorStubAsk().actions,
  });
  assert.match(idAfterStub[idAfterStub.length - 1]?.text ?? "", /prior paystub/i);
  assert.equal(leftoverUseThisOnOlderTurns(idAfterStub, stubUsed), 0);
  const usedW2 = idAfterStub.find((item) => item.id === "w2");
  const usedStub = idAfterStub.find((item) => item.id === "stub");
  assert.equal(usedW2?.actions, undefined);
  assert.equal(usedStub?.actions, undefined);
  assert.doesNotMatch(usedW2?.text ?? "", /Use this\?/);
  assert.doesNotMatch(usedStub?.text ?? "", /Use this\?/);
  assert.match(usedStub?.text ?? "", /Period \$1,806\.67/);
  const usedAfterClient = freezeUsedFoxTurns([
    {
      id: "w2",
      role: "fox",
      text: "Box 5 $36,460.08. Comprehensive Skills Training Center. Use this?",
      actions: useThisChips,
    },
    { id: "you-w2", role: "client", text: "Use this" },
    {
      id: "stub",
      role: "fox",
      text: stubConfirmAsk.text,
      actions: useThisChips,
    },
    { id: "you-stub", role: "client", text: "Use this" },
  ]);
  assert.equal(usedAfterClient.find((item) => item.id === "w2")?.actions, undefined);
  assert.equal(usedAfterClient.find((item) => item.id === "stub")?.actions, undefined);
  assert.doesNotMatch(usedAfterClient.find((item) => item.id === "w2")?.text ?? "", /Use this\?/);
  assert.doesNotMatch(usedAfterClient.find((item) => item.id === "stub")?.text ?? "", /Use this\?/);
  assert.equal(
    shouldHoldDocInviteForOpenUseThis(
      usedAfterClient.find((item) => item.id === "stub")?.text,
      usedAfterClient.find((item) => item.id === "stub")?.actions,
      DOC_INVITE_COPY.government_id,
    ),
    false,
    "leftover: ID still held after Use this closed the stub confirm",
  );
  assert.equal(
    replaceTruncatedEmployerName(
      "Comprehensive Skills Training Cente. Period $1,806.67. Use this?",
      "Comprehensive Skills Training Center",
    ),
    "Comprehensive Skills Training Center. Period $1,806.67. Use this?",
  );
  const aligned = alignThreadEmployerName(
    [
      {
        id: "cente",
        role: "fox",
        text: "Comprehensive Skills Training Cente. Period $1,806.67. Use this?",
        actions: useThisChips,
      },
    ],
    stubUsed,
  );
  assert.match(aligned[0]?.text ?? "", /Comprehensive Skills Training Center/);
  assert.doesNotMatch(aligned[0]?.text ?? "", /Cente\./);

  const unreadStubAsk = workspacePromptCopy("documents", {
    ...afterW2,
    documents: [
      {
        slot: "paystubs",
        name: "28-paystub-cstc-pay-matt-260422.pdf",
        type: "application/pdf",
        size: 58436,
        receivedAt: "2026-09-08T00:00:00.000Z",
        status: "received",
        extractClass: "paystub",
        note: FAILED_READ_NOTE,
      },
    ],
  });
  assert.equal(unreadStubAsk.text, FAILED_READ_NOTE);
  assert.deepEqual(
    (unreadStubAsk.actions ?? []).map((item) => item.label),
    unreadDocActions().map((item) => item.label),
  );
  assert.ok((unreadStubAsk.actions ?? []).some((item) => item.label === "Skip"));

  const alamedaFields = {
    employer_name: "Alameda Health System",
    pay_period_end: "08/15/2026",
    gross_period: "16824.30",
    overtime: "850.00",
  };
  const wageDocsSketch = {
    ...sketch(),
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    propertyType: "house",
    propertyTypeAsked: true,
  };
  assert.equal(workspacePrompt(wageDocsSketch), "wage-docs");
  assert.equal(WAGE_DOCS_ASK, "Drop last year’s W-2. Skip if you want to type it.");
  assert.doesNotMatch(WAGE_DOCS_ASK, /paystub/i);
  assert.doesNotMatch(WAGE_STUB_DROP_ASK, /W-2/i);
  assert.equal(isBundledWageDocsAsk(WAGE_DOCS_ASK), false, "W-2 ask must be one file, not W-2+stub");
  assert.equal(
    isBundledWageDocsAsk("Drop last year’s W-2 and a recent paystub. Skip if you want to type it."),
    true,
  );
  assert.equal(workspacePromptCopy("wage-docs", wageDocsSketch).text, WAGE_DOCS_ASK);
  assert.equal(isBundledWageDocsAsk(workspacePromptCopy("wage-docs", wageDocsSketch).text), false);
  assert.ok(
    (workspacePromptCopy("wage-docs", wageDocsSketch).actions ?? []).some(
      (item) => item.capture?.field === "skip-wage-docs",
    ),
  );
  const skippedW2 = skipWageDocs(wageDocsSketch);
  assert.equal(skippedW2.wageStubAsked, false, "Skip W-2 must not skip the stub");
  assert.ok((skippedW2.skippedClasses ?? []).includes("w2"));
  assert.equal(nextDocInvite(skippedW2), "paystub");
  assert.equal(workspacePrompt(skippedW2), "documents");
  assert.match(nextFoxAsk(skippedW2).text, /paystub/i);
  assert.doesNotMatch(nextFoxAsk(skippedW2).text, /W-2/i);
  assert.doesNotMatch(nextFoxAsk(skippedW2).text, /government ID/i);
  assert.equal(isBundledWageDocsAsk(nextFoxAsk(skippedW2).text), false);
  const usefulAfterSkipW2 = (stillUsefulSection(skippedW2)?.items ?? []).map((item) => item.label);
  assert.ok(
    usefulAfterSkipW2.some((label) => /W-2/i.test(label)),
    `Still useful must keep skipped W-2 — ${usefulAfterSkipW2.join(" · ")}`,
  );
  assert.equal(stubPeriodConfirmOpen(skippedW2), true, "Skip W-2 must keep the readable stub Period path");
  assert.equal(canSpeakStubExtract(skippedW2, alamedaFields), true);
  assert.equal(shouldProposeStubExtract(skippedW2, "paystub", alamedaFields), true);
  const alamedaAfterSkip = applyExtractedFields(skippedW2, {
    extractClass: "paystub",
    confidence: 0.94,
    fields: alamedaFields,
  });
  assert.equal(alamedaAfterSkip.draft.awaitingPayFrequency, false, "readable stub must not ask frequency first");
  assert.ok(alamedaAfterSkip.draft.pendingProposal, "Skip W-2 still proposes Period");
  assert.equal(shouldSpeakPendingConfirm(alamedaAfterSkip.draft), true);
  assert.equal(workspacePrompt(alamedaAfterSkip.draft), "confirm-proposal");
  assert.equal(speakEmployerName("ALAMEDA HEALTH SYSTEM"), "Alameda Health System");
  assert.equal(speakEmployerName("Alameda Health System"), "Alameda Health System");
  assert.equal(
    speakEmployerName("Comprehensive Skills Training Center"),
    "Comprehensive Skills Training Center",
  );
  assert.equal(
    stubExtractConfirmCopy("ALAMEDA HEALTH SYSTEM", 16824.3, "", 0),
    "Alameda Health System. Period $16,824.30. Use this?",
  );
  assert.equal(
    nextFoxAsk(alamedaAfterSkip.draft).text,
    "Alameda Health System. Period $16,824.30. Use this?",
  );
  assert.doesNotMatch(nextFoxAsk(alamedaAfterSkip.draft).text, /How often|paycheck|two-year OT/i);
  assert.equal((alamedaAfterSkip.draft.employmentHistory ?? []).length, 0);
  assert.equal(alamedaAfterSkip.draft.facts?.employer_name, undefined);
  assert.equal(alamedaAfterSkip.draft.facts?.gross_period, undefined);
  assert.equal(wageEmploymentFileLine(alamedaAfterSkip.draft), "");
  const alamedaPreview = previewFacts(alamedaAfterSkip.draft);
  assert.ok(
    alamedaPreview.every(
      (fact) =>
        !/Alameda/i.test(fact.value) &&
        !/Period \$16,824\.30/.test(fact.value) &&
        fact.label !== "Employment" &&
        fact.label !== "Employer" &&
        fact.label !== "Pay",
    ),
    "File must stay empty until Use this — " +
      alamedaPreview.map((fact) => `${fact.label}=${fact.value}`).join(" · "),
  );
  assert.ok(!alamedaPreview.some((fact) => /OT \$/.test(fact.value)));
  const refiWhileConfirm = {
    ...alamedaAfterSkip.draft,
    productIntent: "refinance" as const,
    loanAmountValue: 500_000,
    propertyValueAmount: undefined,
    valueAsked: false,
  };
  assert.equal(workspacePrompt(refiWhileConfirm), "confirm-proposal");
  assert.equal(nextFoxAsk(refiWhileConfirm).text, "Alameda Health System. Period $16,824.30. Use this?");
  assert.doesNotMatch(nextFoxAsk(refiWhileConfirm).text, /property value/i);
  assert.equal(amountAskText(refiWhileConfirm), "");
  assert.equal(
    shouldHoldAskForOpenUseThis(
      nextFoxAsk(refiWhileConfirm).text,
      nextFoxAsk(refiWhileConfirm).actions,
      "What’s the property value?",
    ),
    true,
  );
  const refiValueOnFile = {
    ...alamedaAfterSkip.draft,
    productIntent: "refinance" as const,
    loanAmountValue: 320_000,
    propertyValueAmount: 400_000,
    valueAsked: true,
    amountAsked: true,
    correcting: null,
    correctingLine: null,
  };
  assert.equal(workspacePrompt(refiValueOnFile), "confirm-proposal");
  assert.equal(nextFoxAsk(refiValueOnFile).text, "Alameda Health System. Period $16,824.30. Use this?");
  assert.doesNotMatch(nextFoxAsk(refiValueOnFile).text, /property value/i);
  assert.equal(amountAskText(refiValueOnFile), "");
  assert.doesNotMatch(amountAskText({ ...refiValueOnFile, pendingProposal: null }), /property value/i);
  const leftoverValueAsk: FoxMessage[] = [
    {
      id: "value-ask",
      role: "fox",
      text: "What’s the property value?",
    },
    {
      id: "stub-confirm",
      role: "fox",
      text: nextFoxAsk(refiValueOnFile).text,
      actions: nextFoxAsk(refiValueOnFile).actions,
    },
  ];
  assert.equal(dropLeftoverAmountAsksForOpenUseThis(leftoverValueAsk).length, 1);
  assert.match(dropLeftoverAmountAsksForOpenUseThis(leftoverValueAsk)[0]?.text ?? "", /Use this\?/);
  const alamedaUsed = resolveProposal(alamedaAfterSkip.draft, "accept");
  assert.equal((alamedaUsed.employmentHistory ?? []).length, 1, "Use this writes one Employment row");
  assert.match(alamedaUsed.employmentHistory?.[0]?.label ?? "", /Alameda Health System/);
  assert.equal(
    wageEmploymentFileLine(alamedaUsed),
    "Alameda Health System, Period $16,824.30",
  );
  assert.doesNotMatch(wageEmploymentFileLine(alamedaUsed), /\bOT\b/);
  assert.equal(alamedaUsed.facts?.gross_period?.confirmed, true);
  assert.equal(alamedaUsed.facts?.gross_period?.value, "16824.30");
  const writtenStubAt = "2026-09-11T18:00:00.000Z";
  const writtenStubName = "Jan 2 2026 Alameda Health System Pay Stub.pdf";
  loadIntakeDraft({
    ...alamedaUsed,
    documents: [
      ...(alamedaUsed.documents ?? []),
      {
        slot: "paystubs",
        name: writtenStubName,
        type: "application/pdf",
        size: 10000,
        receivedAt: writtenStubAt,
        status: "extracted",
        extractClass: "paystub",
      },
    ],
  });
  const lateEmptyStub = applyExtractWrite(writtenStubAt, writtenStubName, {
    extractClass: "paystub",
    confidence: 0.2,
    fields: {},
  });
  assert.ok(
    !lateEmptyStub.quietLines.includes(FAILED_READ_NOTE),
    "Stub already written must not stamp could not read after Period wrote",
  );
  assert.equal(lateEmptyStub.draft.facts?.gross_period?.value, "16824.30");
  assert.equal(
    wageEmploymentFileLine(lateEmptyStub.draft),
    "Alameda Health System, Period $16,824.30",
  );
  assert.ok(
    !previewFacts(lateEmptyStub.draft).some((fact) => /could not read/i.test(fact.value)),
    "Written stub Docs must not say could not read — " +
      previewFacts(lateEmptyStub.draft)
        .map((fact) => `${fact.label}=${fact.value}`)
        .join(" · "),
  );
  const writtenStub = lateEmptyStub.draft.documents.find((doc) => doc.name === writtenStubName);
  assert.equal(writtenStub?.status, "extracted");
  assert.ok(!isUnreadNote(writtenStub?.note));
  assert.equal(alamedaUsed.awaitingPayFrequency, true, "one stub without printed frequency asks once");
  assert.equal(alamedaUsed.facts?.pay_frequency, undefined);
  const alamedaPriorAsk = nextFoxAsk(alamedaUsed);
  assert.equal(alamedaPriorAsk.text, PRIOR_STUB_ASK);
  assert.equal(alamedaPriorAsk.text, priorStubAsk().text);
  assert.match(alamedaPriorAsk.text, /prior paystub/i);
  assert.match(alamedaPriorAsk.text, /how often you are paid/i);
  assert.doesNotMatch(alamedaPriorAsk.text, /government ID|Form 1040|How often is this paycheck/i);
  assert.equal(nextDocInvite(alamedaUsed), null);
  assert.equal(workspacePrompt(alamedaUsed), "prior-stub");
  assert.deepEqual(
    (alamedaPriorAsk.actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );
  const alamedaConfirmThread: FoxMessage[] = [
    {
      id: "alameda-confirm",
      role: "fox",
      text: "Alameda Health System. Period $16,824.30. Use this?",
      actions: [
        { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
        { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
      ],
    },
    { id: "you-alameda", role: "client", text: "Use this" },
  ];
  const alamedaAfterTap = applyIdExtractAsk(alamedaConfirmThread, {
    id: "prior",
    role: "fox",
    text: alamedaPriorAsk.text,
    actions: alamedaPriorAsk.actions,
  });
  assert.equal(leftoverUseThisOnOlderTurns(alamedaAfterTap, alamedaUsed), 0);
  assert.equal(alamedaAfterTap.find((item) => item.id === "alameda-confirm")?.actions, undefined);
  assert.doesNotMatch(alamedaAfterTap.find((item) => item.id === "alameda-confirm")?.text ?? "", /Use this\?/);
  assert.equal(alamedaAfterTap[alamedaAfterTap.length - 1]?.text, PRIOR_STUB_ASK);
  assert.deepEqual(
    (alamedaAfterTap[alamedaAfterTap.length - 1]?.actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );
  assert.ok(
    !(alamedaAfterTap[alamedaAfterTap.length - 1]?.actions ?? []).some((item) => item.label === "Use this"),
  );
  const leftoverStubPaint = paintedFoxActions(
    alamedaAfterTap.find((item) => item.id === "alameda-confirm")!,
    alamedaUsed,
    false,
  );
  assert.equal(leftoverStubPaint, undefined);
  assert.deepEqual(
    paintThreadActions([
      { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
      { id: "upload-id", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } },
      { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
    ]).map((item) => item.label),
    ["Upload this", "Skip"],
  );
  assert.equal(docInviteBlocksLooksRight(alamedaUsed), true, "Looks right waits on the prior stub");
  assert.equal(canLooksRight(alamedaUsed), false);
  const alamedaAfterSkipPrior = skipPriorStub(alamedaUsed);
  assert.equal(alamedaAfterSkipPrior.priorStubAsked, true);
  assert.equal(workspacePrompt(alamedaAfterSkipPrior), "pay-frequency");
  const alamedaFreqAsk = nextFoxAsk(alamedaAfterSkipPrior);
  assert.equal(alamedaFreqAsk.text, payFrequencyAsk().text);
  assert.match(alamedaFreqAsk.text, /How often is this paycheck/i);
  assert.doesNotMatch(alamedaFreqAsk.text, /government ID|Form 1040/i);
  assert.deepEqual(
    (alamedaFreqAsk.actions ?? []).map((item) => item.label),
    ["Weekly", "Biweekly", "Semi-monthly", "Monthly"],
  );
  const alamedaAfterFreq = applyPayFrequencyAnswer(alamedaAfterSkipPrior, "biweekly");
  assert.equal(alamedaAfterFreq.awaitingPayFrequency, false);
  assert.equal(alamedaAfterFreq.facts?.pay_frequency?.value, "biweekly");
  assert.equal(alamedaAfterFreq.incomeType.value, "w2", "frequency write does not flip income type");
  assert.equal(alamedaAfterFreq.pendingProposal?.field, "qualifying_income");
  assert.equal(alamedaAfterFreq.pendingProposal?.value, "36453");
  assert.equal(alamedaAfterFreq.facts?.qualifying_income, undefined, "QI stays off File until Use this");
  assert.equal(alamedaAfterFreq.facts?.paystub_monthly, undefined, "monthly stays off File until Use this");
  assert.doesNotMatch(wageEmploymentFileLine(alamedaAfterFreq), /36,453|36453/);
  assert.ok(
    previewFacts(alamedaAfterFreq).every(
      (fact) => !/36,453|36453/.test(fact.value) && fact.label !== "Qualifying income",
    ),
    "Structure empty of $36,453 until Use this — " +
      previewFacts(alamedaAfterFreq)
        .map((fact) => `${fact.label}=${fact.value}`)
        .join(" · "),
  );
  const alamedaQiAsk = nextFoxAsk(alamedaAfterFreq);
  assert.match(alamedaQiAsk.text, /\$36,453/);
  assert.deepEqual(
    (alamedaQiAsk.actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  assert.equal(nextDocInvite(alamedaAfterFreq), null);
  assert.notEqual(nextDocInvite(alamedaAfterFreq), "government_id");
  assert.notEqual(nextDocInvite(alamedaAfterFreq), "bank_statement");
  assert.doesNotMatch(alamedaQiAsk.text, /government ID/i);
  const alamedaAfterMonthly = resolveProposal(alamedaAfterFreq, "accept");
  assert.equal(alamedaAfterMonthly.facts?.qualifying_income?.value, "36453");
  assert.ok(
    previewFacts(alamedaAfterMonthly).some(
      (fact) => fact.label === "Qualifying income" && /36,453/.test(fact.value),
    ),
    "Use this writes QI — " +
      previewFacts(alamedaAfterMonthly)
        .map((fact) => `${fact.label}=${fact.value}`)
        .join(" · "),
  );
  assert.equal(docInviteBlocksLooksRight(alamedaAfterMonthly), false, "Do not hold Looks right for 1040s");
  assert.equal(canLooksRight(alamedaAfterMonthly), true, "Looks right after the income story is on the notepad");
  assert.equal(workspacePrompt(alamedaAfterMonthly), "review");
  const alamedaReview = nextFoxAsk(alamedaAfterMonthly);
  assert.equal(alamedaReview.text, "These numbers look right?");
  assert.doesNotMatch(alamedaReview.text, /The file looks like this/);
  assert.deepEqual(
    (alamedaReview.actions ?? []).map((item) => item.label),
    ["Looks right", "Needs a correction"],
  );
  assert.ok(
    !(alamedaReview.actions ?? []).some((item) => /^(Proceed|Not yet|Upload more)$/.test(item.label)),
    "Notepad check is not a finish",
  );
  const alamedaLooks = applyLooksRightMotion(alamedaAfterMonthly);
  assert.equal(nextDocInvite(alamedaLooks), "government_id");
  assert.match(nextFoxAsk(alamedaLooks).text, /government ID/i);
  assert.match(nextFoxAsk(alamedaLooks).text, /name on it/);
  assert.deepEqual(
    (nextFoxAsk(alamedaLooks).actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );
  assert.ok(
    !(nextFoxAsk(alamedaLooks).actions ?? []).some((item) => /^(Proceed|Not yet|Upload more)$/.test(item.label)),
    "ID invite is not a finish",
  );
  const alamedaAfterIdSkip = skipCurrentInvite(alamedaLooks);
  assert.equal(nextDocInvite(alamedaAfterIdSkip), "tax_return");
  assert.notEqual(nextDocInvite(alamedaAfterIdSkip), "prior_year_return");
  assert.notEqual(nextDocInvite(alamedaAfterIdSkip), "bank_statement");
  assert.equal(nextFoxAsk(alamedaAfterIdSkip).text, LAST_YEAR_FEDERAL_RETURN_ASK);
  assert.match(nextFoxAsk(alamedaAfterIdSkip).text, /so review has the return/i);
  assert.doesNotMatch(nextFoxAsk(alamedaAfterIdSkip).text, /two recent statements|2024 return/i);
  const usefulAfterId = (stillUsefulSection(alamedaAfterIdSkip)?.items ?? []).map((item) => item.label);
  assert.ok(
    usefulAfterId.some((label) => /W-2/i.test(label)),
    `Still useful must keep skipped W-2 — ${usefulAfterId.join(" · ")}`,
  );
  assert.ok(
    usefulAfterId.some((label) => /return|Form 1040/i.test(label)),
    `Still useful holds last year’s 1040 — ${usefulAfterId.join(" · ")}`,
  );
  assert.deepEqual(
    (nextFoxAsk(alamedaAfterIdSkip).actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );
  assert.ok(
    !(nextFoxAsk(alamedaAfterIdSkip).actions ?? []).some((item) => /^(Proceed|Not yet|Upload more)$/.test(item.label)),
    "1040 invite is not a finish",
  );

  const unread1040At = "2026-09-10T21:00:00.000Z";
  const unread1040Name = "2025 1040 - Combes Allan and Renz.pdf";
  loadIntakeDraft({
    ...alamedaAfterIdSkip,
    documents: [
      ...alamedaAfterIdSkip.documents,
      {
        slot: "other",
        name: unread1040Name,
        type: "application/pdf",
        size: 223455,
        receivedAt: unread1040At,
        status: "received",
        extractClass: "tax_return",
      },
    ],
  });
  const unreadAfterLooks = applyExtractWrite(unread1040At, unread1040Name, {
    extractClass: "tax_return",
    confidence: 0.2,
    fields: {},
  });
  assert.ok(unreadAfterLooks.quietLines.includes(FAILED_READ_NOTE), "unread 1040 invents nothing");
  assert.ok(!unreadAfterLooks.draft.pendingProposal);
  assert.equal(unreadAfterLooks.draft.facts?.qualifying_income?.value, "36453");
  assert.equal(unreadAfterLooks.draft.facts?.tax_year, undefined);
  assert.ok(unreadDocOpen(unreadAfterLooks.draft));
  assert.equal(nextFoxAsk(unreadAfterLooks.draft).text, FAILED_READ_NOTE);
  assert.deepEqual(
    (nextFoxAsk(unreadAfterLooks.draft).actions ?? []).map((item) => item.label),
    ["Skip", "Proceed", "Not yet", "Upload more", "Request human"],
    "After unread 1040, finish chips stay",
  );
  const usefulUnread1040 = (stillUsefulSection(unreadAfterLooks.draft)?.items ?? []).map(
    (item) => item.label,
  );
  assert.ok(
    usefulUnread1040.includes(LAST_YEAR_RETURN_STILL_USEFUL),
    `Unread 1040 must not clear Form 1040 — ${usefulUnread1040.join(" · ")}`,
  );
  const unread1040Skip = skipUnreadDoc(unreadAfterLooks.draft);
  assert.ok(!unreadDocOpen(unread1040Skip), "Skip dismisses unread");
  const usefulUnreadSkip = (stillUsefulSection(unread1040Skip)?.items ?? []).map(
    (item) => item.label,
  );
  assert.ok(
    usefulUnreadSkip.includes(LAST_YEAR_RETURN_STILL_USEFUL),
    `Skip on unread must keep Form 1040 — ${usefulUnreadSkip.join(" · ")}`,
  );
  assert.deepEqual(
    usefulUnreadSkip.slice(0, 3),
    ["Government ID", LAST_YEAR_W2_STILL_USEFUL, LAST_YEAR_RETURN_STILL_USEFUL],
    `Skip-on-unread Still useful head — ${usefulUnreadSkip.join(" · ")}`,
  );
  assert.ok(
    !usefulUnreadSkip.slice(0, 3).includes("Mortgage statement"),
    `Mortgage waits behind the head — ${usefulUnreadSkip.join(" · ")}`,
  );
  assert.equal(unread1040Skip.facts?.qualifying_income?.value, "36453");
  assert.deepEqual(
    (nextFoxAsk(unread1040Skip).actions ?? []).map((item) => item.label),
    ["Proceed", "Not yet", "Upload more", "Request human"],
    "After Skip on unread, finish chips stay",
  );
  const refiAfterId = applyLooksRightMotion({
    ...alamedaAfterMonthly,
    productIntent: "refinance",
    cashOut: false,
  });
  const usefulRefi = (stillUsefulSection(refiAfterId)?.items ?? []).map((item) => item.label);
  const idAt = usefulRefi.indexOf("Government ID");
  const w2At = usefulRefi.indexOf(LAST_YEAR_W2_STILL_USEFUL);
  const retAt = usefulRefi.indexOf(LAST_YEAR_RETURN_STILL_USEFUL);
  const mortgageAt = usefulRefi.indexOf("Mortgage statement");
  assert.ok(idAt === 0, `Refi head is Government ID — ${usefulRefi.join(" · ")}`);
  assert.ok(w2At === 1, `Last year’s W-2 waits after ID — ${usefulRefi.join(" · ")}`);
  assert.ok(retAt === 2, `Form 1040 waits after last year’s W-2 — ${usefulRefi.join(" · ")}`);
  assert.ok(
    mortgageAt < 0 || (mortgageAt > idAt && mortgageAt > w2At && mortgageAt > retAt),
    `Mortgage statement waits behind ID · last year’s W-2 · Form 1040 — ${usefulRefi.join(" · ")}`,
  );
  const coverOnW2 = maybeProposeQualifyingFromTaxFile({
    ...unreadAfterLooks.draft,
    facts: {
      ...unreadAfterLooks.draft.facts,
      return_kind: {
        field: "return_kind",
        value: "cover",
        source: "document",
        confirmed: false,
      },
    },
  });
  assert.equal(coverOnW2.facts?.qualifying_income?.value, "36453");
  assert.ok(
    !coverOnW2.pendingProposal || coverOnW2.pendingProposal.value === "36453",
    "W-2 QI is not overwritten from a 1040 cover",
  );

  const alamedaAfterReturnSkip = skipCurrentInvite(alamedaAfterIdSkip);
  assert.notEqual(nextDocInvite(alamedaAfterReturnSkip), "tax_return");
  assert.notEqual(nextDocInvite(alamedaAfterReturnSkip), "prior_year_return");
  assert.notEqual(nextDocInvite(alamedaAfterReturnSkip), "bank_statement");
  assert.notEqual(nextFoxAsk(alamedaAfterReturnSkip).text, LAST_YEAR_FEDERAL_RETURN_ASK);
  assert.notEqual(nextFoxAsk(alamedaAfterReturnSkip).text, DOC_INVITE_COPY.bank_statement);
  assert.doesNotMatch(nextFoxAsk(alamedaAfterReturnSkip).text, /two recent statements/i);
  assert.equal(docInviteBlocksLooksRight(alamedaAfterReturnSkip), false);
  const usefulAfterReturnSkip = (stillUsefulSection(alamedaAfterReturnSkip)?.items ?? []).map(
    (item) => item.label,
  );
  assert.ok(
    usefulAfterReturnSkip.some((label) => /return|Form 1040/i.test(label)),
    `Still useful keeps the return after Skip — ${usefulAfterReturnSkip.join(" · ")}`,
  );
  assert.ok(
    usefulAfterReturnSkip.some((label) => /W-2/i.test(label)),
    `Still useful keeps skipped W-2 after return Skip — ${usefulAfterReturnSkip.join(" · ")}`,
  );
  const alamedaFinishLabels = (nextFoxAsk(alamedaAfterReturnSkip).actions ?? []).map((item) => item.label);
  assert.ok(alamedaFinishLabels.includes("Proceed"), `finish after Skip both — ${alamedaFinishLabels.join(" · ")}`);
  assert.ok(alamedaFinishLabels.includes("Not yet"), `finish after Skip both — ${alamedaFinishLabels.join(" · ")}`);
  assert.ok(alamedaFinishLabels.includes("Upload more"), `finish after Skip both — ${alamedaFinishLabels.join(" · ")}`);
  noSecrets(alamedaFields);

  assert.equal(looksLike1040Transcript(COMBES_TRANSCRIPT_LINES), true);
  const combesLoud = loudTranscriptFromPrintedLines(COMBES_TRANSCRIPT_LINES);
  assert.ok(combesLoud, "transcript printed lines must lock");
  assert.equal(combesLoud.extractClass, "tax_return");
  assert.equal(combesLoud.fields.tax_year, "2023");
  assert.equal(combesLoud.fields.filing_status, "Married filing jointly");
  assert.equal(combesLoud.fields.return_kind, "transcript");
  assert.equal(combesLoud.fields.dependent_count, "4");
  assert.equal(combesLoud.fields.schedule_e_present, "yes");
  assert.notEqual(combesLoud.fields.schedule_c_present, "yes");
  assert.equal(combesLoud.fields.full_name, undefined);
  assert.equal(combesLoud.fields.wages, undefined);
  assert.equal(combesLoud.fields.agi, undefined);
  assert.equal(combesLoud.fields.schedule_e_rents_received, undefined);
  assert.equal(combesLoud.fields.schedule_c_net_profit, undefined);
  const combesMapped = fieldsFromPrintedLines("tax_return", COMBES_TRANSCRIPT_LINES);
  assert.equal(combesMapped.dependent_count, "4");
  assert.notEqual(combesMapped.dependent_count, "6", "Exemption number 06 is not a dependent count");
  assert.equal(combesMapped.schedule_e_present, "yes");
  assert.notEqual(combesMapped.schedule_c_present, "yes");
  assert.equal(hasLockedSuggestion("tax_return", combesLoud.fields), true);
  assert.equal(hasLockedSuggestion("tax_return", { tax_year: "2023", return_kind: "transcript" }), false);
  assert.equal(looksLikeFederalReturnFields(combesLoud.fields), true);
  assert.equal(looksLikeTaxReturnFields(combesLoud.fields), true);
  const combesBlob = JSON.stringify(combesLoud.fields);
  assert.doesNotMatch(combesBlob, /ALLA|REN ARIA|COMB\b|XXX-XX-|8051|3571|SSN|356636|294564/i);
  const combesProposed = applyExtractedFields(alamedaAfterMonthly, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: combesLoud.fields,
  });
  assert.equal(combesProposed.draft.pendingProposal, null, "transcript is a signal — no Use this");
  assert.equal(combesProposed.draft.facts?.tax_year?.value, "2023");
  assert.equal(combesProposed.draft.facts?.dependent_count?.value, "4");
  assert.equal(combesProposed.draft.facts?.return_kind?.value, "transcript");
  assert.equal(combesProposed.draft.facts?.schedule_e_present?.value, "yes");
  assert.equal(combesProposed.draft.facts?.schedule_c_present, undefined);
  assert.equal(combesProposed.draft.facts?.filing_status, undefined);
  assert.equal(combesProposed.draft.facts?.wages, undefined);
  assert.equal(combesProposed.draft.facts?.agi, undefined);
  assert.doesNotMatch(
    JSON.stringify(combesProposed.draft.facts ?? {}),
    /ALLA|REN ARIA|COMB\b|356636|45617|294564|SSN/i,
  );
  assert.equal(transcriptSignalCopy(combesLoud.fields), "Tax return transcript · 2023");
  assert.equal(federalReturnConfirmCopy(combesLoud.fields), "Tax return transcript · 2023");
  const combesAsk = nextFoxAsk(combesProposed.draft);
  const combesReaction = docReactionAsk(combesProposed.draft, "tax_return");
  const combesAskLine = "I need the 2023 Form 1040 and Schedule E.";
  assert.equal(combesAsk.text, "Tax return transcript · 2023");
  assert.equal(combesAsk.followUp, combesAskLine);
  assert.equal(combesReaction?.text, "Tax return transcript · 2023");
  assert.equal(combesReaction?.followUp, combesAskLine);
  assert.doesNotMatch(combesAsk.text, /1040|Schedule E|I need/i);
  assert.doesNotMatch(combesReaction?.text ?? "", /1040|Schedule E|I need/i);
  const combesPainted = `${combesAsk.text}\n${combesAsk.followUp ?? ""}`;
  assert.equal(
    (combesPainted.match(/I need the 2023 Form 1040 and Schedule E\./g) ?? []).length,
    1,
    "1040 + Schedule E ask is one line",
  );
  const combesSpoken = `${combesAsk.text} ${combesAsk.followUp ?? ""} ${combesReaction?.text ?? ""} ${combesReaction?.followUp ?? ""}`;
  assert.match(combesSpoken, /tax return transcript/i);
  assert.match(combesSpoken, /2023/);
  assert.match(combesSpoken, /1040/);
  assert.match(combesSpoken, /Schedule E/);
  assert.doesNotMatch(combesSpoken, /dependent|Use this|AGI|wages|pension|SSN|ALLA|REN ARIA|COMB\b|356,636|45,617|294,564/i);
  assert.equal(
    (combesAsk.actions ?? []).some((item) => /use this/i.test(item.label)),
    false,
  );
  assert.equal(transcriptFollowUpAsk(combesProposed.draft), "I need the 2023 Form 1040 and Schedule E.");
  const transcriptChips: FoxAction[] = [
    { id: "upload-this", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } },
    { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
  ];
  const transcriptBlock = {
    text: "Tax return transcript · 2023",
    followUp: combesAskLine,
    actions: transcriptChips,
  };
  const restacked = applyTranscriptSignalAsk(
    [
      { id: "t1", role: "fox", ...transcriptBlock },
      { id: "received", role: "system", text: "2024 Tax Return Combes.pdf · received" },
      { id: "t2", role: "fox", ...transcriptBlock },
    ],
    { id: "t3", role: "fox", ...transcriptBlock },
  );
  const restackCopies = restacked.filter(
    (item) => item.role === "fox" && item.text === "Tax return transcript · 2023",
  );
  assert.equal(restackCopies.length, 1, "one drop = one two-line transcript block");
  assert.equal(restackCopies[0]?.followUp, combesAskLine);
  assert.equal(
    restacked.filter((item) => (item.actions ?? []).some((action) => action.label === "Skip")).length,
    1,
    "Skip chips live only on the current transcript ask",
  );
  const frozenRestack = freezeUsedFoxTurns(withoutDuplicateTranscriptAsk([
    { id: "t1", role: "fox", ...transcriptBlock },
    { id: "t2", role: "fox", ...transcriptBlock },
    { id: "t3", role: "fox", ...transcriptBlock },
  ]));
  assert.equal(
    frozenRestack.filter((item) => item.role === "fox" && item.text === "Tax return transcript · 2023").length,
    1,
  );
  assert.equal(frozenRestack.find((item) => item.id === "t3")?.actions?.some((action) => action.label === "Skip"), true);
  assert.equal(frozenRestack.find((item) => item.id === "t1"), undefined);
  assert.equal(frozenRestack.find((item) => item.id === "t2"), undefined);
  assert.equal(combesProposed.draft.incomeType.value, "w2", "transcript does not start another income type");
  const combesKey = transcriptSpeakKey(combesProposed.draft);
  assert.ok(combesKey);
  assert.equal(canSpeakDocStamp(combesProposed.draft, combesKey, "named"), true);
  assert.equal(canSpeakDocStamp(combesProposed.draft, combesKey, "offered"), true);
  const combesStamped = withTranscriptSpoken(combesProposed.draft);
  assert.equal(hasDocStamp(combesStamped, combesKey, "received"), true);
  assert.equal(hasDocStamp(combesStamped, combesKey, "named"), true);
  assert.equal(hasDocStamp(combesStamped, combesKey, "offered"), true);
  assert.equal(canSpeakDocStamp(combesStamped, combesKey, "named"), false);
  assert.equal(canSpeakDocStamp(combesStamped, combesKey, "offered"), false);
  assert.equal(docReactionAsk(combesStamped, "tax_return"), null, "same stamp already on File — do not print again");
  const afterSpokenAsk = applyTranscriptSignalAsk(
    [{ id: "t1", role: "fox", ...transcriptBlock }],
    { id: "t2", role: "fox", ...transcriptBlock },
    combesStamped,
  );
  assert.equal(
    afterSpokenAsk.filter((item) => item.role === "fox" && item.text === "Tax return transcript · 2023").length,
    1,
    "one Combes drop → one transcript line",
  );
  assert.equal(afterSpokenAsk[afterSpokenAsk.length - 1]?.id, "t1", "already spoken — do not restack a new line");
  const skipOnce = skipCurrentInvite(combesStamped);
  assert.equal(skipOnce.transcriptFollowUpSkipped, true);
  assert.equal(transcriptOfferDone(skipOnce), true);
  assert.equal(hasDocStamp(skipOnce, combesKey, "done"), true);
  assert.equal(transcriptFollowUpAsk(skipOnce), "");
  const skipTwice = skipCurrentInvite(skipOnce);
  assert.deepEqual(skipTwice.skippedClasses, skipOnce.skippedClasses);
  assert.equal(skipTwice.transcriptFollowUpSkipped, true);
  assert.equal(skipTwice.incomeType.value, "w2");
  assert.equal(JSON.stringify(skipTwice.docSpeak), JSON.stringify(skipOnce.docSpeak));
  const receivedLine = "2024 Tax Return Combes.pdf · received";
  const receivedSkip = {
    id: "skip-docs",
    label: "Skip",
    event: "bubble" as const,
    capture: { field: "skip-docs" as const },
  };
  const dirtyReceived = applyTranscriptSignalAsk(
    [
      {
        id: "r1",
        role: "fox",
        text: receivedLine,
        actions: [receivedSkip],
      },
      {
        id: "r2",
        role: "fox",
        text: receivedLine,
        actions: [receivedSkip],
      },
      {
        id: "r3",
        role: "system",
        text: receivedLine,
        actions: [receivedSkip, receivedSkip, receivedSkip],
      },
      { id: "t1", role: "fox", ...transcriptBlock },
    ],
    { id: "t2", role: "fox", ...transcriptBlock },
    combesStamped,
  );
  const receivedCopies = dirtyReceived.filter((item) => item.text === receivedLine);
  assert.equal(receivedCopies.length, 1, "one Combes drop → one received line");
  assert.equal(receivedCopies[0]?.role, "system");
  assert.equal(receivedCopies[0]?.actions, undefined, "received line is text");
  assert.equal(leftoverSkipOnReceivedLines(dirtyReceived, combesStamped), 0);
  assert.equal(leftoverSkipOnOlderTurns(dirtyReceived, combesStamped), 0);
  assert.equal(liveSkipChipRows(dirtyReceived, combesStamped), 1, "one chip row on the last Fox line");
  assert.equal(
    dirtyReceived.filter((item) => (item.actions ?? []).some((action) => action.label === "Skip")).length,
    1,
    "Upload this · Skip lives only on the last Fox line",
  );
  const secondSkipThread = freezeUsedFoxTurns([
    ...dirtyReceived,
    { id: "skip-1", role: "client", text: "Skip" },
  ]);
  assert.equal(leftoverSkipOnReceivedLines(secondSkipThread, skipOnce), 0);
  assert.equal(liveSkipChipRows(secondSkipThread, skipOnce), 0, "second Skip adds no fourth chip");
  assert.equal(
    withoutDuplicateReceivedLine([
      { id: "a", role: "system", text: receivedLine },
      { id: "b", role: "fox", text: receivedLine, actions: [receivedSkip] },
      { id: "c", role: "system", text: receivedLine },
    ]).length,
    1,
  );
  const returnAskLine = LAST_YEAR_FEDERAL_RETURN_ASK;
  const oldReturnAskLine =
    "Last year’s federal return. One file can show other income, other property, and household size.";
  const lastYearAsk = (text: string) => /Last year.?s (?:tax return|federal return|Form 1040)/i.test(text);
  const returnSkipRow = {
    id: "t-return",
    role: "fox" as const,
    text: returnAskLine,
    actions: [receivedSkip, receivedSkip, receivedSkip, receivedSkip, receivedSkip],
  };
  const dirtyReturnStored: FoxMessage[] = [
    { ...returnSkipRow, id: "ret-old", text: oldReturnAskLine },
    { ...returnSkipRow, id: "ret-1" },
    { ...returnSkipRow, id: "ret-2" },
    { ...returnSkipRow, id: "ret-3" },
    { id: "received-2", role: "system", text: receivedLine },
    { id: "t-live", role: "fox", ...transcriptBlock },
    { ...returnSkipRow, id: "ret-after" },
  ];
  assert.ok(
    leftoverSkipOnAskText(dirtyReturnStored, combesStamped, lastYearAsk) >= 3,
    "stored leftover Skips on last-year return are visible before seal",
  );
  const dirtyReturn = sealStoredFoxThread(dirtyReturnStored);
  assert.equal(
    dirtyReturn.filter((item) => lastYearAsk(item.text ?? "")).length,
    1,
    "one last-year return offer — reprints die",
  );
  assert.equal(
    dirtyReturn.find((item) => lastYearAsk(item.text ?? ""))?.actions,
    undefined,
    "named-paper last-year line is history text",
  );
  assert.equal(
    leftoverSkipOnAskText(dirtyReturn, combesStamped, lastYearAsk),
    0,
    "leftover Skips on last-year return die in stored actions",
  );
  assert.equal(leftoverSkipOnOlderTurns(dirtyReturn, combesStamped), 0);
  assert.equal(
    dirtyReturn.filter((item) => (item.actions ?? []).some((action) => action.label === "Skip")).length,
    0,
    "sealed thread stores no Skip",
  );
  assert.deepEqual(
    deskStripActions(dirtyReturn, combesStamped).map((item) => item.label),
    ["Upload this", "Skip"],
    "one chip row lives on the strip",
  );
  assert.equal(
    withoutLeftoverDocInvitesAfterTranscript([
      { id: "t", role: "fox", ...transcriptBlock },
      { id: "after", role: "fox", text: returnAskLine, actions: [receivedSkip] },
    ]).some((item) => item.text === returnAskLine),
    false,
  );
  assert.equal(
    withoutDuplicateHistoryInvite([
      { id: "a", role: "fox", text: returnAskLine, actions: [receivedSkip] },
      { id: "b", role: "fox", text: returnAskLine, actions: [receivedSkip] },
    ]).length,
    1,
  );
  const afterSecondSkip = freezeUsedFoxTurns([
    ...dirtyReturn,
    { id: "skip-2", role: "client", text: "Skip" },
    { id: "ret-again", role: "fox", text: returnAskLine, actions: [receivedSkip] },
  ]);
  assert.equal(
    leftoverSkipOnAskText(afterSecondSkip, skipOnce, lastYearAsk),
    0,
    "second Skip adds no chip on last-year return",
  );
  const stuckOfferFollowUp: FoxMessage[] = [
    {
      id: "ret-follow",
      role: "fox",
      text: oldReturnAskLine,
      followUp: combesAskLine,
      actions: [receivedSkip, receivedSkip, receivedSkip],
    },
  ];
  assert.ok(
    leftoverSkipOnAskText(stuckOfferFollowUp, combesStamped, lastYearAsk) >= 3,
    "Skip stack on last-year offer+followUp is stored leftover",
  );
  const splitOffer = splitLeftoverOfferWithLaterFollowUp(stuckOfferFollowUp);
  assert.equal(splitOffer[0]?.actions, undefined, "offer line loses chips at write time");
  assert.equal(splitOffer[0]?.followUp, undefined);
  assert.equal(splitOffer[1]?.text, combesAskLine);
  const sealedOffer = sealStoredFoxThread(stuckOfferFollowUp);
  assert.equal(
    leftoverSkipOnAskText(sealedOffer, combesStamped, lastYearAsk),
    0,
    "Last year’s tax return has zero Skip chips once a later Fox line is live",
  );
  assert.equal(sealedOffer.find((item) => lastYearAsk(item.text ?? ""))?.actions, undefined);
  assert.equal(
    (sealedOffer.find((item) => item.text === combesAskLine)?.actions ?? []).length,
    0,
    "later Fox speech stores no Skip",
  );
  assert.deepEqual(
    deskStripActions(sealedOffer, combesStamped).map((item) => item.label),
    ["Upload this", "Skip"],
    "only the strip has one Skip",
  );
  const reappendAfterTranscript = sealStoredFoxThread([
    { ...returnSkipRow, id: "ret-before", actions: [receivedSkip, receivedSkip, receivedSkip] },
    { id: "t-live-2", role: "fox", ...transcriptBlock },
    { ...returnSkipRow, id: "ret-reappend", actions: [receivedSkip, receivedSkip, receivedSkip] },
  ]);
  assert.equal(reappendAfterTranscript.find((item) => lastYearAsk(item.text ?? ""))?.actions, undefined);
  assert.equal(leftoverSkipOnAskText(reappendAfterTranscript, combesStamped, lastYearAsk), 0);
  assert.equal(
    (reappendAfterTranscript.find((item) => item.text === "Tax return transcript · 2023")?.actions ?? []).length,
    0,
    "history stores no Skip — the strip recomputes",
  );
  const enginePrior = withChipsOnlyOnLiveFoxTurn([
    {
      id: "prior-offer",
      role: "fox",
      text: LAST_YEAR_FEDERAL_RETURN_ASK,
      actions: [receivedSkip, receivedSkip, receivedSkip],
    },
    { id: "live-offer", role: "fox", ...transcriptBlock },
  ]);
  const priorOffer = enginePrior.find((item) => item.id === "prior-offer");
  assert.equal(priorOffer?.actions, undefined, "engine: older Fox turn stores no buttons");
  assert.equal(paintedFoxActions(priorOffer!, combesStamped, false), undefined);
  assert.equal(leftoverSkipOnAskText(enginePrior, combesStamped, lastYearAsk), 0);
  assert.equal(
    (enginePrior.find((item) => item.id === "live-offer")?.actions ?? []).length,
    0,
    "live Fox speech stores no buttons",
  );
  const stripFromPrior = deskStripActions(enginePrior, combesStamped);
  assert.deepEqual(
    stripFromPrior.map((item) => item.label),
    ["Upload this", "Skip"],
    "live strip is the later Fox ask — last-year chips do not stay",
  );
  const lastYearOnlyStrip = deskStripActions(
    [
      {
        id: "prior-offer",
        role: "fox",
        text: LAST_YEAR_FEDERAL_RETURN_ASK,
        actions: transcriptChips,
      },
    ],
    combesStamped,
  );
  assert.deepEqual(lastYearOnlyStrip.map((item) => item.label), ["Upload this", "Skip"]);
  const afterNewAskStrip = deskStripActions(
    [
      {
        id: "old-ask",
        role: "fox",
        text: LAST_YEAR_FEDERAL_RETURN_ASK,
        actions: [receivedSkip, receivedSkip, receivedSkip],
      },
      { id: "live-offer", role: "fox", ...transcriptBlock },
    ],
    combesStamped,
  );
  assert.deepEqual(
    afterNewAskStrip.map((item) => item.label),
    ["Upload this", "Skip"],
    "a new Fox question replaces the strip",
  );
  assert.equal(
    deskStripActions(secondSkipThread, skipOnce).filter((item) => item.label === "Skip").length,
    0,
    "second Skip on the live strip adds nothing",
  );
  const foxSource = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
  const foxThreadSource = foxSource.slice(
    foxSource.indexOf("function FoxThread"),
    foxSource.indexOf("function FoxLiveStrip"),
  );
  assert.doesNotMatch(foxThreadSource, /fox-bubble__actions|fox-chip/);
  assert.match(foxSource, /function FoxLiveStrip/);
  assert.match(foxSource, /deskStripActions/);
  const afterAlamedaUseThis = sealStoredFoxThread([
    {
      id: "alameda-period",
      role: "fox",
      text: "Alameda Health System. Period $16,824.30. Use this?",
      actions: [
        { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
        { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
      ],
    },
    { id: "you-use", role: "client", text: "Use this" },
    {
      id: "prior-next",
      role: "fox",
      text: priorStubAsk().text,
      actions: priorStubAsk().actions,
    },
  ]);
  assert.equal(
    afterAlamedaUseThis.find((item) => item.id === "alameda-period")?.actions,
    undefined,
    "Period Use this is history after the tap",
  );
  assert.equal(afterAlamedaUseThis[afterAlamedaUseThis.length - 1]?.text, priorStubAsk().text);
  assert.equal(
    afterAlamedaUseThis[afterAlamedaUseThis.length - 1]?.actions,
    undefined,
    "prior-stub ask stores no chips after Alameda Use this",
  );
  assert.deepEqual(
    deskStripActions(afterAlamedaUseThis, alamedaUsed).map((item) => item.label),
    ["Upload this", "Skip"],
    "prior-stub chips stay current on the strip after Alameda Use this",
  );
  assert.equal(docInviteBlocksLooksRight(combesProposed.draft), false, "Do not hold Looks right for 1040s");
  assert.equal(combesProposed.draft.pendingProposal, null, "transcript does not open income Use this");
  assert.equal(
    combesProposed.draft.facts?.qualifying_income?.value,
    "36453",
    "transcript loss must not overwrite the stub monthly",
  );
  assert.doesNotMatch(
    String(combesProposed.draft.facts?.tax_cashflows?.value ?? ""),
    /45617|294564|schedule_e_rents_received":"[1-9]/,
    "transcript does not write a schedule loss as cash flow",
  );
  assert.equal(
    canLooksRight({
      ...combesProposed.draft,
      pendingProposal: {
        field: "qualifying_income",
        value: "16824.3",
        label: "income",
        kind: "computed",
      },
    }),
    false,
    "Looks right stays closed while a money Use this is live",
  );
  assert.equal(workspacePrompt(combesProposed.draft), "documents");
  assert.equal(shouldSpeakPendingConfirm(combesProposed.draft), false);

  const unreadReturnAt = "2026-09-08T19:00:00.000Z";
  loadIntakeDraft({
    ...alamedaAfterMonthly,
    documents: [
      ...alamedaAfterMonthly.documents,
      {
        slot: "other",
        name: "2024 Tax Return Combes.pdf",
        type: "application/pdf",
        size: COMBES_RETURN_EXPECTED_PDF_BYTES,
        receivedAt: unreadReturnAt,
        status: "received",
        extractClass: "tax_return",
      },
    ],
  });
  const unreadReturn = applyExtractWrite(unreadReturnAt, "2024 Tax Return Combes.pdf", {
    extractClass: "tax_return",
    confidence: 0.2,
    fields: {},
  });
  assert.ok(unreadReturn.quietLines.includes(FAILED_READ_NOTE), "empty 1040/transcript is unread once");
  assert.ok(!unreadReturn.draft.pendingProposal);
  assert.equal(unreadReturn.draft.facts?.tax_year, undefined);
  assert.ok(unreadDocOpen(unreadReturn.draft));
  assert.equal(nextFoxAsk(unreadReturn.draft).text, FAILED_READ_NOTE);
  assert.notEqual(nextFoxAsk(unreadReturn.draft).text, LAST_YEAR_FEDERAL_RETURN_ASK);
  assert.deepEqual(
    (nextFoxAsk(unreadReturn.draft).actions ?? []).map((item) => item.label),
    ["Upload again", "Type a note", "Skip"],
  );
  const unreadReturnSkip = skipUnreadDoc(unreadReturn.draft);
  assert.ok(!unreadDocOpen(unreadReturnSkip), "Skip clears unread return");
  assert.notEqual(nextDocInvite(unreadReturnSkip), "tax_return");
  assert.notEqual(nextDocInvite(unreadReturnSkip), "bank_statement");
  assert.notEqual(nextFoxAsk(unreadReturnSkip).text, LAST_YEAR_FEDERAL_RETURN_ASK);
  assert.doesNotMatch(nextFoxAsk(unreadReturnSkip).text, /two recent statements/i);
  assert.equal(docInviteBlocksLooksRight(unreadReturnSkip), false);
  assert.ok(canLooksRight(unreadReturnSkip) || workspacePrompt(unreadReturnSkip) === "review");

  const combesPdf = combesReturnPath();
  if (!combesPdf) {
    console.log(
      "assert-first-session-page-read: Combes 1040 transcript not on disk — hook only " +
        COMBES_RETURN_CANDIDATES.join(" | "),
    );
  } else {
    const combesBytes = readFileSync(combesPdf);
    assert.equal(combesBytes.length, COMBES_RETURN_EXPECTED_PDF_BYTES);
    assert.equal(createHash("sha256").update(combesBytes).digest("hex"), COMBES_RETURN_SHA256);
    const printedCombes = await classifyAndExtract(
      combesBytes,
      "application/pdf",
      deadVision,
      "tax_return",
      combesPdf.split("/").pop(),
    );
    assert.ok(!printedCombes.failed, "exact Combes transcript locks from pdf.js text, not Grok");
    assert.equal(printedCombes.extractClass, "tax_return");
    assert.equal(printedCombes.fields.tax_year, "2023");
    assert.equal(printedCombes.fields.filing_status, "Married filing jointly");
    assert.equal(printedCombes.fields.return_kind, "transcript");
    assert.equal(printedCombes.fields.dependent_count, "4");
    assert.notEqual(printedCombes.fields.dependent_count, "6");
    assert.equal(printedCombes.fields.schedule_e_present, "yes");
    assert.notEqual(printedCombes.fields.schedule_c_present, "yes");
    assert.equal(printedCombes.fields.wages, undefined);
    assert.equal(printedCombes.fields.agi, undefined);
    assert.equal(printedCombes.fields.schedule_e_rents_received, undefined);
    assert.doesNotMatch(JSON.stringify(printedCombes.fields), /ALLA|REN ARIA|COMB\b|XXX-XX-|SSN|356636|294564/i);
    noSecrets(printedCombes.fields);
  }
  const alamedaPdf = alamedaPaystubPath();
  assert.ok(
    alamedaPdf,
    "Alameda fixture missing or sha256 mismatch — " + ALAMEDA_STUB_CANDIDATES.join(" | "),
  );
  const alamedaBytes = readFileSync(alamedaPdf);
  assert.equal(alamedaBytes.length, ALAMEDA_STUB_EXPECTED_PDF_BYTES);
  assert.equal(createHash("sha256").update(alamedaBytes).digest("hex"), ALAMEDA_STUB_SHA256);
  assert.notEqual(
    createHash("sha256").update(alamedaBytes).digest("hex"),
    "4d09d5ffd8a85bfda32a94f8f5350ef5ae543e42a1fd9220197a8f8ecc1c2303",
    "Alameda fixture must not be the CSTC stub bytes",
  );
  const unreadAfterSkip = applyExtractedFields(skippedW2, {
    extractClass: "paystub",
    confidence: 0.94,
    fields: {},
  });
  assert.ok(!unreadAfterSkip.draft.pendingProposal);
  assert.equal(unreadAfterSkip.draft.awaitingPayFrequency, false);

  const matt = mattCstcPaystubPath();
  if (!matt) {
    console.log(
      "assert-first-session-page-read: Matthew CSTC paystub not dropped — hook only " +
        MATT_CSTC_STUB_CANDIDATES.join(" | "),
    );
  } else {
    const printedMatt = await classifyAndExtract(
      readFileSync(matt),
      "application/pdf",
      deadVision,
      "paystub",
      matt.split("/").pop(),
    );
    // Garbled text layer — leftover must not invent. Founder paperclip on /start is the Grok proof.
    assert.equal(printedMatt.failed, true, "PAY MATT CSTC 260422 printed layer must stay unread");
    assert.deepEqual(printedMatt.fields, {});
    noSecrets(printedMatt.fields);
    const pageImage = await renderPdfFirstPage(readFileSync(matt));
    assert.ok(pageImage && pageImage.bytes.length > 40_000, "PAY MATT CSTC 260422 page image missing");
    console.log(
      "assert-first-session-page-read: PAY MATT CSTC 260422 on disk — printed unread, live Grok page-read is the proof",
    );
  }

  assert.ok(FIRST_SESSION_LOCKED_KEYS.government_id.includes("full_name"));
  assert.ok(!FIRST_SESSION_LOCKED_KEYS.government_id.includes("id_last4"));
  assert.ok(FIRST_SESSION_LOCKED_KEYS.paystub.includes("overtime"));
  assert.ok(!FIRST_SESSION_LOCKED_KEYS.paystub.includes("ssn"));
  assert.ok(FIRST_SESSION_LOCKED_KEYS.tax_return.includes("dependent_count"));
  assert.ok(!FIRST_SESSION_LOCKED_KEYS.tax_return.includes("dependent_name"));
  assert.ok(!FIRST_SESSION_LOCKED_KEYS.tax_return.includes("dependent_names"));
  assert.deepEqual([...TAX_RETURN_PAGE_READ_KEYS], ["tax_year", "full_name"]);
  assert.ok(!(TAX_RETURN_PAGE_READ_KEYS as readonly string[]).includes("ssn"));
  assert.equal(
    hasLockedSuggestion("tax_return", { tax_year: "2025", full_name: "Allan Combes" }),
    true,
  );
  assert.equal(hasLockedSuggestion("tax_return", { tax_year: "2025" }), false, "filename year only is not a lock");
  assert.equal(looksLikeTaxReturnPageReadFields({ tax_year: "2025", full_name: "Allan Combes" }), true);
  assert.equal(looksLikeTaxReturnPageReadFields({ tax_year: "2025" }), false);
  assert.equal(
    taxReturnPageHint("w2", "2025 1040 - Combes Allan and Renz.pdf"),
    "tax_return",
    "1040 in the walk name is tax_return, not the W-2 invite",
  );
  const leakedCombes = {
    tax_year: "2025",
    full_name: "Allan Combes",
    ssn: "123-45-6789",
    agi: "356636",
    wages: "356636",
    schedule_c_net_profit: "88000",
    schedule_e_rents_received: "294564",
  };
  assert.deepEqual(lockTaxReturnPageReadFields(leakedCombes), {
    tax_year: "2025",
    full_name: "Allan Combes",
  });
  const combesWalkPdf = form1040PagePdf([
    "Form 1040",
    "U.S. Individual Income Tax Return",
    "2025",
    "Filing Status",
    "Married filing jointly",
    "Your first name and middle initial Allan",
    "Last name Combes",
    "Spouse Renz Combes",
  ]);
  assert.ok(isPdfBytes(combesWalkPdf));
  const drawn1040 = await renderPdfFirstPage(combesWalkPdf);
  assert.ok(drawn1040 && drawnPageHasInk(drawn1040), "Helvetica 1040 first page must have ink for Grok");
  const grokImage = await pageImageForGrok(combesWalkPdf, "application/pdf");
  assert.ok(grokImage?.mediaType.startsWith("image/"), "page-read sends an image, not the PDF");
  assert.ok(drawnPageHasInk(grokImage), "blank Helvetica render is not a page-read");
  const pageCalls: { mediaType: string; bytes: number; extractClass?: string }[] = [];
  const leakyGrok = {
    async classify(bytes: Uint8Array, mediaType: string) {
      pageCalls.push({ mediaType, bytes: bytes.length });
      return { class: "tax_return" as const, confidence: 0.94, readable: true };
    },
    async extract(bytes: Uint8Array, mediaType: string, extractClass: ExtractClass) {
      pageCalls.push({ mediaType, bytes: bytes.length, extractClass });
      return { fields: leakedCombes, warnings: [] };
    },
  };
  const grokCombes = await classifyAndExtract(
    combesWalkPdf,
    "application/pdf",
    leakyGrok,
    "w2",
    "2025 1040 - Combes Allan and Renz.pdf",
  );
  assert.ok(pageCalls.length, "page → image → Grok must fire on the Combes 1040 PDF");
  assert.ok(
    pageCalls.every((call) => call.mediaType.startsWith("image/")),
    `Grok must receive a first-page image — ${pageCalls.map((call) => call.mediaType).join(",")}`,
  );
  assert.ok(
    pageCalls.some((call) => call.extractClass === "tax_return"),
    "1040 walk name locks tax year + name, not W-2 Box 5",
  );
  assert.equal(grokCombes.extractClass, "tax_return");
  assert.notEqual(grokCombes.failed, true, "year + name is a page-read lock");
  assert.deepEqual(Object.keys(grokCombes.fields).sort(), ["full_name", "tax_year"]);
  assert.equal(grokCombes.fields.tax_year, "2025");
  assert.equal(grokCombes.fields.full_name, "Allan Combes");
  assert.equal(grokCombes.fields.ssn, undefined);
  assert.equal(grokCombes.fields.agi, undefined);
  assert.equal(grokCombes.fields.wages, undefined);
  noSecrets(grokCombes.fields);
  const pageOnW2 = applyExtractedFields(alamedaAfterMonthly, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: grokCombes.fields,
  });
  assert.equal(pageOnW2.draft.facts?.qualifying_income?.value, "36453");
  assert.equal(pageOnW2.draft.facts?.tax_year, undefined, "tax year waits for Use this");
  assert.equal(pageOnW2.draft.pendingProposal?.field, "tax_year");
  assert.equal(pageOnW2.draft.pendingProposal?.value, "2025");
  assert.equal(pageOnW2.draft.pendingProposal?.extras?.find((item) => item.field === "full_name")?.value, "Allan Combes");
  assert.match(federalReturnConfirmCopy(grokCombes.fields), /2025 return/);
  assert.match(federalReturnConfirmCopy(grokCombes.fields), /Allan Combes/);
  const liveConfirm = proposalAskCopy(pageOnW2.draft.pendingProposal!);
  assert.match(liveConfirm, /2025 return/);
  assert.match(liveConfirm, /Allan Combes/);
  assert.doesNotMatch(liveConfirm, /Renz/i, "Allan-only extract does not invent Renz");
  assert.match(liveConfirm, /Use this/i);
  assert.ok(
    !pageOnW2.draft.pendingProposal || pageOnW2.draft.pendingProposal.field === "tax_year",
    "Grok 1040 page-read does not overwrite W-2 QI",
  );
  assert.equal(pageOnW2.draft.facts?.ssn, undefined);
  assert.notEqual(pageOnW2.draft.facts?.full_name?.confirmed, true, "page-read name is not an ID write");
  const usefulPage = (stillUsefulSection({ ...pageOnW2.draft, sampleAccepted: true })?.items ?? []).map(
    (item) => item.label,
  );
  assert.ok(
    usefulPage.includes("Government ID"),
    `Page-read name must not clear Government ID — ${usefulPage.join(" · ")}`,
  );

  const pageReadAt = "2026-09-11T21:00:00.000Z";
  const pageReadName = "2025 1040 - Combes Allan and Renz.pdf";
  loadIntakeDraft({
    ...alamedaAfterIdSkip,
    documents: [
      ...alamedaAfterIdSkip.documents,
      {
        slot: "other",
        name: pageReadName,
        type: "application/pdf",
        size: 223455,
        receivedAt: pageReadAt,
        status: "received",
        extractClass: "tax_return",
      },
    ],
  });
  const pageWrite = applyExtractWrite(pageReadAt, pageReadName, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: grokCombes.fields,
  });
  assert.equal(pageWrite.draft.facts?.qualifying_income?.value, "36453");
  assert.equal(pageWrite.draft.facts?.tax_year, undefined, "year stays off File until Use this");
  assert.equal(taxReturnWrittenOnFile(pageWrite.draft), false);
  assert.equal(pageWrite.draft.pendingProposal?.field, "tax_year");
  const walkConfirm = nextFoxAsk(pageWrite.draft);
  assert.match(walkConfirm.text, /2025 return/);
  assert.match(walkConfirm.text, /Allan Combes/);
  assert.deepEqual(
    (walkConfirm.actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  const usefulBeforeUse = (stillUsefulSection(pageWrite.draft)?.items ?? []).map((item) => item.label);
  assert.ok(
    usefulBeforeUse.includes(LAST_YEAR_RETURN_STILL_USEFUL),
    `Still useful keeps Form 1040 until Use this — ${usefulBeforeUse.join(" · ")}`,
  );
  const docsBeforeUse = previewFacts(pageWrite.draft)
    .filter((fact) => fact.label === "Docs")
    .map((fact) => fact.value)
    .join(" · ");
  assert.doesNotMatch(docsBeforeUse, /Tax return in/, `Docs must not stamp Tax return in before Use this — ${docsBeforeUse}`);
  const pageUsed = resolveProposal(pageWrite.draft, "accept");
  assert.equal(pageUsed.facts?.tax_year?.value, "2025");
  assert.equal(pageUsed.facts?.qualifying_income?.value, "36453", "QI stays on Use this write");
  assert.equal(pageUsed.facts?.wages, undefined, "cover wages do not overwrite");
  assert.equal(pageUsed.facts?.ssn, undefined);
  assert.notEqual(pageUsed.facts?.full_name?.confirmed, true);
  assert.equal(taxReturnWrittenOnFile(pageUsed), true);
  const docsAfterUse = previewFacts(pageUsed)
    .filter((fact) => fact.label === "Docs")
    .map((fact) => fact.value)
    .join(" · ");
  assert.match(docsAfterUse, /Tax return in/);
  assert.equal(pageUsed.facts?.[TAX_RETURN_NAME_FIELD]?.value, "Allan Combes");
  assert.equal(taxReturnStructureValue(pageUsed), "2025 return · Allan Combes");
  const returnRow = previewFacts(pageUsed).find((fact) => fact.id === "tax-return" || fact.label === "Return");
  assert.ok(returnRow, "Use this writes a Return row");
  assert.equal(returnRow?.value, "2025 return · Allan Combes");
  assert.doesNotMatch(returnRow?.value ?? "", /Renz/i, "Allan-only extract does not invent Renz on Structure");
  const usefulAfterUse = (stillUsefulSection(pageUsed)?.items ?? []).map((item) => item.label);
  assert.ok(
    !usefulAfterUse.includes(LAST_YEAR_RETURN_STILL_USEFUL),
    `1040 off Still useful after Use this — ${usefulAfterUse.join(" · ")}`,
  );
  const finishAfterUse = (nextFoxAsk(pageUsed).actions ?? []).map((item) => item.label);
  assert.ok(finishAfterUse.includes("Proceed"), `finish chips after Use this — ${finishAfterUse.join(" · ")}`);
  assert.ok(finishAfterUse.includes("Not yet"), `finish chips after Use this — ${finishAfterUse.join(" · ")}`);
  assert.ok(finishAfterUse.includes("Upload more"), `finish chips after Use this — ${finishAfterUse.join(" · ")}`);

  loadIntakeDraft({
    ...alamedaAfterIdSkip,
    documents: [
      ...alamedaAfterIdSkip.documents,
      {
        slot: "other",
        name: pageReadName,
        type: "application/pdf",
        size: 223455,
        receivedAt: pageReadAt,
        status: "received",
        extractClass: "tax_return",
      },
    ],
  });
  const jointFields = { tax_year: "2025", full_name: "ALLAN COMBES and RENZ COMBES" };
  const jointWrite = applyExtractWrite(pageReadAt, pageReadName, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: jointFields,
  });
  assert.equal(jointWrite.draft.facts?.qualifying_income?.value, "36453");
  const jointConfirm = nextFoxAsk(jointWrite.draft);
  assert.match(jointConfirm.text, /2025 return/);
  assert.match(jointConfirm.text, /ALLAN COMBES/);
  assert.match(jointConfirm.text, /RENZ COMBES|Renz/i);
  assert.deepEqual(
    (jointConfirm.actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  const jointUsed = resolveProposal(jointWrite.draft, "accept");
  assert.equal(jointUsed.facts?.qualifying_income?.value, "36453", "QI stays on joint Use this write");
  assert.equal(jointUsed.facts?.wages, undefined);
  assert.equal(jointUsed.facts?.ssn, undefined);
  assert.notEqual(jointUsed.facts?.full_name?.confirmed, true);
  assert.equal(jointUsed.facts?.[TAX_RETURN_NAME_FIELD]?.value, "ALLAN COMBES and RENZ COMBES");
  assert.match(taxReturnStructureValue(jointUsed), /2025 return/);
  assert.match(taxReturnStructureValue(jointUsed), /RENZ COMBES|Renz/i);
  const jointRow = previewFacts(jointUsed).find((fact) => fact.id === "tax-return" || fact.label === "Return");
  assert.ok(jointRow, "joint Use this writes a Return row");
  assert.match(jointRow?.value ?? "", /RENZ COMBES|Renz/i);
  const jointDocs = previewFacts(jointUsed)
    .filter((fact) => fact.label === "Docs")
    .map((fact) => fact.value)
    .join(" · ");
  assert.match(jointDocs, /Tax return in/);
  const jointUseful = (stillUsefulSection(jointUsed)?.items ?? []).map((item) => item.label);
  assert.ok(
    !jointUseful.includes(LAST_YEAR_RETURN_STILL_USEFUL),
    `1040 off Still useful after joint Use this — ${jointUseful.join(" · ")}`,
  );

  const scheduleUpgrade = applyExtractedFields(alamedaAfterMonthly, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2024",
      return_kind: "schedule_c",
      schedule_c_net_profit: "88000",
    },
  });
  assert.equal(scheduleUpgrade.draft.facts?.qualifying_income?.value, "36453", "File QI stays until Use this");
  assert.equal(scheduleUpgrade.draft.pendingProposal?.field, "qualifying_income");
  assert.ok(scheduleUpgrade.draft.pendingProposal, "schedule extract is CFBW / Use this");
  assert.notEqual(scheduleUpgrade.draft.pendingProposal?.value, "36453");
  const extractSrc = readFileSync(join(root, "lib/docs/extract.ts"), "utf8");
  const pdfSrc = readFileSync(join(root, "lib/docs/pdfText.ts"), "utf8");
  assert.match(extractSrc, /TAX_RETURN_PAGE_READ_KEYS/);
  assert.match(extractSrc, /First pages of Form 1040 only/);
  assert.match(extractSrc, /both taxpayers as printed/);
  assert.match(extractSrc, /Never invent a spouse from the filename/);
  assert.match(extractSrc, /Never output SSN/);
  assert.match(extractSrc, /lockTaxReturnPageReadFields/);
  assert.match(extractSrc, /pageImageForGrok/);
  assert.match(pdfSrc, /standardFontDataUrl/);
  assert.match(pdfSrc, /LiberationSans-Regular/);
  console.log("assert-first-session-page-read: ID · W-2 · stub · bank · contract · tax locked; unread invents nothing");
}

main();
