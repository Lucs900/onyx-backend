import Link from "next/link";
import type { ReactNode } from "react";

function Check() {
  return (
    <svg
      className="comparison-check"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.2 7.1 5.5 10.3 11.8 3.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Cell = ReactNode;

function cellClass(cell: Cell, extra?: string) {
  return [extra, cell === "—" ? "is-dash" : undefined].filter(Boolean).join(" ");
}

const ROWS: { feature: string; onyx: Cell; traditional: Cell; loan: Cell }[] = [
  {
    feature: "After close",
    onyx: "Desk stays open",
    traditional: "File closes",
    loan: "File closes",
  },
  {
    feature: "Always optimizing",
    onyx: "Live data",
    traditional: "—",
    loan: "—",
  },
  {
    feature: "Approval health",
    onyx: "Monitored",
    traditional: "At application",
    loan: "At application",
  },
  {
    feature: "Rate watch",
    onyx: <Check />,
    traditional: "—",
    loan: "Optional emails",
  },
  {
    feature: "Human LO",
    onyx: "Named, NMLS",
    traditional: "Call center",
    loan: "On request",
  },
  {
    feature: "Advisor with memory",
    onyx: (
      <>
        <Check />
        <span>Disclosed</span>
      </>
    ),
    traditional: "—",
    loan: "Session only",
  },
  {
    feature: "Member credits",
    onyx: "Calculated membership reward",
    traditional: "Points / junk",
    loan: "—",
  },
  {
    feature: "Fees",
    onyx: <Link href="/acr">Table on /acr</Link>,
    traditional: "At disclosure",
    loan: "At disclosure",
  },
  {
    feature: "How we get paid",
    onyx: <Link href="/how-we-get-paid">Linked in-hero</Link>,
    traditional: "Buried",
    loan: "Buried",
  },
];

export function ComparisonTable() {
  return (
    <section className="comparison page-pad" aria-labelledby="comparison-title">
      <div className="page-inner">
        <div className="comparison__intro">
          <p className="type-eyebrow">Why a relationship</p>
          <h2 id="comparison-title" className="type-h2">
            A loan ends. The desk does not.
          </h2>
          <p className="type-body">
            ACR keeps you approved and optimizing. A mortgage is still available
            on its own.
          </p>
        </div>

        <div className="comparison-table-wrap" role="region" aria-label="Comparison">
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col" className="is-onyx">
                  ONYX ACR
                </th>
                <th scope="col">Traditional lender</th>
                <th scope="col">Loan only</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td className={cellClass(row.onyx, "is-onyx")}>{row.onyx}</td>
                  <td className={cellClass(row.traditional)}>{row.traditional}</td>
                  <td className={cellClass(row.loan)}>{row.loan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="comparison-cards">
          {ROWS.map((row) => (
            <li key={row.feature} className="comparison-card">
              <p className="type-card-title">{row.feature}</p>
              <dl>
                <div>
                  <dt className="is-onyx">ONYX ACR</dt>
                  <dd className={cellClass(row.onyx, "is-onyx")}>{row.onyx}</dd>
                </div>
                <div>
                  <dt>Traditional lender</dt>
                  <dd className={cellClass(row.traditional)}>{row.traditional}</dd>
                </div>
                <div>
                  <dt>Loan only</dt>
                  <dd className={cellClass(row.loan)}>{row.loan}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
