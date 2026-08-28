import { NextResponse } from "next/server";
import {
  RATEFLOW_TIMEOUT_MS,
  RATEFLOW_URL,
  TARGET_PRICE,
  asProductRows,
  isRateflowFailure,
  parseClientBody,
  pickConventional30NearPar,
  safeQuoteFromRow,
  type RateflowClientBody,
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

function unavailable() {
  return NextResponse.json({ ok: false }, { status: 200 });
}

function bankingBridgeBody(client: RateflowClientBody) {
  const id = integerEnv("BANKINGBRIDGE_RATEFLOW_ID");
  const loid = integerEnv("BANKINGBRIDGE_LOID");
  if (id == null || loid == null) return null;
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
    target_price: TARGET_PRICE,
    location: {
      state: "CA",
      ...(client.zipcode ? { zipcode: client.zipcode } : {}),
    },
    ...(client.zipcode ? { zipcode: client.zipcode } : {}),
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
  if (!body || !apiKey) return unavailable();

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
    if (!response.ok) return unavailable();
    const payload: unknown = await response.json();
    if (isRateflowFailure(payload)) return unavailable();
    const row = pickConventional30NearPar(asProductRows(payload));
    if (!row) return unavailable();
    const quote = safeQuoteFromRow(row);
    if (!quote) return unavailable();
    return NextResponse.json({ ok: true, quote });
  } catch {
    return unavailable();
  } finally {
    clearTimeout(timer);
  }
}
