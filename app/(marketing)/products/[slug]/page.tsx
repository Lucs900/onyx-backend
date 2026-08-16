import { ProductStub } from "@/components/products/ProductStub";
import { getProduct, PRODUCTS } from "@/components/products/catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type ProductPageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export function generateMetadata({ params }: ProductPageProps): Metadata {
  const product = getProduct(params.slug);
  if (!product) return { title: "Product Explorer — ONYX" };
  return {
    title: `${product.name} — ONYX`,
    description: product.description,
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const product = getProduct(params.slug);
  if (!product) notFound();
  return <ProductStub product={product} />;
}
