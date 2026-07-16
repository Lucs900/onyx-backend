// lib/calculateHelocQuote.ts

export function calculateHelocQuote(params: {
  homeValue: number;
  currentMortgage: number;
  desiredLine?: number;
  fico: number;
  occupancy: 'Primary' | 'Second' | 'Investment';
}) {
  const { homeValue, currentMortgage, desiredLine = 0, fico, occupancy } = params;

  const totalLiens = currentMortgage + desiredLine;
  const cltv = (totalLiens / homeValue) * 100;

  // Get correct margin from rate table (we will improve this)
  const publishedMargin = getMarginFromTable(fico, cltv, occupancy);

  // Always add 0.8% for max 2% Lender Paid Compensation
  const adjustedMargin = publishedMargin + 0.8;

  const finalRate = 6.75 + adjustedMargin; // Using current Prime

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
}

function getMarginFromTable(fico: number, cltv: number, occupancy: string): number {
  if (occupancy === 'Investment') {
    return 1.5;
  }

  if (fico >= 780) {
    if (cltv <= 60) return 0.275;
    if (cltv <= 65) return 0.275;
    if (cltv <= 70) return 0.3;
    if (cltv <= 75) return 0.4;
    if (cltv <= 80) return 0.55;
    return 0.85;
  }

  // Add more FICO tiers later if needed
  return 1.0;
}
