/**
 * Hub QI is the wage already written on the File.
 * W-2 Use this writes Box 5. No monthly. No /12 in the hub.
 * Pending suggestion paints —. B1 / Need / /start stay closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import {
  acceptWageExtract,
  proposeWageW2Extract,
  QUALIFYING_INCOME_FIELD,
} from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writePurchasePrice } from "../components/fox/workspace";
import {
  HUB_EMPTY,
  HUB_SQUARES,
  hubNeedRow,
  hubQiRow,
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
    skippedClasses: ["w2", "paystub"],
    wageDocsAsked: true,
    wageStubAsked: true,
    fileId: "file-hub-qi-written-wage",
  };
}

function filled(): FoxIntakeDraft {
  return writeWhoOnLoan(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
    "just-me",
  );
}

function main() {
  const closed = filled();
  assert.equal(hubQiRow(closed).value, HUB_EMPTY);
  assert.equal(closed.facts?.w2_box5, undefined);
  assert.equal(closed.facts?.[QUALIFYING_INCOME_FIELD], undefined);

  const pending = proposeWageW2Extract(closed, 120_000, "INNOVATION PARTNERS LLC", "Raymond Lee");
  assert.equal(hubQiRow(pending).value, HUB_EMPTY);
  assert.equal(pending.facts?.w2_box5, undefined);

  const written = acceptWageExtract(pending);
  assert.equal(written.facts?.w2_box5?.value, "120000");
  assert.equal(written.facts?.w2_box5?.confirmed, true);
  assert.equal(written.facts?.w2_box5?.source, "document");
  assert.equal(written.facts?.medicare_wages?.value, "120000");
  assert.equal(written.facts?.[QUALIFYING_INCOME_FIELD], undefined);
  assert.equal(hubQiRow(written).value, "$120,000");
  assert.equal(hubQiRow(written).note, "Box 5 · annual");
  assert.doesNotMatch(hubQiRow(written).value, /10,000|\/ mo/);

  const monthlyStored: FoxIntakeDraft = {
    ...closed,
    facts: {
      ...closed.facts,
      [QUALIFYING_INCOME_FIELD]: {
        field: QUALIFYING_INCOME_FIELD,
        value: "10000",
        source: "client",
        confirmed: true,
      },
    },
  };
  assert.equal(hubQiRow(monthlyStored).value, "$10,000 / mo");

  const suggestionOnly: FoxIntakeDraft = {
    ...closed,
    pendingProposal: {
      field: QUALIFYING_INCOME_FIELD,
      value: "10000",
      label: "qualifying income",
      kind: "computed",
    },
  };
  assert.equal(hubQiRow(suggestionOnly).value, HUB_EMPTY);

  const squares = hubSquares(written);
  const income = squares.find((square) => square.id === "income");
  assert.equal(income?.cells.find((cell) => cell.id === "qualifying")?.value, "$120,000");
  assert.equal(income?.cells.find((cell) => cell.id === "qualifying")?.note, "Box 5 · annual");
  assert.equal(income?.cells.find((cell) => cell.id === "income")?.value, "W-2");
  assert.equal(hubNeedRow(written).value, "Last year’s W-2");
  assert.deepEqual([...HUB_SQUARES[4].ids], ["income", "qualifying", "debts"]);

  const hub = processingHubView(written);
  assert.equal(hub.grid.find((row) => row.id === "qualifying")?.value, "$120,000");
  assert.equal(hub.grid.find((row) => row.id === "qualifying")?.note, "Box 5 · annual");

  const hubSrc = readFileSync(new URL("../components/fox/processingHub.ts", import.meta.url), "utf8");
  assert.match(hubSrc, /hubQiRow\(draft\)/);
  assert.doesNotMatch(hubSrc, /monthlyFromAnnual/);
  assert.doesNotMatch(hubSrc, /Math\.round\([^)]*\/\s*12/);
  const start = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(start, /hubQiRow/);
  assert.doesNotMatch(start, /staff-hub-squares/);

  console.log(
    "assert-hub-qi-written-wage: QI from written Box 5 annual; no /12; pending —; /start closed",
  );
}

main();
