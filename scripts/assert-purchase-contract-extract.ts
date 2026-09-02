/**
 * Composer paperclip of 02-purchase-contract-valencia.pdf.
 * Use this writes subject address, price, close date, and seller credit.
 * Contingency dates sit as dates. Skip leaves Purchase contract on Still useful.
 * ID street stays residence. No FNMA fail. Addenda review stays in_queue.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { readPdfTextLayer } from "../lib/docs/pdfText";
import { printedSampleFromLines, readPrintedSample } from "../lib/docs/printedSample";
import {
  applyExtractedFields,
  DOC_INVITE_COPY,
  extractHintFromDraft,
  nextDocInvite,
  resolveFactConflict,
  skipCurrentInvite,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import { canLooksRight, proposalAskCopy, resolveProposal } from "../components/fox/completeness";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { applyCapture, applyExtractWrite, emptyDraft, getFoxDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import { conventionalFileFacts } from "../components/fox/conventionalFile";
import { docReactionAsk, nextFoxAsk, previewFacts, workspacePrompt, workspacePromptCopy } from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT = join(root, "sample-docs/02-purchase-contract-valencia.pdf");
const ID = join(root, "sample-docs/01-ca-id-jordan-hale.pdf");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on 02 text");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on 02 text");
  },
};

function buySketch(): FoxIntakeDraft {
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
    propertyType: "sfr",
    propertyTypeAsked: true,
    citizenshipAsked: true,
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    stubExtractAccepted: true,
    emailSkipped: true,
    documents: [
      {
        slot: "id",
        name: "01-ca-id-jordan-hale.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-09-02T00:00:00.000Z",
        status: "extracted",
        extractClass: "government_id",
      },
      {
        slot: "w2",
        name: "03-w2-2025-jordan-hale.pdf",
        type: "application/pdf",
        size: 8000,
        receivedAt: "2026-09-02T00:01:00.000Z",
        status: "extracted",
        extractClass: "w2",
      },
      {
        slot: "paystubs",
        name: "07-paystub-biweekly-loud.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-09-02T00:02:00.000Z",
        status: "extracted",
        extractClass: "paystub",
      },
    ],
    facts: {
      present_address: {
        field: "present_address",
        value: "1847 Filbert St, San Francisco, CA 94123",
        source: "document",
        confirmed: true,
      },
      w2_box5: { field: "w2_box5", value: "118400", source: "document", confirmed: true },
      employer_name: {
        field: "employer_name",
        value: "Harbor Pacific Design Inc",
        source: "document",
        confirmed: true,
      },
      paystub_monthly: { field: "paystub_monthly", value: "9999.99", source: "document", confirmed: true },
    },
    borrowerName: "Jordan Hale",
    contact: {
      ...emptyDraft().contact,
      fullName: { field: "fullName", value: "Jordan Hale", source: "suggested", confirmed: true },
    },
  };
}

function stillUsefulLabels(draft: FoxIntakeDraft) {
  return (stillUsefulSection(draft)?.items ?? []).map((item) => item.label);
}

function noFnma(text: string) {
  assert.doesNotMatch(text, /this fails FNMA|fails FNMA|FNMA fail|UW Manager|underwriting manager/i);
}

async function main() {
  const bytes = readFileSync(CONTRACT);
  const layer = readPdfTextLayer(bytes) ?? [];
  assert.ok(layer.length, "02 purchase contract has a text layer");
  assert.match(layer.join("\n"), /PURCHASE CONTRACT/i);
  assert.match(layer.join("\n"), /1840 Valencia/i);
  assert.match(layer.join("\n"), /\$1,200,000/);
  assert.match(layer.join("\n"), /10\/15\/2026/);
  assert.match(layer.join("\n"), /\$5,000/);
  assert.match(layer.join("\n"), /INSPECTION CONTINGENCY/i);
  assert.doesNotMatch(layer.join("\n"), /1847 Filbert|fails FNMA/i);

  const printed = readPrintedSample(bytes);
  assert.equal(printed?.extractClass, "purchase_contract");
  assert.match(printed?.fields.property_address ?? "", /1840 Valencia/i);
  assert.equal(printed?.fields.purchase_price, "1200000");
  assert.match(printed?.fields.close_date ?? "", /10\/15\/2026|2026-10-15/);
  assert.equal(printed?.fields.seller_credit, "5000");
  assert.match(printed?.fields.inspection_contingency ?? "", /09\/20\/2026/);
  assert.match(printed?.fields.loan_contingency ?? "", /10\/01\/2026/);
  assert.match(printed?.fields.appraisal_contingency ?? "", /09\/25\/2026/);
  assert.match(printed?.fields.addenda ?? "", /Counter offer/i);
  assert.equal(printed?.fields.present_address, undefined);

  const noCredit = printedSampleFromLines([
    "PURCHASE CONTRACT",
    "PROPERTY ADDRESS: 1840 Valencia St",
    "PURCHASE PRICE: $1,200,000",
    "SELLER CREDIT: none",
  ]);
  assert.equal(noCredit?.fields.seller_credit, undefined);

  const extracted = await classifyAndExtract(
    bytes,
    "application/pdf",
    deadVision,
    "purchase_contract",
    "02-purchase-contract-valencia.pdf",
  );
  assert.notEqual(extracted.failed, true, "02 text layer is confirm, not unread");
  assert.equal(extracted.extractClass, "purchase_contract");
  assert.match(extracted.fields.property_address ?? "", /1840 Valencia/i);
  assert.equal(extracted.fields.purchase_price, "1200000");
  assert.equal(extracted.fields.seller_credit, "5000");
  assert.equal(extracted.fields.present_address, undefined);

  const idBytes = readFileSync(ID);
  const idRead = await classifyAndExtract(
    idBytes,
    "application/pdf",
    deadVision,
    "government_id",
    "01-ca-id-jordan-hale.pdf",
  );
  assert.match(idRead.fields.present_address ?? "", /1847 Filbert/i);
  assert.equal(idRead.fields.property_address, undefined);

  const sketch = buySketch();
  assert.equal(extractHintFromDraft(sketch, "02-purchase-contract-valencia.pdf"), "purchase_contract");
  assert.ok(stillUsefulLabels(sketch).some((label) => /purchase contract/i.test(label)));

  const preLooks = {
    ...sketch,
    sampleAccepted: false,
    subjectAddressAsked: true,
    skippedClasses: ["bank_statement"],
  };
  assert.equal(nextDocInvite(preLooks), null);
  assert.notEqual(nextDocInvite(preLooks), "purchase_contract");
  assert.equal(canLooksRight(preLooks), true);
  const afterLooks = applyLooksRightMotion(preLooks);
  assert.equal(nextDocInvite(afterLooks), "purchase_contract");
  assert.equal(workspacePrompt(afterLooks), "documents");
  const looksAsk = nextFoxAsk(afterLooks);
  assert.equal(looksAsk.text, DOC_INVITE_COPY.purchase_contract);
  assert.match(looksAsk.text, /purchase contract/i);
  assert.match(looksAsk.text, /property on paper/i);
  assert.doesNotMatch(looksAsk.text, /Government ID|, and |What’s a good email|email/i);
  assert.doesNotMatch(looksAsk.followUp ?? "", /Government ID|Purchase contract|Bank statement/i);
  assert.deepEqual(
    (looksAsk.actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );
  assert.ok(!(looksAsk.actions ?? []).some((item) => item.label === "Proceed"));
  assert.equal(workspacePromptCopy("documents", afterLooks).text, DOC_INVITE_COPY.purchase_contract);
  noFnma(looksAsk.text);

  loadIntakeDraft(afterLooks);
  applyCapture({ field: "skip-docs" });
  const skippedInvite = getFoxDraft();
  assert.ok((skippedInvite.skippedClasses ?? []).includes("purchase_contract"));
  assert.ok(
    stillUsefulLabels(skippedInvite).some((label) => /purchase contract/i.test(label)),
    stillUsefulLabels(skippedInvite).join(" · "),
  );
  assert.notEqual(nextDocInvite(skippedInvite), "purchase_contract");
  assert.doesNotMatch(nextFoxAsk(skippedInvite).text, /What’s a good email|email/i);
  noFnma(nextFoxAsk(skippedInvite).text);

  const composerFile = new File([bytes], "02-purchase-contract-valencia.pdf", { type: "" });
  const snapshotType = "application/pdf";
  const keep = new File([new Blob([await composerFile.arrayBuffer()], { type: snapshotType })], composerFile.name, {
    type: snapshotType,
  });
  const composerForm = new FormData();
  composerForm.append("file", keep, keep.name);
  composerForm.append("name", keep.name);
  composerForm.append("type", snapshotType);
  composerForm.append("hint", "purchase_contract");
  const { POST: extractRoutePost } = await import("../app/api/docs/extract/route");
  const composerPosted = await extractRoutePost(
    new Request("http://local/api/docs/extract", { method: "POST", body: composerForm }),
  );
  const composerRead = (await composerPosted.json()) as {
    class?: string;
    fields?: Record<string, string>;
    failed?: boolean;
    source?: string;
    confidence?: number;
  };
  assert.equal(composerPosted.status, 200);
  assert.equal(composerRead.source, "file");
  assert.notEqual(composerRead.failed, true, "composer File of 02 is confirm, not unread");
  assert.equal(composerRead.class, "purchase_contract");
  assert.match(composerRead.fields?.property_address ?? "", /1840 Valencia/i);
  assert.equal(composerRead.fields?.purchase_price, "1200000");
  assert.equal(composerRead.fields?.seller_credit, "5000");

  const receivedAt = "2026-09-02T00:10:00.000Z";
  loadIntakeDraft(sketch);
  receiveDocument({
    slot: "other",
    name: keep.name,
    type: snapshotType,
    size: keep.size,
    receivedAt,
  });
  const composerWrite = applyExtractWrite(
    receivedAt,
    keep.name,
    {
      extractClass: (composerRead.class as "purchase_contract") ?? "other",
      confidence: typeof composerRead.confidence === "number" ? composerRead.confidence : 0.94,
      fields: composerRead.fields ?? {},
    },
    composerRead.note as string | undefined,
    Boolean(composerRead.failed),
  );
  assert.equal(composerWrite.extractClass, "purchase_contract");
  assert.equal(composerWrite.draft.subjectAddress, undefined);
  assert.equal(composerWrite.draft.facts?.purchase_price, undefined);
  assert.equal(composerWrite.draft.facts?.close_date, undefined);
  assert.equal(composerWrite.draft.facts?.seller_credit, undefined);
  assert.equal(composerWrite.draft.pendingProposal?.field, "property_address");
  assert.match(composerWrite.draft.pendingProposal?.value ?? "", /1840 Valencia/i);
  const extras = composerWrite.draft.pendingProposal?.extras ?? [];
  assert.ok(extras.some((item) => item.field === "purchase_price" && item.value === "1200000"));
  assert.ok(extras.some((item) => item.field === "close_date"));
  assert.ok(extras.some((item) => item.field === "seller_credit" && item.value === "5000"));
  assert.ok(extras.some((item) => item.field === "inspection_contingency"));
  noFnma(JSON.stringify(composerWrite));

  const composerAsk = docReactionAsk(composerWrite.draft, "purchase_contract") ?? {
    text: proposalAskCopy(composerWrite.draft.pendingProposal!),
  };
  assert.match(composerAsk.text, /The contract shows 1840 Valencia/i);
  assert.match(composerAsk.text, /\$1,200,000/);
  assert.match(composerAsk.text, /close 10\/15\/2026|close 2026-10-15/);
  assert.match(composerAsk.text, /seller credit \$5,000/);
  assert.match(composerAsk.text, /Suggested · not underwritten/);
  assert.match(composerAsk.text, /Use this/);
  noFnma(composerAsk.text);
  assert.deepEqual((composerAsk.actions ?? []).map((item) => item.label), ["Use this", "Skip"]);
  assert.ok(
    previewFacts(composerWrite.draft).every(
      (fact) =>
        !/1840 Valencia/i.test(`${fact.label} ${fact.value}`) &&
        (fact.id !== "file-property" || !/Valencia/i.test(fact.value)),
    ),
  );
  assert.ok(
    previewFacts(composerWrite.draft).every((fact) => fact.id !== "docs" || !/Purchase contract in/.test(fact.value)),
  );
  assert.ok(
    stillUsefulLabels(composerWrite.draft).some((label) => /purchase contract/i.test(label)),
    stillUsefulLabels(composerWrite.draft).join(" · "),
  );

  loadIntakeDraft(composerWrite.draft);
  applyCapture({ field: "skip-docs" });
  const skipped = getFoxDraft();
  assert.ok(!skipped.pendingProposal);
  assert.equal(skipped.subjectAddress, undefined);
  assert.equal(skipped.facts?.purchase_price, undefined);
  assert.equal(skipped.facts?.seller_credit, undefined);
  assert.ok((skipped.skippedClasses ?? []).includes("purchase_contract"));
  assert.ok(
    stillUsefulLabels(skipped).some((label) => /purchase contract/i.test(label)),
    stillUsefulLabels(skipped).join(" · "),
  );
  noFnma(nextFoxAsk(skipped).text);

  const skippedFromConfirm = skipCurrentInvite(composerWrite.draft);
  assert.ok(!skippedFromConfirm.pendingProposal);
  assert.ok(stillUsefulLabels(skippedFromConfirm).some((label) => /purchase contract/i.test(label)));

  const used = resolveProposal(composerWrite.draft, "accept");
  assert.match(used.subjectAddress ?? "", /1840 Valencia/i);
  assert.notEqual(used.subjectAddress, used.facts?.present_address?.value);
  assert.doesNotMatch(used.subjectAddress ?? "", /1847 Filbert/i);
  assert.equal(used.facts?.property_address?.value, used.subjectAddress);
  assert.equal(used.facts?.purchase_price?.value, "1200000");
  assert.equal(used.propertyValueAmount, 1_200_000);
  assert.match(used.facts?.close_date?.value ?? "", /10\/15\/2026|2026-10-15/);
  assert.equal(used.facts?.seller_credit?.value, "5000");
  assert.match(used.facts?.inspection_contingency?.value ?? "", /09\/20\/2026/);
  assert.match(used.facts?.loan_contingency?.value ?? "", /10\/01\/2026/);
  assert.match(used.facts?.addenda?.value ?? "", /Counter offer/i);
  noFnma(JSON.stringify(used.facts ?? {}));
  assert.ok(!stillUsefulLabels(used).some((label) => /purchase contract/i.test(label)));
  const usedFacts = previewFacts(used);
  assert.ok(usedFacts.some((fact) => /1840 Valencia/i.test(fact.value)));
  assert.ok(usedFacts.some((fact) => fact.label === "Purchase price" && /\$1,200,000/.test(fact.value)));
  assert.ok(usedFacts.some((fact) => fact.label === "Close" && /October 15, 2026/.test(fact.value)));
  assert.ok(usedFacts.some((fact) => fact.label === "Seller credit" && /\$5,000/.test(fact.value)));
  assert.ok(usedFacts.every((fact) => fact.id !== "file-property" || !/1847 Filbert/i.test(fact.value)));
  assert.ok(
    conventionalFileFacts(used).every(
      (fact) => fact.id !== "file-assets" || fact.value === "" || /Pacific|4419|84,220/.test(fact.value),
    ),
  );

  const proceeded = applyProceedMotion({ ...used, emailSkipped: true });
  assert.equal(proceeded.motion, "in_queue");
  noFnma(nextFoxAsk(proceeded).text);
  assert.doesNotMatch(JSON.stringify(proceeded), /UW Manager|this fails FNMA/i);

  const conflictDraft = applyExtractedFields(
    {
      ...sketch,
      propertyValueAmount: 850_000,
      documents: [
        ...sketch.documents,
        {
          slot: "other",
          name: keep.name,
          type: snapshotType,
          size: keep.size,
          receivedAt: "2026-09-02T00:11:00.000Z",
          status: "extracted",
          extractClass: "purchase_contract",
        },
      ],
    },
    {
      extractClass: "purchase_contract",
      confidence: 0.94,
      fields: extracted.fields ?? {},
    },
  );
  assert.equal(conflictDraft.conflict?.field, "purchase_price");
  assert.equal(conflictDraft.draft.pendingConflict?.field, "purchase_price");
  assert.equal(conflictDraft.draft.propertyValueAmount, 850_000);
  assert.equal(conflictDraft.draft.subjectAddress, undefined);
  const conflictAsk = nextFoxAsk(conflictDraft.draft);
  noFnma(conflictAsk.text);
  assert.ok((conflictAsk.actions ?? []).some((item) => item.label === "Keep file"));
  assert.ok((conflictAsk.actions ?? []).some((item) => item.label === "Use document"));
  const kept = resolveFactConflict(conflictDraft.draft, "file");
  assert.equal(kept.propertyValueAmount, 850_000);
  assert.ok(!kept.pendingConflict);
  const documented = resolveFactConflict(conflictDraft.draft, "document");
  assert.equal(documented.propertyValueAmount, 1_200_000);
  assert.ok(!documented.pendingConflict);
  noFnma(nextFoxAsk(kept).text);
  noFnma(nextFoxAsk(documented).text);

  const zipOnly = {
    ...sketch,
    propertyValueAmount: 500_000,
    downPaymentAmount: 100_000,
    loanAmountValue: 400_000,
    subjectAddress: "94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
    facts: {
      ...sketch.facts,
      property_address: {
        field: "property_address",
        value: "94123",
        source: "client" as const,
        confirmed: true,
      },
    },
  };
  const clipperExtract = applyExtractedFields(zipOnly, {
    extractClass: "purchase_contract",
    confidence: 0.94,
    fields: {
      property_address: "88 Clipper Street, San Francisco, CA 94114",
      purchase_price: "850000",
      close_date: "10/15/2026",
      seller_credit: "5000",
    },
  });
  assert.equal(clipperExtract.conflict?.field, "purchase_price");
  assert.equal(clipperExtract.draft.subjectAddress, "94123");
  assert.equal(clipperExtract.draft.pendingProposal?.field, "property_address");
  assert.match(clipperExtract.draft.pendingProposal?.value ?? "", /88 Clipper Street/i);
  assert.ok((clipperExtract.draft.pendingProposal?.extras ?? []).some((item) => item.field === "close_date"));
  assert.ok(
    (clipperExtract.draft.pendingProposal?.extras ?? []).some(
      (item) => item.field === "seller_credit" && item.value === "5000",
    ),
  );
  const clipperPriced = resolveFactConflict(clipperExtract.draft, "document");
  assert.equal(clipperPriced.propertyValueAmount, 850_000);
  assert.ok(!clipperPriced.pendingConflict);
  assert.equal(clipperPriced.pendingProposal?.field, "property_address");
  const clipperUsed = resolveProposal(clipperPriced, "accept");
  assert.match(clipperUsed.subjectAddress ?? "", /88 Clipper Street/i);
  assert.match(clipperUsed.subjectAddress ?? "", /San Francisco, CA 94114/i);
  assert.doesNotMatch(clipperUsed.subjectAddress ?? "", /94123|Filbert/i);
  assert.equal(clipperUsed.facts?.property_address?.value, clipperUsed.subjectAddress);
  assert.equal(clipperUsed.facts?.purchase_price?.value, "850000");
  assert.equal(clipperUsed.propertyValueAmount, 850_000);
  assert.match(clipperUsed.facts?.close_date?.value ?? "", /10\/15\/2026|2026-10-15/);
  assert.equal(clipperUsed.facts?.seller_credit?.value, "5000");
  assert.match(clipperUsed.facts?.present_address?.value ?? "", /1847 Filbert/i);
  const clipperFacts = previewFacts(clipperUsed);
  assert.ok(clipperFacts.some((fact) => /88 Clipper Street, San Francisco, CA 94114/i.test(fact.value)));
  assert.ok(clipperFacts.some((fact) => fact.label === "Purchase price" && /\$850,000/.test(fact.value)));
  assert.ok(clipperFacts.some((fact) => fact.label === "Close" && /October 15, 2026/.test(fact.value)));
  assert.ok(clipperFacts.some((fact) => fact.label === "Seller credit" && /\$5,000/.test(fact.value)));
  assert.ok(
    clipperFacts.every(
      (fact) =>
        (fact.id !== "address" && fact.id !== "file-property" && fact.label !== "Property address") ||
        !/94123/.test(fact.value),
    ),
    clipperFacts.map((fact) => `${fact.label} ${fact.value}`).join(" · "),
  );
  assert.ok(clipperFacts.every((fact) => fact.id !== "file-property" || !/Filbert/i.test(fact.value)));
  noFnma(nextFoxAsk(clipperUsed).text);

  const emptyAssets = conventionalFileFacts({ ...emptyDraft(), productIntent: "buy", path: "acr" });
  assert.ok(emptyAssets.some((fact) => fact.id === "file-assets" && fact.value === ""));

  console.log("purchase-contract extract PASS", used.subjectAddress, used.facts?.seller_credit?.value);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
