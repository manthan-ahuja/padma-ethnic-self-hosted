import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CommerceProvider } from "@/components/commerce-provider";
import { Storefront } from "@/components/storefront";
import { SiteHeader } from "@/components/site-chrome";
import { products } from "@/lib/products";

function renderStorefront() { return render(<CommerceProvider><Storefront products={products} /></CommerceProvider>); }

describe("Storefront", () => {
  it("filters the collection by category", async () => {
    const user = userEvent.setup();
    renderStorefront();
    await user.click(screen.getByRole("button", { name: "Sarees" }));
    expect(screen.getByText("Neelambari Silk Saree")).toBeInTheDocument();
    expect(screen.queryByText("Gulmohar Kurta Set")).not.toBeInTheDocument();
  });

  it("sends shoppers to choose a valid variant before adding", () => {
    renderStorefront();
    expect(screen.getByRole("link", { name: "Choose options for Neelambari Silk Saree" })).toHaveAttribute("href", "/products/neelambari-silk-saree");
  });

  it("links each collection card to its product detail page", () => {
    renderStorefront();
    expect(screen.getByRole("link", { name: "View Neelambari Silk Saree" })).toHaveAttribute("href", "/products/neelambari-silk-saree");
  });

  it("offers account access from the storefront header", () => {
    renderStorefront();
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
  });

  it("closes the homepage menu with Escape and restores page scrolling", async () => {
    const user = userEvent.setup();
    renderStorefront();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog", { name: "Navigation menu" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Navigation menu" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the global mobile menu with Escape and restores page scrolling", async () => {
    const user = userEvent.setup();
    render(<CommerceProvider><SiteHeader /></CommerceProvider>);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog", { name: "Navigation menu" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Navigation menu" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
