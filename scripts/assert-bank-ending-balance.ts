/**
 * Founder-layout bank extract. Text includes Ending balance 07/31/2026
 * next to $84,220.15. Never treat date day 07 as $7.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bankEndingBalanceAmount,
  bankEndingBalanceFromStatementText,
} from "../lib/docs/bankBalance";
import { classifyAndExtract } from "../lib/docs/extract";
import { readPdfTextLayer } from "../lib/docs/pdfText";
import { printedSampleFromLines, readPrintedSample } from "../lib/docs/printedSample";
import { safeAccountLast4, collectAccountLast4s } from "../lib/docs/bankLast4";
import { displayInstitution, writeAssetAccount } from "../components/fox/availableAssets";
import { resolveProposal } from "../components/fox/completeness";
import { conventionalFileFacts, conventionalFileFromDraft } from "../components/fox/conventionalFile";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import { nextFoxAsk, previewFacts } from "../components/fox/workspace";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE = join(root, "sample-docs/05-bank-statement-pacific-coast-jul-2026.pdf");
const FIXTURE = join(root, "scripts/fixtures/05-bank-statement-pacific-coast-jul-2026.pdf");
const LAST4_SAMPLE = join(root, "sample-docs/09-bank-statement-pacific-coast-4412.pdf");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on founder-layout text");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on founder-layout text");
  },
};

function refuseSeven(label: string, value: unknown) {
  const shown = String(value ?? "");
  assert.notEqual(shown, "7", `${label} must not be 7`);
  assert.notEqual(shown, "07", `${label} must not be 07`);
  assert.doesNotMatch(shown, /(?:^|[^\d])7(?:[^\d.]|$)/, `${label} must not speak $7`);
}

function assertEnding(label: string, value: string | undefined) {
  assert.equal(value, "84220.15", `${label} ending`);
  refuseSeven(label, value);
}

const sameLine = "Ending balance 07/31/2026 → $84,220.15";
const sameLineAscii = "Ending balance 07/31/2026 -> $84,220.15";
const split = "Ending balance 07/31/2026\n$84,220.15";
const columns = "Ending balance 07/31/2026                    $84,220.15";
const titleCase = "Ending Balance 07/31/2026\n$84,220.15";

assert.equal(bankEndingBalanceAmount("07/31/2026 → $84,220.15"), "84220.15");
assert.equal(bankEndingBalanceAmount("07"), "");
assert.equal(bankEndingBalanceFromStatementText(sameLine), "84220.15");
assert.equal(bankEndingBalanceFromStatementText(sameLineAscii), "84220.15");
assert.equal(bankEndingBalanceFromStatementText(split), "84220.15");
assert.equal(bankEndingBalanceFromStatementText(columns), "84220.15");
assert.equal(bankEndingBalanceFromStatementText(titleCase), "84220.15");
assert.equal(bankEndingBalanceFromStatementText("Ending balance 07/31/2026"), "");
refuseSeven("same-line parse", bankEndingBalanceFromStatementText(sameLine));
refuseSeven("split parse", bankEndingBalanceFromStatementText(split));

const header = ["PACIFIC COAST BANK", "ACCOUNT STATEMENT"] as const;
const residence = "RESIDENTIAL ADDRESS: 1847 Filbert St, San Francisco, CA 94123";

for (const [name, lines] of [
  ["same-line", [...header, sameLine, residence]],
  ["same-line-ascii", [...header, sameLineAscii, residence]],
  ["split", [...header, "Ending balance 07/31/2026", "$84,220.15", residence]],
  ["columns", [...header, columns, residence]],
] as const) {
  const printed = printedSampleFromLines([...lines]);
  assert.equal(printed?.extractClass, "bank_statement", name);
  assert.match(printed?.fields.institution ?? "", /Pacific Coast Bank/i, name);
  assertEnding(name, printed?.fields.ending_balance);
  assert.equal(printed?.fields.account_last4, undefined, name);
  assert.equal(printed?.fields.property_address, undefined, name);
  assert.match(printed?.fields.present_address ?? "", /1847 Filbert/, name);
  assert.equal(displayInstitution(printed?.fields.institution), "Pacific Coast Bank", name);
}

const dateOnly = printedSampleFromLines([...header, "Ending balance 07/31/2026"]);
assert.equal(dateOnly?.fields.ending_balance, undefined);
refuseSeven("date-only", dateOnly?.fields.ending_balance);

const sevenApply = applyExtractedFields(
  { ...emptyDraft(), subjectAddress: "14 Oak Street", subjectAddressAsked: true, citizenshipAsked: true },
  {
    extractClass: "bank_statement",
    confidence: 0.94,
    fields: { institution: "Pacific Coast Bank", ending_balance: "7" },
  },
);
assert.notEqual(sevenApply.draft.pendingProposal?.value, "7");
assert.notEqual(sevenApply.draft.statedAvailableAssets, 7);

for (const path of [SAMPLE, FIXTURE]) {
  const bytes = readFileSync(path);
  const raw = bytes.toString("latin1");
  assert.match(raw, /07\/31\/2026/, `${path} missing founder date`);
  assert.match(raw, /\$84,220\.15/, `${path} missing founder amount`);
  assert.doesNotMatch(raw, /ENDING BALANCE:\s*\$/, `${path} is the labeled stub`);
  assert.doesNotMatch(raw, /PERIOD END:\s*2026-07-31/, `${path} is the ISO period stub`);
  const lines = readPdfTextLayer(bytes);
  assert.ok(lines?.length, `${path} has no text layer`);
  assert.ok(lines.some((line) => /07\/31\/2026/.test(line)), `${path} text missing date`);
  assert.ok(lines.some((line) => /84,220\.15/.test(line)), `${path} text missing amount`);
  const printed = readPrintedSample(bytes);
  assertEnding(`fixture ${path}`, printed?.fields.ending_balance);
  assert.equal(displayInstitution(printed?.fields.institution), "Pacific Coast Bank");
}

async function main() {
  const extracted = await classifyAndExtract(
    readFileSync(SAMPLE),
    "application/pdf",
    deadVision,
    "bank_statement",
    "05-bank-statement-pacific-coast-jul-2026.pdf",
  );
  assert.notEqual(extracted.failed, true, extracted.warnings.join(" | "));
  assertEnding("classifyAndExtract", extracted.fields.ending_balance);
  assert.equal(displayInstitution(extracted.fields.institution), "Pacific Coast Bank");

  const pending = applyExtractedFields(
    {
      ...emptyDraft(),
      path: "acr",
      productIntent: "buy",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      incomeAsked: true,
      incomeType: { ...emptyDraft().incomeType, value: "w2" },
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
      agencyDeclarations: { citizenship: "us_citizen" },
    },
    extracted,
  );
  assert.equal(pending.draft.pendingProposal?.field, "statedAvailableAssets");
  assert.equal(pending.draft.pendingProposal?.value, "84220.15");
  refuseSeven("confirm value", pending.draft.pendingProposal?.value);
  const ask = nextFoxAsk(pending.draft);
  assert.match(ask.text, /Pacific Coast Bank/);
  assert.match(ask.text, /\$84,220\.15/);
  assert.match(ask.text, /Use this/);
  refuseSeven("confirm speak", ask.text);
  assert.doesNotMatch(ask.text, /Filbert/i);
  const used = resolveProposal(pending.draft, "accept");
  assert.equal(used.facts?.institution?.value, "Pacific Coast Bank");
  assert.equal(used.facts?.ending_balance?.value, "84220.15");
  assert.equal(used.statedAvailableAssets, 84220.15);
  assert.equal(used.facts?.account_last4, undefined);
  assert.equal(used.subjectAddress, "14 Oak Street");
  assert.doesNotMatch(`${used.subjectAddress} ${used.facts?.property_address?.value ?? ""}`, /Filbert/i);
  assert.equal(conventionalFileFromDraft(used).assets.suggestedBalance, "84220.15");
  assert.equal(conventionalFileFromDraft(used).assets.last4, undefined);
  refuseSeven("file write", used.facts?.ending_balance?.value);
  assert.ok(
    previewFacts(used).every((fact) => fact.id !== "file-assets" || !/last4 —/.test(fact.value)),
    "blank last4 must not paint last4 —",
  );

  assert.equal(safeAccountLast4("****4412"), "4412");
  assert.equal(safeAccountLast4("LAST 4: 4412"), "4412");
  assert.equal(safeAccountLast4("Account ending in 4412"), "4412");
  assert.equal(safeAccountLast4("4412"), "4412");
  assert.equal(safeAccountLast4("9999888877771234"), "");
  assert.equal(safeAccountLast4("ACCOUNT NUMBER: 9999888877771234"), "");
  assert.equal(safeAccountLast4("07/31/2026"), "");
  assert.equal(safeAccountLast4("$84,220.15"), "");
  assert.deepEqual(collectAccountLast4s("Ending balance 07/31/2026 → $84,220.15"), []);

  const last4Printed = printedSampleFromLines([
    ...header,
    "ACCOUNT LAST 4: 4412",
    sameLine,
    residence,
  ]);
  assert.equal(last4Printed?.extractClass, "bank_statement");
  assert.equal(last4Printed?.fields.account_last4, "4412");
  assertEnding("last4 printed", last4Printed?.fields.ending_balance);
  const last4Pending = applyExtractedFields(
    {
      ...emptyDraft(),
      path: "acr",
      productIntent: "buy",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      timelineAsked: true,
      timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
      incomeAsked: true,
      incomeType: { ...emptyDraft().incomeType, value: "w2" },
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
      agencyDeclarations: { citizenship: "us_citizen" },
    },
    {
      extractClass: "bank_statement",
      confidence: 0.94,
      fields: last4Printed!.fields,
    },
  );
  assert.equal(last4Pending.draft.facts?.account_last4, undefined);
  assert.ok((last4Pending.draft.pendingProposal?.extras ?? []).some((item) => item.field === "account_last4" && item.value === "4412"));
  assert.match(nextFoxAsk(last4Pending.draft).text, /4412/);
  assert.match(nextFoxAsk(last4Pending.draft).text, /Pacific Coast Bank/);
  assert.match(nextFoxAsk(last4Pending.draft).text, /\$84,220\.15/);
  const last4Used = resolveProposal(last4Pending.draft, "accept");
  assert.equal(last4Used.facts?.account_last4?.value, "4412");
  assert.equal(conventionalFileFromDraft(last4Used).assets.last4, "4412");
  assert.ok(
    previewFacts(last4Used).some((fact) => fact.id === "file-assets" && /last4 4412/.test(fact.value)),
  );

  const fullAccount = applyExtractedFields(
    {
      ...emptyDraft(),
      path: "acr",
      productIntent: "buy",
      citizenshipAsked: true,
      agencyDeclarations: { citizenship: "us_citizen" },
    },
    {
      extractClass: "bank_statement",
      confidence: 0.94,
      fields: {
        institution: "Pacific Coast Bank",
        ending_balance: "84220.15",
        account_last4: "9999888877771234",
        account_number: "9999888877771234",
      },
    },
  );
  assert.ok(!(fullAccount.draft.pendingProposal?.extras ?? []).some((item) => item.field === "account_last4"));
  const fullUsed = resolveProposal(fullAccount.draft, "accept");
  assert.equal(fullUsed.facts?.account_last4, undefined);
  assert.doesNotMatch(JSON.stringify(fullUsed.facts ?? {}), /9999888877771234/);
  assert.equal(conventionalFileFromDraft(fullUsed).assets.last4, undefined);

  const twoPrinted = printedSampleFromLines([
    ...header,
    "ACCOUNT LAST 4: 4412",
    "ACCOUNT LAST 4: 7788",
    "ENDING BALANCE: $20,000.00",
    "ACCOUNT 1 ENDING BALANCE: $12,000.00",
    "ACCOUNT 2 ENDING BALANCE: $8,000.00",
  ]);
  assert.equal(twoPrinted?.fields.account_last4, "4412");
  assert.ok(twoPrinted?.fields.asset_accounts);
  const twoRows = JSON.parse(twoPrinted!.fields.asset_accounts) as { last4?: string; balance?: string }[];
  assert.equal(twoRows.length, 2);
  assert.equal(twoRows[0]?.last4, "4412");
  assert.equal(twoRows[1]?.last4, "7788");
  const twoPending = applyExtractedFields(
    {
      ...emptyDraft(),
      path: "acr",
      productIntent: "buy",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      citizenshipAsked: true,
      agencyDeclarations: { citizenship: "us_citizen" },
    },
    {
      extractClass: "bank_statement",
      confidence: 0.94,
      fields: twoPrinted!.fields,
    },
  );
  const twoUsed = resolveProposal(twoPending.draft, "accept");
  assert.equal(twoUsed.assetAccounts?.length, 2);
  assert.equal(twoUsed.assetAccounts?.[0]?.last4, "4412");
  assert.equal(twoUsed.assetAccounts?.[1]?.last4, "7788");
  const twoFacts = conventionalFileFacts(twoUsed);
  assert.ok(twoFacts.some((fact) => fact.id === "file-assets" && /4412/.test(fact.value)));
  assert.ok(twoFacts.some((fact) => fact.id === "file-assets-1" && /7788/.test(fact.value)));

  const sameBank = writeAssetAccount(
    writeAssetAccount(emptyDraft(), { institution: "Pacific Coast Bank", last4: "4412", balance: "12000" }),
    { institution: "Pacific Coast Bank", last4: "7788", balance: "8000" },
  );
  assert.equal(sameBank.assetAccounts?.length, 2);

  const last4Bytes = readFileSync(LAST4_SAMPLE);
  const last4Extracted = await classifyAndExtract(
    last4Bytes,
    "application/pdf",
    deadVision,
    "bank_statement",
    "09-bank-statement-pacific-coast-4412.pdf",
  );
  assert.equal(last4Extracted.fields.account_last4, "4412");
  assertEnding("09 extract", last4Extracted.fields.ending_balance);

  const composerFile = new File([last4Bytes], "09-bank-statement-pacific-coast-4412.pdf", { type: "" });
  const snapshotType = "application/pdf";
  const keep = new File([new Blob([await composerFile.arrayBuffer()], { type: snapshotType })], composerFile.name, {
    type: snapshotType,
  });
  const composerForm = new FormData();
  composerForm.append("file", keep, keep.name);
  composerForm.append("name", keep.name);
  composerForm.append("type", snapshotType);
  composerForm.append("hint", "bank_statement");
  const { POST: extractRoutePost } = await import("../app/api/docs/extract/route");
  const composerPosted = await extractRoutePost(
    new Request("http://local/api/docs/extract", { method: "POST", body: composerForm }),
  );
  const composerRead = (await composerPosted.json()) as {
    class?: string;
    fields?: Record<string, string>;
    failed?: boolean;
    source?: string;
    note?: string;
    confidence?: number;
  };
  assert.equal(composerPosted.status, 200);
  assert.equal(composerRead.source, "file");
  assert.notEqual(composerRead.failed, true, "composer File of 09 is confirm, not unread");
  assert.equal(composerRead.class, "bank_statement");
  assert.equal(composerRead.fields?.account_last4, "4412");
  assertEnding("09 composer", composerRead.fields?.ending_balance);
  assert.doesNotMatch(JSON.stringify(composerRead.fields ?? {}), /9999888877771234|D1234567/);
  const composerWrite = applyExtractedFields(
    {
      ...emptyDraft(),
      path: "acr",
      productIntent: "buy",
      occupancyAsked: true,
      occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
      citizenshipAsked: true,
      agencyDeclarations: { citizenship: "us_citizen" },
      subjectAddress: "14 Oak Street",
      subjectAddressAsked: true,
    },
    {
      extractClass: (composerRead.class as "bank_statement") ?? "other",
      confidence: typeof composerRead.confidence === "number" ? composerRead.confidence : 0.94,
      fields: composerRead.fields ?? {},
    },
  );
  assert.equal(composerWrite.draft.facts?.account_last4, undefined);
  assert.ok((composerWrite.draft.pendingProposal?.extras ?? []).some((item) => item.field === "account_last4"));
  assert.match(nextFoxAsk(composerWrite.draft).text, /4412/);
  const composerUsed = resolveProposal(composerWrite.draft, "accept");
  assert.equal(composerUsed.facts?.account_last4?.value, "4412");
  assert.equal(conventionalFileFromDraft(composerUsed).assets.last4, "4412");

  console.log("founder-layout bank ending-balance unit test PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
