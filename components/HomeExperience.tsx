"use client";

import { useState } from "react";
import { AdvisorSpotlight, type AdvisorMode } from "./AdvisorSpotlight";
import { MembershipHero } from "./MembershipHero";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HomeExperience() {
  const [mode, setMode] = useState<AdvisorMode>("relationship");

  const chooseLoan = () => {
    setMode("loan");
    document.getElementById("advisor-spotlight")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <>
      <MembershipHero onLoanOnly={chooseLoan} />
      <AdvisorSpotlight mode={mode} onModeChange={setMode} />
    </>
  );
}
