import Link from "next/link";

export function FeesTrust() {
  return (
    <section className="acr-fees page-pad" aria-labelledby="acr-fees-title">
      <div className="page-inner">
        <h2 id="acr-fees-title" className="visually-hidden">
          Trust
        </h2>
        <p className="type-legal">
          NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.{" "}
          <Link href="/how-we-get-paid">How we get paid</Link>
        </p>
        <p className="type-legal">
          Sample, not live. ONYX Fox can assist and prepare. It cannot approve,
          lock, or commit to lend.
        </p>
      </div>
    </section>
  );
}
