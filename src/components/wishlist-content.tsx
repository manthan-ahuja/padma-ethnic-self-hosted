"use client";
import Link from "next/link";
import { products } from "@/lib/products";
import { useCommerce } from "./commerce-provider";
import { ProductCard } from "./product-card";

export function WishlistContent() {
  const { wishlist } = useCommerce();
  const saved = products.filter((product) => wishlist.includes(product.id));
  return <main className="catalog-page standalone-catalog"><header className="editorial-page-hero compact-hero"><p className="eyebrow">Saved for later</p><h1>Your wishlist</h1><p>A quiet place for the pieces you want to return to.</p></header>{saved.length ? <div className="product-grid collection-product-grid">{saved.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="catalog-empty"><h2>Nothing saved yet</h2><p>Tap the heart on any piece to keep it here on this device.</p><Link href="/collections/all" className="primary-cta">Explore the collection</Link></div>}</main>;
}
