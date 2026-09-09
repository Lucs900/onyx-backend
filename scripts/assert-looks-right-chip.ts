/**
 * Looks right gate keeps a Looks right chip. Typed yes still confirms.
 * Not a new File question. Do not regress Income-Skip Still useful or Harbor W-2 order.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { paintedFoxActions } from "../components/fox/liveCoupon";
import { applyLooksRightMotion } from "../components/fox/motion";
import {
  canLooksRight,
  isLooksRightAskText,
  looksRightAskActions,
} from "../components/fox/completeness";
import { nextDocInvite, stillUsefulSection } from "../components/fox/fileWrite";
import {
  LOOKS_RIGHT_COMPLETE_ASK,
  nextFoxAsk,
  skipIncomeAsk,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function sketch(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_000_000,
    downPaymentAmount: 200_000,
    loanAmountValue: 800_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "house",
    propertyTypeAsked: true,
    subjectAddress: "14 Oak Street, San Francisco, CA 94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
  };
}

function main() {
  const skipped = skipIncomeAsk(sketch());
  assert.equal(workspacePrompt(skipped), "review");
  assert.ok(canLooksRight(skipped));
  const ask = nextFoxAsk(skipped);
  assert.ok(isLooksRightAskText(ask.text));
  assert.equal(ask.text, LOOKS_RIGHT_COMPLETE_ASK);
  assert.deepEqual(
    (ask.actions ?? []).map((item) => item.label),
    ["These numbers look right?", "Needs a correction"],
  );
  assert.deepEqual(
    looksRightAskActions().map((item) => item.label),
    ["These numbers look right?", "Needs a correction"],
  );

  const bare: FoxMessage = {
    id: "looks-right-bare",
    role: "fox",
    text: LOOKS_RIGHT_COMPLETE_ASK,
  };
  assert.deepEqual(
    (paintedFoxActions(bare, skipped, true) ?? []).map((item) => item.label),
    ["These numbers look right?", "Needs a correction"],
    "Looks right chips restore when the stored turn has no actions",
  );

  const openUseThis: FoxMessage = {
    id: "looks-right-use-this",
    role: "fox",
    text: LOOKS_RIGHT_COMPLETE_ASK,
    actions: [
      { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
      { id: "looks-right", label: "These numbers look right?", event: "bubble", capture: { field: "confirm-draft" } },
    ],
  };
  assert.ok(
    !(
      paintedFoxActions(
        openUseThis,
        {
          ...skipped,
          pendingProposal: {
            field: "employer_name",
            value: "Harbor Pacific Design Inc",
            label: "Employer",
            kind: "document",
          },
        },
        true,
      ) ?? []
    ).some((item) => item.label === "These numbers look right?" || item.label === "Looks right"),
    "Looks right must stay hidden while Use this is open",
  );

  const typedYes = workspaceReply("yes", skipped);
  assert.equal(typedYes?.capture?.field, "confirm-draft");
  const afterYes = applyLooksRightMotion(skipped);
  assert.equal(afterYes.sampleAccepted, true);
  const useful = (stillUsefulSection(afterYes)?.items ?? []).map((item) => item.label);
  assert.ok(useful.includes("Government ID"));
  assert.ok(useful.includes("How income is earned"));
  assert.ok(!useful.some((item) => /paystub|W-2|tax return|latest return/i.test(item)));

  const typedChip = workspaceReply("These numbers look right?", skipped);
  assert.equal(typedChip?.capture?.field, "confirm-draft");

  const w2AfterConfirm = {
    ...sketch(),
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" as const },
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    facts: {
      employer_name: {
        field: "employer_name",
        value: "Harbor Pacific Design Inc",
        source: "document",
        confirmed: true,
      },
    },
    employmentHistory: [{ label: "Harbor Pacific Design Inc", from: "2020-01", to: "present" }],
    documents: [
      {
        slot: "w2" as const,
        name: "03-w2-2025-jordan-hale.pdf",
        type: "application/pdf",
        size: 12,
        receivedAt: "2026-09-07T00:00:00.000Z",
        status: "extracted" as const,
        extractClass: "w2" as const,
      },
    ],
  };
  assert.equal(nextDocInvite(w2AfterConfirm), "paystub");
  assert.notEqual(workspacePrompt(w2AfterConfirm), "review");
  assert.doesNotMatch(nextFoxAsk(w2AfterConfirm).text, /Looks right, or change a line|These numbers look right/i);

  console.log("assert-looks-right-chip: Looks right chip on the gate; typed yes still works");
}

main();
