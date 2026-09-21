import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { products } from "@/lib/products";
import { CheckoutExperience } from "./checkout-experience";

const product = products[0];

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "customer-1" } }, status: "authenticated" }),
}));

vi.mock("./commerce-provider", () => ({
  useCommerce: () => ({
    cart: {
      items: [{ product, quantity: 1, selection: { color: product.colors[0], size: product.sizes[0], variantId: "variant-1" }, lineId: "line-1" }],
      itemCount: 1,
      subtotal: product.price,
    },
    removeFromCart: vi.fn(),
  }),
}));

afterEach(() => vi.unstubAllGlobals());

describe("CheckoutExperience", () => {
  it("applies a coupon beside the code field and keeps cash on delivery available", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/account/addresses") return new Response(JSON.stringify({ addresses: [{ id: "address-1", label: "Home", fullName: "Buyer", phone: "9999999999", address1: "1 Lane", address2: "", city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "India", isDefault: true }] }), { status: 200 });
      if (url === "/api/checkout/quote") return new Response(JSON.stringify({ quote: { subtotal: product.price, shipping: 199, discount: 500, total: product.price - 301, couponCode: "SAVE500" } }), { status: 200 });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutExperience />);

    const input = await screen.findByRole("textbox", { name: "Coupon code" });
    await user.type(input, "save500");
    await user.click(screen.getByRole("button", { name: "Apply coupon" }));

    expect(await screen.findByText("SAVE500 applied")).toBeInTheDocument();
    expect(screen.getByText("Cash on delivery")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Place cash on delivery order" })).toBeEnabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/checkout/quote", expect.objectContaining({ method: "POST" })));
  });
});
