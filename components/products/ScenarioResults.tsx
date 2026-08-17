"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdvisorMark } from "../AdvisorMark";
import { directionsForScenario } from "./directions";
import {
  CREDIT_OPTIONS,
  OCCUPANCY_OPTIONS,
  PURPOSE_OPTIONS,
  TIMELINE_OPTIONS,
  formatDollars,
  labelFor,
  readScenario,
  scenarioFromQuery,
  scenarioToQuery,
  writeScenario,
  type ExplorerScenario,
} from "./scenario";

const TRUST_LINE =
  "NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.";
const ESTIMATE_NOTE = "Estimates only, not a commitment to lend.";
const SUBTEXT =
  "These are not final rates or an approval. Indicative options will appear here next.";

function scenarioFromClientLocation() {
  if (typeof window === "undefined") return null;
  return scenarioFromQuery(new URLSearchParams(window.location.search));
}

export function ScenarioResults() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [scenario, setScenario] = useState<ExplorerScenario | null>(null);

  useEffect(() => {
    const fromQuery = scenarioFromQuery(searchParams) ?? scenarioFromClientLocation();
    const resolved = fromQuery ?? readScenario();
    if (fromQuery) writeScenario(fromQuery);
    setScenario(resolved);
    setReady(true);
  }, [searchParams]);

  const editHref = scenario?.productSlug
    ? `/products/scenario?product=${scenario.productSlug}`
    : "/products/scenario";
  const intakeHref = scenario ? `/intake?${scenarioToQuery(scenario)}` : "/intake";

  if (!ready) {
    return (
      <div className="scenario page-pad" aria-busy="true" aria-live="polite">
        <div className="page-inner scenario__inner">
          <p className="type-eyebrow">California only</p>
          <p className="type-body">Loading your scenario…</p>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="scenario page-pad">
        <div className="page-inner scenario__inner">
          <p className="type-eyebrow">California only</p>
          <h1 className="type-h2 scenario__title">Your scenario</h1>
          <p className="type-body">
            Enter a California scenario to see possible directions here.
          </p>
          <Link href="/products/scenario" className="btn btn--primary">
            Enter a scenario
          </Link>
        </div>
      </div>
    );
  }

  const directions = directionsForScenario(scenario);
  const enteredLoan = scenario.amountMode === "loan";

  return (
    <div className="scenario scenario--results page-pad">
      <div className="page-inner scenario__inner">
        <header className="scenario__lede">
          <div className="product-explorer__rule" aria-hidden="true" />
          <p className="type-eyebrow">California only</p>
          <h1 className="type-h2 scenario__title">Your scenario</h1>
          <p className="type-body">{SUBTEXT}</p>
        </header>

        <section className="scenario-summary" aria-labelledby="scenario-summary-title">
          <div className="scenario-summary__head">
            <h2 id="scenario-summary-title" className="type-card-title">
              Scenario summary
            </h2>
            <Link href={editHref} className="btn btn--text">
              Edit scenario
            </Link>
          </div>
          <dl className="scenario-echo">
            <dt>ZIP</dt>
            <dd>{scenario.zip}</dd>
            <dt>Purpose</dt>
            <dd>{labelFor(PURPOSE_OPTIONS, scenario.purpose)}</dd>
            <dt>Property value</dt>
            <dd>${formatDollars(scenario.propertyValue)}</dd>
            {enteredLoan && scenario.loanAmount != null ? (
              <>
                <dt>Loan amount</dt>
                <dd>${formatDollars(scenario.loanAmount)}</dd>
              </>
            ) : null}
            {!enteredLoan && scenario.downPayment != null ? (
              <>
                <dt>Down payment</dt>
                <dd>${formatDollars(scenario.downPayment)}</dd>
              </>
            ) : null}
            {enteredLoan && scenario.downPayment != null ? (
              <>
                <dt>Implied down payment</dt>
                <dd className="is-quiet">${formatDollars(scenario.downPayment)}</dd>
              </>
            ) : null}
            {!enteredLoan && scenario.loanAmount != null ? (
              <>
                <dt>Implied loan</dt>
                <dd className="is-quiet">${formatDollars(scenario.loanAmount)}</dd>
              </>
            ) : null}
            <dt>Credit range</dt>
            <dd>{labelFor(CREDIT_OPTIONS, scenario.creditRange)}</dd>
            <dt>Occupancy</dt>
            <dd>{labelFor(OCCUPANCY_OPTIONS, scenario.occupancy)}</dd>
            {scenario.timeline ? (
              <>
                <dt>Timeline</dt>
                <dd>{labelFor(TIMELINE_OPTIONS, scenario.timeline)}</dd>
              </>
            ) : null}
            {scenario.productName ? (
              <>
                <dt>Product</dt>
                <dd>{scenario.productName}</dd>
              </>
            ) : null}
          </dl>
        </section>

        <section
          className="scenario-directions"
          aria-labelledby="scenario-directions-title"
        >
          <h2 id="scenario-directions-title" className="type-h2">
            Possible directions
          </h2>
          <ul className="direction-grid">
            {directions.map(({ product, fitNote }) => (
              <li key={product.slug} className="direction-card">
                <h3 className="type-card-title">{product.name}</h3>
                <p className="type-body">{fitNote}</p>
                <p className="type-legal">Indicative details coming soon</p>
                <dl className="direction-card__slots">
                  <div>
                    <dt>Estimated rate range</dt>
                    <dd>—</dd>
                  </div>
                  <div>
                    <dt>Payment range</dt>
                    <dd>—</dd>
                  </div>
                  <div>
                    <dt>Key tradeoff</dt>
                    <dd>—</dd>
                  </div>
                </dl>
                <Link
                  href={`/products/${product.slug}`}
                  className="btn btn--secondary direction-card__cta"
                >
                  Explore this path
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="fox-guidance" aria-labelledby="fox-guidance-title">
          <AdvisorMark size="sm" />
          <div>
            <h2 id="fox-guidance-title" className="type-card-title">
              ONYX Fox will help interpret your options here.
            </h2>
            <p className="type-body">
              Ask about tradeoffs after indicative options land. This is not a
              credit decision.
            </p>
            <Link href="/advisor" className="btn btn--text">
              Talk through this
            </Link>
          </div>
        </section>

        <section className="scenario-next" aria-labelledby="scenario-next-title">
          <h2 id="scenario-next-title" className="type-card-title">
            Next steps
          </h2>
          <div className="scenario-form__actions">
            <Link href={intakeHref} className="btn btn--primary">
              Start application
            </Link>
            <Link href="/advisor" className="btn btn--secondary">
              Talk to a licensed originator
            </Link>
            <Link href={editHref} className="btn btn--text">
              Edit scenario
            </Link>
          </div>
          <p className="type-legal">Fox prepares a draft. A licensed originator reviews it.</p>
        </section>

        <p className="type-legal">{ESTIMATE_NOTE}</p>
        <p className="type-legal">California only.</p>
        <p className="type-legal">{TRUST_LINE}</p>
      </div>
    </div>
  );
}
