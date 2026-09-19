/**
 * HELOC is a first-class Fox path. Not cash-out with a different label.
 * After Primary: value → first lien → line or Skip.
 * Quote from calculateHelocQuote. Never Rateflow. Never This loan + P&I.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { liveCouponActions, liveQuoteReady } from "../components/fox/liveCoupon";
import { writePropertyZip } from "../components/fox/propertyType";
import {
  HELOC_FIRST_LIEN_ASK,
  HELOC_LINE_ASK,
  HELOC_NO_PREVIEW_LINE,
  HELOC_NO_PROGRAM_LINE,
  HELOC_PURPOSE,
  HELOC_VALUE_ASK,
  helocLiveEligible,
  helocNoPreviewReady,
  helocQuoteFromDraft,
  helocShapeReady,
  liveHelocNowCopy,
  withHelocToolQuote,
} from "../components/fox/heloc";
import {
  rateflowBlockedReason,
  rateflowClientBodyFromDraft,
  searchedKeyFor,
} from "../lib/rateflow/fromDraft";
import { calculateHelocQuote } from "../lib/calculateHelocQuote";
import {
  amountAskText,
  deskStripActions,
  formatLiveMoneyInput,
  nextFoxAsk,
  previewFacts,
  productIntentFromText,
  workspacePrompt,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import { writeFirstLien, skipHelocLine, writeHelocLine } from "../components/fox/heloc";
import { draftLtvCltv } from "../components/fox/calculators";
import type { FoxIntakeDraft } from "../components/fox/types";

function afterPrimary(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "heloc",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  };
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
    subjectAddress: undefined,
    subjectCity: "San Francisco",
    subjectState: "CA",
  };
}

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function fact(draft: FoxIntakeDraft, id: string) {
  return previewFacts(draft).find((item) => item.id === id || item.label === id);
}

function main() {
  assert.equal(productIntentFromText("heloc"), "heloc");
  assert.equal(productIntentFromText("line of credit"), "heloc");
  assert.equal(productIntentFromText("I need a HELOC"), "heloc");
  assert.notEqual(productIntentFromText("cash out"), "heloc");
  assert.equal(productIntentFromText("cash-out refinance"), "refinance");

  assert.equal(formatLiveMoneyInput("400000"), "400,000");
  assert.equal(formatLiveMoneyInput("100000"), "100,000");
  assert.equal(formatLiveMoneyInput("$400000"), "$400,000");
  assert.equal(formatLiveMoneyInput("500000"), "500,000");

  const start = workspaceReply("HELOC", {
    ...emptyDraft(),
    path: "acr",
  });
  assert.equal(start?.capture?.field, "productIntent");
  assert.equal(start?.capture && "value" in start.capture ? start.capture.value : "", "heloc");
  assert.doesNotMatch(start?.text ?? "", /cash out — money to you at closing/i);

  const afterOcc = afterPrimary();
  assert.equal(workspacePrompt(afterOcc), "value");
  assert.equal(nextFoxAsk(afterOcc).text, HELOC_VALUE_ASK);
  assert.equal(amountAskText(afterOcc), HELOC_VALUE_ASK);

  const valueReply = workspaceReply("500000", afterOcc);
  assert.equal(valueReply?.capture?.field, "propertyValue");
  assert.ok((valueReply?.text ?? "").trim(), "value write cannot leave an empty composer");
  const afterValue = writePurchasePrice(afterOcc, 500_000);
  assert.equal(afterValue.propertyValueAmount, 500_000);
  assert.equal(workspacePrompt(afterValue), "first-lien");
  assert.equal(nextFoxAsk(afterValue).text, HELOC_FIRST_LIEN_ASK);

  const firstReply = workspaceReply("400000", afterValue);
  assert.equal(firstReply?.capture?.field, "firstLien");
  assert.ok((firstReply?.text ?? "").trim(), "first-lien write cannot leave an empty composer");
  const afterFirst = writeFirstLien(afterValue, 400_000);
  assert.equal(afterFirst.firstLienAmount, 400_000);
  assert.equal(afterFirst.cashOut, undefined);
  assert.equal(workspacePrompt(afterFirst), "amount");
  assert.equal(nextFoxAsk(afterFirst).text, HELOC_LINE_ASK);
  assert.deepEqual(labels(nextFoxAsk(afterFirst).actions), ["Skip"]);

  const skipLine = workspaceReply("Skip", afterFirst);
  assert.equal(skipLine?.capture?.field, "skip-heloc-line");
  const skipped = skipHelocLine(afterFirst);
  assert.equal(skipped.helocLineAsked, true);
  assert.equal(skipped.loanAmountValue, undefined);
  assert.equal(helocShapeReady(skipped), true);
  assert.equal(fact(skipped, "purpose")?.value, HELOC_PURPOSE);
  assert.equal(fact(skipped, "product")?.value, "HELOC");
  assert.notEqual(fact(skipped, "purpose")?.value, "Cash-out");
  assert.equal(fact(skipped, "home")?.value, "$500,000");
  assert.equal(fact(skipped, "first-lien")?.value, "$400,000");
  const ratios = draftLtvCltv(skipped);
  assert.ok(ratios);
  assert.equal(ratios?.ltv, 0.8);
  assert.equal(ratios?.cltv, 0.8);

  const typedLine = writeHelocLine(afterFirst, 100_000);
  assert.equal(typedLine.loanAmountValue, 100_000);
  const typedRatios = draftLtvCltv(typedLine);
  assert.ok(typedRatios);
  assert.equal(typedRatios?.ltv, 0.8);
  assert.equal(typedRatios?.cltv, 1);
  assert.equal(fact(typedLine, "line")?.value, "$100,000");

  const inferred = workspaceReply("about 400000", afterValue);
  assert.notEqual(inferred?.capture?.field, "firstLien");
  assert.match(inferred?.text ?? "", /Use this/);
  assert.ok(labels(inferred?.actions).includes("Use this"));

  const vanilla = pricedReady(skipped);
  assert.equal(helocLiveEligible(vanilla), true);
  assert.equal(rateflowBlockedReason(vanilla), "heloc");
  assert.equal(rateflowClientBodyFromDraft(vanilla), null);
  assert.equal(searchedKeyFor(vanilla), undefined);

  const cashOutRelabel = {
    ...vanilla,
    productIntent: "refinance" as const,
    cashOut: true,
    loanAmountValue: 400_000,
    firstLienAmount: undefined,
  };
  const cashOutBody = rateflowClientBodyFromDraft(cashOutRelabel);
  assert.notEqual(cashOutBody?.heloc, true);
  assert.ok((cashOutBody?.cash_out ?? 0) > 0);

  const twoToFour = { ...vanilla, propertyType: "two_to_four" as const, propertyUnits: "2" };
  assert.equal(helocLiveEligible(twoToFour), false);
  assert.equal(helocNoPreviewReady(twoToFour), true);
  assert.equal(rateflowClientBodyFromDraft(twoToFour), null);
  assert.equal(nextFoxAsk(twoToFour).text, HELOC_NO_PREVIEW_LINE);
  assert.ok(labels(nextFoxAsk(twoToFour).actions).includes("Request human"));
  assert.ok(!labels(nextFoxAsk(twoToFour).actions).includes("This one"));

  const investment = pricedReady({
    ...skipped,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "investment" },
  });
  assert.equal(helocLiveEligible(investment), false);
  assert.equal(helocNoPreviewReady(investment), true);
  assert.equal(rateflowClientBodyFromDraft(investment), null);

  const beforeZip = {
    ...skipped,
    propertyType: "sfr" as const,
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+" as const,
  };
  const zipReply = workspaceReply("94123", beforeZip);
  assert.equal(zipReply?.capture?.field, "propertyZip");
  assert.match(zipReply?.text ?? "", /This HELOC right now:/);
  assert.doesNotMatch(zipReply?.text ?? "", /This loan right now:/);
  assert.doesNotMatch(zipReply?.text ?? "", /P&I/);
  assert.match(zipReply?.text ?? "", /Estimated interest-only/);
  assert.ok((zipReply?.text ?? "").trim(), "ZIP write cannot leave an empty composer");
  const zipOnly = writePropertyZip(beforeZip, "94123");
  assert.equal(zipOnly.subjectAddress, undefined);
  assert.equal(fact(zipOnly, "purpose")?.value, HELOC_PURPOSE);
  const zipAsk = nextFoxAsk(zipOnly);
  assert.match(zipAsk.text, /This HELOC right now:/);
  assert.doesNotMatch(zipAsk.text, /This loan right now:|P&I/);
  assert.deepEqual(labels(zipAsk.actions), ["This one"]);

  const founder = pricedReady(writeHelocLine(afterFirst, 100_000));
  const tool = calculateHelocQuote({
    homeValue: 500_000,
    currentMortgage: 400_000,
    desiredLine: 100_000,
    fico: 760,
    occupancy: "Primary",
  });
  assert.equal(helocQuoteFromDraft(founder)?.finalRate, tool.finalRate);
  assert.equal(helocQuoteFromDraft(founder)?.monthlyPayment, tool.monthlyPayment);
  const founderAsk = nextFoxAsk(founder);
  assert.match(founderAsk.text, /This HELOC right now:/);
  assert.match(founderAsk.text, new RegExp(`${tool.finalRate.toFixed(2)}%`));
  assert.match(founderAsk.text, /Estimated interest-only/);
  assert.doesNotMatch(founderAsk.text, /This loan right now:/);
  assert.doesNotMatch(founderAsk.text, /P&I/);
  assert.doesNotMatch(founderAsk.text, /6\.250%|3\.75 pts/);
  assert.deepEqual(labels(founderAsk.actions), ["This one"]);
  const priced = withHelocToolQuote(founder);
  assert.equal(priced.liveQuote?.kind, "heloc");
  assert.equal(priced.liveQuote?.principalAndInterest, undefined);
  assert.match(liveHelocNowCopy(priced.liveQuote!), /This HELOC right now:/);
  assert.equal(liveQuoteReady(founder), true);
  assert.ok(labels(liveCouponActions(priced)).includes("This one"));
  assert.ok(!labels(liveCouponActions(priced)).includes("Lower payment"));

  const noRoom = pricedReady(skipHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 500_000)));
  assert.equal(helocQuoteFromDraft(noRoom), null);
  const emptyAsk = nextFoxAsk(noRoom);
  assert.equal(emptyAsk.text, HELOC_NO_PROGRAM_LINE);
  assert.deepEqual(labels(emptyAsk.actions), [
    "Change value",
    "Change first lien",
    "Change line",
    "Skip",
  ]);
  assert.ok(!labels(emptyAsk.actions).includes("This one"));
  assert.ok(!labels(emptyAsk.actions).includes("Change loan"));
  assert.deepEqual(
    labels(
      deskStripActions(
        [{ id: "pricing-ready:0", role: "fox", text: HELOC_NO_PROGRAM_LINE }],
        withHelocToolQuote(noRoom),
      ),
    ),
    ["Change value", "Change first lien", "Change line", "Skip"],
  );
  assert.equal(liveQuoteReady(noRoom), false);
  const thisOne = workspaceReply("This one", noRoom);
  assert.notEqual(thisOne?.capture?.field, "couponChoice");

  const outOfState = workspaceReply("10001", beforeZip);
  assert.match(outOfState?.text ?? nextFoxAsk({ ...beforeZip, outOfState: true, propertyZip: "10001" }).text, /California only/i);

  console.log("assert-heloc-fox-path: Product HELOC; not Cash-out; calculator HELOC speech or named reason");
}

main();
