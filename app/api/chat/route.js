export async function POST(request) {
  try {
    const { message } = await request.json();
    console.log("Key loaded:", !!process.env.grok_api_key); // Debug
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.grok_api_key}`
      },
      body: JSON.stringify({
        model: "grok-4.5",
        messages: [
          { role: "system", content: "You are ONYX, a witty, empathetic mortgage fox advisor for California homeowners. Keep responses short. Ask one question at a time." },
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
    console.log("Error:", error.message); // Debug
    return Response.json({ reply: "Sorry, connection issue. Try again later." }, { status: 500 });
  }
}
