import { NextResponse } from "next/server";
import {
  RATEFLOW_TIMEOUT_MS,
  RATEFLOW_URL,
  asProductRows,
  conventional30Book,
  eligibleNoPointsCount,
  firstResultSummary,
  isRateflowFailure,
  parseClientBody,
  pickLeadRow,
  purchaseLeadRow,
  quoteRowSample,
  safeCouponRowsFromProducts,
  safeHelocCouponRowsFromProducts,
  safeQuoteFromRow,
  vendorReasonFromPayload,
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
    loan_type: client.heloc ? "heloc" : "conventional",
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

function retryable(report?: RateflowQuoteReport, reason?: string) {
  const safe = report ?? buildReport({});
  logReport(safe);
  return NextResponse.json(
    { ok: false, retryable: true, ...(reason ? { reason } : {}), report: safe },
    { status: 200 },
  );
}

function empty(report?: RateflowQuoteReport, reason?: string) {
  const safe = report ?? buildReport({});
  logReport(safe);
  return NextResponse.json(
    { ok: false, empty: true, ...(reason ? { reason } : {}), report: safe },
    { status: 200 },
  );
}

function rejected(report?: RateflowQuoteReport, reason?: string) {
  const safe = report ?? buildReport({});
  logReport(safe);
  return NextResponse.json(
    { ok: false, ...(reason ? { reason } : { retryable: true }), report: safe },
    { status: 200 },
  );
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
    loan_type: client.heloc ? "heloc" : "conventional",
    ...(client.heloc ? {} : { loan_term: 30 }),
    ...(client.heloc && client.first_lien != null && client.first_lien > 0
      ? { first_lien: client.first_lien }
      : {}),
    ...(!client.heloc && client.cash_out != null && client.cash_out > 0
      ? { cash_out: client.cash_out }
      : {}),
    property_type: client.property_type,
    // Do not send a par hint. That featured first coupon is not the
    // purchase lead (conventional 30, points <= 0, then lowest rate).
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
  if (!rateflowSecretsReady()) return retryable();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return retryable();
  }
  const client = parseClientBody(raw);
  if (!client) return retryable();
  const body = bankingBridgeBody(client);
  const apiKey = process.env.BANKINGBRIDGE_API_KEY;
  if (!body || !apiKey) return retryable(buildReport({ client }));

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
      let reason: string | undefined;
      try {
        reason = vendorReasonFromPayload(await response.json());
      } catch {
        reason = undefined;
      }
      return reason
        ? rejected(buildReport({ client, bbHttpStatus: response.status }), reason)
        : retryable(buildReport({ client, bbHttpStatus: response.status }));
    }
    const payload: unknown = await response.json();
    const reason = vendorReasonFromPayload(payload);
    if (isRateflowFailure(payload)) {
      return reason
        ? rejected(buildReport({ client, bbHttpStatus: response.status, resultCount: 0 }), reason)
        : retryable(buildReport({ client, bbHttpStatus: response.status, resultCount: 0 }));
    }
    const rows = asProductRows(payload);
    const row = client.heloc
      ? pickLeadRow(rows, client.loan_purpose, false, true)
      : client.loan_purpose === "purchase"
        ? purchaseLeadRow(rows)
        : pickLeadRow(rows, client.loan_purpose, Boolean(client.cash_out));
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
    if (!quote) {
      if (client.heloc) {
        return empty(report, reason || "HELOC programs are not on this Rateflow book.");
      }
      if (reason) return rejected(report, reason);
      return rows.length ? retryable(report) : empty(report);
    }
    logReport(report);
    const couponRows = client.heloc
      ? safeHelocCouponRowsFromProducts(rows)
      : safeCouponRowsFromProducts(rows);
    return NextResponse.json({
      ok: true,
      quote,
      rows: couponRows,
      report,
    });
  } catch {
    return retryable(buildReport({ client }));
  } finally {
    clearTimeout(timer);
  }
}
