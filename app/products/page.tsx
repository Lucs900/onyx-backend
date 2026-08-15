import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PageHero } from '@/components/ui/PageHero';
import { productCategories, products } from '@/content/products';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Purchase, refinance, HELOC, FHA, VA, conventional, TIC, Non-QM, commercial, and private capital — all inside an Active Credit Relationship with the ONYX fox.',
};

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Products"
        title="The loan is a tool. The fox is the product."
        lede="ONYX Direct offers a full California residential menu — and commercial or private capital when the file needs it. Every option is meant to sit inside an Active Credit Relationship, not a one-and-done close."
      />

      <Container className="py-14 sm:py-16">
        <div className="flex flex-wrap gap-2">
          {productCategories.map((category) => (
            <a
              key={category}
              href={`#${category.toLowerCase().replace(/[^a-z]+/g, '-')}`}
              className="rounded-full bg-cream-100 px-3 py-1.5 text-xs font-semibold text-onyx ring-1 ring-cream-300 hover:bg-white"
            >
              {category}
            </a>
          ))}
        </div>

        <div className="mt-12 space-y-14">
          {productCategories.map((category) => (
            <section
              key={category}
              id={category.toLowerCase().replace(/[^a-z]+/g, '-')}
            >
              <h2 className="font-display text-2xl sm:text-3xl">{category}</h2>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {products
                  .filter((product) => product.category === category)
                  .map((product) => (
                    <article
                      key={product.slug}
                      id={product.slug}
                      className="scroll-mt-24 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm"
                    >
                      <h3 className="font-display text-2xl">{product.name}</h3>
                      <p className="mt-2 text-sm font-medium text-fox-600">
                        {product.summary}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                        {product.details}
                      </p>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-3xl bg-onyx px-6 py-8 text-cream-50 sm:px-10">
          <h2 className="font-display text-2xl sm:text-3xl">
            Not sure which structure fits?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-200">
            Ask the fox. The advisor can talk through goals first, then product.
            This page does not publish rates — those change, and inventing them
            here would be the wrong kind of helpful.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={site.advisorPath}>Talk to the fox</Button>
            <Button href="/how-it-works" variant="ghost">
              How ACR works
            </Button>
          </div>
        </div>

        <p className="mt-8 text-sm text-ink-muted">
          Looking for the membership loop instead of a product name?{' '}
          <Link href="/how-it-works" className="font-semibold text-fox-600">
            Read how the ONYX fox and ACR work
          </Link>
          .
        </p>
      </Container>
    </>
  );
}
