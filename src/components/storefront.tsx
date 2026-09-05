"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Heart,

  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterProducts, type CatalogCategory } from "@/lib/catalog";
import { MAX_CART_QUANTITY } from "@/lib/cart";
import type { Product } from "@/lib/types";
import { useCommerce } from "@/components/commerce-provider";

const categories: CatalogCategory[] = [
  "All",
  "Sarees",
  "Kurta Sets",
  "Lehengas",
  "Co-ords",
];

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function BrandMark() {
  return (
    <a className="brand" href="#top">
      <Image
        className="brand-lotus"
        src="/brand/padma-lotus.png"
        alt=""
        width={44}
        height={32}
        sizes="44px"
      />
      <span className="brand-name">PADMA</span>
      <span className="brand-tag">ETHNIC WEAR</span>
    </a>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useCommerce();
  const liked = wishlist.includes(product.id);
  const displayColors = product.colors.filter((color) => color.toLowerCase() !== "default");

  return (
    <article className="product-card">
      <div className="product-visual">
        <Link
          className="product-image-link"
          href={`/products/${product.id}`}
          aria-label={`View ${product.name}`}
        >
          <Image
            src={product.image}
            alt={`${product.name}${displayColors.length ? ` in ${displayColors.join(" and ")}` : ""}`}
            fill
            sizes="(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 25vw"
            style={{ objectPosition: product.imagePosition }}
            className="product-image product-image-primary"
          />
          {product.hoverImage !== product.image && <Image
            src={product.hoverImage}
            alt=""
            fill
            sizes="(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 25vw"
            className="product-image product-image-hover"
          />}
        </Link>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button
          className={`heart-button${liked ? " is-liked" : ""}`}
          type="button"
          aria-label={`${liked ? "Remove" : "Add"} ${product.name} ${liked ? "from" : "to"} wishlist`}
          aria-pressed={liked}
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
        <Link
          className="quick-add"
          href={`/products/${product.id}`}
          aria-label={`Choose options for ${product.name}`}
        >
          Choose options <Plus size={16} />
        </Link>
      </div>
      <div className="product-copy">
        <div>
          <p className="product-category">{product.category}</p>
          <h3>{product.name}</h3>
        </div>
        <div className="price-row">
          <span>{money.format(product.price)}</span>
          {product.originalPrice && (
            <del>{money.format(product.originalPrice)}</del>
          )}
        </div>
        <p className="product-description">{product.description}</p>
        {displayColors.length > 0 && <div className="swatches" aria-label={`Available colours: ${displayColors.join(", ")}`}>
          {displayColors.map((color) => (
            <span key={color} title={color} className={`swatch swatch-${color.toLowerCase().replaceAll(" ", "-")}`} />
          ))}
          <span className="color-count">{displayColors.length} {displayColors.length === 1 ? "colour" : "colours"}</span>
        </div>}
      </div>
    </article>
  );
}

export function Storefront({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<CatalogCategory>("All");
  const { cart, setQuantity, removeFromCart } = useCommerce();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const bagButtonRef = useRef<HTMLButtonElement>(null);
  const cartCloseRef = useRef<HTMLButtonElement>(null);
  const visibleProducts = useMemo(
    () => filterProducts(products, category),
    [category, products],
  );

  useEffect(() => {
    if (!cartOpen && !menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = cartOpen ? bagButtonRef.current : menuButtonRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCartOpen(false);
      setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    (cartOpen ? cartCloseRef.current : menuCloseRef.current)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [cartOpen, menuOpen]);


  return (
    <div id="top">
      <div className="announcement">
        <span>Complimentary shipping across India</span>
        <span className="announcement-separator">✦</span>
        <span>Easy 7-day returns</span>
      </div>

      <header className="site-header">
        <button
          ref={menuButtonRef}
          className="icon-button mobile-only"
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <Menu size={21} />
        </button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/collections/new-arrivals">New</Link>
          <Link href="/collections/all">Shop</Link>
          <Link href="/our-craft">Our craft</Link>
        </nav>
        <BrandMark />
        <div className="header-actions">
          <Link className="icon-button search-button" href="/search" aria-label="Search">
            <Search size={20} />
          </Link>
          <button
            ref={bagButtonRef}
            className="bag-button"
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open shopping bag with ${cart.itemCount} items`}
          >
            <ShoppingBag size={20} />
            <span>Bag</span>
            <strong>{cart.itemCount}</strong>
          </button>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow light">The Utsav Edit · 2026</p>
            <h1 id="hero-title">Tradition,<br /><em>beautifully</em> alive.</h1>
            <p className="hero-intro">
              Contemporary heirlooms crafted for the many ways India celebrates.
              Made slowly. Worn joyfully.
            </p>
            <a className="primary-cta light-cta" href="#collection">
              Explore the collection <ArrowRight size={17} />
            </a>
          </div>
          <div className="hero-image-wrap">
            <Image
              src="/images/padma-hero.webp"
              alt="Model wearing a rich purple saree with a gold woven border"
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 800px) 100vw, 53vw"
              className="hero-image"
            />
            <div className="hero-note">
              <span>01</span>
              <p>Woven stories<br />for modern rituals</p>
            </div>
          </div>
          <a className="scroll-cue" href="#new">
            <span>Discover</span><span className="scroll-line" />
          </a>
        </section>

        <section className="category-showcase" id="new" aria-labelledby="category-title">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Shop by mood</p>
              <h2 id="category-title">Made for every<br /><em>kind of occasion.</em></h2>
            </div>
            <p className="heading-aside">
              From intimate haldi mornings to grand wedding nights—find a silhouette
              that feels unmistakably you.
            </p>
          </div>
          <div className="category-grid">
            <Link className="category-tile category-large" href="/collections/sarees">
              <Image src="/images/padma-ivory.jpg" alt="Blue silk saree" fill sizes="(max-width: 720px) 100vw, 50vw" />
              <span className="image-scrim" />
              <span className="category-number">01</span>
              <span className="category-label">Sarees <ArrowRight size={18} /></span>
            </Link>
            <Link className="category-tile" href="/collections/kurta-sets">
              <Image src="/images/padma-sage.jpg" alt="Green embroidered kurta set" fill sizes="(max-width: 720px) 100vw, 25vw" />
              <span className="image-scrim" />
              <span className="category-number">02</span>
              <span className="category-label">Kurta sets <ArrowRight size={18} /></span>
            </Link>
            <Link className="category-tile" href="/collections/festive-wear">
              <Image src="/images/padma-rose.jpg" alt="Marigold embroidered festive dress" fill sizes="(max-width: 720px) 100vw, 25vw" />
              <span className="image-scrim" />
              <span className="category-number">03</span>
              <span className="category-label">Celebration <ArrowRight size={18} /></span>
            </Link>
          </div>
        </section>

        <section className="collection-section" id="collection" aria-labelledby="collection-title">
          <div className="collection-topline">
            <div>
              <p className="eyebrow">The collection</p>
              <h2 id="collection-title">New heirlooms</h2>
            </div>
            <p>{visibleProducts.length} pieces</p>
          </div>
          <div className="filter-row" role="group" aria-label="Filter products by category">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "is-active" : ""}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="home-edits" aria-labelledby="home-edits-title">
          <div className="section-heading split-heading"><div><p className="eyebrow">Curated paths</p><h2 id="home-edits-title">Begin with<br /><em>the feeling.</em></h2></div><p className="heading-aside">Shop by occasion, price or the chapter that feels closest to your calendar.</p></div>
          <div className="home-edit-grid">
            <Link href="/collections/new-arrivals"><span>Just in</span><h3>New arrivals</h3><p>Fresh additions to the Padma wardrobe.</p><ArrowRight size={18} /></Link>
            <Link href="/collections/bestsellers"><span>Signature</span><h3>Padma favourites</h3><p>The silhouettes that define our opening edit.</p><ArrowRight size={18} /></Link>
            <Link href="/collections/festive-wear"><span>By occasion</span><h3>Festive gatherings</h3><p>Colour and ease for the moments shared together.</p><ArrowRight size={18} /></Link>
            <Link href="/collections/wedding-edit"><span>The invitation</span><h3>Wedding edit</h3><p>From ceremony mornings to evening celebrations.</p><ArrowRight size={18} /></Link>
          </div>
          <div className="shop-by-price"><p>Shop by price</p><div><Link href="/collections/all?price=under-10000">Under ₹10,000</Link><Link href="/collections/all?price=10000-15000">₹10,000–₹15,000</Link><Link href="/collections/all?price=over-15000">Above ₹15,000</Link></div></div>
        </section>

        <section className="wedding-campaign" aria-labelledby="wedding-title"><div><Image src="/images/padma-rose.jpg" alt="Padma wedding edit in marigold and rose tones" fill sizes="(max-width: 800px) 100vw, 55vw" /></div><div><p className="eyebrow light">The wedding edit</p><h2 id="wedding-title">For every ritual,<br /><em>and every dance.</em></h2><p>Discover expressive sarees, fluid lehengas and modern sets designed to move through the whole celebration.</p><Link className="primary-cta light-cta" href="/collections/wedding-edit">Enter the edit <ArrowRight size={16} /></Link></div></section>

        <section className="home-trust-strip" aria-label="Shopping assurances"><div><strong>Complimentary delivery</strong><span>Across India</span></div><div><strong>7-day returns</strong><span>On eligible pieces</span></div><div><strong>Personal assistance</strong><span>Chat with Padma on WhatsApp</span></div><a href="https://wa.me/919820081628" target="_blank" rel="noreferrer">Start a conversation <ArrowRight size={14} /></a></section>

        <section className="craft-story" id="story" aria-labelledby="craft-title">
          <div className="craft-image">
            <Image src="/images/padma-sage.jpg" alt="Artisan-inspired embroidered festive wear" fill sizes="(max-width: 800px) 100vw, 50vw" />
          </div>
          <div className="craft-copy">
            <Sparkles size={24} strokeWidth={1.25} aria-hidden="true" />
            <p className="eyebrow">The Padma promise</p>
            <h2 id="craft-title">Rooted in detail.<br /><em>Made for now.</em></h2>
            <p>We are shaping a wardrobe around considered material, versatile silhouettes and product descriptions that distinguish verified fact from creative direction.</p>
            <Link className="text-link" href="/our-craft">Discover our process <ArrowRight size={16} /></Link>
            <div className="craft-values">
              <span><strong>Clear</strong> specific product notes</span>
              <span><strong>Honest</strong> verified origin details</span>
              <span><strong>Useful</strong> care and fit guidance</span>
            </div>
          </div>
        </section>

        <section className="founder-note"><Image src="/brand/padma-lotus.png" alt="" width={68} height={48} /><p className="eyebrow">From the house of Padma</p><blockquote>“We are building a wardrobe that respects memory without asking you to dress like the past.”</blockquote><Link href="/about" className="text-link">Read our story <ArrowRight size={15} /></Link></section>

        <section className="community-preview"><div><p className="eyebrow">The Padma community</p><h2>Stories, not borrowed praise.</h2><p>Verified reviews and customer photographs will appear here only after real orders are fulfilled. Until then, we will not invent testimonials or press mentions.</p></div><div className="community-images">{["/images/padma-ivory.jpg", "/images/padma-rose.jpg", "/images/padma-sage.jpg"].map((src, index) => <span key={src}><Image src={src} alt="" fill sizes="(max-width: 700px) 33vw, 18vw" /><b>0{index + 1}</b></span>)}</div><small>The live Instagram feed will connect when Padma&apos;s official account is supplied.</small></section>

        <section className="newsletter" aria-labelledby="newsletter-title">
          <p className="eyebrow light">Letters from Padma</p>
          <h2 id="newsletter-title">A little beauty,<br /><em>delivered slowly.</em></h2>
          <p>New collections, craft stories and private previews—never too often.</p>
          <form className="newsletter-form" onSubmit={(event) => { event.preventDefault(); setNewsletterStatus("Thank you. Live email signup will activate with the marketing platform."); }}>
            <label className="sr-only" htmlFor="email">Email address</label>
            <input id="email" type="email" placeholder="Your email address" required />
            <button type="submit" aria-label="Subscribe to Padma letters"><ArrowRight size={20} /></button>
          </form>
          {newsletterStatus && <p className="newsletter-status" role="status">{newsletterStatus}</p>}
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand-block">
            <a href="#top" aria-label="Padma Ethnic Wear home">
              <Image
                className="footer-logo"
                src="/brand/padma-logo-transparent.png"
                alt="Padma Ethnic Wear — Est. 2026"
                width={196}
                height={192}
                sizes="196px"
              />
            </a>
            <p>Contemporary Indian wear,<br />made with intention.</p>
          </div>
          <div className="footer-links"><strong>Shop</strong><Link href="/collections/new-arrivals">New arrivals</Link><Link href="/collections/sarees">Sarees</Link><Link href="/collections/kurta-sets">Kurta sets</Link><Link href="/collections/lehengas">Lehengas</Link></div>
          <div className="footer-links"><strong>Discover</strong><Link href="/about">About Padma</Link><Link href="/our-craft">Our craft</Link><Link href="/lookbook">Lookbook</Link><Link href="/journal">Journal</Link></div>
          <div className="footer-links"><strong>Help</strong><Link href="/cart">Shopping bag</Link><Link href="/wishlist">Wishlist</Link><Link href="/search">Search</Link></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Padma Ethnic</span><span>India · INR</span><span>Privacy · Terms</span></div>
      </footer>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="mobile-menu-top"><BrandMark /><button ref={menuCloseRef} className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
          <nav><Link href="/collections/new-arrivals" onClick={() => setMenuOpen(false)}>New arrivals</Link><Link href="/collections/sarees" onClick={() => setMenuOpen(false)}>Sarees</Link><Link href="/collections/kurta-sets" onClick={() => setMenuOpen(false)}>Kurta sets</Link><Link href="/collections/lehengas" onClick={() => setMenuOpen(false)}>Lehengas</Link><Link href="/our-craft" onClick={() => setMenuOpen(false)}>Our craft</Link></nav>
          <p>Complimentary shipping across India</p>
        </div>
      )}

      {cartOpen && (
        <div className="drawer-layer">
          <button className="drawer-backdrop" onClick={() => setCartOpen(false)} aria-label="Close shopping bag" />
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your shopping bag">
            <div className="drawer-heading"><div><p className="eyebrow">Your selection</p><h2>Shopping bag <span>({cart.itemCount})</span></h2></div><button ref={cartCloseRef} className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close shopping bag"><X /></button></div>
            {cart.items.length === 0 ? (
              <div className="empty-cart"><ShoppingBag size={35} strokeWidth={1.2} /><h3>Your bag is waiting</h3><p>Explore pieces made to become part of your story.</p><button className="primary-cta" onClick={() => setCartOpen(false)}>Continue shopping</button></div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map(({ product, quantity, selection, lineId }) => {
                    const itemId = lineId ?? product.id;
                    return (
                    <article className="cart-item" key={itemId}>
                      <div className="cart-thumb"><Image src={product.image} alt="" fill sizes="100px" /></div>
                      <div className="cart-item-copy"><p>{product.category}</p><h3>{product.name}</h3>{selection && <small>{[selection.color.toLowerCase() === "default" ? "" : selection.color, selection.size].filter(Boolean).join(" · ")}</small>}<span>{money.format(product.price)}</span><div className="quantity"><button onClick={() => setQuantity(itemId, quantity - 1)} aria-label={`Decrease ${product.name} quantity`}><Minus size={13} /></button><span>{quantity}</span><button disabled={quantity >= MAX_CART_QUANTITY} onClick={() => setQuantity(itemId, quantity + 1)} aria-label={`Increase ${product.name} quantity`}><Plus size={13} /></button></div></div>
                      <button className="remove-item" onClick={() => removeFromCart(itemId)}>Remove</button>
                    </article>
                    );
                  })}
                </div>
                <div className="cart-summary"><div><span>Subtotal</span><strong>{money.format(cart.subtotal)}</strong></div><p>Taxes included. Shipping calculated at checkout.</p><Link className="checkout-button" href="/cart">Review bag <ArrowRight size={17} /></Link><small>Inventory and totals are revalidated by Shopify at checkout.</small></div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
