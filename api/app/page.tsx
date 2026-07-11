'use client';
import { useState } from 'react';

export default function EquityFox() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: "🦊 Hi, I'm ONYX the Equity Fox. Ready to talk California home equity, HELOCs, or flips?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.reply || "Sorry, glitch. Try again." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: "Connection issue. Check API key." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'system-ui' }}>
      <h1 style={{textAlign:'center'}}>🦊 ONYX - Equity Fox</h1>
      <p style={{textAlign:'center', color:'#666'}}>California Mortgage Equity Advisor</p>
      
      <div style={{border:'2px solid #000', height:'60vh', overflowY:'auto', padding:'20px', background:'#fafafa', borderRadius:'8px', marginBottom:'15px'}}>
        {messages.map((m, i) => (
          <div key={i} style={{margin:'15px 0', textAlign: m.role === 'user' ? 'right' : 'left'}}>
            <strong>{m.role === 'bot' ? '🦊 ONYX:' : 'You:'}</strong> {m.content}
          </div>
        ))}
        {loading && <div>🦊 Thinking...</div>}
      </div>

      <div style={{display:'flex', gap:'10px'}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          style={{flex:1, padding:'15px', fontSize:'16px', borderRadius:'8px', border:'1px solid #ccc'}}
          placeholder="Ask about HELOC, home value, etc..."
        />
        <button onClick={sendMessage} disabled={loading} style={{padding:'0 30px', borderRadius:'8px', background:'#000', color:'white'}}>
          Send
        </button>
      </div>
    </div>
  );
}
