import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CommerceProvider, useCommerce } from "@/components/commerce-provider";
import { ProductDetail } from "@/components/product-detail";
import { products } from "@/lib/products";

function renderProduct(product = products[0]) {
  return render(<CommerceProvider><ProductDetail product={product} /><CartSubtotalProbe /></CommerceProvider>);
}

function CartSubtotalProbe() {
  const { cart } = useCommerce();
  return <span data-testid="cart-subtotal">{cart.subtotal}</span>;
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
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Neelambari Silk Saree full-screen gallery" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("preselects the sole available size to avoid an unnecessary checkout step", async () => {
    const user = userEvent.setup();
    renderProduct();

    await user.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(screen.getByRole("status")).toHaveTextContent("Added 1 × Neelambari Silk Saree in Indigo, Free Size");
  });

  it("hides Shopify's synthetic Default colour and still adds the sole variant", async () => {
    const user = userEvent.setup();
    const product = {
      ...products[0],
      id: "saree",
      name: "Saree",
      colors: ["Default"],
      sizes: ["One Size"],
      source: "shopify" as const,
      variants: [{
        id: "gid://shopify/ProductVariant/1",
        title: "Default Title",
        availableForSale: true,
        price: 3000,
      }],
    };
    renderProduct(product);

    expect(screen.queryByRole("radio", { name: "Default" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(screen.getByRole("status")).toHaveTextContent("Added 1 × Saree in One Size");
  });

  it("uses the selected Shopify variant price on the product and in the cart", async () => {
    const user = userEvent.setup();
    const product = {
      ...products[1],
      price: 1000,
      colors: ["Emerald"],
      sizes: ["S", "M"],
      source: "shopify" as const,
      variants: [
        { id: "gid://shopify/ProductVariant/1", title: "S", color: "Emerald", size: "S", availableForSale: true, price: 1000 },
        { id: "gid://shopify/ProductVariant/2", title: "M", color: "Emerald", size: "M", availableForSale: true, price: 1300 },
      ],
    };
    renderProduct(product);

    await user.click(screen.getByRole("radio", { name: "M" }));
    expect(screen.getAllByText("₹1,300")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("1300");
  });

  it("requires a size when the product has multiple choices", async () => {
    const user = userEvent.setup();
    renderProduct(products[1]);

    await user.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please choose a size");

    await user.click(screen.getByRole("radio", { name: "S" }));
    await user.click(screen.getByRole("radio", { name: "Sindoor" }));
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(screen.getByRole("status")).toHaveTextContent("Added 2 × Gulmohar Kurta Set in Sindoor, S");
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
