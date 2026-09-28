/**
 * Purchase money: no Not sure chip. Typed I don’t know coaches, then the same ask.
 * $1,000,000 on a $500,000 price names the conflict. Down payment clears the
 * impossible loan. 20 → Use this writes $100,000 / $400,000 and does not re-fire.
 */
import assert from "node:assert/strict";
import {
  canLooksRight,
  loanExceedsPurchasePrice,
  proposeFundsPair,
  resolveProposal,
} from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import {
  beginFileEdit,
  clearImpossibleLoan,
  nextFoxAsk,
  workspacePrompt,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

function buySketch(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  };
}

function noNotSure(actions: { label: string }[] | undefined, label: string) {
  assert.ok(
    !(actions ?? []).some((item) => item.label === "Not sure" || item.label === "Skip for now"),
    `${label} painted a money skip chip`,
  );
}

const start = buySketch();
assert.equal(workspacePrompt(start), "value");
const priceAsk = nextFoxAsk(start);
assert.match(priceAsk.text, /purchase price/i);
noNotSure(priceAsk.actions, "price ask");

const idkPrice = workspaceReply("I don’t know", start);
assert.ok(idkPrice);
assert.notEqual(idkPrice?.capture?.field, "skip-value");
assert.match(idkPrice?.text ?? "", /purchase price/i);
assert.match(idkPrice?.text ?? "", /dollars/i);
assert.equal(workspacePrompt(start), "value");

const priced = writePurchasePrice(start, 500_000);
assert.equal(priced.propertyValueAmount, 500_000);
assert.equal(workspacePrompt(priced), "amount");
const fundsAsk = nextFoxAsk(priced);
assert.match(fundsAsk.text, /down payment or loan amount/i);
noNotSure(fundsAsk.actions, "funds ask");
assert.equal(canLooksRight(priced), false);

const idkFunds = workspaceReply("I don’t know", priced);
assert.ok(idkFunds);
assert.notEqual(idkFunds?.capture?.field, "skip-amount");
assert.match(idkFunds?.text ?? "", /down payment or loan amount/i);
assert.match(idkFunds?.text ?? "", /percent|dollars down|loan/i);

const over = workspaceReply("1000000", priced);
assert.equal(over?.capture?.field, "loanAmount");
assert.match(over?.text ?? "", /loan is larger than the purchase price/i);
assert.match(over?.text ?? "", /price|down payment|loan/i);
assert.deepEqual(
  (over?.actions ?? []).map((item) => item.label),
  ["Purchase price", "Down payment", "Loan amount", "That’s right"],
);
noNotSure(over?.actions, "over-price");

const afterLoan: FoxIntakeDraft = {
  ...priced,
  loanAmountValue: 1_000_000,
  amountAsked: true,
};
assert.equal(loanExceedsPurchasePrice(afterLoan), true);
assert.equal(workspacePrompt(afterLoan), "over-price");
assert.equal(canLooksRight(afterLoan), false);

const downEdit = beginFileEdit(afterLoan, "amount", "down");
assert.equal(downEdit.loanAmountValue, undefined);
assert.notEqual(downEdit.loanAmountValue, 1_000_000);
assert.equal(loanExceedsPurchasePrice(downEdit), false);
assert.equal(workspacePrompt(downEdit), "amount");
const downAsk = nextFoxAsk(downEdit);
assert.match(downAsk.text, /down payment/i);
noNotSure(downAsk.actions, "down after conflict");

const downReply = workspaceReply("Down payment", afterLoan);
assert.equal(downReply?.capture?.field, "correct");
assert.equal(downReply?.capture && "line" in downReply.capture ? downReply.capture.line : "", "down");
assert.match(downReply?.text ?? "", /down payment/i);
assert.doesNotMatch(downReply?.text ?? "", /loan is larger/);
noNotSure(downReply?.actions, "Down payment chip");

const cleared = clearImpossibleLoan(afterLoan);
assert.equal(cleared.loanAmountValue, undefined);

const twenty = workspaceReply("20", downEdit);
assert.equal(twenty?.capture?.field, "propose-funds");
assert.match(twenty?.text ?? "", /\$100,000 down · \$400,000 loan/i);
assert.match(twenty?.text ?? "", /Use this/);
assert.ok((twenty?.actions ?? []).some((item) => item.label === "Use this"));

const proposed = proposeFundsPair(
  { ...downEdit, correcting: null, correctingLine: null },
  100_000,
  400_000,
);
assert.notEqual(proposed.loanAmountValue, 1_000_000);
assert.equal(loanExceedsPurchasePrice(proposed), false);

const used = resolveProposal(proposed, "accept");
assert.equal(used.downPaymentAmount, 100_000);
assert.equal(used.loanAmountValue, 400_000);
assert.equal(used.propertyValueAmount, 500_000);
assert.equal(loanExceedsPurchasePrice(used), false);
assert.notEqual(workspacePrompt(used), "over-price");
assert.doesNotMatch(nextFoxAsk(used).text, /loan is larger than the purchase price/i);

const useThis = workspaceReply("Use this", proposed);
assert.equal(useThis?.capture?.field, "accept-proposal");
assert.doesNotMatch(useThis?.text ?? "", /loan is larger than the purchase price/i);
assert.notEqual(useThis?.capture?.field, "over-price-confirm");

console.log("money-structure PASS");
