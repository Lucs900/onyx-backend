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
import {
  canLooksRight,
  purchaseFileAddsUp,
  proposalAskCopy,
  resolveProposal,
} from "../components/fox/completeness";
import { rateflowClientBodyFromDraft, rateflowBlockedReason } from "../lib/rateflow/fromDraft";
import { applyLooksRightMotion, applyNotYetMotion, applyProceedMotion } from "../components/fox/motion";
import { applyCapture, applyExtractWrite, emptyDraft, getFoxDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import { conventionalFileFacts } from "../components/fox/conventionalFile";
import {
  amountAskText,
  beginFileEdit,
  docReactionAsk,
  nextFoxAsk,
  parseFundsAmount,
  previewFacts,
  workspacePrompt,
  workspacePromptCopy,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
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

  const clipperPage = printedSampleFromLines([
    "CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT",
    "SUBJECT PROPERTY: 88 Clipper Street, San Francisco, CA 94114",
    "TOTAL PURCHASE PRICE: $850,000",
    "CLOSE OF ESCROW: October 15, 2026",
    "SELLER CONCESSION: $5,000.00",
  ]);
  assert.equal(clipperPage?.extractClass, "purchase_contract");
  assert.match(clipperPage?.fields.property_address ?? "", /88 Clipper Street/i);
  assert.equal(clipperPage?.fields.purchase_price, "850000");
  assert.match(clipperPage?.fields.close_date ?? "", /October 15, 2026|10\/15\/2026|2026-10-15/);
  assert.equal(clipperPage?.fields.seller_credit, "5000");

  const carNarrative = printedSampleFromLines([
    "CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT",
    "THE PROPERTY to be acquired is 88 Clipper Street, San Francisco, CA 94114",
    "THE PURCHASE PRICE offered is Eight Hundred Fifty Thousand Dollars $850,000.00",
    "Close of Escrow shall occur on October 15, 2026",
    "Seller credits Buyer $5,000.00 toward closing costs",
  ]);
  assert.equal(carNarrative?.extractClass, "purchase_contract");
  assert.match(carNarrative?.fields.property_address ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.equal(carNarrative?.fields.seller_credit, "5000");
  assert.doesNotMatch(carNarrative?.fields.property_address ?? "", /94123|Filbert/i);

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

  const zipOnlyPreLooks = {
    ...preLooks,
    subjectAddress: "94123",
    propertyZip: "94123",
    propertyZipAsked: true,
    facts: {
      ...preLooks.facts,
      property_address: {
        field: "property_address",
        value: "94123",
        source: "client" as const,
        confirmed: true,
      },
    },
  };
  assert.equal(nextDocInvite(zipOnlyPreLooks), "purchase_contract");
  assert.equal(canLooksRight(zipOnlyPreLooks), false);
  assert.equal(workspacePrompt(zipOnlyPreLooks), "documents");
  assert.equal(nextFoxAsk(zipOnlyPreLooks).text, DOC_INVITE_COPY.purchase_contract);
  assert.doesNotMatch(nextFoxAsk(zipOnlyPreLooks).text, /What’s a good email|email/i);
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

  const proceeded = applyProceedMotion({
    ...used,
    emailSkipped: false,
    contact: {
      ...used.contact,
      email: { field: "email", value: "", source: "client", confirmed: false },
    },
  });
  assert.equal(proceeded.motion, "in_queue");
  assert.equal(proceeded.nextActor, "ONYX");
  assert.equal(proceeded.pendingFinish, undefined);
  const proceededAsk = nextFoxAsk(proceeded);
  assert.equal(proceededAsk.text, "ONYX has this for review. I’m still here.");
  assert.equal(proceededAsk.followUp, undefined);
  assert.doesNotMatch(proceededAsk.text, /What’s a good email|email|This is the wait|What happens next/i);
  assert.deepEqual(
    (proceededAsk.actions ?? []).map((item) => item.label),
    ["Ask Fox", "Upload more", "Request human"],
  );
  noFnma(proceededAsk.text);
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
    sampleAccepted: false,
    skippedClasses: ["bank_statement"],
    propertyValueAmount: 500_000,
    downPaymentAmount: 100_000,
    loanAmountValue: 400_000,
    subjectAddress: "94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
    pendingAddress: {
      line: "San Francisco, CA 94123",
      street: "San Francisco, CA 94123",
      city: "San Francisco",
      state: "CA",
      zip: "94123",
    },
    documents: [
      ...sketch.documents,
      {
        slot: "other" as const,
        name: "02-purchase-contract.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-09-02T00:12:00.000Z",
        status: "extracted" as const,
        extractClass: "purchase_contract" as const,
      },
    ],
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
  assert.equal(clipperExtract.draft.pendingAddress, undefined);
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
  assert.match(clipperPriced.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.doesNotMatch(clipperPriced.subjectAddress ?? "", /94123|Filbert/i);
  assert.equal(clipperPriced.facts?.seller_credit?.value, "5000");
  assert.match(clipperPriced.facts?.close_date?.value ?? "", /10\/15\/2026|2026-10-15/);
  assert.ok(
    previewFacts(clipperPriced).some((fact) => /88 Clipper Street, San Francisco, CA 94114/i.test(fact.value)),
  );
  assert.ok(previewFacts(clipperPriced).some((fact) => fact.label === "Seller credit" && /\$5,000/.test(fact.value)));
  assert.ok(
    previewFacts(clipperPriced).every(
      (fact) =>
        fact.id !== "file-property" ||
        (/88 Clipper Street, San Francisco, CA 94114/i.test(fact.value) &&
          !/Primary · 94123 · House|94123/.test(fact.value)),
    ),
  );
  assert.doesNotMatch(nextFoxAsk(clipperPriced).text, /San Francisco, CA 94123\. Use this|Government ID|Bank statement/i);
  const clipperSplit = nextFoxAsk(clipperPriced);
  assert.match(clipperSplit.text, /Purchase is \$850,000/);
  assert.match(clipperSplit.text, /Close October 15, 2026/);
  assert.match(clipperSplit.text, /Seller credit \$5,000/);
  assert.match(clipperSplit.text, /The loan is still \$400,000 from the old \$500,000 sketch/);
  assert.match(clipperSplit.text, /Keep the \$400,000 loan\? Down becomes \$450,000/);
  assert.match(clipperSplit.text, /Or type a new down or loan/);
  assert.doesNotMatch(clipperSplit.text, /On the file|Use this split/);
  assert.equal(canLooksRight(clipperPriced), false);
  assert.equal(workspacePrompt(clipperPriced), "confirm-proposal");
  assert.deepEqual(
    (clipperSplit.actions ?? []).map((item) => item.label),
    ["Keep $400,000 loan", "Change down or loan"],
  );
  assert.equal(parseFundsAmount("20", 850_000)?.dollars, 170_000);
  assert.equal(parseFundsAmount("20", 850_000)?.asPercent, true);
  const typed20 = workspaceReply("20", clipperPriced);
  assert.match(typed20.text, /\$170,000 down/);
  assert.match(typed20.text, /\$680,000 loan/);
  assert.equal(typed20.capture?.field, "propose-funds");
  assert.equal(typed20.capture?.value, "170000:680000");
  assert.equal(clipperPriced.downPaymentAmount, 100_000);
  assert.equal(clipperPriced.loanAmountValue, 400_000);
  assert.equal(rateflowBlockedReason(clipperPriced), "purchase-split");
  assert.equal(clipperPriced.downPaymentAmount, 100_000);
  assert.equal(clipperPriced.loanAmountValue, 400_000);
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
  assert.equal(clipperUsed.downPaymentAmount, 450_000);
  assert.equal(clipperUsed.loanAmountValue, 400_000);
  assert.ok(purchaseFileAddsUp(clipperUsed));
  assert.ok(canLooksRight(clipperUsed));
  assert.equal(workspacePrompt(clipperUsed), "review");
  assert.equal(nextFoxAsk(clipperUsed).text, "The file looks like this. Looks right, or change a line.");
  assert.doesNotMatch(nextFoxAsk(clipperUsed).text, /94123|On the file|file can move|I can send this to review/);
  assert.deepEqual(
    (nextFoxAsk(clipperUsed).actions ?? []).map((item) => item.label),
    ["Looks right", "Needs a correction"],
  );
  assert.equal(rateflowBlockedReason(clipperUsed), null);
  assert.equal(rateflowClientBodyFromDraft(clipperUsed)?.loan_amount, 400_000);

  const clipperQuoted = {
    ...clipperUsed,
    liveQuote: { key: "old-clipper", rate: 6.5, asOf: "2026-01-01" },
    liveQuoteKey: "old-clipper",
    liveQuoteStatus: "ready" as const,
  };
  const priceEdit = beginFileEdit(clipperQuoted, "value", "price");
  assert.equal(priceEdit.correcting, "value");
  assert.equal(priceEdit.correctingLine, "price");
  assert.equal(priceEdit.propertyValueAmount, 850_000);
  assert.equal(priceEdit.downPaymentAmount, undefined);
  assert.equal(priceEdit.loanAmountValue, undefined);
  assert.equal(priceEdit.creditBand, "760+");
  assert.equal(priceEdit.creditAsked, true);
  assert.equal(priceEdit.occupancyChoice.value, "primary");
  assert.equal(priceEdit.occupancyAsked, true);
  assert.equal(priceEdit.incomeType.value, "w2");
  assert.equal(priceEdit.incomeAsked, true);
  assert.equal(priceEdit.citizenshipAsked, true);
  assert.equal(priceEdit.propertyType, "sfr");
  assert.equal(priceEdit.propertyZip, clipperQuoted.propertyZip);
  assert.match(priceEdit.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.equal(priceEdit.facts?.seller_credit?.value, "5000");
  assert.match(priceEdit.facts?.close_date?.value ?? "", /10\/15\/2026|2026-10-15/);
  assert.equal(priceEdit.facts?.employer_name?.value, clipperQuoted.facts?.employer_name?.value);
  assert.equal(priceEdit.documents.length, clipperQuoted.documents.length);
  assert.equal(priceEdit.liveQuote, undefined);
  assert.equal(workspacePrompt(priceEdit), "value");
  assert.notEqual(workspacePrompt(priceEdit), "credit");
  assert.notEqual(workspacePrompt(priceEdit), "occupancy");
  assert.notEqual(workspacePrompt(priceEdit), "income");
  assert.notEqual(workspacePrompt(priceEdit), "citizenship");
  assert.equal(amountAskText(priceEdit), "What’s the purchase price?");
  assert.doesNotMatch(nextFoxAsk(priceEdit).text, /estimated FICO|How is income|citizenship|Primary residence/i);

  const afterPrice = writePurchasePrice(priceEdit, 900_000);
  assert.equal(afterPrice.propertyValueAmount, 900_000);
  assert.equal(afterPrice.downPaymentAmount, undefined);
  assert.equal(afterPrice.loanAmountValue, undefined);
  assert.equal(afterPrice.creditBand, "760+");
  assert.equal(afterPrice.occupancyChoice.value, "primary");
  assert.equal(afterPrice.incomeType.value, "w2");
  assert.equal(afterPrice.citizenshipAsked, true);
  assert.equal(afterPrice.propertyType, "sfr");
  assert.match(afterPrice.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.equal(afterPrice.facts?.seller_credit?.value, "5000");
  assert.match(afterPrice.facts?.close_date?.value ?? "", /10\/15\/2026|2026-10-15/);
  assert.equal(afterPrice.facts?.purchase_price?.value, "900000");
  assert.equal(afterPrice.documents.length, clipperQuoted.documents.length);
  assert.equal(afterPrice.liveQuote, undefined);
  assert.equal(workspacePrompt(afterPrice), "amount");
  assert.notEqual(workspacePrompt(afterPrice), "credit");
  assert.notEqual(workspacePrompt(afterPrice), "occupancy");
  assert.notEqual(workspacePrompt(afterPrice), "income");
  assert.notEqual(workspacePrompt(afterPrice), "citizenship");
  assert.equal(amountAskText(afterPrice), "What’s the down payment or loan amount?");
  assert.doesNotMatch(
    nextFoxAsk(afterPrice).text,
    /estimated FICO|How is income|citizenship|Primary residence/i,
  );
  const priceTyped20 = workspaceReply("20", afterPrice);
  assert.equal(priceTyped20?.capture?.field, "propose-funds");
  assert.equal(priceTyped20?.capture && "value" in priceTyped20.capture ? priceTyped20.capture.value : "", "180000:720000");
  assert.doesNotMatch(priceTyped20?.text ?? "", /estimated FICO|How is income|citizenship/i);

  loadIntakeDraft(clipperQuoted);
  applyCapture({ field: "correct", value: "amount", line: "down" });
  applyCapture({ field: "downPayment", value: "200000" });
  const afterDown = getFoxDraft();
  assert.equal(afterDown.propertyValueAmount, 850_000);
  assert.equal(afterDown.downPaymentAmount, 200_000);
  assert.equal(afterDown.loanAmountValue, 650_000);
  assert.ok(purchaseFileAddsUp(afterDown));
  assert.equal(afterDown.creditBand, "760+");
  assert.equal(afterDown.occupancyChoice.value, "primary");
  assert.equal(afterDown.incomeType.value, "w2");
  assert.match(afterDown.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.equal(afterDown.facts?.seller_credit?.value, "5000");
  assert.equal(afterDown.liveQuote, undefined);
  assert.equal(rateflowClientBodyFromDraft(afterDown)?.loan_amount, 650_000);

  loadIntakeDraft(clipperQuoted);
  applyCapture({ field: "correct", value: "amount", line: "loan" });
  applyCapture({ field: "loanAmount", value: "500000" });
  const afterLoan = getFoxDraft();
  assert.equal(afterLoan.propertyValueAmount, 850_000);
  assert.equal(afterLoan.loanAmountValue, 500_000);
  assert.equal(afterLoan.downPaymentAmount, 350_000);
  assert.ok(purchaseFileAddsUp(afterLoan));
  assert.equal(afterLoan.liveQuote, undefined);
  assert.equal(rateflowClientBodyFromDraft(afterLoan)?.loan_amount, 500_000);
  assert.match(afterLoan.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);

  loadIntakeDraft(clipperQuoted);
  applyCapture({ field: "correct", value: "credit" });
  applyCapture({ field: "creditRange", value: "720-759" });
  const afterCredit = getFoxDraft();
  assert.equal(afterCredit.creditBand, "720-759");
  assert.equal(afterCredit.propertyValueAmount, 850_000);
  assert.equal(afterCredit.downPaymentAmount, 450_000);
  assert.equal(afterCredit.loanAmountValue, 400_000);
  assert.ok(purchaseFileAddsUp(afterCredit));
  assert.equal(afterCredit.occupancyChoice.value, "primary");
  assert.equal(afterCredit.incomeType.value, "w2");
  assert.equal(afterCredit.citizenshipAsked, true);
  assert.match(afterCredit.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.equal(afterCredit.facts?.seller_credit?.value, "5000");
  assert.equal(afterCredit.documents.length, clipperQuoted.documents.length);
  assert.equal(afterCredit.liveQuote, undefined);
  assert.equal(rateflowClientBodyFromDraft(afterCredit)?.loan_amount, 400_000);
  assert.notEqual(rateflowClientBodyFromDraft(afterCredit)?.credit_score, rateflowClientBodyFromDraft(clipperQuoted)?.credit_score);

  const clipperLooks = applyLooksRightMotion(clipperUsed);
  const clipperLooksAsk = nextFoxAsk(clipperLooks);
  assert.match(clipperLooksAsk.text, /I can send this to review/);
  assert.doesNotMatch(clipperLooksAsk.text, /file can move|Looks right, or change a line/);
  assert.ok((clipperLooksAsk.actions ?? []).some((item) => item.label === "Proceed"));
  assert.ok((clipperLooksAsk.actions ?? []).some((item) => item.label === "Not yet"));
  assert.ok(!(clipperLooksAsk.actions ?? []).some((item) => item.label === "Looks right"));
  if (/Still useful:/.test(clipperLooksAsk.text)) {
    assert.match(clipperLooksAsk.text, /Skip is fine/);
    const named = clipperLooksAsk.text.match(/Still useful:\s*(.+?)\s*Skip is fine/)?.[1] ?? "";
    assert.ok(named.split(/,| and /).filter(Boolean).length <= 3, named);
  }
  const clipperProceed = applyProceedMotion({
    ...clipperLooks,
    emailSkipped: false,
    contact: {
      ...clipperLooks.contact,
      email: { field: "email", value: "", source: "client", confirmed: false },
    },
  });
  assert.equal(clipperProceed.motion, "in_queue");
  assert.equal(clipperProceed.nextActor, "ONYX");
  assert.equal(clipperProceed.pendingFinish, undefined);
  const clipperProceedAsk = nextFoxAsk(clipperProceed);
  assert.equal(clipperProceedAsk.text, "ONYX has this for review. I’m still here.");
  assert.equal(clipperProceedAsk.followUp, undefined);
  assert.doesNotMatch(clipperProceedAsk.text, /What’s a good email|Skip email|email|This is the wait|What happens next/i);
  assert.deepEqual(
    (clipperProceedAsk.actions ?? []).map((item) => item.label),
    ["Ask Fox", "Upload more", "Request human"],
  );
  const clipperHold = applyNotYetMotion({
    ...clipperLooks,
    emailSkipped: false,
    contact: {
      ...clipperLooks.contact,
      email: { field: "email", value: "", source: "client", confirmed: false },
    },
  });
  assert.equal(clipperHold.motion, "on_hold");
  assert.equal(clipperHold.pendingFinish, undefined);
  assert.doesNotMatch(nextFoxAsk(clipperHold).text, /What’s a good email|email/i);
  assert.ok(previewFacts(clipperLooks).some((fact) => /88 Clipper Street, San Francisco, CA 94114/i.test(fact.value)));
  assert.ok(
    previewFacts(clipperLooks).every(
      (fact) =>
        (fact.id !== "address" && fact.id !== "file-property" && fact.label !== "Property address") ||
        !/94123/.test(fact.value),
    ),
  );
  noFnma(nextFoxAsk(clipperUsed).text);
  assert.doesNotMatch(nextFoxAsk(clipperUsed).text, /Government ID|Bank statement|government ID/i);
  assert.ok(
    conventionalFileFacts(clipperUsed).some(
      (fact) =>
        fact.id === "file-property" &&
        /88 Clipper Street, San Francisco, CA 94114/i.test(fact.value) &&
        !/Primary · 94123 · House/i.test(fact.value),
    ),
    conventionalFileFacts(clipperUsed)
      .filter((fact) => fact.id === "file-property")
      .map((fact) => fact.value)
      .join(" · "),
  );

  const aliasExtract = applyExtractedFields(zipOnly, {
    extractClass: "purchase_contract",
    confidence: 0.94,
    fields: {
      subject_property: "88 Clipper Street, San Francisco, CA 94114",
      purchase_price: "850000",
      close_date: "October 15, 2026",
      seller_concession: "$5,000.00",
    },
  });
  assert.equal(aliasExtract.conflict?.field, "purchase_price");
  assert.match(aliasExtract.draft.pendingProposal?.value ?? "", /88 Clipper Street/i);
  assert.ok(
    (aliasExtract.draft.pendingProposal?.extras ?? []).some(
      (item) => item.field === "seller_credit" && /5000/.test(item.value),
    ),
  );
  const aliasPriced = resolveFactConflict(aliasExtract.draft, "document");
  assert.match(aliasPriced.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.equal(aliasPriced.facts?.seller_credit?.value, "5000");
  const aliasUsed = resolveProposal(aliasPriced, "accept");
  assert.match(aliasUsed.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.doesNotMatch(aliasUsed.subjectAddress ?? "", /94123|Filbert/i);
  assert.equal(aliasUsed.facts?.seller_credit?.value, "5000");
  assert.ok(previewFacts(aliasUsed).some((fact) => fact.label === "Seller credit" && /\$5,000/.test(fact.value)));
  assert.ok(
    previewFacts(aliasUsed).some((fact) => /88 Clipper Street, San Francisco, CA 94114/i.test(fact.value)),
  );

  const closeOnly = resolveProposal(
    {
      ...zipOnly,
      propertyValueAmount: 850_000,
      pendingAddress: undefined,
      pendingConflict: null,
      pendingProposal: {
        field: "close_date",
        value: "10/15/2026",
        label: "close date",
        kind: "computed",
        extras: [
          { field: "property_address", value: "88 Clipper Street, San Francisco, CA 94114", label: "property address" },
          { field: "seller_credit", value: "5000", label: "seller credit" },
        ],
      },
      facts: {
        ...zipOnly.facts,
        seller_credit: {
          field: "seller_credit",
          value: "5000",
          source: "extracted-unconfirmed",
          confirmed: false,
        },
      },
    },
    "accept",
  );
  assert.match(closeOnly.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.doesNotMatch(closeOnly.subjectAddress ?? "", /94123/);
  assert.match(closeOnly.facts?.close_date?.value ?? "", /10\/15\/2026|2026-10-15/);
  assert.equal(closeOnly.facts?.seller_credit?.value, "5000");
  assert.equal(closeOnly.facts?.seller_credit?.confirmed, true);
  const closeOnlyFacts = previewFacts(closeOnly);
  assert.ok(closeOnlyFacts.some((fact) => /88 Clipper Street, San Francisco, CA 94114/i.test(fact.value)));
  assert.ok(closeOnlyFacts.some((fact) => fact.label === "Close" && /October 15, 2026/.test(fact.value)));
  assert.ok(closeOnlyFacts.some((fact) => fact.label === "Seller credit" && /\$5,000/.test(fact.value)));
  assert.ok(
    closeOnlyFacts.every(
      (fact) =>
        (fact.id !== "address" && fact.id !== "file-property" && fact.label !== "Property address") ||
        !/94123/.test(fact.value),
    ),
  );

  const leftoverPlace = {
    ...zipOnly,
    propertyValueAmount: 850_000,
    lastPurchaseContractFields: {
      property_address: "88 Clipper Street, San Francisco, CA 94114",
      purchase_price: "850000",
      close_date: "10/15/2026",
      seller_credit: "5000",
    },
    pendingConflict: null,
    pendingAddress: {
      line: "San Francisco, CA 94123",
      street: "San Francisco, CA 94123",
      city: "San Francisco",
      state: "CA" as const,
      zip: "94123",
    },
    pendingProposal: {
      field: "property_address",
      value: "San Francisco, CA 94123",
      label: "Property",
      kind: "computed" as const,
      note: "Suggested · not underwritten",
      extras: [
        { field: "street", value: "San Francisco, CA 94123", label: "Street" },
        { field: "city", value: "San Francisco", label: "City" },
        { field: "zip", value: "94123", label: "ZIP" },
      ],
    },
  };
  const leftoverAsk = nextFoxAsk(leftoverPlace);
  assert.match(leftoverAsk.text, /88 Clipper Street/i);
  assert.match(leftoverAsk.text, /seller credit \$5,000/i);
  assert.doesNotMatch(leftoverAsk.text, /San Francisco, CA 94123\. Use this/i);
  const leftoverUsed = resolveProposal(leftoverPlace, "accept");
  assert.match(leftoverUsed.subjectAddress ?? "", /88 Clipper Street, San Francisco, CA 94114/i);
  assert.doesNotMatch(leftoverUsed.subjectAddress ?? "", /94123|Filbert/i);
  assert.equal(leftoverUsed.facts?.seller_credit?.value, "5000");
  assert.match(leftoverUsed.facts?.close_date?.value ?? "", /10\/15\/2026|2026-10-15/);
  const leftoverFacts = previewFacts(leftoverUsed);
  assert.ok(leftoverFacts.some((fact) => /88 Clipper Street, San Francisco, CA 94114/i.test(fact.value)));
  assert.ok(leftoverFacts.some((fact) => fact.label === "Seller credit" && /\$5,000/.test(fact.value)));
  assert.ok(leftoverFacts.some((fact) => fact.label === "Close" && /October 15, 2026/.test(fact.value)));
  assert.ok(
    leftoverFacts.every(
      (fact) =>
        fact.id !== "file-property" ||
        (/88 Clipper Street, San Francisco, CA 94114/i.test(fact.value) &&
          !/Primary · 94123 · House/i.test(fact.value)),
    ),
    leftoverFacts
      .filter((fact) => fact.id === "file-property" || fact.label === "Property address")
      .map((fact) => `${fact.label} ${fact.value}`)
      .join(" · "),
  );
  assert.match(nextFoxAsk(leftoverUsed).text, /Purchase is \$850,000/);
  assert.match(nextFoxAsk(leftoverUsed).text, /Keep the \$400,000 loan\? Down becomes \$450,000/);
  assert.match(nextFoxAsk(leftoverUsed).text, /Or type a new down or loan/);
  assert.doesNotMatch(nextFoxAsk(leftoverUsed).text, /On the file|Use this split|Government ID|Bank statement|government ID/i);
  assert.deepEqual(
    (nextFoxAsk(leftoverUsed).actions ?? []).map((item) => item.label),
    ["Keep $400,000 loan", "Change down or loan"],
  );
  assert.equal(canLooksRight(leftoverUsed), false);

  const emptyAssets = conventionalFileFacts({ ...emptyDraft(), productIntent: "buy", path: "acr" });
  assert.ok(emptyAssets.some((fact) => fact.id === "file-assets" && fact.value === ""));

  console.log("purchase-contract extract PASS", used.subjectAddress, used.facts?.seller_credit?.value);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
