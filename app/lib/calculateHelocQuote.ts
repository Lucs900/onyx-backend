import { z } from 'zod';

export const calculateHelocQuoteTool = {
  description: 'Calculate accurate HELOC quote including max line, margin, rate after compensation, and CLTV.',
  
  parameters: z.object({
    homeValue: z.number().describe('Current estimated home value in USD'),
    currentMortgage: z.number().describe('Current total mortgage/lien balance in USD'),
    desiredLine: z.number().optional().describe('Desired HELOC line amount (optional)'),
    fico: z.number().describe('Borrower FICO score'),
    occupancy: z.enum(['Primary', 'Second', 'Investment']).describe('Property occupancy type'),
  }),

  execute: async (params: any) => {
    const { homeValue, currentMortgage, desiredLine = 0, fico, occupancy } = params;

    const totalLiens = currentMortgage + desiredLine;
    const cltv = (totalLiens / homeValue) * 100;

    const publishedMargin = getMarginFromTable(fico, cltv, occupancy);
    const adjustedMargin = publishedMargin + 0.8;
    const finalRate = 6.75 + adjustedMargin;

    const maxLine = Math.round(
      homeValue * (occupancy === 'Investment' ? 0.75 : 0.85) - currentMortgage
    );

    return {
      cltv: Math.round(cltv * 100) / 100,
      maxLine: Math.max(0, maxLine),
      publishedMargin: Math.round(publishedMargin * 1000) / 1000,
      adjustedMargin: Math.round(adjustedMargin * 1000) / 1000,
      finalRate: Math.round(finalRate * 100) / 100,
      occupancy,
    };
  },
};

function getMarginFromTable(fico: number, cltv: number, occupancy: string): number {
  if (occupancy === 'Investment') return 1.5;

  if (fico >= 780) {
    if (cltv <= 60) return 0.275;
    if (cltv <= 65) return 0.275;
    if (cltv <= 70) return 0.3;
    if (cltv <= 75) return 0.4;
    if (cltv <= 80) return 0.55;
    return 0.85;
  }
  if (fico >= 760) {
    if (cltv <= 60) return 0.3;
    if (cltv <= 65) return 0.3;
    if (cltv <= 70) return 0.325;
    if (cltv <= 75) return 0.425;
    if (cltv <= 80) return 0.575;
    return 0.875;
  }
  if (fico >= 740) {
    if (cltv <= 60) return 0.325;
    if (cltv <= 65) return 0.325;
    if (cltv <= 70) return 0.35;
    if (cltv <= 75) return 0.45;
    if (cltv <= 80) return 0.6;
    return 0.9;
  }
  if (fico >= 720) {
    if (cltv <= 60) return 0.35;
    if (cltv <= 65) return 0.35;
    if (cltv <= 70) return 0.375;
    if (cltv <= 75) return 0.475;
    if (cltv <= 80) return 0.625;
    return 0.925;
  }
  if (fico >= 700) {
    if (cltv <= 60) return 0.4;
    if (cltv <= 65) return 0.4;
    if (cltv <= 70) return 0.425;
    if (cltv <= 75) return 0.525;
    if (cltv <= 80) return 0.675;
    return 0.975;
  }
  if (fico >= 680) {
    if (cltv <= 60) return 0.55;
    if (cltv <= 65) return 0.55;
    if (cltv <= 70) return 0.575;
    if (cltv <= 75) return 0.675;
    if (cltv <= 80) return 0.825;
    return 1.125;
  }
  if (fico >= 660) {
    if (cltv <= 60) return 0.85;
    if (cltv <= 65) return 0.85;
    if (cltv <= 70) return 0.875;
    if (cltv <= 75) return 0.975;
    if (cltv <= 80) return 1.125;
    return 1.425;
  }
  if (fico >= 640) {
    if (cltv <= 60) return 1.15;
    if (cltv <= 65) return 1.15;
    if (cltv <= 70) return 1.175;
    if (cltv <= 75) return 1.275;
    if (cltv <= 80) return 1.425;
    return 1.725;
  }
  return 2.0;
}