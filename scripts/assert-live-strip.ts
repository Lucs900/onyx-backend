/**
 * Live strip — two CI fails. Job red = not READY.
 * 1) Leftover chips on a prior message node.
 * 2) Use this writes Employment (employer + Period).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProposal } from "../components/fox/completeness";
import {
  leftoverSkipOnAskText,
  sealStoredFoxThread,
  withoutStoredChipActions,
} from "../components/fox/liveCoupon";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import {
  deskStripActions,
  nextFoxAsk,
  workspacePrompt,
} from "../components/fox/workspace";
import {
  LAST_YEAR_FEDERAL_RETURN_ASK,
  DOC_INVITE_COPY,
} from "../components/fox/fileWrite";
import { wageEmploymentFileLine } from "../components/fox/qualifyingIncome";
import type { FoxAction, FoxIntakeDraft, FoxMessage } from "../components/fox/types";
import { emptyDraft } from "../components/fox/store";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const skipChip: FoxAction = {
  id: "skip-docs",
  label: "Skip",
  event: "bubble",
  capture: { field: "skip-docs" },
};

const planted: FoxMessage[] = [
  {
    id: "w2-ask",
    role: "fox",
    text: "Drop last year’s W-2. Skip if you want to type it.",
    actions: [skipChip, skipChip],
  },
  {
    id: "stub",
    role: "fox",
    text: "Alameda Health System. Period $16,824.30. Use this?",
    actions: [
      { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    ],
  },
  {
    id: "id-ask",
    role: "fox",
    text: DOC_INVITE_COPY.government_id,
    actions: [skipChip],
  },
  {
    id: "1040-ask",
    role: "fox",
    text: LAST_YEAR_FEDERAL_RETURN_ASK,
    actions: [skipChip],
  },
];

const draft = emptyDraft() as FoxIntakeDraft;
assert.ok(
  leftoverSkipOnAskText(planted, draft, (text) => /W-2/i.test(text)) > 0,
  "planted leftover Skip on the W-2 ask is leftover — detector red",
);
assert.ok(
  leftoverSkipOnAskText(planted, draft, (text) => /Last year.?s tax return/i.test(text)) > 0,
  "planted leftover Skip on the 1040 line is leftover — detector red",
);

const sealed = sealStoredFoxThread(planted);
assert.equal(
  sealed.filter((item) => (item.actions ?? []).length > 0).length,
  0,
  "sealed history stores no chips",
);
assert.equal(withoutStoredChipActions(planted).every((item) => !item.actions?.length), true);

const fox = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
const foxThread = fox.slice(fox.indexOf("function FoxThread"), fox.indexOf("function FoxLiveStrip"));
assert.doesNotMatch(foxThread, /fox-bubble__actions|fox-chip|onAction/);
assert.match(fox, /function FoxLiveStrip/);
assert.match(fox, /deskStripActions/);

const lastYearThenId: FoxMessage[] = [
  { id: "old", role: "fox", text: LAST_YEAR_FEDERAL_RETURN_ASK, actions: [skipChip] },
  { id: "live", role: "fox", text: DOC_INVITE_COPY.government_id },
];
assert.deepEqual(
  deskStripActions(
    [{ id: "live", role: "fox", text: LAST_YEAR_FEDERAL_RETURN_ASK }],
    draft,
  ).map((item) => item.label),
  ["Upload this", "Skip"],
);
assert.deepEqual(
  deskStripActions(sealStoredFoxThread(lastYearThenId), draft).map((item) => item.label),
  ["Upload this", "Skip"],
  "new Fox question replaces the strip",
);

const wageDocsSketch = {
  ...emptyDraft(),
  path: "acr" as const,
  productIntent: "buy" as const,
  workspaceFlow: true,
  incomeAsked: true,
  incomeType: { ...emptyDraft().incomeType, value: "w2" as const },
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" as const },
  timelineAsked: true,
  timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" as const },
  creditAsked: true,
  creditBand: "760+" as const,
  propertyValueAmount: 1_200_000,
  loanAmountValue: 960_000,
  downPaymentAmount: 240_000,
  valueAsked: true,
  amountAsked: true,
  subjectAddress: "14 Oak Street, San Francisco, CA 94123",
  subjectAddressAsked: true,
  propertyZip: "94123",
  propertyZipAsked: true,
  yearsInBusinessAsked: true,
  monthlyDebtsAsked: true,
  propertyType: "house" as const,
  propertyTypeAsked: true,
};
assert.equal(workspacePrompt(wageDocsSketch), "wage-docs");
const skippedW2 = skipWageDocs(wageDocsSketch);
const alamedaAfterSkip = applyExtractedFields(skippedW2, {
  extractClass: "paystub",
  confidence: 0.94,
  fields: {
    employer_name: "Alameda Health System",
    pay_period_end: "08/15/2026",
    gross_period: "16824.30",
    overtime: "850.00",
  },
});
assert.ok(alamedaAfterSkip.draft.pendingProposal, "stub proposes Period");
assert.equal((alamedaAfterSkip.draft.employmentHistory ?? []).length, 0, "File empty until Use this");
const confirmSpeech = nextFoxAsk(alamedaAfterSkip.draft);
assert.equal(confirmSpeech.text, "Alameda Health System. Period $16,824.30. Use this?");
assert.deepEqual(
  deskStripActions(
    [{ id: "confirm", role: "fox", text: confirmSpeech.text }],
    alamedaAfterSkip.draft,
  ).map((item) => item.label),
  ["Use this", "Change"],
  "Use this lives on the strip, not the stub line",
);
const alamedaUsed = resolveProposal(alamedaAfterSkip.draft, "accept");
assert.equal((alamedaUsed.employmentHistory ?? []).length, 1, "Use this writes one Employment row");
assert.match(alamedaUsed.employmentHistory?.[0]?.label ?? "", /Alameda Health System/);
assert.equal(wageEmploymentFileLine(alamedaUsed), "Alameda Health System, Period $16,824.30");
assert.equal(alamedaUsed.pendingProposal, null);
assert.deepEqual(
  deskStripActions(
    [
      { id: "confirm", role: "fox", text: confirmSpeech.text },
      { id: "you", role: "client", text: "Use this" },
      { id: "id", role: "fox", text: nextFoxAsk(alamedaUsed).text },
    ],
    alamedaUsed,
  ).map((item) => item.label),
  ["Upload this", "Skip"],
  "Use this leaves the strip after the write",
);

console.log("assert-live-strip: leftover Skip detector red; Alameda Use this writes Employment");
