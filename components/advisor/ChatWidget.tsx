'use client';

import { usePathname } from 'next/navigation';
import { EquityFoxChat } from '@/components/advisor/EquityFoxChat';
import { useAdvisor } from '@/components/advisor/AdvisorProvider';
import { EquityFoxMark } from '@/components/brand/EquityFoxMark';

export function ChatWidget() {
  const pathname = usePathname();
  const { widgetOpen, setWidgetOpen } = useAdvisor();

  if (pathname === '/advisor') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {widgetOpen && (
        <div
          className="h-[min(34rem,calc(100dvh-7.5rem))] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-onyx/10 bg-cream-50 shadow-panel"
          role="dialog"
          aria-label="Talk to the ONYX Equity Fox"
        >
          <EquityFoxChat
            variant="widget"
            onClose={() => setWidgetOpen(false)}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setWidgetOpen(!widgetOpen)}
        className="inline-flex items-center gap-2 rounded-full bg-onyx px-4 py-3 text-sm font-semibold text-cream-50 shadow-panel ring-1 ring-white/10 transition hover:bg-onyx-700"
        aria-expanded={widgetOpen}
        aria-controls={undefined}
      >
        <EquityFoxMark className="h-6 w-6 text-fox-400" />
        <span>{widgetOpen ? 'Hide the fox' : 'Talk to the fox'}</span>
      </button>
    </div>
  );
}
