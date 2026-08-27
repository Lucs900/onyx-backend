import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const CONTAMINATION =
  /presidio|\bp37\b|candle|\bwax\b|label[- ]pack|label\s*5|this\s+is\s+it/i;

const MORTGAGE_SAMPLE =
  /paystub|w-?2|\bid\b|license|\breturn\b|\bentity\b|tax[-_ ]?return|bank[-_ ]?statement|purchase[-_ ]?contract|mortgage[-_ ]?statement/i;

const DOC_EXT = /\.(png|jpe?g|webp|heic|pdf|gif|tiff?)$/i;

const FIXTURE_DIRS = ["scripts/fixtures", "test/fixtures", "tests/fixtures"];

const NAME_SCAN_FILES = ["scripts/smoke-desk.ts", "scripts/prove-extract.ts"];

function walk(dir: string, found: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    found.push(relative(root, full));
    if (entry.isDirectory()) walk(full, found);
  }
  return found;
}

function fail(paths: string[], why: string) {
  const list = paths.map((path) => `  ${path}`).join("\n");
  throw new Error(`${why}\n${list}`);
}

export function assertOnyxFixtures() {
  const paths = FIXTURE_DIRS.flatMap((dir) => {
    const abs = join(root, dir);
    return [dir, ...walk(abs)];
  });

  const contaminated = paths.filter((path) => CONTAMINATION.test(path));
  if (contaminated.length) {
    fail(
      contaminated,
      "ONYX fixtures must be mortgage samples. Presidio / candle / label-pack paths are contamination:",
    );
  }

  const oddDocs = paths.filter((path) => DOC_EXT.test(path) && !MORTGAGE_SAMPLE.test(path));
  if (oddDocs.length) {
    fail(
      oddDocs,
      "ONYX fixture uploads must be mortgage samples (paystub, W-2, ID, tax return, bank statement, purchase contract, mortgage statement):",
    );
  }

  for (const file of NAME_SCAN_FILES) {
    const src = readFileSync(join(root, file), "utf8");
    const names = Array.from(src.matchAll(/\bname:\s*"([^"]+)"/g), (match) => match[1]);
    const badNames = names.filter((name) => CONTAMINATION.test(name));
    if (badNames.length) {
      fail(badNames.map((name) => `${file}: ${name}`), "Test document names are contamination:");
    }
  }

  assert.ok(paths.some((path) => /paystub-acme\.png$/.test(path)), "expected scripts/fixtures/paystub-acme.png");
  assert.ok(paths.some((path) => /return-2023\.png$/.test(path)), "expected scripts/fixtures/return-2023.png");
  assert.ok(
    paths.some((path) => /return-declining-2024\.png$/.test(path)),
    "expected scripts/fixtures/return-declining-2024.png",
  );
  assert.ok(
    paths.some((path) => /entity-ordinary-2024\.png$/.test(path)),
    "expected scripts/fixtures/entity-ordinary-2024.png",
  );
  assert.ok(paths.some((path) => /w2-ot-bonus-2025\.png$/.test(path)), "expected scripts/fixtures/w2-ot-bonus-2025.png");
  assert.ok(
    paths.some((path) => /paystub-ot-bonus-2026\.png$/.test(path)),
    "expected scripts/fixtures/paystub-ot-bonus-2026.png",
  );
  assert.ok(paths.some((path) => /w2-bonus-2025\.png$/.test(path)), "expected scripts/fixtures/w2-bonus-2025.png");
  assert.ok(
    paths.some((path) => /paystub-bonus-declining-2026\.png$/.test(path)),
    "expected scripts/fixtures/paystub-bonus-declining-2026.png",
  );
  assert.ok(
    paths.some((path) => /paystub-second-job\.png$/.test(path)),
    "expected scripts/fixtures/paystub-second-job.png",
  );
  assert.ok(paths.some((path) => /paystub-harbor\.png$/.test(path)), "expected scripts/fixtures/paystub-harbor.png");
  assert.ok(
    paths.some((path) => /bank-statement-first-national\.png$/.test(path)),
    "expected scripts/fixtures/bank-statement-first-national.png",
  );
  assert.ok(
    paths.some((path) => /purchase-contract-oak\.png$/.test(path)),
    "expected scripts/fixtures/purchase-contract-oak.png",
  );
  assert.ok(
    paths.some((path) => /mortgage-statement-oak\.png$/.test(path)),
    "expected scripts/fixtures/mortgage-statement-oak.png",
  );
  assert.ok(
    paths.some((path) => /mortgage-statement-pine\.png$/.test(path)),
    "expected scripts/fixtures/mortgage-statement-pine.png",
  );
  assert.ok(
    paths.some((path) => /mortgage-statement-cedar\.png$/.test(path)),
    "expected scripts/fixtures/mortgage-statement-cedar.png",
  );
  assert.ok(
    paths.some((path) => /government-id-jordan\.png$/.test(path)),
    "expected scripts/fixtures/government-id-jordan.png",
  );
  assert.ok(
    paths.some((path) => /government-id-jordan\.pdf$/.test(path)),
    "expected scripts/fixtures/government-id-jordan.pdf",
  );
  assert.ok(paths.some((path) => /paystub-acme\.pdf$/.test(path)), "expected scripts/fixtures/paystub-acme.pdf");
  assert.ok(
    paths.some((path) => /paystub-ot-bonus-2026\.pdf$/.test(path)),
    "expected scripts/fixtures/paystub-ot-bonus-2026.pdf",
  );
  assert.ok(
    paths.some((path) => /paystub-bonus-declining-2026\.pdf$/.test(path)),
    "expected scripts/fixtures/paystub-bonus-declining-2026.pdf",
  );
  assert.ok(paths.some((path) => /w2-ot-bonus-2025\.pdf$/.test(path)), "expected scripts/fixtures/w2-ot-bonus-2025.pdf");
  assert.ok(paths.some((path) => /w2-bonus-2025\.pdf$/.test(path)), "expected scripts/fixtures/w2-bonus-2025.pdf");
  assert.ok(
    paths.some((path) => /bank-statement-sabotage\.png$/.test(path)),
    "expected scripts/fixtures/bank-statement-sabotage.png",
  );
}

const invokedDirectly =
  Boolean(process.argv[1]) && pathToFileURL(process.argv[1]!).href === import.meta.url;

if (invokedDirectly) {
  assertOnyxFixtures();
  console.log("onyx fixtures ok");
}
