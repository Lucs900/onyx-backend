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
import {
  applyExtractedFields,
  SCHEDULE_E_RENTS_UNREAD_LINE,
  scheduleEPart2MapAskCopy,
} from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import {
  monthlyQualifyingFromExtract,
  skipScheduleEUnread,
  TAX_CASHFLOWS_FIELD,
} from "../components/fox/qualifyingIncome";
import { acceptHuntRentals } from "../components/fox/hunt";
import { writeQualifyingIncome } from "../components/fox/completeness";
import { nextFoxAsk, workspaceReply } from "../components/fox/workspace";
import { scheduleECashFlowMonthly } from "../lib/income/suggest";
import { scheduleEPart1FromPrintedText } from "../lib/income/scheduleEPart1";
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

const PART1_LINES = [
  "Schedule E (Form 1040) 2024",
  "Supplemental Income and Loss",
  "Part I Income or Loss From Rental Real Estate and Royalties",
  "SUNITA SINGH",
  "1a 435 SPETTI DRIVE FREMONT",
  "3 Rents received  13,762",
  "12 Mortgage interest paid to banks, etc.  14,561",
  "16 Taxes  7,507",
  "18 Depreciation  6,908",
  "20 Total expenses  28,978",
  "21 Income or (loss) from rental real estate  (15,216)",
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

  const part1Printed = scheduleEPart1FromPrintedText(PART1_LINES.join("\n"));
  assert.equal(part1Printed.rents, "13762");
  assert.equal(part1Printed.cash, "7507");
  assert.notEqual(part1Printed.rents, "3");
  assert.notEqual(part1Printed.cash, "28978");
  assert.notEqual(part1Printed.cash, "14561");
  assert.notEqual(part1Printed.cash, "6908");
  assert.equal(scheduleECashFlowMonthly(13762, 7507), 521);
  assert.notEqual(scheduleECashFlowMonthly(13762, 7507), -1268);
  assert.notEqual(scheduleECashFlowMonthly(13762, 7507), 860);

  const loudPart1 = loudScheduleEFromPrintedLines(PART1_LINES);
  assert.equal(loudPart1?.fields.schedule_e_rents_received, "13762");
  assert.equal(loudPart1?.fields.schedule_e_cash_expenses, "7507");
  assert.match(loudPart1?.fields.schedule_e_property_address ?? "", /SPETTI/i);
  assert.equal(loudPart1?.fields.k1_ordinary_income, undefined);

  const ledgerPart1 = incomeLedgerFieldsFromPrintedLines(PART1_LINES);
  assert.equal(ledgerPart1.schedule_e_rents_received, "13762");
  assert.equal(ledgerPart1.schedule_e_cash_expenses, "7507");
  const part1Rows = incomeLedgerRowsFromFields({
    tax_year: "2024",
    ...ledgerPart1,
  });
  assert.equal(part1Rows[0]?.monthly, "521");
  assert.ok(!part1Rows.some((row) => row.monthly === "-4066" || row.monthly === "4066"));

  const qiFile = writeQualifyingIncome(seSketch(), "7667");
  const afterYes = acceptHuntRentals({
    ...qiFile,
    facts: {
      ...(qiFile.facts ?? {}),
      [TAX_CASHFLOWS_FIELD]: {
        field: TAX_CASHFLOWS_FIELD,
        value: JSON.stringify([
          {
            tax_year: "2024",
            return_kind: "schedule_e",
            schedule_e_rents_received: "13762",
            schedule_e_cash_expenses: "7507",
            schedule_e_property_address: "435 SPETTI DRIVE FREMONT",
            schedule_e_part2_names: "PARASS FOODS LLC;PARASS RESTAURANT GROUP INC",
            k1_ordinary_income: "",
          },
        ]),
        source: "extracted-unconfirmed",
        confirmed: true,
        confirmedAt: "2026-09-17T00:00:00.000Z",
      },
    },
    pendingProposal: {
      field: "hunt_rentals",
      value: "435 SPETTI DRIVE FREMONT",
      label: "rentals",
      kind: "computed",
      extras: [{ field: "rental_address", value: "435 SPETTI DRIVE FREMONT", label: "rental" }],
    },
  });
  const yesAsk = nextFoxAsk(afterYes);
  assert.match(yesAsk.text, /\$521/);
  assert.match(yesAsk.text, /Use this/i);
  assert.match(yesAsk.text, /Suggested rental cash flow · not underwritten/);
  assert.doesNotMatch(yesAsk.text, new RegExp(SCHEDULE_E_RENTS_UNREAD_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(yesAsk.text, /4,066|4066|didn.t get rents/i);
  assert.doesNotMatch(yesAsk.text, /15,216|75\s*%/);
  assert.ok((yesAsk.actions ?? []).some((item) => item.label === "Use this"), yesAsk.text);
  assert.ok(!(yesAsk.text + JSON.stringify(afterYes.facts ?? {})).match(/\b\d{3}-\d{2}-\d{4}\b/));

  const unread = {
    ...writeQualifyingIncome(seSketch(), "7667"),
    statedOtherReo: "yes" as const,
    otherReoAsked: true,
    otherProperties: [{ id: "spetti", address: "435 Spetti Drive, Fremont, CA" }],
    scheduleECashUnread: true,
    scheduleECashAsked: true,
    taxReturnPacketSpoken: true,
    taxReturnPacketRead: "done" as const,
    federalReturnSkipped: true,
    skippedClasses: ["government_id", "tax_return", "w2"],
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
  };
  const skipped = skipScheduleEUnread(unread);
  assert.equal(skipped.scheduleECashUnread, false);
  const skipAsk = nextFoxAsk(skipped);
  assert.ok(skipAsk.text.trim(), "Skip on unread Sch E must speak a next line");
  assert.ok((skipAsk.actions ?? []).length > 0, "Skip on unread Sch E must keep chips");
  assert.doesNotMatch(skipAsk.text, new RegExp(SCHEDULE_E_RENTS_UNREAD_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const typedSkip = workspaceReply("Skip", unread);
  assert.ok(typedSkip?.text.trim(), "typed Skip on unread Sch E cannot leave an empty composer");
  assert.ok((typedSkip?.actions ?? []).length > 0, "typed Skip on unread Sch E must keep a live strip");
  assert.equal(typedSkip?.capture?.field, "skip-schedule-e-unread");

  console.log("assert-schedule-e-part2-map: Part II map · Part I $521 · Skip speaks");
}

main();
