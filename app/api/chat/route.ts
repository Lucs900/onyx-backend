import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import postgres from 'postgres';
import { calculateHelocQuoteTool } from '@/lib/calculateHelocQuote';
import { getProductGuidelineTool } from '@/lib/getProductGuideline';
import { calculateDtiTool } from '@/lib/calculateDti';

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
- Always add **+0.8%** to the published margin (maximum 2% Lender Paid Compensation).
- Ask only **one question at a time**.
- Be direct, clear, and conversational.
- Never mention any specific lender name.
- **Never assume or invent a number the user has not explicitly given you.**
- Only mention guideline rules that are relevant to the current borrower (e.g. do not mention the 740 FICO rule if the borrower already has a higher FICO).
- Do not repeat the same question if the user has already answered it.

**Available Tools – use them:**
1. calculateHelocQuote → when you have home value, mortgage balance, FICO, and occupancy and need a rate / max line.
2. getProductGuideline → when the user asks about product rules (draw period, min/max line, DTI limits, etc.).
3. calculateDti → when the user has provided income + debts and wants to know their actual DTI including the HELOC payment.

**Conversation style:**
- After giving a quote, ask a useful next question (how much they want to use, purpose of funds, timeline, etc.) instead of always saying “want to move forward?”.
- When the user shows clear interest, start collecting contact or next-step information.
`;

    const normalizedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'bot' || msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content,
    }));

    const messages = [
      ...(normalizedHistory || []),
      { role: 'user' as const, content: message },
    ];

    // ---------- STEP 1 ----------
    const firstResult = await generateText({
      model: grok('grok-3'),
      system: systemPrompt,
      messages,
      tools: {
        calculateHelocQuote: calculateHelocQuoteTool,
        getProductGuideline: getProductGuidelineTool,
        calculateDti: calculateDtiTool,
      },
      temperature: 0.35,
      maxOutputTokens: 700,
    });

    console.log('=== STEP 1 RESULT ===');
    console.log('Text:', firstResult.text);
    console.log('Tool calls:', JSON.stringify(firstResult.toolCalls, null, 2));
    console.log('Tool results:', JSON.stringify(firstResult.toolResults, null, 2));

    if (firstResult.text && firstResult.text.trim() !== '' && (!firstResult.toolResults || firstResult.toolResults.length === 0)) {
      return Response.json({ reply: firstResult.text });
    }

    // ---------- STEP 2: Natural response after tools ----------
    if (firstResult.toolResults && firstResult.toolResults.length > 0) {
      const toolSummaries = firstResult.toolResults.map((tr: any) => {
        if (tr.toolName === 'calculateHelocQuote') {
          const o = tr.output;
          return `HELOC Quote:
- Max line: $${o?.maxLine?.toLocaleString()}
- Rate: ${o?.finalRate}%
- CLTV: ${o?.cltv}%
- Occupancy: ${o?.occupancy}`;
        }
        if (tr.toolName === 'getProductGuideline') {
          const o = tr.output;
          return `Guideline (${o?.topic}):
${o?.guideline}`;
        }
        if (tr.toolName === 'calculateDti') {
          const o = tr.output;
          return `DTI Calculation:
- Monthly income: $${o?.monthlyIncome?.toLocaleString()}
- Current mortgage: $${o?.monthlyMortgage}
- Other debts: $${o?.otherMonthlyDebts}
- HELOC payment (interest-only): $${o?.helocPayment}
- Total monthly debts: $${o?.totalMonthlyDebts}
- Estimated DTI: ${o?.dti}%
- Qualifies under 50% max: ${o?.qualifies ? 'Yes' : 'No'}`;
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

Respond to the borrower naturally using only the exact information above. 
Do not invent numbers. 
Do not repeat questions they already answered. 
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

    return Response.json({
      reply: "I have the information I need but ran into a small issue. Can you try asking again?",
    });

  } catch (error: any) {
    console.error('Route Error:', error);
    return Response.json(
      { reply: "Sorry, I'm having trouble connecting right now." },
      { status: 500 }
    );
  }
}