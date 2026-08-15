import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PageHero } from '@/components/ui/PageHero';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'ONYX Direct is a California residential mortgage company. The ONYX fox is a membership-based advisor for debt, credit, and equity — not a mascot for a one-time loan.',
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About ONYX Direct"
        title="A California mortgage company built around an advisor, not a transaction."
        lede="We help residents finance homes. The reason to stay is the Active Credit Relationship — the fox working credit, debt, and equity after the loan funds."
      />

      <Container className="grid gap-10 py-14 sm:py-16 lg:grid-cols-5">
        <div className="space-y-6 text-base leading-relaxed text-ink-muted lg:col-span-3">
          <p>
            ONYX Direct is a California residential mortgage company. The live
            site many people know is HELOC-focused. This marketing foundation
            states the fuller idea: the loan — HELOC or otherwise — is how the
            relationship often starts. The product we want people to remember
            is the fox.
          </p>
          <p>
            The ONYX fox (Equity Fox) is an ongoing, membership-based advisor.
            It is not a cartoon closer. After a client makes six mortgage
            payments, rewards money can be used to pay down debt, make
            mortgage payments, or similar goals. Meanwhile the fox keeps
            watching the things that decide the next approval: credit, debt,
            and equity.
          </p>
          <p>
            We will not invent a founding myth, a staff roster, a license
            number, or a testimonial on this page. Those belong in approved
            compliance copy. Until then, the honest version is the operating
            idea: stay in the credit relationship.
          </p>
        </div>

        <aside className="rounded-3xl border border-cream-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="font-display text-2xl">What we are</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-muted">
            <li>A California residential mortgage company</li>
            <li>An advisor-first membership around the ONYX fox</li>
            <li>A full product menu, with HELOC as one tool among others</li>
            <li>A company that expects the conversation to continue after funding</li>
          </ul>
          <h2 className="mt-8 font-display text-2xl">What this page is not</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-muted">
            <li>A rate sheet</li>
            <li>A substitute for licensed disclosures</li>
            <li>A production cutover of onyxdirect.com</li>
          </ul>
        </aside>
      </Container>

      <section className="bg-cream-100">
        <Container className="flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
          <p className="max-w-xl font-display text-2xl text-onyx">
            The shortest way to understand ONYX is to talk to the fox.
          </p>
          <Button href={site.advisorPath} variant="secondary">
            Talk to the fox
          </Button>
        </Container>
      </section>
    </>
  );
}
