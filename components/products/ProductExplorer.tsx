import Link from "next/link";
import { PRODUCT_GROUPS } from "./catalog";

const TRUST_LINE =
  "NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.";

export function ProductExplorer() {
  return (
    <div className="product-explorer">
      <section className="product-explorer__intro page-pad">
        <div className="page-inner">
          <div className="product-explorer__rule" aria-hidden="true" />
          <p className="type-eyebrow">California only</p>
          <h1 className="type-h2 product-explorer__title">
            What ONYX offers in California.
          </h1>
          <p className="type-body product-explorer__support">
            This is a discovery page, not a quote or an application. California
            residential and specialty financing.
          </p>
          <p className="type-legal product-explorer__trust">{TRUST_LINE}</p>
        </div>
      </section>

      {PRODUCT_GROUPS.map((group) => (
        <section
          key={group.id}
          className={
            group.specialty
              ? "product-group product-group--specialty page-pad"
              : "product-group page-pad"
          }
          aria-labelledby={`product-group-${group.id}`}
        >
          <div className="page-inner">
            <p
              id={`product-group-${group.id}`}
              className="type-eyebrow product-group__heading"
            >
              {group.heading}
            </p>
            <ul className="product-grid">
              {group.products.map((product) => (
                <li key={product.slug} className="product-card">
                  <h2 className="type-card-title">{product.name}</h2>
                  <p className="type-body">{product.description}</p>
                  <p className="product-card__best">
                    <span className="product-card__best-label">Best for</span>
                    {product.bestFor}
                  </p>
                  <Link
                    href={`/products/scenario?product=${product.slug}`}
                    className="btn btn--secondary product-card__cta"
                  >
                    Explore this option
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
