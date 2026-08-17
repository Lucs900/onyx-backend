import { MarketingArticle } from "@/components/MarketingArticle";
import { ACR_START_HREF, LOAN_START_HREF } from "@/components/products/startPath";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — ONYX",
  description:
    "ONYX is a California mortgage broker. Fox assists. A licensed originator reviews.",
};

export default function AboutPage() {
  return (
    <MarketingArticle eyebrow="About" title="A California mortgage desk">
      <p className="type-body">
        ONYX is a mortgage broker in California. We help people buy, refinance,
        and use equity, then stay with the file after close.
      </p>
      <p className="type-body">
        ONYX Fox can assist and prepare a draft. A licensed originator reviews
        it. Fox cannot approve, lock, or commit to lend.
      </p>
      <p className="type-body">
        The Active Credit Relationship is the ongoing option: the desk stays
        open, and a membership reward is prepared when you join. A mortgage is
        still available on its own.
      </p>
      <p className="type-legal">
        NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.
      </p>
      <div className="prose-page__actions">
        <Link href={ACR_START_HREF} className="btn btn--primary">
          Start your relationship
        </Link>
        <Link href={LOAN_START_HREF} className="btn btn--secondary">
          Just need a mortgage
        </Link>
        <Link href="/acr" className="btn btn--text">
          Learn about ACR
        </Link>
        <Link href="/how-we-get-paid" className="btn btn--text">
          How we get paid
        </Link>
        <Link href="/licensing" className="btn btn--text">
          Licensing
        </Link>
      </div>
    </MarketingArticle>
  );
}
