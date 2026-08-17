import { AcrCloser } from "@/components/acr/AcrCloser";
import { AcrHero } from "@/components/acr/AcrHero";
import { DeskPreview } from "@/components/acr/DeskPreview";
import { FeesTrust } from "@/components/acr/FeesTrust";
import { RewardFolio } from "@/components/acr/RewardFolio";
import { UnlockPath } from "@/components/acr/UnlockPath";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ValueBreakdown } from "@/components/ValueBreakdown";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Active Credit Relationship — ONYX",
  description:
    "The desk that stays open. ACR is an ongoing relationship — not a one-time loan.",
};

export default function AcrPage() {
  return (
    <>
      <AcrHero />
      <RewardFolio />
      <UnlockPath />
      <ValueBreakdown />
      <DeskPreview />
      <ComparisonTable />
      <FeesTrust />
      <AcrCloser />
    </>
  );
}
