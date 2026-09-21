import { NextResponse } from "next/server";
import { getCustomerId } from "@/lib/account-session";
import { CommerceValidationError, commerceStore, InventoryUnavailableError } from "@/lib/commerce-store";
import { accountRateLimiter } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const userId = await getCustomerId();
  if (!userId) return NextResponse.json({ error: "Please sign in before applying a coupon." }, { status: 401 });
  if (!accountRateLimiter.allow(`checkout-quote:${userId}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many coupon attempts. Please wait and try again." }, { status: 429 });
  }
  const raw = await request.text();
  if (raw.length > 50_000) return NextResponse.json({ error: "Coupon request is too large." }, { status: 413 });
  try {
    const input = JSON.parse(raw) as {
      couponCode?: unknown;
      lines?: Array<{ variantId?: unknown; quantity?: unknown }>;
    };
    if (typeof input.couponCode !== "string" || !input.couponCode.trim() || !Array.isArray(input.lines)) {
      throw new CommerceValidationError("Enter a coupon code.");
    }
    const quote = await commerceStore.quoteOrder({
      couponCode: input.couponCode,
      lines: input.lines.map((line) => ({ variantId: String(line.variantId ?? ""), quantity: Number(line.quantity) })),
    });
    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof InventoryUnavailableError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof CommerceValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid coupon details." }, { status: 400 });
    }
    console.error("Creating checkout quote failed", error);
    return NextResponse.json({ error: "Unable to apply coupon right now." }, { status: 500 });
  }
}
