import type { Metadata } from "next";
import { AccountExperience } from "@/components/account-experience";
import { PageShell } from "@/components/site-chrome";
import { googleAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Account — Padma Ethnic",
  description: "Sign in securely to your Padma Ethnic account.",
};

export default function AccountPage() {
  return (
    <PageShell>
      <main className="account-page">
        <div className="account-story" aria-hidden="true">
          <span>पद्म</span>
          <p>One account.<br />A more personal Padma.</p>
        </div>
        <AccountExperience configured={googleAuthConfigured} />
      </main>
    </PageShell>
  );
}
