import Link from "next/link";
import { AcrPass } from "./AcrPass";
import { HOME_IDLE_TEXT, homeIdleActions } from "./fox/homeIdle";
import { FOX_DISCLOSURE } from "./fox/types";
import { ACR_START_HREF, LOAN_START_HREF } from "./products/startPath";

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

          <p className="membership-hero__trust">
            NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.{" "}
            <Link href="/how-we-get-paid">Here’s how we get paid.</Link>
          </p>

          <p className="membership-hero__echoes">
            <Link href={ACR_START_HREF}>Start your relationship</Link>
            <Link href={LOAN_START_HREF}>Just need a mortgage</Link>
          </p>
        </div>

        <div className="membership-hero__primary">
          <div className="membership-hero__fox-wrap">
            <div className="fox-stage membership-hero__fox-fallback">
              <div className="fox-bar__head">
                <span className="fox-bar__title">ONYX Fox</span>
              </div>
              <p className="fox-stage__disclosure type-legal">{FOX_DISCLOSURE}</p>
              <div className="fox-panel__thread">
                <article className="fox-bubble fox-bubble--fox">
                  <p>{HOME_IDLE_TEXT}</p>
                  <div className="fox-bubble__actions">
                    {homeIdleActions().map((action) =>
                      action.href ? (
                        <Link
                          key={action.id}
                          href={action.href}
                          className="btn btn--secondary fox-chip"
                        >
                          {action.label}
                        </Link>
                      ) : null,
                    )}
                  </div>
                </article>
              </div>
            </div>
            <div id="fox-home-stage" className="membership-hero__fox" />
          </div>

          <div className="membership-hero__pass">
            <AcrPass />
          </div>
        </div>
      </div>
    </section>
  );
}
