/**
 * Harbor Acceptance File — Manager walk only.
 * Start over → Buy → Primary → House → 94123 → 760+ → $1,000,000 → 20
 * Income Both · W-2 03 + stub 07 · years 2 · debts Skip · ID 01
 * Schedule C 11 first (named 2024 next) · 10 · cover 19 · bank 05 · contract 09
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { POST as extractRoute } from "../app/api/docs/extract/route";
import { FAILED_READ_NOTE } from "../lib/docs/accept";
import { searchedKeyFor } from "../lib/rateflow/fromDraft";
import {
  coverMapAskCopy,
  DOC_INVITE_COPY,
  docInviteAskCopy,
  extractHintFromDraft,
  intakeIsCoverDrop,
  intakeIsIdDrop,
  nextCoverScheduleLabels,
  nextDocInvite,
  priorYearReturnInviteCopy,
  skipUnreadDoc,
  speakCoverScheduleLabels,
  taxReturnInviteCopy,
  unreadDocOpen,
} from "../components/fox/fileWrite";
import { applyExtractWrite, emptyDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import { canLooksRight, draftHasOpenConfirmCard, resolveProposal, writeYearsInBusiness } from "../components/fox/completeness";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { CITIZENSHIP_ASK, citizenshipNeeded } from "../components/fox/citizenship";
import { skipFormerHistory, WHERE_BEFORE_ASK } from "../components/fox/fileHistory";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { wageEmploymentFileLine } from "../components/fox/qualifyingIncome";
import {
  nextFoxAsk,
  previewFacts,
  unreadDocActions,
  unreadRestoreActions,
  workspacePrompt,
  workspacePromptCopy,
} from "../components/fox/workspace";
import type { ExtractClass, FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function load(name: string) {
  return new Uint8Array(readFileSync(join(root, "sample-docs", name)));
}

function bothSketch(): FoxIntakeDraft {
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
    incomeType: { ...emptyDraft().incomeType, value: "both" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_000_000,
    downPaymentAmount: 200_000,
    loanAmountValue: 800_000,
    valueAsked: true,
    amountAsked: true,
    subjectAddress: "94123",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectAddressAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
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
  failed?: boolean,
  note?: string,
) {
  loadIntakeDraft(draft);
  receiveDocument({
    slot: "other",
    name,
    type: "application/pdf",
    size: 2048,
    receivedAt: at,
  });
  return applyExtractWrite(
    at,
    name,
    { extractClass, confidence: 0.94, fields },
    failed ? FAILED_READ_NOTE : note,
    Boolean(failed),
  );
}

function acceptIfOpen(draft: FoxIntakeDraft) {
  return draft.pendingProposal ? resolveProposal(draft, "accept") : draft;
}

async function main() {
  let file = bothSketch();
  assert.equal(file.incomeType.value, "both");
  assert.equal(file.propertyZip, "94123");
  assert.equal(file.propertyValueAmount, 1_000_000);
  assert.equal(file.downPaymentAmount, 200_000);

  const w2 = await routeExtract("03-w2-2025-jordan-hale.pdf", "w2");
  assert.notEqual(w2.failed, true);
  assert.equal(w2.class, "w2");
  const w2Write = writeLive(
    file,
    "03-w2-2025-jordan-hale.pdf",
    (w2.class as ExtractClass) ?? "w2",
    w2.fields ?? {},
    "2026-09-05T20:00:00.000Z",
    w2.failed,
    w2.note,
  );
  file = acceptIfOpen(w2Write.draft);
  assert.match(file.facts?.employer_name?.value ?? wageEmploymentFileLine(file), /Harbor Pacific Design Inc/i);

  const stub = await routeExtract("07-paystub-biweekly-loud.pdf", "paystub");
  assert.notEqual(stub.failed, true);
  assert.equal(stub.class, "paystub");
  const stubWrite = writeLive(
    file,
    "07-paystub-biweekly-loud.pdf",
    (stub.class as ExtractClass) ?? "paystub",
    stub.fields ?? {},
    "2026-09-05T20:01:00.000Z",
    stub.failed,
    stub.note,
  );
  file = acceptIfOpen(stubWrite.draft);
  assert.equal((file.employmentHistory ?? []).filter((row) => row.label).length <= 1, true);
  assert.match(wageEmploymentFileLine(file), /Harbor Pacific Design Inc/);
  assert.equal(
    (file.employmentHistory ?? []).filter((row) => /Harbor/i.test(row.label ?? "")).length,
    1,
  );

  file = writeYearsInBusiness(file, "2");
  assert.equal(file.facts?.years_in_business?.value, "2");
  file = skipMonthlyDebts(file);

  const id = await routeExtract(
    "01-ca-id-jordan-hale.pdf",
    extractHintFromDraft(file, "01-ca-id-jordan-hale.pdf"),
  );
  assert.notEqual(id.failed, true);
  const idWrite = writeLive(
    file,
    "01-ca-id-jordan-hale.pdf",
    (id.class as ExtractClass) ?? "government_id",
    id.fields ?? {},
    "2026-09-05T20:02:00.000Z",
    id.failed,
    id.note,
  );
  file = acceptIfOpen(idWrite.draft);
  assert.match(file.facts?.present_address?.value ?? "", /Filbert/i);
  assert.match(file.facts?.present_address?.value ?? "", /94123/);

  assert.equal(nextDocInvite(file), "tax_return");
  const firstReturnAsk = taxReturnInviteCopy(file);
  assert.equal(firstReturnAsk, "I need your 2025 federal return — the 1040 cover and the Schedule C for Hale Design.");
  assert.equal(nextFoxAsk(file).text, firstReturnAsk);
  assert.doesNotMatch(nextFoxAsk(file).text, /most recent tax return|prior-year/i);
  assert.doesNotMatch(docInviteAskCopy(file, "tax_return"), /prior-year|most recent tax return/i);
  assert.equal(workspacePromptCopy("documents", file).text, firstReturnAsk);
  assert.doesNotMatch(workspacePromptCopy("documents", file).text, /prior-year|most recent tax return/i);

  const elevenFirst = await routeExtract(
    "11-1040-schedule-c-2025-hale-design.pdf",
    extractHintFromDraft(file, "11-1040-schedule-c-2025-hale-design.pdf"),
  );
  assert.notEqual(elevenFirst.failed, true);
  const elevenFirstWrite = writeLive(
    structuredClone(file),
    "11-1040-schedule-c-2025-hale-design.pdf",
    (elevenFirst.class as ExtractClass) ?? "tax_return",
    elevenFirst.fields ?? {},
    "2026-09-05T20:02:30.000Z",
    elevenFirst.failed,
    elevenFirst.note,
  );
  let elevenFile = elevenFirstWrite.draft;
  assert.equal(elevenFile.pendingProposal?.field, "qualifying_income");
  assert.match(elevenFile.pendingProposal?.methodNote ?? "", /combined wage \+ Schedule C/);
  const elevenCombined = nextFoxAsk(elevenFile);
  assert.match(elevenCombined.text, /combined wage \+ Schedule C/);
  assert.ok((elevenCombined.actions ?? []).some((item) => item.label === "Use this"));
  elevenFile = resolveProposal(elevenFile, "accept");
  assert.equal(nextDocInvite(elevenFile), "prior_year_return");
  assert.equal(nextFoxAsk(elevenFile).text, "I have 2025 Hale Design. I need the 2024 Schedule C next.");
  assert.doesNotMatch(nextFoxAsk(elevenFile).text, /prior-year|most recent tax return/i);
  assert.doesNotMatch(workspacePromptCopy("documents", elevenFile).text, /prior-year|most recent tax return/i);

  const ten = await routeExtract(
    "10-1040-schedule-c-2024-hale-design.pdf",
    extractHintFromDraft(file, "10-1040-schedule-c-2024-hale-design.pdf"),
  );
  assert.notEqual(ten.failed, true);
  const tenWrite = writeLive(
    file,
    "10-1040-schedule-c-2024-hale-design.pdf",
    (ten.class as ExtractClass) ?? "tax_return",
    ten.fields ?? {},
    "2026-09-05T20:03:00.000Z",
    ten.failed,
    ten.note,
  );
  file = tenWrite.draft;
  assert.equal(file.pendingProposal?.field, "qualifying_income");
  assert.match(file.pendingProposal?.methodNote ?? "", /combined wage \+ Schedule C/);
  assert.match(file.pendingProposal?.methodNote ?? "", /W-2|Box 5|biweekly|wage/i);
  assert.match(file.pendingProposal?.methodNote ?? "", /Schedule C/);
  const combinedAsk = nextFoxAsk(file);
  assert.match(combinedAsk.text, /combined wage \+ Schedule C/);
  assert.ok((combinedAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.equal((combinedAsk.actions ?? []).filter((item) => item.label === "Use this").length, 1);
  assert.equal(canLooksRight(file), false);
  assert.equal(draftHasOpenConfirmCard(file), true);
  const looksWhileCombined = applyLooksRightMotion(file);
  assert.notEqual(looksWhileCombined.sampleAccepted, true);

  const incomeBeforeCover = resolveProposal(file, "accept");
  file = incomeBeforeCover;
  const lockedIncome = file.facts?.qualifying_income?.value;
  assert.ok(lockedIncome);
  assert.doesNotMatch(docInviteAskCopy(file, nextDocInvite(file) ?? "prior_year_return"), /prior-year|most recent tax return/i);
  assert.equal(priorYearReturnInviteCopy(file), "I have 2024 Hale Design. I need the 2025 Schedule C next.");
  assert.equal(nextFoxAsk(file).text, priorYearReturnInviteCopy(file));
  assert.doesNotMatch(nextFoxAsk(file).text, /prior-year|most recent tax return/i);

  const eleven = await routeExtract(
    "11-1040-schedule-c-2025-hale-design.pdf",
    extractHintFromDraft(file, "11-1040-schedule-c-2025-hale-design.pdf"),
  );
  assert.notEqual(eleven.failed, true);
  const elevenOnly = acceptIfOpen(
    writeLive(
      { ...bothSketch(), incomeType: { ...emptyDraft().incomeType, value: "both" } },
      "11-1040-schedule-c-2025-hale-design.pdf",
      (eleven.class as ExtractClass) ?? "tax_return",
      eleven.fields ?? {},
      "2026-09-05T20:03:30.000Z",
      eleven.failed,
      eleven.note,
    ).draft,
  );
  assert.match(priorYearReturnInviteCopy(elevenOnly), /I have 2025 Hale Design\. I need the 2024 Schedule C next/);
  assert.doesNotMatch(priorYearReturnInviteCopy(elevenOnly), /prior-year/i);

  assert.equal(extractHintFromDraft(file, "19-1040-cover-2024-jordan-hale.pdf"), "tax_return");
  const cover = await routeExtract(
    "19-1040-cover-2024-jordan-hale.pdf",
    extractHintFromDraft(file, "19-1040-cover-2024-jordan-hale.pdf"),
  );
  assert.notEqual(cover.failed, true);
  assert.equal(cover.class, "tax_return");
  assert.equal(cover.fields?.return_kind, "cover");
  const coverWrite = writeLive(
    file,
    "19-1040-cover-2024-jordan-hale.pdf",
    (cover.class as ExtractClass) ?? "tax_return",
    cover.fields ?? {},
    "2026-09-05T20:04:00.000Z",
    cover.failed,
    cover.note,
  );
  file = coverWrite.draft;
  assert.ok(!coverWrite.quietLines.some((line) => line === FAILED_READ_NOTE || /unreadable|could not read/i.test(line)));
  assert.ok(!file.documents.some((doc) => /could not read/i.test(doc.note ?? "")));
  assert.equal(file.facts?.qualifying_income?.value, lockedIncome);
  assert.notEqual(file.pendingProposal?.field, "qualifying_income");
  const coverAsk = nextFoxAsk(file);
  assert.doesNotMatch(coverAsk.text, /Two recent statements/);
  assert.doesNotMatch(coverAsk.text, new RegExp(DOC_INVITE_COPY.bank_statement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const coverLabels = nextCoverScheduleLabels(file);
  assert.ok(!coverLabels.includes("Schedule C"));
  assert.ok(coverLabels.some((label) => label === "K-1" || label === "1065" || label === "Schedule E"));
  assert.match(coverMapAskCopy(file), /K-1|1065|Schedule E/);
  assert.doesNotMatch(coverMapAskCopy(file), /Schedule C/);
  assert.match(`${coverAsk.text} ${coverAsk.followUp ?? ""}`, /K-1|1065|Schedule E/);
  assert.doesNotMatch(`${coverAsk.text} ${coverAsk.followUp ?? ""}`, /Schedule C/);
  assert.match(coverAsk.text, /^Got the cover\./);
  assert.doesNotMatch(coverAsk.text, /could not read|unreadable/i);
  assert.equal(intakeIsCoverDrop(file, { extractClass: "tax_return", emptyRead: { name: "19-1040-cover-2024-jordan-hale.pdf" } }), true);
  assert.equal(intakeIsIdDrop(file, { extractClass: "tax_return", emptyRead: { name: "19-1040-cover-2024-jordan-hale.pdf" } }), false);
  const spokenCover = speakCoverScheduleLabels(coverLabels);
  assert.ok(spokenCover.some((label) => label === "Schedule E"));
  assert.ok(spokenCover.some((label) => label === "K-1 / 1065" || label === "K-1" || label === "1065"));
  assert.ok(spokenCover.some((label) => label === "Schedule F") || coverLabels.includes("Schedule F"));
  assert.equal(cover.fields?.k1_ordinary_income, undefined);
  assert.equal(cover.fields?.schedule_e_rents_received, undefined);
  assert.equal(cover.fields?.entity_ordinary_income, undefined);

  const twenty = await routeExtract("20-1040-cover-2025-jordan-hale.pdf", "tax_return");
  assert.notEqual(twenty.failed, true);
  assert.equal(twenty.class, "tax_return");
  assert.equal(twenty.fields?.return_kind, "cover");
  const twentyWrite = writeLive(
    file,
    "20-1040-cover-2025-jordan-hale.pdf",
    (twenty.class as ExtractClass) ?? "tax_return",
    twenty.fields ?? {},
    "2026-09-05T20:04:30.000Z",
    twenty.failed,
    twenty.note,
  );
  assert.ok(!twentyWrite.quietLines.some((line) => line === FAILED_READ_NOTE || /could not read|unreadable/i.test(line)));
  assert.equal(twentyWrite.draft.facts?.qualifying_income?.value, lockedIncome);
  assert.match(coverMapAskCopy(twentyWrite.draft), /^Got the cover\./);
  assert.doesNotMatch(coverMapAskCopy(twentyWrite.draft), /could not read/i);
  assert.equal(intakeIsIdDrop(twentyWrite.draft, { extractClass: "tax_return" }), false);

  const unreadAt = "2026-09-05T20:05:00.000Z";
  const unreadWrite = writeLive(
    file,
    "blurry-scan.pdf",
    "bank_statement",
    {},
    unreadAt,
    true,
    FAILED_READ_NOTE,
  );
  const unreadDraft = unreadWrite.draft;
  assert.ok(unreadDocOpen(unreadDraft));
  assert.deepEqual(
    unreadRestoreActions(unreadDraft).map((item) => item.label),
    unreadDocActions().map((item) => item.label),
  );
  const unreadSkipped = skipUnreadDoc(unreadDraft);
  assert.equal(nextDocInvite(unreadSkipped), nextDocInvite(file));
  assert.notEqual(workspacePromptCopy("documents", unreadSkipped).text, DOC_INVITE_COPY.bank_statement);
  file = { ...file, documents: file.documents };

  if (workspacePrompt(file) === "former-history") {
    const priorAsk = nextFoxAsk(file);
    assert.match(`${priorAsk.text}`, /Who did you work for before|Where did you live before this/);
    assert.ok((priorAsk.actions ?? []).some((item) => item.label === "Skip"));
    file = skipFormerHistory(file);
    assert.notEqual(workspacePrompt(file), "former-history");
    assert.notEqual(nextFoxAsk(file).text, WHERE_BEFORE_ASK);
  } else {
    const afterSkip = skipFormerHistory(file);
    assert.notEqual(workspacePrompt(afterSkip), "former-history");
    file = afterSkip;
  }

  const five = await routeExtract(
    "05-bank-statement-pacific-coast-jul-2026.pdf",
    extractHintFromDraft(file, "05-bank-statement-pacific-coast-jul-2026.pdf"),
  );
  assert.notEqual(five.failed, true);
  const fiveWrite = writeLive(
    file,
    "05-bank-statement-pacific-coast-jul-2026.pdf",
    (five.class as ExtractClass) ?? "bank_statement",
    five.fields ?? {},
    "2026-09-05T20:06:00.000Z",
    five.failed,
    five.note,
  );
  file = acceptIfOpen(fiveWrite.draft);
  assert.equal(file.facts?.qualifying_income?.value, lockedIncome);

  const nineHint = extractHintFromDraft(file, "09-purchase-contract-clipper.pdf");
  assert.equal(nineHint, "purchase_contract");
  const nine = await routeExtract("09-purchase-contract-clipper.pdf", nineHint);
  assert.notEqual(nine.failed, true);
  const nineWrite = writeLive(
    file,
    "09-purchase-contract-clipper.pdf",
    (nine.class as ExtractClass) ?? "purchase_contract",
    nine.fields ?? {},
    "2026-09-05T20:07:00.000Z",
    nine.failed,
    nine.note,
  );
  file = nineWrite.draft;
  assert.equal(canLooksRight(file), false);
  assert.ok((nextFoxAsk(file).actions ?? []).some((item) => item.label === "Use this" || item.label === "Use document"));
  const used = resolveProposal(file, "accept");
  assert.match(used.subjectAddress ?? "", /88 Clipper Street/i);
  assert.equal(used.propertyZip, "94114");
  assert.match(used.facts?.present_address?.value ?? "", /Filbert/i);
  assert.match(used.facts?.present_address?.value ?? "", /94123/);
  assert.doesNotMatch(used.subjectAddress ?? "", /94123|Filbert/i);
  const zipLine = previewFacts(used).find((fact) => fact.id === "zip");
  assert.equal(zipLine?.value, "94114");
  assert.notEqual(searchedKeyFor(used), searchedKeyFor(bothSketch()));
  assert.equal(used.facts?.qualifying_income?.value, lockedIncome);

  const looks = applyLooksRightMotion({ ...used, pendingProposal: null, looksRightHold: false });
  assert.notEqual(workspacePrompt(looks), "citizenship");
  assert.equal(citizenshipNeeded(looks), false);
  assert.doesNotMatch(`${nextFoxAsk(looks).text} ${nextFoxAsk(looks).followUp ?? ""}`, /citizen|permanent resident/i);
  assert.notEqual(nextFoxAsk(looks).text, CITIZENSHIP_ASK);

  const proceeded = applyProceedMotion({ ...looks, sampleAccepted: true, emailSkipped: true });
  assert.ok(extractHintFromDraft(proceeded, "09-purchase-contract-clipper.pdf"));
  assert.ok(extractHintFromDraft(proceeded, "09-purchase-contract-88-clipper.pdf"));
  assert.ok(extractHintFromDraft(proceeded, "19-1040-cover-2024-jordan-hale.pdf"));
  assert.ok(extractHintFromDraft(proceeded, "05-bank-statement-pacific-coast-jul-2026.pdf"));
  const alias = await routeExtract("09-purchase-contract-88-clipper.pdf", "purchase_contract");
  assert.notEqual(alias.failed, true);
  assert.equal(alias.class, nine.class);

  console.log("assert-harbor-acceptance-file: Both · 03+07 Harbor row · C · cover · 05 · 09 Clipper 94114");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
