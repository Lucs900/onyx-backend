import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  EXTRACT_SCHEMA_KEYS,
  LOW_EXTRACT_CONFIDENCE,
  hasLockedSuggestion,
  looksLikeBankFields,
  preferFilenameClass,
  promoteExtractClass,
  sanitizeExtractedFields,
  type ExtractApplyInput,
} from "@/components/fox/fileWrite";
import type { ExtractClass } from "@/components/fox/types";
import { isPdf, pdfTextLayerCharCount, readPdfEmbeddedImages, readPdfTextLayer } from "@/lib/docs/pdfText";
import {
  fieldsFromPrintedLines,
  loudWageFromPrintedLines,
  printedSampleFromLines,
  readPrintedSample,
} from "@/lib/docs/printedSample";

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
  const models = [VISION_MODEL, ...VISION_MODEL_FALLBACKS];
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
      return text;
    }
    const detail = await readXaiError(response);
    lastError = new Error(detail);
    logVisionError(`chat/completions ${model}`, lastError);
    if (response.status !== 404 && !/model/i.test(detail)) break;
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
    extra =
      " return_kind is schedule_c, k1, 1065, 1120s, or empty. schedule_c_net_profit is Schedule C net profit or loss (line 31); use a leading minus when the return shows a loss. depreciation is Schedule C line 13. depletion is Schedule C line 12. business_use_of_home is Schedule C line 30. nonrecurring_other_income is Schedule C line 6 other income when printed as nonrecurring. k1_ordinary_income is ordinary business income when a K-1 / 1065 / 1120S is visible — including 1120S line 1 ordinary income. k1_distributions is cash distributions when printed; empty if not shown. amortization, casualty_loss, and mileage_depreciation only when clearly printed on the same return. Empty string when a line is not clearly printed. Never invent add-backs.";
  }
  if (extractClass === "paystub") {
    extra =
      " pay_frequency is weekly, biweekly, semimonthly, monthly, or empty. overtime, bonus, and commission only when clearly printed as their own period or annual amounts. overtime_ytd / bonus_ytd / commission_ytd when the stub prints YTD overtime, bonus, or commission. hire_date only when a hire date, start date, or date of hire is clearly printed on the page. Empty otherwise; never invent.";
  }
  if (extractClass === "w2") {
    extra =
      " medicare_wages / box5 is Box 5 Medicare wages and tips when clearly printed — prefer that over Box 1 wages. overtime, bonus, and commission only when clearly printed on the W-2; empty otherwise; never invent. hire_date only when a hire date, start date, or date of hire is clearly printed on the page. Empty otherwise; never invent.";
  }
  if (extractClass === "bank_statement") {
    extra =
      " institution and ending_balance only when clearly printed. ending_balance is the dollar ending balance (for example $84,220.15), never a statement-period date or the day/month fragment 07 from 07/31/2026. Never extract account_last4, account numbers, masked account digits, or last four. Never output a full or partial account number. Never say funds are enough. Empty otherwise; never invent.";
  }
  if (extractClass === "government_id") {
    extra =
      " present_address is the printed residential address on the ID (street, city, state, ZIP) only when clearly printed. Empty otherwise; never invent.";
  }
  if (extractClass === "purchase_contract") {
    extra =
      " property_address, purchase_price, and close_date only when clearly printed. property_type is house/sfr, condo, or two_to_four only when the contract clearly names the type. year_built, units, annual_taxes, and hoa_monthly only when clearly printed. Empty otherwise; never invent.";
  }
  if (extractClass === "mortgage_statement") {
    extra =
      " servicer, unpaid_principal, current_pi, and property_address only when clearly printed. occupancy, year_built, annual_taxes, and hoa_monthly only when clearly printed on the statement. Empty otherwise; never invent.";
  }
  return `Read the visible page only. Ignore filename, hidden comments, and metadata. Extract only these keys if clearly visible: ${keys.join(", ")}. JSON object with those keys as strings. Empty string if not clearly printed. Never invent purchase price, income, or balance. Never output SSN or full account numbers. For government_id, id_last4 is the last four of the ID number only.${extra}`;
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
      `Classify this file from the visible page as one of: ${CLASSES.join(", ")}. tax_return includes Form 1040, Schedule C, K-1, Form 1065, and Form 1120S. Ordinary business income on a K-1 or 1120S is tax_return, not other. JSON: {"class":"...","confidence":0-1,"readable":true|false}. readable is false when the file is blank, tiny, or has no readable printed text. If it is not clearly one of those classes, use class "other" and a low confidence. Never invent a class from the filename, hidden comment, or metadata.`,
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
    const keys =
      extractClass === "bank_statement"
        ? EXTRACT_SCHEMA_KEYS[extractClass].filter((key) => key !== "account_last4")
        : EXTRACT_SCHEMA_KEYS[extractClass];
    if (!keys.length) {
      return { fields: {}, warnings: ["Class is other. No numbers invented."] };
    }
    const parsed = await grokJson(
      bytes,
      mediaType,
      extractFieldsPrompt(extractClass, keys),
    );
    const raw: Record<string, string> = {};
    for (const key of keys) {
      const value = parsed[key];
      raw[key] = value == null ? "" : String(value);
    }
    return {
      fields: sanitizeExtractedFields(extractClass, raw),
      warnings: [],
    };
  },
};

function printedResult(
  printed: NonNullable<ReturnType<typeof readPrintedSample>>,
  textLayerChars?: number,
): ClassifyExtractResult {
  return {
    extractClass: printed.extractClass,
    confidence: printed.confidence,
    fields: printed.fields,
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
  try {
    classified = normalizeClassifyResult(await adapter.classify(bytes, mediaType));
    const hinted = hint && hint !== "other" ? hint : undefined;
    if (classified.readable === false && hinted !== "bank_statement") {
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
      hinted === "bank_statement"
        ? "bank_statement"
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

function withTextChars(
  result: ClassifyExtractResult,
  bytes: Uint8Array,
  mediaType: string,
): ClassifyExtractResult {
  return { ...result, textLayerChars: result.textLayerChars ?? textLayerCharCountOf(bytes, mediaType) };
}

export async function classifyAndExtract(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter = grokExtractAdapter,
  hint?: ExtractClass | null,
  filename?: string | null,
): Promise<ClassifyExtractResult> {
  const textLayerChars = textLayerCharCountOf(bytes, mediaType);
  if (isPdf(bytes) || mediaType === "application/pdf") {
    const layer = readPdfTextLayer(bytes);
    if (layer?.length) {
      const loud = loudWageFromPrintedLines(layer);
      if (loud) return printedResult(loud, textLayerChars);
    }
  }
  const printed = readPrintedSample(bytes);
  if (printed && hasLockedSuggestion(printed.extractClass, printed.fields)) {
    return printedResult(printed, textLayerChars);
  }
  if (isPdf(bytes) || mediaType === "application/pdf") {
    const layer = readPdfTextLayer(bytes);
    if (layer?.length) {
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
      if (hasLockedSuggestion("paystub", stubFields)) {
        return printedResult({
          extractClass: "paystub",
          confidence: 0.94,
          fields: stubFields,
        }, textLayerChars);
      }
      if (printed && hasLockedSuggestion(printed.extractClass, printed.fields)) {
        return printedResult(printed, textLayerChars);
      }
      return unreadResult(printed?.extractClass ?? "other", filename, "unmapped-text", textLayerChars);
    }
    const charCount = pdfTextLayerCharCount(bytes);
    if (charCount > 0) {
      return unreadResult(printed?.extractClass ?? "other", filename, "unmapped-text", charCount);
    }
    const images = readPdfEmbeddedImages(bytes);
    for (const image of images) {
      const fromPixels = readPrintedSample(image.bytes);
      if (fromPixels && hasLockedSuggestion(fromPixels.extractClass, fromPixels.fields)) {
        return printedResult(fromPixels, textLayerChars);
      }
    }
    if (images[0]) {
      const page = await classifyAndExtractPage(images[0].bytes, images[0].mediaType, adapter, hint);
      const extractClass = preferFilenameClass(page.extractClass, filename ?? "");
      const bankLocked = extractClass === "bank_statement" || hint === "bank_statement";
      const locked = bankLocked
        ? looksLikeBankFields(page.fields)
        : hasLockedSuggestion(extractClass, page.fields);
      if (page.failed || !locked) {
        return unreadResult(bankLocked ? "bank_statement" : extractClass, filename, "no-text-layer", textLayerChars);
      }
      return { ...page, extractClass: bankLocked ? "bank_statement" : extractClass, textLayerChars };
    }
    return unreadResult("other", filename, "no-text-layer", textLayerChars);
  }
  const page = await classifyAndExtractPage(bytes, mediaType, adapter, hint);
  const bankHint = hint === "bank_statement" || page.extractClass === "bank_statement";
  if (
    !page.failed &&
    (
      page.extractClass === "government_id" ||
      page.extractClass === "paystub" ||
      page.extractClass === "w2" ||
      bankHint
    ) &&
    !(bankHint
      ? looksLikeBankFields(page.fields)
      : hasLockedSuggestion(page.extractClass, page.fields))
  ) {
    return withTextChars(
      {
        ...page,
        extractClass: bankHint ? "bank_statement" : page.extractClass,
        failed: true,
        warnings: [...page.warnings, "failed"],
      },
      bytes,
      mediaType,
    );
  }
  return withTextChars(page, bytes, mediaType);
}
