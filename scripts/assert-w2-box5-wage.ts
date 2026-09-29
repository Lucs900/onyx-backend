/**
 * Ticket 68. W-2 wage method is Box 5 Medicare wages ÷ 12.
 * Card names employer + Box 5. File empty until Use this.
 * Use this writes one Employment row and QI from that method. Not Box 1.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { applyExtractedFields, skipCurrentInvite } from "../components/fox/fileWrite";
import { canLooksRight, isLooksRightAskText, resolveProposal } from "../components/fox/completeness";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import {
  QUALIFYING_INCOME_FIELD,
  QUALIFYING_METHOD_FIELD,
  W2_BOX5_MONTHLY_NOTE,
  skipWageBox5,
  skipWageDocs,
  skipWageFrequency,
  skipWageStub,
  suggestWageIncome,
  wageEmploymentFileLine,
  wageW2ConfirmCopy,
} from "../components/fox/qualifyingIncome";
import { skipSubjectAddress } from "../components/fox/propertyType";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import {
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  writePurchasePrice,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

const RAY_W2 = {
  employer_name: "INNOVATION PARTNERS LLC",
  employee_name: "RAYMOND LEE",
  full_name: "RAYMOND LEE",
  tax_year: "2025",
  medicare_wages: "120000.00",
  box5: "120000.00",
  wages: "120000.00",
};

function helocFile(): FoxIntakeDraft {
  return writeWhoOnLoan(
    {
      ...writeHelocLine(writeFirstLien(writePurchasePrice({
        ...emptyDraft(),
        path: "acr",
        productIntent: "heloc",
        workspaceFlow: true,
        occupancyAsked: true,
        occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
        propertyType: "sfr",
        propertyTypeAsked: true,
        creditAsked: true,
        creditBand: "760+",
        propertyZip: "94123",
        incomeAsked: true,
        incomeType: { ...emptyDraft().incomeType, value: "w2" },
        whoOnLoanDue: true,
        awaitingMonthlyDebts: true,
      }, 500_000), 400_000), 50_000),
    },
    "just-me",
  );
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

function pad(draft: FoxIntakeDraft) {
  return previewFacts(draft)
    .map((item) => `${item.label}=${item.value}`)
    .join(" | ");
}

function main() {
  const fromBox5 = suggestWageIncome({ w2Wages: 120000, w2FromBox5: true });
  assert.equal(fromBox5?.monthly, 10000);
  assert.equal(fromBox5?.methodNote, W2_BOX5_MONTHLY_NOTE);
  assert.doesNotMatch(fromBox5?.methodNote ?? "", /Box 1/);

  const file = applyCouponChoice(helocFile(), "this");
  const extracted = applyExtractedFields(file, {
    extractClass: "w2",
    confidence: 0.94,
    fields: RAY_W2,
  });
  const card = nextFoxAsk(extracted.draft);
  assert.equal(
    card.text,
    wageW2ConfirmCopy(120000, "INNOVATION PARTNERS LLC", "RAYMOND LEE"),
  );
  assert.match(card.text, /INNOVATION PARTNERS LLC/);
  assert.match(card.text, /Box 5 \$120,000/);
  assert.match(card.text, /\$10,000 a month/);
  assert.doesNotMatch(card.text, /Box 1/);
  assert.doesNotMatch(card.text, /\bSSN\b|social security/i);
  assert.equal(extracted.draft.facts?.w2_box5, undefined);
  assert.equal(extracted.draft.facts?.[QUALIFYING_INCOME_FIELD], undefined);
  assert.equal(wageEmploymentFileLine(extracted.draft), "");
  assert.doesNotMatch(pad(extracted.draft), /Qualifying income|INNOVATION PARTNERS|120,000|10,000/);

  const used = resolveProposal(extracted.draft, "accept");
  assert.equal(used.facts?.w2_box5?.value, "120000");
  assert.equal(used.facts?.medicare_wages?.value, "120000");
  assert.equal(used.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");
  assert.equal(used.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.doesNotMatch(used.facts?.[QUALIFYING_METHOD_FIELD]?.value ?? "", /Box 1/);
  assert.equal(used.facts?.wages, undefined);
  assert.match(wageEmploymentFileLine(used), /INNOVATION PARTNERS LLC/);
  assert.match(wageEmploymentFileLine(used), /Box 5 \$120,000/);
  assert.equal((used.employmentHistory ?? []).length, 1);
  const qi = previewFacts(used).find((fact) => fact.id === "qualifying");
  assert.match(qi?.value ?? "", /10,000/);
  assert.match(qi?.value ?? "", /Box 5 monthly/);
  assert.doesNotMatch(qi?.value ?? "", /Box 1/);
  assert.equal(qi?.note, "Suggested qualifying income · not underwritten");

  const next = nextFoxAsk(used);
  assert.ok(next.text.trim(), "Use this cannot leave an empty composer");
  assert.ok((next.actions ?? []).length > 0, "last Fox line always has chips");

  const ready = skipPapers(used);
  assert.equal(workspacePrompt(ready), "review");
  assert.ok(isLooksRightAskText(nextFoxAsk(ready).text));
  assert.deepEqual(
    (nextFoxAsk(ready).actions ?? []).map((item) => item.label),
    ["Looks right", "Needs a correction"],
  );
  assert.equal(canLooksRight(ready), true);
  assert.equal(ready.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.equal((ready.employmentHistory ?? []).length, 1);

  console.log("assert-w2-box5-wage: Box 5 ÷ 12, card, one Employment row, QI method not Box 1");
}

main();
