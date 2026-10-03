/**
 * Walker case 71. Signed-in File row + last-line chips.
 * Reads the File row and which chips sit on the last line.
 * A sentence in history, a close-date copy match, or an apostrophe lock is not the case.
 * Does not write File 38f1b63c. Does not fail on I pushed this, W-2-still-open, or Still useful.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { answerAskFoxFromFile } from "../components/fox/askFoxFile";
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
import {
  deskStripActions,
  isGovernmentIdInviteLine,
  lastFoxTurn,
  previewFacts,
  withStaleIdInviteOffLastLine,
  workspaceAskFoxFileReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import type { FoxAction, FoxIntakeDraft, FoxMessage, ReceivedDoc } from "../components/fox/types";

const THREE = ["Ask Fox", "Upload more", "Request human"];
const ID_INVITE = "I have last year's W-2. Next is a government ID";

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

function signedInFile(): FoxIntakeDraft {
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
      "acct_sa43sbs3dt",
    ),
  );
}

function main() {
  const file = signedInFile();
  assert.equal(hasLinkedAccount(file), true);
  assert.equal(file.fileId, "38f1b63c-4096-4a97-811e-ce7a4d63690c");
  assert.ok(file.documents?.some((doc) => doc.extractClass === "w2"));
  assert.ok(file.documents?.some((doc) => doc.extractClass === "government_id"));

  const pad = previewFacts(file);
  const padValue = (id: string) => pad.find((item) => item.id === id)?.value ?? "";
  assert.equal(padValue("docs"), "W-2 in · ID in");
  assert.equal(padValue("home"), "$500,000");
  assert.equal(padValue("first-lien"), "$400,000");
  assert.equal(padValue("line"), "$50,000");
  assert.equal(padValue("cltv"), "90.0%");
  assert.match(padValue("qualifying"), /10,000/);
  assert.match(padValue("history-employment"), /INNOVATION PARTNERS LLC/);
  assert.equal(padValue("borrower"), "Raymond Chi Lee");
  assert.equal(file.propertyValueAmount, 500_000);
  assert.equal(file.firstLienAmount, 400_000);
  assert.equal(file.loanAmountValue, 50_000);

  const asked = answerAskFoxFromFile("When will I close?", file);
  assert.equal(asked.log.fileId, file.fileId);
  assert.equal(asked.log.wroteFile, false);
  assert.ok(asked.log.factsUsed.includes("file.fileId"));
  const lastLine = workspaceAskFoxFileReply("When will I close?", file);
  assert.ok(!isGovernmentIdInviteLine(lastLine.text));
  assert.deepEqual(labels(lastLine.actions), THREE);
  assert.equal(labels(lastLine.actions).at(-1), "Request human");

  const storedInviteChips: FoxAction[] = [
    { id: "upload-this", label: "Upload this", event: "bubble" },
    { id: "skip", label: "Skip", event: "bubble" },
  ];
  const lastLineFileAnswer: FoxMessage[] = [
    { id: "id-invite", role: "fox", text: ID_INVITE, actions: storedInviteChips },
    { id: "ask-fox", role: "fox", text: lastLine.text, actions: finishLineActions(file) },
  ];
  const chips = lastLineChips(lastLineFileAnswer, file);
  assert.deepEqual(chips, THREE);
  assert.equal(chips.at(-1), "Request human");
  assert.ok(!chips.includes("Upload this"));
  assert.ok(!chips.includes("Skip"));
  assert.ok(!isGovernmentIdInviteLine(lastFoxTurn(lastLineFileAnswer)?.text));

  const idInviteLast: FoxMessage[] = [
    { id: "id-invite", role: "fox", text: ID_INVITE, actions: storedInviteChips },
  ];
  const offLast = withStaleIdInviteOffLastLine(idInviteLast, file);
  assert.ok(!isGovernmentIdInviteLine(lastFoxTurn(offLast)?.text));
  const standingChips = lastLineChips(offLast, file);
  assert.deepEqual(standingChips, THREE);
  assert.equal(standingChips.at(-1), "Request human");
  assert.ok(!standingChips.includes("Upload this"));
  assert.ok(!standingChips.includes("Skip"));

  console.log(
    "71 PASS signed-in File · Ask Fox File answer · last-line chips Ask Fox · Upload more · Request human · pad matches File row · received paper not next ask",
  );
}

main();
