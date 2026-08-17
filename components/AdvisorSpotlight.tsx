"use client";

import { FormEvent, useEffect, useState } from "react";
import { requestFoxAsk } from "@/components/fox/AlwaysOnFox";
import { FOX_DISCLOSURE } from "@/components/fox/types";
import { AdvisorMark } from "./AdvisorMark";

export type AdvisorMode = "relationship" | "loan";

const CHIPS = {
  relationship: [
    "What’s ACR?",
    "How do you keep me approved?",
    "What does optimizing mean?",
  ],
  loan: ["Buy a home", "Refinance", "Use equity"],
} as const;

const PLACEHOLDER = {
  relationship: "Ask about your status, credit, or ACR.",
  loan: "Ask about buying, refinancing, or equity.",
} as const;

const DISCLOSURE = {
  relationship: FOX_DISCLOSURE,
  loan: FOX_DISCLOSURE,
} as const;

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
  const chips = CHIPS[mode];
  const [selectedChip, setSelectedChip] = useState<string>(CHIPS[mode][0]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setSelectedChip(CHIPS[mode][0]);
    setDraft("");
  }, [mode]);

  const setMode = (next: AdvisorMode) => {
    if (next === mode) return;
    if (modeProp === undefined) setUncontrolledMode(next);
    onModeChange?.(next);
  };

  const askFox = (text: string) => {
    const q = text.trim();
    if (!q) return;
    requestFoxAsk(q);
    setDraft("");
  };

  const fillChip = (chip: string) => {
    setSelectedChip(chip);
    askFox(chip);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    askFox(draft);
  };

  return (
    <section
      id="advisor-spotlight"
      className="advisor-spotlight page-pad"
      aria-label="ONYX Fox"
    >
      <div className="advisor-spotlight__inner">
        <div
          className="spotlight-toggle"
          data-mode={mode}
          role="group"
          aria-label="What to ask Fox"
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

        <form className="spotlight-composer" onSubmit={onSubmit}>
          <span className="spotlight-composer__mark">
            <AdvisorMark size="sm" />
          </span>
          <label className="visually-hidden" htmlFor="advisor-composer">
            Ask ONYX Fox
          </label>
          <input
            id="advisor-composer"
            className="spotlight-composer__input"
            type="text"
            value={draft}
            placeholder={PLACEHOLDER[mode]}
            autoComplete="off"
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              if (!(chips as readonly string[]).includes(value)) {
                setSelectedChip("");
              }
            }}
          />
          <button
            type="submit"
            className="spotlight-composer__send"
            disabled={!draft.trim()}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h9M8.5 3.5 13 8l-4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        <div className="spotlight-chips">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={
                selectedChip === chip
                  ? "spotlight-chip is-selected"
                  : "spotlight-chip"
              }
              aria-pressed={selectedChip === chip}
              onClick={() => fillChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        <p className="spotlight-disclosure">{DISCLOSURE[mode]}</p>
        {mode === "loan" ? (
          <button type="button" className="btn btn--text spotlight-form-link">
            Prefer a short form
          </button>
        ) : null}
      </div>
    </section>
  );
}
