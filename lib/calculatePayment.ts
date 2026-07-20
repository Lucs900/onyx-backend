import { tool } from 'ai';
import { z } from 'zod';

export const calculatePaymentTool = tool({
  description: 'Calculate the monthly payment for a loan or HELOC. Currently supports interest-only payments. Use this whenever the user asks about monthly payment, payment amount, or what their payment would be.',
  
  inputSchema: z.object({
    product: z.enum(['heloc']).describe('Which product the payment is for. Currently only heloc is supported.'),
    amount: z.number().describe('The loan or line amount in USD'),
    rate: z.number().describe('The annual interest rate (e.g. 7.83)'),
    paymentType: z.enum(['interest_only']).describe('Type of payment calculation. Currently only interest_only is supported.'),
  }),

  execute: async ({ product, amount, rate, paymentType }) => {
    if (paymentType === 'interest_only') {
      const monthlyPayment = Math.round((amount * (rate / 100) / 12) * 100) / 100;

      return {
        product,
        amount,
        rate,
        paymentType,
        monthlyPayment,
        note: 'Interest-only payment during the draw period. Payment will change when the loan enters repayment.',
      };
    }

    return {
      product,
      amount,
      rate,
      paymentType,
      monthlyPayment: null,
      note: 'Unsupported payment type.',
    };
  },
});
