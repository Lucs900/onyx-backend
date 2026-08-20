const ROWS = [
  {
    feature: "After close",
    onyx: "Desk stays open",
    loan: "File closes",
  },
  {
    feature: "Optimization",
    onyx: "Ongoing",
    loan: "None",
  },
  {
    feature: "Approval letter",
    onyx: "From your file",
    loan: "Standard process",
  },
  {
    feature: "Membership reward",
    onyx: "Calculated",
    loan: "None",
  },
  {
    feature: "Opportunities",
    onyx: "Scouted from your profile",
    loan: "None",
  },
] as const;

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
                <th scope="col">Loan only</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td className="is-onyx">{row.onyx}</td>
                  <td>{row.loan}</td>
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
                  <dd className="is-onyx">{row.onyx}</dd>
                </div>
                <div>
                  <dt>Loan only</dt>
                  <dd>{row.loan}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
