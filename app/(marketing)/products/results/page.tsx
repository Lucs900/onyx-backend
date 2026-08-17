import { ScenarioResults } from "@/components/products/ScenarioResults";
import { scenarioFromSearchRecord } from "@/components/products/scenario";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Your scenario — ONYX",
  description:
    "These are not final rates or an approval. Indicative options will appear here next.",
};

export const dynamic = "force-dynamic";

export default function ResultsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const initialScenario = scenarioFromSearchRecord(searchParams);

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
      <ScenarioResults initialScenario={initialScenario} />
    </Suspense>
  );
}
