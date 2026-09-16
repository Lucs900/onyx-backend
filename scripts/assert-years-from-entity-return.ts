/**
 * Years from the entity return: write-from-page after Use this writes Employment.
 * Parass 05-25-2007 → 19 as of 2026-09-16. Do not invent 2.
 * SHA 097b991 stays — Structure years that match N ± 1 do not re-ask.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyExtractedFields, resolveFactConflict } from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal, skipYearsInBusiness, writeYearsInBusiness } from "../components/fox/completeness";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { emptyDraft } from "../components/fox/store";
import { nextFoxAsk, workspacePrompt, workspaceReply } from "../components/fox/workspace";
import { selectK1WhoOnLoan } from "../components/fox/qualifyingIncome";
import {
  YEARS_FROM_ENTITY_AS_OF,
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

const noDate = resolveProposal(
  selectK1WhoOnLoan(
    applyExtractedFields(sketch(), {
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
      },
    }).draft,
    "primary",
  ),
  "accept",
);
assert.doesNotMatch(nextFoxAsk(noDate).text, /started May 25, 2007/, "no date on the page — no years tip");

assert.equal(writeEntityYears(sketch(), "19").facts?.years_in_business?.value, "19");

console.log("assert-years-from-entity-return: Parass 2007 → 19 · empty CFBW · conflict once · no invent 2");
