import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export function isAdminEmail(email: string | null | undefined, allowlist = process.env.ADMIN_EMAILS ?? "") {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return allowlist.split(",").some((candidate) => candidate.trim().toLowerCase() === normalized);
}

export function isAdminIdentity(
  email: string | null | undefined,
  authProvider: "google" | "credentials" | undefined,
  allowlist = process.env.ADMIN_EMAILS ?? "",
) {
  return authProvider === "google" && isAdminEmail(email, allowlist);
}

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  return isAdminIdentity(session?.user?.email, session?.user?.authProvider) ? session : null;
}
