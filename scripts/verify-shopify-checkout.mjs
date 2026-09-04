import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || "2026-07";

if (!domain || !token) {
  console.error("Shopify is not configured.");
  process.exit(1);
}

const endpoint = `https://${domain}/api/${version}/graphql.json`;
const request = async (query, variables = {}) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(payload.errors?.map((error) => error.message).join("; ") || `${response.status} ${response.statusText}`);
  }
  return payload.data;
};

const catalog = await request(`query CheckoutProbeProduct {
  products(first: 1, query: "available_for_sale:true") {
    nodes {
      handle
      title
      variants(first: 1) { nodes { id availableForSale } }
    }
  }
}`);

const product = catalog.products.nodes[0];
const variant = product?.variants.nodes[0];
if (!product || !variant?.availableForSale) {
  console.error("No published, available Shopify product variant was found.");
  process.exit(1);
}

const cartData = await request(`mutation CheckoutProbe($input: CartInput!) {
  cartCreate(input: $input) {
    cart { id checkoutUrl totalQuantity }
    userErrors { field message code }
  }
}`, { input: { lines: [{ merchandiseId: variant.id, quantity: 1 }] } });

const errors = cartData.cartCreate.userErrors;
if (errors.length || !cartData.cartCreate.cart?.checkoutUrl) {
  console.error("Cart creation failed:", errors.map((error) => error.message).join("; ") || "Missing checkout URL");
  process.exit(1);
}

const cart = cartData.cartCreate.cart;
const checkout = new URL(cart.checkoutUrl);
const trustedCheckout = checkout.protocol === "https:" && (
  checkout.hostname === domain ||
  checkout.hostname.endsWith(".myshopify.com") ||
  checkout.hostname.endsWith(".shopify.com")
);
if (!trustedCheckout) {
  console.error("Shopify returned an unexpected checkout host.");
  process.exit(1);
}

console.log(JSON.stringify({
  connected: true,
  product: { handle: product.handle, title: product.title, availableForSale: variant.availableForSale },
  cart: { created: true, totalQuantity: cart.totalQuantity },
  checkout: { validHttpsUrl: true, host: checkout.hostname },
}, null, 2));
