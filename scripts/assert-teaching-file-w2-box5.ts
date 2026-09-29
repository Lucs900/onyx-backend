/**
 * Ticket 69. Teaching File W-2 method + Still useful after paper in.
 * Docs W-2 in → Last year's W-2 leaves Still useful.
 * Same W-2 re-dropped on a File that still says Box 1 monthly:
 * card names Box 5. Use this overwrites the method. No second job.
 * If File already shows Box 5 and the page matches, no new Use this card.
 * Confirm-before-write. Do not rewind Borrower 1.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  LAST_YEAR_RETURN_STILL_USEFUL,
  LAST_YEAR_W2_STILL_USEFUL,
  applyExtractedFields,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import { resolveProposal } from "../components/fox/completeness";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import {
  QUALIFYING_INCOME_FIELD,
  QUALIFYING_METHOD_FIELD,
  W2_BOX1_MONTHLY_NOTE,
  W2_BOX5_MONTHLY_NOTE,
  wageEmploymentFileLine,
  wageNeedsBox5MethodOverwrite,
  wageBox5MethodMatchesFile,
  wageW2ConfirmCopy,
} from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import {
  nextFoxAsk,
  previewFacts,
  writePurchasePrice,
  workspaceAskFoxFileReply,
} from "../components/fox/workspace";
import { ASK_FOX_W2_OPEN_LINE } from "../components/fox/askFoxFile";
import { writeBorrowerName } from "../components/fox/borrowerName";
import type { FoxIntakeDraft, ReceivedDoc } from "../components/fox/types";

const RAY_W2 = {
  employer_name: "INNOVATION PARTNERS LLC",
  employee_name: "RAYMOND LEE",
  full_name: "RAYMOND LEE",
  tax_year: "2025",
  medicare_wages: "120000.00",
  box5: "120000.00",
  wages: "120000.00",
};

const W2_DOC: ReceivedDoc = {
  slot: "w2",
  name: "2025 W2 Ray.pdf",
  type: "application/pdf",
  size: 273841,
  receivedAt: "2026-09-29T16:24:36.060Z",
  status: "extracted",
  extractClass: "w2",
  party: "borrower",
};

const ID_DOC: ReceivedDoc = {
  slot: "id",
  name: "Ray Lee DL and SS.pdf",
  type: "application/pdf",
  size: 256969,
  receivedAt: "2026-09-29T16:43:40.093Z",
  status: "extracted",
  extractClass: "government_id",
  party: "borrower",
};

function fact(field: string, value: string, source: "suggested" | "extracted-unconfirmed" | "document" = "suggested") {
  return {
    field,
    value,
    source,
    confirmed: true,
    confirmedAt: "2026-09-29T16:27:51.208Z",
  };
}

function teachingFile(): FoxIntakeDraft {
  const now = "2026-09-29T16:43:54.881Z";
  let draft = writeWhoOnLoan(
    {
      ...writeHelocLine(
        writeFirstLien(writePurchasePrice({
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
          incomeType: { ...emptyDraft().incomeType, value: "w2", confirmed: true },
          whoOnLoanDue: true,
          fileId: "38f1b63c-4096-4a97-811e-ce7a4d63690c",
          sampleAccepted: true,
          looksRightHold: true,
          wageDocsAsked: true,
          wageBox5Asked: true,
          wageFrequencyAsked: true,
          wageStubAsked: true,
          skippedClasses: ["w2", "paystub"],
          documents: [W2_DOC, ID_DOC],
          employmentHistory: [{ label: "INNOVATION PARTNERS LLC", to: "present" }],
          facts: {
            qualifying_income: fact(QUALIFYING_INCOME_FIELD, "10000"),
            qualifying_method: fact(QUALIFYING_METHOD_FIELD, W2_BOX1_MONTHLY_NOTE),
            wage_monthly: fact("wage_monthly", "10000"),
            employer_name: fact("employer_name", "INNOVATION PARTNERS LLC", "extracted-unconfirmed"),
            medicare_wages: fact("medicare_wages", "120000.00", "extracted-unconfirmed"),
            box5: fact("box5", "120000.00", "extracted-unconfirmed"),
            employee_name: fact("employee_name", "RAYMOND LEE", "extracted-unconfirmed"),
          },
        }, 500_000), 400_000),
        50_000,
      ),
    },
    "just-me",
  );
  draft = applyCouponChoice(draft, "this");
  draft = writeBorrowerName(draft, "Raymond Chi Lee");
  draft = {
    ...draft,
    sampleAccepted: true,
    looksRightHold: true,
    updatedAt: now,
  };
  return draft;
}

function usefulLabels(draft: FoxIntakeDraft) {
  return (stillUsefulSection(draft)?.items ?? []).map((item) => item.label);
}

function main() {
  const start = teachingFile();
  assert.equal(start.borrowerName, "Raymond Chi Lee");
  assert.equal(start.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX1_MONTHLY_NOTE);
  assert.equal(start.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");
  assert.equal((start.employmentHistory ?? []).length, 1);
  assert.ok(wageNeedsBox5MethodOverwrite(start, RAY_W2));
  assert.equal(wageBox5MethodMatchesFile(start, RAY_W2), false);

  const useful = usefulLabels(start);
  assert.ok(!useful.includes(LAST_YEAR_W2_STILL_USEFUL), `Still useful still has Last year's W-2: ${useful.join(" · ")}`);
  assert.ok(
    useful.includes(LAST_YEAR_RETURN_STILL_USEFUL) || useful.some((label) => /1040|paystub/i.test(label)),
    "1040 or stub may stay",
  );

  const w2Ask = workspaceAskFoxFileReply("Do you still need last year's W-2 on this file?", start);
  assert.notEqual(w2Ask.text, ASK_FOX_W2_OPEN_LINE);
  assert.doesNotMatch(w2Ask.text, /still open/i);

  const extracted = applyExtractedFields(start, {
    extractClass: "w2",
    confidence: 0.94,
    fields: RAY_W2,
  });
  assert.equal(extracted.draft.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX1_MONTHLY_NOTE);
  assert.equal(extracted.draft.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");
  assert.equal(extracted.draft.borrowerName, "Raymond Chi Lee");
  const card = nextFoxAsk(extracted.draft);
  assert.equal(
    card.text,
    wageW2ConfirmCopy(120000, "INNOVATION PARTNERS LLC", "RAYMOND LEE"),
  );
  assert.match(card.text, /INNOVATION PARTNERS LLC/);
  assert.match(card.text, /Box 5 \$120,000/);
  assert.match(card.text, /\$10,000 a month/);
  assert.doesNotMatch(card.text, /Box 1/);
  assert.ok((card.actions ?? []).length > 0, "last Fox line always has chips");

  const used = resolveProposal(extracted.draft, "accept");
  assert.equal(used.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");
  assert.equal(used.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.doesNotMatch(used.facts?.[QUALIFYING_METHOD_FIELD]?.value ?? "", /Box 1/);
  assert.equal(used.borrowerName, "Raymond Chi Lee");
  assert.equal((used.employmentHistory ?? []).length, 1);
  assert.match(wageEmploymentFileLine(used), /INNOVATION PARTNERS LLC/);
  assert.match(wageEmploymentFileLine(used), /Box 5 \$120,000/);
  const qi = previewFacts(used).find((item) => item.id === "qualifying");
  assert.match(qi?.value ?? "", /10,000/);
  assert.match(qi?.value ?? "", /Box 5 monthly/);
  assert.doesNotMatch(qi?.value ?? "", /Box 1/);
  const afterUseful = usefulLabels(used);
  assert.ok(!afterUseful.includes(LAST_YEAR_W2_STILL_USEFUL));
  const afterAsk = workspaceAskFoxFileReply("Do you still need last year's W-2 on this file?", used);
  assert.doesNotMatch(afterAsk.text, /still open/i);
  const next = nextFoxAsk(used);
  assert.ok(next.text.trim(), "Use this cannot leave an empty composer");
  assert.ok((next.actions ?? []).length > 0, "last Fox line always has chips");
  assert.doesNotMatch(next.text, /W-2 is still open|Last year's W-2 is still open/i);
  assert.doesNotMatch(next.text, /This File is yours|Save your File/i);

  assert.ok(wageBox5MethodMatchesFile(used, RAY_W2));
  assert.equal(wageNeedsBox5MethodOverwrite(used, RAY_W2), false);
  const again = applyExtractedFields(used, {
    extractClass: "w2",
    confidence: 0.94,
    fields: RAY_W2,
  });
  assert.equal(again.draft.pendingProposal, null);
  assert.equal(again.draft.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.equal(again.draft.borrowerName, "Raymond Chi Lee");
  assert.equal((again.draft.employmentHistory ?? []).length, 1);
  assert.doesNotMatch(nextFoxAsk(again.draft).text, /\$10,000 a month/);

  console.log("assert-teaching-file-w2-box5: Box 5 overwrite, Still useful drops Last year's W-2, no second job");
}

main();
