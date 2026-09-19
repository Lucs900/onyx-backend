/**
 * Who is on this loan, once.
 * After first name or income type — not Looks right / Proceed, not after Looks right.
 * Just me does not re-ask. Yes then name/paper. No invented coborrower before Yes+name/Use this.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  OTHER_BORROWER_STILL_USEFUL,
  WHO_ON_LOAN_ASK,
  WHO_ON_LOAN_YES_ASK,
  borrowersFileValue,
  maybeWriteCoborrowerFromPaper,
  notePageOtherName,
  parseWhoOnLoan,
  whoOnLoanAskNeeded,
  writeWhoOnLoan,
  writeWhoOnLoanName,
} from "../components/fox/whoOnLoan";
import { stillUsefulLabels, stillUsefulSection } from "../components/fox/fileWrite";
import { acceptWageExtract } from "../components/fox/qualifyingIncome";
import { fileHasMultipleBorrowers } from "../components/fox/coborrowerName";
import {
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

function thinPurchase(): FoxIntakeDraft {
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
    propertyZip: "94123",
    propertyZipAsked: true,
    liveCouponSettled: true,
  };
}

function thinHeloc(): FoxIntakeDraft {
  return {
    ...thinPurchase(),
    productIntent: "heloc",
    firstLienAmount: 400_000,
    firstLienAsked: true,
    helocLineAsked: true,
    loanAmountValue: 50_000,
    downPaymentAmount: undefined,
  };
}

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function borrowersFact(draft: FoxIntakeDraft) {
  return previewFacts(draft).find((item) => item.id === "borrowers" || item.label === "Borrowers");
}

function main() {
  assert.equal(parseWhoOnLoan("Just me"), "just-me");
  assert.equal(parseWhoOnLoan("Yes", { allowBare: true }), "yes");
  assert.equal(parseWhoOnLoan("Skip"), "skip");
  assert.equal(WHO_ON_LOAN_ASK, "Is anyone else on this loan?");
  assert.equal(WHO_ON_LOAN_YES_ASK, "Name them or drop their paper.");

  const unnamed = thinPurchase();
  assert.equal(workspacePrompt(unnamed), "income");
  assert.equal(whoOnLoanAskNeeded(unnamed), false);

  const afterW2 = workspaceReply("W-2", unnamed);
  assert.equal(afterW2?.capture?.field, "incomeType");
  assert.equal(afterW2?.text, WHO_ON_LOAN_ASK);
  assert.deepEqual(labels(afterW2?.actions), ["Yes", "Just me", "Skip"]);
  assert.doesNotMatch(afterW2?.text ?? "", /Looks right|Proceed|spouse\?|SSN/i);

  const afterHelocW2 = workspaceReply("W-2", thinHeloc());
  assert.equal(afterHelocW2?.text, WHO_ON_LOAN_ASK);
  assert.deepEqual(labels(afterHelocW2?.actions), ["Yes", "Just me", "Skip"]);

  const namedFirst = writeWhoOnLoan(
    {
      ...thinPurchase(),
      borrowerName: "Ray Chen",
      whoOnLoanDue: true,
    },
    "just-me",
  );
  assert.equal(namedFirst.whoOnLoan, "just-me");

  const dueNamed = {
    ...thinPurchase(),
    borrowerName: "Ray Chen",
    whoOnLoanDue: true,
  };
  assert.equal(workspacePrompt(dueNamed), "who-on-loan");
  assert.equal(nextFoxAsk(dueNamed).text, WHO_ON_LOAN_ASK);

  const justMe = workspaceReply("Just me", {
    ...unnamed,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    whoOnLoanDue: true,
  });
  assert.equal(justMe?.capture?.field, "whoOnLoan");
  assert.equal(justMe?.capture && "value" in justMe.capture ? justMe.capture.value : "", "just-me");
  assert.notEqual(justMe?.text, WHO_ON_LOAN_ASK);
  assert.doesNotMatch(justMe?.text ?? "", /anyone else on this loan/i);

  const afterJustMe: FoxIntakeDraft = {
    ...unnamed,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    whoOnLoan: "just-me",
    whoOnLoanAsked: true,
    whoOnLoanDue: false,
    statedHousehold: "alone",
    householdAsked: true,
    awaitingMonthlyDebts: true,
  };
  assert.equal(workspacePrompt(afterJustMe), "debts");
  assert.equal(whoOnLoanAskNeeded(afterJustMe), false);
  const reask = workspaceReply("Just me", afterJustMe);
  assert.notEqual(reask?.capture?.field, "whoOnLoan");
  assert.equal(borrowersFileValue(afterJustMe), "1");
  assert.equal(borrowersFact(afterJustMe)?.value, "1");
  assert.equal(fileHasMultipleBorrowers(afterJustMe), false);
  assert.ok(!(stillUsefulSection(afterJustMe)?.items ?? []).some((item) => item.label === OTHER_BORROWER_STILL_USEFUL));

  const looksRightJustMe = { ...afterJustMe, sampleAccepted: true, monthlyDebtsAsked: true };
  assert.notEqual(workspacePrompt(looksRightJustMe), "who-on-loan");
  assert.notEqual(workspacePrompt(looksRightJustMe), "household");
  const looksCopy = nextFoxAsk(looksRightJustMe);
  assert.doesNotMatch(looksCopy.text, /anyone else on this loan/i);
  assert.ok(!labels(looksCopy.actions).includes("Just me"));

  const yesAsk = workspaceReply("Yes", {
    ...unnamed,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    whoOnLoanDue: true,
  });
  assert.equal(yesAsk?.capture?.field, "whoOnLoan");
  assert.equal(yesAsk?.text, WHO_ON_LOAN_YES_ASK);
  assert.doesNotMatch(yesAsk?.text ?? "", /1003|declarations|credit pull|Borrower 2’s government ID/i);
  assert.ok(!fileHasMultipleBorrowers({
    ...unnamed,
    whoOnLoan: "yes",
    whoOnLoanAsked: true,
  }));
  assert.equal(
    borrowersFileValue({
      ...unnamed,
      whoOnLoan: "yes",
      whoOnLoanAsked: true,
    }),
    "2 unnamed",
  );

  const named = writeWhoOnLoanName(
    {
      ...unnamed,
      whoOnLoan: "yes",
      whoOnLoanAsked: true,
    },
    "Ying Chen",
  );
  assert.equal(named.coborrowerName, "Ying Chen");
  assert.equal(named.workingOnCoborrower, true);
  assert.equal(borrowersFileValue(named), "Ying Chen");
  assert.ok(fileHasMultipleBorrowers(named));
  assert.doesNotMatch(named.coborrowerName ?? "", /SSN|123-45/);

  const beforePaper: FoxIntakeDraft = {
    ...unnamed,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    whoOnLoan: "yes",
    whoOnLoanAsked: true,
    borrowerName: "Ray Chen",
    employmentHistory: [{ label: "Harbor Pacific", to: "present" }],
    pendingWageExtract: {
      employer: "Alameda Health",
      employee: "Ying Chen",
      box5: 80000,
    },
    pendingProposal: {
      field: "wage_extract",
      value: "80000",
      label: "W-2",
      kind: "document",
      extras: [
        { field: "employer_name", value: "Alameda Health", label: "Employer" },
        { field: "employee_name", value: "Ying Chen", label: "Name" },
        { field: "w2_box5", value: "80000", label: "Box 5" },
      ],
    },
  };
  assert.equal(fileHasMultipleBorrowers(beforePaper), false);
  assert.equal((beforePaper.employmentHistory ?? []).length, 1);
  const afterPaper = acceptWageExtract(beforePaper);
  assert.equal(afterPaper.coborrowerName, "Ying Chen");
  assert.equal((afterPaper.employmentHistory ?? []).length, 2);
  assert.ok((afterPaper.employmentHistory ?? []).some((row) => /Alameda/i.test(row.label ?? "")));
  assert.ok(fileHasMultipleBorrowers(afterPaper));

  const justMeSecond = notePageOtherName(
    {
      ...afterJustMe,
      borrowerName: "Ray Chen",
    },
    "Ying Chen",
  );
  assert.equal(justMeSecond.whoOnLoan, "just-me");
  assert.equal(justMeSecond.coborrowerName, undefined);
  assert.equal(fileHasMultipleBorrowers(justMeSecond), false);
  assert.equal(workspacePrompt(justMeSecond), "debts");

  const neverAskedSecond: FoxIntakeDraft = {
    ...unnamed,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    borrowerName: "Ray Chen",
    monthlyDebtsAsked: true,
    wageDocsAsked: true,
    pageOtherName: "Ying Chen",
  };
  assert.equal(whoOnLoanAskNeeded(neverAskedSecond), true);
  assert.equal(workspacePrompt(neverAskedSecond), "who-on-loan");

  const skipNoName = writeWhoOnLoan(
    {
      ...unnamed,
      incomeAsked: true,
      incomeType: { ...emptyDraft().incomeType, value: "w2" },
    },
    "skip",
  );
  assert.ok(!stillUsefulLabels(skipNoName).includes("Other borrower"));
  assert.ok(!(stillUsefulSection(skipNoName)?.items ?? []).some((item) => item.label === "Other borrower"));

  const skipWithName = notePageOtherName(
    {
      ...skipNoName,
      borrowerName: "Ray Chen",
    },
    "Ying Chen",
  );
  assert.ok(stillUsefulLabels(skipWithName).includes("Other borrower"));
  assert.ok((stillUsefulSection(skipWithName)?.items ?? []).some((item) => item.label === "Other borrower"));
  assert.equal(skipWithName.whoOnLoan, "skip");
  assert.equal(skipWithName.coborrowerName, undefined);

  const reviewDraft = {
    ...afterJustMe,
    monthlyDebtsAsked: true,
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    skippedClasses: ["government_id", "paystub", "w2", "bank_statement", "tax_return"] as FoxIntakeDraft["skippedClasses"],
  };
  assert.notEqual(workspacePrompt(reviewDraft), "who-on-loan");
  if (workspacePrompt(reviewDraft) === "review") {
    assert.doesNotMatch(nextFoxAsk(reviewDraft).text, /anyone else on this loan/i);
    assert.ok(!labels(nextFoxAsk(reviewDraft).actions).includes("Just me"));
  }

  const paperWithoutYes = maybeWriteCoborrowerFromPaper(
    {
      ...unnamed,
      borrowerName: "Ray Chen",
    },
    "Ying Chen",
  );
  assert.equal(paperWithoutYes.coborrowerName, undefined);
  assert.equal(fileHasMultipleBorrowers(paperWithoutYes), false);

  console.log(
    "assert-who-on-loan: chips once after name/income · Just me no re-ask · Yes then name/paper · no invent · not Looks right",
  );
}

main();
