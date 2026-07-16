import postgres from 'postgres';
import { calculateHelocQuote } from '../../lib/calculateHelocQuote';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'verify-full' });

function extractNumber(text: string): number {
  const match = text.match(/(\d[\d,.]*)\s*(k|m|000|million|thousand)?/i);
  if (!match) return 0;

  let num = parseFloat(match[1].replace(/,/g, ''));

  const unit = match[2]?.toLowerCase();
  if (unit === 'k' || unit === 'thousand') num *= 1000;
  if (unit === 'm' || unit === 'million') num *= 1000000;

  return num;
}

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    const knowledge = await sql`
      SELECT name, content 
      FROM knowledge_base 
      WHERE name IN ('rates', 'matrix', 'fees', 'prime_rate')
    `;

    const knowledgeMap = Object.fromEntries(
      knowledge.map(row => [row.name, row.content])
    );

    const currentPrime = knowledgeMap.prime_rate || '6.75';

    const ONYX_SYSTEM_PROMPT = `
You are ONYX 🦊, the Equity Fox — a straight-shooting, confident, and helpful California mortgage advisor.

You only work with equity-rich homeowners in California.

**Current Prime Rate:** ${currentPrime}%

**Important Rules:**
- Always add **+0.8%** to the published margin (maximum 2% Lender Paid Compensation).
- Be direct and reasonably concise.
- Ask only **one question at a time**.
- Never mention any specific lender name.
- Assume the user is in California unless they say otherwise.
`;

    const normalizedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'bot' || msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content,
    }));

    const messages = [
      { role: 'system', content: ONYX_SYSTEM_PROMPT },
      ...normalizedHistory,
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.grok_api_key}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages,
        temperature: 0.35,
        max_tokens: 650,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI Error:', response.status, errorText);
      return Response.json(
        { reply: "Sorry, I'm having trouble connecting right now." },
        { status: 500 }
      );
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    // ============================================
    // IMPROVED NUMBER EXTRACTION
    // ============================================
    const combinedText = [...(history || []), { role: 'user', content: message }]
      .map(m => m.content.toLowerCase())
      .join(' ');

    // Extract Home Value (look for value/worth keywords)
    let homeValue = 0;
    const valueMatch = combinedText.match(/(value|worth|home is).*?(\d[\d,.]*)\s*(k|m|000|million)?/i);
    if (valueMatch) homeValue = extractNumber(valueMatch[0]);

    // Extract Mortgage Balance (look for owe/balance/mortgage keywords)
    let currentMortgage = 0;
    const mortgageMatch = combinedText.match(/(owe|balance|mortgage|lien).*?(\d[\d,.]*)\s*(k|m|000|million)?/i);
    if (mortgageMatch) currentMortgage = extractNumber(mortgageMatch[0]);

    // Extract FICO
    const ficoMatch = combinedText.match(/\b(6[0-9]{2}|7[0-9]{2}|8[0-9]{2})\b/);
    const fico = ficoMatch ? parseInt(ficoMatch[1]) : 0;

    // Occupancy
    const occupancy = combinedText.includes('investment') ? 'Investment' 
      : combinedText.includes('second') ? 'Second' 
      : 'Primary';

    // Only call the tool if we have good data
    if (homeValue > 100000 && currentMortgage > 0 && fico >= 640) {
      const quote = calculateHelocQuote({
        homeValue,
        currentMortgage,
        fico,
        occupancy,
      });

      reply = `Based on the numbers you shared:\n\n` +
        `- Home Value: $${homeValue.toLocaleString()}\n` +
        `- Current Mortgage: $${currentMortgage.toLocaleString()}\n` +
        `- FICO: ${fico}\n` +
        `- Occupancy: ${occupancy}\n\n` +
        `**Estimated Rate:** ${quote.finalRate}%\n` +
        `**Max HELOC Line:** $${quote.maxLine.toLocaleString()}\n\n` +
        `Would you like payment options or to adjust anything?`;
    }

    return Response.json({ reply });

  } catch (error: any) {
    console.error('Route Error:', error);
    return Response.json(
      { reply: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
