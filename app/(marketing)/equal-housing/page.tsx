import { MarketingArticle } from "@/components/MarketingArticle";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Equal Housing — ONYX",
  description: "ONYX is an Equal Housing mortgage broker in California.",
};

export default function EqualHousingPage() {
  return (
    <MarketingArticle eyebrow="Equal Housing" title="We do not discriminate">
      <p className="type-body">
        ONYX is an Equal Housing mortgage broker. We do not discriminate in
        housing or credit on a basis prohibited by federal or California law.
      </p>
      <p className="type-legal">
        A longer statement is pending approval. NMLS [OPEN] · CA DRE [OPEN]
      </p>
      <div className="prose-page__actions">
        <Link href="/licensing" className="btn btn--text">
          Licensing
        </Link>
      </div>
    </MarketingArticle>
  );
}
