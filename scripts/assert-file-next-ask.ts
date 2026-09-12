/**
 * File / next-ask hygiene leftover.
 * Notepad drives the next ask. Employment or a return on File does not replay
 * How is income earned / drop W-2. Ten-file cap is per drop/batch only.
 * Start over wipes QI / Docs / Note / Still useful.
 */
import assert from "node:assert/strict";
import { emptyDraft, loadIntakeDraft, startOverWorkspace } from "../components/fox/store";
import {
  applyExtractedFields,
  leftoverCapSpeech,
  LIMIT_LINE,
  rejectIncomingFile,
  resolveFactConflict,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import { resolveProposal, wageDocsAskNeeded } from "../components/fox/completeness";
import { incomeAskOpen, nextFoxAsk, previewFacts } from "../components/fox/workspace";
import { WAGE_DOCS_ASK } from "../components/fox/qualifyingIncome";
import { DECLINING_INCOME_CAUTION } from "../lib/income/suggest";
import { dropBatchCap, LIMIT_LINE_REPEAT, MAX_DOC_COUNT } from "../lib/docs/accept";
import type { FoxIntakeDraft } from "../components/fox/types";

function sketch(income?: string): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    incomeAsked: Boolean(income),
    incomeType: { ...emptyDraft().incomeType, value: income ?? "" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_000_000,
    downPaymentAmount: 200_000,
    loanAmountValue: 800_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "house",
    propertyTypeAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    skippedClasses: ["government_id"],
  };
}

const w2Fields = {
  employer_name: "Harbor Pacific Design Inc",
  wages: "84000",
  medicare_wages: "84000",
  box5: "84000",
  tax_year: "2025",
};

const returnFields = {
  return_kind: "schedule_c",
  tax_year: "2025",
  schedule_c_net_profit: "108000",
};

function assertNotIncomeReplay(text: string) {
  assert.doesNotMatch(text, /How is income earned/i);
  assert.doesNotMatch(text, /Drop last year.?s W-2/i);
  assert.notEqual(text, WAGE_DOCS_ASK);
}

function main() {
  const afterW2 = applyExtractedFields(sketch(), {
    extractClass: "w2",
    confidence: 0.94,
    fields: w2Fields,
  }).draft;
  assert.equal(incomeAskOpen(afterW2), false);
  assert.equal(wageDocsAskNeeded(afterW2), false);
  assert.ok(afterW2.incomeType.value);
  assertNotIncomeReplay(nextFoxAsk(afterW2).text);
  const usedW2 = resolveProposal(afterW2, "accept");
  assert.equal(incomeAskOpen(usedW2), false);
  assert.equal(wageDocsAskNeeded(usedW2), false);
  assertNotIncomeReplay(nextFoxAsk(usedW2).text);

  const typedW2 = applyExtractedFields(sketch("w2"), {
    extractClass: "w2",
    confidence: 0.94,
    fields: w2Fields,
  }).draft;
  assert.equal(wageDocsAskNeeded(typedW2), false);
  assertNotIncomeReplay(nextFoxAsk(typedW2).text);

  const afterReturn = applyExtractedFields(sketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: returnFields,
  }).draft;
  assert.equal(incomeAskOpen(afterReturn), false);
  assert.equal(wageDocsAskNeeded(afterReturn), false);
  assert.equal(afterReturn.incomeType.value, "self-employed");
  assertNotIncomeReplay(nextFoxAsk(afterReturn).text);
  const usedReturn = resolveProposal(afterReturn, "accept");
  assert.equal(usedReturn.facts?.qualifying_income?.value, "9000");
  assertNotIncomeReplay(nextFoxAsk(usedReturn).text);

  const stubReady = {
    ...sketch("w2"),
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    facts: {
      employer_name: {
        field: "employer_name",
        value: "Acme",
        source: "document",
        confirmed: true,
      },
    },
    employmentHistory: [{ label: "Acme" }],
  };
  const stubFields = {
    employer_name: "Acme",
    gross_period: "10000",
    pay_frequency: "monthly",
  };
  const firstStub = applyExtractedFields(stubReady, {
    extractClass: "paystub",
    confidence: 0.94,
    fields: stubFields,
  }).draft;
  assert.equal(firstStub.pendingProposal?.field, "qualifying_income");
  assert.match(nextFoxAsk(firstStub).text, /10,000/);
  assert.ok((nextFoxAsk(firstStub).actions ?? []).some((item) => item.label === "Use this"));
  const usedStub = resolveProposal(firstStub, "accept");
  assert.equal(usedStub.facts?.qualifying_income?.value, "10000");
  assert.doesNotMatch(nextFoxAsk(usedStub).text, /Got the paystub|I’m suggesting/i);
  const sameStubAgain = applyExtractedFields(usedStub, {
    extractClass: "paystub",
    confidence: 0.94,
    fields: stubFields,
  }).draft;
  assert.notEqual(sameStubAgain.pendingProposal?.field, "qualifying_income");
  assert.doesNotMatch(nextFoxAsk(sameStubAgain).text, /Got the paystub|I’m suggesting/i);

  const secondJob = applyExtractedFields(usedStub, {
    extractClass: "paystub",
    confidence: 0.94,
    fields: {
      employer_name: "Night Shift Co",
      gross_period: "1600",
      pay_frequency: "monthly",
    },
  }).draft;
  assert.equal(secondJob.pendingProposal?.field, "qualifying_income");
  assert.match(nextFoxAsk(secondJob).text, /1,600/);
  assert.ok((nextFoxAsk(secondJob).actions ?? []).some((item) => item.label === "Use this"));

  const priced = { ...sketch("w2"), propertyValueAmount: 1_000_000 };
  const priceConflict = applyExtractedFields(priced, {
    extractClass: "purchase_contract",
    confidence: 0.94,
    fields: {
      property_address: "100 Main St, San Francisco, CA 94123",
      purchase_price: "850000",
      close_date: "10/15/2026",
    },
  });
  assert.equal(priceConflict.conflict?.field, "purchase_price");
  assert.match(nextFoxAsk(priceConflict.draft).text, /Which should I keep/);
  assert.match(nextFoxAsk(priceConflict.draft).text, /1,000,000/);
  assert.match(nextFoxAsk(priceConflict.draft).text, /850,000/);
  const keptPrice = resolveFactConflict(priceConflict.draft, "file");
  assert.equal(keptPrice.propertyValueAmount, 1_000_000);
  assert.doesNotMatch(nextFoxAsk(keptPrice).text, /Which should I keep/);
  const leftoverContract = applyExtractedFields(keptPrice, {
    extractClass: "purchase_contract",
    confidence: 0.94,
    fields: {
      property_address: "100 Main St, San Francisco, CA 94123",
      purchase_price: "850000",
      close_date: "10/15/2026",
    },
  });
  assert.equal(leftoverContract.conflict, null);
  assert.doesNotMatch(nextFoxAsk(leftoverContract.draft).text, /Which should I keep/);

  const names = Array.from({ length: 11 }, (_, i) => `file-${i + 1}.pdf`);
  const batch = dropBatchCap(names);
  assert.equal(batch.keep.length, MAX_DOC_COUNT);
  assert.deepEqual(batch.leftover, ["file-11.pdf"]);
  assert.equal(batch.speech, LIMIT_LINE);
  assert.equal(leftoverCapSpeech(11), LIMIT_LINE);
  assert.equal(leftoverCapSpeech(10), null);
  assert.equal(leftoverCapSpeech(11, true), null);
  assert.equal(dropBatchCap(names.slice(0, 10)).speech, null);
  assert.doesNotMatch(LIMIT_LINE, /Ten files is the limit/i);
  assert.equal(LIMIT_LINE, "I have 10. I’ll read these. Drop the rest after.");
  assert.notEqual(LIMIT_LINE, LIMIT_LINE_REPEAT);
  const tenOnFile: FoxIntakeDraft = {
    ...sketch("w2"),
    documents: Array.from({ length: MAX_DOC_COUNT }, (_, i) => ({
      slot: "other" as const,
      name: `file-${i + 1}.pdf`,
      type: "application/pdf",
      size: 2048,
      receivedAt: `2026-09-06T18:00:0${i}.000Z`,
      status: "extracted" as const,
      extractClass: "other" as const,
    })),
  };
  assert.equal(
    rejectIncomingFile(tenOnFile, "next-batch.pdf", "application/pdf", 2048),
    null,
    "ten files on File does not lock the next drop",
  );
  assert.equal(dropBatchCap(["next-batch.pdf"]).speech, null);

  const dirty: FoxIntakeDraft = {
    ...sketch("self-employed"),
    facts: {
      qualifying_income: {
        field: "qualifying_income",
        value: "2550",
        source: "suggested",
        confirmed: true,
      },
      income_caution: {
        field: "income_caution",
        value: DECLINING_INCOME_CAUTION,
        source: "suggested",
        confirmed: true,
      },
    },
    notes: ["later year"],
    documents: [
      {
        slot: "other",
        name: "17-schedule-e-2025-sanchez-rental.pdf",
        type: "application/pdf",
        size: 2048,
        receivedAt: "2026-09-06T18:00:00.000Z",
        status: "extracted",
        extractClass: "tax_return",
      },
    ],
  };
  loadIntakeDraft(dirty);
  const wiped = startOverWorkspace("acr");
  const wipedFacts = previewFacts(wiped);
  assert.ok(!wipedFacts.some((fact) => fact.id === "qualifying"));
  assert.ok(!wipedFacts.some((fact) => fact.id === "docs"));
  assert.ok(!wipedFacts.some((fact) => fact.id === "caution" || fact.label === "Note"));
  assert.doesNotMatch(JSON.stringify(wipedFacts), /2,550|2550|later year/i);
  assert.equal(stillUsefulSection(wiped), null);
  assert.deepEqual(wiped.documents, []);
  assert.deepEqual(wiped.notes, []);
  assert.deepEqual(wiped.facts ?? {}, {});

  const buy: FoxIntakeDraft = {
    ...wiped,
    productIntent: "buy",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  };
  const buyBlob = JSON.stringify(previewFacts(buy));
  assert.doesNotMatch(buyBlob, /2,550|2550|later year/i);
  assert.ok(!previewFacts(buy).some((fact) => fact.id === "qualifying"));
  assert.equal(stillUsefulSection(buy), null);

  console.log("assert-file-next-ask: File drives next ask · per-drop 10-file cap · Start over wipes QI/Docs/Note");
}

main();
