"use client";

import Image from "next/image";
import { Check, Heart, Maximize2, Minus, Plus, RotateCcw, Share2, ShieldCheck, Truck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { useCommerce } from "./commerce-provider";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function ProductDetail({ product }: { product: Product }) {
  const { addToCart, wishlist, toggleWishlist, rememberProduct } = useCommerce();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes.length === 1 ? product.sizes[0] : "");
  const [quantity, setQuantity] = useState(1);
  const [selectionError, setSelectionError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [zoomOpen, setZoomOpen] = useState(false);
  const [pincode, setPincode] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const galleryButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const selectedImage = product.gallery[activeImage];
  const displayColors = product.colors.filter((color) => color.toLowerCase() !== "default");
  const liked = wishlist.includes(product.id);
  const selectedVariant = product.variants?.find((variant) =>
    (!variant.color || variant.color === selectedColor) && (!variant.size || variant.size === selectedSize),
  );
  const currentPrice = selectedVariant?.price ?? product.price;

  useEffect(() => { rememberProduct(product.id); }, [product.id, rememberProduct]);

  useEffect(() => {
    if (!zoomOpen) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = galleryButtonRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    lightboxCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [zoomOpen]);

  const addConfiguredProduct = () => {
    if (!selectedSize) {
      setSelectionError("Please choose a size before adding this piece.");
      setConfirmation("");
      return;
    }
    if (product.variants?.length && (!selectedVariant || !selectedVariant.availableForSale)) {
      setSelectionError("This size and colour combination is currently unavailable.");
      setConfirmation("");
      return;
    }
    addToCart({ ...product, price: currentPrice }, { color: selectedColor, size: selectedSize, variantId: selectedVariant?.id }, quantity);
    setSelectionError("");
    const options = [selectedColor.toLowerCase() === "default" ? "" : selectedColor, selectedSize].filter(Boolean).join(", ");
    setConfirmation(`Added ${quantity} × ${product.name}${options ? ` in ${options}` : ""} to your bag.`);
  };

  const checkDelivery = () => {
    if (!/^\d{6}$/.test(pincode)) {
      setDeliveryError("Please enter a valid 6-digit pincode.");
      setDeliveryMessage("");
      return;
    }
    setDeliveryError("");
    setDeliveryMessage("Your exact delivery date, serviceability and COD eligibility will be confirmed at checkout.");
  };

  const shareProduct = async () => {
    const data = { title: product.name, text: product.description, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setSelectionError("");
        setConfirmation("Product link copied.");
      } else {
        setSelectionError("Sharing is not available in this browser.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSelectionError("The product link could not be shared. Please try again.");
    }
  };

  return <>
    <main className="product-detail" aria-labelledby="product-title">
      <section className={`product-gallery ${product.gallery.length === 1 ? "single-image" : ""}`} aria-label={`${product.name} image gallery`}>
        {product.gallery.length > 1 && <div className="product-gallery-thumbnails">{product.gallery.map((image, index) => <button type="button" key={`${image.src}-${index}`} className={activeImage === index ? "is-active" : ""} onClick={() => setActiveImage(index)} aria-label={`View product image ${index + 1}`} aria-pressed={activeImage === index}><Image src={image.src} alt="" fill sizes="88px" style={{ objectPosition: image.position }} /></button>)}</div>}
        <button ref={galleryButtonRef} type="button" className="product-gallery-main" onClick={() => setZoomOpen(true)} aria-label={`Open full-screen view of ${product.name}`}>
          <Image key={selectedImage.src} src={selectedImage.src} alt={selectedImage.alt} fill loading="eager" fetchPriority="high" sizes="(max-width: 860px) 100vw, 58vw" style={{ objectPosition: selectedImage.position }} className="product-gallery-image" />
          <span className="zoom-cue"><Maximize2 size={16} /> View full screen</span>
        </button>
      </section>

      <section className="product-detail-copy">
        <div className="product-title-line"><p className="product-detail-category">{product.category}</p><button type="button" onClick={shareProduct} aria-label="Share product"><Share2 size={17} /></button></div>
        <h1 id="product-title">{product.name}</h1>
        <div className="product-detail-price"><span>{money.format(currentPrice)}</span>{product.originalPrice && product.originalPrice > currentPrice && <del>{money.format(product.originalPrice)}</del>}<small>Inclusive of taxes</small></div>
        <p className="product-detail-description">{product.description}</p>
        <div className="product-facts"><div><span>Material</span><strong>{product.material}</strong></div><div><span>Estimated delivery</span><strong>{product.deliveryEstimate}</strong></div></div>
        <div className="fit-note"><div><span>Fit</span><strong>{product.fit ?? (product.category === "Sarees" ? "Classic drape · unstitched" : "Regular, easy silhouette")}</strong></div><div><span>Model note</span><strong>{product.modelInfo ?? "Model measurements will be added with final campaign photography."}</strong></div></div>

        {displayColors.length > 0 && <fieldset className="product-options colour-options"><legend>Colour <span>{selectedColor}</span></legend><div className="product-option-row">{displayColors.map((color) => <label key={color} className={selectedColor === color ? "is-selected" : ""}><input type="radio" name="colour" value={color} checked={selectedColor === color} onChange={() => setSelectedColor(color)} /><span className={`detail-swatch swatch-${color.toLowerCase().replaceAll(" ", "-")}`} />{color}</label>)}</div></fieldset>}
        <fieldset className="product-options size-options"><legend>Choose size {product.sizes.length > 1 && <a href="#size-guide">Size guide</a>}</legend><div className="product-option-row">{product.sizes.map((size) => <label key={size} className={selectedSize === size ? "is-selected" : ""}><input type="radio" name="size" value={size} checked={selectedSize === size} onChange={() => { setSelectedSize(size); setSelectionError(""); }} />{size}</label>)}</div></fieldset>
        {selectionError && <p className="selection-message is-error" role="alert">{selectionError}</p>}
        {confirmation && <p className="selection-message is-success" role="status">{confirmation}</p>}
        <div className="product-purchase-row"><div className="detail-quantity" aria-label="Quantity selector"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={15} /></button><span aria-live="polite">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(5, value + 1))} aria-label="Increase quantity"><Plus size={15} /></button></div><button type="button" className="product-add-button" onClick={addConfiguredProduct}>Add to bag</button><button type="button" className={`product-wishlist-button ${liked ? "is-liked" : ""}`} onClick={() => toggleWishlist(product.id)} aria-label={`${liked ? "Remove" : "Add"} ${product.name} ${liked ? "from" : "to"} wishlist`} aria-pressed={liked}><Heart size={20} fill={liked ? "currentColor" : "none"} /></button></div>

        <div className="delivery-checker"><label htmlFor="delivery-pincode">Delivery pincode</label><div><input id="delivery-pincode" inputMode="numeric" maxLength={6} value={pincode} onChange={(event) => { setPincode(event.target.value.replace(/\D/g, "")); setDeliveryError(""); setDeliveryMessage(""); }} placeholder="6-digit pincode" /><button type="button" onClick={checkDelivery}>Check delivery</button></div>{deliveryError && <p role="alert">{deliveryError}</p>}{deliveryMessage && <p role="status"><Check size={14} /> {deliveryMessage}</p>}</div>
        <div className="purchase-assurances"><span><Truck size={18} /><strong>Complimentary delivery</strong> across India</span><span><RotateCcw size={18} /><strong>Easy 7-day returns</strong> on eligible pieces</span><span><ShieldCheck size={18} /><strong>Secure checkout</strong> powered by Padma</span></div>
        <div className="product-information">{product.features.length > 0 && <details open><summary>Features <Plus size={16} /></summary><ul>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></details>}<details><summary>Fit &amp; measurements <Plus size={16} /></summary><p>{product.measurements ?? "Detailed garment measurements will be published alongside the final production size chart."}</p></details><details><summary>Material &amp; care <Plus size={16} /></summary><p>{product.care}</p></details><details><summary>What&apos;s included <Plus size={16} /></summary><p>{product.included}</p></details><details><summary>Craft &amp; product details <Plus size={16} /></summary><p>{product.origin}</p><p>Product code: {product.sku}</p></details></div>
      </section>
    </main>
    <div className="mobile-purchase-bar"><div><strong>{product.name}</strong><span>{money.format(currentPrice)}</span></div><button type="button" aria-label="Add to bag from sticky bar" onClick={addConfiguredProduct}>Add to bag</button></div>
    {zoomOpen && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} full-screen gallery`}><button ref={lightboxCloseRef} type="button" onClick={() => setZoomOpen(false)} aria-label="Close full-screen gallery"><X /></button><div><Image src={selectedImage.src} alt={selectedImage.alt} fill sizes="100vw" style={{ objectPosition: selectedImage.position }} /></div><p>{activeImage + 1} / {product.gallery.length}</p></div>}
  </>;
}
