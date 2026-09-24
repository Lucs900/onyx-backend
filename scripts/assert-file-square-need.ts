/**
 * File square Need is the one notepad still-useful line already on File.
 * Last year’s W-2 from skippedClasses. No new condition. Other squares stay.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAST_YEAR_W2_STILL_USEFUL, stillUsefulSpokenItems } from "../components/fox/fileWrite";
import { emptyDraft } from "../components/fox/store";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writePurchasePrice } from "../components/fox/workspace";
import {
  HUB_EMPTY,
  HUB_SQUARES,
  hubNeedRow,
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
    fileId: "file-square-need",
  };
}

function filled(): FoxIntakeDraft {
  return writeWhoOnLoan(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
    "just-me",
  );
}

function main() {
  assert.deepEqual([...HUB_SQUARES[5].ids], ["status", "next", "waiting", "need"]);
  assert.deepEqual(
    HUB_SQUARES.slice(0, 5).map((square) => square.label),
    ["Collateral", "Price", "Borrower", "Property", "Income"],
  );
  assert.deepEqual([...HUB_SQUARES[0].ids], ["home", "first-lien", "line", "ltv", "cltv"]);

  const closed = filled();
  assert.deepEqual(closed.conditions ?? [], []);
  assert.equal(hubNeedRow(closed).value, HUB_EMPTY);
  assert.deepEqual(stillUsefulSpokenItems(closed).map((item) => item.label), []);

  const stored = {
    ...closed,
    skippedClasses: ["w2", "paystub"] as FoxIntakeDraft["skippedClasses"],
    wageDocsAsked: true,
    wageStubAsked: true,
  };
  assert.deepEqual(stillUsefulSpokenItems(stored).map((item) => item.label), [LAST_YEAR_W2_STILL_USEFUL]);
  assert.equal(hubNeedRow(stored).label, "Need");
  assert.equal(hubNeedRow(stored).value, LAST_YEAR_W2_STILL_USEFUL);
  assert.deepEqual(stored.conditions ?? [], []);

  const squares = hubSquares(stored);
  const file = squares.find((square) => square.id === "file");
  assert.equal(file?.cells.find((cell) => cell.id === "need")?.value, LAST_YEAR_W2_STILL_USEFUL);
  assert.equal(file?.cells.find((cell) => cell.id === "status")?.value, "gathering");
  assert.equal(file?.cells.find((cell) => cell.id === "next")?.value, "You");
  assert.equal(file?.cells.find((cell) => cell.id === "waiting")?.value, "borrower");

  const hub = processingHubView(stored);
  assert.equal(hub.grid.find((row) => row.id === "home")?.value, "$500,000");
  assert.equal(hub.grid.find((row) => row.id === "first-lien")?.value, "$400,000");
  assert.equal(hub.grid.find((row) => row.id === "line")?.value, "$50,000");
  assert.equal(hub.grid.find((row) => row.id === "ltv")?.value, "80.0%");
  assert.equal(hub.grid.find((row) => row.id === "cltv")?.value, "90.0%");
  assert.equal(hub.grid.find((row) => row.id === "rate")?.value, "8.80%");
  assert.equal(hub.grid.find((row) => row.id === "io")?.value, "$367");
  assert.equal(hub.grid.find((row) => row.id === "income")?.value, "W-2");
  assert.equal(hub.grid.find((row) => row.id === "zip")?.value, "94123");
  assert.ok(!hub.grid.some((row) => row.id === "need"));

  const paystubOnly = { ...closed, skippedClasses: ["paystub"] as FoxIntakeDraft["skippedClasses"] };
  assert.equal(hubNeedRow(paystubOnly).value, HUB_EMPTY);

  const hubPage = readFileSync(new URL("../components/fox/ProcessingHub.tsx", import.meta.url), "utf8");
  assert.match(hubPage, /hubNeedRow\(draft\)/);
  assert.match(hubPage, /HUB_SQUARES/);
  const start = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(start, /hubNeedRow/);
  assert.doesNotMatch(start, /staff-hub-squares/);

  console.log(
    "assert-file-square-need: File Need Last year’s W-2 from skippedClasses; no condition; other squares closed",
  );
}

main();
