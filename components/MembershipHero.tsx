import { AcrPass } from "./AcrPass";
import { HeroStartLink } from "./fox/HeroStartLink";
import { HOME_IDLE_TEXT, homePathActions } from "./fox/homeIdle";

const FALLBACK_PATH: Record<string, "acr" | "loan-only"> = {
  start: "acr",
  loan: "loan-only",
};

export function MembershipHero() {
  return (
    <section className="membership-hero page-pad">
      <div className="page-inner membership-hero__inner">
        <div className="membership-hero__type">
          <div className="membership-hero__intro">
            <div className="membership-hero__rule" aria-hidden="true" />
            <p className="type-eyebrow">Active Credit Relationship</p>
            <h1 className="type-display membership-hero__title">
              Always approved.
              <br />
              Always optimizing.
            </h1>
            <p className="membership-hero__support">
              We keep your credit and rate working for you.
            </p>
          </div>

          <div className="membership-hero__actions">
            <HeroStartLink path="acr" className="btn btn--primary btn--hero-primary">
              Start your relationship
            </HeroStartLink>
            <HeroStartLink path="loan-only" className="btn btn--secondary btn--hero-secondary">
              Just need a mortgage
            </HeroStartLink>
          </div>
        </div>

        <div className="membership-hero__pass">
          <AcrPass />
        </div>

        <div className="membership-hero__fox-wrap">
          <div className="fox-stage membership-hero__fox-fallback">
            <div className="fox-bar__head">
              <span className="fox-bar__title">ONYX Fox</span>
            </div>
            <div className="fox-panel__thread">
              <article className="fox-bubble fox-bubble--fox">
                <p>{HOME_IDLE_TEXT}</p>
                <div className="fox-bubble__actions">
                  {homePathActions().map((action) => (
                    <HeroStartLink
                      key={action.id}
                      path={FALLBACK_PATH[action.id] ?? "acr"}
                      className="btn btn--secondary fox-chip"
                    >
                      {action.label}
                    </HeroStartLink>
                  ))}
                </div>
              </article>
            </div>
          </div>
          <div id="fox-home-stage" className="membership-hero__fox" />
        </div>
      </div>
    </section>
  );
}
