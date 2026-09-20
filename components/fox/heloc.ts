/**
 * First-class HELOC path. Not a cash-out refinance with a different label.
 * Shape after occupancy Primary: property value → first lien → line or Skip.
 * Quote from calculateHelocQuote. Never Rateflow / LoanSifter. Never P&I.
 */

import type { Capture, FoxAction, FoxIntakeDraft, FoxPrompt } from "./types";
import { persistLtvCltv } from "./calculators";
import { isHelocFile } from "./completeness";
import { HIGH_PURCHASE_LTV } from "@/lib/guidelines/conventional";
import {
  calculateHelocQuoteOrNull,
  type HelocOccupancy,
} from "@/lib/calculateHelocQuote";
import { creditScoreFloor, formatAsOfPacific, formatPiMonthly } from "@/lib/rateflow/quote";

/** Agency HELOC CLTV cap for a computed max line. First-lien LTV stays first/value. */
export const HELOC_AGENCY_CLTV = 0.9;
/** v1 preview print cap. Primary + House. File CLTV over this is not a program. */
export const HELOC_PREVIEW_CLTV_CAP = HELOC_AGENCY_CLTV;

export const HELOC_PURPOSE = "HELOC";
export const HELOC_VALUE_ASK = "What’s the property value?";
export const HELOC_FIRST_LIEN_ASK = "What’s the first lien — what you owe on this home?";
export const HELOC_LINE_ASK = "What line do you want available? Skip is fine.";
export const HELOC_NO_PROGRAM_LINE = "The HELOC calculator has no quote on this file.";
export const HELOC_NO_TOOL_LINE = HELOC_NO_PROGRAM_LINE;
export const HELOC_NO_PREVIEW_LINE =
  "I don’t have a live HELOC quote on this occupancy or 2–4. The file still moves.";

export function hasFirstLien(draft?: FoxIntakeDraft | null) {
  return Boolean(isHelocFile(draft) && (draft?.firstLienAmount ?? 0) > 0);
}

export function hasHelocLineAmount(draft?: FoxIntakeDraft | null) {
  return Boolean(isHelocFile(draft) && (draft?.loanAmountValue ?? 0) > 0);
}

/** Typed line or Skip. Empty composer after this write is a fail. */
export function helocLineSettled(draft?: FoxIntakeDraft | null) {
  if (!isHelocFile(draft) || !draft) return false;
  return Boolean(draft.helocLineAsked || hasHelocLineAmount(draft));
}

export function helocValueAskNeeded(draft: FoxIntakeDraft) {
  return isHelocFile(draft) && !((draft.propertyValueAmount ?? 0) > 0);
}

export function helocFirstLienAskNeeded(draft: FoxIntakeDraft) {
  return isHelocFile(draft) && !helocValueAskNeeded(draft) && !hasFirstLien(draft);
}

export function helocLineAskNeeded(draft: FoxIntakeDraft) {
  if (!isHelocFile(draft)) return false;
  if (draft.sampleAccepted || draft.pendingFinish) return false;
  if (hasHelocLineAmount(draft) && draft.correctingLine !== "line") return false;
  return hasFirstLien(draft) && !helocLineSettled(draft);
}

export function helocShapeReady(draft?: FoxIntakeDraft | null) {
  if (!isHelocFile(draft) || !draft) return false;
  return (draft.propertyValueAmount ?? 0) > 0 && hasFirstLien(draft) && helocLineSettled(draft);
}

export function helocComputedMaxLine(draft?: FoxIntakeDraft | null): number | null {
  if (!isHelocFile(draft) || !draft) return null;
  const value = draft.propertyValueAmount;
  const first = draft.firstLienAmount;
  if (value == null || value <= 0 || first == null || first < 0) return null;
  const max = Math.round(value * HELOC_AGENCY_CLTV - first);
  return max > 0 ? max : 0;
}

/** Line used by the calculator. Skip uses agency/CLTV max. Never invent a File line on Skip. */
export function helocQuoteLine(draft?: FoxIntakeDraft | null): number | undefined {
  if (!isHelocFile(draft) || !draft) return undefined;
  if ((draft.loanAmountValue ?? 0) > 0) return draft.loanAmountValue;
  const max = helocComputedMaxLine(draft);
  return max != null && max > 0 ? max : undefined;
}

export function firstLienLtv(draft?: FoxIntakeDraft | null): number | null {
  if (!draft) return null;
  const value = draft.propertyValueAmount;
  const first = draft.firstLienAmount;
  if (value == null || value <= 0 || first == null || first < 0) return null;
  return first / value;
}

export function helocCltv(draft?: FoxIntakeDraft | null): number | null {
  if (!draft) return null;
  const value = draft.propertyValueAmount;
  const first = draft.firstLienAmount;
  if (value == null || value <= 0 || first == null || first < 0) return null;
  const line = (draft.loanAmountValue ?? 0) > 0 ? draft.loanAmountValue! : 0;
  return (first + line) / value;
}

/** v1: Primary + House. Condo / 2–4 / second / investment are other tickets. */
export function helocPreviewCltvCapApplies(draft?: FoxIntakeDraft | null) {
  if (!isHelocFile(draft) || !draft) return false;
  const occupancy = draft.occupancyChoice.value || draft.scenario?.occupancy;
  if (occupancy !== "primary") return false;
  return draft.propertyType === "sfr";
}

/** File CLTV vs cap. 90% may print. 90.1% fails the same as 100%. Do not string-seal 100%. */
export function helocFileCltvOverCap(draft?: FoxIntakeDraft | null) {
  if (!helocPreviewCltvCapApplies(draft)) return false;
  const cltv = helocCltv(draft);
  if (cltv == null) return false;
  return cltv > HELOC_PREVIEW_CLTV_CAP;
}

export function formatHelocFileCltvPercent(draft?: FoxIntakeDraft | null) {
  const cltv = helocCltv(draft);
  if (cltv == null) return "";
  const pct = Math.round(cltv * 1000) / 10;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function helocCltvCapCopy(draft?: FoxIntakeDraft | null) {
  const shown = formatHelocFileCltvPercent(draft);
  if (!shown) return "I don’t have a HELOC at that CLTV of the house.";
  return `I don’t have a HELOC at ${shown} of the house.`;
}

export function isHelocCltvCapSpeech(text?: string | null) {
  return /I don’t have a HELOC at [\d.]+% of the house/i.test(String(text ?? "").trim());
}

export function helocOverCapActions(): FoxAction[] {
  return [
    {
      id: "heloc-change-line",
      label: "Change line",
      event: "bubble",
      capture: { field: "correct", value: "amount", line: "line" },
    },
    {
      id: "heloc-change-value",
      label: "Change value",
      event: "bubble",
      capture: { field: "correct", value: "value", line: "home" },
    },
    {
      id: "heloc-change-first-lien",
      label: "Change first lien",
      event: "bubble",
      capture: { field: "correct", value: "first-lien", line: "first-lien" },
    },
    {
      id: "heloc-skip-price",
      label: "Skip",
      event: "bubble",
      capture: { field: "couponChoice", value: "skip" },
    },
  ];
}

export function helocOccupancyBlocksQuote(draft?: FoxIntakeDraft | null) {
  const occupancy = draft?.occupancyChoice.value || draft?.scenario?.occupancy;
  return occupancy === "investment" || occupancy === "second-home";
}

export function helocPropertyBlocksQuote(draft?: FoxIntakeDraft | null) {
  return draft?.propertyType === "two_to_four";
}

/** Primary House or Condo. 2–4 and investment: file moves, no preview quote. */
export function helocLiveEligible(draft?: FoxIntakeDraft | null) {
  if (!isHelocFile(draft) || !draft) return false;
  if (draft.govProgram || draft.outOfState || draft.creditEvent || draft.statedDeclaration === "event") {
    return false;
  }
  if (helocOccupancyBlocksQuote(draft) || helocPropertyBlocksQuote(draft)) return false;
  const occupancy = draft.occupancyChoice.value || draft.scenario?.occupancy;
  if (occupancy && occupancy !== "primary") return false;
  if (draft.propertyType !== "sfr" && draft.propertyType !== "condo") return false;
  if (!helocShapeReady(draft)) return false;
  if ((draft.firstLienAmount ?? 0) > (draft.propertyValueAmount ?? 0) && !hasHelocLineAmount(draft)) {
    return false;
  }
  if (creditScoreFloor(draft.creditBand) == null) return false;
  if (!String(draft.propertyZip ?? "").trim()) return false;
  return true;
}

export function helocNoPreviewReady(draft?: FoxIntakeDraft | null) {
  if (!isHelocFile(draft) || !draft) return false;
  if (!helocShapeReady(draft)) return false;
  return helocOccupancyBlocksQuote(draft) || helocPropertyBlocksQuote(draft);
}

export function looksInferredMoney(text: string) {
  return /\b(about|around|roughly|maybe|approximately|i think|guess)\b/i.test(text);
}

export function writeFirstLien(draft: FoxIntakeDraft, amount: number): FoxIntakeDraft {
  return persistLtvCltv({
    ...draft,
    firstLienAmount: amount,
    firstLienAsked: true,
    correcting: null,
    correctingLine: null,
  });
}

export function writeHelocLine(draft: FoxIntakeDraft, amount: number): FoxIntakeDraft {
  return persistLtvCltv({
    ...draft,
    loanAmountValue: amount,
    amountAsked: true,
    helocLineAsked: true,
    correcting: null,
    correctingLine: null,
  });
}

export function skipHelocLine(draft: FoxIntakeDraft): FoxIntakeDraft {
  return persistLtvCltv({
    ...draft,
    amountAsked: true,
    helocLineAsked: true,
    correcting: null,
    correctingLine: null,
  });
}

export function helocLineAskActions(): FoxAction[] {
  return [
    {
      id: "skip-heloc-line",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-heloc-line" },
    },
  ];
}

export function helocNoPriceActions(): FoxAction[] {
  return [
    {
      id: "heloc-change-value",
      label: "Change value",
      event: "bubble",
      capture: { field: "correct", value: "value", line: "home" },
    },
    {
      id: "heloc-change-first-lien",
      label: "Change first lien",
      event: "bubble",
      capture: { field: "correct", value: "first-lien", line: "first-lien" },
    },
    {
      id: "heloc-change-line",
      label: "Change line",
      event: "bubble",
      capture: { field: "correct", value: "amount", line: "line" },
    },
    {
      id: "heloc-skip-price",
      label: "Skip",
      event: "bubble",
      capture: { field: "couponChoice", value: "skip" },
    },
  ];
}

export function helocNoPreviewActions(): FoxAction[] {
  return [
    {
      id: "request-human",
      label: "Request human",
      event: "bubble",
      capture: { field: "talk-originator" },
    },
    {
      id: "heloc-skip-preview",
      label: "Skip",
      event: "bubble",
      capture: { field: "couponChoice", value: "skip" },
    },
  ];
}

export function isHelocChangeValueText(text: string) {
  const lower = text.trim().toLowerCase();
  return /^change value$/.test(lower) || /change( the)? (value|house)/.test(lower);
}

export function isHelocChangeFirstLienText(text: string) {
  const lower = text.trim().toLowerCase();
  return /^change first lien$/.test(lower) || /change( the)? (first lien|payoff|what you owe)/.test(lower);
}

export function isHelocChangeLineText(text: string) {
  const lower = text.trim().toLowerCase();
  return /^change line$/.test(lower) || /change( the)? (line|heloc line)/.test(lower);
}

export function helocCorrectPrompt(draft: FoxIntakeDraft): FoxPrompt | null {
  if (!isHelocFile(draft)) return null;
  if (draft.correcting === "first-lien" || draft.correctingLine === "first-lien") return "first-lien";
  if (draft.correctingLine === "line") return "amount";
  if (draft.correctingLine === "home" || draft.correcting === "value") return "value";
  return null;
}

export function helocPurposeFileValue(draft?: FoxIntakeDraft | null): string | undefined {
  if (!isHelocFile(draft)) return undefined;
  return HELOC_PURPOSE;
}

export function firstLienOnFile(draft?: FoxIntakeDraft | null): number | undefined {
  if (!draft) return undefined;
  if (draft.firstLienAmount != null && draft.firstLienAmount > 0) return draft.firstLienAmount;
  return undefined;
}

/** Keep HELOC first lien / line when the house number changes. */
export function keepHelocMoney(draft: FoxIntakeDraft, next: FoxIntakeDraft): FoxIntakeDraft {
  if (!isHelocFile(draft)) return next;
  return {
    ...next,
    firstLienAmount: draft.firstLienAmount,
    firstLienAsked: draft.firstLienAsked,
    loanAmountValue: draft.loanAmountValue,
    amountAsked: draft.amountAsked,
    helocLineAsked: draft.helocLineAsked,
  };
}

export function beginHelocCorrection(
  draft: FoxIntakeDraft,
  field: "value" | "first-lien" | "amount",
): FoxIntakeDraft {
  if (field === "value") {
    return { ...draft, correcting: "value", correctingLine: "home" };
  }
  if (field === "first-lien") {
    return { ...draft, correcting: "first-lien", correctingLine: "first-lien" };
  }
  return { ...draft, correcting: "amount", correctingLine: "line" };
}

export function helocOverFirstLien(draft?: FoxIntakeDraft | null) {
  if (!isHelocFile(draft) || !draft) return false;
  const value = draft.propertyValueAmount;
  const first = draft.firstLienAmount;
  return value != null && value > 0 && first != null && first > value;
}

/** Conventional 80% is first-lien LTV. HELOC may still have room under agency CLTV. */
export function helocFirstLienOverValueCap(draft?: FoxIntakeDraft | null) {
  const ltv = firstLienLtv(draft);
  return ltv != null && ltv > HIGH_PURCHASE_LTV && helocQuoteLine(draft) == null;
}

export function captureIsHelocMoney(
  capture?: Capture | null,
): capture is Capture & { field: "firstLien" | "skip-heloc-line" | "helocLine" } {
  return (
    capture?.field === "firstLien" ||
    capture?.field === "skip-heloc-line" ||
    capture?.field === "helocLine"
  );
}

export function helocOccupancyForTool(draft?: FoxIntakeDraft | null): HelocOccupancy | null {
  const occupancy = draft?.occupancyChoice.value || draft?.scenario?.occupancy;
  if (occupancy === "primary") return "Primary";
  if (occupancy === "second-home") return "Second";
  if (occupancy === "investment") return "Investment";
  return null;
}

export function helocToolScenarioKey(draft?: FoxIntakeDraft | null): string | undefined {
  if (!isHelocFile(draft) || !draft) return undefined;
  const value = draft.propertyValueAmount;
  const first = draft.firstLienAmount;
  const fico = creditScoreFloor(draft.creditBand);
  const occupancy = helocOccupancyForTool(draft);
  const zip = draft.propertyZip?.trim();
  if (value == null || value <= 0 || first == null || first < 0 || fico == null || !occupancy || !zip) {
    return undefined;
  }
  const line = (draft.loanAmountValue ?? 0) > 0 ? String(draft.loanAmountValue) : "skip";
  return ["heloc-tool", value, first, line, fico, occupancy, zip, draft.propertyType ?? ""].join("|");
}

export function helocQuoteFromDraft(draft?: FoxIntakeDraft | null) {
  if (helocFileCltvOverCap(draft)) return null;
  if (!helocLiveEligible(draft) || !draft) return null;
  const occupancy = helocOccupancyForTool(draft);
  const fico = creditScoreFloor(draft.creditBand);
  const value = draft.propertyValueAmount;
  const first = draft.firstLienAmount;
  if (!occupancy || fico == null || value == null || first == null) return null;
  const desired = (draft.loanAmountValue ?? 0) > 0 ? draft.loanAmountValue : undefined;
  return calculateHelocQuoteOrNull({
    homeValue: value,
    currentMortgage: first,
    desiredLine: desired,
    fico,
    occupancy,
  });
}

export function liveHelocNowCopy(quote: NonNullable<FoxIntakeDraft["liveQuote"]>): string {
  const rate = `${(Math.round(quote.rate * 100) / 100).toFixed(2)}%`;
  const clock = formatAsOfPacific(quote.asOf).replace(/\s*PT$/, "");
  const bits = [`This HELOC right now: ${rate}.`];
  if (quote.interestOnly != null && quote.interestOnly > 0) {
    bits.push(`Estimated interest-only ${formatPiMonthly(quote.interestOnly)}.`);
  }
  bits.push("Not a lock.");
  if (clock) bits.push(`As of ${clock} PT.`);
  return bits.join(" ");
}

export function isHelocLiveSpeech(text?: string) {
  return Boolean(text && /This HELOC right now:/i.test(text));
}

/** Derive the calculator quote onto File. Never a Rateflow coupon. */
export function withHelocToolQuote(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (!isHelocFile(draft)) return draft;
  if (draft.liveQuote && draft.liveQuote.kind !== "heloc") {
    draft = {
      ...draft,
      liveQuote: undefined,
      liveQuoteKey: undefined,
      liveQuoteStatus: undefined,
      liveQuoteVendorReason: undefined,
      liveQuoteRows: undefined,
    };
  }
  if (helocFileCltvOverCap(draft)) {
    if (!draft.liveQuote && !draft.liveQuoteKey && !draft.liveQuoteStatus) return draft;
    return {
      ...draft,
      liveQuote: undefined,
      liveQuoteKey: undefined,
      liveQuoteStatus: undefined,
      liveQuoteVendorReason: undefined,
      liveQuoteRows: undefined,
    };
  }
  if (helocNoPreviewReady(draft)) {
    if (!draft.liveQuote && draft.liveQuoteStatus !== "unavailable") return draft;
    return {
      ...draft,
      liveQuote: undefined,
      liveQuoteKey: undefined,
      liveQuoteStatus: undefined,
      liveQuoteVendorReason: undefined,
      liveQuoteRows: undefined,
    };
  }
  if (!helocLiveEligible(draft)) {
    if (draft.liveQuote?.kind === "heloc" || draft.liveQuoteKey?.startsWith("heloc-tool")) {
      return {
        ...draft,
        liveQuote: undefined,
        liveQuoteKey: undefined,
        liveQuoteStatus: undefined,
        liveQuoteVendorReason: undefined,
        liveQuoteRows: undefined,
      };
    }
    return draft;
  }
  const key = helocToolScenarioKey(draft);
  if (!key) return draft;
  if (
    draft.liveQuote?.key === key &&
    draft.liveQuoteStatus === "ready" &&
    draft.liveQuote.kind === "heloc" &&
    draft.liveQuote.rate > 0
  ) {
    return draft;
  }
  const quote = helocQuoteFromDraft(draft);
  if (!quote || quote.monthlyPayment == null) {
    return {
      ...draft,
      liveQuote: undefined,
      liveQuoteRows: undefined,
      liveQuoteKey: key,
      liveQuoteStatus: "unavailable",
      liveQuoteVendorReason: HELOC_NO_TOOL_LINE,
    };
  }
  const asOf =
    draft.liveQuote?.key === key && draft.liveQuote.asOf
      ? draft.liveQuote.asOf
      : new Date().toISOString();
  return {
    ...draft,
    liveQuoteKey: key,
    liveQuoteStatus: "ready",
    liveQuoteVendorReason: undefined,
    liveQuoteRows: undefined,
    liveQuote: {
      key,
      rate: quote.finalRate,
      asOf,
      interestOnly: quote.monthlyPayment,
      kind: "heloc",
    },
  };
}
