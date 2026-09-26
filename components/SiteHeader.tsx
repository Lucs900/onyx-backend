"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AdvisorMark } from "./AdvisorMark";
import { HeroStartLink } from "./fox/HeroStartLink";
import { HEADER_LOGIN_HREF, accountHeaderInitial, hasAccountHeader } from "./fox/account";
import {
  getAccountSessionToken,
  getFoxDraft,
  getResumedAccountEmail,
  getServerDraft,
  signOutLinkedAccount,
  subscribeFoxDraft,
} from "./fox/store";

const NAV_LINKS = [
  { href: "/rates", label: "Rates" },
  { href: "/acr", label: "ACR" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const sessionToken = useSyncExternalStore(subscribeFoxDraft, getAccountSessionToken, () => "");
  const linked = hasAccountHeader(draft, sessionToken);
  const email = getResumedAccountEmail() || draft.contact?.email?.value || "";
  const initial = accountHeaderInitial(email);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
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

  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [accountOpen]);

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    const result = await signOutLinkedAccount();
    setSigningOut(false);
    if (!result.ok) {
      setSignOutError(result.message || "Sign out could not save this File.");
      setAccountOpen(true);
      return;
    }
    setAccountOpen(false);
    window.location.assign("/start?path=acr");
  }

  const accountMenu = (
    <div className="site-header__account" ref={accountRef}>
      <button
        type="button"
        className="site-header__initial"
        aria-expanded={accountOpen}
        aria-haspopup="menu"
        aria-label="Account"
        onClick={() => setAccountOpen((open) => !open)}
      >
        {initial}
      </button>
      {accountOpen ? (
        <div className="site-header__account-menu" role="menu">
          <button
            type="button"
            className="site-header__sign-out"
            role="menuitem"
            disabled={signingOut}
            onClick={() => void onSignOut()}
          >
            Sign out
          </button>
          {signOutError ? <p className="site-header__sign-out-error">{signOutError}</p> : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <header
        className={[
          "site-header",
          scrolled ? "site-header--scrolled" : "",
          linked ? "site-header--account" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="page-pad">
          <div className="page-inner site-header__inner">
            <Link href="/" className="site-header__brand">
              <AdvisorMark size={24} />
              <span className={linked ? "site-header__desk" : "site-header__wordmark"}>
                {linked ? "Relationship desk" : "ONYX"}
              </span>
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
              {linked ? (
                accountMenu
              ) : (
                <>
                  <Link href={HEADER_LOGIN_HREF} className="site-header__login">
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
                </>
              )}
            </div>

            {linked ? null : (
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
            )}
          </div>
        </div>
      </header>

      {linked ? null : (
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
              href={HEADER_LOGIN_HREF}
              className="btn btn--text"
              onClick={() => setMenuOpen(false)}
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
