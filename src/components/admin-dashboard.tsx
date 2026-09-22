"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { CommerceDiscount, CommerceOrder, DiscountScope, DiscountType } from "@/lib/commerce-store";
import type { Product, ProductCategory, ProductImage } from "@/lib/types";

type Collection = { id: string; title: string; description: string; active: boolean };
type AdminTab = "products" | "discounts" | "collections" | "orders";
type DraftVariant = { color: string; size: string; price: number; inventoryQuantity: number };
type ProductDraft = {
  id?: string;
  productNumber?: number;
  sku?: string;
  name: string;
  category: ProductCategory;
  originalPrice: string;
  badge: string;
  description: string;
  material: string;
  care: string;
  included: string;
  origin: string;
  deliveryEstimate: string;
  fit: string;
  modelInfo: string;
  measurements: string;
  features: string;
  occasions: string;
  isNew: boolean;
  isBestseller: boolean;
  active: boolean;
  colors: string[];
  sizes: string[];
  gallery: ProductImage[];
  variants: DraftVariant[];
};

const standardColors = ["Ivory", "Black", "White", "Red", "Maroon", "Pink", "Navy", "Royal Blue", "Green", "Yellow", "Orange", "Beige", "Brown", "Gold", "Silver", "Purple"];
const standardSizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];
const categories: ProductCategory[] = ["Sarees", "Kurta Sets", "Lehengas", "Co-ords"];

function blankProduct(): ProductDraft {
  return {
    name: "", category: "Kurta Sets", originalPrice: "", badge: "", description: "", material: "",
    care: "Follow the garment care label.", included: "", origin: "Crafted in India", deliveryEstimate: "4–8 business days",
    fit: "Regular fit", modelInfo: "", measurements: "", features: "", occasions: "Festive", isNew: false,
    isBestseller: false, active: true, colors: ["Ivory"], sizes: ["Free Size"], gallery: [],
    variants: [{ color: "Ivory", size: "Free Size", price: 0, inventoryQuantity: 0 }],
  };
}

function productDraft(product: Product): ProductDraft {
  return {
    id: product.id, productNumber: product.productNumber, sku: product.sku, name: product.name, category: product.category,
    originalPrice: product.originalPrice == null ? "" : String(product.originalPrice), badge: product.badge ?? "",
    description: product.description, material: product.material, care: product.care, included: product.included,
    origin: product.origin, deliveryEstimate: product.deliveryEstimate, fit: product.fit ?? "", modelInfo: product.modelInfo ?? "",
    measurements: product.measurements ?? "", features: product.features.join(", "), occasions: (product.occasions ?? []).join(", "),
    isNew: Boolean(product.isNew), isBestseller: Boolean(product.isBestseller), active: product.active !== false,
    colors: product.colors, sizes: product.sizes, gallery: product.gallery.length ? product.gallery : [{ src: product.image, alt: product.name }],
    variants: (product.variants ?? []).map((variant) => ({ color: variant.color ?? "Default", size: variant.size ?? "Free Size", price: variant.price, inventoryQuantity: variant.inventoryQuantity ?? 0 })),
  };
}

function rebuildVariants(draft: ProductDraft, colors: string[], sizes: string[]) {
  return colors.flatMap((color) => sizes.map((size) => draft.variants.find((variant) => variant.color === color && variant.size === size)
    ?? { color, size, price: draft.variants[0]?.price ?? 0, inventoryQuantity: 0 }));
}

async function mutate<T = unknown>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Admin action failed.");
  return result;
}

export function AdminDashboard({ products, orders, collections, discounts }: {
  products: Product[];
  orders: CommerceOrder[];
  collections: Collection[];
  discounts: CommerceDiscount[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("products");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const run = async (key: string, action: () => Promise<void>) => {
    setPending(key); setError(""); setMessage("");
    try { await action(); setMessage("Saved successfully."); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Admin action failed."); }
    finally { setPending(""); }
  };

  return <main className="admin-page admin-workspace">
    <header className="admin-hero"><div><p className="eyebrow">Padma operations</p><h1>Commerce admin</h1><p>Manage products, variants, inventory, media, coupons, collections, and customer orders.</p></div><div className="admin-kpis"><span><strong>{products.length}</strong>Products</span><span><strong>{products.reduce((sum, product) => sum + (product.variants?.reduce((total, variant) => total + (variant.inventoryQuantity ?? 0), 0) ?? 0), 0)}</strong>Pieces</span><span><strong>{orders.length}</strong>Orders</span></div></header>
    <nav className="admin-tabs" aria-label="Admin sections">{(["products", "discounts", "collections", "orders"] as AdminTab[]).map((item) => <button key={item} type="button" aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {(message || error) && <p className={`admin-notice ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
    {tab === "products" && <ProductManager products={products} pending={pending} run={run} />}
    {tab === "discounts" && <DiscountManager products={products} collections={collections} discounts={discounts} pending={pending} run={run} />}
    {tab === "collections" && <CollectionManager products={products} collections={collections} pending={pending} run={run} />}
    {tab === "orders" && <OrderManager orders={orders} pending={pending} run={run} />}
  </main>;
}

function ProductManager({ products, pending, run }: { products: Product[]; pending: string; run: (key: string, action: () => Promise<void>) => Promise<void> }) {
  const [draft, setDraft] = useState<ProductDraft>(blankProduct);
  const [customColor, setCustomColor] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [uploading, setUploading] = useState(false);
  const totalStock = useMemo(() => draft.variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0), [draft.variants]);

  const setOption = (kind: "colors" | "sizes", value: string, checked: boolean) => setDraft((current) => {
    const values = checked ? [...new Set([...current[kind], value])] : current[kind].filter((item) => item !== value);
    if (!values.length) return current;
    const colors = kind === "colors" ? values : current.colors;
    const sizes = kind === "sizes" ? values : current.sizes;
    return { ...current, [kind]: values, variants: rebuildVariants(current, colors, sizes) };
  });

  const addCustom = (kind: "colors" | "sizes", value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setOption(kind, normalized, true);
    if (kind === "colors") setCustomColor(""); else setCustomSize("");
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: ProductImage[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData(); form.set("file", file); form.set("alt", draft.name || file.name);
        const response = await fetch("/api/admin/media", { method: "POST", body: form });
        const result = await response.json() as { image?: ProductImage; error?: string };
        if (!response.ok || !result.image) throw new Error(result.error || "Image upload failed.");
        uploaded.push(result.image);
      }
      setDraft((current) => ({ ...current, gallery: [...current.gallery, ...uploaded] }));
    } catch (reason) { throw reason; }
    finally { setUploading(false); }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    return run("product-save", async () => {
      const body = {
        ...draft,
        originalPrice: draft.originalPrice,
        features: draft.features.split(",").map((item) => item.trim()).filter(Boolean),
        occasions: draft.occasions.split(",").map((item) => item.trim()).filter(Boolean),
      };
      if (draft.id) await mutate(`/api/admin/products/${encodeURIComponent(draft.id)}`, "PATCH", body);
      else await mutate("/api/admin/products", "POST", body);
      setDraft(blankProduct());
    });
  };

  return <section className="admin-catalog-layout">
    <aside className="admin-product-index"><div className="admin-index-heading"><div><h2>Catalogue</h2><span>{products.length} products</span></div><button type="button" onClick={() => setDraft(blankProduct())}>+ New product</button></div><div className="admin-product-list">{products.map((product) => <button type="button" key={product.id} className={draft.id === product.id ? "is-selected" : ""} onClick={() => setDraft(productDraft(product))}><span className="admin-product-thumb" style={{ backgroundImage: `url("${product.image.replaceAll('"', '')}")` }} /><span><strong>{product.name}</strong><small>#{product.productNumber ?? "—"} · {product.sku}</small><em>{product.variants?.length ?? 0} variants · {product.active ? "Published" : "Archived"}</em></span></button>)}</div></aside>
    <form className="admin-product-editor" onSubmit={save}>
      <div className="admin-editor-title"><div><p className="eyebrow">{draft.id ? `Product #${draft.productNumber}` : "New catalogue item"}</p><h2>{draft.id ? draft.name : "Create product"}</h2>{draft.sku && <span>Automatically generated SKU: {draft.sku}</span>}</div>{draft.id && <button type="button" onClick={() => run(`active-${draft.id}`, () => mutate(`/api/admin/products/${encodeURIComponent(draft.id!)}`, "PATCH", { active: !draft.active }))}>{draft.active ? "Archive" : "Publish"}</button>}</div>
      <fieldset className="admin-card"><legend>Basic information</legend><div className="admin-form admin-form-3"><label className="admin-wide">Product title<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ProductCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Compare-at price ₹<input type="number" min="0" step="1" value={draft.originalPrice} onChange={(event) => setDraft({ ...draft, originalPrice: event.target.value })} placeholder="Optional" /></label><label>Badge<input value={draft.badge} onChange={(event) => setDraft({ ...draft, badge: event.target.value })} placeholder="New / Bestseller" /></label><label className="admin-full">Description<textarea required value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label className="admin-wide">Material<input required value={draft.material} onChange={(event) => setDraft({ ...draft, material: event.target.value })} /></label><label>Fit<input value={draft.fit} onChange={(event) => setDraft({ ...draft, fit: event.target.value })} /></label><label className="admin-wide">Features (comma separated)<input value={draft.features} onChange={(event) => setDraft({ ...draft, features: event.target.value })} /></label><label>Occasions<input value={draft.occasions} onChange={(event) => setDraft({ ...draft, occasions: event.target.value })} /></label></div></fieldset>
      <fieldset className="admin-card"><legend>Media</legend><label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploading} onChange={(event) => void uploadImages(event.target.files).catch((reason) => alert(reason instanceof Error ? reason.message : "Upload failed"))} /><strong>{uploading ? "Uploading…" : "Upload product images"}</strong><span>JPG, PNG, WebP or AVIF · maximum 4 MB each</span></label><div className="admin-media-grid">{draft.gallery.map((image, index) => <article key={`${image.src}-${index}`}><span style={{ backgroundImage: `url("${image.src.replaceAll('"', '')}")` }} /><input aria-label={`Alt text for image ${index + 1}`} value={image.alt} onChange={(event) => setDraft({ ...draft, gallery: draft.gallery.map((item, itemIndex) => itemIndex === index ? { ...item, alt: event.target.value } : item) })} /><button type="button" onClick={() => setDraft({ ...draft, gallery: draft.gallery.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></article>)}</div></fieldset>
      <fieldset className="admin-card"><legend>Options</legend><div className="admin-option-builder"><div><h3>Colours</h3><div className="admin-option-grid">{standardColors.map((color) => <label key={color}><input type="checkbox" checked={draft.colors.includes(color)} onChange={(event) => setOption("colors", color, event.target.checked)} />{color}</label>)}{draft.colors.filter((color) => !standardColors.includes(color)).map((color) => <label key={color}><input type="checkbox" checked onChange={(event) => setOption("colors", color, event.target.checked)} />{color}</label>)}</div><div className="admin-custom-option"><input value={customColor} onChange={(event) => setCustomColor(event.target.value)} placeholder="Custom colour" /><button type="button" onClick={() => addCustom("colors", customColor)}>Add</button></div></div><div><h3>Sizes</h3><div className="admin-option-grid">{standardSizes.map((size) => <label key={size}><input type="checkbox" checked={draft.sizes.includes(size)} onChange={(event) => setOption("sizes", size, event.target.checked)} />{size}</label>)}{draft.sizes.filter((size) => !standardSizes.includes(size)).map((size) => <label key={size}><input type="checkbox" checked onChange={(event) => setOption("sizes", size, event.target.checked)} />{size}</label>)}</div><div className="admin-custom-option"><input value={customSize} onChange={(event) => setCustomSize(event.target.value)} placeholder="Custom size" /><button type="button" onClick={() => addCustom("sizes", customSize)}>Add</button></div></div></div></fieldset>
      <fieldset className="admin-card"><legend>Variants &amp; inventory</legend><p className="admin-card-note">Each colour and size combination has its own selling price and available pieces. SKU codes are generated automatically.</p><div className="admin-variant-table"><div className="admin-variant-head"><span>Variant</span><span>Price ₹</span><span>Pieces</span><span>SKU</span></div>{draft.variants.map((variant, index) => <div key={`${variant.color}:${variant.size}`}><strong>{variant.color} / {variant.size}</strong><input aria-label={`Price for ${variant.color} ${variant.size}`} type="number" min="0" step="1" value={variant.price} onChange={(event) => setDraft({ ...draft, variants: draft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, price: Number(event.target.value) } : item) })} /><input aria-label={`Stock for ${variant.color} ${variant.size}`} type="number" min="0" step="1" value={variant.inventoryQuantity} onChange={(event) => setDraft({ ...draft, variants: draft.variants.map((item, itemIndex) => itemIndex === index ? { ...item, inventoryQuantity: Number(event.target.value) } : item) })} /><code>{draft.sku ? `${draft.sku}-${variant.color}-${variant.size}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-") : "Generated after save"}</code></div>)}</div><p className="admin-stock-total">Total inventory: <strong>{totalStock} pieces</strong></p></fieldset>
      <fieldset className="admin-card"><legend>Product details</legend><div className="admin-form admin-form-3"><label className="admin-wide">Care instructions<textarea value={draft.care} onChange={(event) => setDraft({ ...draft, care: event.target.value })} /></label><label>Included<input value={draft.included} onChange={(event) => setDraft({ ...draft, included: event.target.value })} /></label><label>Origin<input value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} /></label><label>Delivery estimate<input value={draft.deliveryEstimate} onChange={(event) => setDraft({ ...draft, deliveryEstimate: event.target.value })} /></label><label>Model information<input value={draft.modelInfo} onChange={(event) => setDraft({ ...draft, modelInfo: event.target.value })} /></label><label>Measurements<input value={draft.measurements} onChange={(event) => setDraft({ ...draft, measurements: event.target.value })} /></label><label className="admin-check"><input type="checkbox" checked={draft.isNew} onChange={(event) => setDraft({ ...draft, isNew: event.target.checked })} />New arrival</label><label className="admin-check"><input type="checkbox" checked={draft.isBestseller} onChange={(event) => setDraft({ ...draft, isBestseller: event.target.checked })} />Bestseller</label><label className="admin-check"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Published</label></div></fieldset>
      <div className="admin-save-bar"><span>{draft.gallery.length} images · {draft.variants.length} variants · {totalStock} pieces</span><button className="primary-cta" disabled={pending === "product-save" || uploading}>{pending === "product-save" ? "Saving…" : draft.id ? "Save product" : "Create product"}</button></div>
    </form>
  </section>;
}

function DiscountManager({ products, collections, discounts, pending, run }: { products: Product[]; collections: Collection[]; discounts: CommerceDiscount[]; pending: string; run: (key: string, action: () => Promise<void>) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("percentage");
  const [value, setValue] = useState("10");
  const [minimumOrder, setMinimumOrder] = useState("0");
  const [usageLimit, setUsageLimit] = useState("");
  const [scope, setScope] = useState<DiscountScope>("all");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const edit = (discount: CommerceDiscount) => { setCode(discount.code); setType(discount.type); setValue(String(discount.value)); setMinimumOrder(String(discount.minimumOrder)); setUsageLimit(discount.usageLimit == null ? "" : String(discount.usageLimit)); setScope(discount.scope); setProductIds(discount.productIds); setCollectionIds(discount.collectionIds); setActive(discount.active); };
  const toggle = (values: string[], value: string, checked: boolean) => checked ? [...new Set([...values, value])] : values.filter((item) => item !== value);
  return <section className="admin-discount-layout"><div className="admin-section"><div className="admin-section-heading"><h2>Discount coupons</h2><span>{discounts.length} codes</span></div><div className="admin-discount-list">{discounts.length ? discounts.map((discount) => <button type="button" key={discount.id} onClick={() => edit(discount)}><span><strong>{discount.code}</strong><small>{discount.type.replaceAll("_", " ")} · minimum ₹{discount.minimumOrder.toLocaleString("en-IN")}</small></span><span>{discount.usedCount}{discount.usageLimit ? ` / ${discount.usageLimit}` : ""} uses</span><em>{discount.active ? "Active" : "Disabled"}</em></button>) : <p>No coupons created yet.</p>}</div></div><form className="admin-section admin-discount-form" onSubmit={(event) => { event.preventDefault(); void run("discount", () => mutate("/api/admin/discounts", "POST", { code, type, value: type === "free_shipping" ? 0 : Number(value), minimumOrder: Number(minimumOrder), usageLimit, scope, productIds, collectionIds, active })); }}><h2>Create or edit coupon</h2><div className="admin-form"><label>Coupon code<input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="WELCOME10" /></label><label>Discount type<select value={type} onChange={(event) => setType(event.target.value as DiscountType)}><option value="percentage">Percentage</option><option value="fixed_amount">Fixed ₹ amount</option><option value="free_shipping">Free shipping</option></select></label>{type !== "free_shipping" && <label>{type === "percentage" ? "Percentage" : "Amount ₹"}<input type="number" min="1" max={type === "percentage" ? 100 : undefined} value={value} onChange={(event) => setValue(event.target.value)} /></label>}<label>Minimum order ₹<input type="number" min="0" value={minimumOrder} onChange={(event) => setMinimumOrder(event.target.value)} /></label><label>Usage limit<input type="number" min="1" value={usageLimit} onChange={(event) => setUsageLimit(event.target.value)} placeholder="Unlimited" /></label><label>Applies to<select value={scope} onChange={(event) => setScope(event.target.value as DiscountScope)}><option value="all">All products</option><option value="products">Selected products</option><option value="collections">Selected collections</option></select></label><label className="admin-check"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Active</label></div>{scope === "products" && <div className="admin-picker"><h3>Select products</h3>{products.map((product) => <label key={product.id}><input type="checkbox" checked={productIds.includes(product.id)} onChange={(event) => setProductIds(toggle(productIds, product.id, event.target.checked))} />{product.name}</label>)}</div>}{scope === "collections" && <div className="admin-picker"><h3>Select collections</h3>{collections.map((collection) => <label key={collection.id}><input type="checkbox" checked={collectionIds.includes(collection.id)} onChange={(event) => setCollectionIds(toggle(collectionIds, collection.id, event.target.checked))} />{collection.title}</label>)}</div>}<button className="primary-cta" disabled={pending === "discount"}>{pending === "discount" ? "Saving…" : "Save coupon"}</button></form></section>;
}

function CollectionManager({ products, collections, pending, run }: { products: Product[]; collections: Collection[]; pending: string; run: (key: string, action: () => Promise<void>) => Promise<void> }) {
  return <section className="admin-collections-layout">
    <div className="admin-section admin-collection-index">
      <div className="admin-section-heading"><h2>Collections</h2><span>{collections.length} collections</span></div>
      <p className="admin-section-intro">Curate focused edits that shoppers can browse from the storefront.</p>
      <div className="admin-collection-list">{collections.map((collection) => <article key={collection.id}><div><strong>{collection.title}</strong><small>/{collection.id}</small></div><p>{collection.description}</p><span>{collection.active ? "Active" : "Archived"}</span></article>)}</div>
    </div>
    <form action={(form) => run("collection", () => mutate("/api/admin/collections", "POST", { id: form.get("id"), title: form.get("title"), description: form.get("description"), productIds: form.getAll("productIds").map(String), active: true }))} className="admin-section admin-collection-editor">
      <div className="admin-section-heading"><div><p className="eyebrow">New collection</p><h2>Create a curated edit</h2></div></div>
      <div className="admin-form admin-collection-fields"><label>Handle<input name="id" required placeholder="festive-edit" /></label><label>Title<input name="title" required placeholder="The festive edit" /></label><label className="admin-full">Description<textarea name="description" required placeholder="Describe what brings these pieces together." /></label></div>
      <div className="admin-collection-products"><div><h3>Select products</h3><span>Choose one or more pieces</span></div>{products.map((product) => <label className="admin-collection-product" key={product.id}><input type="checkbox" name="productIds" value={product.id} /><span className="admin-collection-thumb" style={{ backgroundImage: `url("${product.image.replaceAll('"', '')}")` }} /><span><strong>{product.name}</strong><small>#{product.productNumber ?? "—"} · {product.category}</small></span></label>)}</div>
      <div className="admin-collection-actions"><span>Collections are published immediately after saving.</span><button className="primary-cta" disabled={pending === "collection"}>{pending === "collection" ? "Saving…" : "Save collection"}</button></div>
    </form>
  </section>;
}

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function OrderManager({ orders, pending, run }: { orders: CommerceOrder[]; pending: string; run: (key: string, action: () => Promise<void>) => Promise<void> }) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  return <section className="admin-section admin-orders-section">
    <div className="admin-section-heading"><div><h2>Orders</h2><p className="admin-section-intro">Open an order to see the customer, delivery address, purchased items, payment, and full total breakdown.</p></div><span>{orders.length} {orders.length === 1 ? "order" : "orders"}</span></div>
    {orders.length ? <div className="admin-order-list">{orders.map((order) => {
      const expanded = expandedOrder === order.id;
      const address = order.deliveryAddress;
      return <article className={`admin-order-card ${expanded ? "is-expanded" : ""}`} key={order.id}>
        <div className="admin-order-summary">
          <div><span className={`admin-order-status is-${order.status}`}>{order.status}</span><strong>{order.number}</strong><small>{new Date(order.createdAt).toLocaleString("en-IN")} · {order.customer.name}</small></div>
          <div className="admin-order-summary-total"><span>Order total</span><strong>{money.format(order.total)}</strong></div>
          <label className="admin-order-status-control">Status<select aria-label={`Status for ${order.number}`} value={order.status} onChange={(event) => void run(`order-${order.id}`, () => mutate(`/api/admin/orders/${order.id}`, "PATCH", { status: event.target.value }))} disabled={pending === `order-${order.id}`}><option value="pending">Pending</option><option value="paid">Paid</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option><option value="failed">Failed</option></select></label>
          <button className="admin-order-toggle" type="button" aria-expanded={expanded} onClick={() => setExpandedOrder(expanded ? null : order.id)}>{expanded ? "Hide order details" : "View order details"}</button>
        </div>
        {expanded && <div className="admin-order-details">
          <section><h3>Customer</h3><strong>{order.customer.name}</strong><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a><a href={`tel:${address.phone}`}>{address.phone}</a></section>
          <section><h3>Delivery address</h3><strong>{address.label}</strong><span>{address.fullName}</span><p>{address.address1}{address.address2 ? `, ${address.address2}` : ""}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country}</p></section>
          <section><h3>Payment</h3><strong>{order.paymentMethod === "cod" ? "Cash on delivery" : "Cashfree"}</strong><span>Currency: {order.currency}</span>{order.couponCode ? <span>Coupon: <strong>{order.couponCode}</strong></span> : <span>No coupon applied</span>}</section>
          <section className="admin-order-items"><h3>Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})</h3>{order.items.map((item) => <article key={`${order.id}-${item.variantId}`}><div><strong>{item.name}</strong><span>SKU <b>{item.sku}</b></span><small>{item.color ?? "Default"} / {item.size ?? "Free Size"}</small></div><div><span>{money.format(item.price)} × {item.quantity}</span><strong>{money.format(item.price * item.quantity)}</strong></div></article>)}</section>
          <section className="admin-order-totals"><h3>Amount summary</h3><div><span>Subtotal</span><strong>{money.format(order.subtotal)}</strong></div><div><span>Delivery</span><strong>{order.shipping ? money.format(order.shipping) : "Complimentary"}</strong></div>{order.discount > 0 && <div className="is-discount"><span>Discount</span><strong>−{money.format(order.discount)}</strong></div>}<div className="is-total"><span>Total</span><strong>{money.format(order.total)}</strong></div></section>
        </div>}
      </article>;
    })}</div> : <div className="admin-empty-orders"><h3>No orders yet</h3><p>Customer orders will appear here after checkout.</p></div>}
  </section>;
}
