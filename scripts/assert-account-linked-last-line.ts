/**
 * 61b2 — last Fox line on a linked File always carries Ask Fox · Upload more · Request human.
 * Keyed on last line + linked account, never one specific line.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import { applyLooksRightMotion, applyNudgeMotion, applyProceedMotion, MOTION_COPY } from "../components/fox/motion";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writeFirstLien, writeHelocLine, withHelocToolQuote } from "../components/fox/heloc";
import {
  deskStripActions,
  writePurchasePrice,
} from "../components/fox/workspace";
import {
  ACCOUNT_FILE_YOURS,
  ACCOUNT_SAVE_ASK,
  CREATE_ACCOUNT_LABEL,
  accountHeaderActions,
  accountSaveWallActions,
  accountSideActions,
  accountWorkspaceReply,
  applyAccountCapture,
  applyAccountCreated,
  applyAccountLetterOpened,
  hasLinkedAccount,
  isLiveCreateAccountAction,
  linkedLastLineActions,
} from "../components/fox/account";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function fox(id: string, text: string): FoxMessage {
  return { id, role: "fox", text };
}

function helocLinked(guestProceeded?: boolean): FoxIntakeDraft {
  let draft = {
    ...emptyDraft(),
    path: "acr" as const,
    productIntent: "heloc" as const,
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectCity: "San Francisco",
    subjectState: "CA",
  };
  draft = writeHelocLine(writeFirstLien(writePurchasePrice(draft, 500_000), 400_000), 50_000);
  draft = applyCouponChoice(withHelocToolQuote(draft), "this");
  draft = { ...draft, incomeAsked: true, incomeType: { ...emptyDraft().incomeType, value: "w2" } };
  draft = writeWhoOnLoan(draft, "just-me");
  draft = skipMonthlyDebts(draft);
  draft = skipWageDocs(draft);
  draft = skipCurrentInvite(draft);
  draft = applyLooksRightMotion(draft);
  const queued = applyProceedMotion(
    applyAccountLetterOpened(
      applyAccountCreated(draft, { accountId: "acct_61b2", channel: "email", fileId: "file_61b2" }),
    ),
  );
  return guestProceeded === undefined ? queued : { ...queued, guestProceeded };
}

function main() {
  const three = ["Ask Fox", "Upload more", "Request human"];
  const noProceed = helocLinked(false);
  assert.equal(hasLinkedAccount(noProceed), true);
  assert.ok(!noProceed.guestProceeded);

  const handoff = applyNudgeMotion(noProceed, { force: true });
  assert.match(handoff.threadLine ?? "", /I pushed this/);
  const handoffThread: FoxMessage[] = [
    fox("yours", ACCOUNT_FILE_YOURS),
    fox("queue", MOTION_COPY.in_queue),
    fox("nudge", MOTION_COPY.nudge),
  ];
  assert.deepEqual(labels(deskStripActions(handoffThread, handoff.draft)), three);
  assert.deepEqual(labels(linkedLastLineActions(handoff.draft)), three);

  const uploadThread: FoxMessage[] = [
    fox("yours", ACCOUNT_FILE_YOURS),
    fox("got", "W-2 · received."),
  ];
  assert.deepEqual(labels(deskStripActions(uploadThread, noProceed)), three);

  const humanThread: FoxMessage[] = [
    fox("yours", ACCOUNT_FILE_YOURS),
    fox("human", "A licensed originator is on this exception. I stay here."),
  ];
  assert.deepEqual(labels(deskStripActions(humanThread, noProceed)), three);

  const yoursThread: FoxMessage[] = [fox("yours", ACCOUNT_FILE_YOURS)];
  const yoursOpened = { ...noProceed, guestProceeded: true };
  assert.deepEqual(labels(deskStripActions(yoursThread, yoursOpened)), three);

  const emptyLinked: FoxIntakeDraft = {
    ...emptyDraft(),
    path: "acr",
    workspaceFlow: true,
    accountId: "acct_empty_61b2",
  };
  const emptyThread: FoxMessage[] = [fox("yours", ACCOUNT_FILE_YOURS)];
  const emptyChips = labels(deskStripActions(emptyThread, emptyLinked));
  assert.ok(emptyChips.includes("Buy") || emptyChips.includes("HELOC") || emptyChips.length > 0);
  assert.ok(!emptyChips.includes(CREATE_ACCOUNT_LABEL));
  assert.ok(!deskStripActions(emptyThread, emptyLinked).some(isLiveCreateAccountAction));

  const guest = { ...emptyDraft(), path: "acr" as const, accountSaveAsk: true, guestProceeded: true };
  assert.deepEqual(labels(accountSaveWallActions(guest)).slice(0, 3), [
    CREATE_ACCOUNT_LABEL,
    "Log in",
    "Not now",
  ]);
  assert.equal(accountWorkspaceReply("Create account", guest)?.capture?.field, "create-account");

  assert.deepEqual(labels(accountSideActions(noProceed)), []);
  assert.deepEqual(labels(accountHeaderActions(noProceed)), []);
  assert.ok(!deskStripActions(handoffThread, handoff.draft).some(isLiveCreateAccountAction));
  assert.equal(accountWorkspaceReply("Create account", noProceed), null);
  const afterClick = applyAccountCapture(noProceed, { field: "create-account" });
  assert.equal(afterClick.accountAsk, noProceed.accountAsk);
  assert.equal(afterClick.accountSaveAsk, noProceed.accountSaveAsk);

  const saveThread: FoxMessage[] = [fox("save", ACCOUNT_SAVE_ASK)];
  assert.ok(!labels(deskStripActions(saveThread, noProceed)).includes(CREATE_ACCOUNT_LABEL));

  const workspace = readFileSync(new URL("../components/fox/workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /export function deskStripActions/);
  assert.match(workspace, /linkedLastLineActions/);
  assert.match(workspace, /isLiveCreateAccountAction/);
  assert.match(workspace, /deskStripActionsComputed/);

  const leftover = readFileSync(new URL("../scripts/assert-account-resume-leftover.ts", import.meta.url), "utf8");
  assert.match(leftover, /export function intakeAskAlreadyAnswered/);
  assert.match(leftover, /export function isLoginDoorUserBubble/);
  assert.match(leftover, /export function hasAccountHeader/);
}

main();
console.log("assert-account-linked-last-line: last Fox line + linked → Ask Fox · Upload more · Request human");
