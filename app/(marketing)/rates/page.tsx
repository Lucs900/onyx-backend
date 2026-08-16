import Link from "next/link";

export default function RatesPage() {
  return (
    <div className="placeholder-page page-pad">
      <div className="page-inner">
        <p className="type-eyebrow">Rates</p>
        <p className="type-legal">
          Rate card is not in this slice. This route exists so navigation does
          not 404.
        </p>
        <Link href="/products" className="btn btn--text rates-stub__link">
          See what we offer in California
        </Link>
      </div>
    </div>
  );
}
