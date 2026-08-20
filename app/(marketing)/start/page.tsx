import { StartWorkspace } from "@/components/fox/StartWorkspace";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Start — ONYX",
  description: "Fox prepares your file. Not an approval.",
};

export default function StartPage() {
  return (
    <Suspense
      fallback={
        <section className="start-workspace page-pad">
          <div className="page-inner start-workspace__inner start-workspace__inner--solo">
            <div className="start-workspace__fox-wrap" />
          </div>
        </section>
      }
    >
      <StartWorkspace />
    </Suspense>
  );
}
