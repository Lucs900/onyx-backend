/**
 * Income Skip / empty how-earned: Still useful is Government ID + how income is earned.
 * Do not invent a W-2 or SE tax-return list until that line is answered.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { applyLooksRightMotion } from "../components/fox/motion";
import { skipIncomeAsk, workspacePrompt } from "../components/fox/workspace";
import { canLooksRight } from "../components/fox/completeness";
import { nextDocInvite, stillUsefulSection } from "../components/fox/fileWrite";
import type { FoxIntakeDraft } from "../components/fox/types";

function sketch(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
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

function assertNoInventedIncomeDocs(draft: FoxIntakeDraft, label: string) {
  const items = stillUsefulSection(draft)?.items ?? [];
  const blob = items.map((item) => item.label).join(" · ");
  assert.ok(
    !items.some((item) => /paystub|W-2|tax return|latest return|prior-year return/i.test(item.label)),
    `${label} invented income docs — ${blob || "(empty)"}`,
  );
}

function main() {
  const skipped = skipIncomeAsk(sketch());
  assert.equal(skipped.incomeAsked, true);
  assert.ok(!skipped.incomeType.value);
  assert.equal(nextDocInvite(skipped), null);
  assert.ok(canLooksRight(skipped), "Income Skip must keep Looks right");
  assert.equal(workspacePrompt(skipped), "review");
  const looks = applyLooksRightMotion(skipped);
  assert.equal(looks.sampleAccepted, true);
  assert.equal(nextDocInvite(looks), "government_id");
  const items = stillUsefulSection(looks)?.items ?? [];
  const labels = items.map((item) => item.label);
  assert.ok(labels.some((item) => item === "Government ID"), `missing Government ID — ${labels.join(" · ")}`);
  assert.ok(
    labels.some((item) => item === "How income is earned"),
    `missing how-earned — ${labels.join(" · ")}`,
  );
  assertNoInventedIncomeDocs(looks, "Income Skip after Looks right");

  const w2 = {
    ...sketch(),
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" as const },
    sampleAccepted: true,
  };
  const w2Labels = (stillUsefulSection(w2)?.items ?? []).map((item) => item.label);
  assert.ok(
    w2Labels.some((item) => /paystub|W-2/i.test(item)),
    `answered W-2 lost income docs — ${w2Labels.join(" · ")}`,
  );
  assert.ok(!w2Labels.some((item) => item === "How income is earned"));

  console.log("assert-income-skip-still-useful: ID + how-earned only until how-earned is answered");
}

main();
