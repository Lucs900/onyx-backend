import { MarketingArticle } from "@/components/MarketingArticle";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — ONYX",
  description: "How ONYX handles information you share while preparing a draft.",
};

export default function PrivacyPage() {
  return (
    <MarketingArticle eyebrow="Privacy" title="What you share stays with the draft">
      <p className="type-body">
        ONYX uses what you type and drop to prepare an application draft. A
        licensed originator may review that draft.
      </p>
      <p className="type-body">
        This preview stores draft answers in your browser. Uploaded file bytes
        are not kept in the repository or given a public URL.
      </p>
      <p className="type-legal">
        A full privacy policy is pending approval. California only.
      </p>
      <div className="prose-page__actions">
        <Link href="/about" className="btn btn--text">
          About ONYX
        </Link>
      </div>
    </MarketingArticle>
  );
}
