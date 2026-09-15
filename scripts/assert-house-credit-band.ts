/**
 * House turn: type 740–759 (or that band) writes Credit on Structure.
 * Next Fox line is not the FICO ask. Written Structure line → no re-ask.
 */
import assert from "node:assert/strict";
import { writePropertyType } from "../components/fox/propertyType";
import { emptyDraft } from "../components/fox/store";
import {
  CREDIT_RANGE_ASK,
  nextFoxAsk,
  parseVolunteeredCreditBand,
  previewFacts,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

function atHouseAsk(): FoxIntakeDraft {
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

function noFico(text: string) {
  assert.doesNotMatch(text, /estimated FICO/i);
  assert.notEqual(text, CREDIT_RANGE_ASK);
}

function main() {
  assert.equal(parseVolunteeredCreditBand("740-759"), "740-759");
  assert.equal(parseVolunteeredCreditBand("740–759"), "740-759");
  assert.equal(parseVolunteeredCreditBand("760+"), "760+");
  assert.equal(parseVolunteeredCreditBand("850,000"), null);
  assert.equal(parseVolunteeredCreditBand("$850000"), null);

  const house = atHouseAsk();
  assert.equal(workspacePrompt(house), "property-type");
  assert.match(nextFoxAsk(house).text, /House, condo|kind of home/i);

  for (const typed of ["740-759", "740–759"]) {
    const reply = workspaceReply(typed, house);
    assert.equal(reply?.capture?.field, "creditRange");
    assert.equal(reply?.capture && "value" in reply.capture ? reply.capture.value : "", "740-759");
    noFico(reply?.text ?? "");
    assert.match(reply?.text ?? "", /House, condo|kind of home/i);
  }

  const written = {
    ...house,
    creditBand: "740-759",
    creditAsked: true,
  };
  assert.notEqual(workspacePrompt(written), "credit");
  noFico(nextFoxAsk(written).text);
  const creditRow = previewFacts(written).find((fact) => fact.id === "credit" || fact.label === "Credit");
  assert.ok(creditRow, "Credit must be on Structure");
  assert.match(creditRow?.value ?? "", /740/);

  const afterHouse = writePropertyType(written, "sfr");
  assert.notEqual(workspacePrompt(afterHouse), "credit");
  noFico(nextFoxAsk(afterHouse).text);

  console.log("assert-house-credit-band: House-turn 740–759 writes Credit · next is not FICO");
}

main();
