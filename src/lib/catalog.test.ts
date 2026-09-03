import { describe, expect, it } from "vitest";
import { filterProducts } from "@/lib/catalog";
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
