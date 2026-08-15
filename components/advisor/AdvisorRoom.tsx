'use client';

import { EquityFoxChat } from '@/components/advisor/EquityFoxChat';

export function AdvisorRoom() {
  return (
    <div className="h-[min(40rem,calc(100dvh-8rem))]">
      <EquityFoxChat variant="page" />
    </div>
  );
}
