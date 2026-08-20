const STATS = [
  { label: "Open", value: "—" },
  { label: "Open", value: "—" },
  { label: "Open", value: "—" },
  { label: "As of", value: "—" },
] as const;

export function ProofStats() {
  return (
    <section className="proof page-pad" aria-label="Proof">
      <div className="page-inner">
        <ul className="proof-stats">
          {STATS.map((stat, index) => (
            <li key={`${stat.label}-${index}`} className="proof-stat">
              <p className="proof-stat__value">{stat.value}</p>
              <p className="proof-stat__label">{stat.label}</p>
            </li>
          ))}
        </ul>
        <p className="type-legal proof__note">
          Sample · not live. As of —. No volume, ratings, or GSE marks on this
          page have been approved.
        </p>
        <TrustMarks />
      </div>
    </section>
  );
}

function TrustMarks() {
  return (
    <ul className="trust-marks">
      <li>
        <a href="/equal-housing">Equal Housing</a>
      </li>
      <li>
        <a
          href="https://www.nmlsconsumeraccess.org/"
          rel="noopener noreferrer"
          target="_blank"
        >
          NMLS Consumer Access
        </a>
      </li>
      <li>Mortgage broker</li>
    </ul>
  );
}
