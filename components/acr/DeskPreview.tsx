const GOALS = [
  {
    name: "Rate window",
    state: "Watching",
    direction: "Down",
    filled: 2,
    sentence: "Rate conditions are watched against your file.",
    next: "An alert when a window opens.",
  },
  {
    name: "Approval health",
    state: "Monitoring",
    direction: "Hold",
    filled: 1,
    sentence: "The file stays in view after close.",
  },
] as const;

export function DeskPreview() {
  return (
    <section className="acr-desk page-pad" aria-labelledby="acr-desk-title">
      <div className="page-inner">
        <div className="acr-desk__intro">
          <p className="type-eyebrow">On the desk</p>
          <h2 id="acr-desk-title" className="type-h2">
            Goals and property, kept quiet
          </h2>
          <p className="type-body">
            A preview of what lives on the desk, not a cockpit, and not live.
          </p>
          <p className="type-legal">Sample, not live</p>
        </div>

        <div className="acr-desk__stack">
          <ul className="acr-goals">
            {GOALS.map((goal) => (
              <li key={goal.name} className="acr-goal">
                <div className="acr-goal__top">
                  <h3 className="type-card-title">{goal.name}</h3>
                  <div className="acr-goal__meta">
                    <span className="acr-goal__state">{goal.state}</span>
                    <span className="acr-goal__direction">{goal.direction}</span>
                    <span className="acr-goal__track" aria-hidden="true">
                      <span className={goal.filled >= 1 ? "is-on" : undefined} />
                      <span className={goal.filled >= 2 ? "is-on" : undefined} />
                      <span className={goal.filled >= 3 ? "is-on" : undefined} />
                    </span>
                  </div>
                </div>
                <p className="type-body">{goal.sentence}</p>
                {"next" in goal && goal.next ? (
                  <p className="type-legal">{goal.next}</p>
                ) : null}
              </li>
            ))}
          </ul>

          <article className="acr-property">
            <h3 className="type-card-title">Your home</h3>
            <p className="type-body">
              Equity posture and HELOC or refinance room will live here.
            </p>
            <p className="type-legal">Sample, not live</p>
          </article>
        </div>
      </div>
    </section>
  );
}
