import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-api";
import { commerceStore, CommerceValidationError } from "@/lib/commerce-store";

export async function GET() {
  const auth = await authorizeAdminMutation();
  if (auth.error) return auth.error;
  return NextResponse.json({ collections: await commerceStore.listCollections() });
}

export async function POST(request: Request) {
  const auth = await authorizeAdminMutation(request);
  if (auth.error) return auth.error;
  try {
    const input = await request.json() as { id?: unknown; title?: unknown; description?: unknown; productIds?: unknown; active?: unknown };
    if (!Array.isArray(input.productIds) || !input.productIds.every((id) => typeof id === "string")) throw new CommerceValidationError("Product ids must be a list.");
    await commerceStore.upsertCollection({
      id: String(input.id ?? ""), title: String(input.title ?? ""), description: String(input.description ?? ""),
      productIds: input.productIds, active: input.active !== false,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof CommerceValidationError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Admin collection save failed", error);
    return NextResponse.json({ error: "Unable to save collection." }, { status: 500 });
  }
}
