import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-api";
import { parseAdminProductPayload } from "@/lib/admin-product";
import { commerceStore, CommerceValidationError } from "@/lib/commerce-store";

export async function GET() {
  const auth = await authorizeAdminMutation();
  if (auth.error) return auth.error;
  return NextResponse.json({ products: await commerceStore.listProducts({ activeOnly: false }) });
}

export async function POST(request: Request) {
  const auth = await authorizeAdminMutation(request);
  if (auth.error) return auth.error;
  const raw = await request.text();
  if (raw.length > 250_000) return NextResponse.json({ error: "Product request is too large." }, { status: 413 });
  try {
    const product = await commerceStore.createProduct(parseAdminProductPayload(JSON.parse(raw)));
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof CommerceValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Admin product save failed", error);
    return NextResponse.json({ error: "Unable to save product." }, { status: 500 });
  }
}
