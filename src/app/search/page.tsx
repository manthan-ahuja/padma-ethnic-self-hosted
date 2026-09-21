import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchExperience } from "@/components/search-experience";
import { PageShell } from "@/components/site-chrome";
import { getProducts } from "@/lib/commerce/repository";

export const metadata: Metadata = { title: "Search | Padma Ethnic", description: "Search Padma's sarees, kurta sets, lehengas and contemporary Indian separates." };

export default async function SearchPage() {
  const products = await getProducts();
  return <PageShell><Suspense fallback={<main className="search-page"><p>Opening the collection…</p></main>}><SearchExperience products={products} /></Suspense></PageShell>;
}
