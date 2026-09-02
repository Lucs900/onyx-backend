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
import { displayInstitution } from "../components/fox/availableAssets";
import { resolveProposal } from "../components/fox/completeness";
import { conventionalFileFromDraft } from "../components/fox/conventionalFile";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import { nextFoxAsk } from "../components/fox/workspace";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE = join(root, "sample-docs/05-bank-statement-pacific-coast-jul-2026.pdf");
const FIXTURE = join(root, "scripts/fixtures/05-bank-statement-pacific-coast-jul-2026.pdf");

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

  console.log("founder-layout bank ending-balance unit test PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
