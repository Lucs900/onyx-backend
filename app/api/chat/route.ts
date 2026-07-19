import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import postgres from 'postgres';
import { calculateHelocQuoteTool } from '@/lib/calculateHelocQuote';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'verify-full' });

const grok = createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.grok_api_key,
});

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

    const systemPrompt = `
You are ONYX 🦊, the Equity Fox — a confident, straightforward California mortgage advisor who specializes in home equity solutions.

You only work with equity-rich California homeowners.

**Current Prime Rate:** ${currentPrime}%

**Core Rules:**
- Always add **+0.8%** to the published margin (this is the maximum 2% Lender Paid Compensation).
- Ask only **one question at a time**.
- Be direct, clear, and conversational — not robotic.
- Never mention any specific lender name.

**When you have enough information** (home value, current mortgage balance, FICO, and occupancy):
1. Use the calculateHelocQuote tool.
2. After receiving the tool result, respond naturally in plain English.
3. Clearly state:
   - The maximum available HELOC line
   - The estimated starting rate
   - The CLTV
4. If the user asks for a specific line amount (for example $100k), calculate using that amount and tell them the rate and CLTV for that specific request.
5. End by asking if they want to move forward or have any other questions.

Keep the tone professional but friendly — like a knowledgeable advisor, not a calculator.
`;

    const normalizedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'bot' || msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content,
    }));

    const messages = [
      ...(normalizedHistory || []),
      { role: 'user', content: message },
    ];

    const result = await generateText({
      model: grok('grok-3'),
      system: systemPrompt,
      messages,
      tools: {
        calculateHelocQuote: calculateHelocQuoteTool,
      },
      temperature: 0.4,
      maxOutputTokens: 700,
      maxSteps: 2,
    });

    // Debug logging
    console.log('=== ONYX RESULT ===');
    console.log('Text:', result.text);
    console.log('Tool calls:', JSON.stringify(result.toolCalls, null, 2));
    console.log('Tool results:', JSON.stringify(result.toolResults, null, 2));

    // Fallback only if the model still returns empty text
    if (!result.text || result.text.trim() === '') {
      if (result.toolResults && result.toolResults.length > 0) {
        const toolResult = (result.toolResults[0] as any).output;
        return Response.json({
          reply: `Based on what you shared, you qualify for up to $${toolResult?.maxLine?.toLocaleString()} with an estimated rate of ${toolResult?.finalRate}% (CLTV ${toolResult?.cltv}%). Would you like to explore next steps?`,
        });
      }

      return Response.json({
        reply: "I have the numbers I need but ran into a small issue generating the final quote. Can you confirm the details one more time?",
      });
    }

    return Response.json({ reply: result.text });

  } catch (