import { describe, expect, it } from "vitest";
import { parseAdminProductPayload } from "./admin-product";

describe("admin product payload", () => {
  it("normalizes selectable custom options into a complete per-variant inventory matrix", () => {
    const result = parseAdminProductPayload({
      name: "Custom Colour Kurta",
      category: "Kurta Sets",
      description: "A detailed description",
      material: "Silk",
      gallery: [{ src: "https://example.com/one.jpg", alt: "Front" }],
      colors: ["Navy", "Custom Copper", "Navy"],
      sizes: ["S", "Custom 4XL"],
      variants: [
        { color: "Navy", size: "S", price: 5000, inventoryQuantity: 2 },
        { color: "Navy", size: "Custom 4XL", price: 5200, inventoryQuantity: 3 },
        { color: "Custom Copper", size: "S", price: 5100, inventoryQuantity: 4 },
        { color: "Custom Copper", size: "Custom 4XL", price: 5300, inventoryQuantity: 5 },
      ],
    });

    expect(result.colors).toEqual(["Navy", "Custom Copper"]);
    expect(result.sizes).toEqual(["S", "Custom 4XL"]);
    expect(result.variants.map((variant) => variant.inventoryQuantity)).toEqual([2, 3, 4, 5]);
    expect(result).toMatchObject({ image: "https://example.com/one.jpg", hoverImage: "https://example.com/one.jpg", active: true });
  });

  it("rejects an incomplete colour and size matrix", () => {
    expect(() => parseAdminProductPayload({
      name: "Incomplete",
      category: "Sarees",
      description: "Description",
      material: "Silk",
      gallery: [{ src: "https://example.com/one.jpg", alt: "Front" }],
      colors: ["Red", "Blue"],
      sizes: ["S", "M"],
      variants: [{ color: "Red", size: "S", price: 5000, inventoryQuantity: 1 }],
    })).toThrow("variant for every colour and size");
  });
});
