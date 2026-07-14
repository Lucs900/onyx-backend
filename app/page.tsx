'use client';
import { useState } from 'react';

export default function EquityFox() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: "🦊 Hi, I'm ONYX the Equity Fox. Ready to unlock your California home equity?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: newMessages })
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'bot', content: data.reply || "Sorry, glitch." }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'bot', content: "Connection issue." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <h1>🦊 ONYX - Equity Fox</h1>
      <div style={{ border: '2px solid #000', height: '500px', overflowY: 'scroll', padding: '20px', marginBottom: '10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '10px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <strong>{m.role === 'bot' ? '🦊 ONYX:' : 'You:'}</strong> {m.content}
          </div>
        ))}
        {loading && <div>Thinking...</div>}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} style={{width: '70%', padding: '10px'}} placeholder="Type here..." />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
