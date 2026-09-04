import { isOnFileAddressLine } from "./liveCoupon";
import { isLookupWaitMessage } from "./lookupWait";
import type { FoxMessage } from "./types";

const FUNDS_RECONFIRM =
  /What’s the down payment or loan amount|What’s the down payment\?|What’s the loan amount\?|Purchase is \$/;
const VALUE_ASK = /What’s the purchase price\?|What’s the property value\?/;

function lastFox(messages: FoxMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "fox") return messages[i];
  }
  return undefined;
}

/** Incoming is the same conversation, plus at most a rewrite / new ask / quote. */
function incomingContinuesStored(stored: FoxMessage[], incoming: FoxMessage[]) {
  if (!incoming.length) return false;
  const storedIds = new Set(stored.map((item) => item.id));
  const overlap = incoming.filter((item) => storedIds.has(item.id)).length;
  return overlap > 0 && overlap >= incoming.length - 2;
}

function isIntentionalIncomingThread(stored: FoxMessage[], incoming: FoxMessage[]) {
  if (!incomingContinuesStored(stored, incoming)) return false;
  const storedById = new Map(stored.map((item) => [item.id, item]));
  const storedIds = new Set(storedById.keys());
  if (
    incoming.some((item) => {
      const prev = storedById.get(item.id);
      return Boolean(prev && prev.text !== item.text);
    })
  ) {
    return true;
  }
  if (stored.some(isLookupWaitMessage) && !incoming.some(isLookupWaitMessage)) {
    return true;
  }
  if (incoming.some((item) => item.id.startsWith("live-quote:") && !storedIds.has(item.id))) {
    return true;
  }
  const fox = lastFox(incoming);
  if (
    fox &&
    (FUNDS_RECONFIRM.test(fox.text) ||
      VALUE_ASK.test(fox.text) ||
      fox.id.startsWith("live-quote:"))
  ) {
    return true;
  }
  return incoming.some((item) => !storedIds.has(item.id));
}

/**
 * Hydration can race a short in-memory seed against a longer stored file thread.
 * Keep stored only for that stale prefix — not for a price rewrite or wait-line settle.
 */
export function isScheduleEConfirmAskText(text?: string) {
  return /rents minus cash expenses \/ 12/i.test(text ?? "") && /Use this/i.test(text ?? "");
}

export function shouldKeepStoredFoxThread(
  stored: FoxMessage[],
  incoming: FoxMessage[],
  opts: {
    fileExists?: boolean;
    isIdExtractPath?: boolean;
    idExtractAsk?: boolean;
  } = {},
) {
  if (!opts.fileExists || opts.isIdExtractPath || opts.idExtractAsk) return false;
  if (incoming.some((item) => isScheduleEConfirmAskText(item.text))) return false;
  if (stored.length <= incoming.length) return false;
  return !isIntentionalIncomingThread(stored, incoming);
}

/** Drop a trailing On the file / wait so a price rewrite can reconfirm down/loan. */
export function withoutTrailingSealedFoxLines(messages: FoxMessage[]): FoxMessage[] {
  let end = messages.length;
  while (end > 0) {
    const item = messages[end - 1];
    if (
      item &&
      (isLookupWaitMessage(item) ||
        isOnFileAddressLine(item) ||
        item.text === "Pricing when the file is ready")
    ) {
      end -= 1;
      continue;
    }
    break;
  }
  return messages.slice(0, end);
}
