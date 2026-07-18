import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import postgres from 'postgres';
import { calculateHelocQuoteTool } from '../../lib/calculateHelocQuote';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'verify-full' });

// Create Grok client
const grok = createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.grok_api_key,
});

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

    const systemPrompt = `
You are ONYX 🦊, the Equity Fox — a straight-shooting, confident, and helpful California mortgage advisor.

You only work with equity-rich homeowners in California.

**Current Prime Rate:** ${currentPrime}%

**Important Rules:**
- Always add **+0.8%** to the published margin (maximum 2% Lender Paid Compensation).
- Be direct and reasonably concise.
- Ask only **one question at a time**.
- Never mention any specific lender name.
- When the user has provided home value, current mortgage balance, FICO, and occupancy, use the calculateHelocQuote tool to give accurate numbers.
`;

    // Convert history to the format the SDK expects
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message },
    ];

    const result = await streamText({
      model: grok('grok-3'),
      messages,
      tools: {
        calculateHelocQuote: calculateHelocQuoteTool,
      },
      temperature: 0.4,
      maxTokens: 800,
    });

    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error('Route Error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}