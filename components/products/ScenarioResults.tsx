"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CREDIT_OPTIONS,
  OCCUPANCY_OPTIONS,
  PURPOSE_OPTIONS,
  TIMELINE_OPTIONS,
  formatDollars,
  labelFor,
  readScenario,
  scenarioFromQuery,
} from "./scenario";

const TRUST_LINE =
  "NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.";
const ESTIMATE_NOTE = "Estimates only, not a commitment to lend.";

export function ScenarioResults() {
  const searchParams = useSearchParams();
  const [scenario, setScenario] = useState(() => scenarioFromQuery(searchParams));

  useEffect(() => {
    setScenario(scenarioFromQuery(searchParams) ?? readScenario());
  }, [searchParams]);

  const editHref = scenario?.productSlug
    ? `/products/scenario?product=${scenario.productSlug}`
    : "/products/scenario";

  if (!scenario) {
    return (
      <div className="scenario page-pad">
        <div className="page-inner scenario__inner">
          <p className="type-eyebrow">California only</p>
          <h1 className="type-h2 scenario__title">No scenario yet</h1>
          <p className="type-body">
            Enter a California scenario to see indicative options next.
          </p>
          <Link href="/products/scenario" className="btn btn--primary">
            Start a scenario
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="scenario page-pad">
      <div className="page-inner scenario__inner">
        <div className="product-explorer__rule" aria-hidden="true" />
        <p className="type-eyebrow">California only</p>
        <h1 className="type-h2 scenario__title">Indicative results coming next</h1>
        <p className="type-body">
          We have your scenario. Options and comparisons are the next slice.
          Nothing here is a rate, an approval, or a commitment to lend.
        </p>

        <dl className="scenario-echo">
          {scenario.productName ? (
            <>
              <dt>Product</dt>
              <dd>{scenario.productName}</dd>
            </>
          ) : null}
          <dt>Purpose</dt>
          <dd>{labelFor(PURPOSE_OPTIONS, scenario.purpose)}</dd>
          <dt>ZIP</dt>
          <dd>{scenario.zip}</dd>
          <dt>Property value</dt>
          <dd>${formatDollars(scenario.propertyValue)}</dd>
          {scenario.amountMode === "loan" && scenario.loanAmount != null ? (
            <>
              <dt>Loan amount</dt>
              <dd>${formatDollars(scenario.loanAmount)}</dd>
            </>
          ) : null}
          {scenario.downPayment != null ? (
            <>
              <dt>Down payment</dt>
              <dd>${formatDollars(scenario.downPayment)}</dd>
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
        </dl>

        <p className="type-legal">{ESTIMATE_NOTE}</p>
        <p className="type-legal">{TRUST_LINE}</p>

        <div className="scenario-form__actions">
          <Link href={editHref} className="btn btn--secondary">
            Edit the scenario
          </Link>
          <Link href="/advisor" className="btn btn--text">
            Talk to a licensed originator
          </Link>
        </div>
      </div>
    </div>
  );
}
