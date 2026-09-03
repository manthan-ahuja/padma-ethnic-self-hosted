import type { Metadata } from "next";
import { PageShell } from "@/components/site-chrome";
import { WishlistContent } from "@/components/wishlist-content";
import { getProducts } from "@/lib/shopify/repository";
export const metadata: Metadata = { title: "Wishlist | Padma Ethnic" };
export default async function WishlistPage() {
  const products = await getProducts();
  return <PageShell><WishlistContent products={products} /></PageShell>;
}
