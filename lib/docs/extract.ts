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

function asClass(value: unknown): ExtractClass {
  return CLASSES.includes(value as ExtractClass) ? (value as ExtractClass) : "other";
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
      `Classify this file as one of: ${CLASSES.join(", ")}. JSON: {"class":"...","confidence":0-1,"readable":true|false}. readable is false when the file is blank, tiny, or has no readable printed text. If it is not clearly one of those classes, use class "other" and a low confidence. Never invent a class from the filename.`,
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
): Promise<ClassifyExtractResult> {
  let classified: ClassifyResult | null = null;
  try {
    classified = await adapter.classify(bytes, mediaType);
    if (classified.readable === false) {
      return {
        extractClass: classified.class,
        confidence: classified.confidence,
        fields: {},
        warnings: ["failed"],
        failed: true,
      };
    }
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
