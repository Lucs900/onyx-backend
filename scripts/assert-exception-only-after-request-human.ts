/**
 * Ticket 71. Exception sentence only after Request human, once.
 * Auto-escalated File stays in_queue until that tap. Ask Fox reads the File.
 * Do not rewrite history. Do not write wage, employer, QI, or borrower.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { ASK_FOX_NO_CLOSE_LINE, askFoxAnswerIsClean } from "../components/fox/askFoxFile";
import { withLinkedAccount } from "../components/fox/account";
import {
  MOTION_COPY,
  applyEscalateMotion,
  applyNudgeMotion,
  finishLineActions,
  humanRequested,
  motionStatusCopy,
  waitingOnCopy,
} from "../components/fox/motion";
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
  nextFoxAsk,
  previewFacts,
  workspaceAskFoxFileReply,
  workspaceReply,
  writePurchasePrice,
} from "../components/fox/workspace";
import type { FoxIntakeDraft, ReceivedDoc } from "../components/fox/types";

const THREE = ["Ask Fox", "Upload more", "Request human"];
const PARKED =
  "A licensed originator is on this exception. I stay here. I’ll put their result in this thread.";

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

function autoEscalatedFile(): FoxIntakeDraft {
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
              events: [
                { kind: "proceed", text: "Proceed — one review WorkItem open." },
                { kind: "nudge", text: MOTION_COPY.threeNudges },
              ],
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
                employer_name: fact("employer_name", "INNOVATION PARTNERS LLC", "document"),
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
    },
    "acct_sa43sbs3dt",
  );
}

function main() {
  const start = autoEscalatedFile();
  assert.equal(start.motion, "escalated");
  assert.equal(start.originatorRequested, true);
  assert.equal(humanRequested(start), false);
  assert.equal(motionStatusCopy(start), "in_queue");
  assert.notEqual(motionStatusCopy(start), "gathering");
  assert.notEqual(motionStatusCopy(start), "needs_you");
  assert.equal(waitingOnCopy(start), "borrower");
  assert.notEqual(waitingOnCopy(start), "You");
  assert.notEqual(waitingOnCopy(start), "ONYX");

  const pad = previewFacts(start);
  assert.equal(pad.find((item) => item.id === "status")?.value, "in_queue");
  assert.equal(pad.find((item) => item.id === "waiting")?.value, "borrower");
  assert.equal(start.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");
  assert.equal(start.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.match(start.employmentHistory?.[0]?.label ?? "", /INNOVATION PARTNERS LLC/);
  assert.equal(start.borrowerName, "Raymond Chi Lee");

  const standing = nextFoxAsk(start);
  assert.notEqual(standing.text, PARKED);
  assert.notEqual(standing.text, MOTION_COPY.escalated);
  assert.deepEqual(labels(standing.actions), THREE);
  assert.equal(labels(standing.actions).at(-1), "Request human");

  const askChip = workspaceReply("Ask Fox", start);
  assert.ok(askChip);
  assert.notEqual(askChip.text, MOTION_COPY.escalated);
  assert.notEqual(askChip.text, PARKED);
  assert.deepEqual(labels(askChip.actions), THREE);

  const asked = workspaceAskFoxFileReply("When will I close?", start);
  assert.equal(asked.text, ASK_FOX_NO_CLOSE_LINE);
  assert.ok(askFoxAnswerIsClean(asked.text));
  assert.doesNotMatch(asked.text, /licensed originator is on this exception/i);
  assert.doesNotMatch(asked.text, /still open/i);
  assert.deepEqual(labels(asked.actions), THREE);

  const human = workspaceReply("Request human", start);
  assert.equal(human?.text, MOTION_COPY.escalated);
  assert.equal(human?.text, PARKED);
  assert.equal(human?.capture?.field, "talk-originator");
  assert.deepEqual(labels(human?.actions ?? finishLineActions(start)), THREE);

  const after = applyEscalateMotion(start);
  assert.equal(humanRequested(after), true);
  assert.equal(motionStatusCopy(after), "escalated");
  assert.equal(after.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");
  assert.equal(after.facts?.[QUALIFYING_METHOD_FIELD]?.value, W2_BOX5_MONTHLY_NOTE);
  assert.equal(after.borrowerName, "Raymond Chi Lee");
  const again = nextFoxAsk(after);
  assert.notEqual(again.text, MOTION_COPY.escalated);
  assert.deepEqual(labels(again.actions), THREE);
  assert.equal(labels(again.actions).at(-1), "Request human");

  const thirdNudge = applyNudgeMotion(
    {
      ...start,
      motion: "in_queue",
      originatorRequested: false,
      events: [{ kind: "proceed", text: "Proceed — one review WorkItem open." }],
      workItems: [
        {
          id: "review-1",
          kind: "review",
          state: "open",
          openedAt: "2026-09-29T16:00:00.000Z",
          nudgeCount: 2,
        },
      ],
    },
    { force: true },
  );
  assert.equal(thirdNudge.threadLine, MOTION_COPY.threeNudges);
  assert.equal(thirdNudge.draft.motion, "in_queue");
  assert.equal(humanRequested(thirdNudge.draft), false);
  assert.equal(motionStatusCopy(thirdNudge.draft), "in_queue");

  console.log("assert-exception-only-after-request-human: exception only after Request human, once");
}

main();
