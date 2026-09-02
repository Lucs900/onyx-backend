import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { pdfTextLayerCharCount, readPdfTextLayer } from "../lib/docs/pdfText";
import { conventionalFileFromDraft } from "../components/fox/conventionalFile";
import { applyExtractedFields, stillUsefulSection } from "../components/fox/fileWrite";
import { resolveProposal } from "../components/fox/completeness";
import { nextFoxAsk, previewFacts } from "../components/fox/workspace";
import { emptyDraft } from "../components/fox/store";
import { readPrintedSample } from "../lib/docs/printedSample";
import type { ExtractClass, FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const WALK = [
  "scripts/fixtures/government-id-jordan.pdf",
  "scripts/fixtures/paystub-ot-bonus-2026.pdf",
  "scripts/fixtures/paystub-bonus-declining-2026.pdf",
  "scripts/fixtures/w2-ot-bonus-2025.pdf",
  "scripts/fixtures/w2-bonus-2025.pdf",
] as const;

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on a text-layer PDF");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on a text-layer PDF");
  },
};

function structureWrote(draft: FoxIntakeDraft) {
  return previewFacts(draft)
    .filter((fact) =>
      /borrower|employer|pay|qualifying|docs|history|employment|address/i.test(`${fact.id} ${fact.label}`),
    )
    .map((fact) => `${fact.label}: ${fact.value}${fact.note ? ` (${fact.note})` : ""}`);
}

function stillUsefulLabels(draft: FoxIntakeDraft) {
  return stillUsefulSection(draft)?.items.map((item) => item.label) ?? [];
}

const OFFICIAL_BANK = "scripts/fixtures/05-bank-statement-pacific-coast-jul-2026.pdf";

function statementsSketch(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    valueAsked: true,
    amountAsked: true,
    otherReoAsked: true,
    statedOtherReo: "none",
    subjectAddress: "14 Oak Street",
    subjectAddressAsked: true,
    citizenshipAsked: true,
    agencyDeclarations: { citizenship: "us_citizen" },
  };
}

function w2Sketch(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    valueAsked: true,
    amountAsked: true,
    otherReoAsked: true,
    statedOtherReo: "none",
  };
}

async function main() {
  const sha = execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
  console.log(`walk SHA ${sha}`);
  const jordanIdPage = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-jordan.pdf")),
    "application/pdf",
    deadVision,
  );
  assert.equal(jordanIdPage.fields.full_name, "JORDAN HALE");
  assert.equal(jordanIdPage.fields.present_address, undefined);

  let draft = w2Sketch();
  console.log("Still useful before:", stillUsefulLabels(draft));

  for (const rel of WALK) {
    const name = rel.split("/").pop()!;
    const bytes = readFileSync(join(root, rel));
    const lines = readPdfTextLayer(bytes);
    assert.ok(lines?.length, `${rel} has no text layer`);
    const extracted = await classifyAndExtract(bytes, "application/pdf", deadVision);
    assert.notEqual(extracted.failed, true, `${rel} failed: ${extracted.warnings.join(" | ")}`);
    assert.ok(Object.keys(extracted.fields).length, `${rel} invented nothing and wrote nothing`);
    const applied = applyExtractedFields(draft, extracted);
    const extractClass = extracted.extractClass as ExtractClass;
    const receivedAt = `${name}-${draft.documents.length}`;
    draft = {
      ...applied.draft,
      documents: [
        ...applied.draft.documents,
        {
          slot: extractClass === "government_id" ? "id" : extractClass === "w2" ? "w2" : "paystubs",
          name,
          type: "application/pdf",
          size: bytes.length,
          receivedAt,
          status: "extracted",
          extractClass,
        },
      ],
    };
    if (draft.pendingProposal) {
      console.log(`after ${rel} (before confirm) Structure:`, structureWrote(draft));
      console.log(`  still useful:`, stillUsefulLabels(draft));
      console.log(`  pending: ${draft.pendingProposal.field}=${draft.pendingProposal.value}`);
      draft = resolveProposal(draft, "accept");
    }
    if (draft.pendingConflict) {
      console.log(`after ${rel} conflict ${draft.pendingConflict.field}: file=${draft.pendingConflict.fileValue} doc=${draft.pendingConflict.documentValue}`);
    }
    console.log(`after ${rel} confirm Structure:`, structureWrote(draft));
    console.log(`  still useful:`, stillUsefulLabels(draft));
    console.log(`  fields:`, extracted.fields);
    if (rel.endsWith("government-id-jordan.pdf")) {
      assert.equal(extracted.fields.present_address, undefined);
      assert.equal((draft.addressHistory ?? []).length, 0);
    }
    if (/w2-ot-bonus-2025|w2-bonus-2025|paystub-ot-bonus-2026|paystub-bonus-declining-2026/.test(rel)) {
      assert.equal(draft.facts?.employer_name, undefined, `${rel} holds employer until Use this`);
      assert.ok(
        !(draft.employmentHistory ?? []).some((item) => /HARBOR STEEL/i.test(item.label ?? "")),
        `${rel} must not write Harbor Steel before Use this`,
      );
    }
  }

  const aliasId = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-name-alias.pdf")),
    "application/pdf",
    deadVision,
    null,
    "id.pdf",
  );
  assert.equal(aliasId.failed, undefined);
  assert.equal(aliasId.fields.full_name, "JORDAN HALE");
  assert.equal(aliasId.fields.present_address, "14 OAK STREET");

  const unlabeled = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-unlabeled-text.pdf")),
    "application/pdf",
    deadVision,
    null,
    "id.pdf",
  );
  assert.equal(unlabeled.failed, true);
  assert.ok(pdfTextLayerCharCount(readFileSync(join(root, "scripts/fixtures/government-id-unlabeled-text.pdf"))) > 0);
  assert.deepEqual(unlabeled.fields, {});

  const emptyLayer = await classifyAndExtract(
    readFileSync(join(root, "scripts/fixtures/government-id-no-text-layer.pdf")),
    "application/pdf",
    deadVision,
    null,
    "id.pdf",
  );
  assert.equal(emptyLayer.failed, true);
  assert.equal(pdfTextLayerCharCount(readFileSync(join(root, "scripts/fixtures/government-id-no-text-layer.pdf"))), 0);
  assert.ok(emptyLayer.warnings.includes("no-text-layer"));
  assert.equal(emptyLayer.extractClass, "government_id");

  const officialBankBytes = readFileSync(join(root, OFFICIAL_BANK));
  assert.ok(readPdfTextLayer(officialBankBytes)?.length, `${OFFICIAL_BANK} has no text layer`);
  const officialPrinted = readPrintedSample(officialBankBytes);
  assert.equal(officialPrinted?.extractClass, "bank_statement");
  assert.equal(officialPrinted?.fields.institution, "Pacific Coast Bank");
  assert.equal(officialPrinted?.fields.ending_balance, "84220.15");
  assert.equal(officialPrinted?.fields.account_last4, undefined);
  assert.match(officialPrinted?.fields.present_address ?? "", /1847 Filbert/);
  assert.equal(officialPrinted?.fields.property_address, undefined);
  const officialBank = await classifyAndExtract(
    officialBankBytes,
    "application/pdf",
    deadVision,
    "bank_statement",
    "05-bank-statement-pacific-coast-jul-2026.pdf",
  );
  assert.notEqual(officialBank.failed, true, `official bank failed: ${officialBank.warnings.join(" | ")}`);
  assert.equal(officialBank.extractClass, "bank_statement");
  assert.equal(officialBank.fields.institution, "Pacific Coast Bank");
  assert.equal(officialBank.fields.ending_balance, "84220.15");
  assert.equal(officialBank.fields.account_last4, undefined);
  assert.equal(officialBank.fields.property_address, undefined);
  const officialPending = applyExtractedFields(statementsSketch(), officialBank);
  assert.equal(officialPending.draft.facts?.institution, undefined);
  assert.equal(officialPending.draft.facts?.ending_balance, undefined);
  assert.equal(officialPending.draft.statedAvailableAssets, undefined);
  assert.equal(officialPending.draft.pendingProposal?.field, "statedAvailableAssets");
  assert.equal(officialPending.draft.pendingProposal?.value, "84220.15");
  assert.ok(
    !(officialPending.draft.pendingProposal?.extras ?? []).some(
      (item) => item.field === "account_last4" || item.field === "present_address" || item.field === "property_address",
    ),
  );
  const officialAsk = nextFoxAsk(officialPending.draft);
  assert.match(officialAsk.text, /Pacific Coast Bank/);
  assert.match(officialAsk.text, /\$84,220\.15/);
  assert.match(officialAsk.text, /Use this/);
  assert.ok((officialAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok((officialAsk.actions ?? []).some((item) => item.label === "Change"));
  assert.doesNotMatch(officialAsk.text, /Filbert|last4|account number/i);
  const officialUsed = resolveProposal(officialPending.draft, "accept");
  assert.equal(officialUsed.facts?.institution?.value, "Pacific Coast Bank");
  assert.equal(officialUsed.facts?.ending_balance?.value, "84220.15");
  assert.equal(officialUsed.facts?.account_last4, undefined);
  assert.equal(officialUsed.statedAvailableAssets, 84220.15);
  assert.equal(officialUsed.subjectAddress, "14 Oak Street");
  assert.doesNotMatch(`${officialUsed.subjectAddress} ${officialUsed.facts?.property_address?.value ?? ""}`, /Filbert/i);
  assert.equal(conventionalFileFromDraft(officialUsed).assets.institution, "Pacific Coast Bank");
  assert.equal(conventionalFileFromDraft(officialUsed).assets.suggestedBalance, "84220.15");
  assert.equal(conventionalFileFromDraft(officialUsed).assets.last4, undefined);
  assert.equal(conventionalFileFromDraft(officialUsed).property.address, "14 Oak Street");
  assert.ok(
    previewFacts(officialUsed).every(
      (fact) => fact.id !== "file-assets" || !/last4 \d|Filbert/i.test(fact.value),
    ),
  );
  const officialSkipped = resolveProposal(officialPending.draft, "decline");
  assert.equal(officialSkipped.facts?.institution, undefined);
  assert.equal(officialSkipped.facts?.ending_balance, undefined);
  assert.equal(officialSkipped.statedAvailableAssets, undefined);
  assert.equal(conventionalFileFromDraft(officialSkipped).assets.institution, undefined);
  assert.equal(conventionalFileFromDraft(officialSkipped).assets.suggestedBalance, undefined);
  assert.equal(officialSkipped.subjectAddress, "14 Oak Street");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
