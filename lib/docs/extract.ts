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
  renderPdfPage,
} from "@/lib/docs/pdfText";
import {
  overlayW2MedicareFromPage,
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
import {
  classifyPageByFormHeader,
  fieldsAllowedForClass,
  pickForm1040Page,
  pickForm1065Page,
  pickForm1120sPage,
  pickW2Pages,
  type ClassifiedTaxPage,
  type TaxFormClass,
} from "@/lib/docs/formHeader";

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
      " Locked schema only: employer_name, tax_year, medicare_wages / box5 (Box 5 Medicare wages and tips), wages optional (Box 1). medicare_wages is the dollar amount printed in Box 5 — never the box number 5, never $5 because the label is 5. If the Box 5 cell is clipped or unreadable, hunt the SAME page for “Medicare wages” / “Medicare Wages Box 5 of W-2” / “Box 5” and use that dollar line. Never use “Reported W-2 Wages” (that is Box 1 after 401(k)). Never use Box 1 when Box 5 or Medicare wages is on the page. Prefer Box 5 over Box 1. Never output SSN. overtime, bonus, and commission only when clearly printed; empty otherwise; never invent.";
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
  return `Read the visible page image. Same locked-schema path as a W-2 page. Ignore filename, hidden comments, and metadata. Extract only these keys if clearly printed: ${keys.join(", ")}. JSON object with those keys as strings. Empty string if not clearly printed. On a Form 1040 face: tax_year, full_name (both taxpayers on a joint return), and wages from line 1z (Wages, salaries, tips, etc.) or line 1a (Total amount from Form(s) W-2, box 1) when printed. Never line 1b household employee wages. wages are the household-total wage signal, never qualifying income. Leave Schedule E / K-1 keys empty on the 1040 face. schedule_e_rents_received is the SUM of Schedule E Part I line 3 Rents received across every property column (A + B + C). Dollar amount only — never form line number 3. schedule_e_cash_expenses is the SUM of cash operating expenses only across every property column. Cash operating expenses INCLUDE advertising, auto and travel, cleaning and maintenance, commissions, legal and professional fees, management fees, other interest, repairs, supplies, utilities, and other expenses that are not HOA. Cash operating expenses NEVER INCLUDE mortgage interest (line 12), taxes (line 16), insurance (line 9), HOA, or depreciation (line 18). Never use line 21 Income or (loss). Never use line 26. Never use line 20 total expenses. schedule_e_property_address is every Part I property street as printed, separated by semicolons. schedule_e_part2_names are partnership or S corporation names on Schedule E Part II only — a map, not income. Never line 32. Never nonpassive loss allowed. Never treat Part II totals as k1_ordinary_income. k1_ordinary_income is Box 1 ordinary business income or loss on a Schedule K-1 (Form 1065) or Schedule K-1 (Form 1120-S) page only. Never a Schedule E Part II page. Use a leading minus when the K-1 shows a loss or a parenthetical. Never invent a name that is not printed. Never use form line numbers as dollar amounts. Never invent. Never output SSN, AGI, EIN, or a social security number.`;
}

const SCHEDULE_E_PART1_PROMPT = `Read this Schedule E Part I page image only. JSON only.

Locked cash is rents minus cash operating expenses. Not line 21. Not line 26. Not total expenses.

Return:
{"properties":[{"street":"","rents":"","cash_operating":""}]}

Rules:
- One object per Part I property column (A, B, C).
- street is the printed property street (for example 956-958 Hacienda Ave Campbell).
- rents is line 3 Rents received for that column. Dollar amount only. Never the line number 3.
- cash_operating is cash operating expenses for that column only.
- Cash operating INCLUDE: advertising, auto and travel, cleaning and maintenance, commissions, legal and professional fees, management fees, other interest, repairs, supplies, utilities, and other that is not HOA.
- Cash operating NEVER INCLUDE: mortgage interest (line 12), taxes (line 16), insurance (line 9), HOA, depreciation (line 18).
- Never line 21 Income or (loss). Never line 26. Never line 20 total expenses. Never line 32.
- part2_names (optional sibling key): partnership / S corporation names on Part II only, semicolon-separated. Map, not income. Never line 32. Never nonpassive loss allowed as dollars.
- Empty string if a field is not clearly printed. Invent nothing.`;

function flattenScheduleEPart1(parsed: Record<string, unknown>): Record<string, string> {
  const properties = parsed.properties;
  if (Array.isArray(properties) && properties.length) {
    let rents = 0;
    let cash = 0;
    let sawRents = false;
    let sawCash = false;
    const streets: string[] = [];
    for (const raw of properties) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const street = String(row.street ?? row.address ?? "").trim();
      if (street) streets.push(street);
      const rentN = Number(String(row.rents ?? row.rents_received ?? "").replace(/[$,]/g, ""));
      const cashN = Number(
        String(row.cash_operating ?? row.cash_expenses ?? row.cash_operating_expenses ?? "").replace(/[$,]/g, ""),
      );
      if (Number.isFinite(rentN) && rentN !== 0) {
        rents += rentN;
        sawRents = true;
      }
      if (Number.isFinite(cashN) && cashN !== 0) {
        cash += cashN;
        sawCash = true;
      }
    }
    const fields: Record<string, string> = {};
    if (sawRents) fields.schedule_e_rents_received = String(rents);
    if (sawCash) fields.schedule_e_cash_expenses = String(cash);
    if (streets.length) fields.schedule_e_property_address = streets.join("; ");
    const part2 = String(parsed.part2_names ?? parsed.schedule_e_part2_names ?? "").trim();
    if (part2) fields.schedule_e_part2_names = part2;
    return fields;
  }
  const fields: Record<string, string> = {};
  const rents = String(parsed.schedule_e_rents_received ?? "").trim();
  const cash = String(parsed.schedule_e_cash_expenses ?? "").trim();
  const addr = String(parsed.schedule_e_property_address ?? "").trim();
  if (rents) fields.schedule_e_rents_received = rents;
  if (cash) fields.schedule_e_cash_expenses = cash;
  if (addr) fields.schedule_e_property_address = addr;
  const part2 = String(parsed.part2_names ?? parsed.schedule_e_part2_names ?? "").trim();
  if (part2) fields.schedule_e_part2_names = part2;
  return fields;
}

const FORM_1120S_PROMPT = `Read this Form 1120-S page image only. JSON object with these keys:
tax_year, entity_name, entity_ordinary_income, officer_compensation, ownership_percent, return_kind, business_started.
return_kind is 1120s.
entity_name is the Name of corporation as printed (for example HO & SOY INC). Never a disclaimer, PIN, 8879, footer, or “express or implied”.
entity_ordinary_income is Form 1120-S page 1 line 22 Ordinary business income (loss), or Schedule K line 1. Never line 21 Other deductions. Never line 6 Total income. Never officer compensation. Never line 14 Depreciation. Never an 8879-CORP total.
officer_compensation is line 7 Compensation of officers. Named as wages. Never add it into ordinary.
ownership_percent only when a shareholder percentage is clearly printed. Empty otherwise.
business_started is Date incorporated or Date business started as printed (for example 05-25-2007). Empty if not printed. Never invent.
Do not return EIN, SSN, depreciation, T&E, or other 1084 add-backs from a real 1120-S face. Household ordinary is line 22 / Schedule K line 1 / 12.
Never invent. Empty string if a dollar or name is not clearly printed.`;

const FORM_1065_PROMPT = `Read this Form 1065 page image only. JSON object with these keys:
tax_year, entity_name, entity_ordinary_income, ownership_percent, return_kind, business_started.
return_kind is 1065.
entity_name is the Name of partnership as printed (for example Parass Foods LLC). Never a disclaimer, PIN, 8879, footer, or “express or implied”.
entity_ordinary_income is Form 1065 page 1 line 23 Ordinary business income (loss), or Schedule K line 1. Keep the printed sign. A loss in parentheses is negative. Never line 9 Salaries and wages. Never line 21 Other deductions. Never line 22 Total deductions. Never guaranteed payments unless Box 4 / a guaranteed-payment line is clearly printed. Never employee wages as partner income.
ownership_percent only when a partner percentage is clearly printed on this page. Empty otherwise.
business_started is Date business started as printed (for example 05-25-2007). Empty if not printed. Never invent.
Do not return EIN, SSN, line 9 wages, or invented K-1 dollars. Company ordinary is not one partner’s qualifying income.
Never invent. Empty string if a dollar or name is not clearly printed.`;

const FORM_K1_PROMPT = `Read this Schedule K-1 page image only. JSON object with these keys:
tax_year, entity_name, k1_ordinary_income, ownership_percent, k1_partner_name.
k1_ordinary_income is Box 1 Ordinary business income (loss). Keep the printed sign. A loss in parentheses is negative. Never Box 14 self-employment earnings. Never capital-account current year net income unless Box 1 is blank. Never guaranteed payments (Box 4) as Box 1. Never distributions.
ownership_percent is the partner’s Item J ending profit percent, or the shareholder’s current year allocation / stock-ownership percent. 90.0000000 % is 90. 10.0000000 % is 10. Empty if no percent is printed.
k1_partner_name is the partner or shareholder name in Part II (for example Sunita Singh). Never SSN. Never EIN. Never the partnership name.
entity_name is the partnership or S corporation name. Never a partner name. Never SSN. Never EIN.
Never invent. Empty string if a dollar or name is not clearly printed.`;

const FORM_1040_HOUSEHOLD_WAGES_PROMPT = `Read this Form 1040 page image only. JSON object with one key: wages.
wages is the dollar amount printed on line 1z (Wages, salaries, tips, etc. Add lines 1a through 1h) or, if 1z is blank, line 1a (Total amount from Form(s) W-2, box 1).
Never line 1b Household employee wages. Never a form line number. Never invent. Empty string if that dollar amount is not clearly printed.`;

const GROK_FORM_HEADER_PROMPT = `Read this IRS tax page image. Classify the PRIMARY form printed at the top.

Return only:
{"form":"form_8879"|"form_1040"|"form_1120s"|"form_1065"|"schedule_e"|"schedule_c"|"k1"|"w2"|"other"}

Rules:
- Form 8879, 8879-S, 8879-CORP, or IRS e-file Signature / Authorization → form_8879. 8879 is not a 1040 and not an 1120-S.
- Form 1120-S U.S. Income Tax Return for an S Corporation, or Schedule K (Form 1120-S) → form_1120s. This is an entity return, not a paystub, not a 1040. A filename with 1120 is not enough — read the printed header.
- Form 1065 U.S. Return of Partnership Income, or Schedule K (Form 1065) → form_1065. A filename with 1120 is not a Form 1120-S. Schedule K-1 is k1, not form_1065.
- Form 1040 U.S. Individual Income Tax Return → form_1040.
- Form W-2 / Wage and Tax Statement → w2. A 1040 line that mentions W-2 is still form_1040.
- Schedule E Supplemental Income, including Part II partnerships / S corporations → schedule_e. A Schedule E mention of Schedule K-1 is not a K-1 form. Never classify Part II as k1.
- Schedule C Profit or Loss → schedule_c.
- Schedule K-1 (Form 1065) or Schedule K-1 (Form 1120-S) with Partner’s / Shareholder’s Share → k1. Do not string-seal “Got the 2024 K-1” from a Schedule E header.
- Disclaimer, PIN, footer, bookmark, transmittal, or “express or implied” pages are other — never a paystub.
- Missing Form 1040 on this page is not a missing Form 1040 in the packet. Hunt every page.
- Invent nothing.`;

function asTaxFormClass(value: unknown): TaxFormClass {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (
    raw === "form_8879" ||
    raw === "8879" ||
    raw === "form_8879s" ||
    raw === "8879s" ||
    raw === "form_8879_corp" ||
    raw === "8879_corp" ||
    raw === "8879corp"
  ) {
    return "form_8879";
  }
  if (raw === "form_1040" || raw === "1040") return "form_1040";
  if (raw === "form_1120s" || raw === "1120s" || raw === "1120_s" || raw === "form_1120_s") return "form_1120s";
  if (raw === "form_1065" || raw === "1065" || raw === "partnership") return "form_1065";
  if (raw === "schedule_e" || raw === "e") return "schedule_e";
  if (raw === "schedule_c" || raw === "c") return "schedule_c";
  if (raw === "k1" || raw === "schedule_k1" || raw === "k_1") return "k1";
  if (raw === "w2" || raw === "w_2" || raw === "form_w2" || raw === "form_w_2") return "w2";
  return "other";
}

function asClass(value: unknown): ExtractClass {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (raw === "k1" || raw === "k_1" || raw === "schedule_k1" || raw === "form_k1") {
    return "tax_return";
  }
  if (raw === "form_1120s" || raw === "1120s" || raw === "1120_s" || raw === "entity_return") {
    return "tax_return";
  }
  if (raw === "form_1065" || raw === "1065" || raw === "partnership") {
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
  if (/\b1040\b|form\s*1040|tax\s*return|1120-?s?|\b1065\b/i.test(name) && !/w-?2|pay.?stub/i.test(name)) {
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
  return /\b1040\b|form\s*1040|tax\s*return|1120-?s?|\b1065\b/i.test(name) && !/w-?2|pay.?stub/i.test(name);
}

function filenameLooksLike1120s(filename?: string | null) {
  return /1120-?s/i.test(String(filename ?? "")) && !/w-?2|pay.?stub/i.test(String(filename ?? ""));
}

/** 1120-S / 1065 in the name. Do not string-seal “Tax Return Documents” as an entity packet. */
function filenameLooksLikeEntityPacket(filename?: string | null) {
  return /1120-?s?|\b1065\b/i.test(String(filename ?? "")) && !/w-?2|pay.?stub/i.test(String(filename ?? ""));
}

/** Named 1040 / W-2 Box 5 / schedule / K-1 line. One dead page is not unread. */
export function packetExtractIsUseful(
  extractClass: ExtractClass,
  fields?: Record<string, string | null | undefined> | null,
): boolean {
  if (hasLockedSuggestion(extractClass, fields)) return true;
  if (hasLockedSuggestion("tax_return", fields)) return true;
  if (hasLockedSuggestion("w2", fields)) return true;
  const value = (key: string) => String(fields?.[key] ?? "").trim();
  if (value("medicare_wages") || value("box5")) return true;
  if (
    value("schedule_e_rents_received") ||
    value("schedule_e_part2_names") ||
    value("k1_ordinary_income") ||
    value("schedule_c_net_profit") ||
    value("entity_ordinary_income")
  ) {
    return true;
  }
  if (value("tax_year") && value("full_name")) return true;
  if (value("wages") && (value("full_name") || value("form_1040") || value("tax_year"))) return true;
  return false;
}

function printedLooksLike1120s(lines?: string[] | null) {
  if (!lines?.length) return false;
  const blob = lines.join("\n");
  return (
    /\bform\s*1120-?s\b/i.test(blob) ||
    /u\.?s\.?\s+income tax return for an s corporation/i.test(blob) ||
    /\bs corporation return\b/i.test(blob)
  );
}

function printedLooksLike1065(lines?: string[] | null) {
  if (!lines?.length) return false;
  const blob = lines.join("\n");
  return (
    /\bform\s*1065\b/i.test(blob) ||
    /u\.?s\.?\s+return of partnership income/i.test(blob) ||
    /\bpartnership return\b/i.test(blob)
  );
}

function rejectPaystubForEntityReturn(
  result: ClassifyExtractResult,
  filename?: string | null,
  lines?: string[] | null,
): ClassifyExtractResult {
  if (result.extractClass !== "paystub" && result.extractClass !== "w2") return result;
  if (
    !filenameLooksLikeEntityPacket(filename) &&
    !printedLooksLike1120s(lines) &&
    !printedLooksLike1065(lines)
  ) {
    return result;
  }
  return unreadResult(preferFilenameClass("tax_return", filename ?? ""), filename, "not-paystub", result.textLayerChars);
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
      `Classify this file from the visible page as one of: ${CLASSES.join(", ")}. tax_return includes Form 1040, a Form 1040 Tax Return Transcript, Schedule C, K-1, Form 1065, and Form 1120-S / S corporation entity return. Ordinary business income on a K-1 or 1120-S is tax_return, not other, not a paystub. Form 8879 / 8879-CORP / PIN / disclaimer / “express or implied” is not a paystub and not an employer. JSON: {"class":"...","confidence":0-1,"readable":true|false}. readable is false when the file is blank, tiny, or has no readable printed text. If it is not clearly one of those classes, use class "other" and a low confidence. Never invent a class from the filename, hidden comment, or metadata.`,
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
    const raw: Record<string, string> = {
      ...flattenScheduleEPart1(parsed),
    };
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null || typeof value === "object") continue;
      if (raw[key]) continue;
      raw[key] = String(value);
    }
    return {
      fields: sanitizeLedgerExtractFields(sanitizeExtractedFields("tax_return", raw)),
      warnings: [],
    };
  },
};

function overlayW2Fields(
  extractClass: ExtractClass,
  fields: Record<string, string>,
  pageText?: string | string[] | null,
): Record<string, string> {
  if (extractClass !== "w2" && extractClass !== "other") return fields;
  return overlayW2MedicareFromPage(fields, pageText);
}

function printedResult(
  printed: NonNullable<ReturnType<typeof readPrintedSample>>,
  textLayerChars?: number,
): ClassifyExtractResult {
  const fields = overlayW2Fields(printed.extractClass, printed.fields);
  const sanitized = sanitizeExtractedFields(printed.extractClass, fields);
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

/** One PDF page → PNG/JPEG for Grok. Same W-2 vision path. Never send application/pdf. */
export async function pageImageForGrok(
  bytes: Uint8Array,
  mediaType: string,
  pageNumber = 1,
): Promise<{ bytes: Uint8Array; mediaType: string } | null> {
  if (mediaType.startsWith("image/") && !/heic|heif/i.test(mediaType)) {
    return { bytes, mediaType: mediaType === "image/jpg" ? "image/jpeg" : mediaType };
  }
  if (isPdf(bytes) || mediaType === "application/pdf") {
    const page = await renderPdfPage(bytes, pageNumber);
    if (page && drawnPageHasInk(page)) return page;
    if (pageNumber === 1) {
      const embedded = readPdfEmbeddedImages(bytes).filter((image) => image.bytes.length >= 4_000);
      if (embedded[0]) {
        return embedded.reduce((best, image) => (image.bytes.length > best.bytes.length ? image : best));
      }
    }
    if (page && page.bytes.length >= 4_000) return page;
    if (page) return page;
  }
  return null;
}

function uniqueWalkPages(pages: Array<ClassifiedTaxPage | undefined>): ClassifiedTaxPage[] {
  const seen = new Set<number>();
  const next: ClassifiedTaxPage[] = [];
  for (const page of pages) {
    if (!page || seen.has(page.page)) continue;
    seen.add(page.page);
    next.push(page);
  }
  return next;
}

async function grokPageRead(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
  hint?: ExtractClass | null,
  filename?: string | null,
): Promise<ClassifyExtractResult | null> {
  const walked =
    isPdf(bytes) || mediaType === "application/pdf"
      ? await classifyTaxReturnPages(bytes, adapter, filename)
      : [];
  const entityPage = pickForm1120sPage(walked) ?? pickForm1065Page(walked);
  const huntPages = uniqueWalkPages([
    entityPage,
    ...walked.filter((item) => item.klass === "form_1040"),
    ...walked.filter((item) => item.klass === "form_8879"),
    ...pickW2Pages(walked),
    ...walked.filter(
      (item) =>
        item.klass === "schedule_e" ||
        item.klass === "schedule_c" ||
        item.klass === "k1" ||
        item.klass === "form_1120s" ||
        item.klass === "form_1065",
    ),
  ]);
  if (!huntPages.length) {
    huntPages.push({ page: 1, klass: "other", text: "", lines: [] });
    for (const later of walked) {
      if (later.page !== 1) huntPages.push(later);
    }
  }
  console.info("[docs/extract] page-read hunt", {
    filename: filename ?? "",
    pages: huntPages.map((item) => `${item.page}:${item.klass}`).join(","),
    hint: hint ?? null,
  });
  let page: ClassifyExtractResult | null = null;
  let extractClass: ExtractClass = hint && hint !== "other" ? hint : "tax_return";
  let fields: Record<string, string> = {};
  for (const target of huntPages) {
    const image = await pageImageForGrok(bytes, mediaType, target.page);
    if (!image) continue;
    const next = await classifyAndExtractPage(image.bytes, image.mediaType, adapter, hint);
    const nextClass = preferFilenameClass(next.extractClass, filename ?? "");
    const entityFields = Boolean(
      entityPage || String(next.fields?.entity_ordinary_income ?? "").trim(),
    );
    const nextFields =
      nextClass === "tax_return"
        ? entityFields
          ? Object.fromEntries(
              Object.entries(next.fields ?? {}).flatMap(([key, value]) => {
                const raw = String(value ?? "").trim();
                return raw ? [[key, raw] as const] : [];
              }),
            )
          : lockTaxReturnPageReadFields(next.fields)
        : lockFirstSessionFields(nextClass, next.fields);
    page = next;
    extractClass = nextClass;
    fields = nextFields;
    if (packetExtractIsUseful(nextClass, nextFields)) break;
  }
  if (!page) return null;
  console.info("[docs/extract] page-read result", {
    filename: filename ?? "",
    extractClass,
    failed: Boolean(page.failed),
    keys: Object.keys(fields),
  });
  const bankLocked = extractClass === "bank_statement" || hint === "bank_statement";
  const merged = await mergeTaxReturnLedgerFields(
    {
      ...page,
      extractClass: bankLocked ? "bank_statement" : extractClass,
      fields,
      failed: false,
    },
    bytes,
    mediaType,
    adapter,
    walked,
    filename,
  );
  if (packetExtractIsUseful(merged.extractClass, merged.fields) || (bankLocked && looksLikeBankFields(merged.fields))) {
    return {
      ...merged,
      failed: false,
      warnings: (merged.warnings ?? []).filter((item) => item !== "failed"),
    };
  }
  return {
    extractClass: bankLocked ? "bank_statement" : extractClass,
    confidence: page.confidence,
    fields: {},
    warnings: ["failed"],
    failed: true,
  };
}

const TAX_RETURN_PACKET_GROK_PAGE_CAP = 8;

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

const TAX_RETURN_WALK_PAGE_CAP = 24;
const TAX_RETURN_1120S_WALK_PAGE_CAP = 40;
const taxReturnWalkCache = new WeakMap<Uint8Array, Promise<ClassifiedTaxPage[]>>();

function taxReturnWalkPageCap(filename?: string | null) {
  return shouldGrokTaxReturnPagesFirst(null, filename) || filenameLooksLikeEntityPacket(filename)
    ? TAX_RETURN_1120S_WALK_PAGE_CAP
    : TAX_RETURN_WALK_PAGE_CAP;
}

function pageLooksLikePacketCoverNoise(text: string) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return true;
  return /\b(bookmark|transmittal|table of contents|attached documents|see attached|index of forms)\b/i.test(
    t,
  );
}

async function classifyTaxReturnPages(
  bytes: Uint8Array,
  adapter: DocumentExtractAdapter,
  filename?: string | null,
): Promise<ClassifiedTaxPage[]> {
  if (!filenameLooksLikeEntityPacket(filename)) {
    const cached = taxReturnWalkCache.get(bytes);
    if (cached) return cached;
    const pending = classifyTaxReturnPagesUncached(bytes, adapter, filename);
    taxReturnWalkCache.set(bytes, pending);
    return pending;
  }
  return classifyTaxReturnPagesUncached(bytes, adapter, filename);
}

async function classifyTaxReturnPagesUncached(
  bytes: Uint8Array,
  adapter: DocumentExtractAdapter,
  filename?: string | null,
): Promise<ClassifiedTaxPage[]> {
  const cap = taxReturnWalkPageCap(filename);
  const printed = await readPdfJsTextPages(bytes, cap);
  const slots: Array<{ page: number; lines: string[]; text: string }> = printed?.length
    ? printed.map((page) => ({
        page: page.page,
        lines: page.lines,
        text: page.lines.join("\n"),
      }))
    : Array.from(
        { length: Math.max(1, Math.min((await pdfPageCount(bytes)) || 1, cap)) },
        (_, index) => ({ page: index + 1, lines: [] as string[], text: "" }),
      );
  const walked: ClassifiedTaxPage[] = [];
  for (const slot of slots) {
    let klass = classifyPageByFormHeader(slot.text);
    if (
      klass === "other" &&
      adapter === grokExtractAdapter &&
      pageLooksLikePacketCoverNoise(slot.text)
    ) {
      const image = await renderPdfPage(bytes, slot.page);
      if (image?.mediaType.startsWith("image/")) {
        try {
          const parsed = await grokJson(image.bytes, image.mediaType, GROK_FORM_HEADER_PROMPT);
          klass = asTaxFormClass(parsed.form ?? parsed.class);
        } catch (error) {
          logVisionError("classifyFormHeader", error);
        }
      }
    }
    walked.push({ ...slot, klass });
  }
  return walked;
}

async function grokHouseholdWagesFrom1040Page(
  bytes: Uint8Array,
  pageNumber: number,
  adapter: DocumentExtractAdapter,
): Promise<Record<string, string>> {
  const image = await renderPdfPage(bytes, pageNumber);
  if (!image?.mediaType.startsWith("image/")) return {};
  let cleaned: Record<string, string> = {};
  if (adapter.extractLedger) {
    try {
      const extracted = await adapter.extractLedger(image.bytes, image.mediaType);
      cleaned = fieldsAllowedForClass(
        "form_1040",
        sanitizeLedgerExtractFields(extracted.fields ?? {}),
      );
    } catch (error) {
      logVisionError("form1040HouseholdWagesLedger", error);
    }
  }
  if (cleaned.wages || adapter !== grokExtractAdapter) return cleaned;
  try {
    const parsed = await grokJson(image.bytes, image.mediaType, FORM_1040_HOUSEHOLD_WAGES_PROMPT);
    return {
      ...cleaned,
      ...fieldsAllowedForClass(
        "form_1040",
        sanitizeLedgerExtractFields({ wages: String(parsed.wages ?? "") }),
      ),
    };
  } catch (error) {
    logVisionError("form1040HouseholdWages", error);
    return cleaned;
  }
}

async function householdWagesFromWalk(
  bytes: Uint8Array,
  walked: ClassifiedTaxPage[],
  adapter: DocumentExtractAdapter,
): Promise<Record<string, string>> {
  const face = pickForm1040Page(walked);
  if (!face) return {};
  return grokHouseholdWagesFrom1040Page(bytes, face.page, adapter);
}

function ownershipScore(value?: string) {
  const cleaned = String(value ?? "")
    .replace(/%/g, "")
    .replace(/,/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 0;
}

function ordinaryAbs(value?: string) {
  const n = Number(String(value ?? "").replace(/[$,\s]/g, "").replace(/[()]/g, (ch) => (ch === "(" ? "-" : "")));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function assignPrimaryOtherK1(merged: Record<string, string>, k1s: Record<string, string>[]) {
  if (!k1s.length) return;
  const scored = [...k1s].sort((left, right) => {
    const pct = ownershipScore(right.ownership_percent) - ownershipScore(left.ownership_percent);
    if (pct) return pct;
    return ordinaryAbs(right.k1_ordinary_income) - ordinaryAbs(left.k1_ordinary_income);
  });
  assignLedgerKeepFirst(merged, scored[0] ?? {});
  const other = scored[1];
  if (!other?.k1_ordinary_income) return;
  merged.other_k1_ordinary_income = other.k1_ordinary_income;
  if (other.ownership_percent) merged.other_k1_ownership_percent = other.ownership_percent;
  if (other.k1_partner_name) merged.other_k1_partner_name = other.k1_partner_name;
}

function printedLedgerFromWalked(walked: ClassifiedTaxPage[]): Record<string, string> {
  const merged: Record<string, string> = {};
  const k1s: Record<string, string>[] = [];
  for (const page of walked) {
    if (page.klass === "other") continue;
    const lines = page.lines.length ? page.lines : page.text.split(/\n/);
    const raw = incomeLedgerFieldsFromPrintedLines(lines);
    const entity =
      page.klass === "form_1120s" || page.klass === "form_1065"
        ? loudEntityReturnFromPrintedLines(lines)
        : null;
    const k1 = page.klass === "k1" ? loudK1FromPrintedLines(lines) : null;
    const w2 = page.klass === "w2" ? loudWageFromPrintedLines(lines) : null;
    const allowed = fieldsAllowedForClass(page.klass, {
      ...raw,
      ...(entity?.fields ?? {}),
      ...(k1?.fields ?? {}),
      ...(w2?.fields ?? {}),
    });
    if (page.klass === "k1" && allowed.k1_ordinary_income) {
      k1s.push(allowed);
      continue;
    }
    assignLedgerKeepFirst(merged, allowed);
  }
  assignPrimaryOtherK1(merged, k1s);
  return merged;
}

function taxReturnPagesToGrok(walked: ClassifiedTaxPage[]): number[] {
  return walked
    .filter(
      (page) =>
        page.klass === "schedule_e" ||
        page.klass === "k1" ||
        page.klass === "schedule_c" ||
        page.klass === "form_1120s" ||
        page.klass === "form_1065",
    )
    .map((page) => page.page)
    .slice(0, TAX_RETURN_PACKET_GROK_PAGE_CAP);
}

/** Form 1040 wages / year / names win. Later matching classes add Sch E / K-1. Never overwrite with empty. */
function assignLedgerKeepFirst(merged: Record<string, string>, incoming: Record<string, string>) {
  for (const [key, value] of Object.entries(incoming)) {
    const next = String(value ?? "").trim();
    if (!next) continue;
    if (
      (key === "wages" ||
        key === "tax_year" ||
        key === "full_name" ||
        key === "employer_name" ||
        key === "medicare_wages" ||
        key === "box5" ||
        key === "entity_ordinary_income" ||
        key === "k1_ordinary_income" ||
        key === "ownership_percent" ||
        key === "other_k1_ordinary_income" ||
        key === "other_k1_ownership_percent" ||
        key === "k1_partner_name" ||
        key === "other_k1_partner_name" ||
        key === "business_started") &&
      merged[key]
    ) {
      continue;
    }
    merged[key] = next;
  }
}

async function grokScheduleLedgerFields(
  bytes: Uint8Array,
  adapter: DocumentExtractAdapter,
  walked: ClassifiedTaxPage[],
): Promise<Record<string, string>> {
  if (!adapter.extractLedger) return {};
  const targets = taxReturnPagesToGrok(walked);
  const merged: Record<string, string> = {};
  const k1s: Record<string, string>[] = [];
  const take = (klass: TaxFormClass, raw: Record<string, string>) => {
    const allowed = fieldsAllowedForClass(klass, sanitizeLedgerExtractFields(raw));
    if (klass === "k1" && allowed.k1_ordinary_income) {
      k1s.push(allowed);
      return;
    }
    assignLedgerKeepFirst(merged, allowed);
  };
  for (const pageNumber of targets) {
    const image = await renderPdfPage(bytes, pageNumber);
    if (!image?.mediaType.startsWith("image/")) continue;
    const klass = walked.find((page) => page.page === pageNumber)?.klass ?? "other";
    try {
      if (klass === "form_1120s" && adapter === grokExtractAdapter) {
        const parsed = await grokJson(image.bytes, image.mediaType, FORM_1120S_PROMPT);
        const raw: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (value == null || typeof value === "object") continue;
          raw[key] = String(value);
        }
        raw.return_kind = "1120s";
        take(klass, raw);
        continue;
      }
      if (klass === "form_1065" && adapter === grokExtractAdapter) {
        const parsed = await grokJson(image.bytes, image.mediaType, FORM_1065_PROMPT);
        const raw: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (value == null || typeof value === "object") continue;
          raw[key] = String(value);
        }
        raw.return_kind = "1065";
        take(klass, raw);
        continue;
      }
      if (klass === "k1" && adapter === grokExtractAdapter) {
        const parsed = await grokJson(image.bytes, image.mediaType, FORM_K1_PROMPT);
        const raw: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (value == null || typeof value === "object") continue;
          raw[key] = String(value);
        }
        take(klass, raw);
        continue;
      }
      if (klass === "schedule_e" && adapter === grokExtractAdapter) {
        take(klass, flattenScheduleEPart1(await grokJson(image.bytes, image.mediaType, SCHEDULE_E_PART1_PROMPT)));
        continue;
      }
      const extracted = await adapter.extractLedger(image.bytes, image.mediaType);
      take(klass, extracted.fields ?? {});
    } catch (error) {
      logVisionError("extractLedger", error);
    }
  }
  assignPrimaryOtherK1(merged, k1s);
  return merged;
}

async function w2FieldsFromWalk(
  bytes: Uint8Array,
  walked: ClassifiedTaxPage[],
  adapter: DocumentExtractAdapter,
): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};
  for (const page of pickW2Pages(walked)) {
    const lines = page.lines.length ? page.lines : page.text.split(/\n/);
    const printed = loudWageFromPrintedLines(lines);
    assignLedgerKeepFirst(
      merged,
      fieldsAllowedForClass("w2", {
        ...(printed?.fields ?? {}),
      }),
    );
    if (hasLockedSuggestion("w2", merged)) continue;
    const image = await renderPdfPage(bytes, page.page);
    if (!image?.mediaType.startsWith("image/")) continue;
    try {
      const extracted = await adapter.extract(image.bytes, image.mediaType, "w2");
      assignLedgerKeepFirst(merged, fieldsAllowedForClass("w2", extracted.fields ?? {}));
    } catch (error) {
      logVisionError("packetW2Extract", error);
    }
  }
  return merged;
}

async function ledgerFieldsFromWalk(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
  walked?: ClassifiedTaxPage[],
  filename?: string | null,
): Promise<Record<string, string>> {
  const pages = walked ?? (await classifyTaxReturnPages(bytes, adapter, filename));
  const ledger = printedLedgerFromWalked(pages);
  assignLedgerKeepFirst(ledger, await w2FieldsFromWalk(bytes, pages, adapter));
  if (!ledger.wages) {
    assignLedgerKeepFirst(ledger, await householdWagesFromWalk(bytes, pages, adapter));
  }
  if (adapter.extractLedger) {
    assignLedgerKeepFirst(ledger, await grokScheduleLedgerFields(bytes, adapter, pages));
  }
  return ledger;
}

async function mergeTaxReturnLedgerFields(
  result: ClassifyExtractResult,
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
  walked?: ClassifiedTaxPage[],
  filename?: string | null,
): Promise<ClassifyExtractResult> {
  const taxPacket =
    result.extractClass === "tax_return" ||
    filenameLooksLikeEntityPacket(filename) ||
    shouldGrokTaxReturnPagesFirst(null, filename);
  if (!taxPacket) return result;
  try {
    if (await printedLayerLooksLikeIrsTranscript(bytes, mediaType)) return result;
    const pages = walked ?? (await classifyTaxReturnPages(bytes, adapter, filename));
    const ledger = await ledgerFieldsFromWalk(bytes, mediaType, adapter, pages, filename);
    const fields: Record<string, string> = {};
    const ordinary = String(ledger.entity_ordinary_income ?? "").trim();
    const merged = ordinary ? { ...result.fields, ...ledger } : { ...ledger, ...result.fields };
    for (const [key, value] of Object.entries(merged)) {
      if (value) fields[key] = String(value);
    }
    if (pickForm1040Page(pages)) fields.form_1040 = fields.form_1040 || "1";
    if (!Object.keys(ledger).length) {
      return packetExtractIsUseful(result.extractClass, result.fields)
        ? { ...result, failed: false, warnings: (result.warnings ?? []).filter((item) => item !== "failed") }
        : result;
    }
    if (ordinary) {
      fields.return_kind = ledger.return_kind || fields.return_kind || "";
    }
    const useful = packetExtractIsUseful("tax_return", fields);
    return {
      ...result,
      extractClass: "tax_return",
      failed: useful ? false : result.failed,
      confidence: useful ? 0.94 : result.confidence,
      fields,
      warnings: useful ? (result.warnings ?? []).filter((item) => item !== "failed") : result.warnings,
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
    const walked = await classifyTaxReturnPages(bytes, adapter, filename);
    const ledger = sanitizeLedgerExtractFields(
      await ledgerFieldsFromWalk(bytes, mediaType, adapter, walked, filename),
    );
    const saw1040 = Boolean(pickForm1040Page(walked));
    const saw1120s = Boolean(pickForm1120sPage(walked));
    const saw1065 = Boolean(pickForm1065Page(walked));
    const hasRows =
      Boolean(ledger.wages) ||
      Boolean(ledger.schedule_e_rents_received) ||
      Boolean(ledger.schedule_e_part2_names) ||
      Boolean(ledger.k1_ordinary_income) ||
      Boolean(ledger.schedule_c_net_profit) ||
      Boolean(ledger.entity_ordinary_income) ||
      Boolean(ledger.medicare_wages) ||
      Boolean(ledger.box5);
    const pageKind = saw1120s ? "1120s" : saw1065 ? "1065" : "";
    return {
      extractClass: preferFilenameClass("tax_return", filename ?? ""),
      confidence: 0.94,
      fields: {
        ...ledger,
        ...(saw1040 ? { form_1040: "1" } : {}),
        ...(pageKind ? { return_kind: ledger.return_kind || pageKind } : {}),
        packet_read: hasRows ? "schedules" : "empty",
      },
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
    if (page && !page.failed && packetExtractIsUseful(page.extractClass, page.fields)) {
      if (
        filenameLooksLikeEntityPacket(filename) &&
        !String(page.fields?.entity_ordinary_income ?? "").trim() &&
        !String(page.fields?.form_1040 ?? "").trim() &&
        !String(page.fields?.wages ?? "").trim() &&
        !String(page.fields?.medicare_wages ?? page.fields?.box5 ?? "").trim() &&
        !String(page.fields?.schedule_e_rents_received ?? "").trim() &&
        !String(page.fields?.k1_ordinary_income ?? "").trim() &&
        !String(page.fields?.schedule_c_net_profit ?? "").trim()
      ) {
        // 8879 / disclaimer / year-name is not the entity return.
        return null;
      }
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
  if (page && !page.failed && packetExtractIsUseful(page.extractClass, page.fields)) {
    return { ...page, textLayerChars };
  }
  return unreadResult(page?.extractClass ?? "other", filename, extraWarning, textLayerChars);
}

async function classifyAndExtractUnmerged(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter,
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
        return rejectPaystubForEntityReturn(
          printedResult({
            extractClass: "paystub",
            confidence: 0.94,
            fields: stubFields,
          }, textLayerChars),
          filename,
          layer,
        );
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

async function withPageMedicareHunt(
  result: ClassifyExtractResult,
  bytes: Uint8Array,
  mediaType: string,
): Promise<ClassifyExtractResult> {
  if (result.extractClass !== "w2" && result.extractClass !== "other") return result;
  const layer =
    isPdf(bytes) || mediaType === "application/pdf"
      ? await printedLinesForExtract(bytes, mediaType)
      : null;
  if (!layer?.length) return result;
  const rawFields = result.fields ?? {};
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawFields)) {
    if (value == null) continue;
    cleaned[key] = String(value);
  }
  const fields = overlayW2MedicareFromPage(cleaned, layer);
  return {
    ...result,
    fields: sanitizeExtractedFields(result.extractClass === "other" ? "w2" : result.extractClass, fields),
  };
}

export async function classifyAndExtract(
  bytes: Uint8Array,
  mediaType: string,
  adapter: DocumentExtractAdapter = grokExtractAdapter,
  hint?: ExtractClass | null,
  filename?: string | null,
  phase?: ExtractPhase | null,
): Promise<ClassifyExtractResult> {
  const result = await classifyAndExtractUnmerged(
    bytes,
    mediaType,
    adapter,
    hint,
    filename,
    phase,
  );
  const hunted = await withPageMedicareHunt(result, bytes, mediaType);
  const blocked = rejectPaystubForEntityReturn(hunted, filename);
  if (phase === "packet") return blocked;
  return mergeTaxReturnLedgerFields(blocked, bytes, mediaType, adapter, undefined, filename);
}
