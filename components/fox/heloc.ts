/**
 * First-class HELOC path. Not a cash-out refinance with a different label.
 * Shape after occupancy Primary: property value → first lien → line or Skip.
 * Live quote only when Rateflow returns a HELOC program.
 */

import type { Capture, FoxAction, FoxIntakeDraft, FoxPrompt } from "./types";
import { persistLtvCltv } from "./calculators";
import { isHelocFile } from "./completeness";
import { HIGH_PURCHASE_LTV } from "@/lib/guidelines/conventional";

/** Agency HELOC CLTV cap for a computed max line. First-lien LTV stays first/value. */
export const HELOC_AGENCY_CLTV = 0.9;

export const HELOC_PURPOSE = "HELOC";
export const HELOC_VALUE_ASK = "What’s the property value?";
export const HELOC_FIRST_LIEN_ASK = "What’s the first lien — what you owe on this home?";
export const HELOC_LINE_ASK = "What line do you want available? Skip is fine.";
export const HELOC_NO_PROGRAM_LINE = "HELOC programs are not on this Rateflow book.";
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
  return isHelocFile(draft) && hasFirstLien(draft) && !helocLineSettled(draft);
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

/** Line sent to Rateflow. Skip uses agency/CLTV max. Never invent a File line on Skip. */
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
  if (helocQuoteLine(draft) == null) return false;
  if ((draft.firstLienAmount ?? 0) > (draft.propertyValueAmount ?? 0)) return false;
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
