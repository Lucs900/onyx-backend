import Link from "next/link";
import { AdvisorMark } from "./AdvisorMark";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/rates", label: "Rates" },
  { href: "/acr", label: "ACR" },
  { href: "/privacy", label: "Privacy" },
  { href: "/licensing", label: "Licensing" },
  { href: "/how-we-get-paid", label: "How we get paid" },
  {
    href: "https://www.nmlsconsumeraccess.org/",
    label: "NMLS Consumer Access",
    external: true,
  },
  { href: "/equal-housing", label: "Equal Housing" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-pad">
        <div className="page-inner site-footer__inner">
          <Link href="/" className="site-footer__brand">
            <AdvisorMark size={16} />
            <span className="site-header__wordmark">ONYX</span>
          </Link>

          <ul className="site-footer__links">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                {"external" in link && link.external ? (
                  <a href={link.href} rel="noopener noreferrer" target="_blank">
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href}>{link.label}</Link>
                )}
              </li>
            ))}
          </ul>

          <div className="site-footer__legal">
            <p className="type-legal">
              ONYX can make mistakes. “Always approved” is the relationship
              goal, not a credit decision.
            </p>
            <p className="type-legal">
              NMLS ____ — placeholder, pending approval. No license numbers,
              rates, or compliance claims on this page have been approved.
            </p>
            <p className="type-legal">
              <Link href="/lo/review">Preview: licensed review queue</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
