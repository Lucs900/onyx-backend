import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL, { ssl: 'verify-full' });

export async function POST(request) {
  try {
    const { message } = await request.json();
    // Query the matrix from DB
    const matrix = await sql`SELECT data FROM matrices WHERE name = 'spring_eq_matrix' LIMIT 1`;
    const matrixData = matrix[0] ? matrix[0].data : 'Matrix data loaded from DB';

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.grok_api_key}`
      },
      body: JSON.stringify({
        model: "grok-4.5",
        messages: [
          { role: "system", content: "You are ONYX, a smart, honest, straight-to-the-point California mortgage fox advisor for equity-rich homeowners. You know all home equity lending guidelines from the matrices: FICO tiers, CLTV/HCLTV grids, HELOAN fixed rates, HELOC 3yr draw, DTI max 45%, self-employed 2 years tax returns, appraisal tiers by loan amount, derogatory credit seasoning, fees ($999 admin, annual maintenance), ineligible properties, title rules, California restrictions. Use conservative, solution-focused advice. Keep responses short and direct. Ask ONE question at a time. Remember all facts the user gives you. Track conversation history and reference previous answers without repeating questions. Focus on HELOC, hard money, construction, Non-QM for equity-rich CA homeowners. Speak confidently and make the user feel hopeful and confident working with you. For calculator: With home value and balance, calculate equity = value - balance. Max HELOC ~80-90% CLTV depending on FICO. Estimate payments using rates." },
          { role: "user", content: message }
        ],
        temperature: 0.3,
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('xAI API Error:', response.status, errorBody);
      return Response.json({ reply: "Sorry, API error." }, { status: 500 });
    }
    const data = await response.json();
    return Response.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.log("Error:", error.message);
    return Response.json({ reply: "Sorry, connection issue. Try again later." }, { status: 500 });
  }
}
