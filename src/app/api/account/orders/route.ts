import { NextResponse } from "next/server";
import { getCustomerId } from "@/lib/account-session";
import { customerStore } from "@/lib/customer-store";

export async function GET() {
  const userId = await getCustomerId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ orders: await customerStore.listOrders(userId) });
}
