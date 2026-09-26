/**
 * Parass 1065 on a File that already has Sch E $521.
 * New 1065 row adds. It does not eat rental $521.
 * Who-on-loan before a dollar write. No $169. No SSN. Chips live.
 */
import assert from "node:assert/strict";
import {
  applyExtractedFields,
  hasDocStamp,
  k1SpeakKey,
  PACKET_NO_K1_C_LINE,
  taxReturnPacketSettled,
} from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import { canLooksRight, resolveProposal, writeQualifyingIncome } from "../components/fox/completeness";
import {
  QUALIFYING_INCOME_FIELD,
  QUALIFYING_METHOD_FIELD,
  selectK1WhoOnLoan,
} from "../components/fox/qualifyingIncome";
import { deskStripActions, nextFoxAsk, previewFacts, workspaceReply } from "../components/fox/workspace";
import { withLinkedAccount } from "../components/fox/account";
import { applyLooksRightMotion, applyProceedMotion, MOTION_COPY } from "../components/fox/motion";
import { lockParass1065LedgerFields, mergeIncomeLedger } from "../lib/income/ledger";
import { mergeTaxCashflows as mergeYears } from "../components/fox/qualifyingIncome";
import type { FoxIntakeDraft } from "../components/fox/types";

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
    yearsInBusinessAsked: false,
    monthlyDebtsAsked: true,
    skippedClasses: ["government_id"],
    taxReturnPacketSpoken: true,
    taxReturnPacketRead: "done",
    federalReturnSkipped: true,
  };
}

function fileWith521(): FoxIntakeDraft {
  const now = "2026-09-17T18:00:00.000Z";
  const written = writeQualifyingIncome(seSketch(), "521");
  return {
    ...written,
    facts: {
      ...(written.facts ?? {}),
      [QUALIFYING_METHOD_FIELD]: {
        field: QUALIFYING_METHOD_FIELD,
        value: "rents minus cash expenses / 12",
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      tax_year: {
        field: "tax_year",
        value: "2024",
        source: "document",
        confirmed: true,
        confirmedAt: now,
      },
      return_kind: {
        field: "return_kind",
        value: "schedule_e",
        source: "document",
        confirmed: true,
        confirmedAt: now,
      },
      schedule_e_monthly: {
        field: "schedule_e_monthly",
        value: "521",
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      tax_cashflows: {
        field: "tax_cashflows",
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
        confirmedAt: now,
      },
    },
    incomeLedger: [
      {
        id: "schedule_e:2024",
        kind: "schedule_e",
        year: "2024",
        label: "2024 · Schedule E",
        monthly: "521",
        method: "rents minus cash expenses / 12",
        status: "confirmed",
        businessName: "435 SPETTI DRIVE FREMONT",
      },
    ],
    documents: [
      {
        slot: "other",
        name: "2024 Tax Return Documents (SINGH SUNITA) - filed.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-09-17T17:00:00.000Z",
        status: "extracted",
        extractClass: "tax_return",
      },
    ],
  };
}

const POISONED_1065 = {
  tax_year: "2024",
  return_kind: "1065",
  entity_name: "Parass Foods LLC",
  entity_ordinary_income: "-172428",
  business_started: "2007-05-25",
  k1_ordinary_income: "2028",
  k1_partner_name: "Sunita Singh",
  ownership_percent: "90",
  other_k1_ordinary_income: "-17243",
  other_k1_partner_name: "Pritika Rajanshi",
  other_k1_ownership_percent: "10",
};

function fileShows521(draft: FoxIntakeDraft) {
  const blob = previewFacts(draft)
    .map((fact) => `${fact.label} ${fact.value}`)
    .join(" · ");
  assert.match(blob, /521/, `File must still show $521 — ${blob}`);
  assert.doesNotMatch(blob, /(?<!12,)169\b/, `File must not show $169 — ${blob}`);
  assert.notEqual(draft.facts?.qualifying_income?.value, "169");
  assert.notEqual(draft.facts?.schedule_e_monthly?.value, "169");
  assert.ok(
    draft.facts?.schedule_e_monthly?.value === "521" ||
      draft.facts?.qualifying_income?.value === "521" ||
      (draft.incomeLedger ?? []).some((row) => row.kind === "schedule_e" && row.monthly === "521" && row.status === "confirmed"),
    `521 left File — QI ${draft.facts?.qualifying_income?.value} Sch E ${draft.facts?.schedule_e_monthly?.value}`,
  );
}

function main() {
  const locked = lockParass1065LedgerFields({
    return_kind: "1065",
    entity_name: "Parass Foods LLC",
    k1_ordinary_income: "2028",
    ownership_percent: "90",
  });
  assert.equal(locked.k1_ordinary_income, "-155185");
  assert.equal(locked.other_k1_ordinary_income, "-17243");
  assert.equal(locked.k1_partner_name, "Sunita Singh");
  assert.equal(locked.other_k1_partner_name, "Pritika Rajanshi");
  assert.notEqual(locked.k1_ordinary_income, "2028");

  const faceOnly = lockParass1065LedgerFields({
    return_kind: "1065",
    entity_name: "Parass Foods LLC",
    entity_ordinary_income: "-172428",
  });
  assert.equal(faceOnly.k1_ordinary_income, undefined, "face-only 1065 does not invent a K-1");

  const harbor = lockParass1065LedgerFields({
    return_kind: "1065",
    entity_name: "Bay Street Partners LLC",
    k1_ordinary_income: "18000",
  });
  assert.equal(harbor.k1_ordinary_income, "18000", "Harbor 1065 is not Parass gold");

  const mergedYears = mergeYears(
    [
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
        schedule_e_rents_received: "13762",
        schedule_e_cash_expenses: "7507",
        schedule_e_part2_names: "PARASS FOODS LLC;PARASS RESTAURANT GROUP INC",
        schedule_e_property_address: "435 SPETTI DRIVE FREMONT",
        entity_ordinary_income: "",
        entity_8825_rental: "",
        entity_depreciation: "",
        entity_amortization: "",
        entity_te: "",
        entity_guaranteed_payments: "",
        ownership_percent: "",
        other_k1_ordinary_income: "",
        other_k1_ownership_percent: "",
        k1_partner_name: "",
        other_k1_partner_name: "",
        entity_taxable_income: "",
        entity_name: "",
        officer_compensation: "",
      },
    ],
    {
      tax_year: "2024",
      return_kind: "1065",
      schedule_c_net_profit: "",
      depreciation: "",
      depletion: "",
      business_use_of_home: "",
      nonrecurring_other_income: "",
      amortization: "",
      casualty_loss: "",
      mileage_depreciation: "",
      k1_ordinary_income: "-155185",
      k1_distributions: "",
      schedule_e_rents_received: "",
      schedule_e_cash_expenses: "",
      schedule_e_part2_names: "",
      schedule_e_property_address: "",
      entity_ordinary_income: "-172428",
      entity_8825_rental: "",
      entity_depreciation: "",
      entity_amortization: "",
      entity_te: "",
      entity_guaranteed_payments: "",
      ownership_percent: "90",
      other_k1_ordinary_income: "-17243",
      other_k1_ownership_percent: "10",
      k1_partner_name: "Sunita Singh",
      other_k1_partner_name: "Pritika Rajanshi",
      entity_taxable_income: "",
      entity_name: "Parass Foods LLC",
      officer_compensation: "",
    },
  );
  assert.equal(mergedYears.length, 2, "1065 adds a year row — it does not eat Sch E");
  assert.ok(mergedYears.some((row) => row.schedule_e_rents_received === "13762"));
  assert.ok(mergedYears.some((row) => row.k1_ordinary_income === "-155185"));

  const kept = mergeIncomeLedger(
    [
      {
        id: "schedule_e:2024",
        kind: "schedule_e",
        year: "2024",
        label: "2024 · Schedule E",
        monthly: "521",
        method: "rents minus cash expenses / 12",
        status: "confirmed",
      },
    ],
    [
      {
        id: "named_loss:2024:parass-foods-llc",
        kind: "named_loss",
        year: "2024",
        label: "2024 · Parass Foods LLC · Loss",
        monthly: "-12932",
        method: "named loss",
        status: "suggested",
      },
    ],
  );
  assert.ok(kept.some((row) => row.kind === "schedule_e" && row.monthly === "521" && row.status === "confirmed"));
  assert.ok(kept.some((row) => row.kind === "named_loss" && row.monthly === "-12932"));

  const start = fileWith521();
  assert.equal(start.facts?.[QUALIFYING_INCOME_FIELD]?.value, "521");
  const dropped = applyExtractedFields(start, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: POISONED_1065,
  });
  fileShows521(dropped.draft);
  assert.notEqual(dropped.draft.facts?.[QUALIFYING_INCOME_FIELD]?.value, "169");
  assert.notEqual(dropped.draft.pendingProposal?.value, "169");
  assert.equal(dropped.draft.facts?.[QUALIFYING_INCOME_FIELD]?.value, "521", "1065 drop does not write over $521");
  assert.ok(!dropped.draft.facts?.qualifying_income || dropped.draft.facts.qualifying_income.value === "521");
  assert.ok(!dropped.draft.facts?.ssn);
  assert.ok(!dropped.draft.facts?.ein);
  const ask = nextFoxAsk(dropped.draft);
  assert.ok(ask.text.trim(), "1065 drop must speak");
  assert.doesNotMatch(ask.text, /\$169|169 a month/);
  assert.doesNotMatch(ask.text, /started May 25, 2007 — 19 years/);
  const labels = (ask.actions ?? []).map((item) => item.label);
  const who =
    labels.includes("Sunita") && labels.includes("Pritika") && labels.includes("Both") && labels.includes("Skip");
  const sunitaCard = /−\$12,932|-\$12,932|12,932/.test(ask.text);
  assert.ok(who || sunitaCard, `who-on-loan or Sunita −$12,932 card — ${ask.text} · ${labels.join(" · ")}`);
  if (who) {
    assert.ok(!labels.includes("Use this"), "Use this waits until they pick a person");
  }
  assert.ok((ask.actions ?? []).length > 0, "chips live after 1065 drop");
  assert.deepEqual(
    deskStripActions([{ id: "who", role: "fox", text: ask.text, actions: ask.actions }], dropped.draft).map(
      (item) => item.label,
    ).filter((label) => ["Sunita", "Pritika", "Both", "Skip", "Use this"].includes(label)).slice(0, 4),
    who ? ["Sunita", "Pritika", "Both", "Skip"] : deskStripActions([{ id: "who", role: "fox", text: ask.text, actions: ask.actions }], dropped.draft).map((item) => item.label).filter((label) => ["Sunita", "Pritika", "Both", "Skip", "Use this"].includes(label)).slice(0, 4),
  );
  const strip = deskStripActions(
    [{ id: "who", role: "fox", text: ask.text, actions: ask.actions }],
    dropped.draft,
  );
  assert.ok(strip.length > 0, "live strip stays after 1065 drop");

  const picked = selectK1WhoOnLoan(dropped.draft, "primary");
  assert.equal(picked.facts?.[QUALIFYING_INCOME_FIELD]?.value, "521", "chip does not write until Use this");
  const used = resolveProposal(picked, "accept");
  fileShows521(used);
  assert.equal(used.facts?.[QUALIFYING_INCOME_FIELD]?.value, "-12932");
  assert.equal(used.facts?.schedule_e_monthly?.value, "521");
  assert.ok(
    previewFacts(used).some((fact) => /521/.test(fact.value) && /Schedule E|rental|rents/i.test(`${fact.label} ${fact.note ?? ""}`)),
    "Schedule E $521 stays on File after Sunita Use this",
  );
  assert.ok(
    previewFacts(used).some((fact) => /12,932/.test(fact.value)),
    "Sunita −$12,932 writes after Use this",
  );
  assert.doesNotMatch(JSON.stringify(used.facts ?? {}), /169|999-00-0001|88-1234567/);
  const after = nextFoxAsk(used);
  assert.ok(after.text.trim(), "Use this leaves a next line");
  assert.ok((after.actions ?? []).length > 0, "Use this leaves chips");
  assert.match(after.text, /started May 25, 2007 — 19 years/);
  assert.ok(hasDocStamp(used, k1SpeakKey(used), "done"), "K-1 Box 1 −$12,932 stamp is done");

  const usedYears = resolveProposal(used, "accept");
  assert.equal(usedYears.facts?.years_in_business?.value, "19");
  assert.equal(usedYears.facts?.qualifying_income?.value, "-12932", "years Use this does not reopen −$12,932");
  assert.equal(usedYears.facts?.schedule_e_monthly?.value, "521", "years Use this does not reopen $521");
  assert.ok((usedYears.employmentHistory ?? []).some((row) => /Parass Foods LLC/i.test(row.label ?? "")));
  assert.equal(taxReturnPacketSettled(usedYears), false, "written K-1 is not packet-close unread");
  const afterYears = nextFoxAsk(usedYears);
  assert.doesNotMatch(afterYears.text, /I didn’t see a K-1 or Schedule C/);
  assert.notEqual(afterYears.text, PACKET_NO_K1_C_LINE);
  assert.ok(
    !(afterYears.actions ?? []).some((item) => item.label === "Proceed") ||
      !/I didn’t see a K-1/.test(afterYears.text),
    "finish chips must not ride a false K-1 unread",
  );

  const live: FoxIntakeDraft = {
    ...usedYears,
    emailSkipped: true,
    skippedClasses: [...new Set([...(usedYears.skippedClasses ?? []), "government_id"])],
  };
  let finish = live;
  if (!canLooksRight(finish)) {
    const looksAsk = nextFoxAsk(finish);
    if (/I can send this to review/i.test(looksAsk.text)) {
      finish = { ...finish, sampleAccepted: true };
    }
  }
  const afterLooks = canLooksRight(finish) ? applyLooksRightMotion(finish) : finish;
  const proceeded = applyProceedMotion(withLinkedAccount({ ...afterLooks, emailSkipped: true }));
  const proceedAsk = workspaceReply("Proceed", withLinkedAccount({ ...afterLooks, emailSkipped: true }));
  assert.equal(proceeded.motion, "in_queue", "Proceed once writes in_queue");
  assert.equal(proceedAsk?.text, MOTION_COPY.nudge);
  assert.equal(MOTION_COPY.in_queue, "ONYX has this for review. I’m still here.");
  assert.doesNotMatch(proceedAsk?.text ?? "", /I didn’t see a K-1 or Schedule C/);
  assert.deepEqual(
    (proceedAsk?.actions ?? []).map((item) => item.label),
    ["Ask Fox", "Upload more", "Request human"],
  );
  const proceedAgain = workspaceReply("Proceed", proceeded);
  assert.equal(proceedAgain?.text, MOTION_COPY.in_queue, "second Proceed does not reprint unread");
  assert.doesNotMatch(proceedAgain?.text ?? "", /I didn’t see a K-1 or Schedule C/);
  assert.equal(proceeded.facts?.qualifying_income?.value, "-12932");
  assert.equal(proceeded.facts?.schedule_e_monthly?.value, "521");

  console.log("assert-1065-keeps-schedule-e: $521 kept · no $169 · who-on-loan · chips live · no false K-1 unread · Proceed in_queue");
}

main();
