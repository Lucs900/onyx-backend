import Link from 'next/link';
import { EquityFoxMark } from '@/components/brand/EquityFoxMark';
import { Container } from '@/components/ui/Container';
import { navItems, site } from '@/content/site';

export function Footer() {
  return (
    <footer className="border-t border-onyx/10 bg-onyx text-cream-200">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5 text-cream-50">
            <EquityFoxMark className="h-8 w-8 text-fox-400" />
            <span className="font-display text-xl">{site.name}</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-cream-300">
            A California residential mortgage company. The real product is an
            Active Credit Relationship — the ONYX fox as an ongoing membership
            advisor for debt, credit, equity, and rewards after six payments.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fox-300">
            Explore
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-cream-50">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={site.advisorPath} className="hover:text-cream-50">
                Talk to the fox
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fox-300">
            Get started
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/contact" className="hover:text-cream-50">
                Contact
              </Link>
            </li>
            <li>
              <a
                href={site.floifyUrl}
                className="hover:text-cream-50"
                target="_blank"
                rel="noreferrer"
              >
                Start an application
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <Container className="border-t border-white/10 py-6 text-xs leading-relaxed text-cream-300/80">
        <p>
          Placeholder compliance copy — pending approval. NMLS ID, license
          numbers, and Equal Housing Lender language will be published here
          after legal review. This branch does not change any live
          onyxdirect.com disclosures.
        </p>
        <p className="mt-3">
          © {new Date().getFullYear()} {site.legalName}. Marketing foundation
          preview — not a production cutover.
        </p>
      </Container>
    </footer>
  );
}
