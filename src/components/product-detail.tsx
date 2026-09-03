"use client";

import Image from "next/image";
import { Heart, Minus, Plus, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function ProductDetail({ product }: { product: Product }) {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectionError, setSelectionError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const selectedImage = product.gallery[activeImage];

  const addConfiguredProduct = () => {
    if (!selectedSize) {
      setSelectionError("Please choose a size before adding this piece.");
      setConfirmation("");
      return;
    }
    setSelectionError("");
    setConfirmation(
      `Added ${quantity} × ${product.name} in ${selectedColor}, ${selectedSize} to your bag.`,
    );
  };

  return (
    <main className="product-detail" aria-labelledby="product-title">
      <section className="product-gallery" aria-label={`${product.name} image gallery`}>
        <div className="product-gallery-thumbnails">
          {product.gallery.map((image, index) => (
            <button
              type="button"
              key={`${image.src}-${index}`}
              className={activeImage === index ? "is-active" : ""}
              onClick={() => setActiveImage(index)}
              aria-label={`View product image ${index + 1}`}
              aria-pressed={activeImage === index}
            >
              <Image src={image.src} alt="" fill sizes="88px" style={{ objectPosition: image.position }} />
            </button>
          ))}
        </div>
        <div className="product-gallery-main">
          <Image
            key={selectedImage.src}
            src={selectedImage.src}
            alt={selectedImage.alt}
            fill
            unoptimized
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 860px) 100vw, 58vw"
            style={{ objectPosition: selectedImage.position }}
            className="product-gallery-image"
          />
        </div>
      </section>

      <section className="product-detail-copy">
        <p className="product-detail-category">{product.category}</p>
        <h1 id="product-title">{product.name}</h1>
        <div className="product-detail-price">
          <span>{money.format(product.price)}</span>
          {product.originalPrice && <del>{money.format(product.originalPrice)}</del>}
        </div>
        <p className="product-detail-description">{product.description}</p>

        <div className="product-facts">
          <div>
            <span>Material</span>
            <strong>{product.material}</strong>
          </div>
          <div>
            <span>Estimated delivery</span>
            <strong>{product.deliveryEstimate}</strong>
          </div>
        </div>

        <fieldset className="product-options colour-options">
          <legend>Colour <span>{selectedColor}</span></legend>
          <div className="product-option-row">
            {product.colors.map((color) => (
              <label key={color} className={selectedColor === color ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="colour"
                  value={color}
                  checked={selectedColor === color}
                  onChange={() => setSelectedColor(color)}
                />
                <span className={`detail-swatch swatch-${color.toLowerCase().replaceAll(" ", "-")}`} />
                {color}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="product-options size-options">
          <legend>Choose size <a href="#size-guide">Size guide</a></legend>
          <div className="product-option-row">
            {product.sizes.map((size) => (
              <label key={size} className={selectedSize === size ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="size"
                  value={size}
                  checked={selectedSize === size}
                  onChange={() => {
                    setSelectedSize(size);
                    setSelectionError("");
                  }}
                />
                {size}
              </label>
            ))}
          </div>
        </fieldset>

        {selectionError && <p className="selection-message is-error" role="alert">{selectionError}</p>}
        {confirmation && <p className="selection-message is-success" role="status">{confirmation}</p>}

        <div className="product-purchase-row">
          <div className="detail-quantity" aria-label="Quantity selector">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={15} /></button>
            <span aria-live="polite">{quantity}</span>
            <button type="button" onClick={() => setQuantity((value) => Math.min(5, value + 1))} aria-label="Increase quantity"><Plus size={15} /></button>
          </div>
          <button type="button" className="product-add-button" onClick={addConfiguredProduct}>Add to bag</button>
          <button type="button" className="product-wishlist-button" aria-label={`Add ${product.name} to wishlist`}><Heart size={20} /></button>
        </div>

        <div className="purchase-assurances">
          <span><Truck size={18} /><strong>Complimentary delivery</strong> across India</span>
          <span><RotateCcw size={18} /><strong>Easy 7-day returns</strong> on eligible pieces</span>
          <span><ShieldCheck size={18} /><strong>Secure checkout</strong> and authentic craft</span>
        </div>

        <div className="product-information">
          <details open>
            <summary>Features <Plus size={16} /></summary>
            <ul>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </details>
          <details>
            <summary>Material &amp; care <Plus size={16} /></summary>
            <p>{product.care}</p>
          </details>
          <details>
            <summary>What&apos;s included <Plus size={16} /></summary>
            <p>{product.included}</p>
          </details>
          <details>
            <summary>Craft &amp; product details <Plus size={16} /></summary>
            <p>{product.origin}</p><p>Product code: {product.sku}</p>
          </details>
        </div>
      </section>
    </main>
  );
}
