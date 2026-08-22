import { HeroStartLink } from "./HeroStartLink";

export function SamplePathCard() {
  return (
    <aside className="intake-card" aria-labelledby="sample-path-title">
      <p className="type-eyebrow">Sample · not live</p>
      <h2 id="sample-path-title" className="type-card-title">
        Start with Fox
      </h2>
      <p className="type-body">Prepare a file on the desk. Fox stays.</p>
      <div className="intake-links">
        <HeroStartLink path="acr" className="btn btn--primary">
          Start your relationship
        </HeroStartLink>
        <HeroStartLink path="loan-only" className="btn btn--text">
          Just need a mortgage
        </HeroStartLink>
      </div>
    </aside>
  );
}
