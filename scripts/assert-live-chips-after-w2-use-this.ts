/**
 * After Use this on a W-2 (or ID) card, the next Fox line has a live strip.
 * Never a blank composer. Typed skip is a backup. File stays empty until Use this.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { applyExtractedFields, skipCurrentInvite } from "../components/fox/fileWrite";
import { borrowerNameOnFile } from "../components/fox/borrowerName";
import { canLooksRight, isLooksRightAskText, resolveProposal } from "../components/fox/completeness";
import { applyCouponChoice, isLiveFoxTurn, liveFoxTurnIndex, sealStoredFoxThread } from "../components/fox/liveCoupon";
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
  writeWhoOnLoan,
} from "../components/fox/whoOnLoan";
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
  const draft = applyCouponChoice(withHelocToolQuote(file), "this");
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

function liveStrip(thread: FoxMessage[], draft: FoxIntakeDraft) {
  return labels(deskStripActions(thread, draft));
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
  assert.equal(helocQuoteFromDraft(file)?.finalRate, tool.finalRate);

  const afterYes = writeWhoOnLoan(afterThisOneW2(file), "yes");
  const proposed = proposeWhoOnLoanName(afterYes, "Ying Lee");
  assert.doesNotMatch(pad(proposed), /Ying Lee|Borrower 2|2 unnamed/);

  const usedYing = resolveProposal(proposed, "accept");
  assert.equal(usedYing.coborrowerName, "Ying Lee");
  assert.equal(borrowersFileValue(usedYing), "2");

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
  assert.doesNotMatch(pad(extracted.draft), /Raymond Lee|Borrower 1|Harbor Pacific|120,000/);
  assert.equal(wageEmploymentFileLine(extracted.draft), "");

  const used = workspaceReply("Use this", extracted.draft);
  assert.ok((used?.text ?? "").trim(), "W-2 Use this cannot leave an empty composer");
  assert.ok((used?.actions ?? []).length > 0, "W-2 Use this must emit chips");
  assert.doesNotMatch(used?.text ?? "", /anyone else on this loan/i);
  assert.ok(
    labels(used?.actions).some((label) => /^(Skip|Upload this|Upload|Looks right)$/.test(label)),
    `next strip after W-2 Use this — ${labels(used?.actions).join(" · ")}`,
  );

  const rayUsed = resolveProposal(extracted.draft, "accept");
  assert.equal(borrowerNameOnFile(rayUsed), "Raymond Lee");
  assert.equal(rayUsed.coborrowerName, "Ying Lee");
  assert.match(wageEmploymentFileLine(rayUsed), /Harbor Pacific/);
  assert.match(wageEmploymentFileLine(rayUsed), /Box 5 \$120,000/);

  const next = nextFoxAsk(rayUsed);
  assert.ok(next.text.trim(), "next Fox line after W-2 Use this must speak");
  assert.ok((next.actions ?? []).length > 0, "next Fox line after W-2 Use this must have chips");
  assert.doesNotMatch(next.text, /anyone else on this loan/i);
  assert.deepEqual(liveStrip([{ id: "next", role: "fox", text: next.text }], rayUsed), labels(next.actions));

  const painted = sealStoredFoxThread([
    { id: "papers", role: "fox", text: next.text },
    { id: "card", role: "fox", text: card.text },
    { id: "use", role: "client", text: "Use this" },
    { id: "next", role: "fox", text: next.text },
  ]);
  const last = liveFoxTurnIndex(painted);
  assert.equal(painted[last]?.text, next.text, "used W-2 card cannot swallow the next Fox line");
  assert.equal(isLiveFoxTurn(painted, last), true);
  assert.ok(liveStrip(painted, rayUsed).length > 0, "painted next line owns a live strip");
  assert.ok(
    liveStrip(painted, rayUsed).some((label) => /^(Skip|Upload this|Upload|Looks right)$/.test(label)),
    `painted strip after W-2 Use this — ${liveStrip(painted, rayUsed).join(" · ")}`,
  );

  const hole: FoxMessage[] = [
    { id: "card", role: "fox", text: card.text },
    { id: "use", role: "client", text: "Use this" },
  ];
  assert.ok(
    liveStrip(hole, rayUsed).length > 0,
    "used W-2 card with no next line still owns the next-file strip",
  );

  const ready = skipPapers(rayUsed);
  assert.equal(workspacePrompt(ready), "review");
  assert.ok(isLooksRightAskText(nextFoxAsk(ready).text));
  assert.deepEqual(labels(nextFoxAsk(ready).actions), ["Looks right", "Needs a correction"]);
  assert.equal(canLooksRight(ready), true);

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
  assert.equal(fact(queued, "line")?.value, "$50,000");
  assert.equal(queued.liveQuote?.interestOnly, tool.monthlyPayment);
  assert.equal(queued.borrowerName, "Raymond Lee");
  assert.equal(queued.coborrowerName, "Ying Lee");

  console.log(
    `assert-live-chips-after-w2-use-this: next line after W-2 Use this has chips; no who-on-loan reprint; finish chips; line $50,000 / $${tool.monthlyPayment}`,
  );
}

main();
