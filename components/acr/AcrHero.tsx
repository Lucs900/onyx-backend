import { AcrPass } from "@/components/AcrPass";
import { HeroStartLink } from "@/components/fox/HeroStartLink";

export function AcrHero() {
  return (
    <section className="acr-hero page-pad">
      <div className="page-inner acr-hero__inner">
        <div className="acr-hero__type">
          <div className="acr-hero__intro">
            <div className="acr-hero__rule" aria-hidden="true" />
            <p className="type-eyebrow">Active Credit Relationship</p>
            <h1 className="type-display acr-hero__title">The desk that stays open</h1>
            <p className="acr-hero__support">
              ACR is an ongoing relationship. After close, the desk stays with
              you.
            </p>
          </div>

          <div className="acr-hero__actions">
            <HeroStartLink path="acr" className="btn btn--primary btn--hero-primary">
              Start your relationship
            </HeroStartLink>
            <HeroStartLink path="loan-only" className="btn btn--secondary btn--hero-secondary">
              Just need a mortgage
            </HeroStartLink>
          </div>

          <p className="acr-hero__legal type-legal">
            California only. NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage
            broker.
          </p>
        </div>

        <div className="acr-hero__pass">
          <AcrPass />
        </div>
      </div>
    </section>
  );
}
