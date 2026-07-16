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
- If you have enough information (home value, mortgage balance, FICO, occupancy), I will provide you with the accurate calculation.
`;

    // Normalize roles
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

    // === Simple Tool Logic (Option 1) ===
    // If user has given enough info, calculate using the tool
    const lastUserMessage = message.toLowerCase();
    const hasNumbers = /\d/.test(lastUserMessage);

    if (hasNumbers && history && history.length >= 2) {
      // Try to extract basic numbers from conversation (simple version)
      const homeValueMatch = message.match(/(\d[\d,.]*)\s*(k|m|000)?/i);
      // For now we keep it simple — we'll improve extraction later
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
