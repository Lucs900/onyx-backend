/**
 * Thread answers write onto empty File slots. Never invent. Never overwrite.
 * Stale persist cannot blank Lien / Line / Credit. Hub layout 51 stays closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  mergeFileDraft,
  persistLiveAccountRecord,
  createAccountRecord,
} from "../lib/account/core";
import { emptyDraft } from "../components/fox/store";
import { writeThreadAnswersToFile } from "../components/fox/threadAnswers";
import { HELOC_FIRST_LIEN_ASK, HELOC_LINE_ASK } from "../components/fox/heloc";
import { PROPERTY_ADDRESS_ASK, PROPERTY_TYPE_ASK } from "../components/fox/propertyType";
import { WHO_ON_LOAN_ASK } from "../components/fox/whoOnLoan";
import { HUB_EMPTY, HUB_GRID_LABELS, processingHubView } from "../components/fox/processingHub";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function fox(text: string, id: string): FoxMessage {
  return { id, role: "fox", text };
}
function client(text: string, id: string): FoxMessage {
  return { id, role: "client", text };
}

function thinHeloc(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "heloc",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    propertyValueAmount: 500_000,
    fileId: "file-thread-answers",
  };
}

const THREAD: FoxMessage[] = [
  fox("What’s the property value?", "v"),
  client("$500,000", "v-a"),
  fox(HELOC_FIRST_LIEN_ASK, "lien"),
  fox("The first-lien statement is the one I need.", "staff"),
  client("400,000", "lien-a"),
  fox(HELOC_LINE_ASK, "line"),
  client("50,000", "line-a"),
  fox(PROPERTY_TYPE_ASK, "type"),
  client("House", "type-a"),
  fox("What is your estimated FICO?", "fico"),
  client("760+", "fico-a"),
  fox(PROPERTY_ADDRESS_ASK, "zip"),
  client("94123", "zip-a"),
  fox("This HELOC right now: 8.80%. Estimated interest-only $367. Not a lock.", "quote"),
  client("This one", "quote-a"),
  fox("How is income earned?", "inc"),
  client("W-2", "inc-a"),
  fox(WHO_ON_LOAN_ASK, "who"),
  client("Just me", "who-a"),
];

function main() {
  const absent = writeThreadAnswersToFile(thinHeloc(), [
    fox(HELOC_FIRST_LIEN_ASK, "lien"),
    fox("What’s the property value?", "v"),
  ]);
  assert.equal(absent.firstLienAmount, undefined);
  assert.equal(absent.loanAmountValue, undefined);
  assert.equal(absent.creditBand, undefined);

  const written = writeThreadAnswersToFile(thinHeloc(), THREAD);
  assert.equal(written.firstLienAmount, 400_000);
  assert.equal(written.loanAmountValue, 50_000);
  assert.equal(written.creditBand, "760+");
  assert.equal(written.propertyType, "sfr");
  assert.equal(written.propertyZip, "94123");
  assert.equal(written.whoOnLoan, "just-me");
  assert.equal(written.propertyValueAmount, 500_000);
  assert.equal(written.borrowerName, undefined);
  assert.equal(written.liveQuote?.rate, 8.8);
  assert.equal(written.liveQuote?.interestOnly, 367);

  const kept = writeThreadAnswersToFile(
    { ...thinHeloc(), firstLienAmount: 350_000, firstLienAsked: true },
    THREAD,
  );
  assert.equal(kept.firstLienAmount, 350_000);

  const hub = processingHubView(written);
  assert.deepEqual(hub.grid.map((row) => row.label), [...HUB_GRID_LABELS]);
  assert.equal(hub.grid.length, 18);
  assert.equal(hub.grid.find((row) => row.id === "first-lien")?.value, "$400,000");
  assert.equal(hub.grid.find((row) => row.id === "line")?.value, "$50,000");
  assert.equal(hub.grid.find((row) => row.id === "credit")?.value, "760+");
  assert.equal(hub.grid.find((row) => row.id === "rate")?.value, "8.80%");
  assert.equal(hub.grid.find((row) => row.id === "io")?.value, "$367");
  assert.match(hub.grid.find((row) => row.id === "ltv")?.value ?? "", /80/);
  assert.match(hub.grid.find((row) => row.id === "cltv")?.value ?? "", /90/);
  assert.equal(hub.grid.find((row) => row.id === "count")?.value, "1");
  assert.equal(hub.grid.find((row) => row.id === "b1")?.value, HUB_EMPTY);
  assert.equal(hub.grid.find((row) => row.id === "qualifying")?.value, HUB_EMPTY);
  assert.equal(hub.grid.find((row) => row.id === "home")?.value, "$500,000");

  const merged = mergeFileDraft(written, thinHeloc());
  assert.equal(merged.firstLienAmount, 400_000);
  assert.equal(merged.loanAmountValue, 50_000);
  assert.equal(merged.creditBand, "760+");
  assert.equal(merged.propertyValueAmount, 500_000);

  const record = createAccountRecord({
    draft: written,
    messages: THREAD,
    fileId: "file-thread-answers",
    email: "walker@example.com",
  });
  const stale = persistLiveAccountRecord(record, thinHeloc(), THREAD);
  assert.equal(stale.draft.firstLienAmount, 400_000);
  assert.equal(stale.draft.loanAmountValue, 50_000);
  assert.equal(stale.draft.creditBand, "760+");

  const hubPage = readFileSync(new URL("../components/fox/ProcessingHub.tsx", import.meta.url), "utf8");
  assert.match(hubPage, /staff-hub-grid--processing/);
  assert.match(hubPage, /HUB_GRID_ROWS/);
  assert.match(hubPage, /resumeAccountFromQuery\(\{ fileId: wanted \}\)/);
  assert.doesNotMatch(hubPage, /if \(live\.fileId !== wanted\)/);

  console.log(
    "assert-write-thread-answers: 400k/50k/760+/8.80/$367 written from thread; stale persist keeps them; no name; layout closed",
  );
}

main();
