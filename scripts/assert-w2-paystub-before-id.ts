/**
 * After 03 W-2 Use this: next live ask is latest paystub for that employer
 * (Upload this · Skip). ID only after stub Use this or Skip, with those chips.
 * 07 upgrades the same Harbor Pacific row. No second job.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import {
  applyExtractedFields,
  DOC_INVITE_COPY,
  docInviteAskCopy,
  nextDocInvite,
  skipCurrentInvite,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import { applyLooksRightMotion } from "../components/fox/motion";
import { resolveProposal } from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import { skipIncomeAsk, previewFacts, workspacePrompt, workspacePromptCopy } from "../components/fox/workspace";
import { wageEmploymentFileLine } from "../components/fox/qualifyingIncome";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W2 = join(root, "sample-docs/03-w2-2025-jordan-hale.pdf");
const STUB = join(root, "sample-docs/07-paystub-biweekly-loud.pdf");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on 03/07 text");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on 03/07 text");
  },
};

function wageSketch(): FoxIntakeDraft {
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
    propertyValueAmount: 1_000_000,
    downPaymentAmount: 200_000,
    loanAmountValue: 800_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "house",
    propertyTypeAsked: true,
    subjectAddress: "14 Oak Street, San Francisco, CA 94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
  };
}

function jobs(draft: FoxIntakeDraft) {
  return previewFacts(draft).filter(
    (fact) => fact.id === "employer" || fact.label === "Employment" || fact.id.startsWith("history-employment"),
  );
}

function inviteChips(draft: FoxIntakeDraft) {
  return (workspacePromptCopy(workspacePrompt(draft), draft).actions ?? []).map((item) => item.label);
}

async function main() {
  const w2Bytes = readFileSync(W2);
  const stubBytes = readFileSync(STUB);
  const w2Ex = await classifyAndExtract(w2Bytes, "application/pdf", deadVision, null, "03-w2-2025-jordan-hale.pdf");
  const stubEx = await classifyAndExtract(stubBytes, "application/pdf", deadVision, null, "07-paystub-biweekly-loud.pdf");
  assert.equal(w2Ex.extractClass, "w2");
  assert.equal(stubEx.extractClass, "paystub");

  const proposed = applyExtractedFields(wageSketch(), {
    extractClass: w2Ex.extractClass,
    confidence: w2Ex.confidence ?? 0.94,
    fields: w2Ex.fields ?? {},
  });
  const usedW2 = resolveProposal(
    {
      ...proposed.draft,
      documents: [
        {
          slot: "w2",
          name: "03-w2-2025-jordan-hale.pdf",
          type: "application/pdf",
          size: w2Bytes.length,
          receivedAt: "2026-09-07T00:00:00.000Z",
          status: "extracted",
          extractClass: "w2",
        },
      ],
    },
    "accept",
  );
  assert.match(wageEmploymentFileLine(usedW2), /Harbor Pacific Design Inc/);
  assert.match(wageEmploymentFileLine(usedW2), /Box 5 \$118,400/);
  assert.equal(jobs(usedW2).length, 1);
  assert.equal(nextDocInvite(usedW2), "paystub");
  assert.equal(workspacePrompt(usedW2), "documents");
  const stubAsk = workspacePromptCopy("documents", usedW2);
  assert.match(stubAsk.text, /latest paystub for Harbor Pacific Design Inc/i);
  assert.match(stubAsk.text, /current income on paper/i);
  assert.doesNotMatch(stubAsk.text, /government ID/i);
  assert.deepEqual(
    (stubAsk.actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );
  assert.equal(docInviteAskCopy(usedW2, "paystub"), stubAsk.text);

  const skippedStub = skipCurrentInvite(usedW2);
  assert.notEqual(nextDocInvite(skippedStub), "government_id");
  assert.equal(workspacePrompt(skippedStub), "review");
  const looksAfterSkip = applyLooksRightMotion(skippedStub);
  assert.equal(nextDocInvite(looksAfterSkip), "government_id");
  const idAfterSkip = workspacePromptCopy(workspacePrompt(looksAfterSkip), looksAfterSkip);
  assert.equal(idAfterSkip.text, DOC_INVITE_COPY.government_id);
  assert.deepEqual(
    (idAfterSkip.actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );

  const afterStub = applyExtractedFields(
    {
      ...usedW2,
      documents: [
        ...(usedW2.documents ?? []),
        {
          slot: "paystubs",
          name: "07-paystub-biweekly-loud.pdf",
          type: "application/pdf",
          size: stubBytes.length,
          receivedAt: "2026-09-07T00:01:00.000Z",
          status: "extracted",
          extractClass: "paystub",
        },
      ],
    },
    {
      extractClass: stubEx.extractClass,
      confidence: stubEx.confidence ?? 0.94,
      fields: stubEx.fields ?? {},
    },
  );
  const usedStub = resolveProposal(afterStub.draft, "accept");
  assert.equal((usedStub.employmentHistory ?? []).length, 1);
  assert.equal(
    wageEmploymentFileLine(usedStub),
    "Harbor Pacific Design Inc, Box 5 $118,400, biweekly, $4,615.38, $9,999.99 a month",
  );
  assert.equal(jobs(usedStub).length, 1, jobs(usedStub).map((row) => row.value).join(" · "));
  assert.notEqual(nextDocInvite(usedStub), "government_id");
  assert.equal(workspacePrompt(usedStub), "review");
  const looksAfterStub = applyLooksRightMotion(usedStub);
  assert.equal(nextDocInvite(looksAfterStub), "government_id");
  const idAfterStub = workspacePromptCopy(workspacePrompt(looksAfterStub), looksAfterStub);
  assert.equal(idAfterStub.text, DOC_INVITE_COPY.government_id);
  assert.deepEqual(
    (idAfterStub.actions ?? []).map((item) => item.label),
    ["Upload this", "Skip"],
  );

  const skippedIncome = skipIncomeAsk({
    ...wageSketch(),
    incomeAsked: false,
    incomeType: { ...emptyDraft().incomeType },
  });
  const looks = applyLooksRightMotion(skippedIncome);
  const useful = (stillUsefulSection(looks)?.items ?? []).map((item) => item.label);
  assert.ok(useful.includes("Government ID"));
  assert.ok(useful.includes("How income is earned"));
  assert.ok(!useful.some((item) => /paystub|W-2|tax return|latest return/i.test(item)));
  assert.ok(inviteChips(usedW2).includes("Upload this"));

  console.log("assert-w2-paystub-before-id: stub after 03 Use this; ID after Looks right; one Harbor row");
}

main();
