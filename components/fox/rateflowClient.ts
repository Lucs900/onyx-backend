import { rateflowClientBodyFromDraft, type LiveQuoteOnFile } from "@/lib/rateflow/fromDraft";
import {
  parseRateflowQuoteMiss,
  parseSafeCouponRows,
  parseSafeQuoteResponse,
  rateflowScenarioKey,
} from "@/lib/rateflow/quote";
import type { FoxIntakeDraft } from "./types";

/** Extra POSTs after a flaky miss. Ready line only when Rateflow returns an empty book. */
export const RATEFLOW_EMPTY_RETRIES = 5;

const searched = new Set<string>();
const confirmedEmpty = new Set<string>();
const inflight = new Map<string, Promise<LiveQuoteOnFile | "unavailable" | null>>();

export function alreadySearchedRateflow(key: string) {
  return searched.has(key) || confirmedEmpty.has(key);
}

export function resetRateflowClientForTests() {
  searched.clear();
  confirmedEmpty.clear();
  inflight.clear();
}

export function resetRateflowSearch(key?: string) {
  if (!key) {
    searched.clear();
    confirmedEmpty.clear();
    inflight.clear();
    return;
  }
  searched.delete(key);
  confirmedEmpty.delete(key);
  inflight.delete(key);
}

type RateflowFetch =
  | { ok: true; quote: LiveQuoteOnFile }
  | { ok: false; miss: "empty" | "retryable" };

async function fetchRateflowQuote(draft: FoxIntakeDraft): Promise<RateflowFetch> {
  const body = rateflowClientBodyFromDraft(draft);
  if (!body) return { ok: false, miss: "retryable" };
  const key = rateflowScenarioKey(body);
  try {
    const response = await fetch("/api/rateflow-quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, miss: "retryable" };
    const payload = await response.json();
    const quote = parseSafeQuoteResponse(payload);
    if (!quote) {
      return { ok: false, miss: parseRateflowQuoteMiss(payload) ?? "retryable" };
    }
    const rows = parseSafeCouponRows(payload);
    return { ok: true, quote: { key, ...quote, ...(rows.length ? { rows } : {}) } };
  } catch {
    return { ok: false, miss: "retryable" };
  }
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
  if (confirmedEmpty.has(key)) return "unavailable";
  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async (): Promise<LiveQuoteOnFile | "unavailable" | null> => {
    let last: RateflowFetch = await fetchRateflowQuote(draft);
    for (
      let attempt = 0;
      last.ok === false && last.miss === "retryable" && attempt < RATEFLOW_EMPTY_RETRIES;
      attempt += 1
    ) {
      last = await fetchRateflowQuote(draft);
    }
    if (last.ok) {
      searched.add(key);
      return last.quote;
    }
    if (last.miss === "empty") {
      confirmedEmpty.add(key);
      searched.add(key);
      return "unavailable";
    }
    return null;
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}
