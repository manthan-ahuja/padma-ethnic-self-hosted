"use client";

import { useState } from "react";

type Credentials = { name: string; email: string; password: string };

type AccountAuthProps = {
  googleConfigured: boolean;
  onGoogle: () => void;
  onCredentials: (mode: "login" | "signup", credentials: Credentials) => Promise<void>;
};

export function AccountAuth({ googleConfigured, onGoogle, onCredentials }: AccountAuthProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    try {
      await onCredentials(mode, {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-card account-auth-card">
      <p className="eyebrow">Your Padma account</p>
      <h1>{mode === "login" ? "Welcome back." : "Begin your Padma story."}</h1>
      <div className="account-auth-tabs" aria-label="Account access">
        <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>Log in</button>
        <button type="button" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>Sign up</button>
      </div>

      <form action={submit} className="account-auth-form">
        {mode === "signup" && <label>Name<input name="name" autoComplete="name" required /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label>
        {error && <p className="account-form-error" role="alert">{error}</p>}
        <button className="account-primary-action" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log in to account" : "Create account"}
        </button>
      </form>

      <div className="account-auth-divider"><span>or</span></div>
      <button className="google-sign-in" type="button" onClick={onGoogle} disabled={!googleConfigured || busy}>
        <span aria-hidden="true">G</span>
        Continue with Google
      </button>
      {!googleConfigured && <p className="account-setup-note" role="status">Google sign-in is being configured.</p>}
    </section>
  );
}
