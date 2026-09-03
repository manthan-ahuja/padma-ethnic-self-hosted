import "server-only";
import { products as localProducts } from "../products";
import type { Product } from "../types";
import { isShopifyConfigured, shopifyFetch } from "./client";
import { mapShopifyProduct, type ShopifyProductNode } from "./mapper";
import { PRODUCT_BY_HANDLE_QUERY, PRODUCTS_QUERY } from "./queries";

export type CatalogSource = "shopify" | "local-preview";

export function getCatalogSource(): CatalogSource {
  return isShopifyConfigured() ? "shopify" : "local-preview";
}

export async function getProducts(query?: string): Promise<Product[]> {
  if (!isShopifyConfigured()) return localProducts;
  const data = await shopifyFetch<{ products: { nodes: ShopifyProductNode[] } }>({
    query: PRODUCTS_QUERY,
    variables: { first: 100, query: query || null, sortKey: query ? "RELEVANCE" : "TITLE" },
    cache: "force-cache",
    revalidate: 60,
  });
  return data.products.nodes.map(mapShopifyProduct);
}

export async function getProductByHandle(handle: string): Promise<Product | undefined> {
  if (!isShopifyConfigured()) return localProducts.find((product) => product.id === handle);
  const data = await shopifyFetch<{ product: ShopifyProductNode | null }>({
    query: PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
    cache: "force-cache",
    revalidate: 60,
  });
  return data.product ? mapShopifyProduct(data.product) : undefined;
}
