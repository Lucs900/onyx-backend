import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { calculateHelocQuoteTool } from '@/lib/calculateHelocQuote';
import { getProductGuidelineTool } from '@/lib/getProductGuideline';
import { calculatePaymentTool } from '@/lib/calculatePayment';

const grok = createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.grok_api_key,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const homeValue = Number(body.homeValue) || 0;
    const mortgageBalance = Number(body.mortgageBalance) || 0;
    const fico = Number(body.fico) || 0;
    const occupancy = body.occupancy || 'Primary';
    const desiredLine = body.desiredLine ? Number(body.desiredLine) : null;

    if (homeValue < 100000 || !fico || !occupancy) {
      return Response.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    // Force the model to use the real tools
    const systemPrompt = `
You are a precise HELOC pricing engine.
You must use the available tools to calculate everything.
Never invent numbers.
Return only the tool results in a clean structured way.
`;

    const userMessage = `
Calculate a California HELOC quote with these exact inputs:
- Home Value: $${homeValue}
- Current Mortgage Balance: $${mortgageBalance}
- FICO: ${fico}
- Occupancy: ${occupancy}
${desiredLine ? `- Desired Line Amount: $${desiredLine}` : '- No specific line amount requested (give maximum available)'}

Use calculateHelocQuote and getProductGuideline.
If a desired line is provided, also use calculatePayment for the monthly interest-only payment.
`;

    const result = await generateText({
      model: grok('grok-3'),
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      tools: {
        calculateHelocQuote: calculateHelocQuoteTool,
        getProductGuideline: getProductGuidelineTool,
        calculatePayment: calculatePaymentTool,
      },
      temperature: 0,
      maxOutputTokens: 800,
    });

    // Extract clean data from tool results
    let quote: any = {
      maxLine: null,
      rate: null,
      cltv: null,
      occupancy: occupancy,
      drawPeriod: '3 years',
      monthlyPayment: null,
      desiredLine: desiredLine,
    };

    if (result.toolResults && result.toolResults.length > 0) {
      for (const tr of result.toolResults) {
        if (tr.toolName === 'calculateHelocQuote') {
          const o = tr.output as any;
          quote.maxLine = o?.maxLine ?? null;
          quote.rate = o?.finalRate ?? o?.rate ?? null;
          quote.cltv = o?.cltv ?? null;
          quote.occupancy = o?.occupancy ?? occupancy;
        }
        if (tr.toolName === 'calculatePayment') {
          const o = tr.output as any;
          quote.monthlyPayment = o?.monthlyPayment ?? null;
        }
        if (tr.toolName === 'getProductGuideline') {
          const o = tr.output as any;
          if (o?.guideline?.toLowerCase().includes('draw')) {
            quote.drawPeriod = '3 years';
          }
        }
      }
    }

    // Safety fallback if tools didn't return maxLine
    if (!quote.maxLine && homeValue && mortgageBalance) {
      const cltvCap = occupancy === 'Investment' ? 0.75 : 0.85;
      quote.maxLine = Math.max(0, Math.round(homeValue * cltvCap - mortgageBalance));
    }

    return Response.json({
      success: true,
      quote,
      rawToolResults: result.toolResults || [],
    });

  } catch (error: any) {
    console.error('heloc-quote error:', error);
    return Response.json(
      { success: false, error: 'Unable to generate quote' },
      { status: 500 }
    );
  }
}