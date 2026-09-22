/**
 * Skip on the other-person name. Yes → Skip → Borrowers 1. No Ying. No Borrower 2.
 * A later paper must not invent B2. Use this still writes Borrower 2.
 * Just me + finish chips stay locked. HELOC 500/400/50 · $50,000 / $367.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { canLooksRight, isLooksRightAskText, resolveProposal } from "../components/fox/completeness";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { acceptWageExtract, skipWageDocs } from "../components/fox/qualifyingIncome";
import {
  WHO_ON_LOAN_ASK,
  WHO_ON_LOAN_YES_ASK,
  borrowersFileValue,
  maybeWriteCoborrowerFromPaper,
  proposeWhoOnLoanName,
  skipWhoOnLoanName,
  whoOnLoanAskCopy,
  whoOnLoanNameConfirmCopy,
  whoOnLoanNameWasSkipped,
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
  deskStripActions,
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import { calculateHelocQuote } from "../lib/calculateHelocQuote";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

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

function heloc50040050(): FoxIntakeDraft {
  return houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
  );
}

function afterThisOneW2(file: FoxIntakeDraft): FoxIntakeDraft {
  let draft = applyCouponChoice(withHelocToolQuote(file), "this");
  draft = {
    ...draft,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    whoOnLoanDue: true,
  };
  return draft;
}

function skipPapers(draft: FoxIntakeDraft): FoxIntakeDraft {
  let next = skipMonthlyDebts(draft);
  next = skipWageDocs(next);
  next = skipCurrentInvite(next);
  return next;
}

function assertBorrowersOneNoYing(draft: FoxIntakeDraft, when: string) {
  assert.equal(draft.coborrowerName, undefined, `${when} wrote coborrower`);
  assert.equal(borrowersFileValue(draft), "1", `${when} Borrowers`);
  assert.equal(fileHasMultipleBorrowers(draft), false, `${when} multi`);
  assert.equal(fact(draft, "borrowers")?.value, "1", `${when} notepad Borrowers`);
  assert.equal(fact(draft, "coborrower-name")?.value, undefined, `${when} Borrower 2`);
  assert.doesNotMatch(JSON.stringify(previewFacts(draft)), /Ying/);
  assert.doesNotMatch(JSON.stringify(draft), /Ying Lee/);
  assert.doesNotMatch(nextFoxAsk(draft).text, /Ying|Borrower 2/);
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
  assert.equal(tool.monthlyPayment, 367);

  const gate = afterThisOneW2(file);
  assert.equal(workspacePrompt(gate), "who-on-loan");
  assert.equal(nextFoxAsk(gate).text, WHO_ON_LOAN_ASK);
  assert.deepEqual(labels(nextFoxAsk(gate).actions), ["Yes", "Just me", "Skip"]);
  assert.doesNotMatch(JSON.stringify(gate), /Ying/);

  const yes = workspaceReply("Yes", gate);
  assert.equal(yes?.capture?.field, "whoOnLoan");
  assert.equal(yes?.text, WHO_ON_LOAN_YES_ASK);
  assert.deepEqual(labels(yes?.actions), ["Skip"]);
  assert.doesNotMatch(yes?.text ?? "", /Ying|Looks right|Proceed/i);

  const afterYes = writeWhoOnLoan(gate, "yes");
  assert.equal(whoOnLoanAskCopy(afterYes).text, WHO_ON_LOAN_YES_ASK);
  assert.deepEqual(
    (whoOnLoanAskCopy(afterYes).actions ?? []).map((item) => item.capture?.field),
    ["skip-who-on-loan-name"],
  );
  const nameThread: FoxMessage[] = [{ id: "name", role: "fox", text: WHO_ON_LOAN_YES_ASK }];
  assert.deepEqual(labels(deskStripActions(nameThread, afterYes)), ["Skip"]);
  assert.equal(deskStripActions(nameThread, afterYes)[0]?.capture?.field, "skip-who-on-loan-name");
  assertBorrowersOneNoYing(afterYes, "after Yes");

  const skipReply = workspaceReply("Skip", afterYes);
  assert.equal(skipReply?.capture?.field, "skip-who-on-loan-name");
  assert.doesNotMatch(skipReply?.text ?? "", /anyone else on this loan|Ying|Borrower 2/i);

  const skipped = skipWhoOnLoanName(afterYes);
  assert.equal(whoOnLoanNameWasSkipped(skipped), true);
  assert.equal(skipped.whoOnLoan, "yes");
  assert.equal(skipped.productIntent, "heloc");
  assertBorrowersOneNoYing(skipped, "Skip name");

  const paper = maybeWriteCoborrowerFromPaper(skipped, "Ying Lee");
  assert.equal(whoOnLoanNameWasSkipped(paper), true);
  assertBorrowersOneNoYing(paper, "paper after Skip name");

  const wageAfterSkip: FoxIntakeDraft = {
    ...skipped,
    pendingWageExtract: {
      employer: "Harbor Pacific",
      employee: "Ying Lee",
      box5: 96_000,
    },
    pendingProposal: {
      field: "wage_extract",
      value: "96000",
      label: "W-2",
      kind: "document",
      extras: [
        { field: "employer_name", value: "Harbor Pacific", label: "Employer" },
        { field: "employee_name", value: "Ying Lee", label: "Name" },
        { field: "w2_box5", value: "96000", label: "Box 5" },
      ],
    },
  };
  const acceptedPaper = acceptWageExtract(wageAfterSkip);
  assert.notEqual(acceptedPaper.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(acceptedPaper), "1");
  assert.equal(fileHasMultipleBorrowers(acceptedPaper), false);
  assert.equal(fact(acceptedPaper, "borrowers")?.value, "1");
  assert.equal(fact(acceptedPaper, "coborrower-name")?.value, undefined);

  const ready = skipPapers(skipped);
  assert.equal(workspacePrompt(ready), "review");
  assert.ok(isLooksRightAskText(nextFoxAsk(ready).text));
  assert.deepEqual(labels(nextFoxAsk(ready).actions), ["Looks right", "Needs a correction"]);
  assert.equal(canLooksRight(ready), true);
  assertBorrowersOneNoYing(ready, "Skip papers");

  const looks = workspaceReply("Looks right", ready);
  assert.match(looks?.text ?? "", /I can send this to review/);
  assert.deepEqual(labels(looks?.actions).slice(0, 3), ["Proceed", "Not yet", "Upload more"]);
  const afterLooks = applyLooksRightMotion(ready);
  const proceed = workspaceReply("Proceed", afterLooks);
  assert.match(proceed?.text ?? "", /ONYX has this for review/);
  assert.deepEqual(labels(proceed?.actions).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(proceed?.actions).at(-1), "Request human");
  const queued = applyProceedMotion(afterLooks);
  assert.equal(queued.motion, "in_queue");
  assert.equal(queued.nextActor, "ONYX");
  assert.equal(queued.productIntent, "heloc");
  assert.equal(fact(queued, "line")?.value, "$50,000");
  assert.equal(queued.liveQuote?.interestOnly, tool.monthlyPayment);
  assertBorrowersOneNoYing(queued, "finish");

  const typed = workspaceReply("Ying Lee", afterYes);
  assert.equal(typed?.capture?.field, "propose-coborrower-name");
  assert.equal(typed?.text, whoOnLoanNameConfirmCopy("Ying Lee"));
  assert.ok(labels(typed?.actions).includes("Use this"));
  const used = resolveProposal(proposeWhoOnLoanName(afterYes, "Ying Lee"), "accept");
  assert.equal(used.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(used), "2");
  assert.equal(fileHasMultipleBorrowers(used), true);
  assert.equal(fact(used, "borrowers")?.value, "2");
  assert.equal(fact(used, "coborrower-name")?.value, "Ying Lee");
  assert.equal(whoOnLoanNameWasSkipped(used), false);

  const justMe = writeWhoOnLoan(gate, "just-me");
  assert.equal(borrowersFileValue(justMe), "1");
  assert.equal(fileHasMultipleBorrowers(justMe), false);
  assert.doesNotMatch(JSON.stringify(justMe), /Ying/);

  console.log(
    `assert-skip-on-other-person-name: Yes → Skip name Borrowers 1, no Ying, no B2; paper cannot invent; Use this still B2; finish chips; line $50,000 / $${tool.monthlyPayment}`,
  );
}

main();
