import type { Product, ProductCategory, ProductImage, ProductVariant } from "../types";

export type ShopifyMoney = { amount: string; currencyCode: string };
export type ShopifyImage = { url: string; altText?: string | null; width?: number; height?: number };
export type ShopifyVariantNode = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: ShopifyMoney;
  selectedOptions: { name: string; value: string }[];
};
export type ShopifyProductNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType?: string;
  tags?: string[];
  featuredImage?: ShopifyImage | null;
  images?: { nodes: ShopifyImage[] };
  priceRange: { minVariantPrice: ShopifyMoney };
  compareAtPriceRange?: { minVariantPrice?: ShopifyMoney | null } | null;
  options?: { name: string; values: string[] }[];
  variants?: { nodes: ShopifyVariantNode[] };
  material?: { value: string } | null;
  care?: { value: string } | null;
  included?: { value: string } | null;
  origin?: { value: string } | null;
  deliveryEstimate?: { value: string } | null;
  sku?: { value: string } | null;
};

const fallbackImage = "/images/padma-ivory.jpg";

function categoryFrom(productType = "", tags: string[] = []): ProductCategory {
  const value = `${productType} ${tags.join(" ")}`.toLowerCase();
  if (value.includes("saree")) return "Sarees";
  if (value.includes("lehenga")) return "Lehengas";
  if (value.includes("co-ord") || value.includes("coord")) return "Co-ords";
  return "Kurta Sets";
}

function optionValue(variant: ShopifyVariantNode, names: string[]) {
  return variant.selectedOptions.find((option) => names.includes(option.name.toLowerCase()))?.value;
}

function mapImage(image: ShopifyImage | undefined, productName: string, index: number): ProductImage {
  return { src: image?.url ?? fallbackImage, alt: image?.altText || `${productName} — view ${index + 1}` };
}

export function mapShopifyProduct(node: ShopifyProductNode): Product {
  const imageNodes = node.images?.nodes ?? [];
  const sourceImages = imageNodes.length ? imageNodes : node.featuredImage ? [node.featuredImage] : [undefined];
  const gallery = sourceImages.map((image, index) => mapImage(image, node.title, index));
  const variants: ProductVariant[] = (node.variants?.nodes ?? []).map((variant) => ({
    id: variant.id,
    title: variant.title,
    color: optionValue(variant, ["color", "colour"]),
    size: optionValue(variant, ["size"]),
    availableForSale: variant.availableForSale,
    price: Number(variant.price.amount),
  }));
  const colors = node.options?.find((option) => ["color", "colour"].includes(option.name.toLowerCase()))?.values ?? [...new Set(variants.map((variant) => variant.color).filter(Boolean))] as string[];
  const sizes = node.options?.find((option) => option.name.toLowerCase() === "size")?.values ?? [...new Set(variants.map((variant) => variant.size).filter(Boolean))] as string[];
  const tags = node.tags ?? [];
  const price = Number(node.priceRange.minVariantPrice.amount);
  const compareAt = Number(node.compareAtPriceRange?.minVariantPrice?.amount ?? 0);
  const category = categoryFrom(node.productType, tags);

  return {
    id: node.handle,
    shopifyProductId: node.id,
    name: node.title,
    category,
    price,
    originalPrice: compareAt > price ? compareAt : undefined,
    image: gallery[0].src,
    hoverImage: gallery[1]?.src ?? gallery[0].src,
    gallery,
    badge: tags.find((tag) => ["new", "bestseller", "limited", "sale"].includes(tag.toLowerCase())),
    colors: colors.length ? colors : ["Default"],
    sizes: sizes.length ? sizes : ["One Size"],
    description: node.description || "Product details will be updated in Shopify Admin.",
    material: node.material?.value || "See Shopify product description",
    features: tags.filter((tag) => tag.toLowerCase().startsWith("feature:")).map((tag) => tag.slice(8).trim()),
    care: node.care?.value || "Care instructions will be confirmed before fulfilment.",
    included: node.included?.value || node.title,
    origin: node.origin?.value || "Origin details managed in Shopify Admin",
    deliveryEstimate: node.deliveryEstimate?.value || "Calculated at checkout",
    sku: node.sku?.value || variants[0]?.id.split("/").pop() || node.handle,
    occasions: tags.filter((tag) => ["festive", "wedding", "everyday", "occasion"].includes(tag.toLowerCase())),
    isNew: tags.some((tag) => tag.toLowerCase() === "new"),
    isBestseller: tags.some((tag) => tag.toLowerCase() === "bestseller"),
    fit: category === "Sarees" ? "Classic drape · unstitched" : "See size and fit details",
    variants,
    source: "shopify",
  };
}
