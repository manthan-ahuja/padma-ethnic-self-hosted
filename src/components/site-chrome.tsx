"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCommerce } from "./commerce-provider";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { cart, wishlist } = useCommerce();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = menuButtonRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [open]);

  const links = [
    ["New arrivals", "/collections/new-arrivals"],
    ["Sarees", "/collections/sarees"],
    ["Kurta sets", "/collections/kurta-sets"],
    ["Lehengas", "/collections/lehengas"],
    ["Our craft", "/our-craft"],
  ];
  return <>
    <div className="detail-announcement"><span>Complimentary shipping across India</span><span>✦</span><span>Easy 7-day returns on eligible pieces</span></div>
    <header className="global-header">
      <button ref={menuButtonRef} className="global-menu" type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Menu size={20} /></button>
      <nav className="global-nav" aria-label="Main navigation">{links.slice(0, 3).map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <Link href="/" className="detail-brand" aria-label="Padma Ethnic Wear home">
        <Image src="/brand/padma-lotus.png" alt="" width={42} height={30} sizes="42px" />
        <span>PADMA</span><small>ETHNIC WEAR</small>
      </Link>
      <div className="global-actions">
        <Link href="/account" aria-label="Account"><UserRound size={19} /></Link>
        <Link href="/search" aria-label="Search"><Search size={19} /></Link>
        <Link href="/wishlist" aria-label={`Wishlist with ${wishlist.length} items`}><Heart size={19} /><b>{wishlist.length}</b></Link>
        <Link href="/cart" aria-label={`Shopping bag with ${cart.itemCount} items`}><ShoppingBag size={19} /><b>{cart.itemCount}</b></Link>
      </div>
    </header>
    {open && <div className="global-mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
      <nav>{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}</nav>
      <Link href="/about" onClick={() => setOpen(false)}>About Padma</Link>
    </div>}
  </>;
}

export function SiteFooter() {
  return <footer className="footer global-footer">
    <div className="footer-main">
      <div className="footer-brand-block"><Link href="/" aria-label="Padma Ethnic Wear home"><Image className="footer-logo" src="/brand/padma-logo-transparent.png" alt="Padma Ethnic Wear, Est. 2026" width={196} height={192} /></Link><p>Contemporary Indian wear,<br />made with intention.</p></div>
      <div className="footer-links"><strong>Shop</strong><Link href="/collections/new-arrivals">New arrivals</Link><Link href="/collections/sarees">Sarees</Link><Link href="/collections/kurta-sets">Kurta sets</Link><Link href="/collections/lehengas">Lehengas</Link></div>
      <div className="footer-links"><strong>Discover</strong><Link href="/about">About Padma</Link><Link href="/our-craft">Our craft</Link><Link href="/lookbook">Lookbook</Link><Link href="/journal">Journal</Link></div>
      <div className="footer-links"><strong>Help</strong><Link href="/search">Search</Link><Link href="/wishlist">Wishlist</Link><Link href="/cart">Shopping bag</Link><span>Support and policy pages follow in the commerce phase.</span></div>
    </div>
    <div className="footer-bottom"><span>© 2026 Padma Ethnic</span><span>India · INR</span><span>Contemporary Indian wear</span></div>
  </footer>;
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="inner-page-shell"><SiteHeader />{children}<SiteFooter /></div>;
}
