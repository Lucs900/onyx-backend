import { Container } from '@/components/ui/Container';

type PageHeroProps = {
  eyebrow: string;
  title: string;
  lede: string;
};

export function PageHero({ eyebrow, title, lede }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-onyx text-cream-100">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
      <Container className="relative py-16 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fox-300">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream-200 sm:text-lg">
          {lede}
        </p>
      </Container>
    </section>
  );
}
