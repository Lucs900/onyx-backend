import { AdvisorMark } from "./AdvisorMark";

export function AcrPass() {
  return (
    <div className="acr-pass-stage">
      <div className="acr-pass-well" aria-hidden="true" />
      <div className="acr-pass" aria-hidden="true">
        <div className="acr-pass__noise" />
        <div className="acr-pass__sheen" />
        <div className="acr-pass__top">
          <div className="acr-pass__brand">
            <AdvisorMark size={20} />
            <span className="acr-pass__acr">ACR</span>
          </div>
          <span className="acr-pass__member">MEMBER</span>
        </div>
        <p className="acr-pass__onyx">ONYX</p>
        <div className="acr-pass__bottom">
          <p className="acr-pass__label">Active Credit Relationship</p>
          <span className="acr-pass__chip" />
        </div>
      </div>
    </div>
  );
}
