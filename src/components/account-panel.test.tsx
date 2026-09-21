import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountPanel } from "./account-panel";

describe("AccountPanel", () => {
  it("lets a signed-out shopper continue with Google", async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn();

    render(<AccountPanel configured user={null} onSignIn={onSignIn} onSignOut={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it("shows a signed-in shopper and lets them sign out", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();

    render(<AccountPanel configured user={{ name: "Manthan", email: "manthan@example.com" }} onSignIn={vi.fn()} onSignOut={onSignOut} />);

    expect(screen.getByRole("heading", { name: "Welcome, Manthan." })).toBeInTheDocument();
    expect(screen.getByText("manthan@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("keeps sign-in unavailable until Google OAuth is configured", () => {
    render(<AccountPanel configured={false} user={null} onSignIn={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Google sign-in is being configured");
  });
});
