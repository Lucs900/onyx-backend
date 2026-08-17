import { ScenarioResults } from "@/components/products/ScenarioResults";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Your scenario — ONYX",
  description:
    "These are not final rates or an approval. Indicative options will appear here next.",
};

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="scenario page-pad">
          <div className="page-inner scenario__inner">
            <p className="type-legal">Loading scenario…</p>
          </div>
        </div>
      }
    >
      <ScenarioResults />
    </Suspense>
  );
}
