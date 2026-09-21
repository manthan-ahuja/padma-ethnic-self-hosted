import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-api";
import { parseAdminProductPayload } from "@/lib/admin-product";
import { commerceStore, CommerceValidationError } from "@/lib/commerce-store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (auth.error) return auth.error;
  const raw = await request.text();
  if (raw.length > 250_000) return NextResponse.json({ error: "Product request is too large." }, { status: 413 });
  try {
    const { id } = await context.params;
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (Object.keys(input).every((key) => key === "active") && typeof input.active === "boolean") {
      await commerceStore.setProductActive(id, input.active);
      return NextResponse.json({ ok: true });
    }
    const product = await commerceStore.updateProduct(id, parseAdminProductPayload(input));
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof CommerceValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Admin product update failed", error);
    return NextResponse.json({ error: "Unable to update product." }, { status: 500 });
  }
}
