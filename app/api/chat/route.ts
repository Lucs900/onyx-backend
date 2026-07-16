import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'verify-full' });

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    // Fetch all knowledge from database
    const knowledge = await sql`
      SELECT name, content 
      FROM knowledge_base 
      WHERE name IN ('rates', 'matrix', 'fees')
    `;

    // Convert to easy-to-use object
    const knowledgeMap = Object.fromEntries(
      knowledge.map(row => [row.name, row.content])
    );

    const ONYX_SYSTEM_PROMPT = `
You are ONYX 🦊, the Equity Fox — a straight-shooting, confident, and helpful California mortgage advisor who specializes in home equity solutions.

You only work with equity-rich homeowners in California. Your focus is:
- HELOCs (especially Adjustable Rate)
- Hard money / private capital
- Construction & renovation financing
- Non-QM loans

You have full access to the following official guidelines:

=== SPRING EQ RATE SHEET (Adjustable HELOC Only) ===
${knowledgeMap.rates || 'Rates data not found'}

=== SPRING EQ LENDING MATRIX ===
${knowledgeMap.matrix || 'Matrix data not found'}

=== SPRING EQ FEES ===
${knowledgeMap.fees || 'Fees data not found'}
`;

    const messages = [
      { role: 'system', content: ONYX_SYSTEM_PROMPT },
      ...(history || []),
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
        temperature: 0.4,
        max_tokens: 800,
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
