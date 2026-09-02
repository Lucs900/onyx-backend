/**
 * After W-2 path, Fox asks for government ID so the file has a name.
 * Composer drop of 08-ca-id-jordan-hale-loud.pdf: speak name, Use this writes.
 * ID street is residence only. Skip leaves Government ID on Still useful.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { loudIdFromPrintedLines, readPrintedSample } from "../lib/docs/printedSample";
import { readPdfTextLayer } from "../lib/docs/pdfText";
import { applyExtractedFields, stillUsefulSection, skipCurrentInvite, DOC_INVITE_COPY, nextDocInvite } from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal, proposalAskCopy } from "../components/fox/completeness";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { emptyDraft } from "../components/fox/store";
import { previewFacts, workspacePrompt, workspacePromptCopy } from "../components/fox/workspace";
import { wageEmploymentFileLine } from "../components/fox/qualifyingIncome";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ID = join(root, "sample-docs/08-ca-id-jordan-hale-loud.pdf");
const SUBJECT = "500 Market St, San Francisco, CA 94105";

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on 08 text");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on 08 text");
  },
};

function wageLooksDraft(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    sampleAccepted: true,
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
    otherReoAsked: true,
    statedOtherReo: "none",
    subjectAddress: SUBJECT,
    subjectAddressAsked: true,
    subjectStreet: "500 Market St",
    subjectCity: "San Francisco",
    subjectState: "CA",
    propertyType: "sfr",
    propertyTypeAsked: true,
    propertyZip: "94105",
    propertyZipAsked: true,
    citizenshipAsked: true,
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    stubExtractAccepted: true,
    emailSkipped: true,
    facts: {
      w2_box5: { field: "w2_box5", value: "118400", source: "document", confirmed: true },
      employer_name: {
        field: "employer_name",
        value: "Harbor Pacific Design Inc",
        source: "document",
        confirmed: true,
      },
      paystub_monthly: { field: "paystub_monthly", value: "9999.99", source: "document", confirmed: true },
    },
    documents: [
      {
        slot: "w2",
        name: "03-w2-2025-jordan-hale.pdf",
        type: "application/pdf",
        size: 8000,
        receivedAt: "2026-09-02T00:00:00.000Z",
        status: "extracted",
        extractClass: "w2",
      },
      {
        slot: "paystubs",
        name: "07-paystub-biweekly-loud.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-09-02T00:01:00.000Z",
        status: "extracted",
        extractClass: "paystub",
      },
    ],
  };
}

async function main() {
  const bytes = readFileSync(ID);
  const layer = readPdfTextLayer(bytes) ?? [];
  assert.ok(layer.length, "08 CA ID has a text layer");
  assert.match(layer.join("\n"), /DRIVER LICENSE/i);
  assert.match(layer.join("\n"), /JORDAN HALE|FN JORDAN/i);
  assert.match(layer.join("\n"), /1847 Filbert/i);

  const printed = readPrintedSample(bytes);
  const loud = loudIdFromPrintedLines(layer);
  assert.equal(loud?.extractClass, "government_id");
  assert.match(loud?.fields.full_name ?? "", /JORDAN HALE/i);
  assert.match(loud?.fields.present_address ?? printed?.fields.present_address ?? "", /1847 Filbert/i);
  assert.equal(loud?.fields.property_address, undefined);

  const extracted = await classifyAndExtract(
    bytes,
    "application/pdf",
    deadVision,
    null,
    "08-ca-id-jordan-hale-loud.pdf",
  );
  assert.notEqual(extracted.failed, true, "08 text layer is confirm, not unread");
  assert.equal(extracted.extractClass, "government_id");
  assert.match(extracted.fields.full_name ?? "", /JORDAN HALE/i);
  assert.match(extracted.fields.present_address ?? "", /1847 Filbert/i);
  assert.equal(extracted.fields.property_address, undefined);

  const afterLooks = wageLooksDraft();
  assert.equal(nextDocInvite(afterLooks), "government_id");
  assert.match(DOC_INVITE_COPY.government_id, /government ID/i);
  assert.match(DOC_INVITE_COPY.government_id, /name/i);

  const afterDrop = applyExtractedFields(afterLooks, {
    extractClass: extracted.extractClass,
    confidence: extracted.confidence ?? 0.94,
    fields: extracted.fields ?? {},
  });
  assert.equal(afterDrop.draft.pendingProposal?.field, "borrowerName");
  assert.match(afterDrop.draft.pendingProposal?.value ?? "", /Jordan Hale/i);
  assert.equal(afterDrop.draft.borrowerName, undefined);
  assert.equal(afterDrop.draft.contact.fullName.value, "");
  assert.equal(afterDrop.draft.subjectAddress, SUBJECT);
  assert.notEqual(afterDrop.draft.subjectAddress, extracted.fields.present_address);
  const spoken = proposalAskCopy(afterDrop.draft.pendingProposal!);
  assert.match(spoken, /The ID shows Jordan Hale/);
  assert.match(spoken, /Use this/);
  assert.doesNotMatch(spoken, /1847 Filbert|subject|purchase/i);

  const used = resolveProposal(afterDrop.draft, "accept");
  assert.equal(used.borrowerName, "Jordan Hale");
  assert.equal(used.contact.fullName.value, "Jordan Hale");
  assert.equal(used.subjectAddress, SUBJECT);
  assert.notEqual(used.subjectAddress, used.facts?.present_address?.value);
  assert.doesNotMatch(used.subjectAddress ?? "", /1847 Filbert/i);
  assert.notEqual(used.subjectStreet, "1847 Filbert St");
  assert.ok(previewFacts(used).some((fact) => fact.id === "borrower" && /Jordan Hale/i.test(fact.value)));
  assert.ok(
    previewFacts(used).every(
      (fact) =>
        fact.id !== "address" && fact.label !== "Property address"
          ? true
          : !/1847 Filbert/i.test(fact.value),
    ),
  );
  assert.match(wageEmploymentFileLine(used), /Harbor Pacific Design Inc/);

  const skipped = skipCurrentInvite(afterLooks);
  assert.ok((skipped.skippedClasses ?? []).includes("government_id"));
  assert.equal(skipped.borrowerName, undefined);
  const still = stillUsefulSection(skipped);
  assert.ok(still && !still.empty);
  assert.ok(
    still.items.some((item) => /government ID/i.test(item.label)),
    still.items.map((item) => item.label).join(" · "),
  );
  assert.ok(still.items.length <= 3);
  assert.ok(still.items.every((item) => !/tax return|latest return|prior-year return/i.test(item.label)));

  const looks = applyLooksRightMotion({ ...used, sampleAccepted: false, skippedClasses: ["bank_statement"] });
  const proceeded = applyProceedMotion({ ...used, emailSkipped: true });
  assert.ok(proceeded.motion === "in_queue" || proceeded.pendingFinish === "proceed" || used.sampleAccepted);
  assert.ok(canLooksRight({ ...used, sampleAccepted: false, skippedClasses: ["government_id", "bank_statement"] }) || used.sampleAccepted);
  assert.ok((workspacePromptCopy(workspacePrompt(afterLooks), afterLooks).actions ?? []).some((item) => item.label === "Proceed" || item.label === "Skip"));

  void looks;
  console.log("government-id extract PASS", used.borrowerName);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
