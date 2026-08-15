import { ComparisonTable } from "@/components/ComparisonTable";
import { HomeExperience } from "@/components/HomeExperience";
import { RateCard } from "@/components/RateCard";
import { ValueBreakdown } from "@/components/ValueBreakdown";

export default function HomePage() {
  return (
    <HomeExperience>
      <ValueBreakdown />
      <RateCard />
      <ComparisonTable />
    </HomeExperience>
  );
}
