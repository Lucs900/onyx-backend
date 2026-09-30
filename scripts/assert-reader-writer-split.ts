/**
 * Ticket 73 leftover. Reader map only. Writer after Use this.
 * Does not write File 38f1b63c. Does not rewrite walker case 72.
 * Printed lines only — do not invent a founder PDF or an Agfa fixture.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyPageByFormHeader } from "../lib/docs/formHeader";
import {
  extractClassFromReaderMap,
  fieldsOnReaderMap,
  paystubExtractOpens,
  readerMapFromPrintedLines,
  readerMapNeverOpensStub,
} from "../lib/docs/readerMap";
import {
  applyExtractedFields,
  docsInDisplayLabels,
  federalReturnConfirmCopy,
  hasLockedSuggestion,
  looksLikePaystubFields,
} from "../components/fox/fileWrite";
import { proposalAskCopy, resolveProposal } from "../components/fox/completeness";
import { applyExtractWrite, emptyDraft, loadIntakeDraft } from "../components/fox/store";
import { loudWageFromPrintedLines } from "../lib/docs/printedSample";
import { nextFoxAsk, previewFacts } from "../components/fox/workspace";
import { readerMapOpensReturnCard } from "../lib/docs/readerMap";

const PERSONAL = [
  "Form 1040",
  "U.S. Individual Income Tax Return",
  "Sichiv Ho",
  "Vouch Eim Soy",
  "California wages $96,000",
  "Shareholder HO & SOY INC",
  "Agfa Monotype Corporation",
];

function looksRightDraft() {
  return {
    ...emptyDraft(),
    path: "acr" as const,
    productIntent: "buy" as const,
    workspaceFlow: true,
    sampleAccepted: true,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" as const, confirmed: true },
  };
}

function main() {
  const map = readerMapFromPrintedLines(PERSONAL);
  assert.ok(map.forms.includes("1040"), `forms ${map.forms.join(",")}`);
  assert.ok(map.names.some((name) => /Sichiv Ho/i.test(name)), `names ${map.names.join(" · ")}`);
  assert.ok(map.names.some((name) => /Vouch Eim Soy/i.test(name)), `names ${map.names.join(" · ")}`);
  assert.ok(map.entities.some((name) => /HO\s*&\s*SOY INC/i.test(name)), `entities ${map.entities.join(" · ")}`);
  assert.ok(map.lines.some((line) => line.kind === "wages" && line.value === "96000"));
  assert.ok(map.missing.includes("employer"));
  assert.ok(map.missing.includes("pay_period"));
  assert.ok(map.missing.includes("period_gross"));
  assert.equal(readerMapNeverOpensStub(map), true);
  assert.equal(readerMapOpensReturnCard(map), true);
  assert.equal(extractClassFromReaderMap(map), "tax_return");
  assert.equal(loudWageFromPrintedLines(PERSONAL), null);
  assert.doesNotMatch(JSON.stringify(map), /Agfa|Monotype/i);

  assert.equal(paystubExtractOpens({ employer_name: "Harbor Cafe" }), false);
  assert.equal(paystubExtractOpens({ employer_name: "Harbor Cafe", gross_period: "400" }), false);
  assert.equal(
    paystubExtractOpens({
      employer_name: "Harbor Cafe",
      pay_period_end: "2026-07-31",
      gross_period: "400",
    }),
    true,
  );
  assert.equal(
    paystubExtractOpens({
      employer_name: "Agfa Monotype Corporation",
      pay_period_end: "2026-07-31",
      gross_period: "400",
    }),
    false,
  );
  assert.equal(hasLockedSuggestion("paystub", { employer_name: "Harbor Cafe" }), false);
  assert.equal(looksLikePaystubFields({ employer_name: "Harbor Cafe", gross_period: "400" }), false);
  assert.equal(
    fieldsOnReaderMap(
      {
        employer_name: "Alameda Health System",
        pay_period_end: "08/15/2026",
        gross_period: "16824.30",
      },
      {
        forms: ["paystub"],
        names: ["ALAMEDA HEALTH SYSTEM"],
        entities: [],
        lines: [{ kind: "wages", value: "225.80", label: "Total Gross" }],
        missing: [],
      },
    ).gross_period,
    "16824.30",
    "stub period gross stays; a wages line is not the period",
  );

  assert.equal(classifyPageByFormHeader("Form 8879 IRS e-file Signature Authorization"), "form_8879");
  assert.equal(
    classifyPageByFormHeader("Form 540 California Resident Income Tax Return Sichiv Ho"),
    "form_540",
  );
  assert.equal(
    classifyPageByFormHeader("Form 7203 S Corporation Shareholder Stock and Debt Basis Limitations"),
    "form_7203",
  );
  assert.equal(
    classifyPageByFormHeader("Schedule K-1 (Form 1120-S) Shareholder's Share HO & SOY INC"),
    "k1",
  );
  for (const page of [
    ["Form 8879", "IRS e-file Signature Authorization", "Sichiv Ho"],
    ["Form 540", "California Resident Income Tax Return", "Sichiv Ho"],
    ["Form 7203", "S Corporation Shareholder Stock and Debt Basis Limitations"],
    ["Schedule K-1 (Form 1120-S)", "Shareholder's Share", "HO & SOY INC"],
  ]) {
    const next = readerMapFromPrintedLines(page);
    assert.equal(readerMapNeverOpensStub(next), true, `never stub ${page[0]}`);
    assert.notEqual(extractClassFromReaderMap(next), "paystub");
    assert.equal(loudWageFromPrintedLines(page), null);
  }

  const receivedAt = "2026-09-30T04:00:00.000Z";
  const name = "Sichiv Vouch 2024 personal.pdf";
  loadIntakeDraft({
    ...looksRightDraft(),
    documents: [
      {
        slot: "other",
        name,
        type: "application/pdf",
        size: 12000,
        receivedAt,
        status: "received",
      },
    ],
  });
  const beforeUse = applyExtractWrite(receivedAt, name, {
    extractClass: "paystub",
    confidence: 0.9,
    fields: { employer_name: "Agfa Monotype Corporation", wages: "8919" },
    readerMap: map,
  });
  assert.equal(beforeUse.draft.facts?.employer_name, undefined);
  assert.equal(beforeUse.draft.facts?.wages, undefined, "invented wages do not write before Use this");
  assert.doesNotMatch(JSON.stringify(beforeUse.draft.pendingProposal ?? {}), /Agfa|Monotype|8,919|8919/i);
  assert.ok(
    !docsInDisplayLabels(beforeUse.draft).includes("Paystubs in"),
    `reader must not stamp Paystubs in — ${docsInDisplayLabels(beforeUse.draft).join(" · ")}`,
  );
  const liveCard = proposalAskCopy(beforeUse.draft.pendingProposal);
  assert.match(liveCard, /HO\s*&\s*SOY INC/i, `reader map must come back as a card — ${liveCard}`);
  assert.match(liveCard, /96,000/, `card must offer the on-page wage — ${liveCard}`);
  assert.doesNotMatch(liveCard, /8,919|8919/);
  assert.deepEqual(
    (nextFoxAsk(beforeUse.draft).actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  const payBefore = previewFacts(beforeUse.draft).find((fact) => fact.id === "pay" || fact.label === "Pay");
  assert.ok(
    !payBefore || !/8,919|8919/.test(payBefore.value),
    `pad must not write Pay · Wages $8,919 — ${payBefore?.value ?? "none"}`,
  );

  const skippedLive = resolveProposal(beforeUse.draft, "decline");
  assert.equal(skippedLive.facts?.wages, undefined);
  assert.equal(skippedLive.facts?.entity_name, undefined);
  assert.equal(skippedLive.facts?.tax_year, undefined);
  assert.ok(!docsInDisplayLabels(skippedLive).includes("Paystubs in"));
  assert.ok(!docsInDisplayLabels(skippedLive).includes("Tax return in"));

  const emptyFieldsMap = applyExtractedFields(looksRightDraft(), {
    extractClass: "w2",
    confidence: 0.5,
    fields: { wages: "8919" },
    readerMap: map,
  });
  assert.equal(emptyFieldsMap.draft.facts?.wages, undefined);
  const emptyMapCard = proposalAskCopy(emptyFieldsMap.draft.pendingProposal);
  assert.match(emptyMapCard, /HO\s*&\s*SOY INC/i, `map-only extract is still a card — ${emptyMapCard}`);
  assert.match(emptyMapCard, /96,000/);
  assert.doesNotMatch(emptyMapCard, /8,919|8919/);
  assert.deepEqual(
    (nextFoxAsk(emptyFieldsMap.draft).actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );

  const inventedOnly = applyExtractedFields(looksRightDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { wages: "8919", form_1040: "1" },
  });
  assert.equal(inventedOnly.draft.facts?.wages, undefined, "a wage without a reader line does not write");
  const inventedCopy = inventedOnly.draft.pendingProposal
    ? proposalAskCopy(inventedOnly.draft.pendingProposal)
    : "";
  assert.doesNotMatch(inventedCopy, /8,919|8919|96,000/);

  const namesOnly = applyExtractedFields(looksRightDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: { tax_year: "2024", full_name: "Sichiv Ho and Vouch Eim Soy" },
  });
  const namesOnlyCopy = proposalAskCopy(namesOnly.draft.pendingProposal);
  assert.match(namesOnlyCopy, /2024 return/i);
  assert.doesNotMatch(namesOnlyCopy, /96,000|96000|HO\s*&\s*SOY/i, "names-only extract does not invent a wage or entity");

  const proposed = applyExtractedFields(looksRightDraft(), {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: {
      tax_year: "2024",
      full_name: "Sichiv Ho and Vouch Eim Soy",
      employer_name: "Agfa Monotype Corporation",
    },
    readerMap: map,
  });
  assert.equal(proposed.draft.facts?.employer_name, undefined);
  assert.equal(proposed.draft.facts?.tax_year, undefined);
  assert.equal(proposed.draft.facts?.entity_name, undefined, "entity stays off File until Use this");
  assert.equal(proposed.draft.facts?.wages, undefined, "wage stays off File until Use this");
  assert.doesNotMatch(JSON.stringify(proposed.draft.pendingProposal ?? {}), /Agfa|Monotype/i);
  const card = proposalAskCopy(proposed.draft.pendingProposal);
  assert.match(card, /2024 return/i);
  assert.match(card, /Sichiv Ho/i);
  assert.match(card, /Vouch Eim Soy/i);
  assert.match(card, /HO\s*&\s*SOY INC/i, `card must name the entity — ${card}`);
  assert.match(card, /96,000/, `card must offer the on-page wage — ${card}`);
  assert.doesNotMatch(card, /Agfa|Monotype/i);
  assert.notEqual(federalReturnConfirmCopy({ tax_year: "2024", full_name: "Sichiv Ho and Vouch Eim Soy" }).includes("96,000"), true);
  const ask = nextFoxAsk(proposed.draft);
  assert.deepEqual(
    (ask.actions ?? []).map((item) => item.label),
    ["Use this", "Change"],
  );
  const skipped = resolveProposal(proposed.draft, "decline");
  assert.equal(skipped.facts?.tax_year, undefined);
  assert.equal(skipped.facts?.employer_name, undefined);
  assert.equal(skipped.facts?.entity_name, undefined);
  assert.equal(skipped.facts?.wages, undefined);
  assert.ok(!docsInDisplayLabels(skipped).includes("Paystubs in"));

  const used = resolveProposal(proposed.draft, "accept");
  assert.doesNotMatch(JSON.stringify(used.facts ?? {}), /Agfa|Monotype/i);
  assert.match(String(used.facts?.entity_name?.value ?? ""), /HO\s*&\s*SOY INC/i);
  assert.equal(used.facts?.wages?.value, "96000");
  assert.ok(!docsInDisplayLabels(used).includes("Paystubs in"), "personal return is not Paystubs in");

  const extractSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "lib/docs/extract.ts"), "utf8");
  assert.match(extractSrc, /Same Grok look/);
  assert.match(extractSrc, /async read\(/);
  assert.match(extractSrc, /if \(adapter\.read\)/);
  assert.match(extractSrc, /readerMapOpensReturnCard/);
  assert.match(extractSrc, /printedLooksLikePersonal1040\(walked\)/);
  assert.doesNotMatch(extractSrc, /hold the class until Use this/);
  const fileWriteSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "components/fox/fileWrite.ts"),
    "utf8",
  );
  assert.doesNotMatch(fileWriteSrc, /HO & SOY INC/, "entity is not a hardcoded card");
  assert.doesNotMatch(fileWriteSrc, /Sichiv Ho/, "names are not a hardcoded card");
  assert.doesNotMatch(fileWriteSrc, /96,000/, "wage is not a hardcoded card");

  const walker72 = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "assert-walker-case-72.ts"),
    "utf8",
  );
  assert.match(walker72, /W-2 in · ID in/);
  console.log(
    "assert-reader-writer-split: map only · stub triple · 1040/8879/540/7203/K-1 never stub · Use this writes a reader line · Skip empty · no Paystubs in",
  );
}

main();
