/**
 * Liabilities v1: one stated monthly-debts ask after years (SE) or income (W-2),
 * before Looks right. Skip leaves the line empty. $800 writes after Use this.
 * in_queue 800 is not the write. Years leftover stays accepted.
 */
import assert from "node:assert/strict";
import {
  skipCurrentInvite,
  nextDocInvite,
} from "../components/fox/fileWrite";
import {
  canLooksRight,
  YEARS_IN_BUSINESS_ASK,
  withIncomeTypeYearsAsk,
  writeYearsInBusiness,
} from "../components/fox/completeness";
import { skipFormerHistory } from "../components/fox/fileHistory";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import {
  MONTHLY_DEBTS_ASK,
  monthlyDebtsConfirmCopy,
  monthlyDebtsSkipActions,
  proposeStatedMonthlyDebts,
  skipMonthlyDebts,
  writeStatedMonthlyDebts,
} from "../components/fox/monthlyDebts";
import { emptyDraft } from "../components/fox/store";
import {
  messagesWithLiveQuoteSpeech,
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

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
    subjectAddress: "2101 California Street, San Francisco, CA 94115",
    subjectAddressAsked: true,
    propertyZip: "94115",
    propertyZipAsked: true,
    liveCouponSettled: true,
  };
}

function quote(draft: FoxIntakeDraft, key: string, rate: number): FoxIntakeDraft {
  return {
    ...draft,
    liveQuote: { key, rate, asOf: "2026-01-02", principalAndInterest: 4000 },
    liveQuoteKey: key,
    liveQuoteStatus: "ready",
  };
}

function liabilitiesLine(draft: FoxIntakeDraft) {
  return previewFacts(draft).find((item) => item.id === "file-liabilities");
}

function statedDebtsLine(draft: FoxIntakeDraft) {
  return previewFacts(draft).find((item) => item.id === "debts");
}

assert.equal(
  MONTHLY_DEBTS_ASK,
  "About how much are other monthly debts, not counting this mortgage?",
);
assert.deepEqual(
  monthlyDebtsSkipActions().map((item) => item.label),
  ["Skip"],
);
assert.ok(!monthlyDebtsSkipActions().some((item) => item.label === "Not yet"));

const ready = sketch();
assert.equal(workspacePrompt(ready), "income");

const seReply = workspaceReply("Self-employed", ready);
assert.equal(seReply?.capture?.field, "incomeType");
assert.equal(seReply?.text, YEARS_IN_BUSINESS_ASK);

const afterSE = withIncomeTypeYearsAsk({
  ...ready,
  incomeType: { ...ready.incomeType, value: "self-employed" },
  incomeAsked: true,
});
assert.equal(afterSE.awaitingYearsInBusiness, true);
assert.equal(afterSE.awaitingMonthlyDebts, true);
assert.equal(workspacePrompt(afterSE), "years-in-business");

const yearsReply = workspaceReply("2", afterSE);
assert.equal(yearsReply?.capture?.field, "yearsInBusiness");
assert.equal(yearsReply?.capture?.value, "2");
assert.equal(yearsReply?.text, MONTHLY_DEBTS_ASK);
assert.deepEqual((yearsReply?.actions ?? []).map((item) => item.label), ["Skip"]);
assert.ok(!(yearsReply?.actions ?? []).some((item) => item.label === "Not yet"));

const afterYears = writeYearsInBusiness(afterSE, "2");
assert.equal(workspacePrompt(afterYears), "debts");
assert.equal(nextFoxAsk(afterYears).text, MONTHLY_DEBTS_ASK);
assert.deepEqual((nextFoxAsk(afterYears).actions ?? []).map((item) => item.label), ["Skip"]);

const skipped = skipMonthlyDebts(afterYears);
assert.equal(skipped.monthlyDebtsAsked, true);
assert.equal(skipped.statedMonthlyDebts, undefined);
assert.equal(skipped.awaitingMonthlyDebts, false);
assert.notEqual(workspacePrompt(skipped), "debts");
assert.doesNotMatch(nextFoxAsk(skipped).text, /other monthly debts, not counting this mortgage/);
const skippedLine = statedDebtsLine(skipped);
assert.ok(skippedLine);
assert.equal(skippedLine?.label, "Stated monthly debts");
assert.equal(skippedLine?.value, "");
assert.equal(skippedLine?.note, undefined);
const skippedLiabilities = liabilitiesLine(skipped);
assert.equal(skippedLiabilities?.value, "Credit report later");
assert.match(skippedLiabilities?.note ?? "", /Placeholder/);
assert.ok(!previewFacts(skipped).some((item) => item.id === "stated-dti"));

const skipReply = workspaceReply("Skip", afterYears);
assert.equal(skipReply?.capture?.field, "skip-monthly-debts");
assert.notEqual(skipReply?.text, MONTHLY_DEBTS_ASK);

const eight = workspaceReply("800", afterYears);
assert.equal(eight?.capture?.field, "propose-monthly-debts");
assert.equal(eight?.capture?.value, "800");
assert.equal(eight?.text, monthlyDebtsConfirmCopy(800));
assert.ok((eight?.actions ?? []).some((item) => item.label === "Use this"));
assert.ok(!(eight?.actions ?? []).some((item) => item.label === "Not yet"));
assert.doesNotMatch(eight?.text ?? "", /DTI|credit pull|Proceed|close date/i);

const pending = proposeStatedMonthlyDebts(afterYears, 800);
assert.equal(workspacePrompt(pending), "confirm-proposal");
const useThis = workspaceReply("Use this", pending);
assert.equal(useThis?.capture?.field, "accept-proposal");
assert.notEqual(useThis?.text, MONTHLY_DEBTS_ASK);

const written = writeStatedMonthlyDebts(afterYears, 800);
assert.equal(written.statedMonthlyDebts, 800);
assert.equal(written.awaitingMonthlyDebts, false);
assert.notEqual(workspacePrompt(written), "debts");
const writtenLine = statedDebtsLine(written);
assert.equal(writtenLine?.label, "Stated monthly debts");
assert.equal(writtenLine?.value, "$800");
assert.equal(writtenLine?.note, "Suggested · not underwritten");
assert.equal(liabilitiesLine(written)?.value, "Credit report later");
assert.ok(!previewFacts(written).some((item) => item.id === "stated-dti"));

const afterW2 = withIncomeTypeYearsAsk({
  ...ready,
  incomeType: { ...ready.incomeType, value: "w2" },
  incomeAsked: true,
});
assert.equal(afterW2.awaitingYearsInBusiness, false);
assert.equal(afterW2.awaitingMonthlyDebts, true);
assert.equal(workspacePrompt(afterW2), "debts");
assert.equal(nextFoxAsk(afterW2).text, MONTHLY_DEBTS_ASK);
const w2Income = workspaceReply("W-2", ready);
assert.equal(w2Income?.capture?.field, "incomeType");
assert.equal(w2Income?.text, MONTHLY_DEBTS_ASK);

const openDebtsQuoted = quote(afterYears, "q-debts", 6.875);
const debtsAsk: FoxMessage = {
  id: "debts-open",
  role: "fox",
  text: MONTHLY_DEBTS_ASK,
  actions: monthlyDebtsSkipActions(),
};
const restored = messagesWithLiveQuoteSpeech(
  [debtsAsk],
  openDebtsQuoted,
  openDebtsQuoted.liveQuote!,
);
assert.ok(restored.some((item) => item.id.startsWith("live-quote:")));
assert.equal(restored.filter((item) => item.text === MONTHLY_DEBTS_ASK).length, 1);
assert.equal(restored[restored.length - 1]?.text, MONTHLY_DEBTS_ASK);
assert.deepEqual(
  (restored[restored.length - 1]?.actions ?? []).map((item) => item.label),
  ["Skip"],
);

const writtenQuoted = quote(written, "q-written-debts", 6.625);
const afterWriteRate = messagesWithLiveQuoteSpeech(
  [debtsAsk],
  writtenQuoted,
  writtenQuoted.liveQuote!,
);
assert.ok(afterWriteRate.some((item) => item.id.startsWith("live-quote:")));
assert.equal(afterWriteRate.filter((item) => item.text === MONTHLY_DEBTS_ASK).length, 0);
assert.notEqual(workspacePrompt(writtenQuoted), "debts");
assert.notEqual(workspacePrompt(writtenQuoted), "years-in-business");

const yearsAsk: FoxMessage = {
  id: "years-open",
  role: "fox",
  text: YEARS_IN_BUSINESS_ASK,
  actions: [{ id: "skip-years-in-business", label: "Skip", event: "bubble", capture: { field: "skip-years-in-business" } }],
};
const reprice = quote(
  { ...afterYears, downPaymentAmount: 200_000, loanAmountValue: 650_000 },
  "q-reprice",
  6.5,
);
const afterReprice = messagesWithLiveQuoteSpeech(
  [yearsAsk, { id: "you-2", role: "you", text: "2" }, debtsAsk],
  reprice,
  reprice.liveQuote!,
);
assert.ok(afterReprice.some((item) => item.id.startsWith("live-quote:")));
assert.equal(afterReprice.filter((item) => /How long have you had/.test(item.text)).length, 1);
assert.doesNotMatch(afterReprice[afterReprice.length - 1]?.text ?? "", /How long have you had/);
assert.notEqual(workspacePrompt(reprice), "years-in-business");
assert.equal(workspacePrompt(reprice), "debts");

function looksReadyW2(): FoxIntakeDraft {
  return skipFormerHistory({
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
  });
}

const dueBeforeLooks = {
  ...looksReadyW2(),
  awaitingMonthlyDebts: true,
};
assert.equal(canLooksRight(looksReadyW2()), true);
assert.equal(canLooksRight(dueBeforeLooks), false);
assert.equal(workspacePrompt(dueBeforeLooks), "debts");
assert.notEqual(workspacePrompt(dueBeforeLooks), "review");
assert.equal(nextFoxAsk(dueBeforeLooks).text, MONTHLY_DEBTS_ASK);
assert.equal(applyLooksRightMotion(dueBeforeLooks).sampleAccepted, undefined);
const skippedThenLooks = skipMonthlyDebts(dueBeforeLooks);
assert.ok(canLooksRight(skippedThenLooks));
assert.notEqual(workspacePrompt(skippedThenLooks), "debts");
const afterLooks = applyLooksRightMotion(skippedThenLooks);
assert.equal(afterLooks.sampleAccepted, true);
assert.notEqual(workspacePrompt(afterLooks), "debts");
assert.doesNotMatch(nextFoxAsk(afterLooks).text, /other monthly debts/);
const proceeded = applyProceedMotion(afterLooks);
assert.equal(proceeded.motion, "in_queue");
const lateEight = workspaceReply("800", proceeded);
assert.notEqual(lateEight?.capture?.field, "propose-monthly-debts");
assert.notEqual(lateEight?.capture?.field, "statedMonthlyDebts");
assert.doesNotMatch(lateEight?.text ?? "", /other monthly debts, not counting this mortgage/);
const lateOnDebtsPrompt = workspaceReply("800", {
  ...proceeded,
  correcting: null,
  awaitingMonthlyDebts: true,
  monthlyDebtsAsked: false,
});
assert.notEqual(lateOnDebtsPrompt?.capture?.field, "propose-monthly-debts");
assert.notEqual(lateOnDebtsPrompt?.capture?.field, "statedMonthlyDebts");

const crawl6: FoxIntakeDraft = {
  ...sketch(),
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
};
assert.equal(crawl6.awaitingMonthlyDebts, false);
assert.equal(nextDocInvite(skipCurrentInvite(crawl6)), "tax_return");
assert.equal(workspacePrompt(skipCurrentInvite(crawl6)), "documents");
assert.notEqual(workspacePrompt(skipCurrentInvite(crawl6)), "debts");
assert.notEqual(workspacePrompt(skipCurrentInvite(crawl6)), "years-in-business");

console.log("monthly-debts PASS");
