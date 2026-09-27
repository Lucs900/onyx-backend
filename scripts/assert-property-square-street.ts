/**
 * Property square Street is the street already saved on the File.
 * draft.subjectAddress / confirmed facts.property_address only.
 * ZIP-only File paints —. Never copy ZIP. Wrap only after comma or space.
 * Product Purpose Occ Type ZIP stay. /start closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { writeSubjectAddress } from "../components/fox/propertyType";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writePurchasePrice } from "../components/fox/workspace";
import {
  HUB_EMPTY,
  HUB_SQUARES,
  hubEmailRow,
  hubNeedRow,
  hubSquares,
  hubStreetRow,
  hubStreetWrapParts,
  processingHubView,
} from "../components/fox/processingHub";
import type { FoxIntakeDraft } from "../components/fox/types";

function afterPrimary(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "heloc",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    monthlyDebtsAsked: true,
    motion: "gathering",
    skippedClasses: ["w2", "paystub"],
    wageDocsAsked: true,
    wageStubAsked: true,
    fileId: "file-property-square-street",
  };
}

function filled(): FoxIntakeDraft {
  return writeWhoOnLoan(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
    "just-me",
  );
}

function main() {
  assert.deepEqual([...HUB_SQUARES[3].ids], ["product", "purpose", "occupancy", "property-type", "zip", "street"]);
  assert.deepEqual([...HUB_SQUARES[2].ids], ["count", "b1", "b2", "credit", "email"]);
  assert.deepEqual([...HUB_SQUARES[5].ids], ["status", "next", "waiting", "need"]);

  const zipOnly = filled();
  assert.equal(zipOnly.propertyZip, "94123");
  assert.equal(zipOnly.subjectAddress, undefined);
  assert.equal(zipOnly.facts?.property_address, undefined);
  assert.equal(hubStreetRow(zipOnly).label, "Street");
  assert.equal(hubStreetRow(zipOnly).value, HUB_EMPTY);

  const zipCopied = { ...zipOnly, subjectAddress: "94123", subjectAddressAsked: true };
  assert.equal(hubStreetRow(zipCopied).value, HUB_EMPTY);

  const cityZip = { ...zipOnly, subjectAddress: "San Francisco, CA 94123", subjectAddressAsked: true };
  assert.equal(hubStreetRow(cityZip).value, HUB_EMPTY);

  const pendingOnly = {
    ...zipOnly,
    pendingAddress: {
      line: "14 Oak Street, San Francisco, CA 94123",
      street: "14 Oak Street",
      city: "San Francisco",
      state: "CA" as const,
      zip: "94123",
    },
  };
  assert.equal(hubStreetRow(pendingOnly).value, HUB_EMPTY);

  const idOnly = {
    ...zipOnly,
    facts: {
      ...zipOnly.facts,
      present_address: {
        field: "present_address",
        value: "9 WILLOW LANE",
        source: "extracted" as const,
        confirmed: true,
      },
    },
  };
  assert.equal(hubStreetRow(idOnly).value, HUB_EMPTY);

  const written = writeSubjectAddress(zipOnly, "14 Oak Street, San Francisco, CA 94123");
  assert.equal(written.subjectAddress, "14 Oak Street, San Francisco, CA 94123");
  assert.equal(written.facts?.property_address?.value, "14 Oak Street, San Francisco, CA 94123");
  assert.equal(hubStreetRow(written).value, "14 Oak Street, San Francisco, CA 94123");
  assert.equal(hubStreetWrapParts("14 Oak Street, San Francisco, CA 94123").join(""), "14 Oak Street, San Francisco, CA 94123");
  assert.deepEqual(hubStreetWrapParts("14 Oak Street, San Francisco, CA 94123"), [
    "14 ",
    "Oak ",
    "Street,",
    " ",
    "San ",
    "Francisco,",
    " ",
    "CA ",
    "94123",
  ]);
  assert.deepEqual(hubStreetWrapParts("94123"), []);

  const squares = hubSquares(zipOnly, "lucas@onyxlending.com");
  const property = squares.find((square) => square.id === "property");
  assert.deepEqual(
    property?.cells.map((cell) => `${cell.label} ${cell.value}`),
    ["Product HELOC", "Purpose HELOC", "Occ Primary", "Type House", "ZIP 94123", `Street ${HUB_EMPTY}`],
  );
  const borrower = squares.find((square) => square.id === "borrower");
  assert.equal(borrower?.cells.find((cell) => cell.id === "email")?.value, "lucas@onyxlending.com");
  assert.equal(hubNeedRow(zipOnly).value, "Last year’s W-2");
  assert.equal(hubEmailRow(zipOnly).value, HUB_EMPTY);

  const hub = processingHubView(zipOnly);
  assert.ok(!hub.grid.some((row) => row.id === "street"));
  assert.equal(hub.grid.find((row) => row.id === "zip")?.value, "94123");

  const hubPage = readFileSync(new URL("../components/fox/ProcessingHub.tsx", import.meta.url), "utf8");
  assert.match(hubPage, /hubStreetRow\(draft\)/);
  assert.match(hubPage, /hubStreetWrapParts/);
  assert.match(hubPage, /staff-hub-cell__value--street/);
  assert.match(hubPage, /staff-hub-cell--street/);
  assert.match(hubPage, /<wbr \/>/);
  const css = readFileSync(new URL("../styles/fox.css", import.meta.url), "utf8");
  assert.match(css, /staff-hub-cell__value--street \{\n  overflow-wrap: normal;\n  word-break: normal;/);
  assert.match(css, /staff-hub-cell--street \{\n  grid-column: span 2;/);
  assert.match(css, /staff-hub-cell--email \{\n  grid-column: span 2;/);
  assert.doesNotMatch(css, /staff-hub-cell__value--street \{[\s\S]*?(anywhere|break-all|break-word)/);
  const start = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(start, /hubStreetRow/);
  assert.doesNotMatch(start, /staff-hub-cell--street/);
  assert.doesNotMatch(start, /staff-hub-squares/);

  console.log(
    "assert-property-square-street: Street from File subjectAddress; ZIP-only —; wrap after comma or space; /start closed",
  );
}

main();
