/**
 * After one bank/statement (or Skip), the live gate is Looks right.
 * Prior address / 2-year housing is Still useful only — never the live ask.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { applyExtractedFields, skipCurrentInvite, stillUsefulSection } from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal } from "../components/fox/completeness";
import { nextFoxAsk, workspacePrompt } from "../components/fox/workspace";
import { WHERE_BEFORE_ASK } from "../components/fox/fileHistory";
import type { FoxIntakeDraft } from "../components/fox/types";

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
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
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
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    skippedClasses: ["government_id"],
    facts: {
      qualifying_income: {
        field: "qualifying_income",
        value: "9867",
        source: "document",
        confirmed: true,
      },
      employer_name: {
        field: "employer_name",
        value: "Harbor Pacific Design Inc",
        source: "document",
        confirmed: true,
      },
      present_address: {
        field: "present_address",
        value: "4419 Filbert St",
        source: "document",
        confirmed: true,
      },
    },
    employmentHistory: [{ label: "Harbor Pacific Design Inc", from: "2020-01", to: "present" }],
    addressHistory: [{ label: "4419 Filbert St", to: "present" }],
  };
}

function assertNotPriorAddressAsk(draft: FoxIntakeDraft, label: string) {
  const ask = nextFoxAsk(draft);
  assert.notEqual(ask.text, WHERE_BEFORE_ASK, `${label} live ask was prior address`);
  assert.doesNotMatch(ask.text, /Where did you live before this/, `${label} spoke prior address`);
  assert.notEqual(workspacePrompt(draft), "former-history", `${label} queued former-history`);
}

function assertLooksRightGate(draft: FoxIntakeDraft, label: string) {
  assertNotPriorAddressAsk(draft, label);
  const ask = nextFoxAsk(draft);
  assert.ok(
    canLooksRight(draft) ||
      (ask.actions ?? []).some((item) => item.label === "Looks right") ||
      /Looks right|Proceed/i.test(ask.text),
    `${label} next was not Looks right / Proceed — ${ask.text}`,
  );
  if (workspacePrompt(draft) === "review") {
    assert.ok(
      (ask.actions ?? []).some((item) => item.label === "Looks right"),
      `${label} Looks right gate missing chip — ${ask.text} | ${(ask.actions ?? []).map((item) => item.label).join(" · ")}`,
    );
  }
}

function main() {
  const pending = applyExtractedFields(sketch(), {
    extractClass: "bank_statement",
    confidence: 0.94,
    fields: {
      institution: "Pacific Coast",
      period_end: "2026-07-31",
      ending_balance: "84220",
      present_address: "4419 Filbert St",
    },
  });
  const used = resolveProposal(pending.draft, "accept");
  assertNotPriorAddressAsk(used, "one statement Use this");
  assert.ok(
    stillUsefulSection(used)?.items.some((item) => item.label === "Prior address"),
    "prior address missing from Still useful after one statement",
  );
  const afterSecondSkip = { ...used, secondBankStatementSkipped: true };
  assertLooksRightGate(afterSecondSkip, "one statement then second skipped");
  assert.ok(
    stillUsefulSection(afterSecondSkip)?.items.some((item) => item.label === "Prior address"),
    "prior address missing from Still useful after statement settle",
  );

  const skipped = skipCurrentInvite(sketch());
  assertNotPriorAddressAsk(skipped, "statement Skip");
  assert.ok(
    canLooksRight(skipped) ||
      (nextFoxAsk(skipped).actions ?? []).some((item) => item.label === "Looks right") ||
      /Looks right|Proceed|statement|contract/i.test(nextFoxAsk(skipped).text),
    `statement Skip next was not session-one — ${nextFoxAsk(skipped).text}`,
  );

  console.log("assert-looks-right-after-statement: Looks right after one statement / Skip");
}

main();
