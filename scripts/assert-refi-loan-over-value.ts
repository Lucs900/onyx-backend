/**
 * Refinance loan $500,000 then value $400,000.
 * Say the house conflict once. Chips: Change loan · Change value · Skip.
 * No This one / Lower payment until value ≥ loan (or loan comes down).
 * Skip keeps both numbers and continues to income. LTV 125% stays estimated.
 * Change loan writes the new refinance loan. Next is House — never purchase
 * down-payment copy. Empty Rateflow no-price uses the same strip, not Try again.
 * Do not invent cash-out, Non-QM, or a 125% product.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ESTIMATED_NOT_FINAL } from "../lib/calculators/conventional";
import {
  conventionalReadyHoldsReadyLine,
  rateflowBlockedReason,
  rateflowClientBodyFromDraft,
  searchedKeyFor,
} from "../lib/rateflow/fromDraft";
import { applyCapture, emptyDraft, getFoxDraft, loadIntakeDraft } from "../components/fox/store";
import {
  loanExceedsPropertyValue,
  loanExceedsPurchasePrice,
} from "../components/fox/completeness";
import {
  liveCouponActions,
  liveQuoteReady,
  shouldDeferNextAskForLiveCoupon,
} from "../components/fox/liveCoupon";
import {
  LOAN_OVER_VALUE_LINE,
  NO_CONVENTIONAL_PRICE_LINE,
  PURCHASE_PRICE_ON_FILE_LINE,
  deskStripActions,
  nextFoxAsk,
  previewFacts,
  previewRateFact,
  purchasePriceRepeatReply,
  shouldHoldAskForLiveLine,
  workspacePrompt,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

function withLoan(): FoxIntakeDraft {
  return {
    ...afterPrimary(),
    loanAmountValue: 500_000,
    amountAsked: true,
  };
}

function conflictFile(): FoxIntakeDraft {
  return writePurchasePrice(withLoan(), 400_000);
}

function skippedFile(): FoxIntakeDraft {
  return { ...conflictFile(), overValueSkipped: true };
}

function pricedReady(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectAddress: "2101 California Street, San Francisco, CA 94123",
    subjectCity: "San Francisco",
    subjectState: "CA",
  };
}

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function ltvLine(draft: FoxIntakeDraft) {
  return previewFacts(draft).find((fact) => fact.id === "ltv" || fact.label === "LTV");
}

function main() {
  assert.equal(LOAN_OVER_VALUE_LINE, "The loan is larger than the house.");
  assert.equal(workspacePrompt(withLoan()), "value");

  const typed = workspaceReply("400000", withLoan());
  assert.equal(typed?.capture?.field, "propertyValue");
  assert.match(typed?.text ?? "", /loan is larger than the house/i);
  assert.doesNotMatch(typed?.text ?? "", /cash-?out|non-?qm|125\s*% product/i);
  assert.deepEqual(labels(typed?.actions), ["Change loan", "Change value", "Skip"]);
  assert.ok(!labels(typed?.actions).includes("This one"));
  assert.ok(!labels(typed?.actions).includes("Lower payment"));

  const written = conflictFile();
  assert.equal(written.loanAmountValue, 500_000);
  assert.equal(written.propertyValueAmount, 400_000);
  assert.equal(loanExceedsPropertyValue(written), true);
  assert.equal(loanExceedsPurchasePrice(written), false);
  assert.equal(workspacePrompt(written), "over-value");
  const conflictAsk = nextFoxAsk(written);
  assert.equal(conflictAsk.text, LOAN_OVER_VALUE_LINE);
  assert.deepEqual(labels(conflictAsk.actions), ["Change loan", "Change value", "Skip"]);
  assert.deepEqual(
    labels(deskStripActions([{ id: "over-value", role: "fox", text: LOAN_OVER_VALUE_LINE }], written)),
    ["Change loan", "Change value", "Skip"],
  );
  assert.ok(!labels(deskStripActions([{ id: "over-value", role: "fox", text: LOAN_OVER_VALUE_LINE }], written)).includes("Try again"));

  const ltv = ltvLine(written);
  assert.ok(ltv, "LTV missing from File");
  assert.match(ltv?.value ?? "", /125(\.0)?%/);
  assert.equal(ltv?.note, ESTIMATED_NOT_FINAL);

  const changeLoan = workspaceReply("Change loan", written);
  assert.equal(changeLoan?.capture?.field, "correct");
  assert.equal(changeLoan?.capture && "line" in changeLoan.capture ? changeLoan.capture.line : "", "loan");
  assert.match(changeLoan?.text ?? "", /loan or payoff amount|loan amount/i);
  assert.doesNotMatch(changeLoan?.text ?? "", /purchase price|down payment/i);
  assert.doesNotMatch(changeLoan?.text ?? "", /loan is larger than the house/i);
  assert.ok(!labels(changeLoan?.actions).includes("This one"));

  loadIntakeDraft(written);
  applyCapture({ field: "correct", value: "amount", line: "loan" });
  const editingLoan = getFoxDraft();
  assert.equal(editingLoan.productIntent, "refinance");
  assert.equal(workspacePrompt(editingLoan), "amount");
  assert.equal(purchasePriceRepeatReply(editingLoan, "400000"), null);
  const lowered = workspaceReply("400000", editingLoan);
  assert.equal(lowered?.capture?.field, "loanAmount");
  assert.doesNotMatch(lowered?.text ?? "", /purchase price|down payment/i);
  assert.notEqual(lowered?.text, PURCHASE_PRICE_ON_FILE_LINE);
  assert.match(lowered?.text ?? "", /kind of home|House, condo/i);
  assert.ok(lowered?.capture);
  applyCapture(lowered!.capture);
  const afterLower = getFoxDraft();
  assert.equal(afterLower.productIntent, "refinance");
  assert.equal(afterLower.loanAmountValue, 400_000);
  assert.equal(afterLower.propertyValueAmount, 400_000);
  const afterLowerLoan = previewFacts(afterLower).find(
    (fact) => fact.id === "loan" || fact.label === "Loan amount",
  );
  assert.match(afterLowerLoan?.value ?? "", /\$400,000/);
  assert.equal(loanExceedsPropertyValue(afterLower), false);
  assert.notEqual(workspacePrompt(afterLower), "over-value");
  assert.doesNotMatch(nextFoxAsk(afterLower).text, /loan is larger than the house/i);
  assert.doesNotMatch(nextFoxAsk(afterLower).text, /purchase price|down payment/i);
  assert.match(nextFoxAsk(afterLower).text, /kind of home|House, condo/i);
  assert.ok(!labels(nextFoxAsk(afterLower).actions).includes("This one"));
  assert.ok(!labels(nextFoxAsk(afterLower).actions).includes("Lower payment"));

  const alwaysOn = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
  assert.ok(alwaysOn.includes("purchasePriceRepeatReply"));
  assert.doesNotMatch(alwaysOn, /Purchase price is in the file/);

  const changeValue = workspaceReply("Change value", written);
  assert.equal(changeValue?.capture?.field, "correct");
  assert.equal(changeValue?.capture && "line" in changeValue.capture ? changeValue.capture.line : "", "home");
  assert.match(changeValue?.text ?? "", /property value/i);
  assert.doesNotMatch(changeValue?.text ?? "", /purchase price/i);
  assert.doesNotMatch(changeValue?.text ?? "", /loan is larger than the house/i);

  const raised = workspaceReply("500000", {
    ...written,
    correcting: "value",
    correctingLine: "home",
  });
  assert.equal(raised?.capture?.field, "propertyValue");
  const afterRaise = writePurchasePrice(written, 500_000);
  assert.equal(afterRaise.loanAmountValue, 500_000);
  assert.equal(afterRaise.propertyValueAmount, 500_000);
  assert.equal(loanExceedsPropertyValue(afterRaise), false);
  assert.notEqual(workspacePrompt(afterRaise), "over-value");

  const skip = workspaceReply("Skip", written);
  assert.equal(skip?.capture?.field, "skip-over-value");
  assert.doesNotMatch(skip?.text ?? "", /loan is larger than the house/i);
  assert.ok(!labels(skip?.actions).includes("This one"));
  assert.ok(!labels(skip?.actions).includes("Lower payment"));
  const afterSkip = skippedFile();
  assert.equal(afterSkip.loanAmountValue, 500_000);
  assert.equal(afterSkip.propertyValueAmount, 400_000);
  assert.equal(afterSkip.overValueSkipped, true);
  assert.equal(afterSkip.cashOut, undefined);
  assert.notEqual(workspacePrompt(afterSkip), "over-value");
  assert.doesNotMatch(nextFoxAsk(afterSkip).text, /loan is larger than the house/i);
  const skippedLtv = ltvLine(afterSkip);
  assert.match(skippedLtv?.value ?? "", /125(\.0)?%/);
  assert.equal(skippedLtv?.note, ESTIMATED_NOT_FINAL);

  const readyConflict = pricedReady(written);
  assert.equal(loanExceedsPropertyValue(readyConflict), true);
  assert.equal(rateflowBlockedReason(readyConflict), "ltv");
  assert.equal(rateflowClientBodyFromDraft(readyConflict), null);
  assert.equal(searchedKeyFor(readyConflict), undefined);
  assert.equal(conventionalReadyHoldsReadyLine(readyConflict), false);
  assert.equal(liveQuoteReady(readyConflict), false);
  assert.equal(shouldDeferNextAskForLiveCoupon(readyConflict), false);
  assert.equal(shouldHoldAskForLiveLine(readyConflict), false);
  assert.deepEqual(labels(liveCouponActions(readyConflict)), []);
  assert.equal(previewRateFact(readyConflict)?.value, "Pricing when the file is ready");
  assert.ok(!labels(nextFoxAsk(readyConflict).actions).includes("This one"));
  assert.ok(!labels(nextFoxAsk(readyConflict).actions).includes("Lower payment"));

  const readySkipped = pricedReady(afterSkip);
  assert.equal(readySkipped.loanAmountValue, 500_000);
  assert.equal(readySkipped.propertyValueAmount, 400_000);
  assert.equal(workspacePrompt(readySkipped), "income");
  assert.equal(nextFoxAsk(readySkipped).text, "How is income earned?");
  assert.ok(!labels(nextFoxAsk(readySkipped).actions).includes("This one"));
  assert.ok(!labels(nextFoxAsk(readySkipped).actions).includes("Lower payment"));
  assert.equal(previewRateFact(readySkipped)?.value, "Pricing when the file is ready");
  const thisOne = workspaceReply("This one", readySkipped);
  assert.notEqual(thisOne?.capture?.field, "couponChoice");
  assert.doesNotMatch(thisOne?.text ?? "", /cash-?out|non-?qm/i);
  const skippedReadyLtv = ltvLine(readySkipped);
  assert.match(skippedReadyLtv?.value ?? "", /125(\.0)?%/);
  assert.equal(skippedReadyLtv?.note, ESTIMATED_NOT_FINAL);

  const hundredReady = pricedReady(afterLower);
  assert.equal(hundredReady.loanAmountValue, 400_000);
  assert.equal(hundredReady.propertyValueAmount, 400_000);
  assert.equal(loanExceedsPropertyValue(hundredReady), false);
  assert.ok(searchedKeyFor(hundredReady));
  const emptyBook: FoxIntakeDraft = {
    ...hundredReady,
    liveQuote: undefined,
    liveQuoteKey: searchedKeyFor(hundredReady),
    liveQuoteStatus: "unavailable",
    liveCouponSettled: false,
  };
  assert.equal(liveQuoteReady(emptyBook), false);
  assert.deepEqual(labels(liveCouponActions(emptyBook)), []);
  assert.equal(nextFoxAsk(emptyBook).text, NO_CONVENTIONAL_PRICE_LINE);
  assert.doesNotMatch(nextFoxAsk(emptyBook).text, /non-?qm|fha|125\s*%|no closing/i);
  assert.ok(!labels(nextFoxAsk(emptyBook).actions).includes("This one"));
  assert.ok(!labels(nextFoxAsk(emptyBook).actions).includes("Lower payment"));
  assert.ok(!labels(nextFoxAsk(emptyBook).actions).includes("Try again"));
  assert.deepEqual(labels(nextFoxAsk(emptyBook).actions), ["Change loan", "Change value", "Skip"]);
  const emptyThread = [
    {
      id: "pricing-ready:0" as const,
      role: "fox" as const,
      text: NO_CONVENTIONAL_PRICE_LINE,
    },
  ];
  assert.deepEqual(labels(deskStripActions(emptyThread, emptyBook)), ["Change loan", "Change value", "Skip"]);
  assert.ok(!labels(deskStripActions(emptyThread, emptyBook)).includes("Try again"));
  const skipEmpty = workspaceReply("Skip", emptyBook);
  assert.equal(skipEmpty?.capture?.field, "skip-over-value");
  assert.match(skipEmpty?.text ?? "", /How is income earned/i);
  assert.ok(!labels(skipEmpty?.actions).includes("This one"));

  loadIntakeDraft(emptyBook);
  applyCapture({ field: "correct", value: "value", line: "home" });
  const editingValue = getFoxDraft();
  assert.equal(editingValue.productIntent, "refinance");
  assert.equal(workspacePrompt(editingValue), "value");
  const fromEmpty = workspaceReply("500000", editingValue);
  assert.equal(fromEmpty?.capture?.field, "propertyValue");
  applyCapture(fromEmpty!.capture);
  const afterValueFix = getFoxDraft();
  assert.equal(afterValueFix.productIntent, "refinance");
  assert.equal(afterValueFix.loanAmountValue, 400_000);
  assert.equal(afterValueFix.propertyValueAmount, 500_000);
  assert.doesNotMatch(nextFoxAsk(afterValueFix).text, /purchase price|down payment/i);
  const valueFixKey = searchedKeyFor(afterValueFix);
  assert.ok(valueFixKey);
  const valueFixQuoted: FoxIntakeDraft = {
    ...afterValueFix,
    liveQuote: { key: valueFixKey!, rate: 6.49, asOf: "2026-01-02", principalAndInterest: 2398 },
    liveQuoteKey: valueFixKey,
    liveQuoteStatus: "ready",
    liveCouponSettled: false,
  };
  assert.deepEqual(labels(liveCouponActions(valueFixQuoted)), ["This one", "Lower payment"]);

  const canPrice = pricedReady(afterRaise);
  assert.equal(loanExceedsPropertyValue(canPrice), false);
  assert.notEqual(rateflowBlockedReason(canPrice), "ltv");
  assert.ok(rateflowClientBodyFromDraft(canPrice));
  const canPriceKey = searchedKeyFor(canPrice);
  assert.ok(canPriceKey);
  assert.deepEqual(labels(liveCouponActions(canPrice)), []);
  const canPriceQuoted: FoxIntakeDraft = {
    ...canPrice,
    liveQuote: { key: canPriceKey!, rate: 6.49, asOf: "2026-01-02", principalAndInterest: 2398 },
    liveQuoteKey: canPriceKey,
    liveQuoteStatus: "ready",
  };
  assert.equal(liveQuoteReady(canPriceQuoted), true);
  assert.deepEqual(labels(liveCouponActions(canPriceQuoted)), ["This one", "Lower payment"]);
  const quoteThread = [
    {
      id: "live-quote:ok",
      role: "fox" as const,
      text: "This loan right now: 6.490%. P&I $2,398. Not a lock. As of 2026-01-02 PT.",
    },
  ];
  assert.ok(labels(deskStripActions(quoteThread, canPriceQuoted)).includes("This one"));

  const purchaseOver: FoxIntakeDraft = {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    propertyValueAmount: 500_000,
    valueAsked: true,
    loanAmountValue: 1_000_000,
    amountAsked: true,
  };
  assert.equal(loanExceedsPropertyValue(purchaseOver), false);
  assert.equal(loanExceedsPurchasePrice(purchaseOver), true);
  assert.equal(workspacePrompt(purchaseOver), "over-price");
  assert.match(nextFoxAsk(purchaseOver).text, /loan is larger than the purchase price/i);
  assert.deepEqual(labels(nextFoxAsk(purchaseOver).actions), [
    "Purchase price",
    "Down payment",
    "Loan amount",
    "That’s right",
  ]);
  const purchaseRepeat: FoxIntakeDraft = {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    propertyValueAmount: 500_000,
    valueAsked: true,
  };
  assert.equal(purchasePriceRepeatReply(purchaseRepeat, "500000"), PURCHASE_PRICE_ON_FILE_LINE);

  console.log(
    "assert-refi-loan-over-value: conflict + change loan + no This one until a printed rate",
  );
}

main();
