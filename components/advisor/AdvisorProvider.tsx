'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { consumeAdvisorSeed } from '@/components/advisor/advisor-session';

export type ChatRole = 'bot' | 'user';
export type ChatMessage = { role: ChatRole; content: string };

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: 'bot',
    content:
      "Hi, I'm ONYX the Equity Fox. I stay with you after the loan — credit, debt, equity, and the rewards that start after six payments. What should we look at first?",
  },
];

type AdvisorContextValue = {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  sendMessage: (override?: string) => Promise<void>;
  widgetOpen: boolean;
  setWidgetOpen: (open: boolean) => void;
};

const AdvisorContext = createContext<AdvisorContextValue | null>(null);

export function AdvisorProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const seededRef = useRef(false);

  const sendMessage = useCallback(async (override?: string) => {
    const userMsg = (override ?? input).trim();
    if (!userMsg || loading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMsg },
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: newMessages }),
      });
      const data = await res.json();
      setMessages([
        ...newMessages,
        { role: 'bot', content: data.reply || 'Sorry, glitch.' },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'bot', content: 'Connection issue.' },
      ]);
    }

    setLoading(false);
  }, [input, loading, messages]);

  useEffect(() => {
    const open = () => setWidgetOpen(true);
    window.addEventListener('onyx:open-advisor', open);
    return () => window.removeEventListener('onyx:open-advisor', open);
  }, []);

  useEffect(() => {
    if (seededRef.current) return;
    const seed = consumeAdvisorSeed();
    if (!seed) return;
    seededRef.current = true;
    setWidgetOpen(true);
    void sendMessage(seed);
  }, [sendMessage]);

  const value = useMemo(
    () => ({
      messages,
      input,
      setInput,
      loading,
      sendMessage,
      widgetOpen,
      setWidgetOpen,
    }),
    [messages, input, loading, sendMessage, widgetOpen]
  );

  return (
    <AdvisorContext.Provider value={value}>{children}</AdvisorContext.Provider>
  );
}

export function useAdvisor() {
  const context = useContext(AdvisorContext);
  if (!context) {
    throw new Error('useAdvisor must be used within AdvisorProvider');
  }
  return context;
}
