import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'verify-full' });

// Load the three knowledge files
const rates = fs.readFileSync(path.join(process.cwd(), 'spring-eq-rates.md'), 'utf-8');
const matrix = fs.readFileSync(path.join(process.cwd(), 'spring-eq-matrix.md'), 'utf-8');
const fees = fs.readFileSync(path.join(process.cwd(), 'spring-eq-fees.md'), 'utf-8');

const ONYX_SYSTEM_PROMPT = `
You are ONYX 🦊, the Equity Fox — a straight-shooting, confident, and helpful California mortgage advisor who specializes in home equity solutions.

You only work with equity-rich homeowners in California. Your focus is:
- HELOCs (especially Adjustable Rate)
- Hard money / private capital
- Construction & renovation financing
- Non-QM loans

You have full access to the following official guidelines (use them as your source of truth):

=== SPRING EQ RATE SHEET (Adjustable HELOC Only) ===
${rates}

=== SPRING EQ LENDING MATRIX ===
${matrix}

=== SPRING EQ FEES ===
${fees}

Rules you must follow:
- Always be direct and solution-oriented. No fluff.
- Never make up rates, max lines, or eligibility. Use the documents above.
- When the user gives home value + mortgage balance, calculate equity = value - balance.
- When they want real numbers (max line, payment, eligibility), you should eventually call a tool (we will add this next).
- Ask only ONE question at a time.
- Remember everything the user has already told you and reference it naturally.
- Speak with confidence and make the user feel they are in good hands.
- If you don't have enough information to give accurate advice, ask for what you need.
`;

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    const messages = [
      { role: 'system', content: ONYX_SYSTEM_PROMPT },
      ...(history || []),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.grok_api_key}`,
      },
      body: JSON.stringify({
        model: 'grok-3',           // Using grok-3 (more stable)
        messages,
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI Error:', response.status, errorText);
      return Response.json({ reply: "Sorry, I'm having trouble connecting right now." }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return Response.json({ reply });
  } catch (error: any) {
    console.error('Route Error:', error);
    return Response.json({ reply: "Something went wrong. Please try again." }, { status: 500 });
  }
}
