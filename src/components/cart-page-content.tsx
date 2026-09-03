"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { products } from "@/lib/products";
import { useCommerce } from "./commerce-provider";
import { ProductCard } from "./product-card";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const freeShippingTarget = 10000;

export function CartPageContent() {
  const { cart, setQuantity, removeFromCart } = useCommerce();
  const remaining = Math.max(0, freeShippingTarget - cart.subtotal);
  const recommendation = products.find((product) => !cart.items.some((item) => item.product.id === product.id));
  return <main className="full-cart-page">
    <header className="cart-page-title"><p className="eyebrow">Your selection</p><h1>Shopping bag <span>({cart.itemCount})</span></h1></header>
    {cart.items.length === 0 ? <div className="cart-empty-page"><h2>Your bag is waiting</h2><p>Discover pieces designed for celebrations and every day between them.</p><Link className="primary-cta" href="/collections/all">Explore the collection <ArrowRight size={15} /></Link></div> : <div className="cart-page-grid">
      <section className="cart-page-items" aria-label="Items in your bag">
        <div className="shipping-progress"><Truck size={18} /><div><strong>{remaining ? `${money.format(remaining)} away from complimentary delivery` : "Complimentary delivery unlocked"}</strong><span><i style={{ width: `${Math.min(100, cart.subtotal / freeShippingTarget * 100)}%` }} /></span></div></div>
        {cart.items.map((item) => { const id = item.lineId ?? item.product.id; return <article key={id} className="cart-page-item"><Link href={`/products/${item.product.id}`} className="cart-page-image"><Image src={item.product.image} alt={item.product.name} fill sizes="140px" /></Link><div><p>{item.product.category}</p><h2>{item.product.name}</h2>{item.selection && <span>{item.selection.color}{item.selection.size ? ` · ${item.selection.size}` : ""}</span>}<strong>{money.format(item.product.price)}</strong><div className="cart-page-quantity"><button onClick={() => setQuantity(id, item.quantity - 1)} aria-label={`Decrease ${item.product.name} quantity`}><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => setQuantity(id, item.quantity + 1)} aria-label={`Increase ${item.product.name} quantity`}><Plus size={14} /></button></div><button className="remove-item" onClick={() => removeFromCart(id)}>Remove</button></div></article>; })}
      </section>
      <aside className="order-summary"><p className="eyebrow">Order summary</p><div><span>Subtotal</span><strong>{money.format(cart.subtotal)}</strong></div><div><span>Delivery</span><span>Calculated at checkout</span></div><label>Discount code<input placeholder="Enter code" disabled title="Discounts connect with the commerce backend" /></label><button type="button" className="checkout-button" disabled>Checkout opens after Shopify connection <ArrowRight size={16} /></button><p className="integration-note"><ShieldCheck size={16} /> Your bag is saved on this device. Secure payment and live inventory will activate with Shopify.</p></aside>
    </div>}
    {recommendation && <section className="cart-recommendation"><p className="eyebrow">You may also love</p><h2>One more considered piece</h2><div><ProductCard product={recommendation} /></div></section>}
  </main>;
}
