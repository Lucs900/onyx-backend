import { rateflowClientBodyFromDraft, type LiveQuoteOnFile } from "@/lib/rateflow/fromDraft";
import {
  parseSafeCouponRows,
  parseSafeQuoteResponse,
  rateflowScenarioKey,
} from "@/lib/rateflow/quote";
import type { FoxIntakeDraft } from "./types";

const searched = new Set<string>();
const inflight = new Map<string, Promise<LiveQuoteOnFile | null>>();

export function alreadySearchedRateflow(key: string) {
  return searched.has(key);
}

export async function requestRateflowIfNeeded(
  draft: FoxIntakeDraft,
): Promise<LiveQuoteOnFile | "unavailable" | null> {
  const body = rateflowClientBodyFromDraft(draft);
  if (!body) return null;
  const key = rateflowScenarioKey(body);
  if (draft.liveQuote?.key === key) {
    return {
      ...draft.liveQuote,
      ...(draft.liveQuoteRows?.length ? { rows: draft.liveQuoteRows } : {}),
    };
  }
  if (draft.liveQuoteKey === key && draft.liveQuoteStatus === "unavailable") {
    return "unavailable";
  }
  if (searched.has(key) && draft.liveQuote?.key !== key) {
    return "unavailable";
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async (): Promise<LiveQuoteOnFile | null> => {
    searched.add(key);
    try {
      const response = await fetch("/api/rateflow-quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!response.ok) return null;
      const payload = await response.json();
      const quote = parseSafeQuoteResponse(payload);
      if (!quote) return null;
      const rows = parseSafeCouponRows(payload);
      return { key, ...quote, ...(rows.length ? { rows } : {}) };
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, run);
  const result = await run;
  return result ?? "unavailable";
}
