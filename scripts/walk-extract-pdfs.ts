import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { pdfTextLayerCharCount, readPdfTextLayer } from "../lib/docs/pdfText";
import { applyExtractedFields, stillUsefulSection } from "../components/fox/fileWrite";
import { resolveProposal } from "../components/fox/completeness";
import { previewFacts } from "../components/fox/workspace";
import { emptyDraft } from "../components/fox/store";
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
      /borrower|employer|pay|qualifying|docs/i.test(`${fact.id} ${fact.label}`),
    )
    .map((fact) => `${fact.label}: ${fact.value}${fact.note ? ` (${fact.note})` : ""}`);
}

function stillUsefulLabels(draft: FoxIntakeDraft) {
  return stillUsefulSection(draft)?.items.map((item) => item.label) ?? [];
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
