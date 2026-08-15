import { Closer } from "@/components/Closer";
import { ComparisonTable } from "@/components/ComparisonTable";
import { HomeExperience } from "@/components/HomeExperience";
import { HowItWorks } from "@/components/HowItWorks";
import { ProofStats } from "@/components/ProofStats";
import { RateCard } from "@/components/RateCard";
import { ValueBreakdown } from "@/components/ValueBreakdown";

export default function HomePage() {
  return (
    <HomeExperience>
      <ValueBreakdown />
      <RateCard />
      <ComparisonTable />
      <HowItWorks />
      <ProofStats />
      <Closer />
    </HomeExperience>
  );
}
