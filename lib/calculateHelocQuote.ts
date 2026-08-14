import { tool } from 'ai';
import { z } from 'zod';

export const calculateHelocQuoteTool = tool({
  description: 'Calculate an accurate HELOC quote including max line amount, published margin, adjusted margin after compensation, final rate, and CLTV based on the current Spring EQ rate sheet.',
  
  inputSchema: z.object({
    homeValue: z.number().describe('Current estimated home value in USD'),
    currentMortgage: z.number().describe('Current total mortgage or lien balance in USD'),
    desiredLine: z.number().optional().describe('Desired HELOC line amount the user wants (optional)'),
    fico: z.number().describe('Borrower FICO score (lowest of all borrowers)'),
    occupancy: z.enum(['Primary', 'Second', 'Investment']).describe('Property occupancy type'),
  }),

  execute: async ({ homeValue, currentMortgage, desiredLine, fico, occupancy }) => {
    // Maximum available line
    const maxLtv = occupancy === 'Investment' ? 0.75 : 0.85;
    const maxLine = Math.max(0, Math.round(homeValue * maxLtv - currentMortgage));

    // Use desired line for CLTV if provided, otherwise use max line
    const lineForCltv = desiredLine && desiredLine > 0 ? Math.min(desiredLine, maxLine) : maxLine;

    const totalLiens = currentMortgage + lineForCltv;
    const cltv = homeValue > 0 ? (totalLiens / homeValue) * 100 : 0;

    // Get margin from the new rate sheet table
    let publishedMargin = getMarginFromTable(fico, cltv, occupancy);

    // Standard LPC adjustment (0.80 added to margin)
    const adjustedMargin = publishedMargin + 0.80;
    const finalRate = 6.75 + adjustedMargin;

    return {
      cltv: Math.round(cltv * 100) / 100,
      maxLine,
      publishedMargin: Math.round(publishedMargin * 1000) / 1000,
      adjustedMargin: Math.round(adjustedMargin * 1000) / 1000,
      finalRate: Math.round(finalRate * 100) / 100,
      occupancy,
      lineUsedForCltv: lineForCltv,
    };
  },
});

/**
 * Margin table from Spring EQ Adjustable-Rate HELOC rate sheet (08.05.2026)
 * Values are the margin ABOVE Prime (currently 6.75%)
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