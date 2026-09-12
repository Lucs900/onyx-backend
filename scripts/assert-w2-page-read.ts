/**
 * Grok page-read rails for W-2.
 * Locked schema: employer, tax year, Box 5 Medicare wages, Box 1 optional.
 * Never SSN. Never the box number as dollars ($5 is a FAIL).
 * Harbor 03/07 stay on printed text — they are not this proof.
 *
 * Founder fixture: scripts/fixtures/27-w2-2025-adp-matthew-castaneda.pdf
 * decoded from the exact .b64 / chunk dir. Do not invent that PDF.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyExtractedFields,
  W2_LOCKED_SCHEMA_KEYS,
  isBoxNumberAsDollars,
  sanitizeExtractedFields,
} from "../components/fox/fileWrite";
import { resolveProposal } from "../components/fox/completeness";
import { emptyDraft } from "../components/fox/store";
import { previewFacts } from "../components/fox/workspace";
import { wageEmploymentFileLine } from "../components/fox/qualifyingIncome";
import { classifyAndExtract, FOX_GROK_MODEL, VISION_MODEL } from "../lib/docs/extract";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const ADP_W2_PDF_REL = "scripts/fixtures/27-w2-2025-adp-matthew-castaneda.pdf";
export const ADP_W2_B64_REL = "scripts/fixtures/27-w2-2025-adp-matthew-castaneda.pdf.b64";
export const ADP_W2_B64_DIR_REL = "scripts/fixtures/27-w2-2025-adp-matthew-castaneda.pdf.b64.d";

export const ADP_W2_FIXTURE_CANDIDATES = [
  ADP_W2_PDF_REL,
  ADP_W2_B64_REL,
  ADP_W2_B64_DIR_REL,
];

function isPdfBytes(bytes: Uint8Array) {
  return bytes.length > 80 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function placeholderB64(text: string) {
  const t = text.trim();
  return !t || t === "PLACEHOLDER_LOAD_FROM_FILE" || t.startsWith("FILE_CONTENT_FROM_");
}

function assembleFounderB64(): string | null {
  const dir = join(root, ADP_W2_B64_DIR_REL);
  if (existsSync(dir)) {
    const parts = readdirSync(dir)
      .filter((name) => /^\d+$/.test(name))
      .sort();
    if (parts.length) {
      const text = parts.map((name) => readFileSync(join(dir, name), "utf8")).join("");
      if (!placeholderB64(text) && /^[A-Za-z0-9+/=\s]+$/.test(text)) return text;
    }
  }
  const b64Path = join(root, ADP_W2_B64_REL);
  if (!existsSync(b64Path)) return null;
  const text = readFileSync(b64Path, "utf8");
  if (placeholderB64(text) || !/^[A-Za-z0-9+/=\s]+$/.test(text)) return null;
  return text;
}

/** Decode founder .b64 / chunk dir to the PDF path. Never writes a substitute. */
export function decodeAdpW2Fixture(): string | null {
  const pdfPath = join(root, ADP_W2_PDF_REL);
  if (existsSync(pdfPath)) {
    const bytes = readFileSync(pdfPath);
    if (isPdfBytes(bytes)) return pdfPath;
  }
  const text = assembleFounderB64();
  if (!text) return null;
  const buf = Buffer.from(text.replace(/\s+/g, ""), "base64");
  if (!isPdfBytes(buf)) return null;
  writeFileSync(pdfPath, buf);
  return pdfPath;
}

export function adpW2FixturePath(): string | null {
  const decoded = decodeAdpW2Fixture();
  if (decoded) return decoded;
  for (const rel of ADP_W2_FIXTURE_CANDIDATES) {
    if (rel.endsWith(".b64")) continue;
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const bytes = readFileSync(path);
    if (isPdfBytes(bytes)) return path;
  }
  return null;
}

function wageSketch(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_000_000,
    downPaymentAmount: 200_000,
    loanAmountValue: 800_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "house",
    propertyTypeAsked: true,
    subjectAddress: "14 Oak Street, San Francisco, CA 94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
  };
}

function noSsnOnFile(draft: FoxIntakeDraft) {
  const blob = JSON.stringify({
    facts: draft.facts,
    preview: previewFacts(draft),
    employment: wageEmploymentFileLine(draft),
  });
  assert.doesNotMatch(blob, /\b\d{3}-\d{2}-\d{4}\b/);
  assert.doesNotMatch(blob, /\bssn\b/i);
}

function main() {
  assert.equal(FOX_GROK_MODEL, "grok-3");
  assert.equal(VISION_MODEL, "grok-2-vision-1212");
  assert.deepEqual([...W2_LOCKED_SCHEMA_KEYS], [
    "employer_name",
    "tax_year",
    "medicare_wages",
    "box5",
    "wages",
  ]);

  assert.equal(isBoxNumberAsDollars("5"), true);
  assert.equal(isBoxNumberAsDollars("$5"), true);
  assert.equal(isBoxNumberAsDollars("5.00"), true);
  assert.equal(isBoxNumberAsDollars("1"), true);
  assert.equal(isBoxNumberAsDollars("36460.08"), false);
  assert.equal(isBoxNumberAsDollars("36,460.08"), false);
  assert.equal(isBoxNumberAsDollars("118400"), false);

  const rejected = sanitizeExtractedFields("w2", {
    employer_name: "Comprehensive Skills Training Center",
    tax_year: "2025",
    medicare_wages: "5",
    box5: "$5",
    wages: "1",
    ssn: "123-45-6789",
  });
  assert.equal(rejected.medicare_wages, undefined);
  assert.equal(rejected.box5, undefined);
  assert.equal(rejected.wages, undefined);
  assert.equal(rejected.ssn, undefined);
  assert.equal(rejected.employer_name, "Comprehensive Skills Training Center");
  assert.equal(rejected.tax_year, "2025");

  const kept = sanitizeExtractedFields("w2", {
    employer_name: "Comprehensive Skills Training Center",
    tax_year: "2025",
    medicare_wages: "36460.08",
    wages: "35000",
  });
  assert.equal(kept.medicare_wages, "36460.08");
  assert.doesNotMatch(kept.medicare_wages ?? "", /^5$/);

  const proposed = applyExtractedFields(wageSketch(), {
    extractClass: "w2",
    confidence: 0.94,
    fields: {
      employer_name: "Comprehensive Skills Training Center",
      tax_year: "2025",
      medicare_wages: "36460.08",
    },
  });
  assert.ok(proposed.draft.pendingProposal, "File stays empty until Use this");
  assert.notEqual(proposed.draft.facts?.w2_box5?.confirmed, true);
  assert.doesNotMatch(wageEmploymentFileLine(proposed.draft), /36,460/);
  noSsnOnFile(proposed.draft);

  const used = resolveProposal(proposed.draft, "accept");
  assert.match(wageEmploymentFileLine(used), /Comprehensive Skills Training Center/);
  assert.match(wageEmploymentFileLine(used), /Box 5 \$36,460/);
  assert.doesNotMatch(wageEmploymentFileLine(used), /Box 5 \$5\b/);
  noSsnOnFile(used);

  const five = applyExtractedFields(wageSketch(), {
    extractClass: "w2",
    confidence: 0.94,
    fields: sanitizeExtractedFields("w2", {
      employer_name: "Comprehensive Skills Training Center",
      medicare_wages: "5",
    }),
  });
  assert.doesNotMatch(wageEmploymentFileLine(resolveProposal(five.draft, "accept")), /Box 5 \$5\b/);

  const harbor = join(root, "sample-docs/03-w2-2025-jordan-hale.pdf");
  const deadVision = {
    async classify(): Promise<never> {
      throw new Error("vision should not run on Harbor 03 text");
    },
    async extract(): Promise<never> {
      throw new Error("vision should not run on Harbor 03 text");
    },
  };
  return classifyAndExtract(
    readFileSync(harbor),
    "application/pdf",
    deadVision,
    null,
    "03-w2-2025-jordan-hale.pdf",
  ).then((w2) => {
    assert.equal(w2.extractClass, "w2");
    assert.notEqual(w2.failed, true);
    const box5 = w2.fields.medicare_wages ?? w2.fields.box5;
    assert.equal(box5, "118400");
    assert.ok(!isBoxNumberAsDollars(box5));
    assert.match(w2.fields.employer_name ?? "", /Harbor Pacific Design Inc/i);

    const adp = adpW2FixturePath();
    assert.ok(adp, "founder ADP W-2 missing — decode scripts/fixtures/27-w2-2025-adp-matthew-castaneda.pdf");
    return classifyAndExtract(readFileSync(adp), "application/pdf", deadVision, "w2", adp.split("/").pop()).then(
      (extracted) => {
        assert.notEqual(extracted.failed, true, "ADP W-2 unread");
        assert.equal(extracted.extractClass, "w2");
        const wages = extracted.fields.medicare_wages ?? extracted.fields.box5 ?? "";
        assert.ok(!isBoxNumberAsDollars(wages), `ADP Box 5 was box number — ${wages}`);
        assert.notEqual(wages, "5");
        assert.notEqual(wages, "5.00");
        assert.match(wages, /36460\.08/);
        assert.match(extracted.fields.employer_name ?? "", /Comprehensive Skills Training/i);
        assert.equal(extracted.fields.tax_year, "2025");
        assert.equal(extracted.fields.ssn, undefined);
        console.log("assert-w2-page-read: ADP Castaneda Box 5 is $36,460.08, not $5");
      },
    );
  });
}

main();
