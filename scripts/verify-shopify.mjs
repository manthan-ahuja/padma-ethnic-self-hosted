import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || "2026-07";
if (!domain || !token) {
  console.error("Shopify is not configured. Copy .env.example to .env.local and enter the store domain and Storefront API token.");
  process.exit(1);
}

const response = await fetch(`https://${domain}/api/${version}/graphql.json`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
  body: JSON.stringify({ query: `query VerifyPadmaStorefront { shop { name primaryDomain { url } } products(first: 5) { nodes { handle title variants(first: 1) { nodes { id availableForSale } } } } }` }),
});
const payload = await response.json();
if (!response.ok || payload.errors) {
  console.error("Shopify verification failed:", payload.errors?.map((error) => error.message).join("; ") || `${response.status} ${response.statusText}`);
  process.exit(1);
}
console.log(JSON.stringify({ connected: true, apiVersion: version, shop: payload.data.shop.name, primaryDomain: payload.data.shop.primaryDomain.url, sampledProducts: payload.data.products.nodes.map((product) => ({ handle: product.handle, title: product.title, hasVariant: Boolean(product.variants.nodes[0]), availableForSale: Boolean(product.variants.nodes[0]?.availableForSale) })) }, null, 2));
