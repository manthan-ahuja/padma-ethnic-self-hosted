import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CommerceOrder } from "@/lib/commerce-store";
import { AdminDashboard } from "./admin-dashboard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const order: CommerceOrder = {
  id: "order-1", number: "PE-260922-ABC123", userId: "customer-1", status: "pending",
  subtotal: 8990, shipping: 199, discount: 500, couponCode: "SAVE500", total: 8689,
  currency: "INR", paymentMethod: "cod", createdAt: "2026-09-22T10:00:00.000Z",
  customer: { name: "Padma Buyer", email: "buyer@example.com" },
  deliveryAddress: { label: "Home", fullName: "Padma Buyer", phone: "9820081628", address1: "1 Heritage Lane", address2: "Near Museum", city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "India" },
  items: [{ variantId: "variant-1", name: "Neelambari Silk Saree", sku: "PE-1005-NAVY-FREE-SIZE", color: "Navy", size: "Free Size", price: 8990, quantity: 1 }],
};

describe("AdminDashboard orders", () => {
  it("reveals customer, delivery, item, payment, and total details for an order", async () => {
    const user = userEvent.setup();
    render(<AdminDashboard products={[]} orders={[order]} collections={[]} discounts={[]} />);

    await user.click(screen.getByRole("button", { name: "orders" }));
    await user.click(screen.getByRole("button", { name: "View order details" }));

    expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
    expect(screen.getByText("9820081628")).toBeInTheDocument();
    expect(screen.getByText(/1 Heritage Lane, Near Museum/)).toBeInTheDocument();
    expect(screen.getByText("PE-1005-NAVY-FREE-SIZE")).toBeInTheDocument();
    expect(screen.getByText("SAVE500")).toBeInTheDocument();
    expect(screen.getAllByText("₹8,689").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cash on delivery")).toBeInTheDocument();
  });
});
