/**
 * HELOC Primary + House: File CLTV over 90% is not a print.
 * 500/400/100 → named no-HELOC, no This one. Change line 50k → 90% quote + This one.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { draftLtvCltv } from "../components/fox/calculators";
import { liveCouponActions, liveQuoteReady } from "../components/fox/liveCoupon";
import {
  beginHelocCorrection,
  helocCltvCapCopy,
  helocFileCltvOverCap,
  helocOverCapActions,
  helocQuoteFromDraft,
  withHelocToolQuote,
  writeFirstLien,
  writeHelocLine,
} from "../components/fox/heloc";
import {
  nextFoxAsk,
  previewFacts,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import { calculateHelocQuote } from "../lib/calculateHelocQuote";
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

function houseReady(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
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
  const over = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 100_000),
  );
  assert.equal(over.productIntent, "heloc");
  assert.equal(helocFileCltvOverCap(over), true);
  assert.equal(draftLtvCltv(over)?.cltv, 1);
  assert.equal(nextFoxAsk(over).text, helocCltvCapCopy(over));
  assert.match(nextFoxAsk(over).text, /I don’t have a HELOC at 100% of the house/);
  assert.doesNotMatch(nextFoxAsk(over).text, /This HELOC right now:|This one|approved|denied|P&I/i);
  assert.deepEqual(labels(nextFoxAsk(over).actions), [
    "Change line",
    "Change value",
    "Change first lien",
    "Skip",
  ]);
  assert.ok(!labels(nextFoxAsk(over).actions).includes("This one"));
  assert.equal(liveQuoteReady(over), false);
  assert.equal(withHelocToolQuote(over).liveQuote, undefined);
  assert.ok(!labels(liveCouponActions(over)).includes("This one"));
  assert.equal(helocQuoteFromDraft(over), null);
  assert.equal(workspaceReply("This one", over)?.capture?.field, undefined);
  assert.equal(fact(over, "product")?.value, "HELOC");
  assert.notEqual(fact(over, "purpose")?.value, "Cash-out");

  const justOver = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_500),
  );
  assert.equal(helocFileCltvOverCap(justOver), true);
  assert.match(nextFoxAsk(justOver).text, /I don’t have a HELOC at 90\.1% of the house/);

  const change = workspaceReply("Change line", over);
  assert.equal(change?.capture?.field, "correct");
  assert.match(change?.text ?? "", /line/i);
  const typed = workspaceReply("50000", beginHelocCorrection(over, "amount"));
  assert.equal(typed?.capture?.field, "helocLine");
  const fifty = writeHelocLine(beginHelocCorrection(over, "amount"), 50_000);
  assert.equal(fifty.productIntent, "heloc");
  assert.equal(fifty.loanAmountValue, 50_000);
  assert.equal(helocFileCltvOverCap(fifty), false);
  assert.equal(draftLtvCltv(fifty)?.cltv, 0.9);
  assert.equal(fact(fifty, "line")?.value, "$50,000");
  const tool = calculateHelocQuote({
    homeValue: 500_000,
    currentMortgage: 400_000,
    desiredLine: 50_000,
    fico: 760,
    occupancy: "Primary",
  });
  assert.equal(helocQuoteFromDraft(fifty)?.monthlyPayment, tool.monthlyPayment);
  assert.match(nextFoxAsk(fifty).text, /This HELOC right now:/);
  assert.match(nextFoxAsk(fifty).text, /Estimated interest-only/);
  assert.deepEqual(labels(nextFoxAsk(fifty).actions), ["This one"]);

  const clean = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
  );
  assert.equal(helocFileCltvOverCap(clean), false);
  assert.match(nextFoxAsk(clean).text, /This HELOC right now:/);
  assert.deepEqual(labels(nextFoxAsk(clean).actions), ["This one"]);

  const skipped = workspaceReply("Skip", over);
  assert.equal(skipped?.capture?.field, "couponChoice");
  assert.doesNotMatch(skipped?.text ?? "", /cash-out|This loan right now/i);
  assert.equal(over.productIntent, "heloc");

  console.log(
    "assert-heloc-cltv-cap: 500/400/100 no This one; Change line 50k prints; 90% may print; Product HELOC",
  );
}

main();
