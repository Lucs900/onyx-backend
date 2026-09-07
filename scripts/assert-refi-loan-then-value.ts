/**
 * Refinance: type 500000 loan, then 800000 value.
 * Loan amount writes $500,000. Do not re-ask loan.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { hasLoanAmount } from "../components/fox/completeness";
import {
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

function afterPrimary(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "refinance",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  };
}

function loanLine(draft: FoxIntakeDraft) {
  return previewFacts(draft).find((fact) => fact.id === "loan" || fact.label === "Loan amount");
}

function main() {
  const start = afterPrimary();
  assert.equal(workspacePrompt(start), "amount");
  assert.match(nextFoxAsk(start).text, /loan or payoff amount|loan amount/i);

  const afterLoan = workspaceReply("500000", start);
  assert.equal(afterLoan?.capture?.field, "loanAmount");
  const withLoan = {
    ...start,
    loanAmountValue: 500_000,
    amountAsked: true,
  };
  assert.equal(withLoan.loanAmountValue, 500_000);
  assert.equal(workspacePrompt(withLoan), "value");
  assert.match(nextFoxAsk(withLoan).text, /property value/i);
  assert.doesNotMatch(nextFoxAsk(withLoan).text, /loan or payoff amount/i);

  const typedValue = workspaceReply("800000", withLoan);
  assert.equal(typedValue?.capture?.field, "propertyValue");
  const written = writePurchasePrice(withLoan, 800_000);
  assert.equal(written.propertyValueAmount, 800_000);
  assert.equal(written.loanAmountValue, 500_000, "value write must keep the $500,000 loan");
  assert.equal(hasLoanAmount(written), true);
  assert.notEqual(workspacePrompt(written), "amount");
  assert.doesNotMatch(nextFoxAsk(written).text, /loan or payoff amount|What’s the loan amount/i);
  const loan = loanLine(written);
  assert.ok(loan, "Loan amount missing from File");
  assert.match(loan?.value ?? "", /\$500,000/);

  console.log("assert-refi-loan-then-value: $500,000 loan stays after $800,000 value");
}

main();
