import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart-page-content";
import { PageShell } from "@/components/site-chrome";
import { getProducts } from "@/lib/shopify/repository";

export const metadata: Metadata = { title: "Shopping bag | Padma Ethnic", description: "Review your selected Padma pieces." };

export default async function CartPage() {
  const products = await getProducts();
  return <PageShell><CartPageContent products={products} /></PageShell>;
}
