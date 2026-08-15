"use client";

import Link from "next/link";
import { AcrPass } from "./AcrPass";

type MembershipHeroProps = {
  onLoanOnly?: () => void;
};

export function MembershipHero({ onLoanOnly }: MembershipHeroProps) {
  return (
    <section className="membership-hero page-pad">
      <div className="page-inner membership-hero__inner">
        <div className="membership-hero__type">
          <div className="membership-hero__intro">
            <div className="membership-hero__rule" aria-hidden="true" />
            <p className="type-eyebrow">Active Credit Relationship</p>
            <h1 className="type-display membership-hero__title">
              Always approved.
              <br />
              Always optimizing.
            </h1>
            <p className="membership-hero__support">
              We keep your credit and rate working for you.
            </p>
          </div>

          <div className="membership-hero__actions">
            <Link href="/acr" className="btn btn--primary btn--hero-primary">
              Start your relationship
            </Link>
            <button
              type="button"
              className="btn btn--secondary btn--hero-secondary"
              onClick={onLoanOnly}
            >
              Just need a mortgage
            </button>
          </div>

          <p className="membership-hero__trust">
            NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.{" "}
            <Link href="/how-we-get-paid">Here’s how we get paid.</Link>
          </p>
        </div>

        <div className="membership-hero__pass">
          <AcrPass />
        </div>
      </div>
    </section>
  );
}
