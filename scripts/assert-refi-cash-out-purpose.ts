/**
 * Refinance purpose chips after loan + value.
 * Cash out writes Purpose Cash-out and sends Rateflow as cash-out.
 * After ZIP, Fox speaks wait / coupon / named vendor reason — never an empty composer.
 * New rate / Skip keep today’s rate-term lead. Purchase never sees the chips.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { liveCouponActions, liveQuoteReady } from "../components/fox/liveCoupon";
import { writePropertyZip } from "../components/fox/propertyType";
import { RATEFLOW_WAIT_LINE, withoutWaitLines } from "../components/fox/lookupWait";
import {
  cashOutLiveEligible,
  cashOutLtvOverCap,
  rateflowBlockedReason,
  rateflowClientBodyFromDraft,
  searchedKeyFor,
} from "../lib/rateflow/fromDraft";
import {
  rateflowCashOutRequest,
  pickConventional30LowestNoPoints,
  pickLeadRow,
} from "../lib/rateflow/quote";
import {
  NO_CONVENTIONAL_PRICE_LINE,
  REFI_PURPOSE_ASK,
  REFI_PURPOSE_CASH_OUT,
  REFI_PURPOSE_RATE_TERM,
  cashOutNoPriceReady,
  deskStripActions,
  messagesWithRateOrReadySpeech,
  needsRefiPurposeAsk,
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  workspaceReply,
  writePurchasePrice,
  writeRefiPurpose,
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

function withMoney(loan = 400_000, value = 500_000): FoxIntakeDraft {
  return writePurchasePrice(
    {
      ...afterPrimary(),
      loanAmountValue: loan,
      amountAsked: true,
    },
    value,
  );
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
    subjectAddress: "2100 Green Street, San Francisco, CA 94123",
    subjectCity: "San Francisco",
    subjectState: "CA",
  };
}

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function purposeFact(draft: FoxIntakeDraft) {
  return previewFacts(draft).find((fact) => fact.id === "purpose" || fact.label === "Purpose");
}

function main() {
  const money = withMoney();
  assert.equal(money.loanAmountValue, 400_000);
  assert.equal(money.propertyValueAmount, 500_000);
  assert.equal(needsRefiPurposeAsk(money), true);
  assert.equal(workspacePrompt(money), "refi-purpose");
  assert.equal(nextFoxAsk(money).text, REFI_PURPOSE_ASK);
  assert.deepEqual(labels(nextFoxAsk(money).actions), ["Cash out", "New rate", "Skip"]);
  assert.deepEqual(
    labels(
      deskStripActions([{ id: "refi-purpose", role: "fox", text: REFI_PURPOSE_ASK }], money),
    ),
    ["Cash out", "New rate", "Skip"],
  );

  const purchase = {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy" as const,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    propertyValueAmount: 500_000,
    valueAsked: true,
    downPaymentAmount: 100_000,
    downAsked: true,
    loanAmountValue: 400_000,
    amountAsked: true,
  };
  assert.equal(needsRefiPurposeAsk(purchase), false);
  assert.notEqual(workspacePrompt(purchase), "refi-purpose");
  assert.doesNotMatch(nextFoxAsk(purchase).text, /cash out — money to you at closing/i);
  assert.ok(!labels(nextFoxAsk(purchase).actions).includes("Cash out"));

  const cashOut = workspaceReply("Cash out", money);
  assert.equal(cashOut?.capture?.field, "refiPurpose");
  assert.equal(cashOut?.capture && "value" in cashOut.capture ? cashOut.capture.value : "", "cash-out");
  assert.doesNotMatch(cashOut?.text ?? "", /about how much cash/i);
  const cashOutFile = writeRefiPurpose(money, "cash-out");
  assert.equal(cashOutFile.cashOut, true);
  assert.equal(cashOutFile.refiPurposeAsked, true);
  assert.equal(cashOutFile.loanAmountValue, 400_000);
  assert.equal(purposeFact(cashOutFile)?.value, REFI_PURPOSE_CASH_OUT);
  assert.equal(needsRefiPurposeAsk(cashOutFile), false);
  assert.notEqual(workspacePrompt(cashOutFile), "refi-purpose");
  assert.match(nextFoxAsk(cashOutFile).text, /kind of home|House, condo/i);

  const reprint = workspaceReply("Skip", cashOutFile);
  assert.notEqual(reprint?.capture?.field, "refiPurpose");
  assert.doesNotMatch(reprint?.text ?? "", /cash out — money to you at closing/i);

  const newRate = writeRefiPurpose(money, "rate-term");
  assert.equal(newRate.cashOut, false);
  assert.equal(newRate.refiPurposeAsked, true);
  assert.equal(purposeFact(newRate)?.value, REFI_PURPOSE_RATE_TERM);
  assert.equal(needsRefiPurposeAsk(newRate), false);
  const skipped = writeRefiPurpose(money, "skip");
  assert.equal(skipped.cashOut, false);
  assert.equal(skipped.refiPurposeAsked, true);
  assert.equal(purposeFact(skipped)?.value, REFI_PURPOSE_RATE_TERM);
  assert.equal(workspaceReply("Skip", money)?.capture?.field, "refiPurpose");

  const looksRight = { ...money, sampleAccepted: true };
  assert.equal(needsRefiPurposeAsk(looksRight), false);
  assert.notEqual(workspacePrompt(looksRight), "refi-purpose");

  const changedLoan = { ...cashOutFile, loanAmountValue: 380_000 };
  assert.equal(changedLoan.cashOut, true);
  assert.equal(purposeFact(changedLoan)?.value, REFI_PURPOSE_CASH_OUT);
  const changedValue = { ...cashOutFile, propertyValueAmount: 520_000 };
  assert.equal(purposeFact(changedValue)?.value, REFI_PURPOSE_CASH_OUT);

  const vanilla = pricedReady(cashOutFile);
  assert.equal(cashOutLiveEligible(vanilla), true);
  assert.equal(cashOutLtvOverCap(vanilla), false);
  assert.equal(rateflowBlockedReason(vanilla), null);
  const body = rateflowClientBodyFromDraft(vanilla);
  const cashOutWire = rateflowCashOutRequest(400_000);
  assert.equal(body?.loan_purpose, "refinance");
  assert.equal(body?.residency_type, "primary_home");
  assert.equal(body?.cash_out, cashOutWire.cash_out);
  assert.notEqual(body?.cash_out, 2001);
  assert.ok((body?.cash_out ?? 0) > 2000);
  assert.equal(body?.loan_amount, cashOutWire.loan_amount);
  assert.equal((body?.loan_amount ?? 0) + (body?.cash_out ?? 0), 400_000);
  assert.equal(body?.list_price, 500_000);
  assert.notEqual(searchedKeyFor(vanilla), searchedKeyFor(pricedReady(skipped)));

  const beforeZip = {
    ...cashOutFile,
    propertyType: "sfr" as const,
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+" as const,
  };
  assert.equal(purposeFact(beforeZip)?.value, REFI_PURPOSE_CASH_OUT);
  const zipReply = workspaceReply("94123", beforeZip);
  assert.equal(zipReply?.capture?.field, "propertyZip");
  assert.equal(zipReply?.text, RATEFLOW_WAIT_LINE);
  assert.ok((zipReply?.text ?? "").trim(), "ZIP write cannot leave an empty composer");
  const zipOnly = writePropertyZip(beforeZip, "94123");
  assert.equal(zipOnly.cashOut, true);
  assert.equal(purposeFact(zipOnly)?.value, REFI_PURPOSE_CASH_OUT);
  assert.equal(zipOnly.subjectAddress, undefined);
  assert.equal(nextFoxAsk(zipOnly).text, RATEFLOW_WAIT_LINE);

  const zipMiss = {
    ...zipOnly,
    liveQuote: undefined,
    liveQuoteKey: searchedKeyFor(zipOnly),
    liveQuoteStatus: "unavailable" as const,
  };
  assert.equal(cashOutNoPriceReady(zipMiss), false);
  assert.notEqual(nextFoxAsk(zipMiss).text, "Cash-out programs are not on this Rateflow book.");
  assert.deepEqual(labels(nextFoxAsk(zipMiss).actions), ["Try again", "Skip"]);
  assert.ok(!labels(nextFoxAsk(zipMiss).actions).includes("Change loan"));
  assert.ok(!labels(nextFoxAsk(zipMiss).actions).includes("This one"));
  const missThread = messagesWithRateOrReadySpeech(withoutWaitLines([]), zipMiss);
  assert.ok(!missThread.some((item) => item.text === "Cash-out programs are not on this Rateflow book."));
  assert.deepEqual(
    labels(deskStripActions(missThread, zipMiss)),
    ["Try again", "Skip"],
  );

  const zipReject = {
    ...zipMiss,
    liveQuoteVendorReason: "cash_out requires loan_purpose: refinance",
  };
  assert.equal(nextFoxAsk(zipReject).text, "cash_out requires loan_purpose: refinance");
  assert.deepEqual(labels(nextFoxAsk(zipReject).actions), ["Try again", "Skip"]);
  assert.ok(!labels(nextFoxAsk(zipReject).actions).includes("This one"));
  const rejectThread = messagesWithRateOrReadySpeech(withoutWaitLines([]), zipReject);
  assert.ok(rejectThread.some((item) => item.text === "cash_out requires loan_purpose: refinance"));
  assert.equal(purposeFact(zipReject)?.value, REFI_PURPOSE_CASH_OUT);

  const pointsOnlyCashOut = [
    { rate: 7.625, pts: 0.875, loanTerm: 30, bbLoanType: "conventional", productName: "FNMA 30 Yr Fixed" },
    { rate: 7.875, pts: 0.25, loanTerm: 30, bbLoanType: "conventional", productName: "FNMA 30 Yr Fixed" },
  ];
  assert.equal(pickConventional30LowestNoPoints(pointsOnlyCashOut), null);
  assert.equal(pickLeadRow(pointsOnlyCashOut, "refinance", true)?.rate, 7.625);
  assert.notEqual(pickLeadRow(pointsOnlyCashOut, "refinance", true)?.rate, 7.25);

  const hundred = pricedReady(writeRefiPurpose(withMoney(400_000, 400_000), "cash-out"));
  assert.equal(cashOutLiveEligible(hundred), false);
  assert.equal(cashOutLtvOverCap(hundred), true);
  assert.equal(rateflowBlockedReason(hundred), "cash-out-ltv");
  assert.equal(rateflowClientBodyFromDraft(hundred), null);
  assert.equal(cashOutNoPriceReady(hundred), true);
  assert.equal(nextFoxAsk(hundred).text, NO_CONVENTIONAL_PRICE_LINE);
  assert.deepEqual(labels(nextFoxAsk(hundred).actions), ["Change loan", "Change value", "Skip"]);
  assert.ok(!labels(liveCouponActions(hundred)).includes("This one"));
  assert.equal(liveQuoteReady(hundred), false);
  const thisOne = workspaceReply("This one", hundred);
  assert.notEqual(thisOne?.capture?.field, "couponChoice");

  const investment = pricedReady({
    ...cashOutFile,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "investment" },
  });
  assert.equal(cashOutLiveEligible(investment), false);
  assert.equal(rateflowBlockedReason(investment), "cash-out");
  assert.equal(rateflowClientBodyFromDraft(investment), null);

  const twoToFour = {
    ...pricedReady(cashOutFile),
    propertyType: "two_to_four" as const,
    propertyUnits: "2",
  };
  assert.equal(cashOutLiveEligible(twoToFour), false);
  assert.equal(rateflowBlockedReason(twoToFour), "cash-out");

  const gov = pricedReady({ ...cashOutFile, govProgram: "fha" });
  assert.equal(cashOutLiveEligible(gov), false);
  assert.equal(rateflowBlockedReason(gov), "program");

  console.log("assert-refi-cash-out-purpose: Cash out writes Purpose and prices; New rate unchanged");
}

main();
