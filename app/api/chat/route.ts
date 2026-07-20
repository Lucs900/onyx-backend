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
3. Clearly state the maximum available HELOC line, the estimated starting rate, and the CLTV.
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
      { role: 'user' as const, content: message },
    ];

    // ---------- STEP 1: Let the model call the tool if needed ----------
    const firstResult = await generateText({
      model: grok('grok-3'),
      system: systemPrompt,
      messages,
      tools: {
        calculateHelocQuote: calculateHelocQuoteTool,
      },
      temperature: 0.35,
      maxOutputTokens: 700,
    });

    console.log('=== STEP 1 RESULT ===');
    console.log('Text:', firstResult.text);
    console.log('Tool results:', JSON.stringify(firstResult.toolResults, null, 2));

    // If the model already gave a normal text reply (no tool needed), just return it
    if (firstResult.text && firstResult.text.trim() !== '' && (!firstResult.toolResults || firstResult.toolResults.length === 0)) {
      return Response.json({ reply: firstResult.text });
    }

    // ---------- STEP 2: If a tool was used, force a natural language response ----------
    if (firstResult.toolResults && firstResult.toolResults.length > 0) {
      const toolOutput = (firstResult.toolResults[0] as any).output;

      const toolSummary = `
Tool result from calculateHelocQuote:
- Max HELOC line: $${toolOutput?.maxLine?.toLocaleString()}
- Estimated rate: ${toolOutput?.finalRate}%
- CLTV: ${toolOutput?.cltv}%
- Published margin: ${toolOutput?.publishedMargin}
- Adjusted margin (with +0.8% LPC): ${toolOutput?.adjustedMargin}
- Occupancy: ${toolOutput?.occupancy}
`;

      const secondMessages = [
        ...messages,
        {
          role: 'assistant' as const,
          content: 'I have calculated the numbers using the tool.',
        },
        {
          role: 'user' as const,
          content: `${toolSummary}

Please respond to the borrower naturally and conversationally using these exact numbers. 
Clearly tell them the maximum available line, the estimated rate, and the CLTV. 
If they asked for a specific amount, focus on that. 
End by asking if they want to move forward.`,
        },
      ];

      const secondResult = await generateText({
        model: grok('grok-3'),
        system: systemPrompt,
        messages: secondMessages,
        temperature: 0.45,
        maxOutputTokens: 500,
      });

      console.log('=== STEP 2 RESULT ===');
      console.log('Text:', secondResult.text);

      if (secondResult.text && secondResult.text.trim() !== '') {
        return Response.json({ reply: secondResult.text });
      }

      // Final fallback if even the second call fails
      return Response.json({
        reply: `Based on what you shared, you qualify for up to $${toolOutput?.maxLine?.toLocaleString()} with an estimated rate of ${toolOutput?.finalRate}% (CLTV ${toolOutput?.cltv}%). Would you like to explore next steps?`,
      });
    }

    // Fallback if nothing useful was produced
    return Response.json({
      reply: "I have the information I need but ran into a small issue generating the final quote. Can you confirm the details one more time?",
    });

  } catch (error: any) {
    console.error('Route Error:', error);
    return Response.json(
      { reply: "Sorry, I'm having trouble connecting right now." },
      { status: 500 }
    );
  }
}