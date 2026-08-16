import { ProductExplorer } from "@/components/products/ProductExplorer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Explorer — ONYX",
  description: "What ONYX offers in California. Discovery only — not a quote or application.",
};

export default function ProductsPage() {
  return <ProductExplorer />;
}
