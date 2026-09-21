import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export async function authorizeAdminMutation(request?: Request) {
  const session = await getAdminSession();
  if (!session?.user?.email) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (request) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && (!host || new URL(origin).host !== host)) {
      return { error: NextResponse.json({ error: "Invalid request origin" }, { status: 403 }) };
    }
  }
  return { session };
}
