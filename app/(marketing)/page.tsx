import { AcrBlock } from "@/components/AcrBlock";
import { Closer } from "@/components/Closer";
import { FoxShell } from "@/components/fox/FoxShell";
import { MembershipHero } from "@/components/MembershipHero";

export default function HomePage() {
  return (
    <FoxShell>
      <MembershipHero />
      <AcrBlock />
      <Closer />
    </FoxShell>
  );
}
