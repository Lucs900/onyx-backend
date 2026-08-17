import { Closer } from "@/components/Closer";
import { ComparisonTable } from "@/components/ComparisonTable";
import { FoxShell } from "@/components/fox/FoxShell";
import { HomeExperience } from "@/components/HomeExperience";
import { HowItWorks } from "@/components/HowItWorks";
import { ProofStats } from "@/components/ProofStats";
import { RateCard } from "@/components/RateCard";
import { ValueBreakdown } from "@/components/ValueBreakdown";

export default function HomePage() {
  return (
    <FoxShell>
      <HomeExperience>
        <ValueBreakdown />
        <RateCard />
        <ComparisonTable />
        <HowItWorks />
        <ProofStats />
        <Closer />
      </HomeExperience>
    </FoxShell>
  );
}
