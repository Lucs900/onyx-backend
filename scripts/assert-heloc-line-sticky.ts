/**
 * HELOC line sticky — written line is never re-asked. Skip / Looks right do not clear it.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { canLooksRight } from "../components/fox/completeness";
import {
  HELOC_LINE_ASK,
  hasHelocLineAmount,
  helocLineAskNeeded,
  skipHelocLine,
  withHelocToolQuote,
  writeFirstLien,
  writeHelocLine,
} from "../components/fox/heloc";
import { applyLooksRightMotion, finishLineActions } from "../components/fox/motion";
import {
  amountAskText,
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
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

function heloc500400100(): FoxIntakeDraft {
  return {
    ...writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 100_000),
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectCity: "San Francisco",
    subjectState: "CA",
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "other" },
    whoOnLoan: "just-me",
    whoOnLoanAsked: true,
    householdAsked: true,
    monthlyDebtsAsked: true,
    liveCouponSettled: true,
  };
}

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function fact(draft: FoxIntakeDraft, id: string) {
  return previewFacts(draft).find((item) => item.id === id || item.label === id);
}

function main() {
  const file = heloc500400100();
  assert.equal(file.loanAmountValue, 100_000);
  assert.equal(file.firstLienAmount, 400_000);
  assert.equal(file.propertyValueAmount, 500_000);
  assert.equal(hasHelocLineAmount(file), true);
  assert.equal(helocLineAskNeeded(file), false);
  assert.notEqual(workspacePrompt(file), "amount");
  assert.notEqual(amountAskText(file), HELOC_LINE_ASK);
  assert.doesNotMatch(amountAskText(file), /What line do you want available/i);

  const tool = calculateHelocQuote({
    homeValue: 500_000,
    currentMortgage: 400_000,
    desiredLine: 100_000,
    fico: 760,
    occupancy: "Primary",
  });
  const quoted = withHelocToolQuote(file);
  assert.equal(quoted.liveQuote?.kind, "heloc");
  assert.equal(quoted.liveQuote?.interestOnly, tool.monthlyPayment);
  const io = quoted.liveQuote?.interestOnly;
  assert.ok(io != null && io > 0);

  const skipOnWritten = workspaceReply("Skip", { ...quoted, liveCouponSettled: true });
  assert.notEqual(skipOnWritten?.capture?.field, "skip-heloc-line");
  assert.notEqual(skipOnWritten?.capture?.field, "skip-amount");
  const skipped = skipHelocLine(quoted);
  assert.equal(skipped.loanAmountValue, 100_000);
  assert.equal(skipped.firstLienAmount, 400_000);
  assert.equal(skipped.propertyValueAmount, 500_000);
  assert.equal(fact(skipped, "line")?.value, "$100,000");
  const afterSkipQuote = withHelocToolQuote(skipped);
  assert.equal(afterSkipQuote.liveQuote?.interestOnly, io);
  assert.doesNotMatch(skipOnWritten?.text ?? "", /What line do you want available/i);

  assert.equal(canLooksRight(quoted), true, "500/400/100 other-income HELOC should be Looks right");
  const looks = workspaceReply("Looks right", quoted);
  assert.doesNotMatch(looks?.text ?? "", /What line do you want available/i);
  assert.notEqual(looks?.text, HELOC_LINE_ASK);
  assert.ok((looks?.text ?? "").trim(), "Looks right cannot leave an empty composer");
  const afterLooks = applyLooksRightMotion(quoted);
  assert.equal(afterLooks.sampleAccepted, true);
  assert.equal(afterLooks.loanAmountValue, 100_000);
  assert.equal(helocLineAskNeeded(afterLooks), false);
  assert.notEqual(workspacePrompt(afterLooks), "amount");
  assert.doesNotMatch(nextFoxAsk(afterLooks).text, /What line do you want available/i);
  const finish = labels(finishLineActions(afterLooks));
  assert.ok(finish.includes("Proceed"));
  assert.ok(finish.includes("Not yet"));
  assert.ok(finish.includes("Upload more"));
  const doneAsk = nextFoxAsk(afterLooks);
  const doneChips = labels(doneAsk.actions);
  assert.ok(doneChips.includes("Proceed"), `after Looks right chips ${doneChips.join(" · ")}`);
  assert.ok(!doneChips.includes("Just me"));
  assert.doesNotMatch(doneAsk.text, /What line do you want available/i);

  const skipAfterLooks = workspaceReply("Skip", afterLooks);
  assert.doesNotMatch(skipAfterLooks?.text ?? "", /What line do you want available/i);
  const skipAfterLooksDraft = skipHelocLine(afterLooks);
  assert.equal(skipAfterLooksDraft.loanAmountValue, 100_000);
  assert.equal(withHelocToolQuote(skipAfterLooksDraft).liveQuote?.interestOnly, io);

  const typedLooks = workspaceReply("looks right", quoted);
  assert.doesNotMatch(typedLooks?.text ?? "", /What line do you want available/i);
  assert.ok((typedLooks?.text ?? "").trim(), "typed looks right cannot leave an empty composer");

  console.log(
    "assert-heloc-line-sticky: 500/400/100 Looks right does not reprint line; Skip is no-op on $100,000 / IO",
  );
}

main();
