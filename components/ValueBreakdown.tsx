const DESKS = [
  {
    index: "01",
    title: "The Rate Desk",
    outcome: "Watch, lock alerts, refi window",
    limit: "Alerts are not a rate lock.",
  },
  {
    index: "02",
    title: "The Credit Path",
    outcome: "Live file. Approval health, not a one-time pull.",
    limit: "Not a credit-repair service.",
  },
  {
    index: "03",
    title: "The Member Desk",
    outcome: "Advisor with memory + a licensed human",
    limit: "Chat cannot approve a loan.",
  },
] as const;

export function ValueBreakdown() {
  return (
    <section className="value-breakdown page-pad" aria-labelledby="value-breakdown-title">
      <div className="page-inner">
        <div className="value-breakdown__intro">
          <p className="type-eyebrow">The Relationship</p>
          <h2 id="value-breakdown-title" className="type-h2">
            A relationship that keeps working after close.
          </h2>
          <p className="type-body">
            Live credit and rate data. Three desks. One relationship.
          </p>
          <p className="type-legal">Sample, not live</p>
        </div>

        <ul className="desks-grid">
          {DESKS.map((desk) => (
            <li key={desk.title} className="desk-card">
              <p className="desk-card__index">{desk.index}</p>
              <h3 className="type-card-title">{desk.title}</h3>
              <p className="type-body">{desk.outcome}</p>
              <p className="type-legal">{desk.limit}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
