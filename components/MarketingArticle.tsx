import type { ReactNode } from "react";

type MarketingArticleProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function MarketingArticle({
  eyebrow,
  title,
  children,
}: MarketingArticleProps) {
  return (
    <article className="prose-page page-pad">
      <div className="page-inner prose-page__inner">
        <div className="product-explorer__rule" aria-hidden="true" />
        <p className="type-eyebrow">{eyebrow}</p>
        <h1 className="type-h2">{title}</h1>
        {children}
      </div>
    </article>
  );
}
