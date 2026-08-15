import type { Metadata } from 'next';
import { AdvisorRoom } from '@/components/advisor/AdvisorRoom';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'Talk to the Fox',
  description:
    'Talk with ONYX, the Equity Fox — the existing ONYX Advisor for credit, debt, equity, and California home financing.',
};

export default function AdvisorPage() {
  return (
    <section className="bg-cream-100 py-10 sm:py-14">
      <Container className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fox-600">
            ONYX Advisor
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
            Talk to the fox
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            This is the same Equity Fox that already lives at `/api/chat`.
            Use it to start an Active Credit Relationship, ask about a
            product, or pick up a thought you began in the site widget.
            Conversation state is shared for this visit.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-ink-muted">
            <li>Credit, debt, and equity — not only a HELOC quote</li>
            <li>Rewards after six mortgage payments</li>
            <li>A path to the application when you are ready</li>
          </ul>
        </div>
        <AdvisorRoom />
      </Container>
    </section>
  );
}
