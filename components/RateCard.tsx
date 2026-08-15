"use client";

import { useLoanSpotlight } from "./HomeExperience";

export function RateCard() {
  const { chooseLoan } = useLoanSpotlight();

  return (
    <section className="rate-card-section page-pad" aria-label="Mortgage only">
      <div className="page-inner rate-card-section__inner">
        <p className="type-eyebrow">Mortgage only</p>
        <div className="rate-card">
          <p className="rate-card__product">Purchase · 30-year fixed</p>
          <p className="type-legal">As low as</p>
          <p className="rate-card__apr">
            <span className="rate-card__apr-num">—</span>
            <span className="rate-card__apr-unit">APR</span>
          </p>
          <p className="type-legal">Sample · not live</p>

          <dl className="rate-card__specs">
            <div>
              <dt>Decision</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Check</dt>
              <dd>Soft pull</dd>
            </div>
          </dl>

          <button
            type="button"
            className="btn btn--primary btn--hero-primary rate-card__cta"
            onClick={chooseLoan}
          >
            Find my rate
          </button>
          <p className="type-legal">2 min · no hard credit check</p>
        </div>
        <p className="rate-card-section__offramp">
          A mortgage is available without ACR.
        </p>
        <p className="type-legal rate-card-section__asof">
          As of — · not a commitment
        </p>
      </div>
    </section>
  );
}
