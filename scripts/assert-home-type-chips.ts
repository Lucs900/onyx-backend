/**
 * “What kind of home is this?” keeps House · Condo · 2–4 · Skip on the live line.
 * Composer stays live for a typed property type. No invented dates.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { paintedFoxActions } from "../components/fox/liveCoupon";
import {
  PROPERTY_TYPE_ASK,
  isPropertyTypeAskText,
  propertyTypeAskActions,
  skipPropertyType,
  writePropertyType,
} from "../components/fox/propertyType";
import { nextFoxAsk, workspacePrompt, workspaceReply } from "../components/fox/workspace";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function afterFunds(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    propertyValueAmount: 850_000,
    downPaymentAmount: 170_000,
    loanAmountValue: 680_000,
    valueAsked: true,
    amountAsked: true,
  };
}

function main() {
  const draft = afterFunds();
  assert.equal(workspacePrompt(draft), "property-type");
  const ask = nextFoxAsk(draft);
  assert.equal(ask.text, PROPERTY_TYPE_ASK);
  assert.ok(isPropertyTypeAskText(ask.text));
  assert.deepEqual(
    (ask.actions ?? []).map((item) => item.label),
    ["House", "Condo", "2–4", "Skip"],
  );
  assert.deepEqual(
    propertyTypeAskActions().map((item) => item.label),
    ["House", "Condo", "2–4", "Skip"],
  );

  const bare: FoxMessage = {
    id: "home-type-bare",
    role: "fox",
    text: PROPERTY_TYPE_ASK,
  };
  assert.deepEqual(
    (paintedFoxActions(bare, draft, true) ?? []).map((item) => item.label),
    ["House", "Condo", "2–4", "Skip"],
    "home-type chips restore when the stored turn has no actions",
  );

  const leftoverUseThis: FoxMessage = {
    id: "home-type-after-funds",
    role: "fox",
    text: PROPERTY_TYPE_ASK,
  };
  assert.deepEqual(
    (paintedFoxActions(leftoverUseThis, draft, true) ?? []).map((item) => item.label),
    ["House", "Condo", "2–4", "Skip"],
    "home-type chips stay after a leftover funds Use this",
  );

  const typed = workspaceReply("House", draft);
  assert.equal(typed?.capture?.field, "propertyType");
  assert.equal(typed?.capture && "value" in typed.capture ? typed.capture.value : "", "sfr");
  const written = writePropertyType(draft, "sfr");
  assert.equal(written.propertyType, "sfr");
  assert.equal(workspacePrompt(written), "credit");

  const skipped = skipPropertyType(draft);
  assert.equal(skipped.propertyTypeAsked, true);
  assert.equal(skipped.propertyType, undefined);
  assert.equal(workspacePrompt(skipped), "credit");

  console.log("assert-home-type-chips: House · Condo · 2–4 · Skip on the live home-type ask");
}

main();
