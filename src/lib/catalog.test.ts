import { describe, expect, it } from "vitest";
import { filterProducts, searchProducts, sortProducts } from "@/lib/catalog";
import { products as catalogProducts } from "@/lib/products";

const products = [catalogProducts[0], catalogProducts[1]];

describe("filterProducts", () => {
  it("returns all products when the selected category is All", () => {
    expect(filterProducts(products, "All")).toEqual(products);
  });

  it("returns only products in the selected category", () => {
    expect(filterProducts(products, "Sarees")).toEqual([products[0]]);
  });
});

describe("searchProducts", () => {
  it("matches product names, categories, colours and materials", () => {
    expect(searchProducts(catalogProducts, "indigo").map((item) => item.id)).toContain(
      "neelambari-silk-saree",
    );
    expect(searchProducts(catalogProducts, "cotton").length).toBeGreaterThan(0);
    expect(
      searchProducts(catalogProducts, "Lehengas").every(
        (item) => item.category === "Lehengas",
      ),
    ).toBe(true);
  });

  it("returns an empty result for an unmatched query", () => {
    expect(searchProducts(catalogProducts, "not-a-padma-product")).toEqual([]);
  });
});

describe("sortProducts", () => {
  it("sorts without mutating the original catalog", () => {
    const original = [...catalogProducts];
    const sorted = sortProducts(catalogProducts, "price-low-high");

    expect(sorted[0].price).toBeLessThanOrEqual(sorted.at(-1)!.price);
    expect(catalogProducts).toEqual(original);
  });
});
