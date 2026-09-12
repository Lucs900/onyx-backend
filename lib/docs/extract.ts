import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  FIRST_SESSION_LOCKED_KEYS,
  LOW_EXTRACT_CONFIDENCE,
  TAX_RETURN_PAGE_READ_KEYS,
  hasLockedSuggestion,
  isFirstSessionClass,
  lockFirstSessionFields,
  lockTaxReturnPageReadFields,
  looksLikeBankFields,
  preferFilenameClass,
  promoteExtractClass,
  sanitizeExtractedFields,
  type ExtractApplyInput,
} from "@/components/fox/fileWrite";
import type { ExtractClass } from "@/components/fox/types";
import {
  drawnPageHasInk,
  isPdf,
  pdfLooksEncrypted,
  pdfTextLayerCharCount,
  readPdfEmbeddedImages,
  readPdfJsTextLayer,
  pdfPageCount,
  readPdfJsTextPages,
  readPdfTextLayer,
  renderPdfFirstPage,
  renderPdfPage,
} from "@/lib/docs/pdfText";
import {
  fieldsFromPrintedLines,
  loudContractFromPrintedLines,
  loudCoverFromPrintedLines,
  loudTranscriptFromPrintedLines,
  loudIdFromPrintedLines,
  loudEntityReturnFromPrintedLines,
  loudK1FromPrintedLines,
  loudScheduleCFromPrintedLines,
  loudScheduleEFromPrintedLines,
  loudWageFromPrintedLines,
  looksLike1040FacePage,
  pageHasIncomeLossLines,
  printedSampleFromLines,
  readPrintedSample,
} from "@/lib/docs/printedSample";
import {
  incomeLedgerFieldsFromPrintedLines,
  sanitizeLedgerExtractFields,
  TAX_RETURN_LEDGER_READ_KEYS,
} from "@/lib/income/ledger";

export type ClassifyResult = {
  class: ExtractClass;
  confidence: number;
  readable?: boolean;
};

export type ExtractFieldsResult = {
  fields: Record<string, string>;
  warnings: string[];
};

export type DocumentExtractAdapter = {
  classify(bytes: Uint8Array, mediaType: string): Promise<ClassifyResult>;
  extract(
    bytes: Uint8Array,
    mediaType: string,
    extractClass: ExtractClass,
  ): Promise<ExtractFieldsResult>;
  extractLedger?(bytes: Uint8Array, mediaType: string): Promise<ExtractFieldsResult>;
};

export type ClassifyExtractResult = ExtractApplyInput & {
  warnings: string[];
  failed?: boolean;
  textLayerChars?: number;
};

const CLASSES: ExtractClass[] = [
  "government_id",
  "paystub",
  "w2",
  "tax_return",
  "bank_statement",
  "purchase_contract",
  "mortgage_statement",
  "other",
];

/** Same Grok model Fox chat already uses. Vision fallbacks stay for page images. */
export const FOX_GROK_MODEL = "grok-3";
export const VISION_MODEL = "grok-2-vision-1212";
const VISION_MODEL_FALLBACKS = ["grok-2-vision", "grok-4"];

const SYSTEM =
  "You read mortgage intake documents. Return ONLY JSON. Never invent numbers, names, dates, or balances. Use empty string when unsure. Never include a full SSN or a full account number. ID may include last 4 digits only. Do not output FICO or credit scores.";

function grokApiKey() {
  const apiKey = process.env.grok_api_key;
  if (!apiKey) {
    throw new Error("grok_api_key is not set");
  }
  return apiKey;
}

function grokClient() {
  return createOpenAI({
    baseURL: "https://api.x.ai/v1",
    apiKey: grokApiKey(),
  });
}

export function imageDataUrl(bytes: Uint8Array, mediaType: string) {
  const mime = mediaType === "image/jpg" ? "image/jpeg" : mediaType;
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

export function visionChatBody(model: string, prompt: string, dataUrl: string) {
  return {
    model,
    temperature: 0,
    max_tokens: 700,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
  };
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function logVisionError(where: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[docs/extract] ${where}:`, message, error);
}

function visionMediaError(mediaType: string) {
  if (mediaType.startsWith("image/") && !/heic|heif/i.test(mediaType)) return null;
  return `Vision adapter cannot read ${mediaType}. Convert to PNG or JPEG.`;
}

async function readXaiError(response: Response) {
  const text = await response.text();
  return `xAI ${response.status} ${response.statusText}: ${text.slice(0, 800)}`;
}

async function grokChatCompletions(prompt: string, dataUrl: string): Promise<string> {
  const apiKey = grokApiKey();
  // Page images need a vision model. grok-3 first can 200 with no page and skip vision.
  const models = [VISION_MODEL, ...VISION_MODEL_FALLBACKS, FOX_GROK_MODEL];
  let lastError: Error | null = null;
  for (const model of models) {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(visionChatBody(model, prompt, dataUrl)),
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = payload.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) {
        lastError = new Error(`xAI ${model} returned empty content`);
        continue;
      }
      if (!parseJsonObject(text)) {
        lastError = new Error(`xAI ${model} returned non-JSON`);
        logVisionError(`chat/completions ${model}`, lastError);
        continue;
      }
      return text;
    }
    const detail = await readXaiError(response);
    lastError = new Error(detail);
    logVisionError(`chat/completions ${model}`, lastError);
    if (response.status === 401 || response.status === 403) break;
  }
  throw lastError ?? new Error("xAI chat/completions failed");
}

async function grokResponses(prompt: string, dataUrl: string): Promise<string> {
  const apiKey = grokApiKey();
  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM }],
        },
        {
          role: "user",
          content: [
            { type: "input_image", image_url: dataUrl, detail: "high" },
            { type: "input_text", text: prompt },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(await readXaiError(response));
  }
  const payload = (await response.json()) as {
    output_text?: string;
    output?: { content?: { text?: string }[] }[];
  };
  const fromOutput = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text ?? "")
    .join("")
    .trim();
  return payload.output_text || fromOutput || "";
}

async function grokSdkJson(prompt: string, dataUrl: string): Promise<string> {
  const grok = grokClient();
  const result = await generateText({
    model: grok.chat(VISION_MODEL),
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", image: dataUrl },
        ],
      },
    ],
    temperature: 0,
    maxOutputTokens: 700,
  });
  return result.text || "";
}

async function grokJson(
  bytes: Uint8Array,
  mediaType: string,
  prompt: string,
): Promise<Record<string, unknown>> {
  const unsupported = visionMediaError(mediaType);
  if (unsupported) {
    throw new Error(unsupported);
  }
  const dataUrl = imageDataUrl(bytes, mediaType);
  try {
    const parsed = parseJsonObject(await grokChatCompletions(prompt, dataUrl));
    if (parsed) return parsed;
    throw new Error("Model did not return JSON");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/xAI (400|422)|image|input_image|image_url/i.test(message)) {
      throw error;
    }
    logVisionError("chat/completions image shape, trying /responses", error);
    const parsed = parseJsonObject(await grokResponses(prompt, dataUrl));
    if (parsed) return parsed;
    logVisionError("responses empty JSON, trying AI SDK data URL", error);
    const sdkParsed = parseJsonObject(await grokSdkJson(prompt, dataUrl));
    if (sdkParsed) return sdkParsed;
    throw new Error("Model did not return JSON");
  }
}

function extractFieldsPrompt(extractClass: ExtractClass, keys: readonly string[]) {
  let extra = "";
  if (extractClass === "tax_return") {
    const pageReadOnly =
      keys.length === TAX_RETURN_PAGE_READ_KEYS.length &&
      TAX_RETURN_PAGE_READ_KEYS.every((key) => keys.includes(key));
    extra = pageReadOnly
      ? " First pages of Form 1040 only. tax_year from the printed tax year on the return, never the filename. full_name from the taxpayer name as printed. On a joint return, full_name is both taxpayers as printed (for example ALLAN COMBES and RENZ COMBES). Never invent a spouse from the filename. Never output SSN, wages, AGI, or schedule dollars. Empty string if not clearly printed. Never invent."
      : " Form 1040 or a Form 1040 Tax Return Transcript (not a full packet). tax_year from the printed Tax Period Ending / Report for Tax Period Ending (12-31-2023 → 2023), never the filename. filing_status from printed Filing status (Married Taxpayer Filing Joint Return or Married Filing Joint → Married filing jointly). On a Tax Return Transcript: return_kind is transcript; dependent_count is an integer count of Dependent 1, Dependent 2, … rows only — never names, never SSN, never Exemption number; schedule_c_present, schedule_e_present, schedule_f_present, and k1_present are yes only when the printed Schedule C, Schedule E, Schedule F, or K-1 amount is not zero; never output wages, AGI, pension, Schedule C dollars, or Schedule E dollars. On a Form 1040 (not a transcript): return_kind is 1040; schedule_c, schedule_e, k1, 1065, 1120s, or empty otherwise. present_address is the taxpayer street on a Form 1040 only — never a transcript, never the purchase subject. schedule_c_net_profit is Schedule C net profit or loss (line 31); use a leading minus when the return shows a loss. depreciation is Schedule C line 13. depletion is Schedule C line 12. business_use_of_home is Schedule C line 30. nonrecurring_other_income is Schedule C line 6 other income when printed as nonrecurring. k1_ordinary_income is ordinary business income when a K-1 / 1065 / 1120S is visible — including 1120S line 1 ordinary income. k1_distributions is cash distributions when printed; empty if not shown. amortization, casualty_loss, and mileage_depreciation only when clearly printed on the same return. Empty string when a line is not clearly printed. Never invent add-backs. Never output dependent names.";
  }
  if (extractClass === "paystub") {
    extra =
      " Locked schema only: employer_name, pay_period_end (period or pay date), gross_period (gross this period), pay_frequency only when the word weekly / biweekly / semimonthly / monthly is printed — never from hours. ytd_gross if printed. overtime, overtime_ytd, bonus, and commission only when clearly printed; empty otherwise. Never invent two-year OT. Never invent. Never output SSN, routing, or a full account number.";
  }
  if (extractClass === "w2") {
    extra =
      " Locked schema only: employer_name, tax_year, medicare_wages / box5 (Box 5 Medicare wages and tips), wages optional (Box 1). medicare_wages is the dollar amount printed in Box 5 — never the box number 5, never $5 because the label is 5. Prefer Box 5 over Box 1. Never output SSN. overtime, bonus, and commission only when clearly printed; empty otherwise; never invent.";
  }
  if (extractClass === "bank_statement") {
    extra =
      " institution, ending_balance, and account_last4 only when clearly printed. ending_balance is the dollar ending balance (for example $84,220.15), never a statement-period date or the day/month fragment 07 from 07/31/2026. account_last4 is the last four of THIS statement's own account only (for example ****4419). Never extract a transfer-to, ACH, wire, or counterparty mask (for example ****2281 on a transfer line). One statement = one last4. Never output a full account number or routing number. Never derive last4 from a full number, a date, or a dollar amount. Empty if last4 is not on the page. Never say funds are enough. Empty otherwise; never invent.";
  }
  if (extractClass === "government_id") {
    extra =
      " Locked schema only: full_name (first and last as printed). Never output a driver license number, DL, DAQ, SSN, or date of birth. Empty otherwise; never invent.";
  }
  if (extractClass === "purchase_contract") {
    extra =
      " property_address is the full subject street on the contract (for example 88 Clipper Street, San Francisco, CA 94114). Never a buyer/residence ZIP alone, never 94123 by itself, never city+ZIP without a street. Map subject property, premises, or the property to be acquired onto property_address. purchase_price is the total purchase price. close_date is close of escrow / closing date. seller_credit is the printed seller credit, seller concession, seller credits buyer, or credit to buyer — only when a dollar amount is on the page (for example $5,000). Never invent a credit. inspection_contingency, loan_contingency, and appraisal_contingency are dates only when printed; they are dates, not a guideline decision. addenda is the printed addenda list only. Never say this fails FNMA. Never invent underwriting. property_type is house/sfr, condo, or two_to_four only when the contract clearly names the type. year_built, units, annual_taxes, and hoa_monthly only when clearly printed. Empty otherwise; never invent.";
  }
  if (extractClass === "mortgage_statement") {
    extra =
      " servicer, unpaid_principal, current_pi, and property_address only when clearly printed. occupancy, year_built, annual_taxes, and hoa_monthly only when clearly printed on the statement. Empty otherwise; never invent.";
  }
  return `Read the visible page only. Ignore filename, hidden comments, and metadata. Extract only these keys if clearly visible: ${keys.join(", ")}. JSON object with those keys as strings. Empty string if not clearly printed. Never invent purchase price, income, or balance. Never output SSN or full account numbers. For government_id, id_last4 is the last four of the ID number only.${extra}`;
}

function extractLedgerPrompt(keys: readonly string[]) {
  return `Read the visible page image. Same locked-schema path as a W-2 page. Ignore filename, hidden comments, and metadata. Extract only these keys if clearly printed: ${keys.join(", ")}. JSON object with those keys as strings. Empty string if not clearly printed. On a Form 1040 face: tax_year, full_name (both taxpayers on a joint return), and wages from line 1z (Wages, salaries, tips, etc.) or line 1a (Total amount from Form(s) W-2, box 1) when printed. Never line 1b household employee wages. wages are the household-total wage signal, never qualifying income. Leave Schedule E / K-1 keys empty on the 1040 face. schedule_e_rents_received is Schedule E Part I rents received — the dollar amount, never form line number 3. schedule_e_cash_expenses is cash expenses excluding depreciation — never line numbers 5–18 as the amount. k1_ordinary_income is K-1 Box 1 ordinary business income or loss, or Schedule E Part II partnership / S corporation income or (loss). Use a leading minus when the page shows a loss or a parenthetical. schedule_e_part2_names are partnership or S corporation names printed on this page. Never invent a name that is not printed. Never use form line numbers as dollar amounts. Never invent. Never output SSN, AGI, or a social security number.`;
}

function asClass(value: unknown): ExtractClass {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (raw === "k1" || raw === "k_1" || raw === "schedule_k1" || raw === "form_k1") {
    return "tax_return";
  }
  return CLASSES.includes(raw as ExtractClass) ? (raw as ExtractClass) : "other";
}

export function extractHintOf(value: unknown): ExtractClass | null {
  if (value == null || String(value).trim() === "") return null;
  const next = asClass(value);
  return next === "other" ? null : next;
}

export type ExtractPhase = "cover" | "packet";

export function extractPhaseOf(value: unknown): ExtractPhase | null {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "packet" ? "packet" : raw === "cover" ? "cover" : null;
}

/** Walk file `2025 1040 - Combes Allan and Renz.pdf` is tax_return. Filename year is not a lock. */
export function taxReturnPageHint(
  hint?: ExtractClass | null,
  filename?: string | null,
): ExtractClass | null {
  const name = String(filename ?? "");
  if (/\b1040\b|form\s*1040|tax\s*return/i.test(name) && !/w-?2|pay.?stub/i.test(name)) {
    return "tax_return";
  }
  return hint && hint !== "other" ? hint : null;
}

/** Castaneda page→image→Grok before printed pdf.js / 1040-face-as-transcript steal. */
export function shouldGrokTaxReturnPagesFirst(
  hint?: ExtractClass | null,
  filename?: string | null,
): boolean {
  const name = String(filename ?? "");
  return /\b1040\b|form\s*1040|tax\s*return/i.test(name) && !/w-?2|pay.?stub/i.test(name);
}

function printedLocksTaxReturnWithoutVision(lines: string[] | null): boolean {
  if (!lines?.length) return false;
  if (blobLooksLikeIrsTranscript(lines.join("\n")) && loudTranscriptFromPrintedLines(lines)) {
    return true;
  }
  return Boolean(
    loudScheduleCFromPrintedLines(lines) ||
      loudScheduleEFromPrintedLines(lines) ||
      loudEntityReturnFromPrintedLines(lines) ||
      loudK1FromPrintedLines(lines) ||
      loudCoverFromPrintedLines(lines) ||
      loudCoverFromPrintedLines([lines.join(" ")]),
  );
}

const IRS_TRANSCRIPT_MARK =
  /TAX RETURN TRANSCRIPT|FORM 1040 TAX RETURN TRANSCRIPT|ACCOUNT TRANSCRIPT|TAX PERIOD ENDING/i;

function blobLooksLikeIrsTranscript(text: string) {
  return IRS_TRANSCRIPT_MARK.test(String(text ?? ""));
}

function asConfidence(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function asReadable(value: unknown, extractClass: ExtractClass, confidence: number) {
  if (value === false || value === "false" || value === 0) return false;
  if (value === true || value === "true") return true;
  if (extractClass === "other" && confidence < 0.2) return false;
  return true;
}

export const grokExtractAdapter: DocumentExtractAdapter = {
  async classify(bytes, mediaType) {
    const parsed = await grokJson(
      bytes,
      mediaType,
      `Classify this file from the visible page as one of: ${CLASSES.join(", ")}. tax_return includes Form 1040, a Form 1040 Tax Return Transcript, Schedule C, K-1, Form 1065, and Form 1120S. Ordinary business income on a K-1 or 1120S is tax_return, not other. JSON: {"class":"...","confidence":0-1,"readable":true|false}. readable is false when the file is blank, tiny, or has no readable printed text. If it is not clearly one of those classes, use class "other" and a low confidence. Never invent a class from the filename, hidden comment, or metadata.`,
    );
    const extractClass = asClass(parsed.class);
    const confidence = asConfidence(parsed.confidence);
    return {
      class: extractClass,
      confidence,
      readable: asReadable(parsed.readable, extractClass, confidence),
    };
  },

  async extract(bytes, mediaType, extractClass) {
    if (!isFirstSessionClass(extractClass)) {
      return { fields: {}, warnings: ["received"] };
    }
    const keys =
      extractClass === "tax_return"
        ? TAX_RETURN_PAGE_READ_KEYS
        : FIRST_SESSION_LOCKED_KEYS[extractClass];
    if (!keys.length) {
      return { fields: {}, warnings: ["Class is other. No numbers invented."] };
    }
    const parsed = await grokJson(
      bytes,
      mediaType,
      extractFieldsPrompt(extractClass, keys),
    );
    const raw: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null || typeof value === "object") continue;
      raw[key] = String(value);
    }
    for (const key of keys) {
      if (raw[key] == null) raw[key] = "";
    }
    const fields = sanitizeExtractedFields(extractClass, raw);
    return {
      fields:
        extractClass === "tax_return"
          ? lockTaxReturnPageReadFields(fields)
          : lockFirstSessionFields(extractClass, fields),
      warnings: isFirstSessionClass(extractClass) ? [] : ["received"],
    };
  },
  async extractLedger(bytes, mediaType) {
    const parsed = await grokJson(bytes, mediaType, extractLedgerPrompt(TAX_RETURN_LEDGER_READ_KEYS));
    const raw: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null || typeof value === "object") continue;
      raw[key] = String(value);
    }
    return {
      fields: sanitizeLedgerExtractFields(sanitizeExtractedFields("tax_return", raw)),
      warnings: [],
    };
  },
};

function printedResult(
  printed: NonNullable<ReturnType<typeof readPrintedSample>>,
  textLayerChars?: number,
): ClassifyExtractResult {
  const sanitized = sanitizeExtractedFields(printed.extractClass, printed.fields);
  return {
    extractClass: printed.extractClass,
    confidence: printed.confidence,
    fields: sanitized,
    warnings: [],
    ...(textLayerChars != null ? { textLayerChars } : {}),
  };
}

function unreadResult(
  extractClass: ExtractClass,
  filename?: string | null,
  extraWarning?: string,
  textLayerChars?: number,
): ClassifyExtractResult {
  return {
    extractClass: preferFilenameClass(extractClass, filename ?? ""),
    confidence: 0,
    fields: {},
    warnings: extraWarning ? ["failed", extraWarning] : ["failed"],
    failed: true,
    ...(textLayerChars != null ? { textLayerChars } : {}),
  };
}

function normalizeClassifyResult(classified: ClassifyResult): ClassifyResult {
  return {
    ...classified,
    class: asClass(classified.class),
  };
}

async function classifyAndExtractPage(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
  hint?: ExtractClass | null,
): Promise<ClassifyExtractResult> {
  let classified: ClassifyResult | null = null;
  const hinted = hint && hint !== "other" ? hint : undefined;
  if (hinted && (hinted === "bank_statement" || isFirstSessionClass(hinted))) {
    try {
      const extracted = await adapter.extract(bytes, mediaType, hinted);
      const extractClass = promoteExtractClass(hinted, extracted.fields);
      const fields =
        extractClass === "tax_return" || hinted === "tax_return"
          ? lockTaxReturnPageReadFields(extracted.fields)
          : lockFirstSessionFields(extractClass, extracted.fields);
      const locked =
        extractClass === "bank_statement" || hinted === "bank_statement"
          ? looksLikeBankFields(fields)
          : hasLockedSuggestion(extractClass, fields);
      if (locked) {
        return {
          extractClass: hinted === "bank_statement" ? "bank_statement" : extractClass,
          confidence: 0.94,
          fields,
          warnings: extracted.warnings,
        };
      }
    } catch (error) {
      logVisionError("hintedExtract", error);
    }
  }
  try {
    classified = normalizeClassifyResult(await adapter.classify(bytes, mediaType));
    if (
      classified.readable === false &&
      hinted !== "bank_statement" &&
      !(hinted && isFirstSessionClass(hinted))
    ) {
      return {
        extractClass: classified.class,
        confidence: classified.confidence,
        fields: {},
        warnings: ["failed"],
        failed: true,
      };
    }
    const confident =
      classified.class !== "other" && classified.confidence >= LOW_EXTRACT_CONFIDENCE;
    const extractAs =
      hinted && (hinted === "bank_statement" || isFirstSessionClass(hinted))
        ? hinted
        : confident
          ? classified.class
          : hinted;
    if (!extractAs || extractAs === "other") {
      return {
        extractClass: classified.class,
        confidence: classified.confidence,
        fields: {},
        warnings: ["Low confidence. Document kept. No numbers invented."],
      };
    }
    const extracted = await adapter.extract(bytes, mediaType, extractAs);
    return {
      extractClass: promoteExtractClass(extractAs, extracted.fields),
      confidence: classified.confidence,
      fields: extracted.fields,
      warnings: extracted.warnings,
    };
  } catch (error) {
    logVisionError("classifyAndExtract", error);
    return {
      extractClass: classified?.class ?? "other",
      confidence: classified?.confidence ?? 0,
      fields: {},
      warnings: ["failed"],
      failed: true,
    };
  }
}

function textLayerCharCountOf(bytes: Uint8Array, mediaType: string): number {
  if (!(isPdf(bytes) || mediaType === "application/pdf")) return 0;
  return pdfTextLayerCharCount(bytes);
}

async function printedLinesForExtract(
  bytes: Uint8Array,
  mediaType: string,
): Promise<string[] | null> {
  if (!(isPdf(bytes) || mediaType === "application/pdf")) return null;
  if (!pdfLooksEncrypted(bytes)) {
    const raw = readPdfTextLayer(bytes);
    if (raw?.length) return raw;
  }
  return readPdfJsTextLayer(bytes);
}

function withTextChars(
  result: ClassifyExtractResult,
  bytes: Uint8Array,
  mediaType: string,
): ClassifyExtractResult {
  return { ...result, textLayerChars: result.textLayerChars ?? textLayerCharCountOf(bytes, mediaType) };
}

/** PDF first page → PNG/JPEG for Grok. Same W-2 vision path. Never send application/pdf. */
export async function pageImageForGrok(
  bytes: Uint8Array,
  mediaType: string,
): Promise<{ bytes: Uint8Array; mediaType: string } | null> {
  if (mediaType.startsWith("image/") && !/heic|heif/i.test(mediaType)) {
    return { bytes, mediaType: mediaType === "image/jpg" ? "image/jpeg" : mediaType };
  }
  if (isPdf(bytes) || mediaType === "application/pdf") {
    const page = await renderPdfFirstPage(bytes);
    if (page && drawnPageHasInk(page)) return page;
    const embedded = readPdfEmbeddedImages(bytes).filter((image) => image.bytes.length >= 4_000);
    if (embedded[0]) {
      return embedded.reduce((best, image) => (image.bytes.length > best.bytes.length ? image : best));
    }
    if (page && page.bytes.length >= 4_000) return page;
    if (page) return page;
  }
  return null;
}

async function grokPageRead(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
  hint?: ExtractClass | null,
  filename?: string | null,
): Promise<ClassifyExtractResult | null> {
  const image = await pageImageForGrok(bytes, mediaType);
  console.info("[docs/extract] page-read", {
    filename: filename ?? "",
    imageBytes: image?.bytes.length ?? 0,
    hint: hint ?? null,
  });
  if (!image) return null;
  const page = await classifyAndExtractPage(image.bytes, image.mediaType, adapter, hint);
  const extractClass = preferFilenameClass(page.extractClass, filename ?? "");
  const fields =
    extractClass === "tax_return"
      ? lockTaxReturnPageReadFields(page.fields)
      : lockFirstSessionFields(extractClass, page.fields);
  console.info("[docs/extract] page-read result", {
    filename: filename ?? "",
    extractClass,
    failed: Boolean(page.failed),
    keys: Object.keys(fields),
  });
  if (page.failed) return { ...page, extractClass, fields };
  const bankLocked = extractClass === "bank_statement" || hint === "bank_statement";
  const locked = bankLocked
    ? looksLikeBankFields(fields)
    : hasLockedSuggestion(extractClass, fields);
  if (!locked) {
    return {
      extractClass: bankLocked ? "bank_statement" : extractClass,
      confidence: page.confidence,
      fields: {},
      warnings: ["failed"],
      failed: true,
    };
  }
  return mergeTaxReturnLedgerFields(
    {
      ...page,
      extractClass: bankLocked ? "bank_statement" : extractClass,
      fields,
    },
    bytes,
    mediaType,
    adapter,
  );
}

async function printedLinesForLedger(
  bytes: Uint8Array,
  mediaType: string,
): Promise<string[] | null> {
  const pages = await readPdfJsTextPages(bytes, 24);
  if (pages?.length) {
    const lines = pages.flatMap((page) => page.lines);
    if (lines.length) return lines;
  }
  return printedLinesForExtract(bytes, mediaType);
}

const TAX_RETURN_PACKET_GROK_PAGE_CAP = 6;

async function printedLayerLooksLikeIrsTranscript(
  bytes: Uint8Array,
  mediaType: string,
): Promise<boolean> {
  const sync = !(isPdf(bytes) || mediaType === "application/pdf") || pdfLooksEncrypted(bytes)
    ? null
    : readPdfTextLayer(bytes);
  if (sync?.length && blobLooksLikeIrsTranscript(sync.join("\n"))) return true;
  // Walk packet is 223k. Tiny IRS transcripts still need pdf.js when the sync layer is empty.
  if (bytes.length > 80_000) return false;
  const pages = await readPdfJsTextPages(bytes, 3);
  return blobLooksLikeIrsTranscript(pages?.flatMap((page) => page.lines).join("\n") ?? "");
}

/** Page 1 wages / year / names win. Later pages add Sch E / K-1. Never overwrite with empty. */
function assignLedgerKeepFirst(merged: Record<string, string>, incoming: Record<string, string>) {
  for (const [key, value] of Object.entries(incoming)) {
    const next = String(value ?? "").trim();
    if (!next) continue;
    if ((key === "wages" || key === "tax_year" || key === "full_name") && merged[key]) continue;
    merged[key] = next;
  }
}

async function grokScheduleLedgerFields(
  bytes: Uint8Array,
  adapter: DocumentExtractAdapter,
): Promise<Record<string, string>> {
  if (!adapter.extractLedger) return {};
  const pageCount = await pdfPageCount(bytes);
  const last = pageCount > 1 ? Math.min(pageCount, TAX_RETURN_PACKET_GROK_PAGE_CAP) : 1;
  const targets: number[] = [];
  const take = (page: number) => {
    if (page < 1 || targets.includes(page)) return;
    targets.push(page);
  };
  take(1);
  for (let page = 2; page <= last; page += 1) take(page);
  const merged: Record<string, string> = {};
  for (const pageNumber of targets.slice(0, TAX_RETURN_PACKET_GROK_PAGE_CAP)) {
    const image = await renderPdfPage(bytes, pageNumber);
    if (!image?.mediaType.startsWith("image/")) continue;
    try {
      const extracted = await adapter.extractLedger(image.bytes, image.mediaType);
      assignLedgerKeepFirst(merged, sanitizeLedgerExtractFields(extracted.fields ?? {}));
    } catch (error) {
      logVisionError("extractLedger", error);
    }
  }
  return merged;
}

async function mergeTaxReturnLedgerFields(
  result: ClassifyExtractResult,
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
): Promise<ClassifyExtractResult> {
  if (result.extractClass !== "tax_return" || result.failed) return result;
  try {
    if (await printedLayerLooksLikeIrsTranscript(bytes, mediaType)) return result;
    let ledger: Record<string, string> = {};
    if (adapter.extractLedger) {
      ledger = await grokScheduleLedgerFields(bytes, adapter);
    }
    const layer = await printedLinesForLedger(bytes, mediaType);
    if (layer?.length && !blobLooksLikeIrsTranscript(layer.join("\n"))) {
      ledger = { ...incomeLedgerFieldsFromPrintedLines(layer), ...ledger };
    }
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries({ ...ledger, ...result.fields })) {
      if (value) fields[key] = String(value);
    }
    if (!Object.keys(ledger).length) return result;
    return {
      ...result,
      fields,
    };
  } catch (error) {
    logVisionError("mergeTaxReturnLedgerFields", error);
    return result;
  }
}

async function extractTaxReturnPacket(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
  filename?: string | null,
  textLayerChars?: number,
): Promise<ClassifyExtractResult> {
  try {
    if (await printedLayerLooksLikeIrsTranscript(bytes, mediaType)) {
      return {
        extractClass: "tax_return",
        confidence: 0.94,
        fields: { packet_read: "empty" },
        warnings: ["packet-empty"],
        textLayerChars,
      };
    }
    let ledger: Record<string, string> = {};
    if (adapter.extractLedger) {
      ledger = await grokScheduleLedgerFields(bytes, adapter);
    }
    const layer = await printedLinesForLedger(bytes, mediaType);
    if (layer?.length && !blobLooksLikeIrsTranscript(layer.join("\n"))) {
      ledger = { ...incomeLedgerFieldsFromPrintedLines(layer), ...ledger };
    }
    const fields = sanitizeLedgerExtractFields(ledger);
    const hasRows =
      Boolean(fields.wages) ||
      Boolean(fields.schedule_e_rents_received) ||
      Boolean(fields.k1_ordinary_income) ||
      Boolean(fields.schedule_c_net_profit);
    return {
      extractClass: preferFilenameClass("tax_return", filename ?? ""),
      confidence: 0.94,
      fields: { ...fields, packet_read: hasRows ? "schedules" : "empty" },
      warnings: hasRows ? [] : ["packet-empty"],
      textLayerChars,
    };
  } catch (error) {
    logVisionError("taxReturnPacket", error);
    return {
      extractClass: preferFilenameClass("tax_return", filename ?? ""),
      confidence: 0.94,
      fields: { packet_read: "empty" },
      warnings: ["packet-empty"],
      textLayerChars,
    };
  }
}

async function grokTaxReturnPacketPages(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
  hint: ExtractClass | null | undefined,
  filename: string | null | undefined,
  textLayerChars?: number,
): Promise<ClassifyExtractResult | null> {
  try {
    const page = await grokPageRead(bytes, mediaType, adapter, hint, filename);
    if (page && !page.failed && hasLockedSuggestion(page.extractClass, page.fields)) {
      return { ...page, textLayerChars };
    }
  } catch (error) {
    logVisionError("taxReturnPacketGrok", error);
  }
  return null;
}

async function unreadOrGrokPage(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
  hint: ExtractClass | null | undefined,
  filename: string | null | undefined,
  extraWarning: string,
  textLayerChars?: number,
): Promise<ClassifyExtractResult> {
  const page = await grokPageRead(bytes, mediaType, adapter, hint, filename);
  if (page && !page.failed && hasLockedSuggestion(page.extractClass, page.fields)) {
    return { ...page, textLayerChars };
  }
  return unreadResult(page?.extractClass ?? "other", filename, extraWarning, textLayerChars);
}

export async function classifyAndExtract(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter = grokExtractAdapter,
  hint?: ExtractClass | null,
  filename?: string | null,
  phase?: ExtractPhase | null,
): Promise<ClassifyExtractResult> {
  hint = taxReturnPageHint(hint, filename);
  const textLayerChars = textLayerCharCountOf(bytes, mediaType);
  if (phase === "packet" && (isPdf(bytes) || mediaType === "application/pdf")) {
    return extractTaxReturnPacket(bytes, mediaType, adapter, filename, textLayerChars);
  }
  if (
    shouldGrokTaxReturnPagesFirst(hint, filename) &&
    (isPdf(bytes) || mediaType === "application/pdf")
  ) {
    const syncLayer = pdfLooksEncrypted(bytes) ? null : readPdfTextLayer(bytes);
    if (!printedLocksTaxReturnWithoutVision(syncLayer)) {
      const packet = await grokTaxReturnPacketPages(
        bytes,
        mediaType,
        adapter,
        hint,
        filename,
        textLayerChars,
      );
      if (packet) return packet;
    }
  }
  if (isPdf(bytes) || mediaType === "application/pdf") {
    const layer = await printedLinesForExtract(bytes, mediaType);
    if (layer?.length) {
      if (looksLike1040FacePage(layer) && pageHasIncomeLossLines(layer)) {
        return unreadOrGrokPage(
          bytes,
          mediaType,
          adapter,
          hint,
          filename,
          "unmapped-text",
          textLayerChars,
        );
      }
      const loudScheduleC = loudScheduleCFromPrintedLines(layer);
      if (loudScheduleC) return printedResult(loudScheduleC, textLayerChars);
      const loudScheduleE = loudScheduleEFromPrintedLines(layer);
      if (loudScheduleE) return printedResult(loudScheduleE, textLayerChars);
      const loudEntity = loudEntityReturnFromPrintedLines(layer);
      if (loudEntity) return printedResult(loudEntity, textLayerChars);
      const loudK1 = loudK1FromPrintedLines(layer);
      if (loudK1) return printedResult(loudK1, textLayerChars);
      const loudCover =
        loudCoverFromPrintedLines(layer) || loudCoverFromPrintedLines([layer.join(" ")]);
      if (loudCover) return printedResult(loudCover, textLayerChars);
      const loudTranscript =
        loudTranscriptFromPrintedLines(layer) || loudTranscriptFromPrintedLines([layer.join(" ")]);
      if (loudTranscript) return printedResult(loudTranscript, textLayerChars);
      const loud = loudWageFromPrintedLines(layer);
      if (loud) return printedResult(loud, textLayerChars);
      const loudId = loudIdFromPrintedLines(layer);
      if (loudId) return printedResult(loudId, textLayerChars);
      const loudContract =
        loudContractFromPrintedLines(layer) || loudContractFromPrintedLines([layer.join(" ")]);
      if (loudContract) return printedResult(loudContract, textLayerChars);
      if (hint === "government_id") {
        const hintedId = fieldsFromPrintedLines("government_id", layer);
        if (hasLockedSuggestion("government_id", hintedId)) {
          return printedResult(
            { extractClass: "government_id", confidence: 0.94, fields: hintedId },
            textLayerChars,
          );
        }
      }
    }
  }
  const printed = readPrintedSample(bytes);
  if (printed && hasLockedSuggestion(printed.extractClass, printed.fields)) {
    return printedResult(printed, textLayerChars);
  }
  if (isPdf(bytes) || mediaType === "application/pdf") {
    const layer = await printedLinesForExtract(bytes, mediaType);
    if (layer?.length) {
      if (looksLike1040FacePage(layer) && pageHasIncomeLossLines(layer)) {
        return unreadOrGrokPage(
          bytes,
          mediaType,
          adapter,
          hint,
          filename,
          "unmapped-text",
          textLayerChars,
        );
      }
      const loudScheduleC = loudScheduleCFromPrintedLines(layer);
      if (loudScheduleC) return printedResult(loudScheduleC, textLayerChars);
      const loudScheduleE = loudScheduleEFromPrintedLines(layer);
      if (loudScheduleE) return printedResult(loudScheduleE, textLayerChars);
      const loudEntity = loudEntityReturnFromPrintedLines(layer);
      if (loudEntity) return printedResult(loudEntity, textLayerChars);
      const loudK1 = loudK1FromPrintedLines(layer);
      if (loudK1) return printedResult(loudK1, textLayerChars);
      const loudCover =
        loudCoverFromPrintedLines(layer) || loudCoverFromPrintedLines([layer.join(" ")]);
      if (loudCover) return printedResult(loudCover, textLayerChars);
      const loudTranscript =
        loudTranscriptFromPrintedLines(layer) || loudTranscriptFromPrintedLines([layer.join(" ")]);
      if (loudTranscript) return printedResult(loudTranscript, textLayerChars);
      const loud = loudWageFromPrintedLines(layer);
      if (loud) return printedResult(loud, textLayerChars);
      const fromLines = printedSampleFromLines(layer);
      if (fromLines && hasLockedSuggestion(fromLines.extractClass, fromLines.fields)) {
        return printedResult(fromLines, textLayerChars);
      }
      const blob = layer.join("\n");
      if (/\bbox\s*5\b/i.test(blob) || /medicare\s*wages/i.test(blob)) {
        const fields = printed?.fields?.medicare_wages || printed?.fields?.box5
          ? printed.fields
          : fieldsFromPrintedLines("w2", layer);
        if (hasLockedSuggestion("w2", fields)) {
          return printedResult({
            extractClass: "w2",
            confidence: printed?.confidence ?? 0.94,
            fields,
          }, textLayerChars);
        }
      }
      const stubFields = fieldsFromPrintedLines("paystub", layer);
      const w2Fields = fieldsFromPrintedLines("w2", layer);
      const w2Page =
        hint === "w2" ||
        /\bw2\b|w-2/i.test(filename ?? "") ||
        (/\bw-?2\b/i.test(blob) && /medicare\s*wages/i.test(blob));
      if (w2Page && hasLockedSuggestion("w2", w2Fields)) {
        return printedResult({
          extractClass: "w2",
          confidence: 0.94,
          fields: w2Fields,
        }, textLayerChars);
      }
      if (!w2Page && hasLockedSuggestion("paystub", stubFields)) {
        return printedResult({
          extractClass: "paystub",
          confidence: 0.94,
          fields: stubFields,
        }, textLayerChars);
      }
      const loudId = loudIdFromPrintedLines(layer);
      if (loudId) return printedResult(loudId, textLayerChars);
      const loudContract =
        loudContractFromPrintedLines(layer) || loudContractFromPrintedLines([layer.join(" ")]);
      if (loudContract) return printedResult(loudContract, textLayerChars);
      if (hint === "purchase_contract") {
        const hintedContract = fieldsFromPrintedLines("purchase_contract", layer);
        if (hasLockedSuggestion("purchase_contract", hintedContract)) {
          return printedResult(
            { extractClass: "purchase_contract", confidence: 0.94, fields: hintedContract },
            textLayerChars,
          );
        }
      }
      if (hint === "government_id") {
        const hintedId = fieldsFromPrintedLines("government_id", layer);
        if (hasLockedSuggestion("government_id", hintedId)) {
          return printedResult(
            { extractClass: "government_id", confidence: 0.94, fields: hintedId },
            textLayerChars,
          );
        }
      }
      if (printed && hasLockedSuggestion(printed.extractClass, printed.fields)) {
        return printedResult(printed, textLayerChars);
      }
      const collapsed = [layer.join(" ")];
      const collapsedCover = loudCoverFromPrintedLines(collapsed);
      if (collapsedCover) return printedResult(collapsedCover, textLayerChars);
      const collapsedTranscript = loudTranscriptFromPrintedLines(collapsed);
      if (collapsedTranscript) return printedResult(collapsedTranscript, textLayerChars);
      const collapsedContract = loudContractFromPrintedLines(collapsed);
      if (collapsedContract) return printedResult(collapsedContract, textLayerChars);
      return unreadOrGrokPage(
        bytes,
        mediaType,
        adapter,
        hint,
        filename,
        "unmapped-text",
        textLayerChars,
      );
    }
    const charCount = pdfTextLayerCharCount(bytes);
    if (charCount > 0) {
      return unreadOrGrokPage(
        bytes,
        mediaType,
        adapter,
        hint,
        filename,
        "unmapped-text",
        charCount,
      );
    }
    const images = readPdfEmbeddedImages(bytes);
    for (const image of images) {
      const fromPixels = readPrintedSample(image.bytes);
      if (fromPixels && hasLockedSuggestion(fromPixels.extractClass, fromPixels.fields)) {
        return printedResult(fromPixels, textLayerChars);
      }
    }
    const grok = await grokPageRead(bytes, mediaType, adapter, hint, filename);
    if (grok && !grok.failed && hasLockedSuggestion(grok.extractClass, grok.fields)) {
      return { ...grok, textLayerChars };
    }
    return unreadResult(grok?.extractClass ?? "other", filename, "no-text-layer", textLayerChars);
  }
  const page = await classifyAndExtractPage(bytes, mediaType, adapter, hint);
  const lockedPage = {
    ...page,
    fields:
      page.extractClass === "tax_return"
        ? lockTaxReturnPageReadFields(page.fields)
        : lockFirstSessionFields(page.extractClass, page.fields),
  };
  const bankHint = hint === "bank_statement" || lockedPage.extractClass === "bank_statement";
  if (
    !lockedPage.failed &&
    (isFirstSessionClass(lockedPage.extractClass) || bankHint) &&
    !(bankHint
      ? looksLikeBankFields(lockedPage.fields)
      : hasLockedSuggestion(lockedPage.extractClass, lockedPage.fields))
  ) {
    return withTextChars(
      {
        ...lockedPage,
        extractClass: bankHint ? "bank_statement" : lockedPage.extractClass,
        failed: true,
        warnings: [...lockedPage.warnings, "failed"],
      },
      bytes,
      mediaType,
    );
  }
  return withTextChars(lockedPage, bytes, mediaType);
}
