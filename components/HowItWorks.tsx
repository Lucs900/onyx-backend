const STEPS = [
  {
    index: "01",
    title: "Diagnose",
    line: "Credit, property, goal. Soft pull.",
    acr: false,
  },
  {
    index: "02",
    title: "Structure",
    line: "Program and credits, in the open.",
    acr: false,
  },
  {
    index: "03",
    title: "Approve",
    line: "A decision with a timestamp.",
    acr: true,
    caption: "Loan-only can stop here.",
  },
  {
    index: "04",
    title: "Optimize",
    line: "Live data on rate and credit.",
    acr: true,
  },
  {
    index: "05",
    title: "Stay in the desk",
    line: "This is ACR.",
    acr: true,
  },
] as const;

export function HowItWorks() {
  return (
    <section className="how-it-works page-pad" aria-labelledby="path-title">
      <div className="page-inner">
        <div className="how-it-works__intro">
          <p className="type-eyebrow">The Path</p>
          <h2 id="path-title" className="type-h2">
            Get approved. Then stay that way.
          </h2>
          <p className="type-body">
            A mortgage can stop at funding. ACR does not.
          </p>
        </div>

        <ol className="path-steps">
          {STEPS.map((step) => (
            <li
              key={step.index}
              className={step.acr ? "path-step is-acr" : "path-step"}
            >
              <span className="path-step__num" aria-hidden="true">
                {step.index}
              </span>
              <h3 className="path-step__title">{step.title}</h3>
              <p className="path-step__line">{step.line}</p>
              {"caption" in step && step.caption ? (
                <p className="path-step__caption">{step.caption}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
