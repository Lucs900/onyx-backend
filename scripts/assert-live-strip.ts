/**
 * Leftover live chips — job red = not READY.
 * A prior message node that still owns a live Skip / Use this / Upload this /
 * Proceed fails. Frozen answer-column stamps and Edit are allowed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  leftoverLiveChipsOnPriorNodes,
  leftoverSkipOnAskText,
  sealStoredFoxThread,
  withoutStoredChipActions,
} from "../components/fox/liveCoupon";
import { LAST_YEAR_FEDERAL_RETURN_ASK, DOC_INVITE_COPY } from "../components/fox/fileWrite";
import type { FoxAction, FoxIntakeDraft, FoxMessage } from "../components/fox/types";
import { emptyDraft } from "../components/fox/store";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const skipChip: FoxAction = {
  id: "skip-docs",
  label: "Skip",
  event: "bubble",
  capture: { field: "skip-docs" },
};
const useThisChip: FoxAction = {
  id: "accept-proposal",
  label: "Use this",
  event: "bubble",
  capture: { field: "accept-proposal" },
};
const uploadChip: FoxAction = {
  id: "upload-this",
  label: "Upload this",
  event: "open-docs",
  capture: { field: "open-docs" },
};
const proceedChip: FoxAction = {
  id: "proceed",
  label: "Proceed",
  event: "bubble",
  capture: { field: "proceed" },
};

const planted: FoxMessage[] = [
  {
    id: "w2-ask",
    role: "fox",
    text: "Drop last year’s W-2. Skip if you want to type it.",
    actions: [skipChip],
  },
  {
    id: "stub",
    role: "fox",
    text: "Alameda Health System. Period $16,824.30. Use this?",
    actions: [useThisChip],
  },
  {
    id: "id-ask",
    role: "fox",
    text: DOC_INVITE_COPY.government_id,
    actions: [uploadChip, skipChip],
  },
  {
    id: "proceed-ask",
    role: "fox",
    text: "This file can move.",
    actions: [proceedChip],
  },
  {
    id: "1040-ask",
    role: "fox",
    text: LAST_YEAR_FEDERAL_RETURN_ASK,
  },
];

const draft = emptyDraft() as FoxIntakeDraft;
assert.ok(
  leftoverLiveChipsOnPriorNodes(planted) >= 4,
  "planted live leftover chip on a prior node is leftover — detector red",
);
assert.ok(
  leftoverSkipOnAskText(planted, draft, (text) => /W-2/i.test(text)) > 0,
  "planted leftover Skip on the W-2 ask is leftover — detector red",
);

const sealed = sealStoredFoxThread(planted);
assert.equal(
  leftoverLiveChipsOnPriorNodes(sealed),
  0,
  "sealed prior nodes own no live chips",
);
assert.equal(
  sealed.filter((item) => (item.actions ?? []).length > 0).length,
  0,
  "sealed history stores no chips",
);
assert.equal(withoutStoredChipActions(planted).every((item) => !item.actions?.length), true);

const frozenStamps: FoxMessage[] = [
  { id: "w2-ask", role: "fox", text: "Drop last year’s W-2." },
  { id: "you-skip", role: "client", text: "Skip" },
  { id: "stub", role: "fox", text: "Alameda Health System. Period $16,824.30." },
  { id: "you-use", role: "client", text: "Use this" },
  { id: "id-ask", role: "fox", text: DOC_INVITE_COPY.government_id },
];
assert.equal(
  leftoverLiveChipsOnPriorNodes(frozenStamps),
  0,
  "frozen Skip / Use this stamps in the answer column are not live chips",
);

const fox = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
const foxThread = fox.slice(fox.indexOf("function FoxThread"), fox.indexOf("function FoxLiveStrip"));
assert.doesNotMatch(foxThread, /fox-bubble__actions|fox-chip|onAction/);
assert.match(fox, /function FoxLiveStrip/);
assert.match(fox, /deskStripActions/);

console.log("assert-live-strip: planted live leftover chip detector red; frozen stamps allowed");
