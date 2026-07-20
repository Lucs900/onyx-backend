import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import postgres from 'postgres';
import { calculateHelocQuoteTool } from '@/lib/calculateHelocQuote';
import { getProductGuidelineTool } from '@/lib/getProductGuideline';
import { calculateDtiTool } from '@/lib/calculateDti';
import { calculatePaymentTool } from '@/lib/calculatePayment';

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
You are ONYX 🦊, the Equity Fox — a precise, no-nonsense California HELOC advisor.

**Current Prime Rate:** ${currentPrime}%

====================
STRICT RULES (NEVER BREAK THESE)
====================
1. NEVER assume or invent any number the user has not explicitly given you.
2. NEVER set mortgage balance equal to home value unless the user said so.
3. When the user gives a specific line amount (e.g. "100k"), you MUST call calculateHelocQuote again with desiredLine set to that amount. Do not reuse an old rate.
4. When the user asks for a monthly payment, you MUST call calculatePayment. Never invent the payment.
5. When calculating DTI:
   - You MUST call calculateDti.
   - If other monthly debts have not been given, ASK for them. Never invent other debts.
6. Only mention guideline rules that actually apply to this borrower.
7. Ask only one question at a time.
8. Do not repeat questions the user has already answered.

====================
TOOLS – USE THEM CORRECTLY
====================
- calculateHelocQuote → Use for any rate / max line / CLTV quote. Always pass the correct desiredLine when the user specifies an amount.
- calculatePayment → Use whenever the user asks about monthly payment.
- calculateDti → Use for any DTI question. Require income + mortgage + other debts.
- getProductGuideline → Use for product rules (draw period, min/max line, etc.).

====================
STYLE
====================
Be direct, clear, and professional. After giving numbers, ask a useful next question.
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
        calculatePayment: calculatePaymentTool,
        calculateDti: calculateDtiTool,
      },
      temperature: 0.3,
      maxOutputTokens: 700,
    });

    console.log('=== STEP 1 RESULT ===');
    console.log('Text:', firstResult.text);
    console.log('Tool calls:', JSON.stringify(firstResult.toolCalls, null, 2));
    console.log('Tool results:', JSON.stringify(firstResult.toolResults, null, 2));

    if (firstResult.text && firstResult.text.trim() !== '' && (!firstResult.toolResults || firstResult.toolResults.length === 0)) {
      return Response.json({ reply: firstResult.text });
    }

    // ---------- STEP 2 ----------
    if (firstResult.toolResults && firstResult.toolResults.length > 0) {
      const toolSummaries = firstResult.toolResults.map((tr: any) => {
        if (tr.toolName === 'calculateHelocQuote') {
          const o = tr.output;
          return `HELOC Quote Result:
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
        if (tr.toolName === 'calculatePayment') {
          const o = tr.output;
          return `Payment Result:
- Amount: $${o?.amount?.toLocaleString()}
- Rate: ${o?.rate}%
- Monthly payment: $${o?.monthlyPayment}`;
        }
        if (tr.toolName === 'calculateDti') {
          const o = tr.output;
          return `DTI Result:
- Income: $${o?.monthlyIncome?.toLocaleString()}
- Mortgage: $${o?.monthlyMortgage}
- Other debts: $${o?.otherMonthlyDebts}
- HELOC payment: $${o?.helocPayment}
- Total debts: $${o?.totalMonthlyDebts}
- DTI: ${o?.dti}%
- Qualifies: ${o?.qualifies ? 'Yes' : 'No'}`;
        }
        return JSON.stringify(tr.output);
      }).join('\n\n');

      const secondMessages = [
        ...messages,
        {
          role: 'assistant' as const,
          content: 'I used the tools to get accurate numbers.',
        },
        {
          role: 'user' as const,
          content: `${toolSummaries}

Respond naturally using ONLY the numbers above. 
Do not invent any numbers. 
Do not assume missing information. 
If something required is missing, ask for it.`,
        },
      ];

      const secondResult = await generateText({
        model: grok('grok-3'),
        system: systemPrompt,
        messages: secondMessages,
        temperature: 0.4,
        maxOutputTokens: 500,
      });

      console.log('=== STEP 2 RESULT ===');
      console.log('Text:', secondResult.text);

      if (secondResult.text && secondResult.text.trim() !== '') {
        return Response.json({ reply: secondResult.text });
      }
    }

    return Response.json({
      reply: "I need a bit more information to give you an accurate answer. Can you clarify?",
    });

  } catch (error: any) {
    console.error('Route Error:', error);
    return Response.json(
      { reply: "Sorry, I'm having trouble connecting right now." },
      { status: 500 }
    );
  }
}