/**
 * Borrower 1 empty + W-2 page name → CFBW → Use this writes B1 + employment.
 * Filename is not a name. Ying unchanged. Skip keeps B1 empty. Finish chips hold.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emptyDraft } from "../components/fox/store";
import {
  applyExtractedFields,
  skipCurrentInvite,
  stillUsefulSpokenItems,
  W2_LOCKED_SCHEMA_KEYS,
} from "../components/fox/fileWrite";
import { classifyAndExtract } from "../lib/docs/extract";
import {
  BORROWER_NAME_ASK,
  borrowerNameAskCopy,
  borrowerNameOnFile,
} from "../components/fox/borrowerName";
import { canLooksRight, isLooksRightAskText, proposalAskCopy, resolveProposal } from "../components/fox/completeness";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { withLinkedAccount } from "../components/fox/account";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import {
  acceptWageExtract,
  maybeProposeWageExtract,
  skipWageBox5,
  skipWageDocs,
  skipWageFrequency,
  skipWageStub,
  wageW2ConfirmCopy,
} from "../components/fox/qualifyingIncome";
import { skipSubjectAddress } from "../components/fox/propertyType";
import {
  borrowersFileValue,
  jointWageDocsAskCopy,
  pageNameForPrimaryBorrower,
  pageNamePendingForPrimary,
  paperBorrowerParty,
  printedPagePersonName,
  proposeWhoOnLoanName,
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

function afterYing(file: FoxIntakeDraft): FoxIntakeDraft {
  return resolveProposal(proposeWhoOnLoanName(writeWhoOnLoan(afterThisOneW2(file), "yes"), "Ying Lee"), "accept");
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
  assert.ok(W2_LOCKED_SCHEMA_KEYS.includes("employee_name"));
  assert.ok(W2_LOCKED_SCHEMA_KEYS.includes("full_name"));

  assert.equal(printedPagePersonName("2025 W2 Ray.pdf"), "");
  assert.equal(printedPagePersonName("2025 W2 Ray"), "");
  assert.equal(printedPagePersonName("Ray"), "");
  assert.equal(printedPagePersonName("Raymond Chen"), "Raymond Chen");
  assert.equal(printedPagePersonName("JORDAN HALE"), "Jordan Hale");

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

  const usedYing = afterYing(file);
  assert.equal(usedYing.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(usedYing), "2");
  assert.equal(fileHasMultipleBorrowers(usedYing), true);
  assert.equal(borrowerNameOnFile(usedYing), "");
  assert.equal(pageNameForPrimaryBorrower(usedYing, "2025 W2 Ray.pdf"), "");
  assert.equal(pageNameForPrimaryBorrower(usedYing, "Ray"), "");
  assert.equal(pageNameForPrimaryBorrower(usedYing, "Ying Lee"), "");
  assert.equal(pageNameForPrimaryBorrower(usedYing, "Raymond Chen"), "Raymond Chen");
  assert.equal(paperBorrowerParty(usedYing, "Ying Lee"), "coborrower");

  const filenameOnly = maybeProposeWageExtract(
    usedYing,
    {
      employer_name: "Harbor Pacific",
      medicare_wages: "96000",
    },
    "w2",
  );
  assert.equal(filenameOnly.pendingProposal?.field, "wage_extract");
  const filenameCopy = proposalAskCopy(filenameOnly.pendingProposal!);
  assert.doesNotMatch(filenameCopy, /\bRay\b/);
  assert.doesNotMatch(filenameCopy, /Raymond/);
  assert.notEqual(filenameCopy, BORROWER_NAME_ASK);
  const filenameUsed = acceptWageExtract(filenameOnly);
  assert.equal(borrowerNameOnFile(filenameUsed), "");
  assert.equal(filenameUsed.coborrowerName, "Ying Lee");

  const skippedCard = skipWageDocs(filenameOnly);
  assert.equal(borrowerNameOnFile(skippedCard), "");
  assert.equal(skippedCard.coborrowerName, "Ying Lee");
  assert.equal(skippedCard.pendingProposal, null);

  const extracted = applyExtractedFields(usedYing, {
    extractClass: "w2",
    confidence: 0.94,
    fields: {
      employee_name: "Raymond Chen",
      employer_name: "Harbor Pacific",
      medicare_wages: "96000",
    },
  });
  assert.equal(extracted.draft.pendingProposal?.field, "wage_extract");
  assert.equal(pageNamePendingForPrimary(extracted.draft), "Raymond Chen");
  const card = nextFoxAsk(extracted.draft);
  assert.equal(card.text, wageW2ConfirmCopy(96000, "Harbor Pacific", "Raymond Chen"));
  assert.match(card.text, /Raymond Chen/);
  assert.match(card.text, /Harbor Pacific/);
  assert.match(card.text, /Box 5 \$96,000/);
  assert.notEqual(card.text, BORROWER_NAME_ASK);
  assert.doesNotMatch(card.text, /What name should I put/);
  assert.deepEqual(labels(card.actions).slice(0, 1), ["Use this"]);
  assert.equal(borrowerNameAskCopy(extracted.draft).text, "I’ll use Raymond Chen on this file. Suggested · not underwritten. Use this?");
  assert.doesNotMatch(borrowerNameAskCopy(extracted.draft).text, /What name should I put/);
  assert.equal(borrowerNameOnFile(extracted.draft), "");
  assert.equal(extracted.draft.coborrowerName, "Ying Lee");

  const invented = applyExtractedFields(usedYing, {
    extractClass: "w2",
    confidence: 0.94,
    fields: {
      employee_name: "2025 W2 Ray",
      employer_name: "Harbor Pacific",
      medicare_wages: "96000",
    },
  });
  assert.doesNotMatch(proposalAskCopy(invented.draft.pendingProposal!), /\bRay\b/);
  assert.equal(pageNamePendingForPrimary(invented.draft), "");
  assert.equal(borrowerNameOnFile(acceptWageExtract(invented.draft)), "");

  const rayUsed = resolveProposal(extracted.draft, "accept");
  assert.equal(rayUsed.borrowerName, "Raymond Chen");
  assert.equal(borrowerNameOnFile(rayUsed), "Raymond Chen");
  assert.equal(fact(rayUsed, "borrower")?.value, "Raymond Chen");
  assert.equal(rayUsed.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(rayUsed), "2");
  assert.equal(fact(rayUsed, "coborrower-name")?.value, "Ying Lee");
  assert.doesNotMatch(fact(rayUsed, "coborrower-name")?.value ?? "", /Box 5|96|Raymond|Harbor/);
  assert.ok((rayUsed.employmentHistory ?? []).some((row) => /Harbor Pacific/i.test(row.label ?? "")));
  assert.equal(rayUsed.facts?.w2_box5?.value, "96000");
  assert.doesNotMatch(JSON.stringify(rayUsed.employmentHistory ?? []), /Ying|Lee/);
  assert.match(jointWageDocsAskCopy(rayUsed) ?? "", /Raymond’s or Ying’s|Ray’s or Ying’s/);

  const yingHeld = applyExtractedFields(
    { ...usedYing, borrowerName: "Ying Lee", contact: { ...usedYing.contact, fullName: { ...usedYing.contact.fullName, value: "Ying Lee" } } },
    {
      extractClass: "w2",
      confidence: 0.94,
      fields: {
        employee_name: "Raymond Chen",
        employer_name: "Harbor Pacific",
        medicare_wages: "96000",
      },
    },
  );
  assert.equal(pageNameForPrimaryBorrower(yingHeld.draft, "Raymond Chen"), "");
  assert.equal(borrowerNameOnFile(resolveProposal(yingHeld.draft, "accept")), "Ying Lee");

  const yingPaper = maybeProposeWageExtract(
    usedYing,
    {
      employee_name: "Ying Lee",
      employer_name: "East Bay Clinic",
      medicare_wages: "48000",
    },
    "w2",
  );
  assert.notEqual(yingPaper.pendingProposal?.field, "wage_extract");
  assert.equal(borrowerNameOnFile(yingPaper), "");
  assert.equal(yingPaper.coborrowerName, "Ying Lee");

  const skippedPapers = skipPapers(usedYing);
  assert.equal(borrowerNameOnFile(skippedPapers), "");
  assert.equal(skippedPapers.coborrowerName, "Ying Lee");

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
  assert.equal(queued.borrowerName, "Raymond Chen");
  assert.equal(queued.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(queued), "2");
  assert.equal(fact(queued, "line")?.value, "$50,000");
  assert.equal(queued.liveQuote?.interestOnly, tool.monthlyPayment);

  return classifyAndExtract(
    readFileSync(join(process.cwd(), "sample-docs/06-w2-2025-box5-loud.pdf")),
    "application/pdf",
    {
      async classify(): Promise<never> {
        throw new Error("vision should not run on loud W-2 text");
      },
      async extract(): Promise<never> {
        throw new Error("vision should not run on loud W-2 text");
      },
    },
    "w2",
    "2025 W2 Ray.pdf",
  ).then((loud) => {
    assert.equal(loud.extractClass, "w2");
    assert.match(loud.fields.employee_name ?? loud.fields.full_name ?? "", /Jordan Hale/i);
    assert.doesNotMatch(JSON.stringify(loud.fields), /\bRay\b/);
    const fromPage = applyExtractedFields(usedYing, {
      extractClass: "w2",
      confidence: 0.94,
      fields: loud.fields,
    });
    assert.match(proposalAskCopy(fromPage.draft.pendingProposal!), /Jordan Hale/);
    assert.doesNotMatch(proposalAskCopy(fromPage.draft.pendingProposal!), /\bRay\b|What name should I put/);
    const written = resolveProposal(fromPage.draft, "accept");
    assert.equal(written.borrowerName, "Jordan Hale");
    assert.equal(written.coborrowerName, "Ying Lee");
    assert.match(written.facts?.w2_box5?.value ?? "", /118400/);

    console.log(
      `assert-borrower-1-name-from-page: W-2 page name CFBW writes Borrower 1 + Box 5; filename is not a name; Ying held; Skip keeps B1 empty; line $50,000 / $${tool.monthlyPayment}`,
    );
  });
}

main();
