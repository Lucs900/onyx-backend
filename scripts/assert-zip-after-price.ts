/**
 * After an out-of-CA ZIP, California only. A CA ZIP writes and may price.
 * A rate line must not reopen ZIP / address. Next ask is income, not ZIP.
 * The invent-nothing canned line is never a prefix on How is income earned.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  PURCHASE_ADDRESS_ASK,
  californiaZipOnFile,
  propertyAddressNeededForQuote,
  propertyZipAskNeeded,
  writePropertyZip,
} from "../components/fox/propertyType";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import {
  GEO_STOP_COPY,
  messagesWithLiveQuoteSpeech,
  messagesWithRateOrReadySpeech,
  nextFoxAsk,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import { RATEFLOW_WAIT_LINE } from "../components/fox/lookupWait";
import { searchedKeyFor } from "../lib/rateflow/fromDraft";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

const INCOME_ASK = "How is income earned?";
const CANNED =
  "I can answer from this file. I won’t invent a number, a date, or an approval.";

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
    propertyValueAmount: 850_000,
    loanAmountValue: 680_000,
    downPaymentAmount: 170_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
  };
}

function quotedFromZip(draft: FoxIntakeDraft, rate = 6.875): FoxIntakeDraft {
  const key = searchedKeyFor(draft);
  assert.ok(key);
  return {
    ...draft,
    liveQuote: { key: key!, rate, asOf: "2026-01-02", principalAndInterest: 4211 },
    liveQuoteKey: key,
    liveQuoteStatus: "ready",
  };
}

function walkThread(afterOregon: FoxIntakeDraft): FoxMessage[] {
  return [
    {
      id: "addr-ask",
      role: "fox",
      text: PURCHASE_ADDRESS_ASK,
      actions: [{ id: "skip-address", label: "Skip", event: "bubble", capture: { field: "skip-property-address" } }],
    },
    { id: "you-97535", role: "you", text: "97535" },
    {
      id: "geo-stop",
      role: "fox",
      text: GEO_STOP_COPY,
      actions: [{ id: "request-human", label: "Request a licensed originator", event: "bubble", capture: { field: "talk-originator" } }],
    },
    { id: "you-94123", role: "you", text: "94123" },
    { id: "wait-rate", role: "fox", text: RATEFLOW_WAIT_LINE },
  ];
}

const addressAsk = sketch();
assert.equal(workspacePrompt(addressAsk), "property-address");
assert.match(nextFoxAsk(addressAsk).text, /address or ZIP/);

const oregonReply = workspaceReply("97535", addressAsk);
assert.equal(oregonReply?.capture?.field, "propertyZip");
assert.equal(oregonReply?.text, GEO_STOP_COPY);
assert.doesNotMatch(oregonReply?.text ?? "", /Getting a live line|How is income earned/);

const afterOregon = writePropertyZip(addressAsk, "97535");
assert.equal(afterOregon.outOfState, true);
assert.equal(californiaZipOnFile(afterOregon), false);
assert.equal(workspacePrompt(afterOregon), "geo-stop");
assert.equal(nextFoxAsk(afterOregon).text, GEO_STOP_COPY);

const caReply = workspaceReply("94123", afterOregon);
assert.equal(caReply?.capture?.field, "propertyZip");
assert.equal(caReply?.capture?.value, "94123");
assert.equal(caReply?.text, RATEFLOW_WAIT_LINE);
assert.doesNotMatch(caReply?.text ?? "", /address or ZIP|California only|How is income earned/);

const afterCA = writePropertyZip(afterOregon, "94123");
assert.equal(afterCA.outOfState, false);
assert.equal(afterCA.propertyZip, "94123");
assert.equal(californiaZipOnFile(afterCA), true);
assert.equal(propertyAddressNeededForQuote(afterCA), false);
assert.equal(propertyZipAskNeeded(afterCA), false);
assert.equal(workspacePrompt(afterCA), "income");
assert.notEqual(workspacePrompt(afterCA), "property-zip");
assert.notEqual(workspacePrompt(afterCA), "property-address");
assert.notEqual(workspacePrompt(afterCA), "geo-stop");
assert.equal(nextFoxAsk(afterCA).text, RATEFLOW_WAIT_LINE);
assert.doesNotMatch(nextFoxAsk(afterCA).text, /address or ZIP/);

const quoted = quotedFromZip(afterCA, 6.875);
assert.equal(californiaZipOnFile(quoted), true);
assert.equal(propertyAddressNeededForQuote(quoted), false);
assert.equal(propertyZipAskNeeded(quoted), false);
assert.equal(workspacePrompt(quoted), "income");
assert.equal(nextFoxAsk(quoted).text, INCOME_ASK);
assert.doesNotMatch(nextFoxAsk(quoted).text, /address or ZIP|California only/);

const pricedThread = messagesWithLiveQuoteSpeech(walkThread(afterOregon), quoted, quoted.liveQuote!);
const lastPriced = pricedThread[pricedThread.length - 1];
assert.ok(lastPriced?.id.startsWith("live-quote:"));
assert.match(lastPriced?.text ?? "", /Not a lock/);
assert.ok(!pricedThread.some((item) => item.id.startsWith("fox-ask-after-quote:")));
assert.ok(
  !pricedThread.some(
    (item, index) =>
      index > 0 &&
      pricedThread[index - 1]?.id.startsWith("live-quote:") &&
      /address or ZIP|California only|What ZIP is the property/i.test(item.text),
  ),
);
assert.doesNotMatch(lastPriced?.text ?? "", /address or ZIP|California only|How is income earned/);
assert.ok(!pricedThread.some((item) => item.text === PURCHASE_ADDRESS_ASK && item.id.startsWith("fox-ask-after-quote:")));
assert.ok(!pricedThread.some((item) => item.text === GEO_STOP_COPY && item.id !== "geo-stop"));

const readyThread = messagesWithRateOrReadySpeech(walkThread(afterOregon), quoted);
const lastReady = readyThread[readyThread.length - 1];
assert.ok(lastReady?.id.startsWith("live-quote:"));
assert.ok(!readyThread.some((item) => item.id.startsWith("fox-ask-after-quote:")));
assert.doesNotMatch(lastReady?.text ?? "", /address or ZIP|California only/);

const thisOne = workspaceReply("This one", quoted);
assert.equal(thisOne?.capture?.field, "couponChoice");
assert.equal(thisOne?.text, INCOME_ASK);
assert.doesNotMatch(thisOne?.text ?? "", /address or ZIP|won’t invent|I can answer from this file/);

const afterThis = applyCouponChoice(quoted, "this");
assert.equal(workspacePrompt(afterThis), "income");
assert.equal(nextFoxAsk(afterThis).text, INCOME_ASK);
assert.doesNotMatch(nextFoxAsk(afterThis).text, /address or ZIP/);

const typedAgain = workspaceReply("94123", quoted);
assert.ok(typedAgain);
assert.doesNotMatch(typedAgain?.text ?? "", /address or ZIP|California only/);
assert.doesNotMatch(typedAgain?.text ?? "", /won’t invent a number, a date, or an approval/);
assert.doesNotMatch(typedAgain?.text ?? "", /I can answer from this file/);
assert.equal(typedAgain?.text, INCOME_ASK);
assert.notEqual(typedAgain?.capture?.field, "propertyZip");

const leftoverIncome = workspaceReply("what is the weather", quoted);
assert.ok(leftoverIncome);
assert.doesNotMatch(leftoverIncome?.text ?? "", new RegExp(CANNED.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(leftoverIncome?.text ?? "", /How is income earned/);
assert.doesNotMatch(leftoverIncome?.text ?? "", /address or ZIP/);

console.log("zip-after-price PASS");
