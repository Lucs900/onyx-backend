/**
 * Who-on-loan Yes path. Type Ying Lee → Use this writes Borrowers 2.
 * Skip name = Borrowers 1. Ray income stays on Ray. Finish chips still hold.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { canLooksRight, isLooksRightAskText, resolveProposal } from "../components/fox/completeness";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import {
  WHO_ON_LOAN_ASK,
  WHO_ON_LOAN_YES_ASK,
  borrowersFileValue,
  proposeWhoOnLoanName,
  skipWhoOnLoanName,
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
    borrowerName: "Ray Chen",
    employmentHistory: [{ label: "Harbor Pacific", to: "present", note: "Box 5 $96,000" }],
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
  assert.deepEqual(labels(nextFoxAsk(gate).actions), ["Yes", "Just me", "Skip"]);
  assert.doesNotMatch(JSON.stringify(gate), /Ying/);

  const yes = workspaceReply("Yes", gate);
  assert.equal(yes?.capture?.field, "whoOnLoan");
  assert.equal(yes?.text, WHO_ON_LOAN_YES_ASK);
  assert.deepEqual(labels(yes?.actions), ["Skip"]);
  assert.doesNotMatch(yes?.text ?? "", /Ying|Looks right|Proceed/i);

  const afterYes = writeWhoOnLoan(gate, "yes");
  assert.equal(borrowersFileValue(afterYes), "2 unnamed");
  assert.equal(fileHasMultipleBorrowers(afterYes), false);
  assert.equal(fact(afterYes, "borrowers")?.value, "2 unnamed");

  const typed = workspaceReply("Ying Lee", afterYes);
  assert.equal(typed?.capture?.field, "propose-coborrower-name");
  assert.equal(typed?.text, whoOnLoanNameConfirmCopy("Ying Lee"));
  assert.ok(labels(typed?.actions).includes("Use this"));
  assert.equal(afterYes.coborrowerName, undefined);
  assert.equal(fileHasMultipleBorrowers(afterYes), false);

  const proposed = proposeWhoOnLoanName(afterYes, "Ying Lee");
  const used = resolveProposal(proposed, "accept");
  assert.equal(used.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(used), "2");
  assert.equal(fileHasMultipleBorrowers(used), true);
  assert.equal(fact(used, "borrowers")?.value, "2");
  assert.equal(fact(used, "coborrower-name")?.value, "Ying Lee");
  assert.equal(used.borrowerName, "Ray Chen");
  assert.deepEqual(used.employmentHistory, gate.employmentHistory);
  assert.equal(used.workingOnCoborrower, false);
  assert.equal(used.productIntent, "heloc");
  assert.doesNotMatch(JSON.stringify(used.employmentHistory ?? []), /Ying|Lee/);
  assert.ok(!previewFacts(used).some((item) => /Box 5/i.test(item.value) && item.id === "coborrower-name"));

  const skippedName = skipWhoOnLoanName(afterYes);
  assert.equal(skippedName.coborrowerName, undefined);
  assert.equal(borrowersFileValue(skippedName), "1");
  assert.equal(fileHasMultipleBorrowers(skippedName), false);
  assert.doesNotMatch(JSON.stringify(skippedName), /Ying Lee/);
  assert.equal(skippedName.productIntent, "heloc");

  const ready = skipPapers(used);
  assert.equal(workspacePrompt(ready), "review");
  assert.ok(isLooksRightAskText(nextFoxAsk(ready).text));
  assert.deepEqual(labels(nextFoxAsk(ready).actions), ["Looks right", "Needs a correction"]);
  assert.equal(canLooksRight(ready), true);
  assert.doesNotMatch(nextFoxAsk(ready).text, /anyone else on this loan/i);

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
  assert.equal(queued.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(queued), "2");

  const justMe = writeWhoOnLoan(gate, "just-me");
  assert.equal(borrowersFileValue(justMe), "1");
  assert.equal(fileHasMultipleBorrowers(justMe), false);
  assert.doesNotMatch(JSON.stringify(justMe), /Ying/);

  console.log(
    `assert-who-on-loan-yes: Yes → Ying Lee Use this Borrowers 2; Skip name Borrowers 1; Ray income held; finish chips; line $50,000 / $${tool.monthlyPayment}`,
  );
}

main();
