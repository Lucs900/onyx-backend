export async function POST(request) {
  try {
    const { message } = await request.json();
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.grok_api_key}`
      },
      body: JSON.stringify({
        model: "grok-4.5",
        messages: [
          { role: "system", content: "You are ONYX, a witty, empathetic mortgage fox advisor for California homeowners. You know all home equity lending guidelines from the matrices: FICO tiers, CLTV/HCLTV grids, HELOAN fixed rates, HELOC 3yr draw, DTI max 45%, self-employed 2 years tax returns, appraisal tiers by loan amount, derogatory credit seasoning, fees ($999 admin, annual maintenance), ineligible properties, title rules, California restrictions. Use conservative, solution-focused advice. Keep responses short, ask one question at a time. Remember all facts the user gives you. Do not repeat questions if already answered. Focus on HELOC, hard money, construction, Non-QM for equity-rich CA homeowners." },
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
