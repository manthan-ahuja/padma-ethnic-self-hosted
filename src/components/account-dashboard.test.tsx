import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountDashboard } from "./account-dashboard";

describe("AccountDashboard", () => {
  it("shows cart, orders, and saved-address account areas", async () => {
    const user = userEvent.setup();
    render(
      <AccountDashboard
        user={{ name: "Manthan", email: "manthan@example.com" }}
        cartCount={2}
        orders={[]}
        addresses={[]}
        onSaveAddress={vi.fn()}
        onDeleteAddress={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    expect(screen.getByText("2 items")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "My orders" }));
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "My addresses" }));
    expect(screen.getByRole("button", { name: "Add an address" })).toBeInTheDocument();
  });
});
