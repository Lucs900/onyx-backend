/**
 * SE cover-income leftover — income bible lock.
 * 1040 cover may write thin Sch 1 / C / 12 when that is all we have.
 * 20 → $9,000 · 19 → $7,333 · Cover line · Suggested · not underwritten.
 * No Sch E / Sch F / add-backs from the cover.
 * 11 / 10 upgrade the same Hale Design row to the 1084 method.
 * Skip on the C ask is once. Second cover does not freeze or steal.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { POST as extractRoute } from "../app/api/docs/extract/route";
import { COVER_LINE_METHOD, COVER_LINE_NOTE } from "../lib/income/suggest";
import {
  extractHintFromDraft,
  nextCoverPageInviteCopy,
  nextCoverScheduleLabels,
  skipCurrentInvite,
  stillUsefulLabels,
  stillUsefulSection,
} from "../components/fox/fileWrite";
import { applyExtractWrite, emptyDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import {
  requiredLineValue,
  requiredStructureLines,
  resolveProposal,
} from "../components/fox/completeness";
import { nextFoxAsk, previewFacts } from "../components/fox/workspace";
import { isCoverLineProposal, SE_MONTHLY_FIELD } from "../components/fox/qualifyingIncome";
import type { ExtractClass, FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function load(name: string) {
  return new Uint8Array(readFileSync(join(root, "sample-docs", name)));
}

function seAtIncome(): FoxIntakeDraft {
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
    incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 850_000,
    downPaymentAmount: 170_000,
    loanAmountValue: 680_000,
    valueAsked: true,
    amountAsked: true,
    subjectAddress: "94123",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectAddressAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    skippedClasses: ["government_id"],
    liveQuote: { key: "old|94123", rate: 6.125, asOf: "2026-09-05" },
    liveQuoteKey: "old|94123",
    liveQuoteStatus: "ready",
  };
}

async function routeExtract(name: string, hint?: ExtractClass | null) {
  const bytes = load(name);
  const form = new FormData();
  form.append("file", new File([Buffer.from(bytes)], name, { type: "application/pdf" }), name);
  form.append("name", name);
  form.append("type", "application/pdf");
  if (hint) form.append("hint", hint);
  const routed = await extractRoute(
    new Request("http://localhost/api/docs/extract", { method: "POST", body: form }),
  );
  return (await routed.json()) as {
    class?: string;
    failed?: boolean;
    note?: string;
    fields?: Record<string, string>;
  };
}

function writeLive(
  draft: FoxIntakeDraft,
  name: string,
  extractClass: ExtractClass,
  fields: Record<string, string>,
  at: string,
) {
  loadIntakeDraft(draft);
  receiveDocument({
    slot: "other",
    name,
    type: "application/pdf",
    size: 2048,
    receivedAt: at,
  });
  return applyExtractWrite(at, name, { extractClass, confidence: 0.94, fields }, undefined, false);
}

function askBlob(draft: FoxIntakeDraft) {
  const ask = nextFoxAsk(draft);
  return `${ask.text} ${ask.followUp ?? ""}`;
}

async function main() {
  const twenty = await routeExtract(
    "20-1040-cover-2025-jordan-hale.pdf",
    extractHintFromDraft(seAtIncome(), "20-1040-cover-2025-jordan-hale.pdf"),
  );
  assert.notEqual(twenty.failed, true);
  assert.equal(twenty.class, "tax_return");
  assert.equal(twenty.fields?.return_kind, "cover");
  assert.equal(twenty.fields?.tax_year, "2025");
  assert.equal(twenty.fields?.schedule_c_net_profit, "108000");
  assert.equal(twenty.fields?.schedule_e_rents_received, undefined);
  assert.equal(twenty.fields?.depreciation, undefined);
  assert.equal(twenty.fields?.k1_ordinary_income, undefined);

  const nineteen = await routeExtract(
    "19-1040-cover-2024-jordan-hale.pdf",
    extractHintFromDraft(seAtIncome(), "19-1040-cover-2024-jordan-hale.pdf"),
  );
  assert.equal(nineteen.fields?.return_kind, "cover");
  assert.equal(nineteen.fields?.tax_year, "2024");
  assert.equal(nineteen.fields?.schedule_c_net_profit, "88000");
  assert.equal(nineteen.fields?.schedule_e_rents_received, undefined);
  assert.equal(nineteen.fields?.depreciation, undefined);

  const after20 = writeLive(
    seAtIncome(),
    "20-1040-cover-2025-jordan-hale.pdf",
    "tax_return",
    twenty.fields ?? {},
    "2026-09-07T16:00:00.000Z",
  ).draft;
  assert.equal(after20.pendingProposal?.field, "qualifying_income");
  assert.equal(after20.pendingProposal?.value, "9000");
  assert.equal(after20.pendingProposal?.methodNote, COVER_LINE_METHOD);
  assert.equal(after20.pendingProposal?.note, COVER_LINE_NOTE);
  assert.equal(isCoverLineProposal(after20.pendingProposal), true);
  assert.ok(!after20.facts?.qualifying_income?.confirmed);
  const card20 = nextFoxAsk(after20);
  assert.match(card20.text, /\$9,000/);
  assert.match(card20.text, /Cover line/);
  assert.match(card20.text, /Suggested · not underwritten/);
  assert.match(card20.text, /Use this/);
  assert.doesNotMatch(card20.text, /Schedule E|Schedule F|add-back|depreciation|Got the cover/i);
  assert.ok((card20.actions ?? []).some((item) => item.label === "Use this"));
  assert.equal(nextCoverScheduleLabels(after20)[0], "Schedule C");
  assert.ok(stillUsefulLabels(after20).includes("Schedule C"));
  const visible20 = stillUsefulSection(after20)?.items.map((item) => item.label) ?? [];
  assert.ok(
    visible20.some((label) => /Schedule C/i.test(label)),
    `visible Still useful hid Schedule C — ${visible20.join(" · ") || "(none)"}`,
  );

  const used20 = resolveProposal(after20, "accept");
  assert.equal(used20.facts?.qualifying_income?.value, "9000");
  assert.equal(used20.facts?.[SE_MONTHLY_FIELD]?.value, "9000");
  assert.equal(used20.awaitingYearsInBusiness, false);
  const incomeLine = requiredStructureLines(used20).find((line) => line.id === "income");
  assert.ok(incomeLine);
  const incomeShown = requiredLineValue(used20, incomeLine);
  assert.match(incomeShown.value, /\$9,000/);
  assert.match(incomeShown.note ?? "", /Cover line/);
  assert.ok(
    previewFacts(used20).some(
      (fact) =>
        (fact.id === "income" || fact.id === "qualifying") &&
        /\$9,000/.test(fact.value) &&
        /Cover line/.test(`${fact.value} ${fact.note ?? ""}`),
    ),
    `Structure hid $9,000 after Use this — ${previewFacts(used20)
      .map((fact) => `${fact.label}:${fact.value}`)
      .join(" · ")}`,
  );
  const afterUse20 = nextFoxAsk(used20);
  assert.doesNotMatch(`${afterUse20.text} ${afterUse20.followUp ?? ""}`, /How long have you had/);
  assert.match(`${afterUse20.text} ${afterUse20.followUp ?? ""}`, /2025 Schedule C/);
  assert.equal((`${afterUse20.text} ${afterUse20.followUp ?? ""}`.match(/Got the cover/g) ?? []).length <= 1, true);
  assert.equal(nextCoverPageInviteCopy(used20), "The 1040 lists a Schedule C. I still need that 2025 Schedule C.");

  const yearsOpen20 = writeLive(
    {
      ...seAtIncome(),
      awaitingYearsInBusiness: true,
      yearsInBusinessAsked: false,
    },
    "20-1040-cover-2025-jordan-hale.pdf",
    "tax_return",
    twenty.fields ?? {},
    "2026-09-07T16:00:30.000Z",
  ).draft;
  assert.equal(yearsOpen20.awaitingYearsInBusiness, false);
  assert.doesNotMatch(nextFoxAsk(yearsOpen20).text, /How long have you had/);
  const usedYearsOpen20 = resolveProposal(yearsOpen20, "accept");
  assert.match(requiredLineValue(usedYearsOpen20, incomeLine).value, /\$9,000/);
  assert.doesNotMatch(nextFoxAsk(usedYearsOpen20).text, /How long have you had/);

  const skippedC = skipCurrentInvite(used20);
  assert.doesNotMatch(askBlob(skippedC), /Got the cover/i);
  const skippedAgain = skipCurrentInvite(skippedC);
  assert.doesNotMatch(askBlob(skippedAgain), /Got the cover/i);
  assert.notEqual(askBlob(skippedC), "");

  const eleven = await routeExtract(
    "11-1040-schedule-c-2025-hale-design.pdf",
    extractHintFromDraft(used20, "11-1040-schedule-c-2025-hale-design.pdf"),
  );
  assert.notEqual(eleven.failed, true);
  assert.equal(eleven.fields?.schedule_c_net_profit, "108000");
  assert.equal(eleven.fields?.depreciation, "12000");
  const after11 = writeLive(
    used20,
    "11-1040-schedule-c-2025-hale-design.pdf",
    "tax_return",
    eleven.fields ?? {},
    "2026-09-07T16:01:00.000Z",
  ).draft;
  assert.equal(after11.pendingProposal?.field, "qualifying_income");
  assert.equal(after11.pendingProposal?.value, "9958");
  assert.notEqual(after11.pendingProposal?.methodNote, COVER_LINE_METHOD);
  assert.match(after11.pendingProposal?.methodNote ?? "", /Schedule C/);
  assert.ok(!after11.facts?.qualifying_income?.confirmed || after11.facts?.qualifying_income?.value === "9000");
  const upgrade = nextFoxAsk(after11);
  assert.match(upgrade.text, /\$9,958/);
  assert.ok((upgrade.actions ?? []).some((item) => item.label === "Use this"));
  const used11 = resolveProposal(after11, "accept");
  assert.equal(used11.facts?.qualifying_income?.value, "9958");

  const after19Alone = writeLive(
    seAtIncome(),
    "19-1040-cover-2024-jordan-hale.pdf",
    "tax_return",
    nineteen.fields ?? {},
    "2026-09-07T16:02:00.000Z",
  ).draft;
  assert.equal(after19Alone.pendingProposal?.value, "7333");
  assert.equal(after19Alone.pendingProposal?.methodNote, COVER_LINE_METHOD);
  assert.match(nextFoxAsk(after19Alone).text, /\$7,333/);
  assert.match(nextFoxAsk(after19Alone).text, /Cover line/);

  const nineteenOnOpen20 = writeLive(
    structuredClone(after20),
    "19-1040-cover-2024-jordan-hale.pdf",
    "tax_return",
    nineteen.fields ?? {},
    "2026-09-07T16:03:00.000Z",
  ).draft;
  assert.equal(nineteenOnOpen20.pendingProposal?.field, "qualifying_income");
  assert.equal(nineteenOnOpen20.pendingProposal?.value, "9000");
  assert.match(nextFoxAsk(nineteenOnOpen20).text, /\$9,000/);
  assert.doesNotMatch(askBlob(nineteenOnOpen20), /I need (?:your )?the 2025 (?:federal )?tax return|Form 1040, all pages/i);
  assert.ok(stillUsefulLabels(nineteenOnOpen20).includes("Schedule C") || nextCoverScheduleLabels(nineteenOnOpen20).includes("Schedule C"));

  const nineteenAfterUsed20 = writeLive(
    structuredClone(used20),
    "19-1040-cover-2024-jordan-hale.pdf",
    "tax_return",
    nineteen.fields ?? {},
    "2026-09-07T16:04:00.000Z",
  ).draft;
  assert.equal(nineteenAfterUsed20.facts?.qualifying_income?.value, "9000");
  assert.notEqual(nineteenAfterUsed20.pendingProposal?.value, "7333");
  const after19Ask = askBlob(nineteenAfterUsed20);
  assert.doesNotMatch(after19Ask, /Got the cover/i);
  assert.doesNotMatch(after19Ask, /I need (?:your )?the 2025 (?:federal )?tax return|I need the 2025 return — Form 1040, all pages/i);
  assert.match(after19Ask, /2024 Schedule C/);
  assert.notEqual(after19Ask.trim(), "");
  const skipAfter19 = skipCurrentInvite(nineteenAfterUsed20);
  assert.doesNotMatch(askBlob(skipAfter19), /Got the cover/i);
  assert.doesNotMatch(askBlob(skipAfter19), /I need the 2025 return — Form 1040, all pages/i);
  assert.notEqual(askBlob(skipAfter19).trim(), "");

  console.log("assert-se-cover-income: 20=$9,000 · 19=$7,333 · 11 upgrades · 19 does not hang");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
