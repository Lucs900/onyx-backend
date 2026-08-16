export function AcrPass() {
  return (
    <div className="acr-pass-stage" aria-hidden="true">
      <div className="acr-pass">
        <img
          className="acr-pass__face"
          src="/acr-card-face.png"
          alt=""
          width={1536}
          height={1024}
        />
        <p className="acr-pass__label">Active Credit Relationship</p>
      </div>
    </div>
  );
}
