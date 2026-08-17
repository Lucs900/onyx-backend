import { MarketingArticle } from "@/components/MarketingArticle";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Licensing — ONYX",
  description:
    "ONYX is a California mortgage broker. NMLS and DRE numbers are pending approval.",
};

export default function LicensingPage() {
  return (
    <MarketingArticle eyebrow="Licensing" title="California mortgage broker">
      <p className="type-body">
        ONYX operates as a mortgage broker in California. License numbers are
        not final on this preview.
      </p>
      <p className="type-legal">NMLS [OPEN] · CA DRE [OPEN]</p>
      <p className="type-legal">
        Do not treat placeholders as issued numbers. Confirm licenses on NMLS
        Consumer Access when numbers are published.
      </p>
      <div className="prose-page__actions">
        <a
          href="https://www.nmlsconsumeraccess.org/"
          className="btn btn--secondary"
          rel="noopener noreferrer"
          target="_blank"
        >
          NMLS Consumer Access
        </a>
        <Link href="/how-we-get-paid" className="btn btn--text">
          How we get paid
        </Link>
      </div>
    </MarketingArticle>
  );
}
