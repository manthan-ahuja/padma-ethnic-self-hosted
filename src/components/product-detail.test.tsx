import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CommerceProvider } from "@/components/commerce-provider";
import { ProductDetail } from "@/components/product-detail";
import { products } from "@/lib/products";

function renderProduct() {
  return render(<CommerceProvider><ProductDetail product={products[0]} /></CommerceProvider>);
}

describe("ProductDetail", () => {
  it("shows product specifications and opens the verified image full screen", async () => {
    const user = userEvent.setup();
    renderProduct();

    expect(screen.getByRole("heading", { name: "Neelambari Silk Saree" })).toBeInTheDocument();
    expect(screen.getByText("Pure handwoven silk with antique zari")).toBeInTheDocument();
    expect(screen.getByText("Estimated delivery")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Neelambari Silk Saree — view 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open full-screen view of Neelambari Silk Saree" }));
    expect(screen.getByRole("dialog", { name: "Neelambari Silk Saree full-screen gallery" })).toBeInTheDocument();
  });

  it("requires a size before adding the configured product", async () => {
    const user = userEvent.setup();
    renderProduct();

    await user.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please choose a size");

    await user.click(screen.getByRole("radio", { name: "Free Size" }));
    await user.click(screen.getByRole("radio", { name: "Rani Pink" }));
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(screen.getByRole("status")).toHaveTextContent("Added 2 × Neelambari Silk Saree in Rani Pink, Free Size");
  });

  it("validates a six digit delivery pincode without inventing serviceability", async () => {
    const user = userEvent.setup();
    renderProduct();

    await user.type(screen.getByLabelText("Delivery pincode"), "4000");
    await user.click(screen.getByRole("button", { name: "Check delivery" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid 6-digit pincode");

    await user.clear(screen.getByLabelText("Delivery pincode"));
    await user.type(screen.getByLabelText("Delivery pincode"), "400001");
    await user.click(screen.getByRole("button", { name: "Check delivery" }));
    expect(screen.getByRole("status")).toHaveTextContent("confirmed at checkout");
  });
});
