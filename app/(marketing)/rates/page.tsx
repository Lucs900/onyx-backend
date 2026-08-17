import { MarketingArticle } from "@/components/MarketingArticle";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rates — ONYX",
  description:
    "ONYX does not post a live rate board. Pricing is based on a California scenario.",
};

export default function RatesPage() {
  return (
    <MarketingArticle eyebrow="Rates" title="Pricing is based on your scenario">
      <p className="type-body">
        We do not post a live rate board. A rate depends on the loan, the
        property, and the file. California only.
      </p>
      <p className="type-body">
        Enter a scenario to see possible directions. Indicative ranges can
        appear after that. They are not a quote or a lock.
      </p>
      <p className="type-legal">Sample, not live. NMLS [OPEN] · CA DRE [OPEN]</p>
      <div className="prose-page__actions">
        <Link href="/products" className="btn btn--primary">
          See what we offer in California
        </Link>
        <Link href="/products/scenario" className="btn btn--secondary">
          Explore a California scenario
        </Link>
      </div>
    </MarketingArticle>
  );
}
