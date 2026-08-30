import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyDraft } from "../components/fox/store";
import { resolveProposal } from "../components/fox/completeness";
import {
  PURCHASE_ADDRESS_ASK,
  REFI_ADDRESS_ASK,
  addressOnFileCopy,
  isPlaceAddressProposal,
  placeAddressConfirmCopy,
  proposePlaceAddress,
  propertyAddressAskText,
  typedAddressConfirmCopy,
  writePlaceAddress,
} from "../components/fox/propertyType";
import {
  PLACES_WAIT_LINE,
  RATEFLOW_WAIT_LINE,
  isLookupWaitLine,
  placesWaitActions,
  rateflowWaitActions,
  withWaitLine,
  withoutWaitLines,
} from "../components/fox/lookupWait";
import { rateflowBlockedReason, rateflowClientBodyFromDraft } from "../lib/rateflow/fromDraft";
import {
  GOOGLE_PLACES_KEY_NAME,
  isCaliforniaLine,
  isZipOnlyQuery,
  parsePlaceAddress,
  placeAddressFromGoogleDetails,
  shouldSuggestStreets,
  suggestionsFromGoogleAutocomplete,
} from "../lib/places/address";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

assert.equal(GOOGLE_PLACES_KEY_NAME, "GOOGLE_PLACES_API_KEY");
assert.equal(isZipOnlyQuery("94105"), true);
assert.equal(shouldSuggestStreets("94105"), false);
assert.equal(shouldSuggestStreets("50"), false);
assert.equal(shouldSuggestStreets("500 Market"), true);
assert.equal(isCaliforniaLine("500 Market St, San Francisco, CA 94105"), true);
assert.equal(isCaliforniaLine("1 Main St, Reno, NV 89501"), false);

const harborDetails = {
  result: {
    formatted_address: "500 Market St, San Francisco, CA 94105, USA",
    address_components: [
      { long_name: "500", short_name: "500", types: ["street_number"] },
      { long_name: "Market Street", short_name: "Market St", types: ["route"] },
      { long_name: "San Francisco", short_name: "SF", types: ["locality", "political"] },
      { long_name: "California", short_name: "CA", types: ["administrative_area_level_1", "political"] },
      { long_name: "San Francisco County", short_name: "San Francisco County", types: ["administrative_area_level_2"] },
      { long_name: "94105", short_name: "94105", types: ["postal_code"] },
    ],
  },
};
const harbor = placeAddressFromGoogleDetails(harborDetails);
assert.equal(harbor?.street, "500 Market St");
assert.equal(harbor?.city, "San Francisco");
assert.equal(harbor?.state, "CA");
assert.equal(harbor?.zip, "94105");
assert.equal(harbor?.county, "San Francisco");
assert.match(harbor?.line ?? "", /500 Market St, San Francisco, CA 94105/);

assert.equal(
  placeAddressFromGoogleDetails({
    result: {
      formatted_address: "1 Main St, Reno, NV 89501, USA",
      address_components: [
        { long_name: "1", types: ["street_number"] },
        { long_name: "Main St", types: ["route"] },
        { long_name: "Reno", types: ["locality"] },
        { long_name: "Nevada", short_name: "NV", types: ["administrative_area_level_1"] },
        { long_name: "89501", types: ["postal_code"] },
      ],
    },
  }),
  null,
);

assert.equal(
  placeAddressFromGoogleDetails({
    result: {
      formatted_address: "500 Market St, San Francisco, CA 94105, USA",
      address_components: [
        { long_name: "500", types: ["street_number"] },
        { long_name: "Market St", types: ["route"] },
        { long_name: "San Francisco", types: ["locality"] },
        { long_name: "California", short_name: "CA", types: ["administrative_area_level_1"] },
        { long_name: "94105", types: ["postal_code"] },
      ],
    },
  })?.county,
  undefined,
);

assert.deepEqual(
  suggestionsFromGoogleAutocomplete({
    predictions: [
      { place_id: "ChIJHarbor94105xxxx", description: "500 Market St, San Francisco, CA 94105, USA" },
      { place_id: "ChIJRenoNV00000000", description: "1 Main St, Reno, NV 89501, USA" },
    ],
  }),
  [{ id: "ChIJHarbor94105xxxx", line: "500 Market St, San Francisco, CA 94105" }],
);

const parsed = parsePlaceAddress(JSON.stringify(harbor));
assert.equal(parsed?.zip, "94105");
assert.equal(parsePlaceAddress({ street: "500 Market St", city: "San Francisco", state: "NV", zip: "94105" }), null);

const base = {
  ...emptyDraft(),
  path: "acr" as const,
  productIntent: "refinance" as const,
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
  propertyValueAmount: 850_000,
  loanAmountValue: 680_000,
  amountAsked: true,
  valueAsked: true,
  propertyType: "sfr" as const,
  creditAsked: true,
  creditBand: "760+",
};

assert.equal(propertyAddressAskText({ ...base, productIntent: "buy" }), PURCHASE_ADDRESS_ASK);
assert.equal(propertyAddressAskText(base), REFI_ADDRESS_ASK);
assert.equal(PURCHASE_ADDRESS_ASK, "What is the address of the home you are buying?");
assert.equal(REFI_ADDRESS_ASK, "What is the address of the home?");

const proposed = proposePlaceAddress(base, harbor!);
assert.equal(isPlaceAddressProposal(proposed.pendingProposal), true);
assert.equal(proposed.propertyZip, undefined);
assert.equal(proposed.subjectAddress, undefined);
assert.equal(proposed.subjectCity, undefined);
assert.equal(proposed.subjectState, undefined);
assert.equal(proposed.subjectCounty, undefined);
assert.equal(rateflowClientBodyFromDraft(proposed), null);
assert.equal(rateflowBlockedReason(proposed), "address-confirm");

const written = writePlaceAddress(base, harbor!);
assert.equal(written.subjectStreet, "500 Market St");
assert.equal(written.subjectCity, "San Francisco");
assert.equal(written.subjectState, "CA");
assert.equal(written.propertyZip, "94105");
assert.equal(written.subjectCounty, "San Francisco");
assert.equal(rateflowClientBodyFromDraft(written)?.zipcode, "94105");
assert.equal(rateflowClientBodyFromDraft(written)?.city, "San Francisco");
assert.equal(rateflowClientBodyFromDraft(written)?.loan_purpose, "refinance");

const accepted = resolveProposal(proposed, "accept");
assert.equal(accepted.propertyZip, "94105");
assert.equal(accepted.subjectCity, "San Francisco");
assert.equal(accepted.pendingProposal, null);
assert.equal(rateflowBlockedReason(accepted), null);

const noCounty = writePlaceAddress(base, {
  line: "500 Market St, San Francisco, CA 94105",
  street: "500 Market St",
  city: "San Francisco",
  state: "CA",
  zip: "94105",
});
assert.equal(noCounty.subjectCounty, undefined);

const suggest = readFileSync(join(root, "app/api/address-suggest/route.ts"), "utf8");
const details = readFileSync(join(root, "app/api/address-place/route.ts"), "utf8");
const client = readFileSync(join(root, "components/fox/addressSuggest.ts"), "utf8");
const fox = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
assert.ok(suggest.includes("GOOGLE_PLACES_API_KEY") || suggest.includes("placesKeyValue"));
assert.ok(!suggest.includes("NEXT_PUBLIC_"));
assert.ok(!details.includes("NEXT_PUBLIC_"));
assert.ok(!client.includes("maps.googleapis.com"));
assert.ok(!client.includes("GOOGLE_PLACES"));
assert.ok(fox.includes("/api/address-suggest") || fox.includes("requestAddressSuggestions"));
assert.ok(!fox.includes("maps.googleapis.com"));
assert.doesNotMatch(suggest, /console\.(log|info|warn|error)\([^)]*GOOGLE_/);
assert.doesNotMatch(details, /console\.(log|info|warn|error)\([^)]*GOOGLE_/);

assert.equal(placeAddressConfirmCopy(harbor!.line), `${harbor!.line}. Use this?`);
assert.equal(typedAddressConfirmCopy(harbor!.line), placeAddressConfirmCopy(harbor!.line));
assert.doesNotMatch(typedAddressConfirmCopy(harbor!.line), /Suggested · not underwritten|That’s /);
assert.equal(addressOnFileCopy(harbor!.line), "On the file.");
assert.equal(isLookupWaitLine(PLACES_WAIT_LINE), true);
assert.equal(isLookupWaitLine(RATEFLOW_WAIT_LINE), true);
assert.equal(isLookupWaitLine(`${harbor!.line}. Use this?`), false);
const waitThread = withWaitLine([], "places");
assert.equal(waitThread[0]?.text, PLACES_WAIT_LINE);
assert.deepEqual(
  (waitThread[0]?.actions ?? []).map((item) => item.label),
  placesWaitActions().map((item) => item.label),
);
assert.equal(withoutWaitLines(waitThread).length, 0);
const rateWait = withWaitLine(waitThread, "rateflow");
assert.equal(rateWait.length, 1);
assert.equal(rateWait[0]?.text, RATEFLOW_WAIT_LINE);
assert.deepEqual(
  (rateWait[0]?.actions ?? []).map((item) => item.label),
  rateflowWaitActions().map((item) => item.label),
);
assert.ok(fox.includes("Looking that up") || fox.includes("PLACES_WAIT_LINE") || fox.includes("withWaitLine"));
assert.ok(fox.includes("is-waiting") || readFileSync(join(root, "styles/fox.css"), "utf8").includes("fox-mark-pulse"));

console.log("assert-places: ok");
