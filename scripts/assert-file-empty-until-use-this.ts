/**
 * Suggested facts stay in Fox speech until Use this.
 * Notepad does not gain Borrower 1 / 2, Employer, QI, or years before Use this.
 * Change / Skip leave those lines empty. Finish chips hold.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { applyExtractedFields, skipCurrentInvite, stillUsefulSpokenItems } from "../components/fox/fileWrite";
import { borrowerNameOnFile } from "../components/fox/borrowerName";
import { canLooksRight, isLooksRightAskText, resolveProposal } from "../components/fox/completeness";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { withLinkedAccount } from "../components/fox/account";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import {
  skipWageBox5,
  skipWageDocs,
  skipWageFrequency,
  skipWageStub,
  wageEmploymentFileLine,
  wageW2ConfirmCopy,
} from "../components/fox/qualifyingIncome";
import { skipSubjectAddress } from "../components/fox/propertyType";
import {
  borrowersFileValue,
  proposeWhoOnLoanName,
  skipWhoOnLoanName,
  whoOnLoanNameConfirmCopy,
  writeWhoOnLoan,
} from "../components/fox/whoOnLoan";
import {
  helocQuoteFromDraft,
  withHelocToolQuote,
  writeFirstLien,
  writeHelocLine,
} from "../components/fox/heloc";
import {
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

function houseReady(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
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

function pad(draft: FoxIntakeDraft) {
  return previewFacts(draft)
    .map((item) => `${item.label}=${item.value}`)
    .join(" | ");
}

function heloc50040050(): FoxIntakeDraft {
  return houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
  );
}

function afterThisOneW2(file: FoxIntakeDraft): FoxIntakeDraft {
  let draft = applyCouponChoice(withHelocToolQuote(file), "this");
  return {
    ...draft,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    whoOnLoanDue: true,
    awaitingMonthlyDebts: true,
  };
}

function skipPapers(draft: FoxIntakeDraft): FoxIntakeDraft {
  let next = draft;
  for (let i = 0; i < 8; i += 1) {
    const prompt = workspacePrompt(next);
    if (prompt === "review") return next;
    if (prompt === "debts") next = skipMonthlyDebts(next);
    else if (prompt === "wage-docs") next = skipWageDocs(next);
    else if (prompt === "w2-box5") next = skipWageBox5(next);
    else if (prompt === "w2-pay-frequency") next = skipWageFrequency(next);
    else if (prompt === "paystub-monthly") next = skipWageStub(next);
    else if (prompt === "property-address") next = skipSubjectAddress(next);
    else next = skipCurrentInvite(next);
  }
  return next;
}

function main() {
  const file = heloc50040050();
  const tool = calculateHelocQuote({
    homeValue: 500_000,
    currentMortgage: 400_000,
    desiredLine: 50_000,
    fico: 760,
    occupancy: "Primary",
  });
  assert.equal(file.productIntent, "heloc");
  assert.equal(helocQuoteFromDraft(file)?.finalRate, tool.finalRate);

  const afterYes = writeWhoOnLoan(afterThisOneW2(file), "yes");
  const typed = workspaceReply("Ying Lee", afterYes);
  assert.equal(typed?.text, whoOnLoanNameConfirmCopy("Ying Lee"));
  assert.ok(labels(typed?.actions).includes("Use this"));

  const proposed = proposeWhoOnLoanName(afterYes, "Ying Lee");
  assert.match(nextFoxAsk(proposed).text, /Ying Lee/);
  assert.equal(proposed.coborrowerName, undefined);
  assert.equal(borrowersFileValue(proposed), "1");
  assert.notEqual(fact(proposed, "borrowers")?.value, "2");
  assert.equal(fact(proposed, "coborrower-name"), undefined);
  assert.doesNotMatch(pad(proposed), /Ying Lee|Borrower 2|2 unnamed/);
  assert.equal(borrowerNameOnFile(proposed), "");

  const skippedName = skipWhoOnLoanName(proposed);
  assert.equal(skippedName.coborrowerName, undefined);
  assert.equal(borrowersFileValue(skippedName), "1");
  assert.doesNotMatch(pad(skippedName), /Ying Lee|Borrower 2/);

  const usedYing = resolveProposal(proposed, "accept");
  assert.equal(usedYing.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(usedYing), "2");
  assert.equal(fact(usedYing, "borrowers")?.value, "2");
  assert.equal(fact(usedYing, "coborrower-name")?.value, "Ying Lee");

  const extracted = applyExtractedFields(usedYing, {
    extractClass: "w2",
    confidence: 0.94,
    fields: {
      employee_name: "Raymond Lee",
      employer_name: "Harbor Pacific",
      medicare_wages: "120000",
    },
  });
  const card = nextFoxAsk(extracted.draft);
  assert.equal(card.text, wageW2ConfirmCopy(120000, "Harbor Pacific", "Raymond Lee"));
  assert.match(card.text, /Raymond Lee/);
  assert.match(card.text, /Harbor Pacific/);
  assert.match(card.text, /Box 5 \$120,000/);
  assert.equal(borrowerNameOnFile(extracted.draft), "");
  assert.equal(extracted.draft.coborrowerName, "Ying Lee");
  assert.doesNotMatch(pad(extracted.draft), /Raymond Lee|Borrower 1/);
  assert.doesNotMatch(pad(extracted.draft), /Employer|Harbor Pacific/);
  assert.doesNotMatch(pad(extracted.draft), /120,000|120000|\$120/);
  assert.doesNotMatch(pad(extracted.draft), /Qualifying income|Years in business/);
  assert.equal(wageEmploymentFileLine(extracted.draft), "");
  assert.equal(fact(extracted.draft, "borrower"), undefined);
  assert.equal(fact(extracted.draft, "employer"), undefined);
  assert.equal(fact(extracted.draft, "qualifying"), undefined);

  const skippedWage = skipWageDocs(extracted.draft);
  assert.equal(borrowerNameOnFile(skippedWage), "");
  assert.equal(wageEmploymentFileLine(skippedWage), "");
  assert.doesNotMatch(pad(skippedWage), /Raymond Lee|Harbor Pacific|120,000|120000/);
  assert.equal(skippedWage.coborrowerName, "Ying Lee");

  const changed = resolveProposal(extracted.draft, "decline");
  assert.equal(borrowerNameOnFile(changed), "");
  assert.doesNotMatch(pad(changed), /Raymond Lee/);
  assert.equal(changed.coborrowerName, "Ying Lee");

  const rayUsed = resolveProposal(extracted.draft, "accept");
  assert.equal(rayUsed.borrowerName, "Raymond Lee");
  assert.equal(borrowerNameOnFile(rayUsed), "Raymond Lee");
  assert.equal(fact(rayUsed, "borrower")?.value, "Raymond Lee");
  assert.equal(rayUsed.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(rayUsed), "2");
  assert.match(wageEmploymentFileLine(rayUsed), /Harbor Pacific/);
  assert.match(wageEmploymentFileLine(rayUsed), /Box 5 \$120,000/);
  assert.equal(rayUsed.facts?.w2_box5?.value, "120000");
  assert.doesNotMatch(fact(rayUsed, "coborrower-name")?.value ?? "", /Raymond|Harbor|120/);

  const ready = skipPapers(rayUsed);
  assert.equal(workspacePrompt(ready), "review");
  assert.ok(isLooksRightAskText(nextFoxAsk(ready).text));
  assert.deepEqual(labels(nextFoxAsk(ready).actions), ["Looks right", "Needs a correction"]);
  assert.equal(canLooksRight(ready), true);
  assert.ok(stillUsefulSpokenItems(ready).length <= 3);

  const looks = workspaceReply("Looks right", ready);
  assert.match(looks?.text ?? "", /I can send this to review/);
  assert.deepEqual(labels(looks?.actions).slice(0, 3), ["Proceed", "Not yet", "Upload more"]);
  const afterLooks = withLinkedAccount(applyLooksRightMotion(ready));
  const proceed = workspaceReply("Proceed", afterLooks);
  assert.match(proceed?.text ?? "", /I pushed this/);
  assert.deepEqual(labels(proceed?.actions).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(proceed?.actions).at(-1), "Request human");
  const queued = applyProceedMotion(afterLooks);
  assert.equal(queued.motion, "in_queue");
  assert.equal(queued.productIntent, "heloc");
  assert.equal(queued.borrowerName, "Raymond Lee");
  assert.equal(queued.coborrowerName, "Ying Lee");
  assert.equal(fact(queued, "line")?.value, "$50,000");
  assert.equal(queued.liveQuote?.interestOnly, tool.monthlyPayment);

  console.log(
    `assert-file-empty-until-use-this: notepad empty until Use this; Ying then Raymond Lee + Box 5 $120,000; finish chips; line $50,000 / $${tool.monthlyPayment}`,
  );
}

main();
