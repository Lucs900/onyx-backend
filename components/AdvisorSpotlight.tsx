"use client";

import { useState } from "react";

export type AdvisorMode = "relationship" | "loan";

type AdvisorSpotlightProps = {
  defaultMode?: AdvisorMode;
  mode?: AdvisorMode;
  onModeChange?: (mode: AdvisorMode) => void;
};

export function AdvisorSpotlight({
  defaultMode = "relationship",
  mode: modeProp,
  onModeChange,
}: AdvisorSpotlightProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState<AdvisorMode>(defaultMode);
  const mode = modeProp ?? uncontrolledMode;

  const setMode = (next: AdvisorMode) => {
    if (next === mode) return;
    if (modeProp === undefined) setUncontrolledMode(next);
    onModeChange?.(next);
  };

  return (
    <section
      id="advisor-spotlight"
      className="advisor-spotlight page-pad"
      aria-label="Relationship or loan"
    >
      <div className="advisor-spotlight__inner">
        <div
          className="spotlight-toggle"
          data-mode={mode}
          role="group"
          aria-label="Relationship or loan"
        >
          <span className="spotlight-toggle__thumb" aria-hidden="true" />
          <button
            type="button"
            className="spotlight-toggle__option"
            aria-pressed={mode === "relationship"}
            onClick={() => setMode("relationship")}
          >
            Relationship
          </button>
          <button
            type="button"
            className="spotlight-toggle__option"
            aria-pressed={mode === "loan"}
            onClick={() => setMode("loan")}
          >
            Loan
          </button>
        </div>
      </div>
    </section>
  );
}
