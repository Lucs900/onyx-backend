import { MarketingArticle } from "@/components/MarketingArticle";
import { LOAN_START_HREF } from "@/components/products/startPath";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Licensed originator — ONYX",
  description:
    "Fox is primary. A licensed originator can review a draft on request.",
};

export default function AdvisorPage() {
  return (
    <MarketingArticle eyebrow="Licensed originator" title="Fox prepares. A human reviews.">
      <p className="type-body">
        ONYX Fox is the first place to ask and to start a draft. A licensed
        originator reviews what you confirm. Fox cannot approve, lock, or
        commit to lend.
      </p>
      <p className="type-body">
        If you only need a mortgage, start a loan only scenario. If you want
        the relationship, start ACR.
      </p>
      <p className="type-legal">California only. NMLS [OPEN]</p>
      <div className="prose-page__actions">
        <Link href={LOAN_START_HREF} className="btn btn--primary">
          Just need a mortgage
        </Link>
        <Link href="/products/scenario?path=acr" className="btn btn--secondary">
          Start your relationship
        </Link>
      </div>
    </MarketingArticle>
  );
}
