import { NextResponse } from "next/server";
import { createShopifyCheckout, type CheckoutLine } from "@/lib/shopify/cart";
import { isShopifyConfigured } from "@/lib/shopify/client";

export const runtime = "nodejs";

type RequestBody = { lines?: unknown };

function validLines(value: unknown): value is CheckoutLine[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 && value.every((line) => {
    if (!line || typeof line !== "object") return false;
    const item = line as Record<string, unknown>;
    return typeof item.merchandiseId === "string" && item.merchandiseId.startsWith("gid://shopify/ProductVariant/") && Number.isInteger(item.quantity) && Number(item.quantity) >= 1 && Number(item.quantity) <= 20;
  });
}

export async function POST(request: Request) {
  if (!isShopifyConfigured()) return NextResponse.json({ error: "Shopify checkout is not configured." }, { status: 503 });
  let body: RequestBody;
  try { body = await request.json() as RequestBody; }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!validLines(body.lines)) return NextResponse.json({ error: "Cart lines are invalid." }, { status: 400 });

  try {
    const cart = await createShopifyCheckout(body.lines);
    return NextResponse.json({ cartId: cart.id, checkoutUrl: cart.checkoutUrl });
  } catch (error) {
    console.error("Shopify cart creation failed", error);
    return NextResponse.json({ error: "Shopify could not create checkout. Please try again." }, { status: 502 });
  }
}
