"use client";

import Link from "next/link";
import { useState } from "react";
import type { CustomerAddress, CustomerAddressInput, CustomerOrder } from "@/lib/customer-store";

type AccountDashboardProps = {
  user: { name?: string | null; email?: string | null };
  cartCount: number;
  orders: CustomerOrder[];
  addresses: CustomerAddress[];
  ordersUnavailable?: boolean;
  addressesUnavailable?: boolean;
  onSaveAddress: (address: CustomerAddressInput) => Promise<void>;
  onDeleteAddress: (id: string) => Promise<void>;
  onSignOut: () => void;
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function AccountDashboard({ user, cartCount, orders, addresses, ordersUnavailable = false, addressesUnavailable = false, onSaveAddress, onDeleteAddress, onSignOut }: AccountDashboardProps) {
  const [section, setSection] = useState<"overview" | "orders" | "addresses">("overview");
  const [addingAddress, setAddingAddress] = useState(false);
  const [deletingAddress, setDeletingAddress] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function saveAddress(formData: FormData) {
    setError("");
    try {
      await onSaveAddress({
        label: String(formData.get("label") ?? "Home"),
        fullName: String(formData.get("fullName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address1: String(formData.get("address1") ?? ""),
        address2: String(formData.get("address2") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
        postalCode: String(formData.get("postalCode") ?? ""),
        country: "India",
        isDefault: formData.get("isDefault") === "on" || addresses.length === 0,
      });
      setAddingAddress(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save address");
    }
  }

  async function deleteAddress(id: string) {
    setError("");
    setDeletingAddress(id);
    try {
      await onDeleteAddress(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove address");
    } finally {
      setDeletingAddress(null);
    }
  }

  return (
    <section className="account-dashboard">
      <aside className="account-sidebar">
        <p className="eyebrow">Your account</p>
        <h1>Welcome, {user.name || "beautiful"}.</h1>
        {user.email && <p className="account-email">{user.email}</p>}
        <nav aria-label="Account sections">
          <button aria-current={section === "overview" ? "page" : undefined} onClick={() => setSection("overview")}>Overview</button>
          <button aria-current={section === "orders" ? "page" : undefined} onClick={() => setSection("orders")}>My orders</button>
          <button aria-current={section === "addresses" ? "page" : undefined} onClick={() => setSection("addresses")}>My addresses</button>
        </nav>
        <button className="account-signout" type="button" onClick={onSignOut}>Sign out</button>
      </aside>

      <div className="account-dashboard-content">
        {section === "overview" && (
          <>
            <div className="account-section-heading"><p className="eyebrow">At a glance</p><h2>Your Padma</h2></div>
            <div className="account-stat-grid">
              <article><span>Cart</span><strong>{cartCount} {cartCount === 1 ? "item" : "items"}</strong><Link href="/cart">View cart</Link></article>
              <article><span>Orders</span><strong>{ordersUnavailable ? "—" : orders.length}</strong><button onClick={() => setSection("orders")}>View orders</button></article>
              <article><span>Addresses</span><strong>{addressesUnavailable ? "—" : addresses.length}</strong><button onClick={() => setSection("addresses")}>Manage</button></article>
            </div>
          </>
        )}

        {section === "orders" && (
          <div className="account-section">
            <div className="account-section-heading"><p className="eyebrow">Purchase history</p><h2>My orders</h2></div>
            {ordersUnavailable ? (
              <div className="account-empty"><h3>Order history unavailable</h3><p>We could not load your order history. Please retry from the message above.</p></div>
            ) : orders.length === 0 ? (
              <div className="account-empty"><h3>No orders yet</h3><p>Order history will appear here when payment syncing is connected.</p><Link href="/">Explore the collection</Link></div>
            ) : orders.map((order) => (
              <article className="account-order" key={order.id}>
                <div><span>Order {order.number}</span><strong>{money.format(order.total)}</strong></div>
                <p>{new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.status}</p>
                <small>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</small>
              </article>
            ))}
          </div>
        )}

        {section === "addresses" && (
          <div className="account-section">
            <div className="account-section-heading account-section-heading-row">
              <div><p className="eyebrow">Delivery details</p><h2>My addresses</h2></div>
              <button className="account-primary-action" type="button" onClick={() => setAddingAddress((value) => !value)}>Add an address</button>
            </div>
            {addingAddress && (
              <form action={saveAddress} className="address-form">
                <label>Label<input name="label" defaultValue="Home" required /></label>
                <label>Full name<input name="fullName" autoComplete="name" required /></label>
                <label>Phone<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
                <label className="address-form-wide">Address line 1<input name="address1" autoComplete="address-line1" required /></label>
                <label className="address-form-wide">Address line 2 <span>(optional)</span><input name="address2" autoComplete="address-line2" /></label>
                <label>City<input name="city" autoComplete="address-level2" required /></label>
                <label>State<input name="state" autoComplete="address-level1" required /></label>
                <label>Postal code<input name="postalCode" inputMode="numeric" autoComplete="postal-code" required /></label>
                <label className="address-default"><input name="isDefault" type="checkbox" /> Make this my default address</label>
                {error && <p className="account-form-error address-form-wide" role="alert">{error}</p>}
                <button className="account-primary-action" type="submit">Save address</button>
              </form>
            )}
            {error && !addingAddress && <p className="account-form-error" role="alert">{error}</p>}
            <div className="address-grid">
              {addresses.map((address) => (
                <article className="address-card" key={address.id}>
                  <div><span>{address.label}</span>{address.isDefault && <em>Default</em>}</div>
                  <strong>{address.fullName}</strong>
                  <p>{address.address1}{address.address2 ? `, ${address.address2}` : ""}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country}<br />{address.phone}</p>
                  <button type="button" disabled={deletingAddress === address.id} onClick={() => void deleteAddress(address.id)}>
                    {deletingAddress === address.id ? "Removing…" : "Remove"}
                  </button>
                </article>
              ))}
              {!addingAddress && addressesUnavailable && <div className="account-empty"><h3>Addresses unavailable</h3><p>We could not load your saved addresses. Please retry from the message above.</p></div>}
              {!addingAddress && !addressesUnavailable && addresses.length === 0 && <div className="account-empty"><h3>No saved addresses</h3><p>Add an address for a faster checkout later.</p></div>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
