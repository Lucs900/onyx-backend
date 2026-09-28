/**
 * Write-on-Use-this — committed Harbor stub.
 * Drop → propose Period → Use this → Employment keeps employer + Period.
 * Empty after Use this fails.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { resolveProposal } from "../components/fox/completeness";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { nextFoxAsk, workspacePrompt } from "../components/fox/workspace";
import { wageEmploymentFileLine } from "../components/fox/qualifyingIncome";
import { emptyDraft } from "../components/fox/store";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STUB = join(root, "sample-docs/07-paystub-biweekly-loud.pdf");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on committed Harbor stub");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on committed Harbor stub");
  },
};

const wageDocsSketch = {
  ...emptyDraft(),
  path: "acr" as const,
  productIntent: "buy" as const,
  workspaceFlow: true,
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "w2" as const },
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" as const },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" as const },
  creditAsked: true,
  creditBand: "760+" as const,
  propertyValueAmount: 1_200_000,
  loanAmountValue: 960_000,
  downPaymentAmount: 240_000,
  valueAsked: true,
  amountAsked: true,
  subjectAddress: "14 Oak Street, San Francisco, CA 94123",
  subjectAddressAsked: true,
  propertyZip: "94123",
  propertyZipAsked: true,
  yearsInBusinessAsked: true,
  monthlyDebtsAsked: true,
  propertyType: "house" as const,
  propertyTypeAsked: true,
};

async function main() {
  const bytes = readFileSync(STUB);
  assert.ok(bytes.length > 80 && bytes[0] === 0x25 && bytes[1] === 0x50, "committed Harbor stub is a PDF");
  const extracted = await classifyAndExtract(
    bytes,
    "application/pdf",
    deadVision,
    null,
    "07-paystub-biweekly-loud.pdf",
  );
  assert.notEqual(extracted.failed, true, "Harbor stub text layer is confirm");
  assert.equal(extracted.extractClass, "paystub");
  assert.equal(extracted.fields.employer_name, "Harbor Pacific Design Inc");
  assert.equal(extracted.fields.gross_period, "4615.38");

  const skipped = skipWageDocs(wageDocsSketch as FoxIntakeDraft);
  const afterDrop = applyExtractedFields(skipped, {
    extractClass: extracted.extractClass,
    confidence: extracted.confidence ?? 0.94,
    fields: extracted.fields ?? {},
  });
  assert.ok(afterDrop.draft.pendingProposal, "stub proposes Period");
  assert.equal(workspacePrompt(afterDrop.draft), "confirm-proposal");
  const confirm = nextFoxAsk(afterDrop.draft).text;
  assert.match(confirm, /Harbor Pacific Design Inc/);
  assert.match(confirm, /\$4,615\.38/, "drop proposes Period $4,615.38");
  assert.equal((afterDrop.draft.employmentHistory ?? []).length, 0, "File empty until Use this");
  assert.equal(wageEmploymentFileLine(afterDrop.draft), "", "Employment empty until Use this");

  const used = resolveProposal(afterDrop.draft, "accept");
  assert.ok((used.employmentHistory ?? []).length >= 1, "Use this writes Employment");
  assert.match(used.employmentHistory?.[0]?.label ?? "", /Harbor Pacific Design Inc/);
  const line = wageEmploymentFileLine(used);
  assert.notEqual(line, "", "empty Employment after Use this fails");
  assert.match(line, /Harbor Pacific Design Inc/);
  assert.match(line, /Period \$4,615\.38|\$4,615\.38/);
  assert.equal(used.pendingProposal, null);
  console.log("assert-use-this-employment: Harbor stub Use this writes Employment");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
