import { NextResponse } from "next/server";
import {
  RATEFLOW_TIMEOUT_MS,
  RATEFLOW_URL,
  TARGET_PRICE,
  asProductRows,
  conventional30Book,
  eligibleNoPointsCount,
  firstResultSummary,
  isRateflowFailure,
  parseClientBody,
  pickConventional30LowestNoPoints,
  quoteRowSample,
  safeCouponRowsFromProducts,
  safeQuoteFromRow,
  type RateflowClientBody,
  type RateflowQuoteReport,
} from "@/lib/rateflow/quote";

export const runtime = "nodejs";
export const maxDuration = 20;
export const dynamic = "force-dynamic";

function envPresent(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function rateflowSecretsReady() {
  return (
    envPresent("BANKINGBRIDGE_API_KEY") &&
    envPresent("BANKINGBRIDGE_RATEFLOW_ID") &&
    envPresent("BANKINGBRIDGE_LOID") &&
    envPresent("BANKINGBRIDGE_BRAND_ID")
  );
}

function integerEnv(name: string): number | null {
  const raw = process.env[name];
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = Number(raw.trim());
  if (!Number.isFinite(value)) return null;
  return value;
}

function envReport(): RateflowQuoteReport["env"] {
  return {
    BANKINGBRIDGE_API_KEY: envPresent("BANKINGBRIDGE_API_KEY"),
    BANKINGBRIDGE_BRAND_ID: envPresent("BANKINGBRIDGE_BRAND_ID"),
    BANKINGBRIDGE_RATEFLOW_ID: envPresent("BANKINGBRIDGE_RATEFLOW_ID"),
    BANKINGBRIDGE_LOID: envPresent("BANKINGBRIDGE_LOID"),
  };
}

function sentFromClient(client: RateflowClientBody): RateflowQuoteReport["sent"] {
  return {
    property_type: client.property_type,
    loan_purpose: client.loan_purpose,
    residency_type: client.residency_type,
    loan_type: "conventional",
    state: "CA",
    zip: client.zipcode,
  };
}

function buildReport(partial: {
  client?: RateflowClientBody | null;
  bbHttpStatus?: number | null;
  resultCount?: number;
  first?: RateflowQuoteReport["first"];
  pickedRate?: number;
  eligibleNoPoints?: number;
  sample?: RateflowQuoteReport["sample"];
  book?: RateflowQuoteReport["book"];
}): RateflowQuoteReport {
  return {
    env: envReport(),
    bbHttpStatus: partial.bbHttpStatus ?? null,
    resultCount: partial.resultCount ?? 0,
    sent: partial.client
      ? sentFromClient(partial.client)
      : {
          property_type: "",
          loan_purpose: "",
          residency_type: "",
          loan_type: "conventional",
          state: "CA",
          zip: "",
        },
    ...(partial.first ? { first: partial.first } : {}),
    ...(partial.pickedRate != null ? { pickedRate: partial.pickedRate } : {}),
    ...(partial.eligibleNoPoints != null ? { eligibleNoPoints: partial.eligibleNoPoints } : {}),
    ...(partial.sample?.length ? { sample: partial.sample } : {}),
    ...(partial.book?.length ? { book: partial.book } : {}),
  };
}

function logReport(report: RateflowQuoteReport) {
  console.info("[rateflow-quote]", JSON.stringify(report));
}

function unavailable(report?: RateflowQuoteReport) {
  const safe = report ?? buildReport({});
  logReport(safe);
  return NextResponse.json({ ok: false, report: safe }, { status: 200 });
}

function bankingBridgeBody(client: RateflowClientBody) {
  const id = integerEnv("BANKINGBRIDGE_RATEFLOW_ID");
  const loid = integerEnv("BANKINGBRIDGE_LOID");
  if (id == null || loid == null) return null;
  if (!client.property_type || !client.zipcode) return null;
  return {
    id,
    loid,
    list_price: client.list_price,
    loan_amount: client.loan_amount,
    credit_score: client.credit_score,
    loan_purpose: client.loan_purpose,
    residency_type: client.residency_type,
    loan_type: "conventional",
    loan_term: 30,
    property_type: client.property_type,
    // Purchase keeps par as a hint. Refinance omits it so the coupon stack
    // is not filtered down to the featured closest-to-par row.
    ...(client.loan_purpose === "purchase" ? { target_price: TARGET_PRICE } : {}),
    state: "CA",
    zipcode: client.zipcode,
    location: {
      state: "CA",
      zipcode: client.zipcode,
      ...(client.city ? { city: client.city } : {}),
    },
  };
}

export async function POST(request: Request) {
  if (!rateflowSecretsReady()) return unavailable();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return unavailable();
  }
  const client = parseClientBody(raw);
  if (!client) return unavailable();
  const body = bankingBridgeBody(client);
  const apiKey = process.env.BANKINGBRIDGE_API_KEY;
  if (!body || !apiKey) return unavailable(buildReport({ client }));

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), RATEFLOW_TIMEOUT_MS);
  try {
    const response = await fetch(RATEFLOW_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      return unavailable(buildReport({ client, bbHttpStatus: response.status }));
    }
    const payload: unknown = await response.json();
    if (isRateflowFailure(payload)) {
      return unavailable(buildReport({ client, bbHttpStatus: response.status, resultCount: 0 }));
    }
    const rows = asProductRows(payload);
    const row = pickConventional30LowestNoPoints(rows);
    const quote = row ? safeQuoteFromRow(row) : null;
    const pickedRate = Number(row?.rate);
    const report = buildReport({
      client,
      bbHttpStatus: response.status,
      resultCount: rows.length,
      first: firstResultSummary(rows),
      ...(Number.isFinite(pickedRate) ? { pickedRate } : {}),
      eligibleNoPoints: eligibleNoPointsCount(rows),
      sample: quoteRowSample(rows),
      book: conventional30Book(rows),
    });
    if (!quote) return unavailable(report);
    logReport(report);
    return NextResponse.json({
      ok: true,
      quote,
      rows: safeCouponRowsFromProducts(rows),
      report,
    });
  } catch {
    return unavailable(buildReport({ client }));
  } finally {
    clearTimeout(timer);
  }
}
