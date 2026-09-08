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
  applyExtractedFields,
  displayFactValue,
  isBoxNumberAsDollars,
  isFirstSessionClass,
  lockFirstSessionFields,
  nextDocInvite,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import { resolveProposal, shouldSpeakPendingConfirm } from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
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
  DOC_INVITE_COPY,
  nextFoxAsk,
  previewFacts,
  unreadDocActions,
  workspacePrompt,
  workspacePromptCopy,
} from "../components/fox/workspace";
import {
  applyIdExtractAsk,
  freezeUsedFoxTurns,
  leftoverUseThisOnOlderTurns,
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
  assert.notEqual(alamedaAfterSkip.draft.facts?.gross_period?.confirmed, true);
  assert.equal(alamedaAfterSkip.draft.facts?.employer_name?.confirmed, undefined);
  const alamedaUsed = resolveProposal(alamedaAfterSkip.draft, "accept");
  assert.equal((alamedaUsed.employmentHistory ?? []).length, 1, "Use this writes one Employment row");
  assert.match(alamedaUsed.employmentHistory?.[0]?.label ?? "", /Alameda Health System/);
  assert.equal(
    wageEmploymentFileLine(alamedaUsed),
    "Alameda Health System, Period $16,824.30, OT $850",
  );
  assert.equal(alamedaUsed.facts?.gross_period?.confirmed, true);
  assert.equal(alamedaUsed.facts?.gross_period?.value, "16824.30");
  assert.equal(alamedaUsed.awaitingPayFrequency, false);
  assert.doesNotMatch(nextFoxAsk(alamedaUsed).text, /How often|paycheck/i);
  noSecrets(alamedaFields);
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
  console.log("assert-first-session-page-read: ID · W-2 · stub · bank · contract · tax locked; unread invents nothing");
}

main();
