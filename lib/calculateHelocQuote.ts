import { tool } from 'ai';
import { z } from 'zod';

export type HelocOccupancy = 'Primary' | 'Second' | 'Investment';

export type HelocQuoteInput = {
  homeValue: number;
  currentMortgage: number;
  desiredLine?: number;
  fico: number;
  occupancy: HelocOccupancy;
};

export type HelocQuoteResult = {
  cltv: number;
  maxLine: number;
  publishedMargin: number;
  adjustedMargin: number;
  finalRate: number;
  occupancy: HelocOccupancy;
  lineUsedForCltv: number;
  /** Site calculator interest-only. Never amortizing P&I. */
  monthlyPayment: number | null;
};

/**
 * WSJ / Fed H.15 bank prime. Effective 2026-09-17.
 * Not the fed funds target (3.75–4.00). A HELOC note is prime + margin.
 */
export const WSJ_H15_PRIME = 7;
/** Existing compensation add-on on the published margin. Do not retune tonight. */
export const HELOC_COMPENSATION_ADDON = 0.8;

/** Same engine as the website HELOC calculator. Fox calls this; do not send HELOC to Rateflow. */
export function calculateHelocQuote({
  homeValue,
  currentMortgage,
  desiredLine,
  fico,
  occupancy,
}: HelocQuoteInput): HelocQuoteResult {
  const maxLtv = occupancy === 'Investment' ? 0.75 : 0.85;
  const maxLine = Math.max(0, Math.round(homeValue * maxLtv - currentMortgage));
  const lineForCltv = desiredLine && desiredLine > 0 ? Math.min(desiredLine, maxLine) : maxLine;
  const totalLiens = currentMortgage + lineForCltv;
  const cltv = homeValue > 0 ? (totalLiens / homeValue) * 100 : 0;
  const publishedMargin = getMarginFromTable(fico, cltv, occupancy);
  const adjustedMargin = publishedMargin + HELOC_COMPENSATION_ADDON;
  const finalRate = WSJ_H15_PRIME + adjustedMargin;
  const lineForPayment = desiredLine && desiredLine > 0 ? desiredLine : maxLine;
  const monthlyPayment =
    lineForPayment > 0 && finalRate
      ? Math.round((lineForPayment * (finalRate / 100)) / 12)
      : null;

  return {
    cltv: Math.round(cltv * 100) / 100,
    maxLine,
    publishedMargin: Math.round(publishedMargin * 1000) / 1000,
    adjustedMargin: Math.round(adjustedMargin * 1000) / 1000,
    finalRate: Math.round(finalRate * 100) / 100,
    occupancy,
    lineUsedForCltv: lineForCltv,
    monthlyPayment,
  };
}

/** Site API gate. Missing shape is not a rate. */
export function calculateHelocQuoteOrNull(input: HelocQuoteInput): HelocQuoteResult | null {
  if (!Number.isFinite(input.homeValue) || input.homeValue < 100000) return null;
  if (!Number.isFinite(input.currentMortgage) || input.currentMortgage < 0) return null;
  if (!Number.isFinite(input.fico) || input.fico < 300 || input.fico > 850) return null;
  if (input.occupancy !== 'Primary' && input.occupancy !== 'Second' && input.occupancy !== 'Investment') {
    return null;
  }
  const quote = calculateHelocQuote(input);
  if (!quote.finalRate || quote.finalRate <= 0) return null;
  if (quote.monthlyPayment == null) return null;
  return quote;
}

export const calculateHelocQuoteTool = tool({
  description: 'Calculate an accurate HELOC quote including max line amount, published margin, adjusted margin after compensation, final rate, and CLTV based on the current Spring EQ rate sheet.',
  
  inputSchema: z.object({
    homeValue: z.number().describe('Current estimated home value in USD'),
    currentMortgage: z.number().describe('Current total mortgage or lien balance in USD'),
    desiredLine: z.number().optional().describe('Desired HELOC line amount the user wants (optional)'),
    fico: z.number().describe('Borrower FICO score (lowest of all borrowers)'),
    occupancy: z.enum(['Primary', 'Second', 'Investment']).describe('Property occupancy type'),
  }),

  execute: async (input) => {
    const { monthlyPayment: _monthlyPayment, ...rest } = calculateHelocQuote(input);
    return rest;
  },
});

/**
 * Margin table from Spring EQ Adjustable-Rate HELOC rate sheet (08.05.2026)
 * Values are the margin ABOVE WSJ / H.15 bank prime (WSJ_H15_PRIME). Not fed funds.
 * Negative values are intentional for strong credit / low CLTV.
 */
function getMarginFromTable(fico: number, cltv: number, occupancy: string): number {
  // Investment properties get a flat add-on
  if (occupancy === 'Investment') {
    return 1.25;
  }

  // ===== 780+ =====
  if (fico >= 780) {
    if (cltv <= 60) return -0.175;
    if (cltv <= 65) return -0.175;
    if (cltv <= 70) return 0.000;
    if (cltv <= 75) return 0.250;
    if (cltv <= 80) return 0.500;
    if (cltv <= 85) return 1.000;
    return 1.550;
  }

  // ===== 760-779 =====
  if (fico >= 760) {
    if (cltv <= 60) return -0.175;
    if (cltv <= 65) return -0.175;
    if (cltv <= 70) return 0.000;
    if (cltv <= 75) return 0.250;
    if (cltv <= 80) return 0.500;
    if (cltv <= 85) return 1.000;
    return 1.550;
  }

  // ===== 740-759 =====
  if (fico >= 740) {
    if (cltv <= 60) return 0.000;
    if (cltv <= 65) return 0.000;
    if (cltv <= 70) return 0.250;
    if (cltv <= 75) return 0.250;
    if (cltv <= 80) return 1.130;
    if (cltv <= 85) return 2.130;
    return 2.800;
  }

  // ===== 720-739 =====
  if (fico >= 720) {
    if (cltv <= 60) return 0.250;
    if (cltv <= 65) return 0.250;
    if (cltv <= 70) return 0.280;
    if (cltv <= 75) return 0.500;
    if (cltv <= 80) return 1.500;
    if (cltv <= 85) return 2.300;
    return 3.230;
  }

  // ===== 700-719 =====
  if (fico >= 700) {
    if (cltv <= 60) return 0.380;
    if (cltv <= 65) return 0.500;
    if (cltv <= 70) return 0.620;
    if (cltv <= 75) return 1.130;
    if (cltv <= 80) return 1.880;
    if (cltv <= 85) return 2.800;
    return 3.980;
  }

  // ===== 680-699 =====
  if (fico >= 680) {
    if (cltv <= 60) return 1.630;
    if (cltv <= 65) return 1.880;
    if (cltv <= 70) return 2.130;
    if (cltv <= 75) return 2.380;
    if (cltv <= 80) return 2.880;
    if (cltv <= 85) return 3.880;
    return 4.880;
  }

  // ===== 660-679 =====
  if (fico >= 660) {
    if (cltv <= 60) return 2.550;
    if (cltv <= 65) return 2.930;
    if (cltv <= 70) return 3.180;
    if (cltv <= 75) return 3.430;
    if (cltv <= 80) return 4.300;
    return 5.300;
  }

  // ===== Below 660 =====
  return 3.600;
}
