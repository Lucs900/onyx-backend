const LINES = [
  "Fox keeps working after you close.",
  "On-time payments earn a reward calculated for your relationship.",
  "When the numbers are strong, Fox can help you lower costs, use equity, or expand into another property.",
  "When the timing is wrong, Fox waits.",
] as const;

export function AcrBlock() {
  const [lead, ...rest] = LINES;

  return (
    <section className="acr-block page-pad" aria-labelledby="acr-block-title">
      <div className="page-inner">
        <div className="acr-block__copy">
          <h2 id="acr-block-title" className="type-h2">
            {lead}
          </h2>
          {rest.map((line) => (
            <p key={line} className="type-body">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
