import Link from "next/link";
import type { Product } from "./catalog";

const TRUST_LINE =
  "NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.";

export function ProductStub({ product }: { product: Product }) {
  return (
    <article className="product-stub page-pad">
      <div className="page-inner product-stub__inner">
        <p className="type-eyebrow">California only</p>
        <h1 className="type-h2 product-stub__title">{product.name}</h1>
        <p className="type-body">{product.description}</p>
        <p className="product-card__best">
          <span className="product-card__best-label">Best for</span>
          {product.bestFor}
        </p>
        <p className="type-legal product-explorer__trust">{TRUST_LINE}</p>
        <Link
          href={`/products/scenario?product=${product.slug}`}
          className="btn btn--secondary"
        >
          Explore this option
        </Link>
        <Link href="/products" className="btn btn--text product-stub__back">
          Product Explorer
        </Link>
      </div>
    </article>
  );
}
