import type { Product, ProductCategory } from "./types";

export type CatalogCategory = "All" | ProductCategory;

export function filterProducts(
  products: Product[],
  category: CatalogCategory,
): Product[] {
  if (category === "All") return products;
  return products.filter((product) => product.category === category);
}
