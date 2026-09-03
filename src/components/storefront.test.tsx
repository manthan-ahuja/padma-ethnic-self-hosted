import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Storefront } from "@/components/storefront";

describe("Storefront", () => {
  it("filters the collection by category", async () => {
    const user = userEvent.setup();
    render(<Storefront />);

    await user.click(screen.getByRole("button", { name: "Sarees" }));

    expect(screen.getByText("Neelambari Silk Saree")).toBeInTheDocument();
    expect(screen.queryByText("Gulmohar Kurta Set")).not.toBeInTheDocument();
  });

  it("adds a product and exposes it in the shopping bag", async () => {
    const user = userEvent.setup();
    render(<Storefront />);

    await user.click(
      screen.getByRole("button", { name: "Add Neelambari Silk Saree to bag" }),
    );

    expect(screen.getByRole("dialog", { name: "Your shopping bag" })).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getAllByText("₹8,990").length).toBeGreaterThan(0);
  });

  it("links each collection card to its product detail page", () => {
    render(<Storefront />);

    expect(
      screen.getByRole("link", { name: "View Neelambari Silk Saree" }),
    ).toHaveAttribute("href", "/products/neelambari-silk-saree");
  });
});
