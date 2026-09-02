/**
 * Composer-door 03-w2 then 07-paystub Use this.
 * Structure/Employment is one Harbor Pacific row: Box 5 $118,400 + stub $9,999.99 monthly.
 * Not a second job. Not Income: W-2 with no dollars.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { stillUsefulSection } from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal } from "../components/fox/completeness";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { emptyDraft } from "../components/fox/store";
import { previewFacts, workspacePrompt, workspacePromptCopy } from "../components/fox/workspace";
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

function wageBase(): FoxIntakeDraft {
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
    otherReoAsked: true,
    statedOtherReo: "none",
    subjectAddress: "500 Market St, San Francisco, CA 94105",
    subjectAddressAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
    propertyZip: "94105",
    propertyZipAsked: true,
    citizenshipAsked: true,
    looksRightHold: false,
    emailSkipped: true,
    skippedClasses: ["government_id", "bank_statement"],
  };
}

function employmentRows(draft: FoxIntakeDraft) {
  return previewFacts(draft).filter(
    (fact) => fact.id === "employer" || fact.label === "Employment" || fact.id.startsWith("history-employment"),
  );
}

function incomeRows(draft: FoxIntakeDraft) {
  return previewFacts(draft).filter((fact) => fact.id === "income" || fact.label === "Income");
}

async function main() {
  const w2Bytes = readFileSync(W2);
  const stubBytes = readFileSync(STUB);
  const w2Ex = await classifyAndExtract(
    w2Bytes,
    "application/pdf",
    deadVision,
    null,
    "03-w2-2025-jordan-hale.pdf",
  );
  const stubEx = await classifyAndExtract(
    stubBytes,
    "application/pdf",
    deadVision,
    null,
    "07-paystub-biweekly-loud.pdf",
  );
  assert.notEqual(w2Ex.failed, true, "03-w2 text layer is confirm");
  assert.equal(w2Ex.extractClass, "w2");
  assert.equal(w2Ex.fields.medicare_wages ?? w2Ex.fields.box5, "118400");
  assert.equal(w2Ex.fields.employer_name, "Harbor Pacific Design Inc");
  assert.notEqual(stubEx.failed, true, "07-paystub text layer is confirm");
  assert.equal(stubEx.extractClass, "paystub");
  assert.equal(stubEx.fields.gross_period, "4615.38");
  assert.equal(stubEx.fields.pay_frequency, "biweekly");
  assert.equal(stubEx.fields.employer_name, "Harbor Pacific Design Inc");

  const afterW2 = applyExtractedFields(wageBase(), {
    extractClass: w2Ex.extractClass,
    confidence: w2Ex.confidence ?? 0.94,
    fields: w2Ex.fields ?? {},
  });
  assert.equal(afterW2.draft.pendingProposal?.field, "wage_extract");
  const usedW2 = resolveProposal(afterW2.draft, "accept");
  assert.match(wageEmploymentFileLine(usedW2), /Harbor Pacific Design Inc/);
  assert.match(wageEmploymentFileLine(usedW2), /Box 5 \$118,400/);

  const afterStub = applyExtractedFields(
    {
      ...usedW2,
      documents: [
        {
          slot: "w2",
          name: "03-w2-2025-jordan-hale.pdf",
          type: "application/pdf",
          size: w2Bytes.length,
          receivedAt: "2026-09-02T00:00:00.000Z",
          status: "extracted",
          extractClass: "w2",
        },
        {
          slot: "paystubs",
          name: "07-paystub-biweekly-loud.pdf",
          type: "application/pdf",
          size: stubBytes.length,
          receivedAt: "2026-09-02T00:01:00.000Z",
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
  assert.equal(afterStub.draft.pendingProposal?.field, "stub_extract");
  const used = resolveProposal(afterStub.draft, "accept");

  assert.equal(used.stubExtractAccepted, true);
  assert.equal(used.facts?.w2_box5?.value, "118400");
  assert.equal(used.facts?.paystub_monthly?.value, "9999.99");
  assert.equal(used.facts?.employer_name?.value, "Harbor Pacific Design Inc");
  assert.equal((used.employmentHistory ?? []).length, 1);
  assert.equal(
    wageEmploymentFileLine(used),
    "Harbor Pacific Design Inc, Box 5 $118,400, biweekly, $4,615.38, $9,999.99 a month",
  );

  const jobs = employmentRows(used);
  assert.equal(jobs.length, 1, jobs.map((row) => `${row.label}: ${row.value}`).join(" | "));
  assert.match(jobs[0]?.value ?? "", /Harbor Pacific Design Inc/);
  assert.match(jobs[0]?.value ?? "", /Box 5 \$118,400/);
  assert.match(jobs[0]?.value ?? "", /\$9,999\.99 a month/);
  assert.equal(jobs[0]?.label, "Employment");

  const income = incomeRows(used);
  assert.equal(income.length, 0, "Income: W-2 with no dollars must not remain");
  assert.ok(
    previewFacts(used).every((fact) => fact.label !== "Income" || /\$/.test(fact.value)),
    "no Income: W-2 without dollars",
  );

  assert.ok(canLooksRight(used));
  assert.ok((workspacePromptCopy("review", used).actions ?? []).some((item) => item.label === "Looks right"));
  const looks = applyLooksRightMotion(used);
  assert.equal(looks.sampleAccepted, true);
  const afterLooksJobs = employmentRows(looks);
  assert.equal(afterLooksJobs.length, 1);
  assert.match(afterLooksJobs[0]?.value ?? "", /Harbor Pacific Design Inc/);
  assert.match(afterLooksJobs[0]?.value ?? "", /Box 5 \$118,400/);
  assert.match(afterLooksJobs[0]?.value ?? "", /\$9,999\.99 a month/);
  assert.ok((workspacePromptCopy(workspacePrompt(looks), looks).actions ?? []).some((item) => item.label === "Proceed"));

  const proceeded = applyProceedMotion(looks);
  assert.equal(proceeded.motion, "in_queue");
  const still = stillUsefulSection(proceeded);
  if (still && !still.empty) {
    assert.ok(still.items.length >= 1 && still.items.length <= 3, "Still useful shows next 1–3 only");
    assert.ok(still.items.every((item) => !/tax return|latest return|prior-year return/i.test(item.label)));
  }
  assert.ok(
    previewFacts(proceeded).every(
      (fact) => !/sketch · \d+ of \d+|documented · \d+ of \d+| of 32/.test(`${fact.value} ${fact.note ?? ""}`),
    ),
  );

  console.log("w2-stub employment merge PASS", jobs[0]?.value);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
