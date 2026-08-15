import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PageHero } from '@/components/ui/PageHero';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'How the ONYX Fox & ACR Works',
  description:
    'The Active Credit Relationship is a membership with the ONYX fox: finance the home, make six payments, receive rewards, and keep optimizing credit, debt, and equity.',
};

const stages = [
  {
    title: 'Meet the fox',
    body: 'Open the advisor from any page. Tell it what you are trying to do — buy, refinance, tap equity, or get a clearer picture of credit and debt. You do not have to know the product name first.',
  },
  {
    title: 'Choose a structure that you can live with',
    body: 'Purchase, rate/term, cash-out, HELOC, FHA, VA, conventional, TIC, Non-QM, commercial, or private capital including fix & flip and construction. The fox’s job is the honest fit, not the fastest pitch.',
  },
  {
    title: 'Make six mortgage payments',
    body: 'The relationship is designed to continue after funding. Six payments is the first milestone — proof the plan is in motion, not a one-week close-and-forget.',
  },
  {
    title: 'Receive rewards money',
    body: 'Rewards can be used to pay down debt, make mortgage payments, or similar goals you set with the advisor. The point is momentum on the credit story, not a generic gift card.',
  },
  {
    title: 'Keep the fox on the file',
    body: 'Credit still moves. Debt still compounds. Equity still changes with the market and with your choices. The fox stays in the loop so you remain at strong approval levels for the next decision.',
  },
];

const rewardsUses = [
  'Pay down high-interest debt',
  'Make a mortgage payment',
  'Support a similar, agreed credit or equity goal',
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="How the ONYX fox and the Active Credit Relationship work"
        lede="ACR is a membership. The fox is the advisor. The loan is how many relationships begin — not where they are supposed to end."
      />

      <Container className="py-14 sm:py-16">
        <ol className="space-y-6">
          {stages.map((stage, index) => (
            <li
              key={stage.title}
              className="grid gap-4 rounded-2xl border border-cream-200 bg-white p-6 sm:grid-cols-[4rem_1fr] sm:p-8"
            >
              <p className="font-display text-4xl text-fox-500">
                {String(index + 1).padStart(2, '0')}
              </p>
              <div>
                <h2 className="font-display text-2xl">{stage.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">
                  {stage.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-cream-100 p-7 sm:p-8">
            <h2 className="font-display text-2xl">What rewards are for</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              After six mortgage payments, rewards money is meant to keep the
              plan moving. Typical uses:
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {rewardsUses.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fox-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-onyx p-7 text-cream-50 sm:p-8">
            <h2 className="font-display text-2xl">What the fox watches</h2>
            <p className="mt-3 text-sm leading-relaxed text-cream-200">
              Credit quality, debt load, equity position, and whether you still
              sit at a strong approval level. That is the difference between a
              loan officer and an Active Credit Relationship.
            </p>
            <div className="mt-6">
              <Button href={site.advisorPath}>Ask the fox about ACR</Button>
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
