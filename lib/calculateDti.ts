import { tool } from 'ai';
import { z } from 'zod';

export const calculateDtiTool = tool({
  description: 'Calculate the borrower DTI (Debt-to-Income ratio) including the proposed HELOC payment. Use this whenever the user provides income and debt information and wants to know their DTI.',
  
  inputSchema: z.object({
    monthlyIncome: z.number().describe('Total gross monthly household income'),
    monthlyMortgage: z.number().describe('Current monthly mortgage payment (PITI)'),
    otherMonthlyDebts: z.number().describe('Total of all other monthly debts (cars, credit cards, student loans, etc.)'),
    helocLineAmount: z.number().describe('The HELOC line amount being evaluated'),
    helocRate: z.number().describe('The estimated HELOC interest rate (e.g. 7.83)'),
  }),

  execute: async ({ monthlyIncome, monthlyMortgage, otherMonthlyDebts, helocLineAmount, helocRate }) => {
    // Interest-only payment for HELOC during draw period
    const helocPayment = Math.round((helocLineAmount * (helocRate / 100) / 12) * 100) / 100;

    const totalMonthlyDebts = monthlyMortgage + otherMonthlyDebts + helocPayment;
    const dti = Math.round((totalMonthlyDebts / monthlyIncome) * 10000) / 100; // e.g. 31.53

    return {
      monthlyIncome,
      monthlyMortgage,
      otherMonthlyDebts,
      helocLineAmount,
      helocRate,
      helocPayment,
      totalMonthlyDebts: Math.round(totalMonthlyDebts * 100) / 100,
      dti,
      maxAllowedDti: 50,
      qualifies: dti <= 50,
    };
  },
});
