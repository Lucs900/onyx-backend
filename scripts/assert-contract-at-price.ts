/**
 * Fixture 09 dropped at the purchase-price ask.
 * Use this writes 88 Clipper · $850,000 · October 15, 2026.
 * Do not say On the file / Try again. Do not re-ask price or estimated FICO.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { applyExtractedFields } from "../components/fox/fileWrite";
import {
  firstEmptyRequiredLine,
  resolveProposal,
} from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import {
  CREDIT_RANGE_ASK,
  docReactionAsk,
  nextFoxAsk,
  workspacePrompt,
  workspaceReply,
} from "../components/fox/workspace";
import type { FoxIntakeDraft } from "../components/fox/types";

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
    creditAsked: true,
    creditBand: "760+",
  };
}

function noDeadAsk(text: string) {
  assert.doesNotMatch(text, /On the file/i);
  assert.doesNotMatch(text, /Try again/i);
  assert.doesNotMatch(text, /What’s the purchase price/i);
  assert.doesNotMatch(text, /estimated FICO/i);
  assert.notEqual(text, CREDIT_RANGE_ASK);
}

async function main() {
  assert.equal(workspacePrompt(atPriceAsk()), "value");
  assert.equal(nextFoxAsk(atPriceAsk()).text, "What’s the purchase price?");
  assert.equal(firstEmptyRequiredLine(atPriceAsk())?.id, "price");

  const extracted = await classifyAndExtract(
    new Uint8Array(readFileSync(CONTRACT)),
    "application/pdf",
    deadVision,
    "purchase_contract",
    "09-purchase-contract-clipper.pdf",
  );
  assert.notEqual(extracted.failed, true);
  assert.equal(extracted.extractClass, "purchase_contract");
  assert.match(extracted.fields.property_address ?? "", /88 Clipper Street/i);
  assert.equal(extracted.fields.purchase_price, "850000");
  assert.match(extracted.fields.close_date ?? "", /October 15, 2026|10\/15\/2026|2026-10-15/);

  const dropped = applyExtractedFields(
    {
      ...atPriceAsk(),
      documents: [
        {
          slot: "other",
          name: "09-purchase-contract-clipper.pdf",
          type: "application/pdf",
          size: 4000,
          receivedAt: "2026-09-06T20:20:00.000Z",
          status: "extracted",
          extractClass: "purchase_contract",
        },
      ],
    },
    {
      extractClass: "purchase_contract",
      confidence: 0.94,
      fields: extracted.fields ?? {},
    },
  ).draft;
  const confirm = docReactionAsk(dropped, "purchase_contract") ?? nextFoxAsk(dropped);
  assert.match(confirm.text, /88 Clipper/i);
  assert.match(confirm.text, /\$850,000/);
  assert.match(confirm.text, /October 15, 2026|10\/15\/2026|2026-10-15/);
  assert.ok((confirm.actions ?? []).some((item) => item.label === "Use this"));
  assert.doesNotMatch(confirm.text, /On the file|Try again/i);

  const used = resolveProposal(dropped, "accept");
  assert.match(used.subjectAddress ?? "", /88 Clipper Street/i);
  assert.equal(used.propertyValueAmount, 850_000);
  assert.equal(used.facts?.purchase_price?.value, "850000");
  assert.match(used.facts?.close_date?.value ?? "", /October 15, 2026|10\/15\/2026|2026-10-15/);
  assert.equal(used.propertyZip, "94114");
  assert.equal(firstEmptyRequiredLine(used)?.id, "down");
  const afterUse = nextFoxAsk(used);
  noDeadAsk(afterUse.text);
  assert.match(afterUse.text, /down payment or loan amount/i);

  const typed = workspaceReply("Use this", dropped);
  noDeadAsk(typed?.text ?? "");
  assert.match(typed?.text ?? "", /down payment or loan amount/i);
  assert.equal(typed?.capture?.field, "accept-proposal");

  console.log("assert-contract-at-price: 09 at price ask writes Clipper · $850,000 · close · next is funds");
}

main();
