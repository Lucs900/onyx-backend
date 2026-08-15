"use client";

import Link from "next/link";
import { useLoanSpotlight } from "./HomeExperience";

export function Closer() {
  const { chooseLoan } = useLoanSpotlight();

  return (
    <section className="closer page-pad" aria-labelledby="closer-title">
      <div className="closer__inner">
        <h2 id="closer-title" className="type-h2">
          Always approved. Always optimizing.
        </h2>
        <p className="type-body">
          Start the relationship, or just get the loan. Either way, you leave
          with a next step.
        </p>
        <div className="closer__actions">
          <Link href="/acr" className="btn btn--primary btn--hero-primary">
            Start your relationship
          </Link>
          <button
            type="button"
            className="btn btn--secondary btn--hero-secondary"
            onClick={chooseLoan}
          >
            Just need a mortgage
          </button>
        </div>
        <p className="closer__originator">
          <button type="button" className="btn btn--text">
            Talk to a licensed originator
          </button>
          <span className="type-legal">NMLS ____</span>
        </p>
        <p className="closer__trust">
          NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.{" "}
          <Link href="/how-we-get-paid">Here’s how we get paid.</Link>
        </p>
      </div>
    </section>
  );
}
