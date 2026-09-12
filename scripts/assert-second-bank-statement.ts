/**
 * After Use this on the first bank statement, offer the second once.
 * Skip leaves the second statement on Still useful. Then the contract ask may run.
 * One statement does not count as two. Do not invent a second Assets row.
 */
import assert from "node:assert/strict";
import { resolveProposal } from "../components/fox/completeness";
import {
  applyExtractedFields,
  DOC_INVITE_COPY,
  layer2Plan,
  nextDocInvite,
  secondBankStatementInviteCopy,
  skipCurrentInvite,
} from "../components/fox/fileWrite";
import { applyCapture, emptyDraft, getFoxDraft, loadIntakeDraft } from "../components/fox/store";
import {
  nextFoxAsk,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

const SECOND_ASK = "Pacific Coast Bank is in. A second recent statement helps. Skip is fine.";

function readyFile(overrides: Partial<FoxIntakeDraft> = {}): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    downPaymentAmount: 240_000,
    valueAsked: true,
    amountAsked: true,
    otherReoAsked: true,
    statedOtherReo: "none",
    propertyType: "sfr",
    propertyTypeAsked: true,
    citizenshipAsked: true,
    agencyDeclarations: { citizenship: "us_citizen" },
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    stubExtractAccepted: true,
    emailSkipped: true,
    skippedClasses: ["government_id"],
    subjectAddress: "94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
    liveCouponSettled: true,
    documents: [
      {
        slot: "bank",
        name: "05-bank-statement-pacific-coast-jul-2026.pdf",
        type: "application/pdf",
        size: 833,
        receivedAt: "2026-09-02T00:00:00.000Z",
        status: "extracted",
        extractClass: "bank_statement",
      },
    ],
    ...overrides,
  };
}

const pending = applyExtractedFields(readyFile(), {
  extractClass: "bank_statement",
  confidence: 0.95,
  fields: {
    institution: "Pacific Coast Bank",
    ending_balance: "84220.15",
    account_last4: "4419",
  },
});
assert.equal(pending.draft.pendingProposal?.field, "statedAvailableAssets");
const confirm = nextFoxAsk(pending.draft);
assert.match(confirm.text, /Pacific Coast Bank/);
assert.match(confirm.text, /4419/);
assert.match(confirm.text, /\$84,220\.15/);
assert.match(confirm.text, /Use this/);

const used = resolveProposal(pending.draft, "accept");
assert.equal(used.facts?.institution?.value, "Pacific Coast Bank");
assert.equal(used.facts?.ending_balance?.value, "84220.15");
assert.equal(used.facts?.account_last4?.value, "4419");
assert.equal(used.assetAccounts?.length ?? 0, 1);
assert.equal(used.assetAccounts?.[0]?.last4, "4419");
assert.equal(nextDocInvite(used), "second_bank_statement");
assert.notEqual(nextDocInvite(used), "purchase_contract");
assert.equal(workspacePrompt(used), "documents");
assert.equal(secondBankStatementInviteCopy(used), SECOND_ASK);
assert.equal(nextFoxAsk(used).text, SECOND_ASK);
assert.deepEqual(
  (nextFoxAsk(used).actions ?? []).map((item) => item.label),
  ["Upload this", "Skip"],
);
assert.ok(!(nextFoxAsk(used).actions ?? []).some((item) => item.label === "Not yet" || item.label === "Proceed"));
assert.doesNotMatch(nextFoxAsk(used).text, /purchase contract|Two recent statements/i);

const useThisReply = workspaceReply("Use this", pending.draft);
assert.equal(useThisReply?.capture?.field, "accept-proposal");
assert.equal(useThisReply?.text, SECOND_ASK);
assert.deepEqual((useThisReply?.actions ?? []).map((item) => item.label), ["Upload this", "Skip"]);

const skipped = skipCurrentInvite(used);
assert.equal(skipped.secondBankStatementSkipped, true);
assert.ok(!(skipped.skippedClasses ?? []).includes("bank_statement"));
assert.ok(
  layer2Plan(skipped).some((item) => item.id === "second-bank-statement" || /second bank statement/i.test(item.label)),
);
assert.equal(nextDocInvite(skipped), "purchase_contract");
assert.equal(nextFoxAsk(skipped).text, DOC_INVITE_COPY.purchase_contract);
assert.equal(skipped.assetAccounts?.length ?? 0, 1);

loadIntakeDraft(used);
applyCapture({ field: "skip-docs" });
const skipChip = getFoxDraft();
assert.equal(skipChip.secondBankStatementSkipped, true);
assert.equal(nextDocInvite(skipChip), "purchase_contract");
assert.equal(nextFoxAsk(skipChip).text, DOC_INVITE_COPY.purchase_contract);
assert.doesNotMatch(nextFoxAsk(skipChip).text, /second recent statement|Pacific Coast Bank is in/);
assert.ok(
  layer2Plan(skipChip).some((item) => item.id === "second-bank-statement" || /second bank statement/i.test(item.label)),
);

const afterLooks = resolveProposal(
  applyExtractedFields(readyFile({ sampleAccepted: true, subjectAddress: "14 Oak Street" }), {
    extractClass: "bank_statement",
    confidence: 0.95,
    fields: {
      institution: "Pacific Coast Bank",
      ending_balance: "84220.15",
      account_last4: "4419",
    },
  }).draft,
  "accept",
);
assert.equal(nextDocInvite(afterLooks), "second_bank_statement");
assert.equal(nextFoxAsk(afterLooks).text, SECOND_ASK);
assert.equal(nextDocInvite(skipCurrentInvite(afterLooks)), "purchase_contract");
assert.equal(afterLooks.assetAccounts?.length ?? 0, 1);

const twoStatements = resolveProposal(
  applyExtractedFields(
    readyFile({
      documents: [
        ...(readyFile().documents ?? []),
        {
          slot: "bank",
          name: "05-bank-statement-pacific-coast-jun-2026.pdf",
          type: "application/pdf",
          size: 800,
          receivedAt: "2026-09-02T00:01:00.000Z",
          status: "extracted",
          extractClass: "bank_statement",
        },
      ],
    }),
    {
      extractClass: "bank_statement",
      confidence: 0.95,
      fields: {
        institution: "Pacific Coast Bank",
        ending_balance: "84220.15",
        account_last4: "4419",
      },
    },
  ).draft,
  "accept",
);
assert.notEqual(nextDocInvite(twoStatements), "second_bank_statement");
assert.equal(nextDocInvite(twoStatements), "purchase_contract");
assert.equal((twoStatements.assetAccounts?.length ?? 0) <= 1, true);

console.log("second-bank-statement PASS");
