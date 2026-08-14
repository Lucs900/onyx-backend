import { calculateHelocQuoteTool } from '@/lib/calculateHelocQuote';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Rate limiting – 40 requests per hour per IP
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 40;
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
        {
          success: false,
          error: "You're sending requests a bit too quickly. Please wait a minute and try again.",
        },
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

    // Verify Turnstile token only if one was sent
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

    // ---------- DIRECT CALCULATION (no Grok) ----------
    const result = await calculateHelocQuoteTool.execute(
      {
        homeValue,
        currentMortgage: mortgageBalance,
        desiredLine: desiredLine || undefined,
        fico,
        occupancy: occupancy as 'Primary' | 'Second' | 'Investment',
      },
      {} as any
    );

    const quote = {
      maxLine: result.maxLine,
      rate: result.finalRate,
      cltv: result.cltv,
      occupancy: result.occupancy,
      drawPeriod: '3 years',
      monthlyPayment: null as number | null,
      desiredLine: desiredLine,
    };

    // Calculate interest-only payment if we have a line amount
    const lineForPayment = desiredLine && desiredLine > 0 ? desiredLine : result.maxLine;
    if (lineForPayment > 0 && result.finalRate) {
      quote.monthlyPayment = Math.round(
        (lineForPayment * (result.finalRate / 100)) / 12
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