/**
 * Years in business: ask once after Self-employed. Skip only. Typed 2 writes and dies.
 * A live rate line must not start years or reprint Skip · Not yet.
 */
import assert from "node:assert/strict";
import {
  skipCurrentInvite,
  nextDocInvite,
} from "../components/fox/fileWrite";
import {
  YEARS_IN_BUSINESS_ASK,
  yearsInBusinessSkipActions,
  yearsInBusinessValue,
  withIncomeTypeYearsAsk,
  writeYearsInBusiness,
} from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import {
  messagesWithLiveQuoteSpeech,
  nextFoxAsk,
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

function yearsAskMessage(id = "years-open"): FoxMessage {
  return {
    id,
    role: "fox",
    text: YEARS_IN_BUSINESS_ASK,
    actions: yearsInBusinessSkipActions(),
  };
}

assert.deepEqual(
  yearsInBusinessSkipActions().map((item) => item.label),
  ["Skip"],
);
assert.ok(!yearsInBusinessSkipActions().some((item) => item.label === "Not yet"));

const ready = sketch();
assert.equal(workspacePrompt(ready), "income");

const seReply = workspaceReply("Self-employed", ready);
assert.equal(seReply?.capture?.field, "incomeType");
assert.equal(seReply?.capture?.value, "self-employed");
assert.equal(seReply?.text, YEARS_IN_BUSINESS_ASK);
assert.deepEqual((seReply?.actions ?? []).map((item) => item.label), ["Skip"]);
assert.ok(!(seReply?.actions ?? []).some((item) => item.label === "Not yet"));

const afterSE = withIncomeTypeYearsAsk({
  ...ready,
  incomeType: { ...ready.incomeType, value: "self-employed" },
  incomeAsked: true,
});
assert.equal(afterSE.awaitingYearsInBusiness, true);
assert.equal(workspacePrompt(afterSE), "years-in-business");
assert.equal(nextFoxAsk(afterSE).text, YEARS_IN_BUSINESS_ASK);
assert.deepEqual((nextFoxAsk(afterSE).actions ?? []).map((item) => item.label), ["Skip"]);

const typed = workspaceReply("2", afterSE);
assert.equal(typed?.capture?.field, "yearsInBusiness");
assert.equal(typed?.capture?.value, "2");
assert.notEqual(typed?.text, YEARS_IN_BUSINESS_ASK);
assert.doesNotMatch(typed?.text ?? "", /How long have you had/);

const written = writeYearsInBusiness(afterSE, "2");
assert.equal(yearsInBusinessValue(written), "2");
assert.equal(written.awaitingYearsInBusiness, false);
assert.notEqual(workspacePrompt(written), "years-in-business");
assert.doesNotMatch(nextFoxAsk(written).text, /How long have you had/);

const alreadyOnStructure = withIncomeTypeYearsAsk({
  ...written,
  incomeType: { ...written.incomeType, value: "self-employed" },
  incomeAsked: true,
});
assert.equal(alreadyOnStructure.awaitingYearsInBusiness, false);
assert.notEqual(workspacePrompt(alreadyOnStructure), "years-in-business");
assert.doesNotMatch(nextFoxAsk(alreadyOnStructure).text, /How long have you had/);

const openYearsQuoted = quote(afterSE, "q-open", 6.875);
const restored = messagesWithLiveQuoteSpeech(
  [yearsAskMessage()],
  openYearsQuoted,
  openYearsQuoted.liveQuote!,
);
const restoredYears = restored.filter((item) => /How long have you had/.test(item.text));
assert.equal(restoredYears.length, 1);
assert.ok(restored.some((item) => item.id.startsWith("live-quote:")));
assert.equal(restored[restored.length - 1]?.text, YEARS_IN_BUSINESS_ASK);
assert.deepEqual(
  (restored[restored.length - 1]?.actions ?? []).map((item) => item.label),
  ["Skip"],
);
assert.ok(
  !(restored[restored.length - 1]?.actions ?? []).some((item) => item.label === "Not yet"),
);

const writtenQuoted = quote(written, "q-written", 6.875);
const afterWriteRate = messagesWithLiveQuoteSpeech(
  [yearsAskMessage()],
  writtenQuoted,
  writtenQuoted.liveQuote!,
);
assert.ok(afterWriteRate.some((item) => item.id.startsWith("live-quote:")));
assert.equal(
  afterWriteRate.filter((item) => /How long have you had/.test(item.text)).length,
  0,
);
assert.doesNotMatch(nextFoxAsk(writtenQuoted).text, /How long have you had/);
assert.notEqual(workspacePrompt(writtenQuoted), "years-in-business");

const reprice = quote(
  { ...written, downPaymentAmount: 200_000, loanAmountValue: 650_000 },
  "q-reprice",
  6.625,
);
const afterReprice = messagesWithLiveQuoteSpeech(
  [
    yearsAskMessage("years-old"),
    { id: "you-2", role: "you", text: "2" },
    {
      id: "docs-open",
      role: "fox",
      text: "A government ID — name on it?",
      actions: [{ id: "skip-id", label: "Skip", event: "bubble", capture: { field: "skip-doc" } }],
    },
  ],
  reprice,
  reprice.liveQuote!,
);
assert.ok(afterReprice.some((item) => item.id.startsWith("live-quote:")));
assert.equal(
  afterReprice.filter((item) => /How long have you had/.test(item.text)).length,
  1,
);
assert.doesNotMatch(afterReprice[afterReprice.length - 1]?.text ?? "", /How long have you had/);
assert.notEqual(workspacePrompt(reprice), "years-in-business");
assert.doesNotMatch(nextFoxAsk(reprice).text, /How long have you had/);

const crawl6: FoxIntakeDraft = {
  ...sketch(),
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
};
assert.equal(crawl6.awaitingYearsInBusiness, false);
assert.equal(nextDocInvite(crawl6), "government_id");
const afterIdSkip = skipCurrentInvite(crawl6);
assert.equal(nextDocInvite(afterIdSkip), "tax_return");
assert.equal(workspacePrompt(afterIdSkip), "documents");
assert.notEqual(workspacePrompt(afterIdSkip), "years-in-business");
assert.doesNotMatch(nextFoxAsk(afterIdSkip).text, /How long have you had/);

console.log("years-in-business PASS");
