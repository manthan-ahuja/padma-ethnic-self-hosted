import type { Product, ProductCategory } from "./types";

export type CatalogCategory = "All" | ProductCategory;
export type CatalogSort = "featured" | "price-low-high" | "price-high-low" | "newest";

export function filterProducts(
  products: Product[],
  category: CatalogCategory,
): Product[] {
  if (category === "All") return products;
  return products.filter((product) => product.category === category);
}

export function searchProducts(products: Product[], query: string): Product[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return products;

  return products.filter((product) =>
    [
      product.name,
      product.category,
      product.material,
      product.description,
      ...product.colors,
      ...(product.occasions ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(needle),
  );
}

export function sortProducts(products: Product[], sort: CatalogSort): Product[] {
  const result = [...products];
  if (sort === "price-low-high") return result.sort((a, b) => a.price - b.price);
  if (sort === "price-high-low") return result.sort((a, b) => b.price - a.price);
  if (sort === "newest") {
    return result.sort(
      (a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)),
    );
  }
  return result;
}
