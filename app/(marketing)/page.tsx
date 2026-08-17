import { Closer } from "@/components/Closer";
import { ComparisonTable } from "@/components/ComparisonTable";
import { FoxShell } from "@/components/fox/FoxShell";
import { HowItWorks } from "@/components/HowItWorks";
import { MembershipHero } from "@/components/MembershipHero";
import { ProofStats } from "@/components/ProofStats";
import { RateCard } from "@/components/RateCard";
import { ValueBreakdown } from "@/components/ValueBreakdown";

export default function HomePage() {
  return (
    <FoxShell>
      <MembershipHero />
      <ValueBreakdown />
      <RateCard />
      <ComparisonTable />
      <HowItWorks />
      <ProofStats />
      <Closer />
    </FoxShell>
  );
}
