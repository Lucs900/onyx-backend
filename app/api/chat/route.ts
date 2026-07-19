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
You are ONYX 🦊, the Equity Fox — a straight-shooting, confident, and helpful California mortgage advisor.

You only work with equity-rich homeowners in California.

**Current Prime Rate:** ${currentPrime}%

**Important Rules:**
- Always add **+0.8%** to the published margin (maximum 2% Lender Paid Compensation).
- Be direct and reasonably concise.
- Ask only **one question at a time**.
- Never mention any specific lender name.
- When you have enough information (home value, current mortgage balance, FICO, and occupancy), use the calculateHelocQuote tool to give an accurate quote.
- After using the tool, always give the user a clear, friendly summary of the max line, rate, and CLTV.
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
      temperature: 0.35,
      maxOutputTokens: 700,
    });

    // Debug logging
    console.log('=== ONYX RESULT ===');
    console.log('Text:', result.text);
    console.log('Tool calls:', JSON.stringify(result.toolCalls, null, 2));
    console.log('Tool results:', JSON.stringify(result.toolResults, null, 2));

    // Fallback if the model returns empty text after tool use
    if (!result.text || result.text.trim() === '') {
      if (result.toolResults && result.toolResults.length > 0) {
        const toolResult = (result.toolResults[0] as any).output;
        return Response.json({
          reply: `Based on the numbers you gave me, here's a quick estimate:\n\n• Max HELOC line: $${toolResult?.maxLine?.toLocaleString()}\n• Estimated rate: ${toolResult?.finalRate}%\n• CLTV: ${toolResult?.cltv}%\n\nWould you like to move forward with next steps?`,
        });
      }

      return Response.json({
        reply: "I have the information I need, but had trouble generating the final quote. Can you confirm the numbers one more time?",
      });
    }

    return Response.json({ reply: result.text });

  } catch (error: any) {
    console.error('Route Error:', error);
    return Response.json(
      { reply: "Sorry, I'm having trouble connecting right now." },
      { status: 500 }
    );
  }
}