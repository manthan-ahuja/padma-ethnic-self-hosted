"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { searchProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";

const popular = ["Sarees", "Silk", "Lehengas", "Cotton", "Festive"];
const RECENT_SEARCH_KEY = "padma-recent-searches";

export function SearchExperience({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [recent, setRecent] = useState<string[]>([]);
  const results = useMemo(() => searchProducts(products, query), [products, query]);
  useEffect(() => { queueMicrotask(() => { try { const saved = JSON.parse(window.localStorage?.getItem(RECENT_SEARCH_KEY) ?? "[]"); setRecent(Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : []); } catch { setRecent([]); } }); }, []);
  const remember = (term: string) => {
    if (!term.trim()) return;
    const next = [term.trim(), ...recent.filter((item) => item.toLowerCase() !== term.trim().toLowerCase())].slice(0, 5);
    setRecent(next);
    window.localStorage?.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
  };
  return <main className="search-page">
    <header><p className="eyebrow">Find your Padma</p><h1>Search the collection</h1></header>
    <form className="search-field" onSubmit={(event) => { event.preventDefault(); remember(query); }}><Search size={21} /><label className="sr-only" htmlFor="catalog-search">Search products</label><input id="catalog-search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try silk, indigo or lehenga" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={18} /></button>}</form>
    {query && results.length > 0 && <div className="search-suggestions" aria-label="Search suggestions">{results.slice(0, 4).map((product) => <button type="button" key={product.id} onClick={() => { setQuery(product.name); remember(product.name); }}>{product.name}</button>)}</div>}
    {!query ? <><section className="popular-searches"><p>Popular searches</p><div>{popular.map((term) => <button type="button" key={term} onClick={() => { setQuery(term); remember(term); }}>{term}</button>)}</div></section>{recent.length > 0 && <section className="popular-searches"><p>Recent searches</p><div>{recent.map((term) => <button type="button" key={term} onClick={() => setQuery(term)}>{term}</button>)}<button type="button" onClick={() => { setRecent([]); window.localStorage?.removeItem(RECENT_SEARCH_KEY); }}>Clear</button></div></section>}</> : <section className="search-results" aria-live="polite"><div className="search-result-heading"><h2>{results.length ? `${results.length} results for “${query}”` : `No results for “${query}”`}</h2></div>{results.length ? <div className="product-grid collection-product-grid">{results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="catalog-empty"><p>Try a category, colour, fabric or a shorter phrase.</p><button className="primary-cta" type="button" onClick={() => setQuery("")}>Start again</button></div>}</section>}
  </main>;
}
