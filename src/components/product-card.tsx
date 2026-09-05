"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCommerce } from "./commerce-provider";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useCommerce();
  const liked = wishlist.includes(product.id);
  const displayColors = product.colors.filter((color) => color.toLowerCase() !== "default");
  return <article className="product-card">
    <div className="product-visual">
      <Link className="product-image-link" href={`/products/${product.id}`} aria-label={`View ${product.name}`}>
        <Image src={product.image} alt={`${product.name}${displayColors.length ? ` in ${displayColors.join(" and ")}` : ""}`} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 25vw" style={{ objectPosition: product.imagePosition }} className="product-image product-image-primary" />
        {product.hoverImage !== product.image && <Image src={product.hoverImage} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 25vw" className="product-image product-image-hover" />}
      </Link>
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <button type="button" className={`heart-button ${liked ? "is-liked" : ""}`} onClick={() => toggleWishlist(product.id)} aria-label={`${liked ? "Remove" : "Add"} ${product.name} ${liked ? "from" : "to"} wishlist`} aria-pressed={liked}><Heart size={19} fill={liked ? "currentColor" : "none"} /></button>
      <Link className="quick-add" href={`/products/${product.id}`}>Choose options <ArrowUpRight size={14} /></Link>
    </div>
    <div className="product-copy"><p className="product-category">{product.category}</p><Link href={`/products/${product.id}`}><h3>{product.name}</h3></Link><div className="price-row"><span>{money.format(product.price)}</span>{product.originalPrice && <del>{money.format(product.originalPrice)}</del>}</div><p className="product-description">{product.description}</p></div>
  </article>;
}
