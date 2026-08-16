"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getProduct } from "./catalog";
import {
  CREDIT_OPTIONS,
  OCCUPANCY_OPTIONS,
  PURPOSE_OPTIONS,
  TIMELINE_OPTIONS,
  formatDollars,
  isCaliforniaZip,
  occupancyFromProduct,
  parseDollars,
  purposeFromProduct,
  readScenario,
  scenarioToQuery,
  writeScenario,
  type AmountMode,
  type CreditRange,
  type ExplorerScenario,
  type LoanPurpose,
  type Occupancy,
  type Timeline,
} from "./scenario";

const TRUST_LINE =
  "NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.";
const ESTIMATE_NOTE = "Estimates only, not a commitment to lend.";

export function ScenarioForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product") || undefined;
  const product = productSlug ? getProduct(productSlug) : undefined;

  const [zip, setZip] = useState("");
  const [purpose, setPurpose] = useState<LoanPurpose | "">(
    purposeFromProduct(productSlug),
  );
  const [propertyValue, setPropertyValue] = useState("");
  const [amountMode, setAmountMode] = useState<AmountMode>("loan");
  const [loanAmount, setLoanAmount] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [creditRange, setCreditRange] = useState<CreditRange | "">("");
  const [occupancy, setOccupancy] = useState<Occupancy | "">(
    occupancyFromProduct(productSlug),
  );
  const [timeline, setTimeline] = useState<Timeline | "">("");
  const [storedName, setStoredName] = useState<string | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = readScenario();
    if (!existing) return;
    if (productSlug && existing.productSlug && existing.productSlug !== productSlug) {
      return;
    }
    setZip(existing.zip);
    setPurpose(existing.purpose);
    setPropertyValue(formatDollars(existing.propertyValue));
    setAmountMode(existing.amountMode);
    setLoanAmount(existing.loanAmount ? formatDollars(existing.loanAmount) : "");
    setDownPayment(existing.downPayment ? formatDollars(existing.downPayment) : "");
    setCreditRange(existing.creditRange);
    setOccupancy(existing.occupancy);
    setTimeline(existing.timeline ?? "");
    setStoredName(existing.productName);
  }, [productSlug]);

  const valueNumber = parseDollars(propertyValue);
  const loanNumber = parseDollars(loanAmount);
  const downNumber = parseDollars(downPayment);
  const impliedLoan =
    amountMode === "down" && valueNumber > 0 && downNumber > 0
      ? valueNumber - downNumber
      : NaN;
  const impliedDown =
    amountMode === "loan" && valueNumber > 0 && loanNumber > 0
      ? valueNumber - loanNumber
      : NaN;

  const onCurrency = (next: string, setter: (value: string) => void) => {
    const parsed = parseDollars(next);
    setter(Number.isFinite(parsed) ? formatDollars(parsed) : "");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!isCaliforniaZip(zip)) {
      setError("This explorer is California only.");
      return;
    }
    if (!purpose) {
      setError("Choose a loan purpose.");
      return;
    }
    if (!Number.isFinite(valueNumber) || valueNumber <= 0) {
      setError("Enter an approximate property value greater than zero.");
      return;
    }

    let nextLoan: number | undefined;
    let nextDown: number | undefined;

    if (amountMode === "loan") {
      if (!Number.isFinite(loanNumber) || loanNumber <= 0) {
        setError("Enter a loan amount greater than zero.");
        return;
      }
      if (loanNumber > valueNumber) {
        setError("Loan amount cannot exceed property value.");
        return;
      }
      nextLoan = loanNumber;
      nextDown = valueNumber - loanNumber;
    } else {
      if (!Number.isFinite(downNumber) || downNumber <= 0) {
        setError("Enter a down payment greater than zero.");
        return;
      }
      if (downNumber > valueNumber) {
        setError("Down payment cannot exceed property value.");
        return;
      }
      const derived = valueNumber - downNumber;
      if (derived <= 0) {
        setError("Loan amount must be greater than zero.");
        return;
      }
      nextDown = downNumber;
      nextLoan = derived;
    }

    if (!creditRange) {
      setError("Choose a credit range.");
      return;
    }
    if (!occupancy) {
      setError("Choose occupancy.");
      return;
    }

    const scenario: ExplorerScenario = {
      productSlug: product?.slug ?? productSlug,
      productName: product?.name ?? storedName,
      zip,
      purpose,
      propertyValue: valueNumber,
      amountMode,
      loanAmount: nextLoan,
      downPayment: nextDown,
      creditRange,
      occupancy,
      timeline: timeline || undefined,
    };

    writeScenario(scenario);
    router.push(`/products/results?${scenarioToQuery(scenario).toString()}`);
  };

  return (
    <div className="scenario page-pad">
      <div className="page-inner scenario__inner">
        <div className="product-explorer__rule" aria-hidden="true" />
        <p className="type-eyebrow">California only</p>
        <h1 className="type-h2 scenario__title">Your California scenario</h1>
        <p className="type-body">
          Enter a simple picture of the loan. This is not a quote, a rate, or an
          application.
        </p>
        {product ? (
          <p className="type-legal">Looking at {product.name}.</p>
        ) : null}

        <form className="scenario-form" onSubmit={onSubmit} noValidate>
          <label className="scenario-field">
            <span className="scenario-field__label">California ZIP</span>
            <input
              className="scenario-field__input"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={zip}
              onChange={(event) =>
                setZip(event.target.value.replace(/\D/g, "").slice(0, 5))
              }
              aria-describedby="scenario-zip-note"
              required
            />
          </label>
          <p id="scenario-zip-note" className="type-legal">
            This explorer is California only.
          </p>

          <label className="scenario-field">
            <span className="scenario-field__label">Loan purpose</span>
            <select
              className="scenario-field__input"
              value={purpose}
              onChange={(event) =>
                setPurpose(event.target.value as LoanPurpose | "")
              }
              required
            >
              <option value="">Select</option>
              {PURPOSE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="scenario-field">
            <span className="scenario-field__label">
              Approximate property value
            </span>
            <input
              className="scenario-field__input"
              inputMode="numeric"
              value={propertyValue}
              onChange={(event) => onCurrency(event.target.value, setPropertyValue)}
              required
            />
          </label>

          <fieldset className="scenario-field">
            <legend className="scenario-field__label">Amount</legend>
            <div className="scenario-toggle" role="group" aria-label="Amount mode">
              <button
                type="button"
                className={
                  amountMode === "loan"
                    ? "scenario-toggle__option is-active"
                    : "scenario-toggle__option"
                }
                aria-pressed={amountMode === "loan"}
                onClick={() => setAmountMode("loan")}
              >
                Loan amount
              </button>
              <button
                type="button"
                className={
                  amountMode === "down"
                    ? "scenario-toggle__option is-active"
                    : "scenario-toggle__option"
                }
                aria-pressed={amountMode === "down"}
                onClick={() => setAmountMode("down")}
              >
                Down payment
              </button>
            </div>
            {amountMode === "loan" ? (
              <input
                className="scenario-field__input"
                inputMode="numeric"
                value={loanAmount}
                onChange={(event) => onCurrency(event.target.value, setLoanAmount)}
                aria-label="Loan amount"
                required
              />
            ) : (
              <input
                className="scenario-field__input"
                inputMode="numeric"
                value={downPayment}
                onChange={(event) => onCurrency(event.target.value, setDownPayment)}
                aria-label="Down payment"
                required
              />
            )}
            {amountMode === "down" && Number.isFinite(impliedLoan) && impliedLoan > 0 ? (
              <p className="type-legal">
                Implied loan ${formatDollars(impliedLoan)}
              </p>
            ) : null}
            {amountMode === "loan" && Number.isFinite(impliedDown) && impliedDown >= 0 ? (
              <p className="type-legal">
                Implied down payment ${formatDollars(impliedDown)}
              </p>
            ) : null}
          </fieldset>

          <label className="scenario-field">
            <span className="scenario-field__label">Credit range</span>
            <select
              className="scenario-field__input"
              value={creditRange}
              onChange={(event) =>
                setCreditRange(event.target.value as CreditRange | "")
              }
              required
            >
              <option value="">Select</option>
              {CREDIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="scenario-field">
            <span className="scenario-field__label">Occupancy</span>
            <select
              className="scenario-field__input"
              value={occupancy}
              onChange={(event) =>
                setOccupancy(event.target.value as Occupancy | "")
              }
              required
            >
              <option value="">Select</option>
              {OCCUPANCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="scenario-field">
            <span className="scenario-field__label">Timeline (optional)</span>
            <select
              className="scenario-field__input"
              value={timeline}
              onChange={(event) =>
                setTimeline(event.target.value as Timeline | "")
              }
            >
              <option value="">Select</option>
              {TIMELINE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p className="scenario-form__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="scenario-form__actions">
            <button type="submit" className="btn btn--primary">
              See my options
            </button>
            <Link href="/advisor" className="btn btn--secondary">
              Talk to a licensed originator
            </Link>
          </div>
        </form>

        <p className="type-legal">{ESTIMATE_NOTE}</p>
        <p className="type-legal">{TRUST_LINE}</p>
      </div>
    </div>
  );
}
