import { StartWorkspace } from "@/components/fox/StartWorkspace";
import type { Metadata } from "next";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Start — ONYX",
  description: "Fox prepares your file. Not an approval.",
};

export function headers() {
  return [
    {
      key: "Cache-Control",
      value: "no-store, no-cache, must-revalidate",
    },
  ];
}

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
