"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { AdvisorSpotlight, type AdvisorMode } from "./AdvisorSpotlight";
import { MembershipHero } from "./MembershipHero";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type LoanSpotlightContextValue = {
  chooseLoan: () => void;
};

const LoanSpotlightContext = createContext<LoanSpotlightContextValue | null>(null);

export function useLoanSpotlight() {
  const context = useContext(LoanSpotlightContext);
  if (!context) {
    throw new Error("useLoanSpotlight must be used within HomeExperience");
  }
  return context;
}

export function HomeExperience({ children }: { children?: ReactNode }) {
  const [mode, setMode] = useState<AdvisorMode>("relationship");

  const chooseLoan = () => {
    setMode("loan");
    document.getElementById("advisor-spotlight")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <LoanSpotlightContext.Provider value={{ chooseLoan }}>
      <MembershipHero onLoanOnly={chooseLoan} />
      <AdvisorSpotlight mode={mode} onModeChange={setMode} />
      {children}
    </LoanSpotlightContext.Provider>
  );
}
