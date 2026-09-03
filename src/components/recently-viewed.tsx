"use client";
import type { Product } from "@/lib/types";
import { useCommerce } from "./commerce-provider";
import { ProductCard } from "./product-card";
export function RecentlyViewed({ currentProductId, products }: { currentProductId: string; products: Product[] }) {
  const { recent } = useCommerce();
  const viewed = recent.filter((id) => id !== currentProductId).map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product)).slice(0, 4);
  if (!viewed.length) return null;
  return <section className="recently-viewed"><p className="eyebrow">Your edit</p><h2>Recently viewed</h2><div className="product-grid">{viewed.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
