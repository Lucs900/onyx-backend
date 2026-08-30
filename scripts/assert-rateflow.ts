import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyDraft } from "../components/fox/store";
import type { FoxIntakeDraft } from "../components/fox/types";
import {
  RATEFLOW_EMPTY_RETRIES,
  requestRateflowIfNeeded,
  resetRateflowClientForTests,
} from "../components/fox/rateflowClient";
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
  normalizeProductRow,
  liveRateLine,
  liveRateSecondLine,
  mapPropertyType,
  mapResidency,
  cityFromTypedAddress,
  parseClientBody,
  parseSafeQuoteResponse,
  parseZipcode,
  pickConventional30LowestNoPoints,
  pickConventional30NoCost,
  pickLeadRow,
  pickLowerPaymentFromRows,
  pickNoCostFromRows,
  conventional30Book,
  lowestNoPointsFromBook,
  liveQuoteFromCouponRow,
  parseSafeCouponRows,
  safeCouponRowsFromProducts,
  sameCouponNumbers,
  rateflowScenarioKey,
  safeQuoteFromRow,
  termYearsFromRow,
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
assert.equal(parseZipcode("94115"), "94115");
assert.equal(parseZipcode("94115-1234"), "94115");
assert.equal(parseZipcode("not a zip"), undefined);
assert.equal(cityFromTypedAddress("1840 Divisadero St, San Francisco, CA 94115"), "San Francisco");
assert.equal(termYearsFromRow({ loanTerm: 360, productName: "FNMA 30 Yr Fixed" }), 30);
assert.equal(termYearsFromRow({ loanTerm: 30 }), 30);
assert.equal(termYearsFromRow({ loanTerm: 15 }), 15);
assert.equal(
  parseClientBody({
    loan_purpose: "purchase",
    residency_type: "primary_home",
    list_price: 850000,
    loan_amount: 680000,
    credit_score: 760,
    property_type: "single_family_home",
  }),
  null,
);

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

const jimmySheet = [
  {
    rate: 6.49,
    price: 100.01,
    pts: -0.01,
    principalAndInterest: 4298,
    loanTerm: 30,
    amortizationType: "Fixed",
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
  {
    rate: 6.375,
    price: 100.375,
    pts: -0.375,
    principalAndInterest: 4242,
    loanTerm: 30,
    amortizationType: "Fixed",
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
  {
    rate: 6.25,
    price: 100.75,
    pts: -0.75,
    principalAndInterest: 4187,
    loanTerm: 30,
    amortizationType: "Fixed",
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
  {
    rate: 6.125,
    price: 99.5,
    pts: 0.5,
    principalAndInterest: 4133,
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
];
const picked = pickConventional30LowestNoPoints(jimmySheet);
assert.equal(picked?.rate, 6.25);
assert.notEqual(picked?.rate, 6.49);
assert.ok((picked?.pts ?? 1) <= 0);
assert.equal(
  pickConventional30LowestNoPoints([
    {
      rate: 6.75,
      price: 102,
      pts: -2,
      loanTerm: 30,
      amortizationType: "Fixed",
      bbLoanType: "conventional",
      productName: "FNMA Conforming 30 Yr Fixed",
    },
    {
      rate: 6.49,
      price: 100,
      pts: 0,
      loanTerm: 30,
      amortizationType: "Fixed",
      bbLoanType: "conventional",
      productName: "FNMA Conforming 30 Yr Fixed",
    },
    {
      rate: 6.375,
      price: 100.25,
      pts: -0.25,
      loanTerm: 30,
      amortizationType: "Fixed",
      bbLoanType: "conventional",
      productName: "FNMA Conforming 30 Yr Fixed",
    },
  ])?.rate,
  6.375,
);
assert.equal(
  pickConventional30LowestNoPoints([
    {
      rate: 6.125,
      price: 99.2,
      pts: 0.8,
      loanTerm: 30,
      amortizationType: "Fixed",
      bbLoanType: "conventional",
      productName: "FNMA Conforming 30 Yr Fixed",
    },
    {
      rate: 5.875,
      price: 99.8,
      loanTerm: 360,
      amortizationType: "Fixed",
      bbLoanType: "conventional",
      productName: "FNMA Conforming 30 Yr Fixed",
    },
  ]),
  null,
);
assert.equal(
  pickConventional30LowestNoPoints([
    {
      rate: 5.5,
      price: 100,
      pts: 0,
      loanTerm: 15,
      amortizationType: "Fixed",
      bbLoanType: "conventional",
      productName: "FNMA Conforming 15 Yr Fixed",
    },
  ]),
  null,
);
const fifteenQuote = safeQuoteFromRow(
  {
    rate: 5.5,
    price: 100,
    pts: 0,
    loanTerm: 15,
    amortizationType: "Fixed",
    bbLoanType: "conventional",
    productName: "FNMA Conforming 15 Yr Fixed",
  },
  new Date("2026-08-28T19:04:00.000Z"),
);
assert.equal(fifteenQuote?.term, 15);
assert.match(
  liveRateLine(fifteenQuote!),
  /5\.500% · 15-year · Live as of .+ PT · not a lock/,
);
assert.equal(pickConventional30LowestNoPoints([]), null);
const jimmyRows = safeCouponRowsFromProducts(jimmySheet);
assert.equal(pickConventional30LowestNoPoints(jimmySheet)?.rate, 6.25);
assert.equal(pickLowerPaymentFromRows(jimmyRows)?.rate, 6.125);
assert.ok((pickLowerPaymentFromRows(jimmyRows)?.pts ?? 2) <= 1);
assert.notEqual(pickLowerPaymentFromRows(jimmyRows)?.rate, 6.49);
assert.equal(pickNoCostFromRows(jimmyRows)?.rate, 6.25);
assert.ok((pickNoCostFromRows(jimmyRows)?.pts ?? 0) < 0);
assert.equal(
  pickLowerPaymentFromRows([
    { rate: 6.0, pts: 1.25, principalAndInterest: 4000 },
    { rate: 6.125, pts: 1.01, principalAndInterest: 4050 },
  ])?.rate,
  6.125,
);
assert.equal(
  pickLowerPaymentFromRows([{ rate: 6.0, pts: 1.25, principalAndInterest: 4000 }]),
  null,
);
assert.equal(
  pickLowerPaymentFromRows([
    { rate: 6.25, pts: 1.044, principalAndInterest: 4187 },
    { rate: 6.375, pts: 0.413, principalAndInterest: 4242 },
  ])?.rate,
  6.25,
);
assert.equal(
  pickNoCostFromRows([
    { rate: 6.49, pts: 0 },
    { rate: 6.375, pts: 0.25 },
  ]),
  null,
);
assert.equal(
  pickNoCostFromRows([
    { rate: 6.75, pts: -1.25 },
    { rate: 6.625, pts: -1.0 },
    { rate: 6.49, pts: -0.25 },
  ])?.rate,
  6.625,
);
assert.equal(
  pickNoCostFromRows([
    { rate: 6.49, pts: -0.1 },
    { rate: 6.375, pts: -0.4 },
  ])?.pts,
  -0.4,
);
assert.equal(sameCouponNumbers({ rate: 6.25, pts: -0.75 }, { rate: 6.25, pts: -0.75 }), true);
const reused = liveQuoteFromCouponRow(pickLowerPaymentFromRows(jimmyRows)!, "k", "2026-08-28T21:10:00.000Z");
assert.equal(reused.asOf, "2026-08-28T21:10:00.000Z");
assert.equal(reused.rate, 6.125);
assert.deepEqual(
  parseSafeCouponRows({
    ok: true,
    rows: [{ rate: 6.25, pts: -0.75, principalAndInterest: 4187 }],
  }),
  [{ rate: 6.25, pts: -0.75, principalAndInterest: 4187 }],
);
assert.ok(isRateflowFailure({ status: "error", message: "no products" }));
assert.equal(asProductRows({ status: "error" }).length, 0);
assert.equal(isRateflowFailure({ status: "ok", results: [{ rate: 6.375, pts: -0.07, term: 30 }] }), false);
const harborRefiPayload = {
  results: [
    {
      rate: 6.49,
      pts: -0.043,
      term: 30,
      pi_monthly: 4294,
      label: "FHLMC 30 Yr Fixed",
      loanType: "Fixed",
    },
    {
      rate: 6.375,
      pts: -0.07,
      term: 30,
      pi_monthly: 4242,
      label: "FHLMC 30 Yr Fixed",
      loanType: "Fixed",
    },
    {
      rate: 6.25,
      pts: 0.5,
      term: 30,
      pi_monthly: 4187,
      label: "FHLMC 30 Yr Fixed",
      loanType: "Fixed",
    },
  ],
};
const harborRefiRows = asProductRows(harborRefiPayload);
assert.equal(harborRefiRows.length, 3);
assert.equal(termYearsFromRow(harborRefiRows[1]!), 30);
assert.equal(harborRefiRows[1]?.principalAndInterest, 4242);
assert.equal(pickConventional30LowestNoPoints(harborRefiRows)?.rate, 6.375);
assert.notEqual(pickConventional30LowestNoPoints(harborRefiRows)?.rate, 6.49);
assert.ok((pickConventional30LowestNoPoints(harborRefiRows)?.pts ?? 1) <= 0);
assert.equal(pickLeadRow(harborRefiRows, "purchase")?.rate, 6.375);
const harborRefiNested = {
  results: [
    {
      term: 30,
      label: "30 Year Fixed",
      loanType: "Fixed",
      rate: 6.49,
      pts: -0.043,
      pi_monthly: 4294,
      rates: [
        { rate: 6.49, pts: -0.043, pi_monthly: 4294, term: 30 },
        { rate: 6.375, pts: -0.07, pi_monthly: 4242, term: 30 },
        { rate: 6.25, pts: 0.555, pi_monthly: 4187, term: 30 },
      ],
    },
  ],
};
assert.equal(pickConventional30LowestNoPoints(asProductRows(harborRefiNested))?.rate, 6.375);
assert.notEqual(pickConventional30LowestNoPoints(asProductRows(harborRefiNested))?.rate, 6.49);
assert.ok(
  asProductRows({
    results: [{ interestRate: 6.375, points: -0.07, term: 30, monthly_payment: 4242 }],
  })[0]?.rate === 6.375,
);
const harborRefiBook = conventional30Book(harborRefiRows);
assert.deepEqual(
  harborRefiBook.map((row) => [row.rate, row.pts]),
  [
    [6.25, 0.5],
    [6.375, -0.07],
    [6.49, -0.043],
  ],
);
assert.equal(lowestNoPointsFromBook(harborRefiBook)?.rate, 6.375);
const harborLiveFixture = JSON.parse(
  readFileSync(join(root, "scripts/fixtures/harbor-refi-conv30.json"), "utf8"),
) as {
  captured?: boolean;
  rows?: { rate: number; pts?: number }[];
  lead?: { rate: number; pts?: number } | null;
};
const harborWalkRows = [
  {
    rate: 6.25,
    pts: 1.044,
    loanTerm: 30,
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
  {
    rate: 6.49,
    pts: -0.043,
    loanTerm: 30,
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
  {
    rate: 6.75,
    pts: -1.067,
    loanTerm: 30,
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
  {
    rate: 6.375,
    pts: 0.413,
    loanTerm: 30,
    bbLoanType: "conventional",
    productName: "FNMA Conforming 30 Yr Fixed",
  },
];
assert.equal(pickLeadRow(harborWalkRows, "refinance")?.rate, 6.75);
assert.equal(pickLeadRow(harborWalkRows, "refinance")?.pts, -1.067);
assert.notEqual(pickLeadRow(harborWalkRows, "refinance")?.rate, 6.49);
assert.equal(pickConventional30NoCost(harborWalkRows)?.rate, 6.75);
assert.equal(pickLowerPaymentFromRows(safeCouponRowsFromProducts(harborWalkRows))?.rate, 6.25);
assert.equal(pickLowerPaymentFromRows(safeCouponRowsFromProducts(harborWalkRows))?.pts, 1.044);
assert.equal(pickNoCostFromRows(safeCouponRowsFromProducts(harborWalkRows))?.rate, 6.75);
assert.equal(pickLeadRow(harborRefiRows, "purchase")?.rate, pickConventional30LowestNoPoints(harborRefiRows)?.rate);
assert.equal(
  pickConventional30NoCost([
    { rate: 6.49, pts: -0.043, loanTerm: 30, bbLoanType: "conventional" },
    { rate: 6.375, pts: -0.07, loanTerm: 30, bbLoanType: "conventional" },
  ])?.rate,
  6.375,
);
assert.equal(
  pickConventional30NoCost([
    { rate: 6.49, pts: 0.1, loanTerm: 30, bbLoanType: "conventional" },
    { rate: 6.25, pts: 1.044, loanTerm: 30, bbLoanType: "conventional" },
  ]),
  null,
);
if (harborLiveFixture.captured) {
  const liveBook = harborLiveFixture.rows ?? [];
  assert.ok(liveBook.length > 0);
  const liveProducts = liveBook.map((row) => ({
    rate: row.rate,
    pts: row.pts,
    loanTerm: 30,
    bbLoanType: "conventional",
  }));
  const liveLead = pickLeadRow(liveProducts, "refinance");
  assert.deepEqual(
    liveLead ? { rate: liveLead.rate, ...(liveLead.pts != null ? { pts: liveLead.pts } : {}) } : null,
    harborLiveFixture.lead ?? (liveLead ? { rate: liveLead.rate, pts: liveLead.pts } : null),
  );
  assert.equal(liveLead?.rate, pickConventional30NoCost(liveProducts)?.rate);
  assert.notEqual(liveLead?.rate, 6.49);
  console.log("harbor-refi-conv30 live book", JSON.stringify(liveBook));
  console.log("harbor-refi-conv30 live lead", JSON.stringify(liveLead));
}
assert.equal(
  pickConventional30LowestNoPoints(
    asProductRows([
      normalizeProductRow({
        rate: 6.49,
        pts: -0.043,
        term: 30,
        label: "FNMA Conforming 30 Yr Fixed",
        loanType: "Fixed",
      }),
      normalizeProductRow({
        rate: 6.375,
        pts: -0.07,
        term: 30,
        label: "FNMA Conforming 30 Yr Fixed",
        loanType: "Fixed",
      }),
    ]),
  )?.rate,
  6.375,
);

const quote = safeQuoteFromRow(picked!, new Date("2026-08-28T19:04:00.000Z"));
assert.ok(quote);
assert.equal(quote?.asOf, "2026-08-28T19:04:00.000Z");
assert.equal(
  safeQuoteFromRow(
    { ...picked!, lastUpdate: 1_700_000_000 },
    new Date("2026-08-28T22:15:00.000Z"),
  )?.asOf,
  "2026-08-28T22:15:00.000Z",
);
assert.equal(quote?.rate, 6.25);
assert.match(liveRateLine(quote!), /6\.250% · Live as of .+ PT · not a lock/);
assert.doesNotMatch(liveRateLine(quote!), /approved|locked|committed|6\.750|6\.490/i);
assert.equal(liveRateSecondLine(quote!), "P&I $4,187 · -0.75 pts");
assert.doesNotMatch(liveRateSecondLine(quote!) ?? "", /reward/i);
assert.match(formatAsOfPacific(quote!.asOf), /PT$/);
assert.deepEqual(parseSafeQuoteResponse({ ok: true, quote }), quote);
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
    propertyZip: "94115",
    propertyZipAsked: true,
    ...partial,
  };
}

assert.equal(rateflowClientBodyFromDraft(file({ propertyZip: undefined, propertyZipAsked: undefined })), null);
assert.equal(rateflowBlockedReason(file({ propertyZip: undefined, propertyZipAsked: undefined })), "address");
assert.equal(
  rateflowClientBodyFromDraft(
    file({
      propertyZip: undefined,
      propertyZipAsked: undefined,
      scenario: {
        zip: "94105",
        purpose: "purchase",
        propertyValue: 850000,
        amountMode: "loan",
        creditRange: "760+",
        occupancy: "primary",
      },
    }),
  ),
  null,
);
assert.equal(
  rateflowBlockedReason(
    file({
      propertyZip: undefined,
      propertyZipAsked: undefined,
      scenario: {
        zip: "94105",
        purpose: "purchase",
        propertyValue: 850000,
        amountMode: "loan",
        creditRange: "760+",
        occupancy: "primary",
      },
    }),
  ),
  "address",
);
assert.deepEqual(rateflowClientBodyFromDraft(file({})), {
  loan_purpose: "purchase",
  residency_type: "primary_home",
  list_price: 1_200_000,
  loan_amount: 960_000,
  credit_score: 760,
  property_type: "single_family_home",
  zipcode: "94115",
});
assert.equal(rateflowClientBodyFromDraft(file({ productIntent: "heloc" })), null);
assert.equal(rateflowBlockedReason(file({ productIntent: "heloc" })), "product");
assert.equal(rateflowClientBodyFromDraft(file({ productIntent: "jumbo" })), null);
assert.equal(rateflowClientBodyFromDraft(file({ loanAmountValue: 1_500_000 })), null);
assert.equal(rateflowBlockedReason(file({ loanAmountValue: 1_500_000 })), "jumbo");
assert.equal(rateflowClientBodyFromDraft(file({ govProgram: "fha" })), null);
assert.equal(rateflowClientBodyFromDraft(file({ govProgram: "va" })), null);
assert.equal(rateflowClientBodyFromDraft(file({ govProgram: "usda" })), null);
assert.equal(rateflowClientBodyFromDraft(file({ cashOut: true })), null);
assert.deepEqual(rateflowClientBodyFromDraft(file({ productIntent: "refinance" })), {
  loan_purpose: "refinance",
  residency_type: "primary_home",
  list_price: 1_200_000,
  loan_amount: 960_000,
  credit_score: 760,
  property_type: "single_family_home",
  zipcode: "94115",
});
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
      propertyZip: undefined,
      propertyZipAsked: undefined,
      subjectAddress: "500 Pine St, San Francisco CA 94108",
    }),
  )?.zipcode,
  "94108",
);
assert.equal(
  rateflowClientBodyFromDraft(file({ propertyType: "two_to_four", propertyUnits: "3" }))?.property_type,
  "home_3_units",
);
const addressConfirmDraft = file({
  pendingProposal: {
    field: "property_address",
    value: "500 Market St, San Francisco, CA 94105",
    label: "address",
    kind: "computed",
  },
});
assert.equal(rateflowClientBodyFromDraft(addressConfirmDraft), null);
assert.equal(rateflowBlockedReason(addressConfirmDraft), "address-confirm");
assert.deepEqual(
  rateflowClientBodyFromDraft({ ...addressConfirmDraft, pendingProposal: null }),
  rateflowClientBodyFromDraft(file({})),
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
assert.ok(route.includes("zipcode: client.zipcode"));
assert.ok(route.includes('state: "CA"'));
assert.ok(route.includes("[rateflow-quote]"));
assert.ok(route.includes("pickLeadRow"));
assert.ok(!route.includes("6.750"));
assert.ok(!route.includes("6.75"));
assert.ok(route.includes("safeCouponRowsFromProducts"));
assert.ok(route.includes("conventional30Book"));
assert.ok(route.includes('client.loan_purpose === "purchase" ? { target_price: TARGET_PRICE }'));
assert.ok(!route.includes("pickConventional30NearPar"));
assert.ok(!route.includes("94115"));
assert.doesNotMatch(route, /console\.(log|info|warn|error)\([^)]*BANKINGBRIDGE_/);

const picker = readFileSync(join(root, "lib/rateflow/quote.ts"), "utf8");
assert.ok(picker.includes("pickConventional30LowestNoPoints"));
assert.ok(picker.includes("pickConventional30NoCost"));
assert.ok(picker.includes("pickLeadRow"));
assert.ok(picker.includes("rawRowsFromPayload") || picker.includes("results"));
assert.ok(!picker.includes("pickConventional30NearPar"));
assert.ok(!picker.includes("nearParSort"));
assert.doesNotMatch(picker, /closest to par/i);

const fromDraft = readFileSync(join(root, "lib/rateflow/fromDraft.ts"), "utf8");
assert.ok(fromDraft.includes("address-confirm"));
assert.ok(fromDraft.includes("addressConfirmPending"));

const fox = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
const client = readFileSync(join(root, "components/fox/rateflowClient.ts"), "utf8");
assert.ok(fox.includes("requestRateflowIfNeeded"));
assert.ok(fox.includes("messagesWithLiveQuoteSpeech"));
assert.ok(fox.includes("messagesWithRateOrReadySpeech"));
assert.ok(client.includes("/api/rateflow-quote"));
assert.ok(client.includes("RATEFLOW_EMPTY_RETRIES"));
assert.ok(client.includes("for (let attempt = 0; !result && attempt < RATEFLOW_EMPTY_RETRIES;"));
assert.ok(!fox.includes("/api/heloc-quote"));
assert.ok(!client.includes("/api/heloc-quote"));
assert.ok(!fox.includes("BANKINGBRIDGE_"));
assert.ok(!client.includes("BANKINGBRIDGE_"));

const heloc = readFileSync(join(root, "app/api/heloc-quote/route.ts"), "utf8");
assert.ok(heloc.includes("calculateHelocQuoteTool"));
assert.ok(!heloc.includes("rateflow"));

assert.equal(RATEFLOW_EMPTY_RETRIES, 1);

const marinaReadyFile = file({
  productIntent: "refinance",
  propertyValueAmount: 1_000_000,
  loanAmountValue: 500_000,
  subjectAddress: "801 Marina Blvd, San Francisco, CA 94123",
  propertyZip: "94123",
});
assert.equal(rateflowClientBodyFromDraft(marinaReadyFile)?.zipcode, "94123");
assert.equal(rateflowClientBodyFromDraft(marinaReadyFile)?.loan_purpose, "refinance");

const originalFetch = globalThis.fetch;
async function withMockedRateflow(
  handler: (calls: { n: number }) => Promise<Response>,
  run: (calls: { n: number }) => Promise<void>,
) {
  const calls = { n: 0 };
  resetRateflowClientForTests();
  globalThis.fetch = (async () => {
    calls.n += 1;
    return handler(calls);
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
    resetRateflowClientForTests();
  }
}

void withMockedRateflow(
  async (calls) => {
    if (calls.n === 1) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        ok: true,
        quote: { rate: 6.125, asOf: "2026-08-28T21:10:00.000Z", pts: -1.25 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
  async (calls) => {
    const firstMiss = await requestRateflowIfNeeded(marinaReadyFile);
    assert.equal(calls.n, 2, "retry Rateflow once after empty/error");
    assert.ok(firstMiss && firstMiss !== "unavailable");
    assert.equal(firstMiss.rate, 6.125);
  },
)
  .then(() =>
    withMockedRateflow(
      async () =>
        new Response(JSON.stringify({ ok: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      async (calls) => {
        const exhausted = await requestRateflowIfNeeded(marinaReadyFile);
        assert.equal(calls.n, 2);
        assert.equal(exhausted, "unavailable");
        const again = await requestRateflowIfNeeded(marinaReadyFile);
        assert.equal(again, "unavailable");
        assert.equal(calls.n, 2, "do not keep refetching after the retry");
      },
    ),
  )
  .then(() => {
    console.log("assert-rateflow: ok");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
