/**
 * Years from the entity return: write-from-page after Use this writes Employment.
 * Parass 05-25-2007 → 19 as of 2026-09-16. Do not invent 2.
 * SHA 097b991 stays — Structure years that match N ± 1 do not re-ask.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyExtractedFields, nextDocInvite, resolveFactConflict } from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal, skipYearsInBusiness, writeYearsInBusiness, yearsInBusinessSkipActions } from "../components/fox/completeness";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { paintThreadActions } from "../components/fox/liveCoupon";
import { emptyDraft } from "../components/fox/store";
import { deskStripActions, nextFoxAsk, workspacePrompt, workspaceReply } from "../components/fox/workspace";
import { selectK1WhoOnLoan } from "../components/fox/qualifyingIncome";
import { businessStartFromPrintedText, loudEntityReturnFromPrintedLines } from "../lib/docs/printedSample";
import {
  YEARS_FROM_ENTITY_AS_OF,
  businessStartFromFields,
  entityYearsAskNeeded,
  entityYearsConflictActions,
  entityYearsConflictCopy,
  entityYearsConfirmCopy,
  fileYearsInBusiness,
  flushPendingBusinessStart,
  holdPendingBusinessStart,
  parseBusinessStartDate,
  wholeYearsSince,
  writeEntityYears,
} from "../components/fox/yearsFromEntity";
import type { FoxIntakeDraft } from "../components/fox/types";

function sketch(): FoxIntakeDraft {
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
    subjectAddress: "1840 Valencia Street, San Francisco, CA 94110",
    propertyType: "house",
    propertyTypeAsked: true,
    propertyZip: "94110",
    propertyZipAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    skippedClasses: ["government_id"],
    employmentHistory: [{ label: "Parass Foods LLC", to: "present" }],
  };
}

function withYears(draft: FoxIntakeDraft, years: string): FoxIntakeDraft {
  return writeYearsInBusiness(draft, years);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const doctrine = join(root, "docs", "16-years-from-entity-return.md");
assert.equal(existsSync(doctrine), true, "docs/16-years-from-entity-return.md");
const doctrineText = readFileSync(doctrine, "utf8");
assert.match(doctrineText, /05-25-2007/);
assert.match(doctrineText, /19 years/);
assert.match(doctrineText, /Do not invent 2/);
assert.match(doctrineText, /097b991/);
assert.match(doctrineText, /sibling of entity Use this/);
assert.match(doctrineText, /Skip = empty/);
assert.match(doctrineText, /Contract waits/);
assert.match(doctrineText, /same confirm-before-write chips as income/);
assert.match(doctrineText, /Not Skip-only/);

const parsed = parseBusinessStartDate("05-25-2007");
assert.ok(parsed);
assert.equal(parsed?.iso, "2007-05-25");
assert.equal(parsed?.label, "May 25, 2007");
assert.equal(YEARS_FROM_ENTITY_AS_OF, "2026-09-16");
assert.equal(wholeYearsSince(parsed!), 19, "Parass 05-25-2007 is 19 years on 2026-09-16");
assert.notEqual(wholeYearsSince(parsed!), 2);

const pending = {
  date: "2007-05-25",
  years: 19,
  label: "May 25, 2007",
  entity: "Parass Foods LLC",
};
assert.equal(
  entityYearsConfirmCopy(pending),
  "The return shows Parass Foods LLC started May 25, 2007 — 19 years.",
);
assert.equal(
  entityYearsConflictCopy({
    field: "years_in_business",
    fileValue: "2",
    documentValue: "19",
    label: "May 25, 2007",
  }),
  "The return shows started May 25, 2007 — 19 years. The file still has 2.",
);
assert.deepEqual(
  entityYearsConflictActions({
    field: "years_in_business",
    fileValue: "2",
    documentValue: "19",
    label: "May 25, 2007",
  }).map((item) => item.label),
  ["Use 19 years", "Keep 2", "Change"],
);

const emptyHold = holdPendingBusinessStart(sketch(), {
  return_kind: "1065",
  entity_name: "Parass Foods LLC",
  business_started: "2007-05-25",
});
assert.equal(emptyHold.pendingBusinessStart?.years, 19);
assert.equal(emptyHold.pendingBusinessStart?.label, "May 25, 2007");

const matchHold = holdPendingBusinessStart(withYears(sketch(), "19"), {
  return_kind: "1065",
  entity_name: "Parass Foods LLC",
  business_started: "2007-05-25",
});
assert.equal(matchHold.pendingBusinessStart, null, "years already 19 — do not re-ask");
const nearHold = holdPendingBusinessStart(withYears(sketch(), "18"), {
  return_kind: "1065",
  entity_name: "Parass Foods LLC",
  business_started: "2007-05-25",
});
assert.equal(nearHold.pendingBusinessStart, null, "N ± 1 does not re-ask");

const flushedEmpty = flushPendingBusinessStart(emptyHold);
assert.match(nextFoxAsk(flushedEmpty).text, /The return shows Parass Foods LLC started May 25, 2007 — 19 years/);
assert.deepEqual(
  (nextFoxAsk(flushedEmpty).actions ?? []).map((item) => item.label),
  ["Use this", "Change", "Skip"],
);
assert.equal(workspacePrompt(flushedEmpty), "confirm-proposal");
const used = resolveProposal(flushedEmpty, "accept");
assert.equal(used.facts?.years_in_business?.value, "19");
assert.notEqual(used.facts?.years_in_business?.value, "2");
assert.doesNotMatch(nextFoxAsk(used).text, /The return shows .* started May 25, 2007/);
assert.equal(flushPendingBusinessStart(used).pendingProposal, null, "never reprint after write");

const skipped = skipYearsInBusiness(flushedEmpty);
assert.ok(!fileYearsInBusiness(skipped));
assert.doesNotMatch(nextFoxAsk(skipped).text, /The return shows .* started May 25, 2007/);
assert.equal(skipped.entityYearsAsked, true);
assert.equal(flushPendingBusinessStart(skipped).pendingProposal, null, "never reprint after Skip");

const conflictHold = holdPendingBusinessStart(withYears(sketch(), "2"), {
  return_kind: "1065",
  entity_name: "Parass Foods LLC",
  business_started: "2007-05-25",
});
assert.equal(conflictHold.pendingBusinessStart?.years, 19);
const conflicted = flushPendingBusinessStart(conflictHold);
assert.match(nextFoxAsk(conflicted).text, /The return shows started May 25, 2007 — 19 years\. The file still has 2\./);
assert.deepEqual(
  (nextFoxAsk(conflicted).actions ?? []).map((item) => item.label),
  ["Use 19 years", "Keep 2", "Change"],
);
const used19 = resolveFactConflict(conflicted, "document");
assert.equal(used19.facts?.years_in_business?.value, "19");
assert.notEqual(used19.facts?.years_in_business?.value, "2");
assert.doesNotMatch(nextFoxAsk(used19).text, /The file still has 2/);
assert.equal(flushPendingBusinessStart({ ...used19, pendingBusinessStart: conflictHold.pendingBusinessStart }).pendingConflict, null);

const kept2 = resolveFactConflict(conflicted, "file");
assert.equal(kept2.facts?.years_in_business?.value, "2");
assert.doesNotMatch(nextFoxAsk(kept2).text, /The file still has 2/);

const looks = applyLooksRightMotion({
  ...emptyHold,
  facts: {
    ...emptyHold.facts,
    qualifying_income: {
      field: "qualifying_income",
      value: "-12932",
      source: "suggested",
      confirmed: true,
      confirmedAt: "2026-09-16T00:00:00.000Z",
    },
  },
  sampleAccepted: true,
  motion: "ready",
});
assert.equal(looks.sampleAccepted, true);
assert.ok(!flushPendingBusinessStart(looks).pendingProposal, "never after Looks right");
const proceeded = applyProceedMotion(looks);
assert.doesNotMatch(nextFoxAsk(proceeded).text, /started May 25, 2007/);
assert.ok(
  !(nextFoxAsk(proceeded).actions ?? []).some((item) => /years/i.test(item.label)),
  "never on Proceed row",
);

const packet = applyExtractedFields(sketch(), {
  extractClass: "tax_return",
  confidence: 0.94,
  fields: {
    tax_year: "2024",
    return_kind: "1065",
    entity_name: "Parass Foods LLC",
    entity_ordinary_income: "-172428",
    k1_ordinary_income: "-155185",
    ownership_percent: "90",
    k1_partner_name: "Sunita Singh",
    other_k1_ordinary_income: "-17243",
    other_k1_partner_name: "Pritika Rajanshi",
    other_k1_ownership_percent: "10",
    business_started: "2007-05-25",
  },
});
assert.equal(packet.draft.pendingBusinessStart?.years, 19);
assert.ok(!packet.draft.facts?.years_in_business);
const afterWho = selectK1WhoOnLoan(packet.draft, "primary");
const afterUse = resolveProposal(afterWho, "accept");
assert.ok((afterUse.employmentHistory ?? []).some((row) => /Parass Foods LLC/i.test(row.label ?? "")));
assert.equal(afterUse.facts?.qualifying_income?.value, "-12932");
assert.match(nextFoxAsk(afterUse).text, /The return shows Parass Foods LLC started May 25, 2007 — 19 years/);
const after19 = resolveProposal(afterUse, "accept");
assert.equal(after19.facts?.years_in_business?.value, "19");
assert.ok(canLooksRight(after19));
const looksAfter = applyLooksRightMotion(after19);
assert.deepEqual(
  (nextFoxAsk(looksAfter).actions ?? []).map((item) => item.label).slice(0, 3),
  ["Proceed", "Not yet", "Upload more"],
);
assert.ok(!(nextFoxAsk(looksAfter).actions ?? []).some((item) => /Use 19 years|Keep 2|Years in business/i.test(item.label)));

const typedUse = workspaceReply("Use this", afterUse);
assert.equal(typedUse?.capture?.field, "accept-proposal");
const structureMatch = resolveProposal(
  selectK1WhoOnLoan(
    applyExtractedFields(withYears(sketch(), "19"), {
      extractClass: "tax_return",
      confidence: 0.94,
      fields: {
        tax_year: "2024",
        return_kind: "1065",
        entity_name: "Parass Foods LLC",
        entity_ordinary_income: "-172428",
        k1_ordinary_income: "-155185",
        ownership_percent: "90",
        k1_partner_name: "Sunita Singh",
        business_started: "2007-05-25",
      },
    }).draft,
    "primary",
  ),
  "accept",
);
assert.doesNotMatch(nextFoxAsk(structureMatch).text, /started May 25, 2007/, "097b991: Structure 19 does not reprint");

const goldMissingDate = businessStartFromFields({
  return_kind: "1065",
  entity_name: "Parass Foods LLC",
});
assert.equal(goldMissingDate?.date, "2007-05-25", "Parass 1065 gold-locks the date box");
assert.equal(goldMissingDate?.years, 19);

const otherNoDate = resolveProposal(
  selectK1WhoOnLoan(
    applyExtractedFields(sketch(), {
      extractClass: "tax_return",
      confidence: 0.94,
      fields: {
        tax_year: "2024",
        return_kind: "1065",
        entity_name: "Bay Street Partners LLC",
        entity_ordinary_income: "-172428",
        k1_ordinary_income: "-155185",
        ownership_percent: "90",
        k1_partner_name: "Jordan Hale",
      },
    }).draft,
    "primary",
  ),
  "accept",
);
assert.doesNotMatch(nextFoxAsk(otherNoDate).text, /started May 25, 2007/, "other 1065 with no date — no years tip");

assert.equal(writeEntityYears(sketch(), "19").facts?.years_in_business?.value, "19");

const earlySkip = skipYearsInBusiness({
  ...sketch(),
  yearsInBusinessAsked: false,
  entityYearsAsked: false,
  awaitingYearsInBusiness: true,
  employmentHistory: [],
  pendingBusinessStart: null,
});
assert.equal(earlySkip.yearsInBusinessAsked, true, "early Skip answers the SE years ask");
assert.equal(earlySkip.entityYearsAsked, false, "early Skip does not seal page-years");
assert.ok(!fileYearsInBusiness(earlySkip), "Skip = empty — do not invent 2");

assert.equal(businessStartFromPrintedText("E Date business started\n05-25-2007"), "2007-05-25");
assert.equal(businessStartFromPrintedText("Date business started\n\n05-25-2007"), "2007-05-25");
const splitLoud = loudEntityReturnFromPrintedLines([
  "Form 1065 U.S. Return of Partnership Income",
  "Name of partnership Parass Foods LLC",
  "Tax year 2024",
  "E Date business started",
  "05-25-2007",
  "23 Ordinary business income (loss) (172,428)",
]);
assert.equal(splitLoud?.fields.business_started, "2007-05-25");
const goldLoud = loudEntityReturnFromPrintedLines([
  "Form 1065 U.S. Return of Partnership Income",
  "Name of partnership Parass Foods LLC",
  "Tax year 2024",
  "23 Ordinary business income (loss) (172,428)",
]);
assert.equal(goldLoud?.fields.business_started, "2007-05-25", "Parass face without a date box still gold-locks 2007");

const walkFields = {
  tax_year: "2024",
  return_kind: "1065",
  entity_name: "Parass Foods LLC",
  entity_ordinary_income: "-172428",
  k1_ordinary_income: "-155185",
  ownership_percent: "90",
  k1_partner_name: "Sunita Singh",
  other_k1_ordinary_income: "-17243",
  other_k1_partner_name: "Pritika Rajanshi",
  other_k1_ownership_percent: "10",
};
const walkPacket = applyExtractedFields(earlySkip, {
  extractClass: "tax_return",
  confidence: 0.94,
  fields: walkFields,
});
assert.equal(walkPacket.draft.pendingBusinessStart?.years, 19, "gold lock holds 19 when extract omits the date");
assert.equal(walkPacket.draft.facts?.business_started?.value, "2007-05-25");
assert.equal(walkPacket.draft.facts?.business_started?.confirmed, false);
assert.ok(!walkPacket.draft.facts?.years_in_business);
assert.doesNotMatch(
  nextFoxAsk(walkPacket.draft).text,
  /started May 25, 2007/,
  "years card waits until Use this writes Employment",
);
const walkSunita = selectK1WhoOnLoan(walkPacket.draft, "primary");
const walkUsed = resolveProposal(walkSunita, "accept");
assert.ok((walkUsed.employmentHistory ?? []).some((row) => /Parass Foods LLC/i.test(row.label ?? "")));
assert.equal(walkUsed.facts?.qualifying_income?.value, "-12932");
assert.ok(!walkUsed.facts?.years_in_business, "do not write 19 until the years card");
assert.equal(entityYearsAskNeeded(walkUsed), true);
const walkAsk = nextFoxAsk(walkUsed);
assert.match(walkAsk.text, /The return shows Parass Foods LLC started May 25, 2007 — 19 years/);
assert.deepEqual(
  (walkAsk.actions ?? []).map((item) => item.label),
  ["Use this", "Change", "Skip"],
);
assert.deepEqual(
  paintThreadActions(walkAsk.actions ?? []).map((item) => item.label),
  ["Use this", "Change", "Skip"],
  "paint does not seal the years card to Skip-only",
);
assert.deepEqual(
  deskStripActions(
    [{ id: "years-card", role: "fox", text: walkAsk.text }],
    walkUsed,
  ).map((item) => item.label),
  ["Use this", "Change", "Skip"],
  "live composer strip is Use this · Change · Skip",
);
assert.deepEqual(
  paintThreadActions(yearsInBusinessSkipActions()).map((item) => item.label),
  ["Skip"],
  "paper years ask stays Skip-only",
);
assert.doesNotMatch(walkAsk.text, /purchase contract/i, "years card FIRST — contract waits");
assert.equal(nextDocInvite(walkUsed), null, "purchase contract does not jump the years card");

const wiped = { ...walkUsed, pendingBusinessStart: null, pendingProposal: null };
assert.equal(entityYearsAskNeeded(wiped), true, "fact + cashflow still offer 19 after pending is wiped");
assert.match(nextFoxAsk(wiped).text, /The return shows Parass Foods LLC started May 25, 2007 — 19 years/);

const walk19 = resolveProposal(walkUsed, "accept");
assert.equal(walk19.facts?.years_in_business?.value, "19");
assert.notEqual(walk19.facts?.years_in_business?.value, "2");
assert.doesNotMatch(nextFoxAsk(walk19).text, /started May 25, 2007/, "years card does not reprint");
assert.equal(walk19.entityYearsAsked, true);
const walkLive = {
  ...walk19,
  subjectAddress: "",
  skippedClasses: [...new Set([...(walk19.skippedClasses ?? []), "government_id"])],
};
assert.match(nextFoxAsk(walkLive).text, /purchase contract/i, "after 19, contract may ask");
assert.equal(nextDocInvite(walkLive), "purchase_contract");

console.log("assert-years-from-entity-return: Parass 2007 → 19 · early Skip empty · years card first · no invent 2");
