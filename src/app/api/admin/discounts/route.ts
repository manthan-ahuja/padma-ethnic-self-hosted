import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-api";
import { commerceStore, CommerceValidationError, type DiscountScope, type DiscountType } from "@/lib/commerce-store";

export async function GET() {
  const auth = await authorizeAdminMutation();
  if (auth.error) return auth.error;
  return NextResponse.json({ discounts: await commerceStore.listDiscounts() });
}

export async function POST(request: Request) {
  const auth = await authorizeAdminMutation(request);
  if (auth.error) return auth.error;
  const raw = await request.text();
  if (raw.length > 50_000) return NextResponse.json({ error: "Coupon request is too large." }, { status: 413 });
  try {
    const input = JSON.parse(raw) as Record<string, unknown>;
    const usageValue = input.usageLimit == null || input.usageLimit === "" ? undefined : Number(input.usageLimit);
    const discount = await commerceStore.upsertDiscount({
      code: String(input.code ?? ""),
      type: String(input.type ?? "") as DiscountType,
      value: Number(input.value ?? 0),
      minimumOrder: Number(input.minimumOrder ?? 0),
      ...(usageValue == null ? {} : { usageLimit: usageValue }),
      active: input.active !== false,
      scope: String(input.scope ?? "all") as DiscountScope,
      productIds: Array.isArray(input.productIds) ? input.productIds.map(String) : [],
      collectionIds: Array.isArray(input.collectionIds) ? input.collectionIds.map(String) : [],
    });
    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    if (error instanceof CommerceValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Admin coupon save failed", error);
    return NextResponse.json({ error: "Unable to save coupon." }, { status: 500 });
  }
}
