import { LoReview } from "@/components/fox/LoReview";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Licensed review — ONYX",
  description: "Internal preview — licensed review queue.",
  robots: { index: false, follow: false },
};

export default function LoReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="intake page-pad">
          <div className="page-inner intake__inner">
            <p className="type-legal">Loading review…</p>
          </div>
        </div>
      }
    >
      <LoReview />
    </Suspense>
  );
}
