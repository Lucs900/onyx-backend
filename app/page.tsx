import Link from 'next/link';
import { EquityFoxMark } from '@/components/brand/EquityFoxMark';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { products } from '@/content/products';
import { site } from '@/content/site';

const loop = [
  {
    step: '01',
    title: 'Start the relationship',
    body: 'Talk to the fox. Share the goal — buy, refinance, unlock equity, or clean up debt. The loan is a chapter, not the book.',
  },
  {
    step: '02',
    title: 'Fund the right structure',
    body: 'Purchase, refinance, HELOC, government, Non-QM, or private capital when that is the honest fit.',
  },
  {
    step: '03',
    title: 'Six payments, then rewards',
    body: 'After six mortgage payments, rewards money can go toward debt, mortgage payments, or similar goals you set with the fox.',
  },
  {
    step: '04',
    title: 'Stay approval-strong',
    body: 'The fox keeps optimizing credit, reducing debt, and building equity so the next decision is made from strength.',
  },
];

const pillars = [
  {
    title: 'Credit',
    body: 'An ongoing read on what helps or hurts approval — not a one-time pull at application.',
  },
  {
    title: 'Debt',
    body: 'A plan for high-cost balances, including using rewards and equity tools with intention.',
  },
  {
    title: 'Equity',
    body: 'Home equity as a managed asset: when to leave it, when to use it, and how to rebuild it.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-onyx text-cream-50">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-fox-600/20 blur-3xl" />
        <Container className="relative grid items-center gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fox-300">
              California residential mortgage
            </p>
            <h1 className="mt-5 font-display text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              The fox does not close the file.{' '}
              <span className="italic text-fox-300">It stays.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream-200">
              ONYX Direct is not a one-time loan helper. The product is an
              Active Credit Relationship — a membership with the ONYX fox as
              your debt, credit, and equity advisor.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={site.advisorPath}>Talk to the fox</Button>
              <Button href="/how-it-works" variant="ghost">
                How ACR works
              </Button>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-onyx-800/80 p-6 shadow-panel sm:p-8">
            <div className="flex items-center gap-3">
              <EquityFoxMark className="h-10 w-10 text-fox-400" />
              <div>
                <p className="text-sm font-semibold">Active Credit Relationship</p>
                <p className="text-xs uppercase tracking-[0.16em] text-fox-300">
                  Membership · Rewards · Advisor
                </p>
              </div>
            </div>
            <dl className="mt-6 space-y-4 text-sm leading-relaxed text-cream-200">
              <div>
                <dt className="font-semibold text-cream-50">After 6 payments</dt>
                <dd>
                  Rewards money you can use to pay down debt, make mortgage
                  payments, or similar goals.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-cream-50">Always-on fox</dt>
                <dd>
                  Continuous guidance so you stay at strong approval levels —
                  not just “approved once.”
                </dd>
              </div>
            </dl>
            <Link
              href="/advisor"
              className="mt-6 inline-flex text-sm font-semibold text-fox-300 hover:text-fox-400"
            >
              Start a conversation →
            </Link>
          </aside>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fox-600">
            The real product
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl sm:text-4xl">
            An Active Credit Relationship, not a closing gift.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Most mortgage companies disappear after funding. ONYX Direct is
            built the other way: the fox remains your membership-based advisor
            for the life of the credit story — optimizing the mix of debt,
            credit, and home equity.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm"
              >
                <h3 className="font-display text-2xl">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {pillar.body}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-cream-100 py-16 sm:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fox-600">
              The membership loop
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Six payments. Rewards. Then the fox keeps going.
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-2">
            {loop.map((item) => (
              <li
                key={item.step}
                className="rounded-2xl border border-cream-200 bg-cream-50 p-6"
              >
                <p className="font-display text-3xl text-fox-500">{item.step}</p>
                <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Button href="/how-it-works" variant="secondary">
              See how the fox & ACR work
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fox-600">
                Financing tools
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                Every product sits inside the relationship.
              </h2>
            </div>
            <Button href="/products" variant="secondary">
              View all products
            </Button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <Link
                key={product.slug}
                href={`/products#${product.slug}`}
                className="rounded-2xl border border-cream-200 bg-white p-5 transition hover:border-fox-300 hover:shadow-lift"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-fox-600">
                  {product.category}
                </p>
                <h3 className="mt-2 font-display text-xl">{product.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {product.summary}
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-onyx py-16 text-cream-50 sm:py-20">
        <Container className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl">
              The advisor is already built. Start talking.
            </h2>
            <p className="mt-4 text-cream-200">
              The ONYX Advisor — Equity Fox — is live on this site. Open the
              widget on any page, or use the dedicated conversation room. Same
              bot. Same memory for this visit.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={site.advisorPath}>Talk to the fox</Button>
            <Button href="/contact" variant="ghost">
              Get started
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
