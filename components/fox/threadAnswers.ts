/**
 * Write client answers already in the thread onto empty File slots.
 * Never invent. Never overwrite a filled slot. Never invent a name.
 */
import type { FoxIntakeDraft, FoxMessage } from "./types";
import { CREDIT_WORKSPACE_BUBBLES, INCOME_BUBBLES } from "./types";
import {
  HELOC_FIRST_LIEN_ASK,
  HELOC_LINE_ASK,
  withHelocToolQuote,
  writeFirstLien,
  writeHelocLine,
} from "./heloc";
import { applyCouponChoice } from "./liveCoupon";
import { MONTHLY_DEBTS_ASK, isSkipMonthlyDebtsText, skipMonthlyDebts } from "./monthlyDebts";
import {
  PROPERTY_ADDRESS_ASK,
  PROPERTY_TYPE_ASK,
  parsePropertyType,
  writePropertyType,
  writePropertyZip,
} from "./propertyType";
import { WAGE_DOCS_ASK, skipWageDocs } from "./qualifyingIncome";
import { WHO_ON_LOAN_ASK, parseWhoOnLoan, writeWhoOnLoan } from "./whoOnLoan";

const CREDIT_ASK = "What is your estimated FICO?";
const INCOME_ASK = "How is income earned?";
const PAYSTUB_ASK = "Next is your latest paystub.";
const THIS_ONE = /^this one$/i;

function textOf(message: FoxMessage) {
  return (message.text ?? "").replace(/\s+/g, " ").trim();
}

function parseMoney(text: string) {
  const raw = text.replace(/[$,]/g, "").replace(/\s/g, "");
  if (!/^\d+(\.\d+)?$/.test(raw)) return undefined;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function parseCreditBand(text: string) {
  const trimmed = text.trim();
  const hit = CREDIT_WORKSPACE_BUBBLES.find(
    (item) => item.value === trimmed || item.label === trimmed,
  );
  return hit?.value;
}

function parseZip(text: string) {
  const match = text.trim().match(/\b(\d{5})\b/);
  return match?.[1];
}

function isFoxAsk(message: FoxMessage, ask: string) {
  if (message.role !== "fox") return false;
  const text = textOf(message);
  return text === ask || text.startsWith(ask);
}

function firstClientAfterAsk(
  messages: FoxMessage[],
  ask: string,
  parse: (text: string) => string | number | undefined,
  until?: (message: FoxMessage) => boolean,
) {
  let seenAsk = false;
  for (const message of messages) {
    if (!seenAsk) {
      if (isFoxAsk(message, ask)) seenAsk = true;
      continue;
    }
    if (until?.(message)) break;
    if (message.role !== "client") continue;
    const parsed = parse(textOf(message));
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function hasAmount(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function writeThreadAnswersToFile(draft: FoxIntakeDraft, messages: FoxMessage[]): FoxIntakeDraft {
  let next = draft;
  const lien = firstClientAfterAsk(messages, HELOC_FIRST_LIEN_ASK, parseMoney, (message) =>
    isFoxAsk(message, HELOC_LINE_ASK),
  );
  if (!hasAmount(next.firstLienAmount) && typeof lien === "number") {
    next = writeFirstLien(next, lien);
  }
  const line = firstClientAfterAsk(messages, HELOC_LINE_ASK, parseMoney, (message) =>
    isFoxAsk(message, PROPERTY_TYPE_ASK),
  );
  if (!hasAmount(next.loanAmountValue) && typeof line === "number") {
    next = writeHelocLine(next, line);
  }
  const home = firstClientAfterAsk(messages, PROPERTY_TYPE_ASK, (text) => parsePropertyType(text) ?? undefined);
  if (!next.propertyType && typeof home === "string") {
    next = writePropertyType(next, home as "sfr" | "condo" | "two_to_four");
  }
  const credit = firstClientAfterAsk(messages, CREDIT_ASK, parseCreditBand);
  if (!next.creditBand && typeof credit === "string") {
    next = { ...next, creditBand: credit, creditAsked: true };
  }
  const zip = firstClientAfterAsk(messages, PROPERTY_ADDRESS_ASK, parseZip);
  if (!next.propertyZip?.trim() && typeof zip === "string") {
    next = writePropertyZip(next, zip);
  }
  if (!next.liveCouponSettled) {
    const afterQuote = messages.findIndex(
      (message) => message.role === "fox" && /interest-only\s+\$?\d/i.test(textOf(message)),
    );
    const choice =
      afterQuote >= 0 ? messages.slice(afterQuote + 1).find((message) => message.role === "client") : undefined;
    if (choice && THIS_ONE.test(textOf(choice))) {
      next = applyCouponChoice(next, "this");
    }
  }
  const who = firstClientAfterAsk(messages, WHO_ON_LOAN_ASK, (text) => parseWhoOnLoan(text));
  if (!next.whoOnLoan && (who === "just-me" || who === "yes" || who === "skip")) {
    next = writeWhoOnLoan(next, who);
  }
  const income = firstClientAfterAsk(messages, INCOME_ASK, (text) => {
    const hit = INCOME_BUBBLES.find((item) => item.label.toLowerCase() === text.toLowerCase() || item.value === text.toLowerCase());
    return hit?.value;
  });
  if (!next.incomeType?.value && typeof income === "string") {
    next = {
      ...next,
      incomeAsked: true,
      incomeType: { ...next.incomeType, value: income },
    };
  }
  const skippedDebts = firstClientAfterAsk(messages, MONTHLY_DEBTS_ASK, (text) =>
    isSkipMonthlyDebtsText(text) ? "skip" : undefined,
  );
  if (!next.monthlyDebtsAsked && skippedDebts === "skip") {
    next = skipMonthlyDebts(next);
  }
  const skippedWage = firstClientAfterAsk(messages, WAGE_DOCS_ASK, (text) =>
    /^skip$/i.test(text.trim()) ? "skip" : undefined,
  );
  if (!next.wageDocsAsked && skippedWage === "skip") {
    next = skipWageDocs(next);
  }
  const skippedStub = firstClientAfterAsk(messages, PAYSTUB_ASK, (text) =>
    /^skip$/i.test(text.trim()) ? "skip" : undefined,
  );
  if (!next.wageStubAsked && skippedStub === "skip") {
    next = {
      ...next,
      wageStubAsked: true,
      skippedClasses: Array.from(new Set([...(next.skippedClasses ?? []), "paystub" as const])),
    };
  }
  return withHelocToolQuote(next);
}
