/**
 * Hub paints six labeled squares. Same 22 cells. Numbers stay.
 * Collateral holds Value Lien Line LTV CLTV. Squares wrap on a narrow window.
 * Do not invent. Empty = —. /start stays closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writePurchasePrice } from "../components/fox/workspace";
import {
  HUB_EMPTY,
  HUB_GRID_IDS,
  HUB_GRID_LABELS,
  HUB_GRID_ROWS,
  HUB_SQUARES,
  hubSquares,
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
    fileId: "file-hub-labeled-squares",
  };
}

function main() {
  assert.equal(HUB_SQUARES.length, 6);
  assert.deepEqual(
    HUB_SQUARES.map((square) => square.label),
    ["Collateral", "Price", "Borrower", "Property", "Income", "File"],
  );
  assert.deepEqual([...HUB_SQUARES[0].ids], ["home", "first-lien", "line", "ltv", "cltv"]);
  assert.deepEqual([...HUB_SQUARES[1].ids], ["rate", "io"]);
  assert.deepEqual([...HUB_SQUARES[2].ids], ["count", "b1", "b2", "credit", "email"]);
  assert.deepEqual([...HUB_SQUARES[3].ids], ["product", "purpose", "occupancy", "property-type", "zip", "street"]);
  assert.deepEqual([...HUB_SQUARES[4].ids], ["income", "qualifying", "debts"]);
  assert.deepEqual([...HUB_SQUARES[5].ids], ["status", "next", "waiting", "need"]);

  const painted = HUB_SQUARES.flatMap((square) => [...square.ids]);
  assert.deepEqual(
    [...painted.filter((id) => id !== "need" && id !== "email" && id !== "street")].sort(),
    [...HUB_GRID_IDS].sort(),
  );
  assert.equal(new Set(painted).size, HUB_GRID_IDS.length + 3);

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

  const file = writeWhoOnLoan(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
    "just-me",
  );
  const hub = processingHubView(file);
  const squares = hubSquares(file);
  assert.deepEqual(hub.grid.map((row) => row.label), [...HUB_GRID_LABELS]);
  assert.equal(hub.grid.length, 22);
  assert.equal(squares.length, 6);

  const bySquare = Object.fromEntries(squares.map((square) => [square.id, square]));
  assert.deepEqual(
    bySquare.collateral.cells.map((cell) => `${cell.label} ${cell.value}`),
    ["Value $500,000", "Lien $400,000", "Line $50,000", "LTV 80.0%", "CLTV 90.0%"],
  );
  assert.equal(bySquare.collateral.cells.find((cell) => cell.id === "ltv")?.note, "Estimated · not final");
  assert.equal(bySquare.collateral.cells.find((cell) => cell.id === "cltv")?.note, "Estimated · not final");
  assert.equal(bySquare.price.cells.find((cell) => cell.id === "rate")?.value, "8.80%");
  assert.equal(bySquare.price.cells.find((cell) => cell.id === "io")?.value, "$367");
  assert.deepEqual(
    bySquare.borrower.cells.map((cell) => `${cell.label} ${cell.value}`),
    ["Count 1", `B1 ${HUB_EMPTY}`, `B2 ${HUB_EMPTY}`, "FICO 760+", `Email ${HUB_EMPTY}`],
  );
  assert.deepEqual(
    bySquare.property.cells.map((cell) => `${cell.label} ${cell.value}`),
    ["Product HELOC", "Purpose HELOC", "Occ Primary", "Type House", "ZIP 94123", `Street ${HUB_EMPTY}`],
  );
  assert.deepEqual(
    bySquare.income.cells.map((cell) => `${cell.label} ${cell.value}`),
    ["Income W-2", `QI ${HUB_EMPTY}`, `Debts ${HUB_EMPTY}`],
  );
  assert.equal(bySquare.file.cells.find((cell) => cell.id === "status")?.value, "gathering");
  assert.equal(bySquare.file.cells.find((cell) => cell.id === "next")?.value, "You");
  assert.equal(bySquare.file.cells.find((cell) => cell.id === "waiting")?.value, "borrower");
  assert.equal(bySquare.file.cells.find((cell) => cell.id === "need")?.value, HUB_EMPTY);
  assert.match(
    bySquare.file.cells.find((cell) => cell.id === "status")?.note ?? "",
    /Completeness is a signal/,
  );
  assert.equal(bySquare.borrower.cells.find((cell) => cell.id === "credit")?.note, "Stated · not a pull");

  const css = readFileSync(new URL("../styles/fox.css", import.meta.url), "utf8");
  assert.match(css, /staff-hub-squares \{\n  display: grid;/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(
    css,
    /@media \(max-width: 960px\)[\s\S]*staff-hub-squares \{\n    grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    css,
    /@media \(max-width: 640px\)[\s\S]*staff-hub-squares \{\n    grid-template-columns: minmax\(0, 1fr\);/,
  );
  assert.match(css, /staff-hub-square__facts--5 \{\n  grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);

  const hubPage = readFileSync(new URL("../components/fox/ProcessingHub.tsx", import.meta.url), "utf8");
  assert.match(hubPage, /HUB_SQUARES/);
  assert.match(hubPage, /staff-hub-squares/);
  assert.match(hubPage, /staff-hub-square__label/);
  assert.doesNotMatch(hubPage, /HUB_GRID_ROWS\.map/);
  assert.ok(hubPage.indexOf("staff-hub-squares") < hubPage.indexOf('type-card-title">Borrower thread'));
  assert.ok(hubPage.indexOf('type-card-title">Borrower thread') < hubPage.indexOf("foxLine (borrower)"));

  const start = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(start, /staff-hub-squares/);
  assert.doesNotMatch(start, /HUB_SQUARES/);

  console.log(
    "assert-hub-labeled-squares: six squares; Collateral Value Lien Line LTV CLTV; numbers stay; /start closed",
  );
}

main();
