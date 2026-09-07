/**
 * First-session Grok page-read slice.
 * Drop → page image → Grok → class schema only → confirm-before-write.
 * Printed Harbor fixtures stay confirm, not unread. Do not invent a paystub PDF.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIRST_SESSION_CLASSES,
  FIRST_SESSION_LOCKED_KEYS,
  applyExtractedFields,
  isBoxNumberAsDollars,
  isFirstSessionClass,
  lockFirstSessionFields,
} from "../components/fox/fileWrite";
import { resolveProposal } from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import { classifyAndExtract, FOX_GROK_MODEL } from "../lib/docs/extract";
import type { ExtractClass, FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const MATT_CSTC_STUB_CANDIDATES = [
  "scripts/fixtures/pay-matt-cstc-260422.pdf",
  "sample-docs/pay-matt-cstc-260422.pdf",
  "scripts/fixtures/PAY-MATT-CSTC-260422.pdf",
  "sample-docs/PAY MATT CSTC 260422.pdf",
];

export function mattCstcPaystubPath(): string | null {
  for (const rel of MATT_CSTC_STUB_CANDIDATES) {
    const path = join(root, rel);
    if (existsSync(path)) return path;
  }
  return null;
}

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on first-session printed fixtures");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on first-session printed fixtures");
  },
};

function sample(name: string) {
  return readFileSync(join(root, "sample-docs", name));
}

function sketch(): FoxIntakeDraft {
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
    subjectAddress: "14 Oak Street, San Francisco, CA 94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
  };
}

function noSecrets(fields: Record<string, string>) {
  const blob = JSON.stringify(fields);
  assert.doesNotMatch(blob, /\b\d{3}-\d{2}-\d{4}\b/);
  assert.doesNotMatch(blob, /\bssn\b/i);
  assert.doesNotMatch(blob, /routing/i);
}

async function read(
  name: string,
  hint: ExtractClass | null,
  bytes = sample(name),
) {
  return classifyAndExtract(bytes, "application/pdf", deadVision, hint, name);
}

function confirmEmptyUntilUseThis(
  extractClass: ExtractClass,
  fields: Record<string, string>,
) {
  const proposed = applyExtractedFields(sketch(), {
    extractClass,
    confidence: 0.94,
    fields,
  });
  noSecrets(fields);
  return proposed;
}

async function main() {
  assert.equal(FOX_GROK_MODEL, "grok-3");
  assert.deepEqual([...FIRST_SESSION_CLASSES], [
    "government_id",
    "w2",
    "paystub",
    "bank_statement",
    "purchase_contract",
    "tax_return",
  ]);
  assert.ok(isFirstSessionClass("w2"));
  assert.equal(isFirstSessionClass("mortgage_statement"), false);

  const crossed = lockFirstSessionFields("paystub", {
    employer_name: "CSTC",
    medicare_wages: "36460.08",
    purchase_price: "800000",
    full_name: "Matthew Castaneda",
    ssn: "123-45-6789",
  });
  assert.equal(crossed.employer_name, "CSTC");
  assert.equal(crossed.medicare_wages, undefined);
  assert.equal(crossed.purchase_price, undefined);
  assert.equal(crossed.full_name, undefined);
  assert.deepEqual(lockFirstSessionFields("mortgage_statement", { unpaid_principal: "1" }), {});

  const id = await read("01-ca-id-jordan-hale.pdf", "government_id");
  assert.equal(id.extractClass, "government_id");
  assert.notEqual(id.failed, true);
  assert.match(id.fields.full_name ?? "", /Jordan Hale/i);
  assert.doesNotMatch(JSON.stringify(id.fields), /[A-Z]\d{7}/);
  const idCard = confirmEmptyUntilUseThis("government_id", { full_name: id.fields.full_name ?? "" });
  assert.notEqual(idCard.draft.contact.fullName?.confirmed, true);
  const idUsed = resolveProposal(idCard.draft, "accept");
  assert.match(idUsed.contact.fullName?.value ?? idUsed.borrowerName ?? "", /Jordan Hale/i);

  const adp = join(root, "scripts/fixtures/27-w2-2025-adp-matthew-castaneda.pdf");
  assert.ok(existsSync(adp), "ADP W-2 fixture missing");
  const w2 = await classifyAndExtract(
    readFileSync(adp),
    "application/pdf",
    deadVision,
    "w2",
    "27-w2-2025-adp-matthew-castaneda.pdf",
  );
  assert.equal(w2.extractClass, "w2");
  const box5 = w2.fields.medicare_wages ?? w2.fields.box5 ?? "";
  assert.ok(!isBoxNumberAsDollars(box5));
  assert.match(box5, /36460\.08/);
  assert.match(w2.fields.employer_name ?? "", /Comprehensive Skills Training/i);

  const stub = await read("07-paystub-biweekly-loud.pdf", "paystub");
  assert.equal(stub.extractClass, "paystub");
  assert.notEqual(stub.failed, true);
  assert.match(stub.fields.employer_name ?? "", /Harbor Pacific Design Inc/i);
  assert.ok(stub.fields.gross_period || stub.fields.pay_period_end);
  confirmEmptyUntilUseThis("paystub", {
    employer_name: stub.fields.employer_name ?? "",
    gross_period: stub.fields.gross_period ?? "",
    pay_period_end: stub.fields.pay_period_end ?? "",
    pay_frequency: stub.fields.pay_frequency ?? "",
    ytd_gross: stub.fields.ytd_gross ?? "",
  });

  const bank = await read("05-bank-statement-pacific-coast-jul-2026.pdf", "bank_statement");
  assert.equal(bank.extractClass, "bank_statement");
  assert.notEqual(bank.failed, true);
  assert.ok(bank.fields.institution || bank.fields.ending_balance);
  assert.notEqual(bank.fields.ending_balance, "7");
  assert.doesNotMatch(JSON.stringify(bank.fields), /\b\d{8,17}\b/);

  const contract = await read("02-purchase-contract-valencia.pdf", "purchase_contract");
  assert.equal(contract.extractClass, "purchase_contract");
  assert.notEqual(contract.failed, true);
  assert.match(contract.fields.property_address ?? "", /1840 Valencia/i);
  assert.doesNotMatch(contract.fields.property_address ?? "", /^94123$/);
  assert.ok(contract.fields.purchase_price);

  const tax = await read("11-1040-schedule-c-2025-hale-design.pdf", "tax_return");
  assert.equal(tax.extractClass, "tax_return");
  assert.notEqual(tax.failed, true);
  assert.ok(
    tax.fields.schedule_c_net_profit ||
      tax.fields.k1_ordinary_income ||
      tax.fields.return_kind,
  );

  const unread = await read(
    "government-id-no-text-layer.pdf",
    "other",
    readFileSync(join(root, "scripts/fixtures/government-id-no-text-layer.pdf")),
  );
  assert.equal(unread.failed, true);
  assert.deepEqual(unread.fields, {});

  const matt = mattCstcPaystubPath();
  if (!matt) {
    console.log(
      "assert-first-session-page-read: Matthew CSTC paystub not dropped — hook only " +
        MATT_CSTC_STUB_CANDIDATES.join(" | "),
    );
  } else {
    const mattRead = await classifyAndExtract(
      readFileSync(matt),
      "application/pdf",
      deadVision,
      "paystub",
      matt.split("/").pop(),
    );
    assert.notEqual(mattRead.failed, true, "PAY MATT CSTC 260422 could not read");
    assert.equal(mattRead.extractClass, "paystub");
    assert.ok(mattRead.fields.gross_period || mattRead.fields.pay_period_end);
  }

  assert.ok(FIRST_SESSION_LOCKED_KEYS.government_id.includes("full_name"));
  assert.ok(!FIRST_SESSION_LOCKED_KEYS.government_id.includes("id_last4"));
  console.log("assert-first-session-page-read: ID · W-2 · stub · bank · contract · tax locked; unread invents nothing");
}

main();
