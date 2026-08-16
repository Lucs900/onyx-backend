import { ScenarioForm } from "@/components/products/ScenarioForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "California scenario — ONYX",
  description:
    "Enter a California loan scenario. Estimates only, not a commitment to lend.",
};

export default function ScenarioPage() {
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
      <ScenarioForm />
    </Suspense>
  );
}
