'use client';
import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: "🦊 Hi, I'm ONYX the Equity Fox. How can I help unlock your California home equity today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.reply || "Sorry, I had a glitch." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', content: "Connection issue. Try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px', fontFamily: 'Arial' }}>
      <h1 style={{ textAlign: 'center' }}>🦊 ONYX - Equity Fox</h1>
      <p style={{ textAlign: 'center' }}>California Home Equity Advisor</p>
      
      <div style={{ border: '2px solid #333', height: '500px', overflowY: 'scroll', padding: '15px', background: '#f9f9f9', marginBottom: '10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '12px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <strong>{m.role === 'bot' ? '🦊 ONYX:' : 'You:'}</strong><br />
            {m.content}
          </div>
        ))}
        {loading && <div>Thinking...</div>}
      </div>

      <div style={{ display: 'flex' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          style={{ flex: 1, padding: '12px', fontSize: '16px' }}
          placeholder="Type here... e.g. I have a house in San Francisco"
        />
        <button onClick={sendMessage} style={{ padding: '12px 20px', marginLeft: '8px' }}>
          Send
        </button>
      </div>
    </div>
  );
}
