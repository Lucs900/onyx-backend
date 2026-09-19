/**
 * ZIP ask is one turn. Typed ZIP writes ZIP once. Street stays empty until Use this.
 * Do not reprint the same ZIP as a second borrower / Fox confirm line.
 * Places suggestion is chip pending only. Skip keeps the typed ZIP.
 * Refinance 80% (400/500 House 760+) still prices after a single ZIP write.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import {
  REFI_ADDRESS_ASK,
  displayedSubjectAddress,
  isSubjectAddressConfirmPending,
  isZipOnlyPendingAddress,
  parseVolunteeredAddress,
  proposeAddressAndAdoptZip,
  proposePlaceAddress,
  shouldShowAddressUseThis,
  skipQuoteAddress,
  writePlaceAddress,
  writePropertyZip,
} from "../components/fox/propertyType";
import {
  GEO_STOP_COPY,
  nextFoxAsk,
  previewFacts,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import { historyBubbleSpeech } from "../components/fox/liveCoupon";
import { RATEFLOW_WAIT_LINE } from "../components/fox/lookupWait";
import {
  addressConfirmPending,
  rateflowBlockedReason,
  rateflowClientBodyFromDraft,
  searchedKeyFor,
} from "../lib/rateflow/fromDraft";
import { isZipOnlyQuery } from "../lib/places/address";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function refi80(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "refinance",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    amountAsked: true,
    loanAmountValue: 400_000,
    valueAsked: true,
    propertyValueAmount: 500_000,
    refiPurposeAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
  };
}

const ready = refi80();
assert.equal(workspacePrompt(ready), "property-address");
assert.equal(parseVolunteeredAddress("94123"), null);
assert.equal(isZipOnlyQuery("94123"), true);

const reply = workspaceReply("94123", ready);
assert.equal(reply?.capture?.field, "propertyZip");
assert.equal(reply?.capture && "value" in reply.capture ? reply.capture.value : "", "94123");
assert.equal(reply?.text, RATEFLOW_WAIT_LINE);
assert.doesNotMatch(reply?.text ?? "", /94123/);
assert.doesNotMatch(reply?.text ?? "", /Use this|What ZIP is the property in|address or ZIP/);
assert.notEqual(historyBubbleSpeech(reply?.text), "94123");

const written = writePropertyZip(ready, "94123");
assert.equal(written.propertyZip, "94123");
assert.equal(written.propertyZipAsked, true);
assert.equal(written.subjectAddress, undefined);
assert.equal(written.facts?.property_address, undefined);
assert.equal(displayedSubjectAddress(written), "");
assert.equal(isSubjectAddressConfirmPending(written), false);
assert.equal(shouldShowAddressUseThis(written), false);
assert.equal(addressConfirmPending(written), false);
assert.equal(rateflowBlockedReason(written), null);
assert.equal(rateflowClientBodyFromDraft(written)?.zipcode, "94123");
assert.ok(searchedKeyFor(written));
assert.equal(workspacePrompt(written), "income");
assert.equal(nextFoxAsk(written).text, RATEFLOW_WAIT_LINE);

const zipFact = previewFacts(written).find((fact) => fact.id === "zip");
assert.equal(zipFact?.value, "94123");
assert.ok(!previewFacts(written).some((fact) => fact.id === "address" && /94123/.test(fact.value)));
assert.ok(
  !previewFacts(written).some(
    (fact) => fact.id === "address" && fact.value !== "—" && Boolean(fact.value.trim()),
  ),
);

const thread: FoxMessage[] = [
  { id: "ask", role: "fox", text: REFI_ADDRESS_ASK },
  { id: "you", role: "client", text: "94123" },
  { id: "wait", role: "fox", text: reply?.text ?? "" },
];
assert.equal(thread.filter((item) => /94123/.test(item.text)).length, 1);
assert.equal(thread.filter((item) => item.role === "client" && item.text.trim() === "94123").length, 1);
assert.ok(!thread.some((item) => item.role === "fox" && /94123/.test(item.text)));

const echoed = proposeAddressAndAdoptZip(ready, "94123");
assert.equal(echoed.propertyZip, "94123");
assert.equal(echoed.pendingAddress, undefined);
assert.equal(echoed.pendingProposal ?? null, null);
assert.equal(displayedSubjectAddress(echoed), "");
assert.equal(isZipOnlyPendingAddress(echoed), false);
assert.equal(addressConfirmPending(echoed), false);
assert.doesNotMatch(workspaceReply("94123", ready)?.text ?? "", /94123\. Use this/);

const place = {
  line: "500 Market St, San Francisco, CA 94123",
  street: "500 Market St",
  city: "San Francisco",
  state: "CA" as const,
  zip: "94123",
  county: "San Francisco",
};
const pending = proposePlaceAddress(written, place);
assert.equal(pending.propertyZip, "94123");
assert.equal(displayedSubjectAddress(pending), "");
assert.equal(shouldShowAddressUseThis(pending), true);
assert.equal(pending.pendingAddress?.line, place.line);
assert.doesNotMatch(pending.pendingAddress?.line ?? "", /^94123$/);

const used = writePlaceAddress(pending, place);
assert.equal(used.subjectStreet, "500 Market St");
assert.equal(used.subjectCity, "San Francisco");
assert.equal(used.subjectState, "CA");
assert.equal(used.propertyZip, "94123");
assert.match(displayedSubjectAddress(used), /500 Market St/);
assert.equal(rateflowClientBodyFromDraft(used)?.zipcode, "94123");

const skipped = skipQuoteAddress(pending);
assert.equal(skipped.propertyZip, "94123");
assert.equal(displayedSubjectAddress(skipped), "");
assert.equal(skipped.pendingAddress, undefined);
assert.equal(shouldShowAddressUseThis(skipped), false);
assert.equal(rateflowClientBodyFromDraft(skipped)?.zipcode, "94123");

const oregon = writePropertyZip(ready, "97535");
assert.equal(oregon.outOfState, true);
assert.equal(oregon.propertyZip, "97535");
assert.equal(oregon.subjectAddress, undefined);
assert.equal(workspacePrompt(oregon), "geo-stop");
assert.equal(nextFoxAsk(oregon).text, GEO_STOP_COPY);
assert.equal(rateflowBlockedReason(oregon), "state");
assert.equal(rateflowClientBodyFromDraft(oregon), null);
assert.ok(!searchedKeyFor(oregon));
assert.notEqual(nextFoxAsk(oregon).text, RATEFLOW_WAIT_LINE);

const back = writePropertyZip(oregon, "94123");
assert.equal(back.outOfState, false);
assert.equal(back.propertyZip, "94123");
assert.equal(back.subjectAddress, undefined);
assert.equal(rateflowBlockedReason(back), null);
assert.equal(nextFoxAsk(back).text, RATEFLOW_WAIT_LINE);

console.log("zip-write-once PASS");
