/**
 * Income Skip + ID Skip + one statement → Proceed in_queue.
 * Still useful: ID, W-2/paystub, second statement, purchase contract.
 * No tax return. Next 1–3 only. No sketch · X of 32 on the File.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { previewFacts } from "../components/fox/workspace";
import { fileCompleteness } from "../components/fox/completeness";
import {
  documentedStillUsefulIds,
  completeness as storeCompleteness,
} from "../lib/guidelines/conventional";
import {
  completenessFileFromDraft,
  layer2Plan,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import type { FoxIntakeDraft } from "../components/fox/types";

function skipIncomeProceedDraft(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    sampleAccepted: true,
    motion: "in_queue",
    nextActor: "ONYX",
    workspaceDraftStatus: "with-originator",
    phase: "confirmed",
    incomeAsked: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    valueAsked: true,
    amountAsked: true,
    otherReoAsked: true,
    statedOtherReo: "none",
    subjectAddress: "14 Oak Street",
    subjectAddressAsked: true,
    citizenshipAsked: true,
    bankStatementAsked: true,
    skippedClasses: ["government_id"],
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
    facts: {
      institution: {
        field: "institution",
        value: "Pacific Coast Bank",
        source: "document",
        confirmed: true,
      },
      ending_balance: {
        field: "ending_balance",
        value: "84220.15",
        source: "document",
        confirmed: true,
      },
    },
    events: [
      {
        id: "proceed-1",
        at: "2026-09-02T00:00:00.000Z",
        kind: "proceed",
        text: "Proceed — review work item opened. Next = ONYX.",
      },
    ],
  };
}

const draft = skipIncomeProceedDraft();
const section = stillUsefulSection(draft);
assert.ok(section);
assert.equal(section.empty, false);
assert.ok(section.items.length >= 1 && section.items.length <= 3, "Still useful shows next 1–3 only");
const labels = section.items.map((item) => item.label);
const blob = labels.join(" · ");
assert.doesNotMatch(blob, /tax return|latest return|prior-year return|return/i);
assert.ok(labels.some((label) => /government ID/i.test(label)), blob);
assert.ok(labels.some((label) => /paystub|W-2/i.test(label)), blob);

const pool = documentedStillUsefulIds("buy", completenessFileFromDraft(draft)).concat(
  storeCompleteness("buy", completenessFileFromDraft(draft)).stillUseful,
);
const poolText = [...section.items.map((item) => `${item.id} ${item.label}`), ...pool].join(" · ");
assert.doesNotMatch(poolText, /tax_return|latest return|prior-year return|tax return/i);
assert.ok(pool.includes("government_id") || labels.some((label) => /government ID/i.test(label)));
assert.ok(pool.includes("paystub") || pool.includes("w2") || /paystub|W-2/i.test(blob));
assert.ok(pool.includes("purchase_contract"));
assert.ok(layer2Plan(draft).some((item) => item.id === "second-bank-statement" || /second bank statement/i.test(item.label)));
assert.ok(layer2Plan(draft).some((item) => item.id === "purchase_contract"));
assert.ok(!layer2Plan(draft).some((item) => /return/i.test(`${item.id} ${item.label}`)));

const facts = previewFacts(draft);
assert.ok(facts.every((fact) => fact.id !== "file"));
assert.ok(
  facts.every((fact) => !/sketch · \d+ of \d+|documented · \d+ of \d+| of 32/.test(`${fact.value} ${fact.note ?? ""}`)),
);
const copy = fileCompleteness(draft)?.copy ?? "";
assert.match(copy, / of \d+/);
assert.ok(
  facts.every((fact) => !fact.value.includes(copy) && !(fact.note ?? "").includes(copy)),
  "borrower File does not show X of 32",
);

console.log("still-useful skip-income PASS", labels.join(" · "));
