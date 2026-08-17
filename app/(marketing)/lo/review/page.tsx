import { LoReview } from "@/components/fox/LoReview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Licensed review — ONYX",
  description: "Internal preview — licensed review queue.",
  robots: { index: false, follow: false },
};

export default function LoReviewPage() {
  return <LoReview />;
}
