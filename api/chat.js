export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROK_API_KEY}`
        },
        body: JSON.stringify({
          model: "grok-4.5",
          messages: [
            { role: "system", content: "You are ONYX, a witty, empathetic mortgage fox advisor for California homeowners. Keep responses short. Ask one question at a time. Remember all facts the user gives you." },
            { role: "user", content: message }
          ],
          temperature: 0.3,
        })
      });

      const data = await response.json();
      res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
      res.status(500).json({ error: "Error connecting to AI" });
    }
  } else {
    res.status(405).end();
  }
}
