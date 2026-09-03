/**
 * Manager crawl 1–6. File identity and first-quote chips stay locked.
 */
import assert from "node:assert/strict";
import { canLooksRight } from "../components/fox/completeness";
import { skipFormerHistory } from "../components/fox/fileHistory";
import {
  DOC_INVITE_COPY,
  nextDocInvite,
  skipCurrentInvite,
} from "../components/fox/fileWrite";
import {
  applyCouponChoice,
  liveCouponActions,
  liveCouponConfirmActions,
  liveCouponConfirmCopy,
} from "../components/fox/liveCoupon";
import { applyLooksRightMotion } from "../components/fox/motion";
import { parsePropertyType, writePropertyType, writePropertyZip } from "../components/fox/propertyType";
import { subjectLeaseAskNeeded } from "../components/fox/rentalIncome";
import { emptyDraft } from "../components/fox/store";
import {
  GEO_STOP_COPY,
  PRICING_WHEN_READY,
  messagesWithRateOrReadySpeech,
  namedOutOfState,
  nextFoxAsk,
  previewFacts,
  previewRateFact,
  shouldHoldAskForLiveLine,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import { RATEFLOW_WAIT_LINE } from "../components/fox/lookupWait";
import { rateflowBlockedReason, searchedKeyFor } from "../lib/rateflow/fromDraft";
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
    propertyValueAmount: 850_000,
    loanAmountValue: 680_000,
    downPaymentAmount: 170_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
  };
}

assert.deepEqual(
  liveCouponActions().map((item) => item.label),
  ["This one", "Lower payment"],
);

const lead: FoxIntakeDraft = {
  ...sketch(),
  liveQuote: { key: "q1", rate: 6.49, asOf: "2026-01-02", principalAndInterest: 4000 },
  liveQuoteKey: "q1",
  liveQuoteStatus: "ready",
};
const lower = applyCouponChoice(lead, "lower");
const confirm = liveCouponConfirmCopy({
  ...lower,
  liveQuote: lead.liveQuote,
  pendingLiveCoupon: {
    choice: "lower",
    rate: 6.125,
    asOf: "2026-01-02",
    principalAndInterest: 3800,
  },
});
assert.deepEqual(
  (confirm.actions ?? []).map((item) => item.label),
  ["Use the new line", "Keep 6.490%"],
);
assert.ok(!(confirm.actions ?? []).some((item) => item.label === "Skip"));
assert.deepEqual(
  liveCouponConfirmActions(lead).map((item) => item.label),
  ["Use the new line", "Keep 6.490%"],
);

const historyOpen: FoxIntakeDraft = {
  ...sketch(),
  subjectAddress: "500 Market St, San Francisco, CA 94105",
  subjectAddressAsked: true,
  propertyZip: "94105",
  propertyZipAsked: true,
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "w2" },
  wageDocsAsked: true,
  wageBox5Asked: true,
  wageFrequencyAsked: true,
  wageStubAsked: true,
  facts: {
    qualifying_income: {
      field: "qualifying_income",
      value: "9999.99",
      source: "client",
      confirmed: true,
    },
    employer_name: {
      field: "employer_name",
      value: "Harbor Pacific Design Inc",
      source: "document",
      confirmed: true,
    },
    w2_box5: { field: "w2_box5", value: "118400", source: "document", confirmed: true },
  },
  employmentHistory: [{ label: "Harbor Pacific Design Inc", to: "present" }],
  skippedClasses: ["government_id", "bank_statement"],
};
assert.equal(canLooksRight(historyOpen), false);
assert.equal(workspacePrompt(historyOpen), "former-history");
assert.match(nextFoxAsk(historyOpen).text, /Who did you work for before Harbor Pacific Design Inc/);
const historyDone = skipFormerHistory(historyOpen);
assert.ok(canLooksRight(historyDone));
const afterLooks = applyLooksRightMotion(historyDone);
assert.notEqual(workspacePrompt(afterLooks), "former-history");
assert.notEqual(workspacePrompt(afterLooks), "citizenship");
assert.notEqual(workspacePrompt(afterLooks), "years-in-business");

assert.equal(namedOutOfState("97535"), true);
assert.equal(namedOutOfState("94123"), false);
const addressAsk = sketch();
const out = workspaceReply("97535", addressAsk);
assert.equal(out?.capture?.field, "propertyZip");
assert.match(out?.text ?? "", /California only/);
assert.equal(out?.text, GEO_STOP_COPY);
assert.doesNotMatch(out?.text ?? "", new RegExp(PRICING_WHEN_READY));
assert.ok(!(out?.actions ?? []).some((item) => /Try again|Skip/i.test(item.label)));
const after97535 = writePropertyZip(addressAsk, "97535");
assert.equal(after97535.outOfState, true);
assert.equal(after97535.propertyType, "sfr");
assert.equal(after97535.creditBand, "760+");
assert.equal(previewRateFact(after97535), null);
assert.ok(!previewFacts(after97535).some((fact) => fact.value === PRICING_WHEN_READY));
const oregonZip = previewFacts(after97535).find((fact) => fact.id === "zip");
assert.ok(
  !oregonZip ||
    (oregonZip.value.startsWith("97535") &&
      /California only/i.test(`${oregonZip.value} ${oregonZip.note ?? ""}`)),
);
assert.ok(
  !messagesWithRateOrReadySpeech([], after97535).some((item) => item.text === PRICING_WHEN_READY),
);
const leftoverReady: FoxIntakeDraft = {
  ...after97535,
  liveQuoteStatus: "unavailable",
  propertyZipAsked: true,
};
assert.equal(previewRateFact(leftoverReady), null);
assert.ok(!previewFacts(leftoverReady).some((fact) => fact.value === PRICING_WHEN_READY));
assert.ok(
  !messagesWithRateOrReadySpeech(
    [{ id: "pricing-ready:0", role: "fox", text: PRICING_WHEN_READY }],
    leftoverReady,
  ).some((item) => item.text === PRICING_WHEN_READY),
);
const stopped: FoxIntakeDraft = { ...addressAsk, outOfState: true, liveQuoteStatus: "unavailable" };
assert.equal(nextFoxAsk(stopped).text, GEO_STOP_COPY);
assert.doesNotMatch(nextFoxAsk(stopped).text, new RegExp(PRICING_WHEN_READY));
const ca = workspaceReply("94123", after97535);
assert.equal(ca?.capture?.field, "propertyZip");
assert.notEqual(ca?.text, GEO_STOP_COPY);
assert.doesNotMatch(ca?.text ?? "", new RegExp(PRICING_WHEN_READY));
assert.equal(ca?.text, RATEFLOW_WAIT_LINE);
const priced: FoxIntakeDraft = writePropertyZip(after97535, "94123");
assert.equal(priced.outOfState, false);
assert.equal(priced.propertyZip, "94123");
assert.equal(priced.propertyType, "sfr");
assert.equal(priced.creditBand, "760+");
assert.equal(rateflowBlockedReason(priced), null);
assert.equal(shouldHoldAskForLiveLine(priced), true);
assert.equal(nextFoxAsk(priced).text, RATEFLOW_WAIT_LINE);
assert.equal(previewRateFact(priced), null);
assert.ok(!previewFacts(priced).some((fact) => fact.value === PRICING_WHEN_READY));
const liveKey = searchedKeyFor(priced);
assert.ok(liveKey);
const harborPriced: FoxIntakeDraft = {
  ...priced,
  liveQuote: {
    key: liveKey,
    rate: 6.375,
    asOf: "2026-01-02T18:00:00.000Z",
    pts: -0.07,
  },
  liveQuoteKey: liveKey,
  liveQuoteStatus: "ready",
};
const harborRate = previewRateFact(harborPriced);
assert.ok(harborRate);
assert.match(harborRate.value, /6\.375%/);
assert.match(harborRate.value, /-0\.07/);
assert.doesNotMatch(harborRate.value, new RegExp(PRICING_WHEN_READY));
assert.ok(!previewFacts(harborPriced).some((fact) => fact.value === PRICING_WHEN_READY));

assert.equal(parsePropertyType("two_to_four"), "two_to_four");
const typed = writePropertyType(sketch(), "two_to_four");
assert.equal(typed.propertyType, "two_to_four");
assert.equal(typed.facts?.propertyType?.value, "two_to_four");
assert.notEqual(workspacePrompt(typed), "property-type");
assert.equal(subjectLeaseAskNeeded({ ...typed, occupancyChoice: { ...typed.occupancyChoice, value: "primary" } }), true);
assert.equal(subjectLeaseAskNeeded(sketch()), false);
assert.equal(
  subjectLeaseAskNeeded({
    ...sketch(),
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "investment" },
  }),
  true,
);

const se: FoxIntakeDraft = {
  ...sketch(),
  subjectAddress: "2101 California Street, San Francisco, CA 94115",
  subjectAddressAsked: true,
  propertyZip: "94115",
  propertyZipAsked: true,
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
};
assert.equal(nextDocInvite(se), "government_id");
assert.match(DOC_INVITE_COPY.government_id, /name on it/);
const afterIdSkip = skipCurrentInvite(se);
assert.equal(nextDocInvite(afterIdSkip), "tax_return");
assert.equal(canLooksRight(afterIdSkip), false);
assert.equal(workspacePrompt(afterIdSkip), "documents");
const afterTaxSkip = skipCurrentInvite(afterIdSkip);
assert.equal(nextDocInvite(afterTaxSkip), "prior_year_return");
assert.equal(canLooksRight(afterTaxSkip), false);

console.log("qc-crawl PASS");
