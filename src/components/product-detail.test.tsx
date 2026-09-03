import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProductDetail } from "@/components/product-detail";
import { products } from "@/lib/products";

describe("ProductDetail", () => {
  it("shows product specifications and switches gallery images", async () => {
    const user = userEvent.setup();
    render(<ProductDetail product={products[0]} />);

    expect(screen.getByRole("heading", { name: "Neelambari Silk Saree" })).toBeInTheDocument();
    expect(screen.getByText("Pure handwoven silk with antique zari")).toBeInTheDocument();
    expect(screen.getByText("Estimated delivery")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Neelambari Silk Saree — view 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View product image 2" }));

    expect(screen.getByRole("img", { name: "Neelambari Silk Saree — view 2" })).toBeInTheDocument();
  });

  it("requires a size before adding the configured product", async () => {
    const user = userEvent.setup();
    render(<ProductDetail product={products[0]} />);

    await user.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please choose a size");

    await user.click(screen.getByRole("radio", { name: "Free Size" }));
    await user.click(screen.getByRole("radio", { name: "Rani Pink" }));
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(screen.getByRole("button", { name: "Add to bag" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Added 2 × Neelambari Silk Saree in Rani Pink, Free Size",
    );
  });
});
