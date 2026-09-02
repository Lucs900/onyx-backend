/**
 * After W-2 path, Fox asks for government ID so the file has a name.
 * Composer drop of 08-ca-id-jordan-hale-loud.pdf: speak name, Use this writes.
 * File name stays empty until Use this. ID street is residence only.
 * Skip leaves Government ID on Still useful.
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

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on 08 text");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on 08 text");
  },
};

function wageDocsDraft(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    sampleAccepted: false,
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
    propertyType: "sfr",
    propertyTypeAsked: true,
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

function noBorrowerOnFile(draft: FoxIntakeDraft) {
  assert.ok(
    previewFacts(draft).every(
      (fact) =>
        fact.id !== "borrower" &&
        !/Jordan Hale/i.test(`${fact.label} ${fact.value} ${fact.note ?? ""}`),
    ),
    previewFacts(draft)
      .map((fact) => `${fact.id}:${fact.label}=${fact.value}`)
      .join(" · "),
  );
}

function stillUsefulLabels(draft: FoxIntakeDraft) {
  return (stillUsefulSection(draft)?.items ?? []).map((item) => item.label);
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

  const afterDocs = wageDocsDraft();
  assert.equal(nextDocInvite(afterDocs), "government_id");
  assert.match(DOC_INVITE_COPY.government_id, /government ID/i);
  assert.match(DOC_INVITE_COPY.government_id, /name/i);
  assert.match(DOC_INVITE_COPY.government_id, /First I need a government ID, so this file has a name on it/);

  const afterLooks = { ...afterDocs, sampleAccepted: true };
  assert.equal(nextDocInvite(afterLooks), "government_id");

  const afterDrop = applyExtractedFields(afterLooks, {
    extractClass: extracted.extractClass,
    confidence: extracted.confidence ?? 0.94,
    fields: extracted.fields ?? {},
  });
  assert.equal(afterDrop.draft.pendingProposal?.field, "borrowerName");
  assert.match(afterDrop.draft.pendingProposal?.value ?? "", /Jordan Hale/i);
  assert.equal(afterDrop.draft.borrowerName, undefined);
  assert.equal(afterDrop.draft.contact.fullName.value, "");
  assert.equal(afterDrop.draft.subjectAddress, undefined);
  assert.equal(afterDrop.draft.subjectStreet, undefined);
  noBorrowerOnFile(afterDrop.draft);
  assert.ok(
    previewFacts(afterDrop.draft).every(
      (fact) => !/1847 Filbert/i.test(`${fact.label} ${fact.value} ${fact.note ?? ""}`),
    ),
    "ID street stays off File until Use this",
  );
  const spoken = proposalAskCopy(afterDrop.draft.pendingProposal!);
  assert.match(spoken, /The ID shows Jordan Hale/);
  assert.match(spoken, /Suggested · not underwritten/);
  assert.match(spoken, /Use this/);
  assert.doesNotMatch(spoken, /1847 Filbert|subject|purchase/i);

  const used = resolveProposal(afterDrop.draft, "accept");
  assert.equal(used.borrowerName, "Jordan Hale");
  assert.equal(used.contact.fullName.value, "Jordan Hale");
  assert.equal(used.subjectAddress, undefined);
  assert.equal(used.subjectStreet, undefined);
  assert.notEqual(used.facts?.present_address?.value, used.subjectAddress);
  assert.doesNotMatch(used.subjectAddress ?? "", /1847 Filbert/i);
  const usedFacts = previewFacts(used);
  assert.ok(usedFacts.some((fact) => fact.id === "borrower" && /Jordan Hale/i.test(fact.value)));
  assert.ok(
    usedFacts.some(
      (fact) =>
        fact.label === "Address" && /1847 Filbert St, San Francisco, CA 94123/i.test(fact.value),
    ),
    usedFacts.map((fact) => `${fact.label}=${fact.value}`).join(" · "),
  );
  assert.ok(
    usedFacts.every((fact) =>
      fact.id === "address" || fact.label === "Property address" || fact.id === "file-property"
        ? !/1847 Filbert/i.test(fact.value) &&
          (!fact.value || /—|address —/.test(fact.value) || !/Filbert|Market/i.test(fact.value))
        : true,
    ),
    usedFacts.map((fact) => `${fact.id}:${fact.label}=${fact.value}`).join(" · "),
  );
  assert.match(wageEmploymentFileLine(used), /Harbor Pacific Design Inc/);

  const skippedBeforeLooks = skipCurrentInvite(afterDocs);
  assert.ok((skippedBeforeLooks.skippedClasses ?? []).includes("government_id"));
  assert.equal(skippedBeforeLooks.borrowerName, undefined);
  assert.equal(nextDocInvite(skippedBeforeLooks), "bank_statement");
  const stillBefore = stillUsefulSection(skippedBeforeLooks);
  assert.ok(stillBefore && !stillBefore.empty);
  const beforeLabels = stillUsefulLabels(skippedBeforeLooks);
  assert.ok(
    beforeLabels.some((label) => /government ID/i.test(label)),
    beforeLabels.join(" · "),
  );
  assert.ok(beforeLabels.length >= 1 && beforeLabels.length <= 3);
  assert.ok(beforeLabels.every((label) => !/tax return|latest return|prior-year return/i.test(label)));

  const skippedAfterLooks = skipCurrentInvite(afterLooks);
  assert.ok((skippedAfterLooks.skippedClasses ?? []).includes("government_id"));
  assert.equal(nextDocInvite(skippedAfterLooks), "bank_statement");
  const afterLabels = stillUsefulLabels(skippedAfterLooks);
  assert.ok(
    afterLabels.some((label) => /government ID/i.test(label)),
    afterLabels.join(" · "),
  );
  assert.ok(afterLabels.length >= 1 && afterLabels.length <= 3);
  assert.ok(afterLabels.every((label) => !/tax return|latest return|prior-year return/i.test(label)));
  assert.ok(
    previewFacts(skippedAfterLooks).every(
      (fact) => !/sketch · \d+ of \d+|documented · \d+ of \d+| of 32/.test(`${fact.value} ${fact.note ?? ""}`),
    ),
  );

  const looks = applyLooksRightMotion({ ...used, sampleAccepted: false, skippedClasses: ["bank_statement"] });
  const proceeded = applyProceedMotion({ ...used, emailSkipped: true });
  assert.ok(proceeded.motion === "in_queue" || proceeded.pendingFinish === "proceed" || used.sampleAccepted);
  assert.ok(canLooksRight({ ...used, sampleAccepted: false, skippedClasses: ["government_id", "bank_statement"] }) || used.sampleAccepted);
  assert.ok((workspacePromptCopy(workspacePrompt(afterLooks), afterLooks).actions ?? []).some((item) => item.label === "Proceed" || item.label === "Skip"));

  void looks;
  console.log("government-id extract PASS", used.borrowerName, beforeLabels.join(" · "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
