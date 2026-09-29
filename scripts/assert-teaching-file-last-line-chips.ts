/**
 * Ticket 70. Teaching File last Fox line after the W-2 write.
 * Escalated + originator requested still owns Ask Fox · Upload more · Request human.
 * Do not rewrite the exception sentence. Do not reprint last year’s W-2 still open.
 * Confirm-before-write: leftover does not write wage, employer, or QI.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  LAST_YEAR_W2_STILL_USEFUL,
  applyExtractedFields,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import { ASK_FOX_W2_OPEN_LINE } from "../components/fox/askFoxFile";
import { withLinkedAccount } from "../components/fox/account";
import { MOTION_COPY, finishLineActions } from "../components/fox/motion";
import {
  QUALIFYING_INCOME_FIELD,
  QUALIFYING_METHOD_FIELD,
  W2_BOX5_MONTHLY_NOTE,
} from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { writeBorrowerName } from "../components/fox/borrowerName";
import {
  deskStripActions,
  nextFoxAsk,
  previewFacts,
  workspaceAskFoxFileReply,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import type { FoxIntakeDraft, FoxMessage, ReceivedDoc } from "../components/fox/types";

const THREE = ["Ask Fox", "Upload more", "Request human"];

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
    confirmedAt: "2026-09-29T22:03:41.994Z",
  };
}

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function teachingFileAfterWrite(): FoxIntakeDraft {
  let draft = writeWhoOnLoan(
    {
      ...writeHelocLine(
        writeFirstLien(
          writePurchasePrice(
            {
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
              skippedClasses: ["paystub"],
              documents: [W2_DOC, ID_DOC],
              employmentHistory: [{ label: "INNOVATION PARTNERS LLC", to: "present" }],
              motion: "escalated",
              originatorRequested: true,
              facts: {
                qualifying_income: fact(QUALIFYING_INCOME_FIELD, "10000"),
                qualifying_method: fact(QUALIFYING_METHOD_FIELD, W2_BOX5_MONTHLY_NOTE),
                wage_monthly: fact("wage_monthly", "10000"),
                employer_name: fact("employer_name", "INNOVATION PARTNERS LLC", "document"),
                medicare_wages: fact("medicare_wages", "120000.00", "document"),
                box5: fact("box5", "120000.00", "document"),
                employee_name: fact("employee_name", "RAYMOND LEE", "document"),
              },
            },
            500_000,
          ),
          400_000,
        ),
        50_000,
      ),
    },
    "just-me",
  );
  draft = applyCouponChoice(draft, "this");
  draft = writeBorrowerName(draft, "Raymond Chi Lee");
  return withLinkedAccount(
    {
      ...draft,
      sampleAccepted: true,
      motion: "escalated",
      originatorRequested: true,
      updatedAt: "2026-09-29T22:03:41.994Z",
    },
    "acct_sa43sbs3dt",
  );
}

function main() {
  const start = teachingFileAfterWrite();
  assert.equal(start.borrowerName, "Raymond Chi Lee");
  assert.equal(start.motion, "escalated");
  assert.equal(start.originatorRequested, true);
  assert.equal(start.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.equal(start.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");
  assert.equal((start.employmentHistory ?? []).length, 1);
  assert.match(start.employmentHistory?.[0]?.label ?? "", /INNOVATION PARTNERS LLC/);

  const finish = labels(finishLineActions(start));
  assert.deepEqual(finish, THREE);
  assert.equal(finish.at(-1), "Request human");

  const exceptionThread: FoxMessage[] = [
    { id: "card", role: "fox", text: "Raymond Lee. INNOVATION PARTNERS LLC. Box 5 $120,000 → $10,000 a month." },
    { id: "use", role: "client", text: "Use this" },
    { id: "exception", role: "fox", text: MOTION_COPY.escalated },
  ];
  const strip = labels(deskStripActions(exceptionThread, start));
  assert.deepEqual(strip, THREE);
  assert.equal(strip.at(-1), "Request human");

  const next = nextFoxAsk(start);
  assert.notEqual(next.text, MOTION_COPY.escalated);
  assert.deepEqual(labels(next.actions), THREE);
  assert.doesNotMatch(next.text, /This File is yours|Save your File/i);
  assert.doesNotMatch(next.text, /W-2 is still open|Last year's W-2 is still open/i);

  const useful = (stillUsefulSection(start)?.items ?? []).map((item) => item.label);
  assert.ok(!useful.includes(LAST_YEAR_W2_STILL_USEFUL));

  const ask = workspaceAskFoxFileReply("Do you still need last year's W-2 on this file?", start);
  assert.notEqual(ask.text, ASK_FOX_W2_OPEN_LINE);
  assert.doesNotMatch(ask.text, /still open/i);
  assert.deepEqual(labels(ask.actions), THREE);

  const tapped = workspaceReply("Ask Fox", start);
  assert.ok(tapped?.text.trim(), "Ask Fox cannot leave an empty composer");
  assert.doesNotMatch(tapped?.text ?? "", /still open/i);
  assert.deepEqual(labels(tapped?.actions), THREE);
  assert.equal(start.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.equal(start.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");

  const reread = applyExtractedFields(start, {
    extractClass: "w2",
    confidence: 0.94,
    fields: {
      employer_name: "INNOVATION PARTNERS LLC",
      employee_name: "RAYMOND LEE",
      tax_year: "2025",
      medicare_wages: "120000.00",
      box5: "120000.00",
      wages: "120000.00",
    },
  });
  assert.equal(reread.draft.pendingProposal, null);
  assert.equal(reread.draft.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.equal((reread.draft.employmentHistory ?? []).length, 1);
  const qi = previewFacts(reread.draft).find((item) => item.id === "qualifying");
  assert.match(qi?.value ?? "", /10,000/);
  assert.match(qi?.value ?? "", /Box 5 monthly/);

  console.log("assert-teaching-file-last-line-chips: exception last line keeps Ask Fox · Upload more · Request human");
}

main();
