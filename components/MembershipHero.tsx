import { AcrPass } from "./AcrPass";
import { AdvisorMark } from "./AdvisorMark";
import { HomeMobileCollapse } from "./HomeMobileCollapse";
import { HeroStartLink } from "./fox/HeroStartLink";
import { HOME_FOX_LINE, HOME_IDLE_TEXT } from "./fox/homeIdle";

export function MembershipHero() {
  return (
    <section className="membership-hero page-pad">
      <HomeMobileCollapse />
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
            <p className="membership-hero__fox-line">{HOME_FOX_LINE}</p>
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
          <form className="fox-bar__desk membership-hero__fox-fallback" action="/start" method="get">
            <span className="fox-bar__mark">
              <AdvisorMark size={20} />
            </span>
            <label className="visually-hidden" htmlFor="home-fox-fallback">
              {HOME_IDLE_TEXT}
            </label>
            <input
              id="home-fox-fallback"
              className="fox-bar__input"
              type="text"
              placeholder={HOME_IDLE_TEXT}
              autoComplete="off"
            />
            <button type="submit" className="fox-bar__send" aria-label="Send">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 8h9M8.5 3.5 13 8l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
          <div id="fox-home-stage" className="membership-hero__fox" />
        </div>
      </div>
    </section>
  );
}
