import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyDraft } from "../components/fox/store";
import type { FoxIntakeDraft } from "../components/fox/types";
import {
  rateflowBlockedReason,
  rateflowClientBodyFromDraft,
} from "../lib/rateflow/fromDraft";
import {
  RATEFLOW_URL,
  asProductRows,
  creditScoreFloor,
  formatAsOfPacific,
  isRateflowFailure,
  liveRateLine,
  liveRateSecondLine,
  mapPropertyType,
  mapResidency,
  parseClientBody,
  parseSafeQuoteResponse,
  pickConventional30NearPar,
  rateflowScenarioKey,
  safeQuoteFromRow,
  zipFromTypedAddress,
} from "../lib/rateflow/quote";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

assert.equal(RATEFLOW_URL, "https://api.bankingbridge.com/rateflow");
assert.equal(creditScoreFloor("760-779"), 760);
assert.equal(creditScoreFloor("760+"), 760);
assert.equal(creditScoreFloor("740-759"), 740);
assert.equal(creditScoreFloor("720–739"), 720);
assert.equal(creditScoreFloor("680-699"), 680);
assert.equal(creditScoreFloor("742"), 742);
assert.equal(creditScoreFloor("not-sure"), undefined);
assert.equal(mapResidency("primary"), "primary_home");
assert.equal(mapResidency("second-home"), "second_home");
assert.equal(mapResidency("investment"), "rental_home");
assert.equal(mapPropertyType("sfr"), "single_family_home");
assert.equal(mapPropertyType("condo"), "condo");
assert.equal(mapPropertyType("two_to_four"), "home_2_units");
assert.equal(mapPropertyType("two_to_four", "3"), "home_3_units");
assert.equal(mapPropertyType("two_to_four", "4 units"), "home_4_units");
assert.equal(zipFromTypedAddress("1840 Valencia St, San Francisco, CA 94110"), "94110");
assert.equal(zipFromTypedAddress("no zip here"), undefined);

const body = parseClientBody({
  loan_purpose: "purchase",
  residency_type: "primary_home",
  list_price: 1_200_000,
  loan_amount: 960_000,
  credit_score: 760,
  property_type: "single_family_home",
  zipcode: "94110",
});
assert.ok(body);
assert.equal(rateflowScenarioKey(body!), "purchase|primary_home|single_family_home|1200000|960000|760|94110");
assert.equal(
  parseClientBody({
    ...body,
    property_type: "castle",
  }),
  null,
);

const picked = pickConventional30NearPar([
  {
    rate: 6.25,
    price: 99.2,
    pts: 0.8,
    principalAndInterest: 5910,
    loanTerm: 30,
    amortizationType: "Fixed",
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
  {
    rate: 6.125,
    price: 100.05,
    pts: -0.05,
    principalAndInterest: 5830,
    loanTerm: 30,
    amortizationType: "Fixed",
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
  {
    rate: 6.0,
    price: 100,
    pts: 0,
    principalAndInterest: 2100,
    loanTerm: 15,
    amortizationType: "Fixed",
    bbLoanType: "conventional",
    productName: "FNMA Conforming 15 Yr Fixed",
  },
  {
    rate: 5.99,
    price: 100,
    loanTerm: 30,
    bbLoanType: "fha",
    productName: "FHA 30 Yr Fixed",
  },
]);
assert.equal(picked?.rate, 6.125);
assert.equal(pickConventional30NearPar([]), null);
assert.ok(isRateflowFailure({ status: "error", message: "no products" }));
assert.equal(asProductRows({ status: "error" }).length, 0);

const quote = safeQuoteFromRow(picked!, new Date("2026-08-28T19:04:00.000Z"));
assert.ok(quote);
assert.equal(quote?.rate, 6.125);
assert.match(liveRateLine(quote!), /6\.125% · Live as of .+ PT · not a lock/);
assert.doesNotMatch(liveRateLine(quote!), /approved|locked|committed|6\.750/i);
assert.equal(liveRateSecondLine(quote!), "P&I $5,830 · -0.05 pts");
assert.match(formatAsOfPacific(quote!.asOf), /PT$/);
assert.equal(parseSafeQuoteResponse({ ok: true, quote }), quote);
assert.equal(parseSafeQuoteResponse({ ok: false }), null);
assert.equal(parseSafeQuoteResponse({ rate: 6.75, apiKey: "nope" }), null);

function file(partial: Partial<FoxIntakeDraft>): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    amountAsked: true,
    valueAsked: true,
    propertyType: "sfr",
    creditAsked: true,
    creditBand: "760+",
    ...partial,
  };
}

assert.deepEqual(rateflowClientBodyFromDraft(file({})), {
  loan_purpose: "purchase",
  residency_type: "primary_home",
  list_price: 1_200_000,
  loan_amount: 960_000,
  credit_score: 760,
  property_type: "single_family_home",
});
assert.equal(rateflowClientBodyFromDraft(file({ productIntent: "heloc" })), null);
assert.equal(rateflowBlockedReason(file({ productIntent: "heloc" })), "product");
assert.equal(rateflowClientBodyFromDraft(file({ productIntent: "jumbo" })), null);
assert.equal(rateflowClientBodyFromDraft(file({ loanAmountValue: 1_500_000 })), null);
assert.equal(rateflowBlockedReason(file({ loanAmountValue: 1_500_000 })), "jumbo");
assert.equal(rateflowClientBodyFromDraft(file({ govProgram: "fha" })), null);
assert.equal(rateflowClientBodyFromDraft(file({ cashOut: true })), null);
assert.equal(rateflowClientBodyFromDraft(file({ propertyType: undefined })), null);
assert.equal(rateflowClientBodyFromDraft(file({ creditBand: "not-sure" })), null);
assert.equal(
  rateflowClientBodyFromDraft(file({ occupancyChoice: { ...emptyDraft().occupancyChoice, value: "investment" } }))
    ?.residency_type,
  "rental_home",
);
assert.equal(
  rateflowClientBodyFromDraft(
    file({
      productIntent: "refinance",
      subjectAddress: "500 Pine St, San Francisco CA 94108",
    }),
  )?.zipcode,
  "94108",
);
assert.equal(
  rateflowClientBodyFromDraft(file({ propertyType: "two_to_four", propertyUnits: "3" }))?.property_type,
  "home_3_units",
);

const route = readFileSync(join(root, "app/api/rateflow-quote/route.ts"), "utf8");
assert.ok(route.includes('headers: {\n        "content-type": "application/json",\n        "x-api-key": apiKey,'));
assert.ok(route.includes("https://api.bankingbridge.com/rateflow") || route.includes("RATEFLOW_URL"));
assert.ok(!route.includes("heloc-quote"));
assert.ok(!route.includes("bb_request"));
assert.ok(!route.includes("rateflow-dev.bbridge.io"));
assert.ok(!route.includes("x-brand"));
assert.ok(!route.includes("brand_id"));
assert.doesNotMatch(route, /BANKINGBRIDGE_[A-Z_]+\s*=\s*['"][^'"]+['"]/);
assert.ok(route.includes("BANKINGBRIDGE_BRAND_ID"));
assert.ok(!route.includes("process.env.BANKINGBRIDGE_BRAND_ID") || route.includes("envPresent(\"BANKINGBRIDGE_BRAND_ID\")"));

const fox = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
assert.ok(fox.includes("/api/rateflow-quote"));
assert.ok(!fox.includes("/api/heloc-quote"));
assert.ok(!fox.includes("BANKINGBRIDGE_"));

const heloc = readFileSync(join(root, "app/api/heloc-quote/route.ts"), "utf8");
assert.ok(heloc.includes("calculateHelocQuoteTool"));
assert.ok(!heloc.includes("rateflow"));

console.log("assert-rateflow: ok");
