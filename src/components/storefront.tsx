"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Camera,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { cartReducer, initialCartState } from "@/lib/cart";
import { filterProducts, type CatalogCategory } from "@/lib/catalog";
import { products } from "@/lib/products";
import type { Product } from "@/lib/types";

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
    <a className="brand" href="#top" aria-label="Padma Ethnic Wear home">
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

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  const [liked, setLiked] = useState(false);

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
            alt={`${product.name} in ${product.colors.join(" and ")}`}
            fill
            sizes="(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 25vw"
            style={{ objectPosition: product.imagePosition }}
            className="product-image product-image-primary"
          />
          <Image
            src={product.hoverImage}
            alt=""
            fill
            sizes="(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 25vw"
            className="product-image product-image-hover"
          />
        </Link>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button
          className={`heart-button${liked ? " is-liked" : ""}`}
          type="button"
          aria-label={`${liked ? "Remove" : "Add"} ${product.name} ${liked ? "from" : "to"} wishlist`}
          aria-pressed={liked}
          onClick={() => setLiked((value) => !value)}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
        <button
          className="quick-add"
          type="button"
          onClick={() => onAdd(product)}
          aria-label={`Add ${product.name} to bag`}
        >
          Add to bag <Plus size={16} />
        </button>
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
        <div className="swatches" aria-label={`Available colours: ${product.colors.join(", ")}`}>
          {product.colors.map((color) => (
            <span key={color} title={color} className={`swatch swatch-${color.toLowerCase().replaceAll(" ", "-")}`} />
          ))}
          <span className="color-count">{product.colors.length} colours</span>
        </div>
      </div>
    </article>
  );
}

export function Storefront() {
  const [category, setCategory] = useState<CatalogCategory>("All");
  const [cart, dispatch] = useReducer(cartReducer, initialCartState);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleProducts = useMemo(
    () => filterProducts(products, category),
    [category],
  );

  useEffect(() => {
    document.body.style.overflow = cartOpen || menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, menuOpen]);

  const addToCart = (product: Product) => {
    dispatch({ type: "add", product });
    setCartOpen(true);
  };

  return (
    <div id="top">
      <div className="announcement">
        <span>Complimentary shipping across India</span>
        <span className="announcement-separator">✦</span>
        <span>Easy 7-day returns</span>
      </div>

      <header className="site-header">
        <button
          className="icon-button mobile-only"
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#new">New</a>
          <a href="#collection">Shop</a>
          <a href="#story">Our craft</a>
        </nav>
        <BrandMark />
        <div className="header-actions">
          <button className="icon-button search-button" type="button" aria-label="Search">
            <Search size={20} />
          </button>
          <button
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
              unoptimized
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
          <a className="scroll-cue" href="#new" aria-label="Scroll to new arrivals">
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
            <a className="category-tile category-large" href="#collection" onClick={() => setCategory("Sarees")}>
              <Image src="/images/padma-ivory.jpg" alt="Blue silk saree" fill sizes="(max-width: 720px) 100vw, 50vw" />
              <span className="image-scrim" />
              <span className="category-number">01</span>
              <span className="category-label">Sarees <ArrowRight size={18} /></span>
            </a>
            <a className="category-tile" href="#collection" onClick={() => setCategory("Kurta Sets")}>
              <Image src="/images/padma-sage.jpg" alt="Green embroidered kurta set" fill sizes="(max-width: 720px) 100vw, 25vw" />
              <span className="image-scrim" />
              <span className="category-number">02</span>
              <span className="category-label">Kurta sets <ArrowRight size={18} /></span>
            </a>
            <a className="category-tile" href="#collection" onClick={() => setCategory("Lehengas")}>
              <Image src="/images/padma-rose.jpg" alt="Marigold embroidered festive dress" fill sizes="(max-width: 720px) 100vw, 25vw" />
              <span className="image-scrim" />
              <span className="category-number">03</span>
              <span className="category-label">Celebration <ArrowRight size={18} /></span>
            </a>
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
              <ProductCard key={product.id} product={product} onAdd={addToCart} />
            ))}
          </div>
        </section>

        <section className="craft-story" id="story" aria-labelledby="craft-title">
          <div className="craft-image">
            <Image src="/images/padma-sage.jpg" alt="Artisan-inspired embroidered festive wear" fill sizes="(max-width: 800px) 100vw, 50vw" />
          </div>
          <div className="craft-copy">
            <Sparkles size={24} strokeWidth={1.25} aria-hidden="true" />
            <p className="eyebrow">The Padma promise</p>
            <h2 id="craft-title">Rooted in craft.<br /><em>Made for now.</em></h2>
            <p>
              We partner with skilled makers across India to celebrate time-honoured
              techniques through lighter, versatile silhouettes. Every Padma piece
              carries the human touch—small variations that make it entirely yours.
            </p>
            <a className="text-link" href="#collection">Discover our process <ArrowRight size={16} /></a>
            <div className="craft-values">
              <span><strong>Small</strong> thoughtful batches</span>
              <span><strong>Made</strong> across India</span>
              <span><strong>Natural</strong> rich textiles</span>
            </div>
          </div>
        </section>

        <section className="newsletter" aria-labelledby="newsletter-title">
          <p className="eyebrow light">Letters from Padma</p>
          <h2 id="newsletter-title">A little beauty,<br /><em>delivered slowly.</em></h2>
          <p>New collections, craft stories and private previews—never too often.</p>
          <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="email">Email address</label>
            <input id="email" type="email" placeholder="Your email address" required />
            <button type="submit" aria-label="Subscribe to Padma letters"><ArrowRight size={20} /></button>
          </form>
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
          <div className="footer-links"><strong>Shop</strong><a href="#new">New arrivals</a><a href="#collection">Sarees</a><a href="#collection">Kurta sets</a><a href="#collection">Lehengas</a></div>
          <div className="footer-links"><strong>Help</strong><a href="#">Shipping</a><a href="#">Returns</a><a href="#">Size guide</a><a href="#">Contact us</a></div>
          <div className="footer-links"><strong>Follow</strong><a href="#"><Camera size={15} /> Instagram</a><a href="#">Pinterest</a></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Padma Ethnic</span><span>India · INR</span><span>Privacy · Terms</span></div>
      </footer>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="mobile-menu-top"><BrandMark /><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
          <nav><a href="#new" onClick={() => setMenuOpen(false)}>New arrivals</a><a href="#collection" onClick={() => setMenuOpen(false)}>Sarees</a><a href="#collection" onClick={() => setMenuOpen(false)}>Kurta sets</a><a href="#collection" onClick={() => setMenuOpen(false)}>Lehengas</a><a href="#story" onClick={() => setMenuOpen(false)}>Our craft</a></nav>
          <p>Complimentary shipping across India</p>
        </div>
      )}

      {cartOpen && (
        <div className="drawer-layer">
          <button className="drawer-backdrop" onClick={() => setCartOpen(false)} aria-label="Close shopping bag" />
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your shopping bag">
            <div className="drawer-heading"><div><p className="eyebrow">Your selection</p><h2>Shopping bag <span>({cart.itemCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close shopping bag"><X /></button></div>
            {cart.items.length === 0 ? (
              <div className="empty-cart"><ShoppingBag size={35} strokeWidth={1.2} /><h3>Your bag is waiting</h3><p>Explore pieces made to become part of your story.</p><button className="primary-cta" onClick={() => setCartOpen(false)}>Continue shopping</button></div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map(({ product, quantity }) => (
                    <article className="cart-item" key={product.id}>
                      <div className="cart-thumb"><Image src={product.image} alt="" fill sizes="100px" /></div>
                      <div className="cart-item-copy"><p>{product.category}</p><h3>{product.name}</h3><span>{money.format(product.price)}</span><div className="quantity"><button onClick={() => dispatch({ type: "setQuantity", productId: product.id, quantity: quantity - 1 })} aria-label={`Decrease ${product.name} quantity`}><Minus size={13} /></button><span>{quantity}</span><button onClick={() => dispatch({ type: "setQuantity", productId: product.id, quantity: quantity + 1 })} aria-label={`Increase ${product.name} quantity`}><Plus size={13} /></button></div></div>
                      <button className="remove-item" onClick={() => dispatch({ type: "remove", productId: product.id })}>Remove</button>
                    </article>
                  ))}
                </div>
                <div className="cart-summary"><div><span>Subtotal</span><strong>{money.format(cart.subtotal)}</strong></div><p>Taxes included. Shipping calculated at checkout.</p><button className="checkout-button">Proceed to checkout <ArrowRight size={17} /></button><small>Cashfree secure checkout will be connected in the backend phase.</small></div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
