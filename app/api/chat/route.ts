import postgres from 'postgres';
import { calculateHelocQuote } from '../../lib/calculateHelocQuote';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'verify-full' });

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    // Fetch knowledge from database
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
- Confirm occupancy before giving a final quote when possible.
- Never mention any specific lender name.

When you have enough information (home value, current mortgage balance, FICO, and occupancy), I will calculate the accurate quote for you using the internal tool.
`;

    // Normalize roles (convert 'bot'/'ai' to 'assistant')
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
    // INTERNAL TOOL LOGIC
    // If user gave numbers, try to use the calculator tool
    // ============================================
    const hasNumbers = /\d/.test(message);
    const recentMessages = [...(history || []), { role: 'user', content: message }]
      .slice(-4)
      .map(m => m.content)
      .join(' ');

    if (hasNumbers) {
      // Try to extract basic numbers (simple version)
      const homeValueMatch = recentMessages.match(/(\d[\d,.]*)\s*(k|m|000|million)?/i);
      const mortgageMatch = recentMessages.match(/(owe|balance|mortgage).*?(\d[\d,.]*)\s*(k|m|000|million)?/i);
      const ficoMatch = recentMessages.match(/(\d{3})/);

      if (homeValueMatch && mortgageMatch && ficoMatch) {
        const homeValue = parseFloat(homeValueMatch[1].replace(/,/g, '')) * 
          (homeValueMatch[2]?.toLowerCase().includes('m') || homeValueMatch[2]?.includes('million') ? 1000000 : 1);

        const currentMortgage = parseFloat(mortgageMatch[2].replace(/,/g, '')) * 
          (mortgageMatch[3]?.toLowerCase().includes('m') || mortgageMatch[3]?.includes('million') ? 1000000 : 1);

        const fico = parseInt(ficoMatch[1]);

        // Default to Primary if not mentioned
        const occupancy = recentMessages.toLowerCase().includes('investment') ? 'Investment' : 'Primary';

        const quote = calculateHelocQuote({
          homeValue,
          currentMortgage,
          fico,
          occupancy,
        });

        reply = `Based on what you've shared:\n\n` +
          `- Home Value: $${homeValue.toLocaleString()}\n` +
          `- Current Mortgage: $${currentMortgage.toLocaleString()}\n` +
          `- FICO: ${fico}\n` +
          `- Occupancy: ${occupancy}\n\n` +
          `**Estimated Rate:** ${quote.finalRate}%\n` +
          `**Max HELOC Line:** $${quote.maxLine.toLocaleString()}\n\n` +
          `Would you like me to show payment options or adjust anything?`;
      }
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
