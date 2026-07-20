import { tool } from 'ai';
import { z } from 'zod';

export const getProductGuidelineTool = tool({
  description: 'Look up official product guidelines and rules for the available lending programs. Use this whenever the user asks about draw period, loan amounts, DTI, occupancy limits, credit requirements, repayment structure, or any other product rule.',
  
  inputSchema: z.object({
    program: z.enum(['heloc']).describe('Which lending program the guideline belongs to. Currently only heloc is supported. More programs will be added later.'),
    topic: z.enum([
      'draw_period',
      'repayment_structure',
      'min_line',
      'max_line',
      'dti',
      'occupancy_ltv',
      'fico_requirements',
      'additional_draws',
      'general'
    ]).describe('The specific guideline topic to look up'),
  }),

  execute: async ({ program, topic }) => {
    // ===== SPRING EQ HELOC GUIDELINES =====
    const helocGuidelines: Record<string, string> = {
      draw_period: `HELOC Draw Period is 3 years. After the 3-year draw period, the loan converts to repayment.`,

      repayment_structure: `HELOC structure options:
- 3-Year Draw + 10-Year Interest Only + 20-Year fully amortizing (30-year total term)
- 3-Year Draw + 10-Year Interest Only + 17-Year fully amortizing (27-year total term)
- 3-Year Draw + 10-Year Interest Only + 27-Year fully amortizing (30-year total term)
Interest-only payments apply during the draw period and the interest-only period.`,

      min_line: `Minimum HELOC line amount is $25,000.`,

      max_line: `Maximum HELOC line amount is $500,000. Lines of $400,000 or more require a minimum 740 FICO.`,

      dti: `Maximum DTI is 50%. 
Maximum DTI drops to 45% unless the borrower has a minimum 740 FICO or at least $3,500 in monthly residual income.
DTI for HELOCs is calculated using the initial draw payment.`,

      occupancy_ltv: `Maximum CLTV by occupancy (from matrix):
- Primary Residence: up to 90% (depending on FICO)
- Second Home: up to 80%
- Investment: up to 80%
Note: Actual pricing and max line also depend on the FICO/CLTV margin table.`,

      fico_requirements: `Lowest Experian score (version 2) of all borrowers is used.
Minimum FICO is generally 640, but higher FICOs unlock higher CLTVs.
Non-traditional credit is not permitted.
Lines ≥ $400,000 require minimum 740 FICO.`,

      additional_draws: `Additional draws are prohibited during the first 90 days after closing.
Minimum additional draw is $1,000.
Only one draw request is allowed per calendar month.
All additional draws must be completed via ACH.`,

      general: `Key Spring EQ HELOC rules:
- Draw period: 3 years
- Min line: $25,000
- Max line: $500,000
- Max DTI: 50% (45% in some cases)
- Interest-only during draw period
- No additional draws in first 90 days
- Lowest FICO of all borrowers is used`
    };

    if (program === 'heloc') {
      return {
        program: 'heloc',
        topic,
        guideline: helocGuidelines[topic] || helocGuidelines.general
      };
    }

    return {
      program,
      topic,
      guideline: `No guidelines found for program: ${program}. Currently only "heloc" is supported.`
    };
  },
});
