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
  looksLikeFederalReturnFields,
  looksLikeTaxReturnFields,
  nextDocInvite,
  skipCurrentInvite,
  skipUnreadDoc,
  stillUsefulSection,
  unreadDocOpen,
} from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal, shouldSpeakPendingConfirm } from "../components/fox/completeness";

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
  skipWageDocs,
  speakEmployerName,
  stubExtractConfirmCopy,
  stubPeriodConfirmOpen,
  WAGE_DOCS_ASK,
  WAGE_STUB_DROP_ASK,
  wageEmploymentFileLine,
} from "../components/fox/qualifyingIncome";
import { FAILED_READ_NOTE } from "../lib/docs/accept";
import { classifyAndExtract, FOX_GROK_MODEL } from "../lib/docs/extract";
import { renderPdfFirstPage } from "../lib/docs/pdfText";
import {
  amountAskText,
  DOC_INVITE_COPY,
  nextFoxAsk,
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
  const idAfterStub = applyIdExtractAsk(stubConfirmThread, {
    id: "id",
    role: "fox",
    text: DOC_INVITE_COPY.government_id,
    actions: [{ id: "upload-id", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } }],
  });
  assert.match(idAfterStub[idAfterStub.length - 1]?.text ?? "", /government ID/i);
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
  assert.equal(alamedaUsed.awaitingPayFrequency, false);
  assert.doesNotMatch(nextFoxAsk(alamedaUsed).text, /How often|paycheck/i);
  assert.equal(nextDocInvite(alamedaUsed), "government_id");
  assert.equal(workspacePrompt(alamedaUsed), "documents");
  const alamedaIdAsk = nextFoxAsk(alamedaUsed);
  assert.equal(alamedaIdAsk.text, DOC_INVITE_COPY.government_id);
  assert.match(alamedaIdAsk.text, /government ID/i);
  assert.match(alamedaIdAsk.text, /name on it/);
  assert.deepEqual(
    (alamedaIdAsk.actions ?? []).map((item) => item.label),
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
    id: "id",
    role: "fox",
    text: alamedaIdAsk.text,
    actions: alamedaIdAsk.actions,
  });
  assert.equal(leftoverUseThisOnOlderTurns(alamedaAfterTap, alamedaUsed), 0);
  assert.equal(alamedaAfterTap.find((item) => item.id === "alameda-confirm")?.actions, undefined);
  assert.doesNotMatch(alamedaAfterTap.find((item) => item.id === "alameda-confirm")?.text ?? "", /Use this\?/);
  assert.equal(alamedaAfterTap[alamedaAfterTap.length - 1]?.text, DOC_INVITE_COPY.government_id);
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
  const alamedaAfterId = skipCurrentInvite(alamedaUsed);
  assert.equal(nextDocInvite(alamedaAfterId), "tax_return");
  assert.notEqual(nextDocInvite(alamedaAfterId), "bank_statement");
  const alamedaReturnAsk = nextFoxAsk(alamedaAfterId);
  assert.equal(alamedaReturnAsk.text, LAST_YEAR_FEDERAL_RETURN_ASK);
  assert.equal(alamedaReturnAsk.text, "Last year’s Form 1040.");
  assert.doesNotMatch(
    alamedaReturnAsk.text,
    /other income|other property|household size|declaration|dependent names|named dependents/i,
  );
  assert.doesNotMatch(alamedaReturnAsk.text, /two recent statements|bank statement/i);
  assert.deepEqual(
    (alamedaReturnAsk.actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );
  assert.equal(docInviteBlocksLooksRight(alamedaAfterId), true, "Looks right waits on the return ask");
  assert.equal(canLooksRight(alamedaAfterId), false, "Looks right stays after the return ask");
  const usefulAfterId = (stillUsefulSection(alamedaAfterId)?.items ?? []).map((item) => item.label);
  assert.ok(
    usefulAfterId.some((label) => /W-2/i.test(label)),
    `Still useful must keep skipped W-2 — ${usefulAfterId.join(" · ")}`,
  );
  const alamedaAfterReturnSkip = skipCurrentInvite(alamedaAfterId);
  assert.notEqual(nextDocInvite(alamedaAfterReturnSkip), "bank_statement");
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
  assert.ok(canLooksRight(alamedaAfterReturnSkip) || workspacePrompt(alamedaAfterReturnSkip) === "review");
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
  const combesProposed = applyExtractedFields(alamedaAfterId, {
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
  const lastYearAsk = (text: string) => /Last year.?s (?:federal return|Form 1040)/i.test(text);
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
  assert.equal(liveSkipChipRows(dirtyReturn, combesStamped), 1, "one chip row on the last Fox line");
  assert.equal(
    dirtyReturn.filter((item) => (item.actions ?? []).some((action) => action.label === "Skip")).length,
    1,
  );
  assert.equal(
    (dirtyReturn.find((item) => item.text === "Tax return transcript · 2023")?.actions ?? []).filter(
      (action) => action.label === "Skip",
    ).length,
    1,
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
    "Last year’s Form 1040 has zero Skip chips once a later Fox line is live",
  );
  assert.equal(sealedOffer.find((item) => lastYearAsk(item.text ?? ""))?.actions, undefined);
  assert.equal(liveSkipChipRows(sealedOffer, combesStamped), 1, "only the last line has one Skip");
  assert.equal(
    (sealedOffer.find((item) => item.text === combesAskLine)?.actions ?? []).filter(
      (action) => action.label === "Skip",
    ).length,
    1,
  );
  const reappendAfterTranscript = sealStoredFoxThread([
    { ...returnSkipRow, id: "ret-before", actions: [receivedSkip, receivedSkip, receivedSkip] },
    { id: "t-live-2", role: "fox", ...transcriptBlock },
    { ...returnSkipRow, id: "ret-reappend", actions: [receivedSkip, receivedSkip, receivedSkip] },
  ]);
  assert.equal(reappendAfterTranscript.find((item) => lastYearAsk(item.text ?? ""))?.actions, undefined);
  assert.equal(leftoverSkipOnAskText(reappendAfterTranscript, combesStamped, lastYearAsk), 0);
  assert.equal(
    (reappendAfterTranscript.find((item) => item.text === "Tax return transcript · 2023")?.actions ?? []).filter(
      (action) => action.label === "Skip",
    ).length,
    1,
  );
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
      id: "id-next",
      role: "fox",
      text: DOC_INVITE_COPY.government_id,
      actions: [
        { id: "upload-this", label: "Upload this", event: "open-docs", capture: { field: "open-docs" } },
        { id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } },
      ],
    },
  ]);
  assert.equal(
    afterAlamedaUseThis.find((item) => item.id === "alameda-period")?.actions,
    undefined,
    "Period Use this is history after the tap",
  );
  assert.equal(afterAlamedaUseThis[afterAlamedaUseThis.length - 1]?.text, DOC_INVITE_COPY.government_id);
  assert.deepEqual(
    (afterAlamedaUseThis[afterAlamedaUseThis.length - 1]?.actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
    "ID ask stays current after Alameda Use this — do not replace it under the client tap",
  );
  assert.equal(docInviteBlocksLooksRight(combesProposed.draft), true);
  assert.equal(canLooksRight(combesProposed.draft), false);
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
    ...alamedaAfterId,
    documents: [
      ...alamedaAfterId.documents,
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
  console.log("assert-first-session-page-read: ID · W-2 · stub · bank · contract · tax locked; unread invents nothing");
}

main();
