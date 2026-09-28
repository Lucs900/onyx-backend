/**
 * After Ying Lee Use this, the next paper ask names whose.
 * Skip papers → Looks right chips. Ray W-2 writes Ray only.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { canLooksRight, isLooksRightAskText, resolveProposal } from "../components/fox/completeness";
import { skipCurrentInvite, stillUsefulSpokenItems } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { withLinkedAccount } from "../components/fox/account";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import {
  WAGE_DOCS_ASK,
  acceptWageExtract,
  maybeProposeWageExtract,
  skipWageBox5,
  skipWageDocs,
  skipWageFrequency,
  skipWageStub,
} from "../components/fox/qualifyingIncome";
import { skipSubjectAddress } from "../components/fox/propertyType";
import {
  WHO_ON_LOAN_ASK,
  WHO_ON_LOAN_YES_ASK,
  borrowersFileValue,
  jointWageDocsAskCopy,
  paperBorrowerParty,
  proposeWhoOnLoanName,
  whoOnLoanNameConfirmCopy,
  writeWhoOnLoan,
} from "../components/fox/whoOnLoan";
import { fileHasMultipleBorrowers } from "../components/fox/coborrowerName";
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

function heloc50040050(): FoxIntakeDraft {
  return houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
  );
}

function afterThisOneW2(file: FoxIntakeDraft, namedRay = false): FoxIntakeDraft {
  let draft = applyCouponChoice(withHelocToolQuote(file), "this");
  draft = {
    ...draft,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    whoOnLoanDue: true,
    awaitingMonthlyDebts: true,
  };
  if (namedRay) draft = { ...draft, borrowerName: "Ray Chen" };
  return draft;
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

  const gate = afterThisOneW2(file);
  assert.equal(workspacePrompt(gate), "who-on-loan");
  assert.equal(nextFoxAsk(gate).text, WHO_ON_LOAN_ASK);
  assert.doesNotMatch(JSON.stringify(gate), /Ying/);

  const afterYes = writeWhoOnLoan(gate, "yes");
  assert.equal(nextFoxAsk(afterYes).text, WHO_ON_LOAN_YES_ASK);
  const typed = workspaceReply("Ying Lee", afterYes);
  assert.equal(typed?.text, whoOnLoanNameConfirmCopy("Ying Lee"));

  const used = resolveProposal(proposeWhoOnLoanName(afterYes, "Ying Lee"), "accept");
  assert.equal(used.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(used), "2");
  assert.equal(fileHasMultipleBorrowers(used), true);
  assert.equal(used.workingOnCoborrower, false);
  assert.equal(used.productIntent, "heloc");

  const whose = nextFoxAsk(used);
  assert.equal(workspacePrompt(used), "wage-docs");
  assert.equal(whose.text, jointWageDocsAskCopy(used));
  assert.match(whose.text, /Last year’s W-2 — Ying’s\. Drop either\. Skip is fine\./);
  assert.notEqual(whose.text, WAGE_DOCS_ASK);
  assert.doesNotMatch(whose.text, /anyone else on this loan|what does Ying make|Borrower 2’s latest/i);
  assert.deepEqual(labels(whose.actions), ["Upload", "Skip"]);

  const withRay = resolveProposal(
    proposeWhoOnLoanName(writeWhoOnLoan(afterThisOneW2(file, true), "yes"), "Ying Lee"),
    "accept",
  );
  const rayAsk = nextFoxAsk(withRay);
  assert.equal(rayAsk.text, "Last year’s W-2 — Ray’s or Ying’s. Drop either. Skip is fine.");
  assert.notEqual(rayAsk.text, WAGE_DOCS_ASK);
  assert.doesNotMatch(rayAsk.text, /anyone else on this loan|what does Ying make/i);

  assert.equal(paperBorrowerParty(withRay, "Ray Chen"), "borrower");
  assert.equal(paperBorrowerParty(withRay, "Ying Lee"), "coborrower");

  const rayPaper = maybeProposeWageExtract(
    withRay,
    {
      employee_name: "Ray Chen",
      employer_name: "Harbor Pacific",
      medicare_wages: "96000",
    },
    "w2",
  );
  assert.equal(rayPaper.pendingProposal?.field, "wage_extract");
  const rayUsed = acceptWageExtract(rayPaper);
  assert.equal(rayUsed.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(rayUsed), "2");
  assert.equal(fact(rayUsed, "coborrower-name")?.value, "Ying Lee");
  assert.doesNotMatch(fact(rayUsed, "coborrower-name")?.value ?? "", /Box 5|96/);
  assert.ok((rayUsed.employmentHistory ?? []).some((row) => /Harbor Pacific/i.test(row.label ?? "")));
  assert.equal(rayUsed.facts?.w2_box5?.value, "96000");
  assert.doesNotMatch(JSON.stringify(rayUsed.employmentHistory ?? []), /Ying|Lee/);

  const yingPaper = maybeProposeWageExtract(
    withRay,
    {
      employee_name: "Ying Lee",
      employer_name: "East Bay Clinic",
      medicare_wages: "48000",
    },
    "w2",
  );
  assert.notEqual(yingPaper.pendingProposal?.field, "wage_extract");
  const yingForced = acceptWageExtract({
    ...withRay,
    pendingProposal: {
      field: "wage_extract",
      value: "48000",
      label: "wage extract",
      kind: "computed",
      extras: [
        { field: "w2_box5", value: "48000", label: "Box 5" },
        { field: "employer_name", value: "East Bay Clinic", label: "employer" },
        { field: "employee_name", value: "Ying Lee", label: "Name" },
      ],
    },
  });
  assert.equal(yingForced.coborrowerName, "Ying Lee");
  assert.equal(yingForced.facts?.w2_box5?.value, undefined);
  assert.ok(!(yingForced.employmentHistory ?? []).some((row) => /East Bay/i.test(row.label ?? "")));
  assert.doesNotMatch(nextFoxAsk(yingForced).text, /what does Ying make/i);

  const ready = skipPapers(used);
  assert.equal(workspacePrompt(ready), "review");
  assert.ok(isLooksRightAskText(nextFoxAsk(ready).text));
  assert.deepEqual(labels(nextFoxAsk(ready).actions), ["Looks right", "Needs a correction"]);
  assert.equal(canLooksRight(ready), true);
  assert.doesNotMatch(nextFoxAsk(ready).text, /anyone else on this loan|what does Ying make/i);
  assert.ok(stillUsefulSpokenItems(ready).length <= 3);

  const looks = workspaceReply("Looks right", ready);
  assert.match(looks?.text ?? "", /I can send this to review/);
  assert.deepEqual(labels(looks?.actions).slice(0, 3), ["Proceed", "Not yet", "Upload more"]);
  const afterLooks = withLinkedAccount(applyLooksRightMotion(ready));
  assert.ok(stillUsefulSpokenItems(afterLooks).length <= 3);
  const proceed = workspaceReply("Proceed", afterLooks);
  assert.match(proceed?.text ?? "", /I pushed this/);
  assert.deepEqual(labels(proceed?.actions).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(proceed?.actions).at(-1), "Request human");
  const queued = applyProceedMotion(afterLooks);
  assert.equal(queued.motion, "in_queue");
  assert.equal(queued.productIntent, "heloc");
  assert.equal(fact(queued, "line")?.value, "$50,000");
  assert.equal(queued.liveQuote?.interestOnly, tool.monthlyPayment);
  assert.equal(queued.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(queued), "2");

  console.log(
    `assert-ying-papers-after-borrowers-2: after Ying Lee Use this names whose W-2; Skip → finish chips; Ray W-2 writes Ray only; line $50,000 / $${tool.monthlyPayment}`,
  );
}

main();
