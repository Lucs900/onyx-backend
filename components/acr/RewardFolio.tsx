export function RewardFolio() {
  return (
    <section className="acr-reward page-pad" aria-labelledby="acr-reward-title">
      <div className="page-inner">
        <div className="acr-reward__intro">
          <p className="type-eyebrow">The reward</p>
          <h2 id="acr-reward-title" className="type-h2">
            Prepared for the relationship
          </h2>
        </div>

        <article className="reward-folio">
          <span className="reward-folio__tick" aria-hidden="true" />
          <p className="type-legal">Sample · not live</p>
          <p className="type-body">A reward calculated for your relationship.</p>
          <p className="type-body">Unlocks after on-time payments.</p>
          <p className="type-body">
            Your amount is prepared when you join — not a public rate.
          </p>
          <div className="reward-folio__ticks" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </article>
      </div>
    </section>
  );
}
