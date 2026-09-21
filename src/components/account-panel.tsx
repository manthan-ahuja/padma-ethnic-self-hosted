"use client";

export type AccountUser = {
  name?: string | null;
  email?: string | null;
};

type AccountPanelProps = {
  configured: boolean;
  user: AccountUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
};

export function AccountPanel({ configured, user, onSignIn, onSignOut }: AccountPanelProps) {
  if (user) {
    return (
      <section className="account-card">
        <p className="eyebrow">Your account</p>
        <h1>Welcome, {user.name || "beautiful"}.</h1>
        {user.email && <p className="account-email">{user.email}</p>}
        <button className="account-secondary-action" type="button" onClick={onSignOut}>Sign out</button>
      </section>
    );
  }

  return (
    <section className="account-card">
      <p className="eyebrow">Your Padma account</p>
      <h1>Sign in to continue.</h1>
      <p>Use Google for a secure, password-free sign-in.</p>
      <button className="google-sign-in" type="button" onClick={onSignIn} disabled={!configured}>
        <span aria-hidden="true">G</span>
        Continue with Google
      </button>
      {!configured && <p className="account-setup-note" role="status">Google sign-in is being configured.</p>}
    </section>
  );
}
