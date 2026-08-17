import { ProductExplorer } from "@/components/products/ProductExplorer";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Product Explorer — ONYX",
  description: "What ONYX offers in California. Discovery only — not a quote or application.",
};

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="product-explorer page-pad">
          <p className="type-legal">Loading products…</p>
        </div>
      }
    >
      <ProductExplorer />
    </Suspense>
  );
}
