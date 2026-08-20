import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  EXTRACT_SCHEMA_KEYS,
  LOW_EXTRACT_CONFIDENCE,
  sanitizeExtractedFields,
  type ExtractApplyInput,
} from "@/components/fox/fileWrite";
import type { ExtractClass } from "@/components/fox/types";

export type ClassifyResult = {
  class: ExtractClass;
  confidence: number;
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

const VISION_MODEL = "grok-2-vision-1212";

function grokClient() {
  const apiKey = process.env.grok_api_key;
  if (!apiKey) {
    throw new Error("grok_api_key is not set");
  }
  return createOpenAI({
    baseURL: "https://api.x.ai/v1",
    apiKey,
  });
}

function filePart(bytes: Uint8Array, mediaType: string) {
  if (mediaType.startsWith("image/")) {
    return { type: "image" as const, image: bytes, mediaType };
  }
  return { type: "file" as const, data: bytes, mediaType };
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

async function grokJson(
  bytes: Uint8Array,
  mediaType: string,
  prompt: string,
): Promise<Record<string, unknown>> {
  const grok = grokClient();
  const result = await generateText({
    model: grok(VISION_MODEL),
    system:
      "You read mortgage intake documents. Return ONLY JSON. Never invent numbers, names, dates, or balances. Use empty string when unsure. Never include a full SSN or a full account number. ID may include last 4 digits only. Do not output FICO or credit scores.",
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }, filePart(bytes, mediaType)],
      },
    ],
    temperature: 0,
    maxOutputTokens: 700,
  });
  const parsed = parseJsonObject(result.text || "");
  if (!parsed) {
    throw new Error("Model did not return JSON");
  }
  return parsed;
}

function asClass(value: unknown): ExtractClass {
  return CLASSES.includes(value as ExtractClass) ? (value as ExtractClass) : "other";
}

function asConfidence(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export const grokExtractAdapter: DocumentExtractAdapter = {
  async classify(bytes, mediaType) {
    const parsed = await grokJson(
      bytes,
      mediaType,
      `Classify this file as one of: ${CLASSES.join(", ")}. JSON: {"class":"...","confidence":0-1}. If it is not clearly one of those, use class "other" and a low confidence.`,
    );
    return {
      class: asClass(parsed.class),
      confidence: asConfidence(parsed.confidence),
    };
  },

  async extract(bytes, mediaType, extractClass) {
    const keys = EXTRACT_SCHEMA_KEYS[extractClass];
    if (!keys.length) {
      return { fields: {}, warnings: ["Class is other. No numbers invented."] };
    }
    const parsed = await grokJson(
      bytes,
      mediaType,
      `Extract only these keys if clearly visible: ${keys.join(", ")}. JSON object with those keys as strings. Empty string if not clearly printed. Never invent purchase price, income, or balance. Never output SSN or full account numbers. For government_id, id_last4 is the last four of the ID number only.`,
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

export async function classifyAndExtract(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter = grokExtractAdapter,
): Promise<ExtractApplyInput & { warnings: string[] }> {
  try {
    const classified = await adapter.classify(bytes, mediaType);
    if (classified.class === "other" || classified.confidence < LOW_EXTRACT_CONFIDENCE) {
      return {
        extractClass: classified.class,
        confidence: classified.confidence,
        fields: {},
        warnings: ["Low confidence. Document kept. No numbers invented."],
      };
    }
    const extracted = await adapter.extract(bytes, mediaType, classified.class);
    return {
      extractClass: classified.class,
      confidence: classified.confidence,
      fields: extracted.fields,
      warnings: extracted.warnings,
    };
  } catch {
    return {
      extractClass: "other",
      confidence: 0,
      fields: {},
      warnings: ["failed"],
    };
  }
}
