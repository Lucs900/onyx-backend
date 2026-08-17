import { IntakeExperience } from "@/components/fox/IntakeExperience";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Prepare a draft — ONYX",
  description:
    "Fox prepares an application draft. A licensed originator reviews it. Not an approval.",
};

export default function IntakePage() {
  return (
    <Suspense
      fallback={
        <div className="intake page-pad">
          <div className="page-inner intake__inner">
            <p className="type-legal">Loading draft…</p>
          </div>
        </div>
      }
    >
      <IntakeExperience />
    </Suspense>
  );
}
