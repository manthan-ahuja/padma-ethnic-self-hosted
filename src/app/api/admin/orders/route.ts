import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-api";
import { commerceStore } from "@/lib/commerce-store";

export async function GET() {
  const auth = await authorizeAdminMutation();
  if (auth.error) return auth.error;
  return NextResponse.json({ orders: await commerceStore.listOrders() });
}
