import { ProcessingHub } from "@/components/fox/ProcessingHub";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Processing hub — ONYX",
  description: "Internal preview — staff 1008 analog on the same File as /start.",
  robots: { index: false, follow: false },
};

export default function ProcessingHubPage() {
  return (
    <Suspense
      fallback={
        <div className="intake page-pad">
          <div className="page-inner intake__inner">
            <p className="type-legal">Loading hub…</p>
          </div>
        </div>
      }
    >
      <ProcessingHub />
    </Suspense>
  );
}
