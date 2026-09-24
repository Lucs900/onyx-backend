/**
 * Hub paints ZIP / Type / Income / Debts from facts already on the File.
 * Display only. Never invent W-2 from Still useful. Never invent a name. Never DTI.
 * Existing bbb8cdf boxes stay. CLTV 90.0% display stays.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import { writeThreadAnswersToFile } from "../components/fox/threadAnswers";
import { HELOC_FIRST_LIEN_ASK, HELOC_LINE_ASK, writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { PROPERTY_ADDRESS_ASK, PROPERTY_TYPE_ASK } from "../components/fox/propertyType";
import { WHO_ON_LOAN_ASK } from "../components/fox/whoOnLoan";
import { writePurchasePrice } from "../components/fox/workspace";
import {
  HUB_EMPTY,
  HUB_GRID_LABELS,
  HUB_GRID_ROWS,
  processingHubView,
} from "../components/fox/processingHub";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function fox(text: string, id: string): FoxMessage {
  return { id, role: "fox", text };
}
function client(text: string, id: string): FoxMessage {
  return { id, role: "client", text };
}

function afterPrimary(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "heloc",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    fileId: "file-hub-desk-facts",
  };
}

const THREAD: FoxMessage[] = [
  fox("What’s the property value?", "v"),
  client("$500,000", "v-a"),
  fox(HELOC_FIRST_LIEN_ASK, "lien"),
  client("400,000", "lien-a"),
  fox(HELOC_LINE_ASK, "line"),
  client("50,000", "line-a"),
  fox(PROPERTY_TYPE_ASK, "type"),
  client("House", "type-a"),
  fox("What is your estimated FICO?", "fico"),
  client("760+", "fico-a"),
  fox(PROPERTY_ADDRESS_ASK, "zip"),
  client("94123", "zip-a"),
  fox("How is income earned?", "inc"),
  client("W-2", "inc-a"),
  fox(WHO_ON_LOAN_ASK, "who"),
  client("Just me", "who-a"),
];

function main() {
  const written = writeThreadAnswersToFile(
    {
      ...writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
      monthlyDebtsAsked: true,
      skippedClasses: ["w2", "paystub"],
    },
    THREAD,
  );
  assert.equal(written.propertyZip, "94123");
  assert.equal(written.propertyType, "sfr");
  assert.equal(written.incomeType.value, "w2");
  assert.equal(written.statedMonthlyDebts, undefined);
  assert.equal(written.borrowerName, undefined);

  const hub = processingHubView(written);
  assert.deepEqual(hub.grid.map((row) => row.label), [...HUB_GRID_LABELS]);
  assert.equal(hub.grid.length, 22);
  assert.equal(HUB_GRID_ROWS[1].join(" "), "home first-lien line ltv cltv");
  assert.equal(HUB_GRID_ROWS.at(-1)?.join(" "), "zip property-type income debts");
  assert.equal(hub.grid.find((row) => row.id === "zip")?.label, "ZIP");
  assert.equal(hub.grid.find((row) => row.id === "zip")?.value, "94123");
  assert.equal(hub.grid.find((row) => row.id === "property-type")?.label, "Type");
  assert.equal(hub.grid.find((row) => row.id === "property-type")?.value, "House");
  assert.equal(hub.grid.find((row) => row.id === "income")?.label, "Income");
  assert.equal(hub.grid.find((row) => row.id === "income")?.value, "W-2");
  assert.equal(hub.grid.find((row) => row.id === "debts")?.label, "Debts");
  assert.equal(hub.grid.find((row) => row.id === "debts")?.value, HUB_EMPTY);
  assert.equal(hub.grid.find((row) => row.id === "line")?.value, "$50,000");
  assert.equal(hub.grid.find((row) => row.id === "first-lien")?.value, "$400,000");
  assert.equal(hub.grid.find((row) => row.id === "home")?.value, "$500,000");
  assert.equal(hub.grid.find((row) => row.id === "cltv")?.value, "90.0%");
  assert.equal(hub.grid.find((row) => row.id === "b1")?.value, HUB_EMPTY);
  assert.equal(hub.grid.find((row) => row.id === "qualifying")?.value, HUB_EMPTY);

  const suggestionOnly = processingHubView({
    ...writePurchasePrice(afterPrimary(), 500_000),
    skippedClasses: ["w2"],
  });
  assert.equal(suggestionOnly.grid.find((row) => row.id === "income")?.value, HUB_EMPTY);

  const css = readFileSync(new URL("../styles/fox.css", import.meta.url), "utf8");
  assert.match(css, /staff-hub-grid__row--4/);
  assert.match(css, /staff-hub-grid__row--3 \{\n  grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(css, /staff-hub-grid__row--2 \{\n  grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  const start = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(start, /staff-hub-grid__row--4/);

  console.log(
    "assert-hub-shows-desk-facts: ZIP 94123 · Type House · Income W-2 from incomeType · Debts —; still-useful W-2 does not invent Income; 51 boxes closed",
  );
}

main();
