import { ScenarioResults } from "@/components/products/ScenarioResults";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Scenario results — ONYX",
  description: "Indicative results coming next. Estimates only, not a commitment to lend.",
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
