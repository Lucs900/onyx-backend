'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EquityFoxMark } from '@/components/brand/EquityFoxMark';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { navItems, site } from '@/content/site';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-cream-200/80 bg-cream-50/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 text-onyx">
          <EquityFoxMark className="h-8 w-8 text-fox-500" />
          <span className="font-display text-xl tracking-tight">{site.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition ${
                  active ? 'text-fox-600' : 'text-ink-muted hover:text-onyx'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Button href={site.advisorPath} variant="primary">
            Talk to the fox
          </Button>
        </div>

        <button
          type="button"
          className="rounded-full p-2 text-onyx lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <span className="block h-5 w-6">
            <span
              className={`block h-0.5 w-full bg-current transition ${
                open ? 'translate-y-2 rotate-45' : ''
              }`}
            />
            <span
              className={`mt-1.5 block h-0.5 w-full bg-current transition ${
                open ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`mt-1.5 block h-0.5 w-full bg-current transition ${
                open ? '-translate-y-2 -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </Container>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-cream-200 bg-cream-50 lg:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-base font-medium text-onyx hover:bg-cream-100"
              >
                {item.label}
              </Link>
            ))}
            <Button href={site.advisorPath} className="mt-2">
              Talk to the fox
            </Button>
          </Container>
        </div>
      )}
    </header>
  );
}
