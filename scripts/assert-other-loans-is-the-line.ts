/**
 * HELOC line is not Other loans. Line fills HELOC line only.
 * Other loans fills only from an explicit other-liens answer.
 * Leftover line-as-subordinate clears to —. CLTV still 90% (line counted once).
 */
import assert from "node:assert/strict";
import { SUBORDINATE_FIELD } from "../lib/calculators/conventional";
import {
  mergeFileDraft,
  persistLiveAccountRecord,
  createAccountRecord,
} from "../lib/account/core";
import { emptyDraft } from "../components/fox/store";
import {
  calculatorStructureFacts,
  draftLtvCltv,
  explicitOtherLiens,
  persistLtvCltv,
  stripHelocLineFromOtherLoans,
} from "../components/fox/calculators";
import { writeThreadAnswersToFile } from "../components/fox/threadAnswers";
import { HELOC_FIRST_LIEN_ASK, HELOC_LINE_ASK, writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { writePurchasePrice, previewFacts } from "../components/fox/workspace";
import { HUB_EMPTY, HUB_GRID_LABELS, processingHubView } from "../components/fox/processingHub";
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
    fileId: "file-other-loans-is-the-line",
  };
}

function houseReady(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
  };
}

const THREAD: FoxMessage[] = [
  fox("What’s the property value?", "v"),
  client("$500,000", "v-a"),
  fox(HELOC_FIRST_LIEN_ASK, "lien"),
  client("400,000", "lien-a"),
  fox(HELOC_LINE_ASK, "line"),
  client("50,000", "line-a"),
];

function otherLoansFact(draft: FoxIntakeDraft) {
  return (
    previewFacts(draft).find((item) => item.id === "subordinate" || item.label === "Other loans on this property") ??
    calculatorStructureFacts(draft).find((item) => item.id === "subordinate")
  );
}

function leakedLineAsOtherLoans(): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...houseReady(writePurchasePrice(afterPrimary(), 500_000)),
    firstLienAmount: 400_000,
    firstLienAsked: true,
    loanAmountValue: 50_000,
    amountAsked: true,
    helocLineAsked: true,
    subordinateBalance: 50_000,
    facts: {
      [SUBORDINATE_FIELD]: {
        field: SUBORDINATE_FIELD,
        value: "50000",
        source: "client",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

function main() {
  const written = houseReady(
    writeHelocLine(writeFirstLien(writePurchasePrice(afterPrimary(), 500_000), 400_000), 50_000),
  );
  assert.equal(written.loanAmountValue, 50_000);
  assert.equal(written.firstLienAmount, 400_000);
  assert.equal(written.propertyValueAmount, 500_000);
  assert.equal(written.subordinateBalance, undefined);
  assert.equal(written.facts?.[SUBORDINATE_FIELD], undefined);
  assert.equal(explicitOtherLiens(written), null);
  assert.equal(draftLtvCltv(written)?.cltv, 0.9);
  assert.equal(otherLoansFact(written)?.value, "—");
  assert.equal(previewFacts(written).find((item) => item.id === "line")?.value, "$50,000");

  const leaked = leakedLineAsOtherLoans();
  assert.equal(leaked.subordinateBalance, 50_000);
  assert.equal(explicitOtherLiens(leaked), null);
  assert.equal(draftLtvCltv(leaked)?.cltv, 0.9);
  assert.equal(otherLoansFact(leaked)?.value, "—");

  const stripped = persistLtvCltv(stripHelocLineFromOtherLoans(leaked));
  assert.equal(stripped.subordinateBalance, undefined);
  assert.equal(stripped.facts?.[SUBORDINATE_FIELD], undefined);
  assert.equal(stripped.loanAmountValue, 50_000);
  assert.equal(draftLtvCltv(stripped)?.cltv, 0.9);
  assert.equal(otherLoansFact(stripped)?.value, "—");

  const repaired = writeThreadAnswersToFile(leaked, THREAD);
  assert.equal(repaired.subordinateBalance, undefined);
  assert.equal(repaired.facts?.[SUBORDINATE_FIELD], undefined);
  assert.equal(repaired.loanAmountValue, 50_000);
  assert.equal(repaired.firstLienAmount, 400_000);
  assert.equal(draftLtvCltv(repaired)?.cltv, 0.9);
  assert.equal(otherLoansFact(repaired)?.value, "—");

  const merged = mergeFileDraft(repaired, leaked);
  assert.equal(merged.subordinateBalance, undefined);
  assert.equal(merged.loanAmountValue, 50_000);
  assert.equal(draftLtvCltv(merged)?.cltv, 0.9);

  const record = createAccountRecord({
    draft: leaked,
    messages: THREAD,
    fileId: "file-other-loans-is-the-line",
    email: "walker@example.com",
  });
  const persisted = persistLiveAccountRecord(record, leaked, THREAD);
  assert.equal(persisted.draft.subordinateBalance, undefined);
  assert.equal(persisted.draft.loanAmountValue, 50_000);

  const explicit = persistLtvCltv({ ...written, subordinateBalance: 25_000 });
  assert.equal(explicit.subordinateBalance, 25_000);
  assert.equal(explicitOtherLiens(explicit), 25_000);
  assert.equal(draftLtvCltv(explicit)?.cltv, 0.95);
  assert.equal(otherLoansFact(explicit)?.value, "$25,000");

  const hub = processingHubView(written);
  assert.equal(hub.grid.length, HUB_GRID_LABELS.length);
  assert.equal(hub.grid.find((row) => row.id === "line")?.value, "$50,000");
  assert.match(hub.grid.find((row) => row.id === "cltv")?.value ?? "", /90/);
  assert.equal(hub.grid.find((row) => row.id === "first-lien")?.value, "$400,000");
  assert.equal(hub.grid.find((row) => row.id === "home")?.value, "$500,000");
  assert.equal(hub.grid.find((row) => row.id === "b1")?.value, HUB_EMPTY);

  console.log(
    "assert-other-loans-is-the-line: line $50k is not Other loans; leftover clears to —; CLTV 90% once; explicit other-liens still write",
  );
}

main();
