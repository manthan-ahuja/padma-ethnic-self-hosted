"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { CustomerAddress } from "@/lib/customer-store";
import type { CheckoutQuote, CommerceOrder } from "@/lib/commerce-store";
import { useCommerce } from "./commerce-provider";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function CheckoutExperience() {
  const { data: session, status } = useSession();
  if (status === "loading") return <main className="checkout-page"><p>Preparing secure checkout…</p></main>;
  if (!session?.user?.id) return <main className="checkout-page"><p className="eyebrow">Checkout</p><h1>Sign in to continue</h1><p>Your account keeps your delivery addresses and order history private.</p><Link className="primary-cta" href="/account">Log in or sign up</Link></main>;
  return <AuthenticatedCheckout key={session.user.id} />;
}

function AuthenticatedCheckout() {
  const { cart, removeFromCart } = useCommerce();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [attemptKey] = useState(() => crypto.randomUUID());
  const lines = useMemo(() => cart.items.flatMap((item) => item.selection?.variantId
    ? [{ variantId: item.selection.variantId, quantity: item.quantity }]
    : []), [cart.items]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account/addresses", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load saved addresses.");
        return response.json() as Promise<{ addresses: CustomerAddress[] }>;
      })
      .then(({ addresses: next }) => {
        setAddresses(next);
        setAddressId(next.find((address) => address.isDefault)?.id ?? next[0]?.id ?? "");
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load saved addresses."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const placeOrder = async () => {
    if (!addressId || !lines.length) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, idempotencyKey: attemptKey, paymentMethod: "cod", lines, couponCode: appliedCoupon || undefined }),
      });
      const result = await response.json() as { order?: CommerceOrder; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error || "Order could not be placed.");
      setOrder(result.order);
      for (const item of cart.items) removeFromCart(item.lineId ?? item.product.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Order could not be placed.");
    } finally {
      setPending(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim() || !lines.length) { setError("Enter a coupon code."); return; }
    setApplyingCoupon(true); setError("");
    try {
      const response = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode, lines }),
      });
      const result = await response.json() as { quote?: CheckoutQuote; error?: string };
      if (!response.ok || !result.quote?.couponCode) throw new Error(result.error || "Coupon could not be applied.");
      setQuote(result.quote);
      setAppliedCoupon(result.quote.couponCode);
      setCouponCode(result.quote.couponCode);
    } catch (reason) {
      setQuote(null); setAppliedCoupon("");
      setError(reason instanceof Error ? reason.message : "Coupon could not be applied.");
    } finally { setApplyingCoupon(false); }
  };

  const saveAddress = async (form: FormData) => {
    setSavingAddress(true); setAddressError("");
    try {
      const payload = {
        label: String(form.get("label") ?? "Home"), fullName: String(form.get("fullName") ?? ""),
        phone: String(form.get("phone") ?? ""), address1: String(form.get("address1") ?? ""),
        address2: String(form.get("address2") ?? ""), city: String(form.get("city") ?? ""),
        state: String(form.get("state") ?? ""), postalCode: String(form.get("postalCode") ?? ""),
        country: "India", isDefault: addresses.length === 0 || form.get("isDefault") === "on",
      };
      const response = await fetch("/api/account/addresses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { address?: CustomerAddress; error?: string };
      if (!response.ok || !result.address) throw new Error(result.error || "Unable to save the address.");
      setAddresses((current) => [result.address!, ...current.map((address) => result.address!.isDefault ? { ...address, isDefault: false } : address)]);
      setAddressId(result.address.id); setAddingAddress(false);
    } catch (reason) {
      setAddressError(reason instanceof Error ? reason.message : "Unable to save the address.");
    } finally { setSavingAddress(false); }
  };

  if (loading) return <main className="checkout-page"><p>Preparing secure checkout…</p></main>;
  if (order) return <main className="checkout-page checkout-success"><CheckCircle2 size={44} /><p className="eyebrow">Order placed</p><h1>Thank you</h1><p>Your order <strong>{order.number}</strong> has been reserved. Pay {money.format(order.total)} by cash on delivery.</p><Link className="primary-cta" href="/account">View my orders</Link></main>;
  if (!cart.items.length) return <main className="checkout-page"><p className="eyebrow">Checkout</p><h1>Your bag is empty</h1><Link className="primary-cta" href="/collections/all">Explore the collection</Link></main>;
  if (lines.length !== cart.items.length) return <main className="checkout-page"><h1>Refresh your bag</h1><p>One or more saved items no longer has a valid local inventory variant. Remove it and add it again.</p><Link className="primary-cta" href="/cart">Return to bag</Link></main>;

  const baseShipping = cart.subtotal >= 10_000 ? 0 : 199;
  const summary = quote ?? { subtotal: cart.subtotal, shipping: baseShipping, discount: 0, total: cart.subtotal + baseShipping };
  return <main className="checkout-page">
    <header><p className="eyebrow">Secure self-hosted checkout</p><h1>Delivery &amp; payment</h1></header>
    <div className="checkout-grid">
      <section>
        <div className="checkout-section-heading"><h2>Delivery address</h2><button type="button" onClick={() => { setAddingAddress((value) => !value); setAddressError(""); }}>{addingAddress ? "Cancel" : "Add delivery address"}</button></div>
        {addingAddress && <form action={saveAddress} className="checkout-address-form">
          <label>Label<input name="label" defaultValue="Home" required /></label>
          <label>Full name<input name="fullName" autoComplete="name" required /></label>
          <label>Phone<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
          <label className="checkout-address-wide">Address line 1<input name="address1" autoComplete="address-line1" required /></label>
          <label className="checkout-address-wide">Address line 2 <span>(optional)</span><input name="address2" autoComplete="address-line2" /></label>
          <label>City<input name="city" autoComplete="address-level2" required /></label>
          <label>State<input name="state" autoComplete="address-level1" required /></label>
          <label>Postal code<input name="postalCode" inputMode="numeric" autoComplete="postal-code" required /></label>
          {addresses.length > 0 && <label className="checkout-address-default"><input name="isDefault" type="checkbox" /> Make this my default address</label>}
          {addressError && <p className="selection-message is-error checkout-address-wide" role="alert">{addressError}</p>}
          <button className="account-primary-action" type="submit" disabled={savingAddress}>{savingAddress ? "Saving address…" : "Save and use this address"}</button>
        </form>}
        {addresses.length ? <div className="checkout-addresses">{addresses.map((address) => <label key={address.id} className={addressId === address.id ? "is-selected" : ""}><input type="radio" name="address" checked={addressId === address.id} onChange={() => setAddressId(address.id)} /><strong>{address.label}</strong><span>{address.fullName}</span><span>{address.address1}{address.address2 ? `, ${address.address2}` : ""}</span><span>{address.city}, {address.state} {address.postalCode}</span><span>{address.phone}</span></label>)}</div> : !addingAddress && <div className="checkout-no-address"><p>No saved delivery address yet. Use “Add delivery address” above to continue.</p></div>}
        <h2>Payment</h2>
        <label className="checkout-payment is-selected"><input type="radio" checked readOnly /><span><strong>Cash on delivery</strong><small>Pay when your order arrives.</small></span></label>
      </section>
      <aside className="order-summary">
        <h2>Order summary</h2>
        {cart.items.map((item) => <div key={item.lineId ?? item.product.id}><span>{item.product.name} × {item.quantity}</span><strong>{money.format(item.product.price * item.quantity)}</strong></div>)}
        <div><span>Subtotal</span><strong>{money.format(summary.subtotal)}</strong></div>
        <div><span>Delivery</span><strong>{summary.shipping ? money.format(summary.shipping) : "Complimentary"}</strong></div>
        {summary.discount > 0 && <div className="checkout-discount"><span>Coupon discount</span><strong>−{money.format(summary.discount)}</strong></div>}
        <div className="checkout-coupon"><label htmlFor="checkout-coupon-code">Coupon code</label><span className="checkout-coupon-control"><input id="checkout-coupon-code" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setQuote(null); setAppliedCoupon(""); }} placeholder="WELCOME10" maxLength={40} /><button type="button" aria-label="Apply coupon" disabled={applyingCoupon || !couponCode.trim()} onClick={applyCoupon}>{applyingCoupon ? "Applying…" : "Apply"}</button></span></div>
        {appliedCoupon && quote && <p className="checkout-coupon-success" role="status">{appliedCoupon} applied</p>}
        <div className="checkout-total"><span>Total</span><strong>{money.format(summary.total)}</strong></div>
        <button className="checkout-button" type="button" disabled={!addressId || pending || applyingCoupon} onClick={placeOrder}>{pending ? "Placing order…" : "Place cash on delivery order"}</button>
        {error && <p className="selection-message is-error" role="alert">{error}</p>}
        <p className="integration-note"><ShieldCheck size={16} /> Prices, coupons, and stock are revalidated by the Padma backend before the order is created.</p>
      </aside>
    </div>
  </main>;
}
