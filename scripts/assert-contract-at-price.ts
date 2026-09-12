/**
 * Fixture 09 dropped at the purchase-price ask.
 * The contract confirm prints once. Use this writes 88 Clipper · $850,000 ·
 * October 15, 2026 · seller credit, then the first empty required line.
 * Do not reprint the confirm. Do not say On the file / Try again.
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
  dropResolvedAddressConfirmChips,
  freezeUsedFoxTurns,
  withoutDuplicateContractConfirm,
} from "../components/fox/liveCoupon";
import {
  CREDIT_RANGE_ASK,
  docReactionAsk,
  isContractExtractAskText,
  nextFoxAsk,
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

function contractConfirmCount(messages: FoxMessage[]) {
  return messages.filter((item) => item.role === "fox" && isContractExtractAskText(item.text)).length;
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
  assert.match(confirm.text, /seller credit \$5,000/i);

  const used = resolveProposal(dropped, "accept");
  assert.match(used.subjectAddress ?? "", /88 Clipper Street/i);
  assert.equal(used.propertyValueAmount, 850_000);
  assert.equal(used.facts?.purchase_price?.value, "850000");
  assert.match(used.facts?.close_date?.value ?? "", /October 15, 2026|10\/15\/2026|2026-10-15/);
  assert.equal(used.facts?.seller_credit?.value, "5000");
  assert.equal(used.propertyZip, "94114");
  assert.equal(used.pendingProposal, null);
  assert.equal(firstEmptyRequiredLine(used)?.id, "down");
  const afterUse = nextFoxAsk(used);
  noDeadAsk(afterUse.text);
  assert.doesNotMatch(afterUse.text, /The contract shows/i);
  assert.match(afterUse.text, /down payment or loan amount/i);

  const typed = workspaceReply("Use this", dropped);
  noDeadAsk(typed?.text ?? "");
  assert.doesNotMatch(typed?.text ?? "", /The contract shows/i);
  assert.match(typed?.text ?? "", /down payment or loan amount/i);
  assert.equal(typed?.capture?.field, "accept-proposal");

  const beforeUse: FoxMessage[] = [
    { id: "price-ask", role: "fox", text: "What’s the purchase price?" },
    { id: "contract-confirm", role: "fox", text: confirm.text, actions: confirm.actions },
  ];
  const pendingPaint = dropResolvedAddressConfirmChips(beforeUse, dropped);
  assert.equal(contractConfirmCount(pendingPaint), 1);
  assert.ok(
    (pendingPaint.find((item) => item.id === "contract-confirm")?.actions ?? []).some(
      (item) => item.label === "Use this",
    ),
  );
  const syncReplay = withoutDuplicateContractConfirm([
    ...pendingPaint,
    { id: "contract-confirm-2", role: "fox", text: confirm.text, actions: confirm.actions },
  ]);
  assert.equal(contractConfirmCount(syncReplay), 1);

  const held = dropResolvedAddressConfirmChips(beforeUse, used);
  assert.equal(contractConfirmCount(held), 1);
  assert.equal(held.find((item) => item.id === "contract-confirm")?.actions, undefined);
  assert.ok(held.every((item) => !/On the file/i.test(`${item.text}\n${item.followUp ?? ""}`)));
  const painted = freezeUsedFoxTurns([
    ...held,
    { id: "use-this", role: "client", text: "Use this" },
    { id: "funds-ask", role: "fox", text: afterUse.text },
  ]);
  const reprinted = dropResolvedAddressConfirmChips(
    [...painted, { id: "contract-confirm-2", role: "fox", text: confirm.text, actions: confirm.actions }],
    used,
  );
  assert.equal(contractConfirmCount(painted), 1);
  assert.equal(contractConfirmCount(reprinted), 1);
  assert.ok(painted.every((item) => !/On the file/i.test(`${item.text}\n${item.followUp ?? ""}`)));
  assert.doesNotMatch(painted[painted.length - 1]?.text ?? "", /Try again|The contract shows/i);
  assert.match(painted[painted.length - 1]?.text ?? "", /down payment or loan amount/i);

  console.log("assert-contract-at-price: 09 confirm once · Use this writes Clipper · funds next");
}

main();
