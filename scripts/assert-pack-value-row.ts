/**
 * Value · Lien · Line · LTV · CLTV are one hub row. Other rows stay.
 * ZIP · Type · Income · Debts stay last. Numbers and /start stay closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { writePurchasePrice } from "../components/fox/workspace";
import {
  HUB_EMPTY,
  HUB_GRID_LABELS,
  HUB_GRID_ROWS,
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
    fileId: "file-pack-value-row",
  };
}

function main() {
  assert.deepEqual(
    [...HUB_GRID_ROWS],
    [
      ["product", "purpose", "occupancy"],
      ["home", "first-lien", "line", "ltv", "cltv"],
      ["rate", "io"],
      ["b1", "b2", "count"],
      ["qualifying", "credit"],
      ["status", "next", "waiting"],
      ["zip", "property-type", "income", "debts"],
    ],
  );
  assert.equal(HUB_GRID_ROWS.length, 7);
  assert.equal(HUB_GRID_ROWS[1].join(" "), "home first-lien line ltv cltv");
  assert.equal(HUB_GRID_ROWS.at(-1)?.join(" "), "zip property-type income debts");

  const file = writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000);
  const hub = processingHubView(file);
  assert.deepEqual(hub.grid.map((row) => row.label), [...HUB_GRID_LABELS]);
  assert.equal(hub.grid.find((row) => row.id === "home")?.value, "$500,000");
  assert.equal(hub.grid.find((row) => row.id === "first-lien")?.value, "$400,000");
  assert.equal(hub.grid.find((row) => row.id === "line")?.value, "$50,000");
  assert.equal(hub.grid.find((row) => row.id === "ltv")?.value, "80.0%");
  assert.equal(hub.grid.find((row) => row.id === "cltv")?.value, "90.0%");
  assert.equal(hub.grid.find((row) => row.id === "ltv")?.note, "Estimated · not final");
  assert.equal(hub.grid.find((row) => row.id === "cltv")?.note, "Estimated · not final");
  assert.equal(hub.grid.find((row) => row.id === "zip")?.value, "94123");
  assert.equal(hub.grid.find((row) => row.id === "property-type")?.value, "House");
  assert.equal(hub.grid.find((row) => row.id === "income")?.value, "W-2");
  assert.equal(hub.grid.find((row) => row.id === "debts")?.value, HUB_EMPTY);
  assert.equal(hub.grid.find((row) => row.id === "b1")?.value, HUB_EMPTY);
  assert.equal(hub.grid.find((row) => row.id === "qualifying")?.value, HUB_EMPTY);

  const css = readFileSync(new URL("../styles/fox.css", import.meta.url), "utf8");
  assert.match(css, /staff-hub-grid__row--5 \{\n  grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
  assert.match(
    css,
    /@media \(max-width: 960px\)[\s\S]*staff-hub-grid__row--5 \{\n    grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
  );
  assert.match(css, /staff-hub-grid__row--4 \{\n  grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(css, /staff-hub-grid__row--3 \{\n  grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(css, /staff-hub-grid__row--2 \{\n  grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  const start = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(start, /staff-hub-grid__row--5/);
  const hubPage = readFileSync(new URL("../components/fox/ProcessingHub.tsx", import.meta.url), "utf8");
  assert.match(hubPage, /HUB_SQUARES/);
  assert.match(hubPage, /staff-hub-squares/);
  assert.match(hubPage, /staff-hub-square__facts--\$\{square\.ids\.length\}/);

  console.log(
    "assert-pack-value-row: one row Value Lien Line LTV CLTV; bottom ZIP Type Income Debts; other rows closed",
  );
}

main();
