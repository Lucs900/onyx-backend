const ROWS = [
  { label: "Payment count", value: "OPEN" },
  { label: "Reward amount", value: "OPEN" },
  { label: "Relationship fee", value: "OPEN" },
  { label: "NMLS", value: "OPEN" },
] as const;

export function FeesTrust() {
  return (
    <section className="acr-fees page-pad" aria-labelledby="acr-fees-title">
      <div className="page-inner">
        <div className="acr-fees__intro">
          <p className="type-eyebrow">Fees and trust</p>
          <h2 id="acr-fees-title" className="type-h2">
            What stays open
          </h2>
          <p className="type-body">
            Payment count, dollars, fees, and NMLS are not posted on this page.
          </p>
        </div>

        <dl className="acr-fees__rows">
          {ROWS.map((row) => (
            <div key={row.label} className="acr-fees__row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        <p className="type-legal acr-fees__note">
          Sample, not live. ONYX Fox can assist and prepare. It cannot approve,
          lock, or commit to lend. NMLS [OPEN] · CA DRE [OPEN] · We are a
          mortgage broker.
        </p>
      </div>
    </section>
  );
}
