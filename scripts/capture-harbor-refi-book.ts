/**
 * Capture Harbor refinance conventional-30 coupons (rate + points only).
 * Never prints or writes secrets.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RATEFLOW_TIMEOUT_MS,
  RATEFLOW_URL,
  asProductRows,
  conventional30Book,
  isRateflowFailure,
  pickLeadRow,
} from "../lib/rateflow/quote";

const HARBOR_REFI = {
  loan_purpose: "refinance",
  residency_type: "primary_home",
  list_price: 850000,
  loan_amount: 680000,
  credit_score: 760,
  property_type: "single_family_home",
  zipcode: "94105",
} as const;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = join(root, "scripts/fixtures/harbor-refi-conv30.json");

function present(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function integerEnv(name: string): number | null {
  const raw = process.env[name];
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = Number(raw.trim());
  return Number.isFinite(value) ? value : null;
}

function secretsReady() {
  return (
    present("BANKINGBRIDGE_API_KEY") &&
    present("BANKINGBRIDGE_RATEFLOW_ID") &&
    present("BANKINGBRIDGE_LOID") &&
    present("BANKINGBRIDGE_BRAND_ID")
  );
}

async function main() {
  if (!secretsReady()) {
    console.log("harbor-refi-book: skipped (secrets not present)");
    return;
  }
  const id = integerEnv("BANKINGBRIDGE_RATEFLOW_ID");
  const loid = integerEnv("BANKINGBRIDGE_LOID");
  const apiKey = process.env.BANKINGBRIDGE_API_KEY;
  if (id == null || loid == null || !apiKey) {
    console.log("harbor-refi-book: skipped (ids unreadable)");
    return;
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), RATEFLOW_TIMEOUT_MS);
  try {
    const response = await fetch(RATEFLOW_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        id,
        loid,
        list_price: HARBOR_REFI.list_price,
        loan_amount: HARBOR_REFI.loan_amount,
        credit_score: HARBOR_REFI.credit_score,
        loan_purpose: HARBOR_REFI.loan_purpose,
        residency_type: HARBOR_REFI.residency_type,
        loan_type: "conventional",
        loan_term: 30,
        property_type: HARBOR_REFI.property_type,
        state: "CA",
        zipcode: HARBOR_REFI.zipcode,
        location: { state: "CA", zipcode: HARBOR_REFI.zipcode },
      }),
      signal: ac.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      console.log(`harbor-refi-book: bbHttpStatus ${response.status}`);
      return;
    }
    const payload: unknown = await response.json();
    if (isRateflowFailure(payload)) {
      console.log("harbor-refi-book: rateflow failure");
      return;
    }
    const rows = asProductRows(payload);
    const book = conventional30Book(rows);
    const picked = pickLeadRow(rows, "refinance");
    const lead = picked
      ? { rate: Number(picked.rate), ...(picked.pts != null ? { pts: picked.pts } : {}) }
      : null;
    const fixture = {
      scenario: HARBOR_REFI,
      captured: true,
      rows: book,
      lead,
    };
    writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
    console.log(`HARBOR_REFI_CONV30_BOOK ${JSON.stringify(book)}`);
    console.log(`HARBOR_REFI_CONV30_LEAD ${JSON.stringify(lead)}`);
  } finally {
    clearTimeout(timer);
  }
}

void main();
