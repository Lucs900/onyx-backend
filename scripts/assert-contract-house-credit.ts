/**
 * Combined leftover: 09 at the price ask, then House-turn FICO band.
 * Credit writes on File. A live rate line must not restore the FICO ask.
 * Split typed-price House-turn and 09-only walks are not this path.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { applyExtractedFields } from "../components/fox/fileWrite";
import { resolveProposal } from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import { writePropertyType } from "../components/fox/propertyType";
import {
  CREDIT_RANGE_ASK,
  messagesWithLiveQuoteSpeech,
  nextFoxAsk,
  parseVolunteeredCreditBand,
  previewFacts,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT = join(root, "sample-docs/09-purchase-contract-clipper.pdf");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on 09 text");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on 09 text");
  },
};

function atPriceAsk(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
  };
}

function noFico(text: string) {
  assert.doesNotMatch(text, /estimated FICO/i);
  assert.notEqual(text, CREDIT_RANGE_ASK);
}

function creditRow(draft: FoxIntakeDraft) {
  return previewFacts(draft).find((fact) => fact.id === "credit" || fact.label === "Credit");
}

async function fileAfter09(): Promise<FoxIntakeDraft> {
  const extracted = await classifyAndExtract(
    new Uint8Array(readFileSync(CONTRACT)),
    "application/pdf",
    deadVision,
    "purchase_contract",
    "09-purchase-contract-clipper.pdf",
  );
  assert.notEqual(extracted.failed, true);
  const dropped = applyExtractedFields(atPriceAsk(), {
    extractClass: "purchase_contract",
    confidence: 0.94,
    fields: extracted.fields ?? {},
  }).draft;
  const used = resolveProposal(dropped, "accept");
  const funded: FoxIntakeDraft = {
    ...used,
    downPaymentAmount: 170_000,
    loanAmountValue: 680_000,
    amountAsked: true,
    valueAsked: true,
  };
  return writePropertyType(funded, "sfr");
}

function afterTypedBand(draft: FoxIntakeDraft, typed: string) {
  const band = parseVolunteeredCreditBand(typed);
  assert.ok(band, `band from ${typed}`);
  const reply = workspaceReply(typed, draft);
  assert.equal(reply?.capture?.field, "creditRange");
  const written: FoxIntakeDraft = {
    ...draft,
    creditBand: band,
    creditAsked: true,
  };
  noFico(reply?.text ?? "");
  noFico(nextFoxAsk(written).text);
  assert.notEqual(workspacePrompt(written), "credit");
  const row = creditRow(written);
  assert.ok(row, "Credit must be on Structure");
  return written;
}

function afterRatePrints(draft: FoxIntakeDraft) {
  const quoted: FoxIntakeDraft = {
    ...draft,
    liveQuote: { key: "09|94114|760", rate: 6.125, asOf: "2026-09-07" },
    liveQuoteStatus: "ready",
    liveQuoteKey: "09|94114|760",
  };
  const ficoAsk: FoxMessage = {
    id: "fico-ask",
    role: "fox",
    text: CREDIT_RANGE_ASK,
    actions: [{ id: "credit-760", label: "760+", event: "bubble", capture: { field: "creditRange", value: "760+" } }],
  };
  const spoken = messagesWithLiveQuoteSpeech([ficoAsk], quoted, quoted.liveQuote!);
  const last = [...spoken].reverse().find((item) => item.role === "fox");
  assert.ok(last, "rate path spoke");
  noFico(last?.text ?? "");
  assert.ok(spoken.every((item) => !/estimated FICO/i.test(item.text)), "FICO restored after rate");
}

async function main() {
  const house = await fileAfter09();
  assert.match(nextFoxAsk(house).text, /House, condo|kind of home|estimated FICO/i);

  for (const typed of ["760+", "740-759", "740–759"]) {
    const written = afterTypedBand(house, typed);
    assert.match(creditRow(written)?.value ?? "", typed.includes("760") ? /760/ : /740/);
    afterRatePrints(written);
  }

  console.log("assert-contract-house-credit: 09 at price · House-turn band writes Credit · rate does not restore FICO");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
