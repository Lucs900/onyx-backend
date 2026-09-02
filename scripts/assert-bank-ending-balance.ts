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
import { safeAccountLast4, collectAccountLast4s, statementAccountLast4 } from "../lib/docs/bankLast4";
import { displayInstitution, writeAssetAccount } from "../components/fox/availableAssets";
import { resolveProposal } from "../components/fox/completeness";
import { conventionalFileFacts, conventionalFileFromDraft } from "../components/fox/conventionalFile";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import { nextFoxAsk, previewFacts } from "../components/fox/workspace";

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
  assert.ok(lines.some((line) => /\*{4}4419/.test(line)), `${path} text missing checking ****4419`);
  assert.ok(lines.some((line) => /Transfer to \*{4}2281/.test(line)), `${path} text missing transfer ****2281`);
  const printed = readPrintedSample(bytes);
  assertEnding(`fixture ${path}`, printed?.fields.ending_balance);
  assert.equal(displayInstitution(printed?.fields.institution), "Pacific Coast Bank");
  assert.equal(printed?.fields.account_last4, "4419", `${path} last4`);
  assert.equal(printed?.fields.asset_accounts, undefined, `${path} one statement`);
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
  assert.equal(extracted.fields.account_last4, "4419");
  assert.equal(extracted.fields.asset_accounts, undefined);
  assert.doesNotMatch(JSON.stringify(extracted.fields), /2281|routing/i);

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
  assert.match(ask.text, /4419/);
  assert.match(ask.text, /\$84,220\.15/);
  assert.match(ask.text, /Use this/);
  assert.doesNotMatch(ask.text, /2281|4419 · 2281|Filbert|routing/i);
  refuseSeven("confirm speak", ask.text);
  const used = resolveProposal(pending.draft, "accept");
  assert.equal(used.facts?.institution?.value, "Pacific Coast Bank");
  assert.equal(used.facts?.ending_balance?.value, "84220.15");
  assert.equal(used.statedAvailableAssets, 84220.15);
  assert.equal(used.facts?.account_last4?.value, "4419");
  assert.equal(used.assetAccounts?.length ?? 1, 1);
  assert.equal(used.subjectAddress, "14 Oak Street");
  assert.doesNotMatch(`${used.subjectAddress} ${used.facts?.property_address?.value ?? ""}`, /Filbert/i);
  assert.doesNotMatch(JSON.stringify(used.facts ?? {}), /2281|routing/i);
  assert.equal(conventionalFileFromDraft(used).assets.suggestedBalance, "84220.15");
  assert.equal(conventionalFileFromDraft(used).assets.last4, "4419");
  refuseSeven("file write", used.facts?.ending_balance?.value);
  const usedFacts = previewFacts(used);
  assert.ok(usedFacts.some((fact) => fact.id === "file-assets" && /4419/.test(fact.value) && /\$84,220\.15/.test(fact.value)));
  assert.ok(usedFacts.every((fact) => fact.id !== "file-assets-1" && !/2281/.test(fact.value)));
  assert.ok(usedFacts.every((fact) => fact.id !== "file-assets" || !/last4 —/.test(fact.value)));
  const emptyAssets = conventionalFileFacts({ ...emptyDraft(), productIntent: "buy", path: "acr" });
  assert.ok(emptyAssets.some((fact) => fact.id === "file-assets"));
  assert.ok(
    emptyAssets.every(
      (fact) =>
        fact.id !== "file-assets" && !fact.id.startsWith("file-assets-")
          ? true
          : fact.value === "" && !/institution —|balance —|last4 —/.test(fact.value),
    ),
  );

  assert.equal(safeAccountLast4("****4419"), "4419");
  assert.equal(safeAccountLast4("Checking ****4419"), "4419");
  assert.equal(safeAccountLast4("Transfer to ****2281"), "");
  assert.equal(safeAccountLast4("****4412"), "4412");
  assert.equal(safeAccountLast4("LAST 4: 4412"), "4412");
  assert.equal(safeAccountLast4("Account ending in 4412"), "4412");
  assert.equal(safeAccountLast4("4412"), "4412");
  assert.equal(safeAccountLast4("9999888877771234"), "");
  assert.equal(safeAccountLast4("ACCOUNT NUMBER: 9999888877771234"), "");
  assert.equal(safeAccountLast4("07/31/2026"), "");
  assert.equal(safeAccountLast4("$84,220.15"), "");
  assert.deepEqual(collectAccountLast4s("Ending balance 07/31/2026 → $84,220.15"), []);
  assert.equal(
    statementAccountLast4(["PACIFIC COAST BANK", "Checking ****4419", "Transfer to ****2281", sameLine].join("\n")),
    "4419",
  );

  const transferPrinted = printedSampleFromLines([
    ...header,
    "Checking ****4419",
    "Transfer to ****2281",
    sameLine,
    residence,
  ]);
  assert.equal(transferPrinted?.extractClass, "bank_statement");
  assert.equal(transferPrinted?.fields.account_last4, "4419");
  assert.equal(transferPrinted?.fields.asset_accounts, undefined);
  assertEnding("transfer printed", transferPrinted?.fields.ending_balance);
  const transferPending = applyExtractedFields(
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
      extractClass: "bank_statement",
      confidence: 0.94,
      fields: transferPrinted!.fields,
    },
  );
  assert.equal(transferPending.draft.facts?.account_last4, undefined);
  assert.ok(
    (transferPending.draft.pendingProposal?.extras ?? []).some(
      (item) => item.field === "account_last4" && item.value === "4419",
    ),
  );
  assert.ok(!(transferPending.draft.pendingProposal?.extras ?? []).some((item) => item.field === "asset_accounts"));
  const transferAsk = nextFoxAsk(transferPending.draft);
  assert.match(transferAsk.text, /Pacific Coast Bank · 4419 · \$84,220\.15/);
  assert.match(transferAsk.text, /Suggested · not underwritten/);
  assert.doesNotMatch(transferAsk.text, /2281|4419 · 2281/);
  const transferUsed = resolveProposal(transferPending.draft, "accept");
  assert.equal(transferUsed.facts?.account_last4?.value, "4419");
  assert.equal(transferUsed.assetAccounts?.length ?? 1, 1);
  assert.equal(conventionalFileFromDraft(transferUsed).assets.last4, "4419");
  assert.ok(conventionalFileFacts(transferUsed).every((fact) => fact.id !== "file-assets-1" && !/2281/.test(fact.value)));

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

  const sameBank = writeAssetAccount(
    writeAssetAccount(emptyDraft(), { institution: "Pacific Coast Bank", last4: "4419", balance: "84220.15" }),
    { institution: "Pacific Coast Bank", last4: "7788", balance: "8000" },
  );
  assert.equal(sameBank.assetAccounts?.length, 2);

  const composerFile = new File([readFileSync(SAMPLE)], "05-bank-statement-pacific-coast-jul-2026.pdf", { type: "" });
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
  assert.notEqual(composerRead.failed, true, "composer File of 05 is confirm, not unread");
  assert.equal(composerRead.class, "bank_statement");
  assert.equal(composerRead.fields?.account_last4, "4419");
  assert.equal(composerRead.fields?.asset_accounts, undefined);
  assertEnding("05 composer", composerRead.fields?.ending_balance);
  assert.doesNotMatch(JSON.stringify(composerRead.fields ?? {}), /2281|9999888877771234|routing/i);
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
  assert.ok(
    (composerWrite.draft.pendingProposal?.extras ?? []).some(
      (item) => item.field === "account_last4" && item.value === "4419",
    ),
  );
  assert.match(nextFoxAsk(composerWrite.draft).text, /Pacific Coast Bank · 4419 · \$84,220\.15/);
  assert.doesNotMatch(nextFoxAsk(composerWrite.draft).text, /2281|4419 · 2281/);
  const composerUsed = resolveProposal(composerWrite.draft, "accept");
  assert.equal(composerUsed.facts?.account_last4?.value, "4419");
  assert.equal(conventionalFileFromDraft(composerUsed).assets.last4, "4419");
  assert.equal(composerUsed.assetAccounts?.length ?? 1, 1);
  assert.ok(conventionalFileFacts(composerUsed).every((fact) => fact.id !== "file-assets-1"));

  console.log("founder-layout bank ending-balance unit test PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
