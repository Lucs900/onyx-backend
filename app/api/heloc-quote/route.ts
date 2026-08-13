import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { calculateHelocQuoteTool } from '@/lib/calculateHelocQuote';
import { getProductGuidelineTool } from '@/lib/getProductGuideline';
import { calculatePaymentTool } from '@/lib/calculatePayment';

const grok = createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.grok_api_key,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 12; // max requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.lastReset > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);

    // Rate limiting
    if (!checkRateLimit(ip)) {
      return Response.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await request.json();

    const homeValue = Number(body.homeValue) || 0;
    const mortgageBalance = Number(body.mortgageBalance) || 0;
    const fico = Number(body.fico) || 0;
    const occupancy = body.occupancy || 'Primary';
    const desiredLine = body.desiredLine ? Number(body.desiredLine) : null;
    const turnstileToken = body.turnstileToken;

    // Verify Turnstile token ONLY if one was sent (required on first quote)
    if (turnstileToken) {
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret:
              process.env.TURNSTILE_SECRET_KEY ||
              '0x4AAAAAAEPIkcOlhM1MN57I1GiA2hVaq6g',
            response: turnstileToken,
            remoteip: ip,
          }),
        }
      );

      const turnstileData = await turnstileRes.json();

      if (!turnstileData.success) {
        return Response.json(
          { success: false, error: 'Captcha verification failed' },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    if (homeValue < 100000 || !fico || !occupancy) {
      return Response.json(
        { success: false, error: 'Missing or invalid required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    const systemPrompt = `
You are a precise HELOC pricing engine.
You must use the available tools to calculate everything.
Never invent numbers.
`;

    const userMessage = `
Calculate a California HELOC quote with these exact inputs:
- Home Value: $${homeValue}
- Current Mortgage Balance: $${mortgageBalance}
- FICO: ${fico}
- Occupancy: ${occupancy}
${
      desiredLine
        ? `- Desired Line Amount: $${desiredLine}`
        : '- No specific line amount requested (give maximum available)'
    }

Use calculateHelocQuote and getProductGuideline.
If a desired line is provided, also use calculatePayment.
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
        }
        if (tr.toolName === 'calculatePayment') {
          const o = tr.output as any;
          quote.monthlyPayment = o?.monthlyPayment ?? null;
        }
      }
    }

    // Safety fallback
    if (!quote.maxLine && homeValue && mortgageBalance) {
      const cltvCap = occupancy === 'Investment' ? 0.75 : 0.85;
      quote.maxLine = Math.max(
        0,
        Math.round(homeValue * cltvCap - mortgageBalance)
      );
    }

    return Response.json(
      { success: true, quote },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('heloc-quote error:', error);
    return Response.json(
      { success: false, error: 'Unable to generate quote' },
      { status: 500, headers: corsHeaders }
    );
  }
}