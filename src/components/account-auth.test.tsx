import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountAuth } from "./account-auth";

describe("AccountAuth", () => {
  it("offers separate login and signup flows", async () => {
    const user = userEvent.setup();
    const onCredentials = vi.fn().mockResolvedValue(undefined);
    render(<AccountAuth googleConfigured onGoogle={vi.fn()} onCredentials={onCredentials} />);

    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Name"), "Manthan Ahuja");
    await user.type(screen.getByLabelText("Email"), "manthan@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(onCredentials).toHaveBeenCalledWith("signup", {
      name: "Manthan Ahuja", email: "manthan@example.com", password: "password123",
    });
  });

  it("returns a successful signup to login instead of treating signup as login", async () => {
    const user = userEvent.setup();
    render(<AccountAuth googleConfigured onGoogle={vi.fn()} onCredentials={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Name"), "New Customer");
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Account created. Log in with your new details.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in to account" })).toBeInTheDocument();
  });
});
