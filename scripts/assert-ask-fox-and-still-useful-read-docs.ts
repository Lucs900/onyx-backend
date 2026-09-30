/**
 * Ticket 72. Ask Fox and Still useful read File rows.
 * Payment from the pad. Papers-in from Docs. Phrase ban is not the mechanism.
 * Does not write File 38f1b63c. A fileId stamp is not a File read.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import {
  ASK_FOX_NO_CLOSE_LINE,
  answerAskFoxFromFile,
  askFoxAnswerFromFileRows,
} from "../components/fox/askFoxFile";
import { hasLinkedAccount, withLinkedAccount } from "../components/fox/account";
import { MOTION_COPY, applyEscalateMotion, finishLineActions, waitingOnCopy } from "../components/fox/motion";
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
  docsInDisplayLabels,
  docsInExtractClasses,
  stillUsefulSpokenItems,
} from "../components/fox/fileWrite";
import {
  deskStripActions,
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

const W2_NAME_ONLY: ReceivedDoc = {
  slot: "upload",
  name: "2025 W2 Ray.pdf",
  type: "application/pdf",
  size: 273841,
  receivedAt: "2026-09-29T16:24:36.060Z",
  status: "received",
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

function padDocsFile(documents: ReceivedDoc[]): FoxIntakeDraft {
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
              fileId: "file_72_pad_docs_rows",
              sampleAccepted: true,
              guestProceeded: true,
              looksRightHold: true,
              wageDocsAsked: true,
              wageBox5Asked: true,
              wageFrequencyAsked: true,
              wageStubAsked: true,
              skippedClasses: ["paystub"],
              documents,
              employmentHistory: [{ label: "INNOVATION PARTNERS LLC", to: "present" }],
              motion: "escalated",
              originatorRequested: true,
              nextActor: "ONYX",
              waitingOn: "onyx",
              events: [
                { kind: "proceed", text: "Proceed — one review WorkItem open." },
                { kind: "nudge", text: MOTION_COPY.nudge },
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
      "acct_72_pad_docs",
    ),
  );
}

function assertPadHold(file: FoxIntakeDraft) {
  const pad = previewFacts(file);
  const value = (id: string) => pad.find((item) => item.id === id)?.value ?? "";
  assert.equal(value("home"), "$500,000");
  assert.equal(value("first-lien"), "$400,000");
  assert.equal(value("line"), "$50,000");
  assert.equal(value("cltv"), "90.0%");
  assert.match(value("rate"), /8\.80%/);
  assert.match(value("rate"), /\$367/);
  assert.equal(value("borrower"), "Raymond Chi Lee");
  assert.match(value("qualifying"), /10,000/);
  assert.match(value("history-employment"), /INNOVATION PARTNERS LLC/);
  assert.equal(value("status"), "escalated");
  assert.equal(value("next"), "ONYX");
  assert.equal(value("waiting"), "ONYX");
  assert.equal(waitingOnCopy(file), "ONYX");
  assert.ok(!pad.some((item) => item.id === "close"));
}

function assertNoPhraseBanMechanism() {
  const askFoxSrc = readFileSync(new URL("../components/fox/askFoxFile.ts", import.meta.url), "utf8");
  const finish = askFoxSrc.slice(
    askFoxSrc.indexOf("function finishAnswer"),
    askFoxSrc.indexOf("export function answerAskFoxFromFile"),
  );
  assert.doesNotMatch(finish, /askFoxAnswerIsClean/);
  assert.doesNotMatch(finish, /banned\.stripped/);
  assert.doesNotMatch(finish, /MANTRA_BANNED/);
  const lastStaff = askFoxSrc.slice(
    askFoxSrc.indexOf("export function lastStaffFoxLine"),
    askFoxSrc.indexOf("type FilePaper"),
  );
  assert.doesNotMatch(lastStaff, /askFoxAnswerIsClean/);
  const spoken = askFoxSrc.slice(
    askFoxSrc.indexOf("export function isAskFoxFileSpokenLine"),
    askFoxSrc.indexOf("function fold"),
  );
  assert.doesNotMatch(spoken, /askFoxAnswerIsClean/);
  const alwaysSrc = readFileSync(new URL("../components/fox/AlwaysOnFox.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(alwaysSrc, /askFoxAnswerIsClean/);
  assert.match(alwaysSrc, /askFoxAnswerFromFileRows/);
  assert.doesNotMatch(alwaysSrc, /includes\("file\.fileId"\)/);
}

function main() {
  const file = padDocsFile([W2_DOC, ID_DOC]);
  assert.equal(hasLinkedAccount(file), true);
  assert.notEqual(file.fileId, LIVE_TEACHING_FILE);
  assert.equal(file.facts?.close_date?.value, undefined);

  const docs = docsInDisplayLabels(file);
  assert.ok(docs.includes("W-2 in"));
  assert.ok(docs.includes("ID in"));
  const inDocs = docsInExtractClasses(file);
  assert.equal(inDocs.has("w2"), true);
  assert.equal(inDocs.has("government_id"), true);
  assert.equal(inDocs.has("tax_return"), false);
  assert.equal(inDocs.has("paystub"), false);

  const useful = stillUsefulSpokenItems(file).map((item) => item.label);
  assert.ok(useful.some((label) => /1040/i.test(label)));
  assert.ok(useful.some((label) => /paystub/i.test(label)));
  assert.ok(!useful.some((label) => /W-2/i.test(label)));
  assert.ok(!useful.some((label) => /Government ID/i.test(label)));

  const close = answerAskFoxFromFile("When will I close?", file);
  assert.equal(close.text, ASK_FOX_NO_CLOSE_LINE);
  assert.equal(close.log.wroteFile, false);
  assert.ok(close.log.factsUsed.includes("file.closeDate.absent"));
  assert.ok(!close.log.factsUsed.includes("banned.stripped"));
  assert.equal(askFoxAnswerFromFileRows(close.log), true);
  assert.equal(
    askFoxAnswerFromFileRows({ factsUsed: ["file.fileId"], wroteFile: false }),
    false,
    "a file.fileId stamp is not a File read",
  );
  assert.notEqual(close.text, MOTION_COPY.nudge);
  assert.doesNotMatch(close.text, /I pushed this|licensed originator is on this exception/i);
  const lastLine = workspaceAskFoxFileReply("When will I close?", file);
  assert.equal(lastLine.text, ASK_FOX_NO_CLOSE_LINE);
  assert.deepEqual(labels(lastLine.actions), THREE);
  assert.equal(labels(lastLine.actions).at(-1), "Request human");

  const pay = answerAskFoxFromFile("What's my payment?", file);
  assert.equal(pay.log.wroteFile, false);
  assert.match(pay.text, /\$367/);
  assert.match(pay.text, /\$50,000/);
  assert.match(pay.text, /8\.80%/);
  assert.ok(pay.log.factsUsed.includes("pad.line"));
  assert.ok(pay.log.factsUsed.includes("pad.rate"));
  assert.ok(pay.log.factsUsed.includes("pad.io"));
  assert.equal(askFoxAnswerFromFileRows(pay.log), true);
  assert.doesNotMatch(pay.text, /I pushed this|licensed originator is on this exception/i);

  const w2Ask = answerAskFoxFromFile("Do you still need last year's W-2 on this file?", file);
  assert.equal(w2Ask.log.wroteFile, false);
  assert.ok(w2Ask.log.factsUsed.includes("pad.docs"));
  assert.ok(w2Ask.log.factsUsed.includes("documents.w2.received"));
  assert.ok(w2Ask.log.factsUsed.includes("docs.in.w2"));
  assert.equal(askFoxAnswerFromFileRows(w2Ask.log), true);
  assert.match(w2Ask.text, /^No\./);
  assert.match(w2Ask.text, /already on this File/);
  assert.doesNotMatch(w2Ask.text, /still open/);
  assert.notEqual(w2Ask.text, MOTION_COPY.nudge);

  const history: FoxMessage[] = [
    { id: "nudge", role: "fox", text: MOTION_COPY.nudge },
    { id: "close", role: "fox", text: lastLine.text, actions: finishLineActions(file) },
  ];
  assert.deepEqual(labels(deskStripActions(history, file)), THREE);

  const named = padDocsFile([W2_NAME_ONLY]);
  assert.notEqual(named.fileId, LIVE_TEACHING_FILE);
  assert.ok(docsInDisplayLabels(named).includes("W-2 in"));
  assert.equal(docsInExtractClasses(named).has("w2"), true);
  const namedUseful = stillUsefulSpokenItems(named).map((item) => item.label);
  assert.ok(!namedUseful.some((label) => /W-2/i.test(label)));
  const namedAsk = answerAskFoxFromFile("Do you still need last year's W-2 on this file?", named);
  assert.ok(namedAsk.log.factsUsed.includes("docs.in.w2"));
  assert.ok(namedAsk.log.factsUsed.includes("pad.docs"));
  assert.equal(namedAsk.log.wroteFile, false);
  assert.match(namedAsk.text, /already on this File/);
  assert.doesNotMatch(namedAsk.text, /still open/);

  assertPadHold(file);
  assert.equal(file.facts?.[QUALIFYING_INCOME_FIELD]?.value, "10000");
  assert.match(file.employmentHistory?.[0]?.label ?? "", /INNOVATION PARTNERS LLC/);
  assert.equal(file.borrowerName, "Raymond Chi Lee");
  assertNoPhraseBanMechanism();

  console.log(
    "72 PASS Ask Fox pad+Docs rows · no phrase ban · wroteFile false · W-2/ID not still open · Still useful 1040+paystub",
  );
}

main();
