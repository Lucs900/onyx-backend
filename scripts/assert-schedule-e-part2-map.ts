/**
 * Schedule E Part II is a map, not a K-1.
 * Do not /12 line 32. Do not call Part II a K-1. Invent no combined monthly.
 */
import assert from "node:assert/strict";
import { classifyPageByFormHeader } from "../lib/docs/formHeader";
import {
  incomeLedgerFieldsFromPrintedLines,
  incomeLedgerRowsFromFields,
} from "../lib/income/ledger";
import {
  loudK1FromPrintedLines,
  loudScheduleEFromPrintedLines,
} from "../lib/docs/printedSample";
import { applyExtractedFields, scheduleEPart2MapAskCopy } from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import { monthlyQualifyingFromExtract } from "../components/fox/qualifyingIncome";
import { nextFoxAsk } from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

const PART2_LINES = [
  "Schedule E (Form 1040) 2024",
  "Supplemental Income and Loss",
  "Part II Income or Loss From Partnerships and S Corporations",
  "Caution: The IRS compares amounts reported on your tax return with amounts shown on Schedule(s) K-1.",
  "A PARASS FOODS LLC · P · nonpassive loss allowed 34,311",
  "B PARASS RESTAURANT GROUP INC · S · nonpassive loss allowed 14,479",
  "32 Total (48,790)",
];

const REAL_K1_LINES = [
  "Schedule K-1 (Form 1065) 2024",
  "Partner's Share of Income, Deductions, Credits, etc.",
  "Partnership name Parass Foods LLC",
  "Partner's name Sunita Singh",
  "Box 1 Ordinary business income (loss) (155185)",
];

function seSketch(): FoxIntakeDraft {
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
    propertyValueAmount: 1_200_000,
    downPaymentAmount: 240_000,
    loanAmountValue: 960_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "house",
    propertyTypeAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    skippedClasses: ["government_id"],
  };
}

function main() {
  const header = PART2_LINES.join(" ");
  assert.equal(classifyPageByFormHeader(header), "schedule_e");
  assert.notEqual(classifyPageByFormHeader(header), "k1");
  assert.equal(classifyPageByFormHeader(REAL_K1_LINES.join(" ")), "k1");

  const printed = incomeLedgerFieldsFromPrintedLines(PART2_LINES);
  assert.match(printed.schedule_e_part2_names ?? "", /PARASS FOODS LLC/i);
  assert.match(printed.schedule_e_part2_names ?? "", /PARASS RESTAURANT GROUP INC/i);
  assert.equal(printed.k1_ordinary_income, undefined);
  assert.notEqual(printed.k1_ordinary_income, "-48790");
  assert.notEqual(printed.k1_ordinary_income, "48790");
  const rows = incomeLedgerRowsFromFields(printed);
  assert.ok(!rows.some((row) => row.monthly === "-4066" || row.monthly === "4066"));

  const loudE = loudScheduleEFromPrintedLines(PART2_LINES);
  assert.equal(loudE?.fields.return_kind, "schedule_e");
  assert.match(loudE?.fields.schedule_e_part2_names ?? "", /PARASS FOODS LLC/i);
  assert.match(loudE?.fields.schedule_e_part2_names ?? "", /PARASS RESTAURANT GROUP INC/i);
  assert.equal(loudE?.fields.k1_ordinary_income, undefined);
  assert.equal(loudK1FromPrintedLines(PART2_LINES), null);

  const fields = {
    return_kind: "schedule_e",
    tax_year: "2024",
    schedule_e_part2_names: "PARASS FOODS LLC;PARASS RESTAURANT GROUP INC",
  };
  const qi = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    ...fields,
    k1_ordinary_income: "",
  });
  assert.equal(qi, null);

  const mashed = monthlyQualifyingFromExtract(seSketch(), "tax_return", {
    return_kind: "k1",
    tax_year: "2024",
    k1_ordinary_income: "-48790",
  });
  assert.equal(mashed?.monthly, -4066);

  const applied = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: loudE?.fields ?? fields,
  });
  assert.notEqual(applied.draft.pendingProposal?.field, "qualifying_income");
  assert.notEqual(applied.draft.pendingProposal?.value, "-4066");
  assert.notEqual(applied.draft.facts?.qualifying_income?.value, "-4066");
  assert.match(applied.draft.facts?.schedule_e_part2_names?.value ?? "", /PARASS FOODS LLC/i);
  assert.match(applied.draft.facts?.schedule_e_part2_names?.value ?? "", /PARASS RESTAURANT GROUP INC/i);

  const ask = nextFoxAsk(applied.draft);
  assert.match(ask.text, /Schedule E Part II lists/i);
  assert.match(ask.text, /PARASS FOODS LLC/i);
  assert.match(ask.text, /PARASS RESTAURANT GROUP INC/i);
  assert.match(ask.text, /map, not a K-1/i);
  assert.doesNotMatch(ask.text, /Got the 2024 K-1/);
  assert.doesNotMatch(ask.text, /4,066|4066/);
  assert.match(scheduleEPart2MapAskCopy(applied.draft), /I need the K-1 or the entity return/);

  const realK1 = applyExtractedFields(seSketch(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      return_kind: "k1",
      tax_year: "2024",
      k1_ordinary_income: "-155185",
      k1_partner_name: "Sunita Singh",
      entity_name: "Parass Foods LLC",
    },
  });
  assert.equal(realK1.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(realK1.draft.pendingProposal?.value, "-12932");
  const realAsk = nextFoxAsk(realK1.draft);
  assert.match(realAsk.text, /Got the 2024 K-1/);
  assert.doesNotMatch(realAsk.text, /4,066|4066/);

  console.log("assert-schedule-e-part2-map: Part II map · no −$4,066 fake K-1");
}

main();
