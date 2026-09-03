import { describe, expect, it } from "vitest";
import { mapShopifyProduct } from "./mapper";

const node = {
  id: "gid://shopify/Product/1",
  handle: "lotus-silk-saree",
  title: "Lotus Silk Saree",
  description: "A luminous ceremonial saree.",
  productType: "Sarees",
  tags: ["Bestseller", "Festive"],
  featuredImage: { url: "https://cdn.shopify.com/lotus.jpg", altText: "Lotus saree", width: 1200, height: 1500 },
  images: { nodes: [{ url: "https://cdn.shopify.com/lotus.jpg", altText: "Lotus saree", width: 1200, height: 1500 }] },
  priceRange: { minVariantPrice: { amount: "12990.00", currencyCode: "INR" } },
  compareAtPriceRange: { minVariantPrice: { amount: "14990.00", currencyCode: "INR" } },
  options: [{ name: "Color", values: ["Indigo"] }, { name: "Size", values: ["Free Size"] }],
  variants: { nodes: [{ id: "gid://shopify/ProductVariant/11", title: "Indigo / Free Size", availableForSale: true, price: { amount: "12990.00", currencyCode: "INR" }, selectedOptions: [{ name: "Color", value: "Indigo" }, { name: "Size", value: "Free Size" }] }] },
  material: { value: "Pure silk" }, care: { value: "Dry clean only" }, included: { value: "Saree and blouse piece" }, origin: { value: "India" }, deliveryEstimate: { value: "4–7 business days" }, sku: { value: "PAD-001" },
};

describe("mapShopifyProduct", () => {
  it("maps Shopify product, options and variant IDs to the provider-neutral product model", () => {
    const product = mapShopifyProduct(node);
    expect(product.id).toBe("lotus-silk-saree");
    expect(product.shopifyProductId).toBe("gid://shopify/Product/1");
    expect(product.price).toBe(12990);
    expect(product.originalPrice).toBe(14990);
    expect(product.colors).toEqual(["Indigo"]);
    expect(product.sizes).toEqual(["Free Size"]);
    expect(product.variants?.[0]).toMatchObject({ id: "gid://shopify/ProductVariant/11", color: "Indigo", size: "Free Size", availableForSale: true });
  });

  it("does not invent secondary gallery images", () => {
    const product = mapShopifyProduct({ ...node, images: { nodes: [] }, featuredImage: null });
    expect(product.gallery).toHaveLength(1);
    expect(product.gallery[0].src).toBe("/images/padma-ivory.jpg");
  });
});
