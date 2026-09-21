import { NextResponse } from "next/server";
import { cartReducer, initialCartState } from "@/lib/cart";
import { getCustomerId } from "@/lib/account-session";
import { CartVersionConflictError, customerStore } from "@/lib/customer-store";

export async function GET() {
  const userId = await getCustomerId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await customerStore.getCart(userId) ?? { cart: initialCartState, version: 0 });
}

export async function PUT(request: Request) {
  const userId = await getCustomerId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 250_000) return NextResponse.json({ error: "Cart is too large" }, { status: 413 });

  let cart;
  let version: number;
  try {
    const input = JSON.parse(raw) as { cart?: { items?: unknown[] }; version?: unknown };
    if (!Array.isArray(input.cart?.items) || input.cart.items.length > 50) throw new Error("Invalid cart");
    if (!Number.isInteger(input.version) || Number(input.version) < 0) throw new Error("Invalid version");
    cart = cartReducer(initialCartState, { type: "replace", state: input.cart as never });
    version = Number(input.version);
  } catch {
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  }

  try {
    const nextVersion = await customerStore.saveCart(userId, cart, version);
    return NextResponse.json({ cart, version: nextVersion });
  } catch (error) {
    if (error instanceof CartVersionConflictError) {
      return NextResponse.json({ error: "Cart changed in another session." }, { status: 409 });
    }
    console.error("Saving customer cart failed", error);
    return NextResponse.json({ error: "Unable to save cart right now." }, { status: 500 });
  }
}
