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

const FLOIFY_LINK = 'https://onyxdirect.floify.com/';

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
You are ONYX 🦊, the Equity Fox — a precise, straightforward California HELOC advisor.

**Current Prime Rate:** ${currentPrime}%

====================
STRICT RULES
====================
1. NEVER assume or invent any number the user has not explicitly given you.
2. NEVER set mortgage balance equal to home value unless the user said so.
3. Once the borrower chooses a specific line amount (e.g. "100k"), stop mentioning the maximum available line unless they ask for it again.
4. Only calculate or discuss DTI when the borrower explicitly asks if they qualify, what their DTI is, or if they can afford it. Do not run DTI automatically.
5. When the borrower selects a specific line amount (e.g. "100k"):
   - Immediately give a clean multi-line summary using the tools.
   - Format it exactly like this (each item on its own line):

For a $100,000 HELOC on your primary residence:

• Rate: 7.83%
• Monthly payment (interest-only): $652.50
• CLTV: 60%
• Draw period: 3 years

Would you like to move forward with this?

   - Always include Rate, Monthly payment, CLTV, and Draw period.
   - Then ask if they want to move forward.
6. ONLY ask for the email address when BOTH of these are true:
   - You have already given the borrower a specific HELOC quote with a line amount, AND
   - The borrower then shows clear intent to move forward (e.g. "yes", "I want to proceed", "let's do it", "send me the application", "I want to apply", etc.).
   In that case reply with exactly:
   "Great. To generate your application link I just need your email address."
7. When the borrower provides an email address after you asked for it, reply with exactly:
   "Thank you.

→ [Start Your Application](${FLOIFY_LINK})

Please use the same email when you begin so we can match everything."
8. When asking for occupancy type, always use this exact format:
   "Is this your Primary (P), Second (S), or Investment (I) property?"
9. Ask only one question at a time.
10. Do not repeat questions the user has already answered.
11. Never mention any specific lender name.
12. A simple "yes" at the very beginning of the conversation only means the borrower is ready to start talking. It is NOT application intent.

====================
TOOLS
====================
- calculateHelocQuote → Use for rate / max line / CLTV. Always pass desiredLine when the user specifies an amount.
- calculatePayment → Use whenever you need the monthly payment (especially after a line amount is chosen).
- calculateDti → Use ONLY when the user explicitly asks about qualification or DTI.
- getProductGuideline → Use for product rules (draw period, min/max line, etc.). Always use it to confirm the 3-year draw period.

Be direct, clear, and professional.
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
      await maybeSaveConversation(message, normalizedHistory, firstResult.text);
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
Follow the STRICT RULES in the system prompt exactly.
If the borrower just chose a specific line amount, give the full multi-line summary and ask if they want to move forward.`,
        },
      ];

      const secondResult = await generateText({
        model: grok('grok-3'),
        system: systemPrompt,
        messages: secondMessages,
        temperature: 0.35,
        maxOutputTokens: 500,
      });

      console.log('=== STEP 2 RESULT ===');
      console.log('Text:', secondResult.text);

      if (secondResult.text && secondResult.text.trim() !== '') {
        await maybeSaveConversation(message, normalizedHistory, secondResult.text);
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

async function maybeSaveConversation(
  latestMessage: string,
  history: any[],
  reply: string
) {
  try {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = latestMessage.match(emailRegex) || reply.match(emailRegex);
    const email = emailMatch ? emailMatch[0] : null;

    if (!email && !reply.includes('onyxdirect.floify.com')) {
      return;
    }

    const fullTranscript = [
      ...history.map(m => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${latestMessage}`,
      `ASSISTANT: ${reply}`,
    ].join('\n');

    const summary = {
      email: email || 'not_provided',
      floifyLinkSent: reply.includes('onyxdirect.floify.com'),
      timestamp: new Date().toISOString(),
      transcript: fullTranscript,
    };

    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        email TEXT,
        summary JSONB,
        transcript TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO conversations (email, summary, transcript)
      VALUES (${summary.email}, ${sql.json(summary)}, ${fullTranscript})
    `;

    console.log('Conversation saved for email:', summary.email);
  } catch (err) {
    console.error('Failed to save conversation:', err);
  }
}