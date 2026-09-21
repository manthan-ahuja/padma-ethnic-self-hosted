import { NextResponse } from "next/server";
import { getCustomerId } from "@/lib/account-session";
import { CheckoutAddressError, CommerceValidationError, commerceStore, InventoryUnavailableError } from "@/lib/commerce-store";
import { accountRateLimiter } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const userId = await getCustomerId();
  if (!userId) return NextResponse.json({ error: "Please sign in before checking out." }, { status: 401 });
  if (!accountRateLimiter.allow(`checkout:${userId}`, 12, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait and try again." }, { status: 429 });
  }
  const raw = await request.text();
  if (raw.length > 50_000) return NextResponse.json({ error: "Checkout request is too large." }, { status: 413 });
  try {
    const input = JSON.parse(raw) as {
      addressId?: unknown;
      idempotencyKey?: unknown;
      paymentMethod?: unknown;
      couponCode?: unknown;
      lines?: Array<{ variantId?: unknown; quantity?: unknown }>;
    };
    if (typeof input.addressId !== "string" || typeof input.idempotencyKey !== "string" || !Array.isArray(input.lines)) {
      throw new CommerceValidationError("Invalid checkout details.");
    }
    if (input.paymentMethod !== "cod") {
      throw new CommerceValidationError("Only cash on delivery is currently available.");
    }
    const order = await commerceStore.createOrder({
      userId,
      addressId: input.addressId,
      idempotencyKey: input.idempotencyKey,
      paymentMethod: "cod",
      couponCode: typeof input.couponCode === "string" ? input.couponCode : undefined,
      lines: input.lines.map((line) => ({ variantId: String(line.variantId ?? ""), quantity: Number(line.quantity) })),
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryUnavailableError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof CheckoutAddressError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof CommerceValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid checkout details." }, { status: 400 });
    }
    console.error("Creating checkout order failed", error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 500 });
  }
}
