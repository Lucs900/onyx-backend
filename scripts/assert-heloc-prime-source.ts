/**
 * HELOC index is WSJ / H.15 bank prime, not fed funds 3.75 / 4.00.
 * 500/400/50 (90% CLTV) prints prime + existing margin. 100% still no This one.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emptyDraft } from "../components/fox/store";
import { liveCouponActions } from "../components/fox/liveCoupon";
import {
  helocCltvCapCopy,
  helocFileCltvOverCap,
  helocQuoteFromDraft,
  writeFirstLien,
  writeHelocLine,
} from "../components/fox/heloc";
import { nextFoxAsk, writePurchasePrice } from "../components/fox/workspace";
import {
  HELOC_COMPENSATION_ADDON,
  WSJ_H15_PRIME,
  calculateHelocQuote,
} from "../lib/calculateHelocQuote";
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

function main() {
  const src = readFileSync(join(process.cwd(), "lib/calculateHelocQuote.ts"), "utf8");
  assert.match(src, /WSJ_H15_PRIME/);
  assert.doesNotMatch(src, /finalRate\s*=\s*3\.75\s*\+/);
  assert.doesNotMatch(src, /finalRate\s*=\s*4(?:\.0+)?\s*\+/);
  assert.doesNotMatch(src, /finalRate\s*=\s*6\.75\s*\+/);
  assert.equal(WSJ_H15_PRIME, 7);
  assert.notEqual(WSJ_H15_PRIME, 3.75);
  assert.notEqual(WSJ_H15_PRIME, 4);
  assert.equal(HELOC_COMPENSATION_ADDON, 0.8);

  const tool = calculateHelocQuote({
    homeValue: 500_000,
    currentMortgage: 400_000,
    desiredLine: 50_000,
    fico: 760,
    occupancy: "Primary",
  });
  assert.equal(tool.adjustedMargin, tool.publishedMargin + HELOC_COMPENSATION_ADDON);
  assert.equal(tool.finalRate, Math.round((WSJ_H15_PRIME + tool.adjustedMargin) * 100) / 100);
  assert.notEqual(tool.finalRate, 3.75 + tool.adjustedMargin);
  assert.notEqual(tool.finalRate, 4 + tool.adjustedMargin);
  const io = Math.round((50_000 * (tool.finalRate / 100)) / 12);
  assert.equal(tool.monthlyPayment, io);

  const under = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
  );
  assert.equal(helocFileCltvOverCap(under), false);
  assert.equal(helocQuoteFromDraft(under)?.finalRate, tool.finalRate);
  const underAsk = nextFoxAsk(under);
  assert.match(underAsk.text, /This HELOC right now:/);
  assert.match(underAsk.text, new RegExp(`${tool.finalRate.toFixed(2)}%`));
  assert.match(underAsk.text, /Estimated interest-only/);
  assert.match(underAsk.text, new RegExp(`\\$${io.toLocaleString("en-US")}`));
  assert.doesNotMatch(underAsk.text, /This loan right now:|P&I|approved|denied/i);
  assert.deepEqual(labels(underAsk.actions), ["This one"]);

  const over = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 100_000),
  );
  assert.equal(helocFileCltvOverCap(over), true);
  assert.equal(nextFoxAsk(over).text, helocCltvCapCopy(over));
  assert.ok(!labels(nextFoxAsk(over).actions).includes("This one"));
  assert.ok(!labels(liveCouponActions(over)).includes("This one"));

  console.log(
    `assert-heloc-prime-source: prime=${WSJ_H15_PRIME.toFixed(2)} published=${tool.publishedMargin.toFixed(3)} compensation=${HELOC_COMPENSATION_ADDON.toFixed(2)} adjusted=${tool.adjustedMargin.toFixed(3)} rate=${tool.finalRate.toFixed(2)} io=$${io} on $50,000`,
  );
}

main();
