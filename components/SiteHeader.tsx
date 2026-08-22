"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdvisorMark } from "./AdvisorMark";
import { HeroStartLink } from "./fox/HeroStartLink";

const NAV_LINKS = [
  { href: "/rates", label: "Rates" },
  { href: "/acr", label: "ACR" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);

    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={scrolled ? "site-header site-header--scrolled" : "site-header"}
      >
        <div className="page-pad">
          <div className="page-inner site-header__inner">
            <Link href="/" className="site-header__brand">
              <AdvisorMark size={24} />
              <span className="site-header__wordmark">ONYX</span>
            </Link>

            <nav className="site-header__nav" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="site-header__link"
                  aria-current={pathname === link.href ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="site-header__actions">
              <Link href="/login" className="site-header__login">
                Log in
              </Link>
              <HeroStartLink
                path="acr"
                className="btn btn--primary btn--nav"
                aria-label="Start your relationship"
              >
                <span className="site-header__cta-full">Start your relationship</span>
                <span className="site-header__cta-short">Start</span>
              </HeroStartLink>
            </div>

            <button
              type="button"
              className="site-header__menu-btn"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="site-header__menu-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={menuOpen ? "site-header__sheet is-open" : "site-header__sheet"}
        role="dialog"
        aria-modal={menuOpen}
        aria-hidden={!menuOpen}
        aria-label="Menu"
        inert={!menuOpen}
      >
        <nav className="site-header__sheet-nav" aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="site-header__sheet-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__sheet-actions">
          <HeroStartLink
            path="acr"
            className="btn btn--primary btn--block"
            onClick={() => setMenuOpen(false)}
          >
            Start your relationship
          </HeroStartLink>
          <HeroStartLink
            path="loan-only"
            className="btn btn--text"
            onClick={() => setMenuOpen(false)}
          >
            Just need a mortgage
          </HeroStartLink>
          <Link
            href="/login"
            className="btn btn--text"
            onClick={() => setMenuOpen(false)}
          >
            Log in
          </Link>
        </div>
      </div>
    </>
  );
}
