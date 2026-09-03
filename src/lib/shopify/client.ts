import "server-only";

const DEFAULT_API_VERSION = "2026-07";

export type ShopifyGraphQLError = { message: string; extensions?: Record<string, unknown> };

type ShopifyResponse<T> = { data?: T; errors?: ShopifyGraphQLError[] };

export function getShopifyConfig() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;
  return { domain, accessToken, apiVersion, configured: Boolean(domain && accessToken) };
}

export function isShopifyConfigured() {
  return getShopifyConfig().configured;
}

export async function shopifyFetch<T>({ query, variables, cache = "no-store", revalidate }: { query: string; variables?: Record<string, unknown>; cache?: RequestCache; revalidate?: number }) {
  const config = getShopifyConfig();
  if (!config.configured || !config.domain || !config.accessToken) throw new Error("Shopify is not configured. Add SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN to .env.local.");

  const response = await fetch(`https://${config.domain}/api/${config.apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": config.accessToken },
    body: JSON.stringify({ query, variables }),
    cache,
    next: revalidate ? { revalidate } : undefined,
  });
  const payload = await response.json() as ShopifyResponse<T>;
  if (!response.ok || payload.errors?.length || !payload.data) {
    const detail = payload.errors?.map((error) => error.message).join("; ") || `${response.status} ${response.statusText}`;
    throw new Error(`Shopify Storefront API request failed: ${detail}`);
  }
  return payload.data;
}
