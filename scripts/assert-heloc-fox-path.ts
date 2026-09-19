/**
 * HELOC is a first-class Fox path. Not cash-out with a different label.
 * After Primary: value → first lien → line or Skip.
 * Live print only when Rateflow returns a HELOC program.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { liveCouponActions, liveQuoteReady } from "../components/fox/liveCoupon";
import { writePropertyZip } from "../components/fox/propertyType";
import { RATEFLOW_WAIT_LINE } from "../components/fox/lookupWait";
import {
  HELOC_FIRST_LIEN_ASK,
  HELOC_LINE_ASK,
  HELOC_NO_PREVIEW_LINE,
  HELOC_NO_PROGRAM_LINE,
  HELOC_PURPOSE,
  HELOC_VALUE_ASK,
  helocLiveEligible,
  helocNoPreviewReady,
  helocQuoteLine,
  helocShapeReady,
} from "../components/fox/heloc";
import {
  rateflowBlockedReason,
  rateflowClientBodyFromDraft,
  searchedKeyFor,
} from "../lib/rateflow/fromDraft";
import {
  looksHelocProgram,
  pickHelocProgram,
  pickLeadRow,
} from "../lib/rateflow/quote";
import {
  amountAskText,
  deskStripActions,
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

function withShape(line?: number | "skip"): FoxIntakeDraft {
  let next = writePurchasePrice(afterPrimary(), 500_000);
  next = writeFirstLien(next, 400_000);
  if (line === "skip" || line == null) return skipHelocLine(next);
  return writeHelocLine(next, line);
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

  const typedLine = writeHelocLine(afterFirst, 50_000);
  assert.equal(typedLine.loanAmountValue, 50_000);
  const typedRatios = draftLtvCltv(typedLine);
  assert.ok(typedRatios);
  assert.equal(typedRatios?.ltv, 0.8);
  assert.equal(Math.round((typedRatios?.cltv ?? 0) * 1000) / 1000, 0.9);

  const inferred = workspaceReply("about 400000", afterValue);
  assert.notEqual(inferred?.capture?.field, "firstLien");
  assert.match(inferred?.text ?? "", /Use this/);
  assert.ok(labels(inferred?.actions).includes("Use this"));

  const vanilla = pricedReady(skipped);
  assert.equal(helocLiveEligible(vanilla), true);
  assert.equal(rateflowBlockedReason(vanilla), null);
  const body = rateflowClientBodyFromDraft(vanilla);
  assert.equal(body?.heloc, true);
  assert.equal(body?.loan_type, "heloc");
  assert.equal(body?.loan_purpose, "refinance");
  assert.equal(body?.cash_out, undefined);
  assert.equal(body?.first_lien, 400_000);
  assert.equal(body?.list_price, 500_000);
  assert.equal(body?.loan_amount, helocQuoteLine(vanilla));
  assert.ok((body?.loan_amount ?? 0) > 0);
  assert.notEqual(body?.loan_amount, 400_000);

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
  assert.notEqual(searchedKeyFor(vanilla), searchedKeyFor(cashOutRelabel));

  const conventionalOnly = [
    { rate: 7.25, pts: -1.479, loanTerm: 30, bbLoanType: "conventional", productName: "FNMA 30 Yr Fixed" },
  ];
  assert.equal(looksHelocProgram(conventionalOnly[0]), false);
  assert.equal(pickHelocProgram(conventionalOnly), null);
  assert.equal(pickLeadRow(conventionalOnly, "refinance", false, true), null);
  assert.notEqual(pickLeadRow(conventionalOnly, "refinance", true, false)?.rate, null);

  const helocRows = [
    ...conventionalOnly,
    { rate: 8.5, pts: 0, bbLoanType: "heloc", productName: "Spring EQ HELOC" },
  ];
  assert.equal(pickLeadRow(helocRows, "refinance", false, true)?.rate, 8.5);
  assert.equal(pickLeadRow(helocRows, "refinance", true, false)?.rate, 7.25);

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
  assert.equal(zipReply?.text, RATEFLOW_WAIT_LINE);
  assert.ok((zipReply?.text ?? "").trim(), "ZIP write cannot leave an empty composer");
  const zipOnly = writePropertyZip(beforeZip, "94123");
  assert.equal(zipOnly.subjectAddress, undefined);
  assert.equal(fact(zipOnly, "purpose")?.value, HELOC_PURPOSE);
  assert.equal(nextFoxAsk(zipOnly).text, RATEFLOW_WAIT_LINE);

  const zipMiss = {
    ...zipOnly,
    liveQuote: undefined,
    liveQuoteKey: searchedKeyFor(zipOnly),
    liveQuoteStatus: "unavailable" as const,
  };
  assert.equal(nextFoxAsk(zipMiss).text, HELOC_NO_PROGRAM_LINE);
  assert.deepEqual(labels(nextFoxAsk(zipMiss).actions), [
    "Change value",
    "Change first lien",
    "Change line",
    "Skip",
  ]);
  assert.ok(!labels(nextFoxAsk(zipMiss).actions).includes("This one"));
  assert.ok(!labels(nextFoxAsk(zipMiss).actions).includes("Change loan"));
  assert.deepEqual(
    labels(
      deskStripActions(
        [{ id: "pricing-ready:0", role: "fox", text: HELOC_NO_PROGRAM_LINE }],
        zipMiss,
      ),
    ),
    ["Change value", "Change first lien", "Change line", "Skip"],
  );
  assert.equal(liveQuoteReady(zipMiss), false);
  const thisOne = workspaceReply("This one", zipMiss);
  assert.notEqual(thisOne?.capture?.field, "couponChoice");

  const named = {
    ...zipMiss,
    liveQuoteVendorReason: "loan_type heloc is not supported",
  };
  assert.equal(nextFoxAsk(named).text, "loan_type heloc is not supported");
  assert.ok(!labels(nextFoxAsk(named).actions).includes("This one"));

  const live = {
    ...vanilla,
    liveQuoteStatus: "ready" as const,
    liveQuote: {
      key: searchedKeyFor(vanilla) ?? "heloc",
      rate: 8.5,
      asOf: "2026-09-19T20:00:00.000Z",
    },
  };
  assert.ok(labels(liveCouponActions(live)).includes("This one"));
  assert.ok(!labels(liveCouponActions(live)).includes("Lower payment"));

  const outOfState = workspaceReply("10001", beforeZip);
  assert.match(outOfState?.text ?? nextFoxAsk({ ...beforeZip, outOfState: true, propertyZip: "10001" }).text, /California only/i);

  console.log("assert-heloc-fox-path: Product HELOC; not Cash-out; HELOC program or named reason");
}

main();
