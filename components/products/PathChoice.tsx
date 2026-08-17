import Link from "next/link";
import { formatRewardRange, type RewardRange } from "./rewardEstimate";

type PathChoiceProps = {
  range: RewardRange | null;
  acrHref: string;
  loanHref: string;
};

export function PathChoice({ range, acrHref, loanHref }: PathChoiceProps) {
  return (
    <section className="path-choice" aria-labelledby="path-choice-title">
      <h2 id="path-choice-title" className="type-h2">
        Loan only or ACR
      </h2>
      <p className="type-body">
        Same mortgage path. ACR adds a membership reward and a desk that stays
        open after close.
      </p>

      <div className="path-choice__grid">
        <article className="path-card path-card--acr">
          <h3 className="type-card-title">ACR</h3>
          <ul className="path-card__points">
            <li>Same mortgage path</li>
            <li>
              {range
                ? `Estimated membership reward: ${formatRewardRange(range)}`
                : "Estimated membership reward"}
            </li>
            <li>Unlocks after on time payments</li>
            <li>Desk stays open after close</li>
          </ul>
          <p className="type-legal">
            Final amount is confirmed when you join and close.
          </p>
          <p className="type-legal">Sample, not live</p>
          <Link href={acrHref} className="btn btn--primary path-card__cta">
            Start with ACR
          </Link>
        </article>

        <article className="path-card">
          <h3 className="type-card-title">Loan only</h3>
          <ul className="path-card__points">
            <li>Get the mortgage</li>
            <li>Standard process</li>
            <li>No membership reward</li>
            <li>No ongoing desk</li>
          </ul>
          <Link href={loanHref} className="btn btn--secondary path-card__cta">
            Continue loan only
          </Link>
        </article>
      </div>
    </section>
  );
}
