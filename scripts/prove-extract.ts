import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bytes = readFileSync(join(root, "scripts/fixtures/paystub-acme.png"));

async function main() {
  if (!process.env.grok_api_key) {
    console.log("prove-extract skipped: grok_api_key is not set");
    return;
  }

  const result = await classifyAndExtract(bytes, "image/png");
  console.log(JSON.stringify(result, null, 2));
  assert.notEqual(result.failed, true, result.warnings.join(" | "));
  assert.equal(result.extractClass, "paystub");
  assert.ok(result.confidence >= 0.55, `confidence ${result.confidence}`);
  assert.match(result.fields.employer_name ?? "", /acme/i);
  assert.match((result.fields.gross_period ?? "").replace(/[, $]/g, ""), /4230\.77/);
  assert.ok(result.fields.ytd_gross, "ytd_gross missing");
  assert.ok(result.fields.pay_period_end, "pay_period_end missing");
  console.log("prove-extract ok");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
