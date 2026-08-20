import { AcrBlock } from "@/components/AcrBlock";
import { Closer } from "@/components/Closer";
import { FoxShell } from "@/components/fox/FoxShell";
import { MembershipHero } from "@/components/MembershipHero";
import { ProofStats } from "@/components/ProofStats";
import { RateCard } from "@/components/RateCard";

export default function HomePage() {
  return (
    <FoxShell>
      <MembershipHero />
      <AcrBlock />
      <RateCard />
      <ProofStats />
      <Closer />
    </FoxShell>
  );
}
