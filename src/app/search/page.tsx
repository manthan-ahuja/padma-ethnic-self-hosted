import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchExperience } from "@/components/search-experience";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Search | Padma Ethnic", description: "Search Padma's sarees, kurta sets, lehengas and contemporary Indian separates." };

export default function SearchPage() {
  return <PageShell><Suspense fallback={<main className="search-page"><p>Opening the collection…</p></main>}><SearchExperience /></Suspense></PageShell>;
}
