/**
 * Same PR tip — three locks on the Sunita walk.
 * 1. Same-stamp: named 2024 return never reprints 2024 1040; rental Yes → Sch E or unread rents.
 * 2. W-2 Medicare: Box 5 $91,999.96 → named CFBW ~$7,667/mo. Not Reported W-2 Wages. Not $5,750.
 * 3. After years Use this: Fox always speaks — Sch E cash, else unread rents, else Looks right.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  applyExtractedFields,
  HOUSEHOLD_WAGES_W2_ASK,
  SCHEDULE_E_RENTS_UNREAD_LINE,
  nextDocInvite,
} from "../components/fox/fileWrite";
import { resolveProposal, writeQualifyingIncome, writeYearsInBusiness } from "../components/fox/completeness";
import { nextFoxAsk } from "../components/fox/workspace";
import {
  TAX_CASHFLOWS_FIELD,
  QUALIFYING_INCOME_FIELD,
  isWageW2OnlyProposal,
  wageW2ConfirmCopy,
} from "../components/fox/qualifyingIncome";
import { acceptHuntRentals } from "../components/fox/hunt";
import { overlayW2MedicareFromPage } from "../lib/docs/printedSample";
import { writeEntityYears } from "../components/fox/yearsFromEntity";
import type { FoxIntakeDraft } from "../components/fox/types";

function fact(field: string, value: string) {
  return { field, value, source: "document" as const, confirmed: true, confirmedAt: "2026-09-16T00:00:00.000Z" };
}

function sunitaBase(): FoxIntakeDraft {
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
    subjectAddress: "",
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    taxReturnPacketSpoken: true,
    taxReturnPacketRead: "done",
    federalReturnSkipped: true,
    skippedClasses: ["government_id", "tax_return"],
    documents: [
      {
        slot: "other",
        name: "2024 Tax Return Documents (SINGH SUNITA) - filed.pdf",
        type: "application/pdf",
        size: 2048,
        receivedAt: "2026-09-16T18:00:00.000Z",
        status: "extracted",
        extractClass: "tax_return",
      },
    ],
    facts: {
      tax_year: fact("tax_year", "2024"),
      return_kind: fact("return_kind", "1040"),
      tax_return_name: fact("tax_return_name", "SUNITA SINGH"),
    },
  };
}

function withSpetti(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    statedOtherReo: "yes",
    otherReoAsked: true,
    otherProperties: [{ id: "spetti", address: "435 Spetti Drive, Fremont, CA" }],
  };
}

function withQiAndYears(draft: FoxIntakeDraft): FoxIntakeDraft {
  return writeYearsInBusiness(
    writeQualifyingIncome(draft, "7667"),
    "19",
  );
}

function main() {
  assert.equal(
    wageW2ConfirmCopy(91999.96, "PARASS RESTAURANT GROUP INC"),
    "PARASS RESTAURANT GROUP INC. Box 5 $91,999.96 → $7,667 a month. Use this?",
  );

  const named = sunitaBase();
  const namedAsk = nextFoxAsk(named).text;
  assert.doesNotMatch(namedAsk, /I need the 2024 return — Form 1040, all pages/);
  assert.doesNotMatch(namedAsk, /I need your 2024 federal tax return — Form 1040, all pages/);

  const unreadWages = {
    ...named,
    taxReturnPacketSpoken: true,
  };
  assert.equal(nextDocInvite(unreadWages), "w2");
  assert.match(nextFoxAsk(unreadWages).text, new RegExp(HOUSEHOLD_WAGES_W2_ASK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const huntYes = acceptHuntRentals({
    ...named,
    pendingProposal: {
      field: "hunt_rentals",
      value: "435 Spetti Drive, Fremont, CA",
      label: "rentals",
      kind: "computed",
      extras: [{ field: "rental_address", value: "435 Spetti Drive, Fremont, CA", label: "rental" }],
    },
  });
  const afterHunt = nextFoxAsk(huntYes);
  assert.doesNotMatch(afterHunt.text, /Form 1040, all pages/);
  assert.ok(
    afterHunt.text === SCHEDULE_E_RENTS_UNREAD_LINE ||
      /Use this/i.test(afterHunt.text) ||
      /rents/i.test(afterHunt.text),
    `rental Yes must speak Sch E or unread rents — ${afterHunt.text}`,
  );

  const cashflows = JSON.stringify([
    {
      tax_year: "2024",
      return_kind: "schedule_e",
      schedule_c_net_profit: "",
      depreciation: "",
      depletion: "",
      business_use_of_home: "",
      nonrecurring_other_income: "",
      amortization: "",
      casualty_loss: "",
      mileage_depreciation: "",
      k1_ordinary_income: "",
      k1_distributions: "",
      schedule_e_rents_received: "36000",
      schedule_e_cash_expenses: "12000",
      schedule_e_part2_names: "",
      schedule_e_property_address: "435 Spetti Drive, Fremont, CA",
    },
  ]);
  const withRents = acceptHuntRentals({
    ...named,
    facts: {
      ...named.facts,
      [TAX_CASHFLOWS_FIELD]: fact(TAX_CASHFLOWS_FIELD, cashflows),
    },
    pendingProposal: {
      field: "hunt_rentals",
      value: "435 Spetti Drive, Fremont, CA",
      label: "rentals",
      kind: "computed",
      extras: [{ field: "rental_address", value: "435 Spetti Drive, Fremont, CA", label: "rental" }],
    },
  });
  const rentAsk = nextFoxAsk(withRents);
  assert.doesNotMatch(rentAsk.text, /Form 1040, all pages/);
  assert.ok((rentAsk.actions ?? []).some((item) => item.label === "Use this"), rentAsk.text);
  assert.doesNotMatch(rentAsk.text, /I didn’t get rents/);

  const page = overlayW2MedicareFromPage(
    { wages: "69999.84", employer_name: "PARASS RESTAURANT GROUP INC" },
    [
      "Medicare Wages Box 5 of W-2: 91,999.96",
      "Gross Pay 91,999.96",
      "401(k) 23,000.12",
      "Reported W-2 Wages: 69,999.84",
    ].join("\n"),
  );
  assert.equal(page.medicare_wages, "91999.96");
  assert.equal(page.box5, "91999.96");
  assert.notEqual(page.medicare_wages, "69999.84");

  const seFile = sunitaBase();
  const w2Drop = applyExtractedFields(seFile, {
    extractClass: "w2",
    confidence: 0.94,
    fields: {
      employer_name: "PARASS RESTAURANT GROUP INC",
      tax_year: "2024",
      medicare_wages: "91999.96",
      box5: "91999.96",
      wages: "69999.84",
    },
  }).draft;
  assert.ok(isWageW2OnlyProposal(w2Drop.pendingProposal), "SE file still gets named W-2 CFBW");
  const w2Ask = nextFoxAsk(w2Drop);
  assert.match(w2Ask.text, /PARASS RESTAURANT GROUP INC/);
  assert.match(w2Ask.text, /91,999\.96/);
  assert.match(w2Ask.text, /7,667/);
  assert.doesNotMatch(w2Ask.text, /5,750|5,833/);
  assert.doesNotMatch(w2Ask.text, /Got the W-2\. I’m suggesting/);
  assert.ok((w2Ask.actions ?? []).some((item) => item.label === "Change"));

  const afterYears = withQiAndYears(
    withSpetti({
      ...named,
      documents: [
        ...named.documents,
        {
          slot: "w2",
          name: "Sunita 2024 W-2.pdf",
          type: "application/pdf",
          size: 1024,
          receivedAt: "2026-09-16T18:05:00.000Z",
          status: "extracted",
          extractClass: "w2",
        },
      ],
    }),
  );
  assert.equal(afterYears.facts?.[QUALIFYING_INCOME_FIELD]?.value, "7667");
  assert.equal(afterYears.facts?.years_in_business?.value, "19");
  const yearsAsk = nextFoxAsk(afterYears);
  assert.ok(yearsAsk.text.trim(), "after years Use this Fox must speak");
  assert.ok((yearsAsk.actions ?? []).length > 0, "after years Use this must have chips");
  assert.doesNotMatch(yearsAsk.text, /Form 1040, all pages/);
  assert.ok(
    yearsAsk.text === SCHEDULE_E_RENTS_UNREAD_LINE ||
      /These numbers look right/i.test(yearsAsk.text) ||
      /Use this/i.test(yearsAsk.text),
    `next line must be Sch E, unread rents, or Looks right — ${yearsAsk.text}`,
  );
  assert.equal(afterYears.facts?.[QUALIFYING_INCOME_FIELD]?.value, "7667");
  assert.equal(afterYears.facts?.years_in_business?.value, "19");

  const entityYears = writeEntityYears(
    withSpetti({
      ...writeQualifyingIncome(named, "7667"),
      pendingProposal: {
        field: "years_in_business",
        value: "19",
        label: "Years in business",
        kind: "computed",
        methodNote: "entity-return-years",
        hireLabel: "May 25, 2007",
      },
    }),
    "19",
  );
  const usedYears = resolveProposal(
    {
      ...withSpetti(writeQualifyingIncome(named, "7667")),
      pendingProposal: {
        field: "years_in_business",
        value: "19",
        label: "Years in business",
        kind: "computed",
        methodNote: "entity-return-years",
        hireLabel: "May 25, 2007",
      },
    },
    "accept",
  );
  assert.equal(usedYears.facts?.years_in_business?.value, "19");
  assert.equal(usedYears.facts?.[QUALIFYING_INCOME_FIELD]?.value, "7667");
  const usedAsk = nextFoxAsk(usedYears);
  assert.ok(usedAsk.text.trim());
  assert.doesNotMatch(usedAsk.text, /Form 1040, all pages/);
  assert.equal(entityYears.facts?.years_in_business?.value, "19");

  console.log("assert-sunita-three-locks: same-stamp · W-2 Medicare $7,667 · years Use this speaks");
}

main();
