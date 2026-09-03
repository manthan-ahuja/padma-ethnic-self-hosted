"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { sortProducts, type CatalogSort } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";

type Filters = { size: string; color: string; material: string; price: string; occasion: string };
const emptyFilters: Filters = { size: "", color: "", material: "", price: "", occasion: "" };

export function CatalogView({ products }: { products: Product[] }) {
  const [sort, setSort] = useState<CatalogSort>("featured");
  const [filters, setFilters] = useState(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4);
  const options = useMemo(() => ({
    sizes: [...new Set(products.flatMap((product) => product.sizes))],
    colors: [...new Set(products.flatMap((product) => product.colors))],
    materials: [...new Set(products.map((product) => product.material.split(" with ")[0]))],
    occasions: [...new Set(products.flatMap((product) => product.occasions ?? []))],
  }), [products]);
  const visible = useMemo(() => sortProducts(products.filter((product) => {
    const size = !filters.size || product.sizes.includes(filters.size);
    const color = !filters.color || product.colors.includes(filters.color);
    const material = !filters.material || product.material.startsWith(filters.material);
    const price = !filters.price || (filters.price === "under-10000" ? product.price < 10000 : filters.price === "10000-15000" ? product.price >= 10000 && product.price <= 15000 : product.price > 15000);
    const occasion = !filters.occasion || product.occasions?.includes(filters.occasion);
    return size && color && material && price && occasion;
  }), sort), [products, filters, sort]);
  const activeCount = Object.values(filters).filter(Boolean).length;

  return <div className="catalog-layout">
    <div className="catalog-toolbar">
      <button type="button" className="filter-trigger" onClick={() => setShowFilters((value) => !value)}><SlidersHorizontal size={16} /> Filters {activeCount > 0 && <b>{activeCount}</b>}</button>
      <p>{visible.length} {visible.length === 1 ? "piece" : "pieces"}</p>
      <label>Sort <select value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low-high">Price: low to high</option><option value="price-high-low">Price: high to low</option></select></label>
    </div>
    {showFilters && <aside className="catalog-filters" aria-label="Product filters">
      <div><strong>Refine</strong><button type="button" onClick={() => setShowFilters(false)} aria-label="Close filters"><X size={17} /></button></div>
      <FilterSelect label="Size" value={filters.size} options={options.sizes} onChange={(size) => setFilters({ ...filters, size })} />
      <FilterSelect label="Colour" value={filters.color} options={options.colors} onChange={(color) => setFilters({ ...filters, color })} />
      <FilterSelect label="Material" value={filters.material} options={options.materials} onChange={(material) => setFilters({ ...filters, material })} />
      <FilterSelect label="Price" value={filters.price} options={["under-10000", "10000-15000", "over-15000"]} display={["Under ₹10,000", "₹10,000–₹15,000", "Above ₹15,000"]} onChange={(price) => setFilters({ ...filters, price })} />
      <FilterSelect label="Occasion" value={filters.occasion} options={options.occasions} onChange={(occasion) => setFilters({ ...filters, occasion })} />
      <label>Availability<select disabled aria-label="Availability requires live inventory"><option>Confirmed at checkout</option></select></label>
      <button className="clear-filters" type="button" onClick={() => setFilters(emptyFilters)}>Clear all</button>
    </aside>}
    {visible.length ? <><div className="product-grid collection-product-grid">{visible.slice(0, visibleCount).map((product) => <ProductCard key={product.id} product={product} />)}</div>{visibleCount < visible.length && <div className="load-more"><button type="button" className="primary-cta" onClick={() => setVisibleCount((count) => count + 4)}>Load more</button><span>{Math.min(visibleCount, visible.length)} of {visible.length} pieces</span></div>}</> : <div className="catalog-empty"><h2>No pieces match</h2><p>Try clearing one or more filters to see the collection again.</p><button type="button" className="primary-cta" onClick={() => setFilters(emptyFilters)}>Clear filters</button></div>}
  </div>;
}

function FilterSelect({ label, value, options, display, onChange }: { label: string; value: string; options: string[]; display?: string[]; onChange: (value: string) => void }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((option, index) => <option key={option} value={option}>{display?.[index] ?? option}</option>)}</select></label>;
}
