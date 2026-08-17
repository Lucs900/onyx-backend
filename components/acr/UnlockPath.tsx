const LINES = [
  {
    title: "Join the relationship",
    line: "Start ACR. Your amount is prepared then — not posted here.",
  },
  {
    title: "Stay on time",
    line: "On-time payments keep the desk open.",
  },
  {
    title: "Unlock on the desk",
    line: "The reward appears on your desk when the path is complete.",
  },
] as const;

export function UnlockPath() {
  return (
    <section className="acr-unlock page-pad" aria-labelledby="acr-unlock-title">
      <div className="page-inner">
        <div className="acr-unlock__intro">
          <p className="type-eyebrow">The path</p>
          <h2 id="acr-unlock-title" className="type-h2">
            Three quiet steps
          </h2>
        </div>

        <ol className="acr-unlock__lines">
          {LINES.map((item) => (
            <li key={item.title} className="acr-unlock__line">
              <p className="type-card-title">{item.title}</p>
              <p className="type-body">{item.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
