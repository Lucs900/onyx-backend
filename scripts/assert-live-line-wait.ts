/**
 * After ZIP, Fox says Getting a live line. Income waits until the rate posts.
 * One turn. No stacked How is income earned? on the spinner. No chips on the wait.
 * This one · Lower payment · Skip only after a quote. Fail/timeout: Try again · Skip.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { writePropertyZip } from "../components/fox/propertyType";
import {
  PRICING_WHEN_READY,
  messagesWithLiveQuoteSpeech,
  messagesWithPricingWhenReady,
  nextFoxAsk,
  shouldHoldAskForLiveLine,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import {
  RATEFLOW_WAIT_LINE,
  isLookupWaitLine,
  pricingFailedActions,
  rateflowWaitActions,
  withWaitLine,
} from "../components/fox/lookupWait";
import { applyCouponChoice, liveCouponActions, paintedFoxActions } from "../components/fox/liveCoupon";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function zipReadyDraft(): FoxIntakeDraft {
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
    propertyValueAmount: 850_000,
    loanAmountValue: 680_000,
    downPaymentAmount: 170_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
  };
}

const beforeZip = zipReadyDraft();
assert.equal(workspacePrompt(beforeZip), "property-address");
const zipReply = workspaceReply("94115", beforeZip);
assert.equal(zipReply?.capture?.field, "propertyZip");
assert.equal(zipReply?.text, RATEFLOW_WAIT_LINE);
assert.doesNotMatch(zipReply?.text ?? "", /How is income earned/);
assert.deepEqual((zipReply?.actions ?? []).map((item) => item.label), []);
assert.ok(!(zipReply?.actions ?? []).some((item) => /Skip|This one|Lower payment|Try again/i.test(item.label)));
assert.deepEqual(rateflowWaitActions().map((item) => item.label), []);

const afterZip = writePropertyZip(beforeZip, "94115");
assert.equal(workspacePrompt(afterZip), "income");
assert.equal(shouldHoldAskForLiveLine(afterZip), true);
assert.equal(nextFoxAsk(afterZip).text, RATEFLOW_WAIT_LINE);
assert.deepEqual((nextFoxAsk(afterZip).actions ?? []).map((item) => item.label), []);
assert.doesNotMatch(nextFoxAsk(afterZip).text, /How is income earned/);

const skipWait = workspaceReply("Skip", afterZip);
assert.equal(skipWait?.capture?.field, "couponChoice");
assert.equal(skipWait?.text, "How is income earned?");
assert.equal(shouldHoldAskForLiveLine(applyCouponChoice(afterZip, "skip")), false);

const stacked = withWaitLine(
  [
    {
      id: "income-too-soon",
      role: "fox",
      text: "How is income earned?",
      actions: [{ id: "skip-income", label: "Skip", event: "bubble", capture: { field: "skip-income" } }],
    },
  ],
  "rateflow",
);
assert.equal(stacked.length, 1);
assert.equal(stacked[0]?.text, RATEFLOW_WAIT_LINE);
assert.equal(isLookupWaitLine(stacked[0]?.text), true);
assert.equal(stacked[0]?.actions, undefined);
assert.ok(!stacked.some((item) => item.text === "How is income earned?"));
assert.equal(paintedFoxActions(stacked[0]!, afterZip, true), undefined);

const quoted: FoxIntakeDraft = {
  ...afterZip,
  liveQuote: { key: "live-1", rate: 6.375, asOf: "2026-01-02", principalAndInterest: 4211 },
  liveQuoteKey: "live-1",
  liveQuoteStatus: "ready",
};
const quoteThread = messagesWithLiveQuoteSpeech([], quoted, quoted.liveQuote!);
const quoteTurn = quoteThread.find((item) => item.id.startsWith("live-quote:"));
assert.ok(quoteTurn);
assert.deepEqual(
  (quoteTurn?.actions ?? []).map((item) => item.label).filter((label) => label !== "No cost"),
  ["This one", "Lower payment", "Skip"],
);
assert.ok((liveCouponActions(quoted) ?? []).some((item) => item.label === "This one"));
assert.ok((liveCouponActions(quoted) ?? []).some((item) => item.label === "Lower payment"));
assert.ok((liveCouponActions(quoted) ?? []).some((item) => item.label === "Skip"));

const failed: FoxIntakeDraft = {
  ...afterZip,
  subjectAddress: "2101 California Street, San Francisco, CA 94115",
  liveQuote: undefined,
  liveQuoteKey: "miss-1",
  liveQuoteStatus: "unavailable",
  liveCouponSettled: false,
};
assert.equal(shouldHoldAskForLiveLine(failed), false);
assert.equal(nextFoxAsk(failed).text, PRICING_WHEN_READY);
assert.deepEqual(
  (nextFoxAsk(failed).actions ?? []).map((item) => item.label),
  ["Try again", "Skip"],
);
assert.deepEqual(
  pricingFailedActions().map((item) => item.label),
  ["Try again", "Skip"],
);
const failThread = messagesWithPricingWhenReady([], failed);
const failTurn = failThread.find((item) => item.id.startsWith("pricing-ready:")) as FoxMessage;
assert.ok(failTurn);
assert.equal(failTurn.text, PRICING_WHEN_READY);
assert.deepEqual(
  (failTurn.actions ?? []).map((item) => item.label),
  ["Try again", "Skip"],
);
assert.ok(
  (paintedFoxActions(failTurn, failed, true) ?? []).some((item) => item.label === "Try again"),
);
assert.ok((paintedFoxActions(failTurn, failed, true) ?? []).some((item) => item.label === "Skip"));
assert.ok(!(paintedFoxActions(failTurn, failed, true) ?? []).some((item) => item.label === "This one"));
const retryReply = workspaceReply("Try again", failed);
assert.equal(retryReply?.capture?.field, "retry-rateflow");
assert.equal(retryReply?.text, RATEFLOW_WAIT_LINE);
assert.deepEqual((retryReply?.actions ?? []).map((item) => item.label), []);
const failSkip = workspaceReply("Skip", failed);
assert.equal(failSkip?.capture?.field, "couponChoice");

console.log("live-line wait PASS");
