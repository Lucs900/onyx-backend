import { MarketingArticle } from "@/components/MarketingArticle";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How we get paid — ONYX",
  description:
    "ONYX is a mortgage broker. Compensation may be lender paid and/or borrower paid as applicable.",
};

export default function HowWeGetPaidPage() {
  return (
    <MarketingArticle eyebrow="How we get paid" title="We are a mortgage broker">
      <p className="type-body">
        ONYX is paid for arranging a loan. Compensation may be lender paid
        and/or borrower paid, as applicable to the transaction.
      </p>
      <p className="type-body">
        Specific fees are disclosed when a loan is offered. This page does not
        post a fee schedule or a live rate.
      </p>
      <p className="type-body">California only.</p>
      <p className="type-legal">NMLS [OPEN] · CA DRE [OPEN]</p>
      <div className="prose-page__actions">
        <Link href="/licensing" className="btn btn--text">
          Licensing
        </Link>
        <Link href="/about" className="btn btn--text">
          About ONYX
        </Link>
      </div>
    </MarketingArticle>
  );
}
