import { MarketingArticle } from "@/components/MarketingArticle";
import { ACR_START_HREF } from "@/components/products/startPath";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Log in — ONYX",
  description: "Returning-client login is not in this preview.",
};

export default function LoginPage() {
  return (
    <MarketingArticle eyebrow="Log in" title="Returning clients come later">
      <p className="type-body">
        Login and a member desk are not in this preview. Start a scenario to
        prepare a draft with Fox.
      </p>
      <div className="prose-page__actions">
        <Link href={ACR_START_HREF} className="btn btn--primary">
          Start your relationship
        </Link>
        <Link href="/products" className="btn btn--text">
          See what we offer in California
        </Link>
      </div>
    </MarketingArticle>
  );
}
