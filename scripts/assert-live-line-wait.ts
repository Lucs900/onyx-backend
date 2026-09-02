/**
 * After ZIP, Fox says Getting a live line. Income waits until the rate posts or Skip.
 * One turn. No stacked How is income earned? on the spinner.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { writePropertyZip } from "../components/fox/propertyType";
import {
  nextFoxAsk,
  shouldHoldAskForLiveLine,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import {
  RATEFLOW_WAIT_LINE,
  isLookupWaitLine,
  rateflowWaitActions,
  withWaitLine,
} from "../components/fox/lookupWait";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import type { FoxIntakeDraft } from "../components/fox/types";

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
assert.deepEqual(
  (zipReply?.actions ?? []).map((item) => item.label),
  rateflowWaitActions().map((item) => item.label),
);

const afterZip = writePropertyZip(beforeZip, "94115");
assert.equal(workspacePrompt(afterZip), "income");
assert.equal(shouldHoldAskForLiveLine(afterZip), true);
assert.equal(nextFoxAsk(afterZip).text, RATEFLOW_WAIT_LINE);
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
assert.ok(!stacked.some((item) => item.text === "How is income earned?"));

console.log("live-line wait PASS");
