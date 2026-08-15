'use client';

import { useEffect, useRef } from 'react';
import { EquityFoxMark } from '@/components/brand/EquityFoxMark';
import { useAdvisor } from '@/components/advisor/AdvisorProvider';

type EquityFoxChatProps = {
  variant?: 'page' | 'widget';
  onClose?: () => void;
};

export function EquityFoxChat({ variant = 'page', onClose }: EquityFoxChatProps) {
  const { messages, input, setInput, loading, sendMessage } = useAdvisor();
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  const isWidget = variant === 'widget';

  return (
    <div
      className={
        isWidget
          ? 'flex h-full min-h-0 flex-col bg-cream-50'
          : 'flex h-full min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-cream-200 bg-cream-50 shadow-lift'
      }
    >
      <div className="flex items-center gap-3 border-b border-cream-200 bg-onyx px-4 py-3 text-cream-50">
        <EquityFoxMark className="h-8 w-8 text-fox-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">ONYX · Equity Fox</p>
          <p className="truncate text-xs text-cream-300">
            Ongoing debt, credit, and equity advisor
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs font-semibold text-cream-200 hover:text-white"
          >
            Close
          </button>
        )}
      </div>

      <div
        ref={scrollerRef}
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 ${
          isWidget ? '' : 'sm:px-6 sm:py-5'
        }`}
        aria-live="polite"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-onyx text-cream-50'
                  : 'bg-white text-ink shadow-sm ring-1 ring-cream-200'
              }`}
            >
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider opacity-70">
                {message.role === 'bot' ? 'ONYX' : 'You'}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-sm text-ink-muted">The fox is thinking…</p>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-cream-200 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <label htmlFor={`onyx-chat-input-${variant}`} className="sr-only">
          Message the Equity Fox
        </label>
        <input
          id={`onyx-chat-input-${variant}`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about credit, equity, rewards, or a loan…"
          disabled={loading}
          className="min-w-0 flex-1 rounded-full border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm outline-none ring-fox-400/0 transition focus:border-fox-400 focus:ring-2 focus:ring-fox-400/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full bg-fox-500 px-4 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-fox-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
