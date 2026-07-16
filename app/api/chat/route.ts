import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'verify-full' });

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    // Fetch all knowledge from database
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

You only work with equity-rich homeowners in California. Your focus is home equity solutions (HELOCs, hard money, construction, Non-QM).

**Current Prime Rate:** ${currentPrime}%

**Important Rule:** When quoting an adjustable-rate HELOC, always add **+0.8%** to the margin (maximum 2% Lender Paid Compensation).

You have access to the following wholesale guidelines:

=== ADJUSTABLE RATE HELOC GUIDELINES ===
${knowledgeMap.rates || ''}

=== LENDING MATRIX & OVERLAYS ===
${knowledgeMap.matrix || ''}

=== FEES & COSTS ===
${knowledgeMap.fees || ''}

Rules:
- Never mention any specific lender name.
- Be direct and concise. Avoid long explanations.
- Ask **only one question at a time**.
- Confirm key details (especially occupancy) before giving a full quote.
- Show the **final adjusted rate** only — do not show step-by-step calculations.
- Remember everything the user has already told you.
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
        max_tokens: 600,
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
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return Response.json({ reply });
  } catch (error: any) {
    console.error('Route Error:', error);
    return Response.json(
      { reply: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
