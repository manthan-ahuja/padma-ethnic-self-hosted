import "server-only";
import { shopifyFetch } from "./client";
import { CART_CREATE_MUTATION } from "./queries";

export type CheckoutLine = { merchandiseId: string; quantity: number };
type CartCreatePayload = {
  cartCreate: {
    cart: { id: string; checkoutUrl: string; totalQuantity: number } | null;
    userErrors: { field?: string[]; message: string; code?: string }[];
    warnings: { message: string; code?: string }[];
  };
};

export async function createShopifyCheckout(lines: CheckoutLine[]) {
  if (!lines.length) throw new Error("Cannot create a Shopify cart without merchandise.");
  const data = await shopifyFetch<CartCreatePayload>({
    query: CART_CREATE_MUTATION,
    variables: { input: { lines } },
    cache: "no-store",
  });
  const result = data.cartCreate;
  if (result.userErrors.length || !result.cart) {
    throw new Error(result.userErrors.map((error) => error.message).join("; ") || "Shopify did not create a cart.");
  }
  return result.cart;
}
