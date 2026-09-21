import { NextResponse } from "next/server";
import { parseRegistration } from "@/lib/account-validation";
import { customerStore } from "@/lib/customer-store";
import { accountRateLimiter, requestIp } from "@/lib/rate-limit";
import { isAdminEmail } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!accountRateLimiter.allow(`register:${requestIp(request.headers)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });
  }

  let registration: ReturnType<typeof parseRegistration>;
  try {
    registration = parseRegistration(await request.json());
  } catch {
    return NextResponse.json({ error: "Please check your name, email, and password." }, { status: 400 });
  }

  // Allowlisted administrators must prove email ownership through Google.
  // Match the existing-account response to avoid revealing allowlist membership.
  if (isAdminEmail(registration.email)) return NextResponse.json({ ok: true });

  try {
    await customerStore.createPasswordUser(registration);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code.includes("CONSTRAINT")) return NextResponse.json({ ok: true });
    console.error("Account registration failed", error);
    return NextResponse.json({ error: "Unable to create your account right now." }, { status: 500 });
  }
}
