/**
 * Walker case 72. Signed-in draft: payment from the pad, last-line chips,
 * Still useful from Docs. File row, not a sentence seal.
 * Does not write File 38f1b63c. Rate and IO come from the pad, not locked strings.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  answerAskFoxFromFile,
  askFoxAnswerFromFileRows,
} from "../components/fox/askFoxFile";
import { hasLinkedAccount, withLinkedAccount } from "../components/fox/account";
import { applyEscalateMotion, finishLineActions } from "../components/fox/motion";
import {
  QUALIFYING_INCOME_FIELD,
  QUALIFYING_METHOD_FIELD,
  W2_BOX5_MONTHLY_NOTE,
} from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { writeBorrowerName } from "../components/fox/borrowerName";
import { stillUsefulSpokenItems } from "../components/fox/fileWrite";
import {
  deskStripActions,
  lastFoxTurn,
  previewFacts,
  workspaceAskFoxFileReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import type { FoxIntakeDraft, FoxMessage, ReceivedDoc } from "../components/fox/types";

const THREE = ["Ask Fox", "Upload more", "Request human"];
const LIVE_TEACHING_FILE = "38f1b63c-4096-4a97-811e-ce7a4d63690c";

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

function fact(field: string, value: string, source: "suggested" | "document" = "suggested") {
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

function lastLineChips(messages: FoxMessage[], draft: FoxIntakeDraft) {
  return labels(deskStripActions(messages, draft));
}

function padValue(pad: ReturnType<typeof previewFacts>, id: string) {
  return pad.find((item) => item.id === id)?.value ?? "";
}

function signedInDraft(): FoxIntakeDraft {
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
              fileId: "file_72_walker_case",
              sampleAccepted: true,
              guestProceeded: true,
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
              nextActor: "ONYX",
              waitingOn: "onyx",
              events: [{ kind: "proceed", text: "Proceed — one review WorkItem open." }],
              workItems: [
                {
                  id: "review-1",
                  kind: "review",
                  state: "blocked",
                  openedAt: "2026-09-29T16:00:00.000Z",
                  nudgeCount: 3,
                },
              ],
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
  return applyEscalateMotion(
    withLinkedAccount(
      {
        ...draft,
        sampleAccepted: true,
        motion: "escalated",
        originatorRequested: true,
      },
      "acct_72_walker_case",
    ),
  );
}

function main() {
  const file = signedInDraft();
  assert.equal(hasLinkedAccount(file), true);
  assert.notEqual(file.fileId, LIVE_TEACHING_FILE);
  assert.ok(file.documents?.some((doc) => doc.extractClass === "w2" && doc.status === "extracted"));
  assert.ok(file.documents?.some((doc) => doc.extractClass === "government_id" && doc.status === "extracted"));

  const pad = previewFacts(file);
  const line = padValue(pad, "line");
  const rateFact = padValue(pad, "rate");
  const rate = rateFact.match(/\d+\.\d{2}%/)?.[0] ?? "";
  const io = rateFact.match(/\$[\d,]+/)?.[0] ?? "";
  assert.ok(line, "pad line row");
  assert.ok(rate, "pad rate row");
  assert.ok(io, "pad interest-only row");
  assert.equal(padValue(pad, "docs"), "W-2 in · ID in");

  const useful = stillUsefulSpokenItems(file).map((item) => item.label);
  assert.ok(useful.some((label) => /1040|tax return/i.test(label)));
  assert.ok(useful.some((label) => /paystub/i.test(label)));
  assert.ok(!useful.some((label) => /W-2/i.test(label)));
  assert.ok(!useful.some((label) => /Government ID/i.test(label)));

  const asked = answerAskFoxFromFile("What is the payment?", file);
  assert.equal(asked.log.wroteFile, false);
  assert.equal(askFoxAnswerFromFileRows(asked.log), true);
  assert.ok(asked.log.factsUsed.includes("pad.line"));
  assert.ok(asked.log.factsUsed.includes("pad.rate"));
  assert.ok(asked.log.factsUsed.includes("pad.io"));
  assert.ok(!asked.log.factsUsed.includes("file.unanswered"));
  assert.doesNotMatch(asked.text, /I pushed this/i);
  assert.match(asked.text, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(asked.text, new RegExp(rate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(asked.text, new RegExp(io.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const lastLine = workspaceAskFoxFileReply("What is the payment?", file);
  assert.doesNotMatch(lastLine.text, /I pushed this/i);
  assert.match(lastLine.text, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(lastLine.text, new RegExp(rate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(lastLine.text, new RegExp(io.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.deepEqual(labels(lastLine.actions), THREE);
  assert.equal(labels(lastLine.actions).at(-1), "Request human");

  const thread: FoxMessage[] = [
    { id: "nudge", role: "fox", text: "I pushed this. ONYX still has it — I’ll bring the result back here." },
    { id: "pay", role: "fox", text: lastLine.text, actions: finishLineActions(file) },
  ];
  const chips = lastLineChips(thread, file);
  assert.deepEqual(chips, THREE);
  assert.equal(chips.at(-1), "Request human");
  assert.equal(lastFoxTurn(thread)?.text, lastLine.text);

  console.log(
    "72 PASS signed-in draft · Ask Fox payment from pad · last-line chips Ask Fox · Upload more · Request human · Still useful 1040+paystub · Docs-in W-2/ID off",
  );
}

main();
