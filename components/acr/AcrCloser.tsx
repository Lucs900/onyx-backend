import Link from "next/link";
import { HeroStartLink } from "@/components/fox/HeroStartLink";

export function AcrCloser() {
  return (
    <section className="closer page-pad" aria-labelledby="acr-closer-title">
      <div className="closer__inner">
        <h2 id="acr-closer-title" className="type-h2">
          Always approved. Always optimizing.
        </h2>
        <div className="closer__actions">
          <HeroStartLink path="acr" className="btn btn--primary btn--hero-primary">
            Start your relationship
          </HeroStartLink>
          <HeroStartLink path="loan-only" className="btn btn--secondary btn--hero-secondary">
            Just need a mortgage
          </HeroStartLink>
        </div>
        <p className="closer__originator">
          <Link href="/start" className="btn btn--text">
            Talk to a licensed originator
          </Link>
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
