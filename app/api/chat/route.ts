import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import postgres from 'postgres';
import { calculateHelocQuoteTool } from '@/lib/calculateHelocQuote';
import { getProductGuidelineTool } from '@/lib/getProductGuideline';

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
- Never invent product rules. Always use the getProductGuideline tool when the user asks about draw period, repayment terms, minimum/maximum line amounts, DTI, credit requirements, additional draws, or any other guideline.

**Available Tools:**
1. calculateHelocQuote → Use this when you have enough information (home value, mortgage balance, FICO, occupancy) to give a rate and max line quote.
2. getProductGuideline → Use this whenever the user asks about product rules, terms, or guidelines (draw period, min/max line, DTI, etc.).

**When giving a quote:**
- Clearly state the maximum available HELOC line, the estimated starting rate, and the CLTV.
- If the user asks for a specific line amount, calculate using that amount.
- End by asking a useful next question (not always “want to move forward?”).

Keep the tone professional but friendly — like a knowledgeable advisor.
`;

    const normalizedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'bot' || msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content,
    }));

    const messages = [
      ...(normalizedHistory || []),
      { role: 'user' as const, content: message },
    ];

    // ---------- STEP 1: Let the model use tools if needed ----------
    const firstResult = await generateText({
      model: grok('grok-3'),
      system: systemPrompt,
      messages,
      tools: {
        calculateHelocQuote: calculateHelocQuoteTool,
        getProductGuideline: getProductGuidelineTool,
      },
      temperature: 0.35,
      maxOutputTokens: 700,
    });

    console.log('=== STEP 1 RESULT ===');
    console.log('Text:', firstResult.text);
    console.log('Tool calls:', JSON.stringify(firstResult.toolCalls, null, 2));
    console.log('Tool results:', JSON.stringify(firstResult.toolResults, null, 2));

    // If the model already gave a normal text reply with no tools, just return it
    if (firstResult.text && firstResult.text.trim() !== '' && (!firstResult.toolResults || firstResult.toolResults.length === 0)) {
      return Response.json({ reply: firstResult.text });
    }

    // ---------- STEP 2: If any tool was used, generate a natural response ----------
    if (firstResult.toolResults && firstResult.toolResults.length > 0) {
      const toolSummaries = firstResult.toolResults.map((tr: any) => {
        if (tr.toolName === 'calculateHelocQuote') {
          const o = tr.output;
          return `HELOC Quote Result:
- Max HELOC line: $${o?.maxLine?.toLocaleString()}
- Estimated rate: ${o?.finalRate}%
- CLTV: ${o?.cltv}%
- Occupancy: ${o?.occupancy}`;
        }
        if (tr.toolName === 'getProductGuideline') {
          const o = tr.output;
          return `Guideline Result (${o?.topic}):
${o?.guideline}`;
        }
        return JSON.stringify(tr.output);
      }).join('\n\n');

      const secondMessages = [
        ...messages,
        {
          role: 'assistant' as const,
          content: 'I looked up the information using the available tools.',
        },
        {
          role: 'user' as const,
          content: `${toolSummaries}

Please respond to the borrower naturally and conversationally using the exact information above. 
Do not invent any numbers or rules. 
Be clear and helpful.`,
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
    }

    // Final fallback
    return Response.json({
      reply: "I have the information I need but ran into a small issue generating the response. Can you try asking again?",
    });

  } catch (error: any) {
    console.error('Route Error:', error);
    return Response.json(
      { reply: "Sorry, I'm having trouble connecting right now." },
      { status: 500 }
    );
  }
}