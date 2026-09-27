/**
 * Borrower square Email is the address already saved on the File.
 * Account record email only. Never draft.contact.email. Empty = —.
 * Wrap only after @ or a dot. Count B1 B2 FICO stay. /start closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft } from "../components/fox/store";
import { writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { writePurchasePrice } from "../components/fox/workspace";
import { snapshotOf, memoryAccountStore } from "../lib/account/core";
import { createAccountRecord } from "../lib/account/core";
import {
  HUB_EMPTY,
  HUB_SQUARES,
  hubEmailRow,
  hubEmailWrapParts,
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
    skippedClasses: ["w2", "paystub"],
    wageDocsAsked: true,
    wageStubAsked: true,
    fileId: "file-borrower-square-email",
  };
}

function filled(): FoxIntakeDraft {
  return writeWhoOnLoan(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
    "just-me",
  );
}

function main() {
  assert.deepEqual([...HUB_SQUARES[2].ids], ["count", "b1", "b2", "credit", "email"]);
  assert.deepEqual([...HUB_SQUARES[5].ids], ["status", "next", "waiting", "need"]);
  assert.deepEqual([...HUB_SQUARES[0].ids], ["home", "first-lien", "line", "ltv", "cltv"]);

  const closed = filled();
  assert.equal(closed.contact.email.value, "");
  assert.equal(hubEmailRow(closed).value, HUB_EMPTY);

  const onContact = {
    ...closed,
    contact: {
      ...closed.contact,
      email: { ...closed.contact.email, value: "lucas@onyxlending.com" },
    },
  };
  assert.equal(hubEmailRow(onContact).value, HUB_EMPTY);
  assert.equal(hubEmailWrapParts("lucas@onyxlending.com").join(""), "lucas@onyxlending.com");
  assert.deepEqual(hubEmailWrapParts("lucas@onyxlending.com"), ["lucas@", "onyxlending.", "com"]);

  const record = createAccountRecord({
    draft: closed,
    messages: [],
    fileId: "file-borrower-square-email",
    email: "lucas@onyxlending.com",
  });
  assert.equal(record.email, "lucas@onyxlending.com");
  assert.equal(snapshotOf(record).email, "lucas@onyxlending.com");
  assert.equal(closed.contact.email.value, "");
  assert.equal(hubEmailRow(closed, snapshotOf(record).email).value, "lucas@onyxlending.com");
  assert.equal(hubEmailRow(closed, "not-an-email").value, HUB_EMPTY);

  const squares = hubSquares(closed, snapshotOf(record).email);
  const borrower = squares.find((square) => square.id === "borrower");
  assert.deepEqual(
    borrower?.cells.map((cell) => `${cell.label} ${cell.value}`),
    ["Count 1", `B1 ${HUB_EMPTY}`, `B2 ${HUB_EMPTY}`, "FICO 760+", "Email lucas@onyxlending.com"],
  );
  assert.equal(hubNeedRow({ ...closed, skippedClasses: ["w2", "paystub"] }).value, "Last year’s W-2");

  const hub = processingHubView(onContact);
  assert.equal(hub.grid.find((row) => row.id === "home")?.value, "$500,000");
  assert.equal(hub.grid.find((row) => row.id === "income")?.value, "W-2");
  assert.ok(!hub.grid.some((row) => row.id === "email"));

  const hubPage = readFileSync(new URL("../components/fox/ProcessingHub.tsx", import.meta.url), "utf8");
  assert.match(hubPage, /hubEmailRow\(draft, getResumedAccountEmail\(\)\)/);
  assert.match(hubPage, /hubEmailWrapParts/);
  assert.match(hubPage, /<wbr \/>/);
  assert.match(hubPage, /staff-hub-cell__value--email/);
  assert.doesNotMatch(hubPage, /paystub/);
  const css = readFileSync(new URL("../styles/fox.css", import.meta.url), "utf8");
  assert.match(css, /staff-hub-cell__value--email \{\n  overflow-wrap: normal;\n  word-break: normal;/);
  assert.match(css, /staff-hub-cell--email \{\n  grid-column: span 2;/);
  assert.doesNotMatch(css, /staff-hub-cell__value--email \{[\s\S]*?(anywhere|break-all|break-word)/);
  const start = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(start, /hubEmailRow/);
  assert.doesNotMatch(start, /staff-hub-squares/);
  assert.doesNotMatch(start, /staff-hub-cell--email/);

  memoryAccountStore().put(record);
  console.log(
    "assert-borrower-square-email: Email from account record; wrap after @ or dot; empty —; Count B1 B2 FICO stay; /start closed",
  );
}

main();
