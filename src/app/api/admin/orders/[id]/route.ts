import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-api";
import { commerceStore, CommerceValidationError, type OrderStatus } from "@/lib/commerce-store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (auth.error) return auth.error;
  try {
    const { id } = await context.params;
    const input = await request.json() as { status?: unknown };
    await commerceStore.updateOrderStatus(id, String(input.status) as OrderStatus, auth.session.user!.email!);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CommerceValidationError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Admin order status update failed", error);
    return NextResponse.json({ error: "Unable to update order." }, { status: 500 });
  }
}
