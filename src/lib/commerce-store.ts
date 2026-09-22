import { createClient, type Client, type Transaction } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { products as seedProducts } from "./products";
import type { Product, ProductCategory, ProductImage, ProductVariant } from "./types";

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "fulfilled";
export type PaymentMethod = "cod" | "cashfree";
export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";
export type DiscountScope = "all" | "products" | "collections";

export type CommerceDiscount = {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minimumOrder: number;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  scope: DiscountScope;
  productIds: string[];
  collectionIds: string[];
};

export type CommerceOrder = {
  id: string;
  number: string;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode?: string;
  total: number;
  currency: "INR";
  paymentMethod: PaymentMethod;
  createdAt: string;
  customer: { name: string; email: string };
  deliveryAddress: {
    label: string; fullName: string; phone: string; address1: string; address2: string;
    city: string; state: string; postalCode: string; country: string;
  };
  items: Array<{ variantId: string; name: string; sku: string; color?: string; size?: string; price: number; quantity: number }>;
};

export type CheckoutQuote = {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
};

export type ProductWriteInput = Omit<Product, "source" | "variants"> & {
  active?: boolean;
  variants: Array<Omit<ProductVariant, "availableForSale"> & { inventoryQuantity: number; active?: boolean }>;
};

export type ProductCreateInput = Omit<ProductWriteInput, "id" | "sku" | "productNumber" | "variants"> & {
  variants: Array<Omit<ProductWriteInput["variants"][number], "id" | "sku">>;
};

export class InventoryUnavailableError extends Error {
  constructor() { super("One or more items are no longer available in the requested quantity."); }
}

export class CheckoutAddressError extends Error {
  constructor() { super("Address not found"); }
}

export class CommerceValidationError extends Error {}
export class DiscountCodeError extends CommerceValidationError {}

function databaseUrl() {
  return process.env.COMMERCE_DATABASE_URL ?? process.env.CUSTOMER_DATABASE_URL ?? "file:.data/padma.db";
}

async function prepareFileDatabase(url: string) {
  if (!url.startsWith("file:")) return;
  await mkdir(dirname(url.slice("file:".length)), { recursive: true });
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "default";
}

function skuPart(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "DEFAULT";
}

function variantsForSeed(product: Product): ProductVariant[] {
  if (product.variants?.length) {
    return product.variants.map((variant) => ({ ...variant, inventoryQuantity: variant.inventoryQuantity ?? 10, sku: variant.sku ?? `${product.sku}-${slug(variant.title)}` }));
  }
  const colors = product.colors.length ? product.colors : ["Default"];
  const sizes = product.sizes.length ? product.sizes : ["Default"];
  return colors.flatMap((color) => sizes.map((size) => ({
    id: `${product.id}:${slug(color)}:${slug(size)}`,
    title: [color, size].filter((value) => value !== "Default").join(" / ") || "Default",
    color,
    size,
    availableForSale: true,
    inventoryQuantity: 10,
    price: product.price,
    sku: `${product.sku}-${slug(color).slice(0, 4).toUpperCase()}-${slug(size).slice(0, 4).toUpperCase()}`,
  })));
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function bool(value: unknown) { return Number(value) === 1; }
function moneyFromMinor(value: unknown) { return Number(value) / 100; }
function moneyToMinor(value: number) { return Math.round(value * 100); }

type DiscountCalculation = CheckoutQuote & { discountId?: string };

async function calculateCheckoutQuote(
  db: Client | Transaction,
  productSubtotals: Map<string, number>,
  subtotal: number,
  requestedCode?: string,
): Promise<DiscountCalculation> {
  let shipping = subtotal >= 10_000 ? 0 : 199;
  let discount = 0;
  let discountId: string | undefined;
  let couponCode: string | undefined;
  const requestedCoupon = requestedCode?.trim().toUpperCase();
  if (requestedCoupon) {
    const discountResult = await db.execute({ sql: "SELECT * FROM commerce_discounts WHERE code = ? AND active = 1 LIMIT 1", args: [requestedCoupon] });
    const coupon = discountResult.rows[0];
    if (!coupon) throw new DiscountCodeError("Coupon code is invalid or inactive.");
    if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) throw new DiscountCodeError("This coupon has reached its usage limit.");
    if (subtotal < moneyFromMinor(coupon.minimum_order_minor)) throw new DiscountCodeError(`Minimum order value is ₹${moneyFromMinor(coupon.minimum_order_minor).toLocaleString("en-IN")} for this coupon.`);
    const scope = String(coupon.scope) as DiscountScope;
    let eligibleProductIds = [...productSubtotals.keys()];
    if (scope === "products") {
      const scoped = await db.execute({ sql: "SELECT product_id FROM commerce_discount_products WHERE discount_id = ?", args: [String(coupon.id)] });
      const allowed = new Set(scoped.rows.map((row) => String(row.product_id)));
      eligibleProductIds = eligibleProductIds.filter((id) => allowed.has(id));
    } else if (scope === "collections") {
      const scoped = await db.execute({
        sql: `SELECT DISTINCT cp.product_id FROM commerce_discount_collections dc
              JOIN commerce_collection_products cp ON cp.collection_id = dc.collection_id
              WHERE dc.discount_id = ?`, args: [String(coupon.id)],
      });
      const allowed = new Set(scoped.rows.map((row) => String(row.product_id)));
      eligibleProductIds = eligibleProductIds.filter((id) => allowed.has(id));
    }
    const eligibleSubtotal = eligibleProductIds.reduce((sum, id) => sum + (productSubtotals.get(id) ?? 0), 0);
    if (eligibleSubtotal <= 0) throw new DiscountCodeError("This coupon does not apply to the products in your bag.");
    const type = String(coupon.type) as DiscountType;
    if (type === "percentage") discount = Math.round(eligibleSubtotal * Number(coupon.value)) / 100;
    if (type === "fixed_amount") discount = Math.min(eligibleSubtotal, moneyFromMinor(coupon.value));
    if (type === "free_shipping") shipping = 0;
    discountId = String(coupon.id);
    couponCode = String(coupon.code);
  }
  return { subtotal, shipping, discount, total: Math.max(0, subtotal - discount + shipping), ...(couponCode ? { couponCode } : {}), ...(discountId ? { discountId } : {}) };
}

async function ensureCommerceSchema(db: Client) {
  const productColumns = await db.execute("PRAGMA table_info(commerce_products)");
  if (!productColumns.rows.some((row) => String(row.name) === "product_number")) {
    await db.execute("ALTER TABLE commerce_products ADD COLUMN product_number INTEGER");
  }
  const existing = await db.execute("SELECT id, product_number FROM commerce_products ORDER BY created_at, id");
  let next = Math.max(1000, ...existing.rows.map((row) => Number(row.product_number) || 0));
  for (const row of existing.rows) {
    if (row.product_number == null) {
      next += 1;
      await db.execute({ sql: "UPDATE commerce_products SET product_number = ? WHERE id = ?", args: [next, String(row.id)] });
    }
  }
  await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS commerce_products_number_idx ON commerce_products(product_number)");
  await db.execute("CREATE TABLE IF NOT EXISTS commerce_sequences (name TEXT PRIMARY KEY, next_value INTEGER NOT NULL)");
  const maximumProductNumber = next;
  await db.execute({ sql: "INSERT OR IGNORE INTO commerce_sequences (name, next_value) VALUES ('product_number', ?)", args: [maximumProductNumber + 1] });
  await db.execute({ sql: "UPDATE commerce_sequences SET next_value = ? WHERE name = 'product_number' AND next_value <= ?", args: [maximumProductNumber + 1, maximumProductNumber] });

  const orderColumns = await db.execute("PRAGMA table_info(commerce_order_details)");
  if (!orderColumns.rows.some((row) => String(row.name) === "discount_code")) {
    await db.execute("ALTER TABLE commerce_order_details ADD COLUMN discount_code TEXT");
  }
  if (!orderColumns.rows.some((row) => String(row.name) === "discount_minor")) {
    await db.execute("ALTER TABLE commerce_order_details ADD COLUMN discount_minor INTEGER NOT NULL DEFAULT 0");
  }
  await db.batch([
    `CREATE TABLE IF NOT EXISTS commerce_discounts (
      id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, type TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 0,
      minimum_order_minor INTEGER NOT NULL DEFAULT 0, usage_limit INTEGER, used_count INTEGER NOT NULL DEFAULT 0,
      scope TEXT NOT NULL DEFAULT 'all', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS commerce_discount_products (
      discount_id TEXT NOT NULL REFERENCES commerce_discounts(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
      PRIMARY KEY(discount_id, product_id)
    )`,
    `CREATE TABLE IF NOT EXISTS commerce_discount_collections (
      discount_id TEXT NOT NULL REFERENCES commerce_discounts(id) ON DELETE CASCADE,
      collection_id TEXT NOT NULL REFERENCES commerce_collections(id) ON DELETE CASCADE,
      PRIMARY KEY(discount_id, collection_id)
    )`,
    `CREATE TABLE IF NOT EXISTS commerce_discount_redemptions (
      discount_id TEXT NOT NULL REFERENCES commerce_discounts(id), order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, amount_minor INTEGER NOT NULL,
      created_at TEXT NOT NULL, PRIMARY KEY(discount_id, order_id)
    )`,
  ], "write");
}

function mapProducts(productRows: Array<Record<string, unknown>>, variantRows: Array<Record<string, unknown>>, imageRows: Array<Record<string, unknown>>): Product[] {
  const variants = new Map<string, ProductVariant[]>();
  for (const row of variantRows) {
    const productId = String(row.product_id);
    const values = variants.get(productId) ?? [];
    const inventoryQuantity = Number(row.inventory_quantity);
    values.push({
      id: String(row.id), title: String(row.title), color: row.color ? String(row.color) : undefined,
      size: row.size ? String(row.size) : undefined, sku: String(row.sku),
      price: moneyFromMinor(row.price_minor), inventoryQuantity,
      availableForSale: bool(row.active) && inventoryQuantity > 0,
    });
    variants.set(productId, values);
  }
  const images = new Map<string, ProductImage[]>();
  for (const row of imageRows) {
    const productId = String(row.product_id);
    const values = images.get(productId) ?? [];
    values.push({ src: String(row.url), alt: String(row.alt), position: row.position ? String(row.position) : undefined });
    images.set(productId, values);
  }
  return productRows.map((row) => {
    const gallery = images.get(String(row.id)) ?? [];
    const productVariants = variants.get(String(row.id)) ?? [];
    const prices = productVariants.filter((variant) => variant.availableForSale).map((variant) => variant.price);
    return {
      id: String(row.id), productNumber: row.product_number == null ? undefined : Number(row.product_number),
      name: String(row.name), category: String(row.category) as ProductCategory,
      price: prices.length ? Math.min(...prices) : moneyFromMinor(row.price_minor),
      originalPrice: row.original_price_minor == null ? undefined : moneyFromMinor(row.original_price_minor),
      image: String(row.image), hoverImage: String(row.hover_image), gallery,
      badge: row.badge ? String(row.badge) : undefined,
      colors: parseJson(row.colors_json, []), sizes: parseJson(row.sizes_json, []),
      description: String(row.description), material: String(row.material), features: parseJson(row.features_json, []),
      care: String(row.care), included: String(row.included), origin: String(row.origin),
      deliveryEstimate: String(row.delivery_estimate), sku: String(row.sku),
      imagePosition: row.image_position ? String(row.image_position) : undefined,
      occasions: parseJson(row.occasions_json, []), isNew: bool(row.is_new), isBestseller: bool(row.is_bestseller),
      fit: row.fit ? String(row.fit) : undefined, modelInfo: row.model_info ? String(row.model_info) : undefined,
      measurements: row.measurements ? String(row.measurements) : undefined,
      variants: productVariants, source: "commerce", active: bool(row.active),
    } satisfies Product;
  });
}

export function createCommerceStore(url = databaseUrl(), authToken = process.env.COMMERCE_DATABASE_AUTH_TOKEN ?? process.env.CUSTOMER_DATABASE_AUTH_TOKEN) {
  let client: Client | null = null;
  let ready: Promise<Client> | null = null;
  let productCreationQueue: Promise<void> = Promise.resolve();

  const getClient = () => {
    if (!ready) ready = (async () => {
      await prepareFileDatabase(url);
      client = createClient({ url, ...(authToken ? { authToken } : {}) });
      if (url.startsWith("file:")) await client.execute("PRAGMA busy_timeout = 10000");
      await client.batch([
        `PRAGMA foreign_keys = ON`,
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
          password_hash TEXT, created_at TEXT NOT NULL, google_subject TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS addresses (
          id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          label TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT NOT NULL, address1 TEXT NOT NULL,
          address2 TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, postal_code TEXT NOT NULL,
          country TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          number TEXT NOT NULL UNIQUE, status TEXT NOT NULL, total REAL NOT NULL, currency TEXT NOT NULL,
          items_json TEXT NOT NULL, created_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS commerce_products (
          id TEXT PRIMARY KEY, product_number INTEGER UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL, price_minor INTEGER NOT NULL,
          original_price_minor INTEGER, image TEXT NOT NULL, hover_image TEXT NOT NULL, badge TEXT,
          colors_json TEXT NOT NULL, sizes_json TEXT NOT NULL, description TEXT NOT NULL, material TEXT NOT NULL,
          features_json TEXT NOT NULL, care TEXT NOT NULL, included TEXT NOT NULL, origin TEXT NOT NULL,
          delivery_estimate TEXT NOT NULL, sku TEXT NOT NULL UNIQUE, image_position TEXT,
          occasions_json TEXT NOT NULL, is_new INTEGER NOT NULL DEFAULT 0, is_bestseller INTEGER NOT NULL DEFAULT 0,
          fit TEXT, model_info TEXT, measurements TEXT, active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS commerce_variants (
          id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
          title TEXT NOT NULL, color TEXT, size TEXT, sku TEXT NOT NULL UNIQUE, price_minor INTEGER NOT NULL,
          inventory_quantity INTEGER NOT NULL DEFAULT 0 CHECK(inventory_quantity >= 0), active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS commerce_variants_product_idx ON commerce_variants(product_id)`,
        `CREATE TABLE IF NOT EXISTS commerce_images (
          id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
          url TEXT NOT NULL, alt TEXT NOT NULL, position TEXT, sort_order INTEGER NOT NULL DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS commerce_collections (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS commerce_collection_products (
          collection_id TEXT NOT NULL REFERENCES commerce_collections(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
          sort_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(collection_id, product_id)
        )`,
        `CREATE TABLE IF NOT EXISTS commerce_order_details (
          order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          idempotency_key TEXT NOT NULL, address_json TEXT NOT NULL, subtotal_minor INTEGER NOT NULL,
          shipping_minor INTEGER NOT NULL, payment_method TEXT NOT NULL, payment_reference TEXT,
          updated_at TEXT NOT NULL, UNIQUE(user_id, idempotency_key)
        )`,
        `CREATE TABLE IF NOT EXISTS commerce_order_items (
          id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          variant_id TEXT NOT NULL, product_name TEXT NOT NULL, variant_title TEXT NOT NULL, sku TEXT NOT NULL,
          color TEXT, size TEXT, price_minor INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0)
        )`,
        `CREATE TABLE IF NOT EXISTS commerce_inventory_movements (
          id TEXT PRIMARY KEY, variant_id TEXT NOT NULL, delta INTEGER NOT NULL, reason TEXT NOT NULL,
          order_id TEXT, actor TEXT NOT NULL, created_at TEXT NOT NULL
        )`,
      ], "write");

      await ensureCommerceSchema(client);
      const count = await client.execute("SELECT COUNT(*) AS count FROM commerce_products");
      if (Number(count.rows[0]?.count) === 0) {
        await seed(client);
        await ensureCommerceSchema(client);
      }
      return client;
    })();
    return ready;
  };

  const reserveProductNumber = async () => {
    const db = await getClient();
    const tx = await db.transaction("write");
    try {
      const reserved = await tx.execute("UPDATE commerce_sequences SET next_value = next_value + 1 WHERE name = 'product_number' RETURNING next_value - 1 AS value");
      const value = Number(reserved.rows[0]?.value);
      if (!Number.isInteger(value) || value < 1001) throw new CommerceValidationError("Unable to generate a product number.");
      await tx.commit();
      return value;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  };

  async function seed(db: Client) {
    const now = new Date().toISOString();
    const statements: Array<{ sql: string; args: Array<string | number | null> }> = [];
    for (const product of seedProducts) {
      statements.push({
        sql: `INSERT INTO commerce_products (
          id, name, category, price_minor, original_price_minor, image, hover_image, badge, colors_json,
          sizes_json, description, material, features_json, care, included, origin, delivery_estimate,
          sku, image_position, occasions_json, is_new, is_bestseller, fit, model_info, measurements,
          active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [product.id, product.name, product.category, moneyToMinor(product.price), product.originalPrice == null ? null : moneyToMinor(product.originalPrice),
          product.image, product.hoverImage, product.badge ?? null, JSON.stringify(product.colors), JSON.stringify(product.sizes),
          product.description, product.material, JSON.stringify(product.features), product.care, product.included, product.origin,
          product.deliveryEstimate, product.sku, product.imagePosition ?? null, JSON.stringify(product.occasions ?? []),
          product.isNew ? 1 : 0, product.isBestseller ? 1 : 0, product.fit ?? null, product.modelInfo ?? null,
          product.measurements ?? null, now, now],
      });
      for (const variant of variantsForSeed(product)) {
        statements.push({
          sql: `INSERT INTO commerce_variants (id, product_id, title, color, size, sku, price_minor, inventory_quantity, active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          args: [variant.id, product.id, variant.title, variant.color ?? null, variant.size ?? null, variant.sku!, moneyToMinor(variant.price), variant.inventoryQuantity ?? 10, now, now],
        });
      }
      for (const [index, image] of product.gallery.entries()) {
        statements.push({
          sql: "INSERT INTO commerce_images (id, product_id, url, alt, position, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
          args: [randomUUID(), product.id, image.src, image.alt, image.position ?? null, index],
        });
      }
    }
    const collections = [
      ["all", "All pieces", "Every Padma silhouette."], ["sarees", "Sarees", "Six yards, reimagined."],
      ["kurta-sets", "Kurta sets", "Modern classics."], ["lehengas", "Lehengas", "For the dance floor."],
      ["co-ords", "Co-ords", "Effortless dressing."], ["new-arrivals", "New arrivals", "The latest chapter."],
      ["bestsellers", "Bestsellers", "Most loved."], ["sale", "Special prices", "Considered value."],
    ];
    for (const collection of collections) statements.push({
      sql: "INSERT INTO commerce_collections (id, title, description, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
      args: [collection[0], collection[1], collection[2], now, now],
    });
    for (const [index, product] of seedProducts.entries()) {
      const ids = ["all", slug(product.category), ...(product.isNew ? ["new-arrivals"] : []), ...(product.isBestseller ? ["bestsellers"] : []), ...(product.originalPrice ? ["sale"] : [])];
      for (const collectionId of new Set(ids)) statements.push({
        sql: "INSERT OR IGNORE INTO commerce_collection_products (collection_id, product_id, sort_order) VALUES (?, ?, ?)",
        args: [collectionId, product.id, index],
      });
    }
    await db.batch(statements, "write");
  }

  async function productRows(activeOnly = true, collectionId?: string) {
    const db = await getClient();
    const where = [activeOnly ? "p.active = 1" : "1 = 1", collectionId ? "cp.collection_id = ?" : "1 = 1"].join(" AND ");
    const result = await db.execute({
      sql: `SELECT DISTINCT p.* FROM commerce_products p
            ${collectionId ? "JOIN commerce_collection_products cp ON cp.product_id = p.id" : ""}
            WHERE ${where} ORDER BY p.created_at, p.name`,
      args: collectionId ? [collectionId] : [],
    });
    return result.rows as unknown as Array<Record<string, unknown>>;
  }

  async function hydrate(rows: Array<Record<string, unknown>>) {
    if (!rows.length) return [];
    const db = await getClient();
    const placeholders = rows.map(() => "?").join(",");
    const ids = rows.map((row) => String(row.id));
    const [variantResult, imageResult] = await Promise.all([
      db.execute({ sql: `SELECT * FROM commerce_variants WHERE active = 1 AND product_id IN (${placeholders}) ORDER BY product_id, title`, args: ids }),
      db.execute({ sql: `SELECT * FROM commerce_images WHERE product_id IN (${placeholders}) ORDER BY product_id, sort_order`, args: ids }),
    ]);
    return mapProducts(rows, variantResult.rows as unknown as Array<Record<string, unknown>>, imageResult.rows as unknown as Array<Record<string, unknown>>);
  }

  async function findIdempotentOrder(db: Client | Transaction, userId: string, key: string): Promise<CommerceOrder | null> {
    const result = await db.execute({
      sql: `SELECT o.id FROM orders o JOIN commerce_order_details d ON d.order_id = o.id
            WHERE d.user_id = ? AND d.idempotency_key = ? LIMIT 1`, args: [userId, key],
    });
    return result.rows[0] ? getOrder(String(result.rows[0].id), db) : null;
  }

  async function getOrder(id: string, executor?: Client | Transaction): Promise<CommerceOrder | null> {
    const db = executor ?? await getClient();
    const [orderResult, itemResult] = await Promise.all([
      db.execute({
        sql: `SELECT o.*, d.address_json, d.subtotal_minor, d.shipping_minor, d.discount_code, d.discount_minor,
                     d.payment_method, u.name AS customer_name, u.email AS customer_email
              FROM orders o JOIN commerce_order_details d ON d.order_id = o.id
              JOIN users u ON u.id = d.user_id WHERE o.id = ? LIMIT 1`, args: [id],
      }),
      db.execute({ sql: "SELECT * FROM commerce_order_items WHERE order_id = ? ORDER BY rowid", args: [id] }),
    ]);
    const row = orderResult.rows[0];
    if (!row) return null;
    const address = JSON.parse(String(row.address_json)) as Record<string, unknown>;
    return {
      id: String(row.id), number: String(row.number), userId: String(row.user_id), status: String(row.status) as OrderStatus,
      subtotal: moneyFromMinor(row.subtotal_minor), shipping: moneyFromMinor(row.shipping_minor),
      discount: moneyFromMinor(row.discount_minor), couponCode: row.discount_code ? String(row.discount_code) : undefined,
      total: Number(row.total),
      currency: "INR", paymentMethod: String(row.payment_method) as PaymentMethod, createdAt: String(row.created_at),
      customer: { name: String(row.customer_name), email: String(row.customer_email) },
      deliveryAddress: {
        label: String(address.label), fullName: String(address.full_name), phone: String(address.phone),
        address1: String(address.address1), address2: String(address.address2 ?? ""), city: String(address.city),
        state: String(address.state), postalCode: String(address.postal_code), country: String(address.country),
      },
      items: itemResult.rows.map((item) => ({
        variantId: String(item.variant_id), name: String(item.product_name), sku: String(item.sku),
        color: item.color ? String(item.color) : undefined, size: item.size ? String(item.size) : undefined,
        price: moneyFromMinor(item.price_minor), quantity: Number(item.quantity),
      })),
    };
  }

  return {
    async listProducts(options: { query?: string; collectionId?: string; activeOnly?: boolean } = {}): Promise<Product[]> {
      let products = await hydrate(await productRows(options.activeOnly ?? true, options.collectionId));
      const query = options.query?.trim().toLowerCase();
      if (query) products = products.filter((product) => [product.name, product.category, product.description, product.sku].some((value) => value.toLowerCase().includes(query)));
      return products;
    },

    async getProduct(id: string, activeOnly = true): Promise<Product | undefined> {
      const db = await getClient();
      const result = await db.execute({ sql: `SELECT * FROM commerce_products WHERE id = ? ${activeOnly ? "AND active = 1" : ""} LIMIT 1`, args: [id] });
      return (await hydrate(result.rows as unknown as Array<Record<string, unknown>>))[0];
    },

    async createProduct(input: ProductCreateInput): Promise<Product> {
      const previous = productCreationQueue;
      let release!: () => void;
      const current = new Promise<void>((resolve) => { release = resolve; });
      productCreationQueue = previous.then(() => current);
      await previous;
      try {
        const productNumber = await reserveProductNumber();
        const baseHandle = slug(input.name);
        const id = `${baseHandle}-${productNumber}`;
        const sku = `PE-${productNumber}`;
        const combinations = new Set<string>();
        const variants = input.variants.map((variant) => {
          const color = variant.color?.trim() || "Default";
          const size = variant.size?.trim() || "Free Size";
          const combination = `${slug(color)}:${slug(size)}`;
          if (combinations.has(combination)) throw new CommerceValidationError("Each colour and size combination must be unique.");
          combinations.add(combination);
          return {
            ...variant,
            id: `${id}:${combination}`,
            title: `${color} / ${size}`,
            color,
            size,
            sku: `${sku}-${skuPart(color)}-${skuPart(size)}`,
          };
        });
        const price = Math.min(...variants.map((variant) => variant.price));
        return await this.upsertProduct({ ...input, id, productNumber, sku, price, variants });
      } finally {
        release();
      }
    },

    async updateProduct(id: string, input: ProductCreateInput): Promise<Product> {
      const existing = await this.getProduct(id, false);
      if (!existing?.productNumber) throw new CommerceValidationError("Product not found.");
      const combinations = new Set<string>();
      const variants = input.variants.map((variant) => {
        const color = variant.color?.trim() || "Default";
        const size = variant.size?.trim() || "Free Size";
        const combination = `${slug(color)}:${slug(size)}`;
        if (combinations.has(combination)) throw new CommerceValidationError("Each colour and size combination must be unique.");
        combinations.add(combination);
        const previous = existing.variants?.find((item) => slug(item.color ?? "Default") === slug(color) && slug(item.size ?? "Free Size") === slug(size));
        return {
          ...variant,
          id: previous?.id ?? `${id}:${combination}`,
          title: `${color} / ${size}`,
          color,
          size,
          sku: `${existing.sku}-${skuPart(color)}-${skuPart(size)}`,
        };
      });
      const price = Math.min(...variants.map((variant) => variant.price));
      return this.upsertProduct({ ...input, id, productNumber: existing.productNumber, sku: existing.sku, price, variants });
    },

    async listCollections() {
      const db = await getClient();
      const result = await db.execute("SELECT id, title, description, active FROM commerce_collections ORDER BY title");
      return result.rows.map((row) => ({ id: String(row.id), title: String(row.title), description: String(row.description), active: bool(row.active) }));
    },

    async upsertProduct(input: ProductWriteInput): Promise<Product> {
      if (!/^[a-z0-9][a-z0-9-]{1,100}$/.test(input.id) || !input.name.trim() || !input.sku.trim()) {
        throw new CommerceValidationError("Product id, name, and SKU are required.");
      }
      if (!Number.isFinite(input.price) || input.price < 0 || !input.variants.length) {
        throw new CommerceValidationError("A product needs a valid price and at least one variant.");
      }
      const db = await getClient();
      const tx = await db.transaction("write");
      const now = new Date().toISOString();
      try {
        const existingIdentity = await tx.execute({ sql: "SELECT product_number FROM commerce_products WHERE id = ? LIMIT 1", args: [input.id] });
        const requestedNumber = existingIdentity.rows[0]?.product_number ?? input.productNumber;
        const numberOwner = requestedNumber == null ? null : await tx.execute({
          sql: "SELECT id FROM commerce_products WHERE product_number = ? AND id <> ? LIMIT 1",
          args: [Number(requestedNumber), input.id],
        });
        const maximum = await tx.execute("SELECT COALESCE(MAX(product_number), 1000) AS value FROM commerce_products");
        const productNumber = requestedNumber != null && !numberOwner?.rows[0]
          ? Number(requestedNumber)
          : Number(maximum.rows[0]?.value ?? 1000) + 1;
        await tx.execute({
          sql: `INSERT INTO commerce_products (
            id, product_number, name, category, price_minor, original_price_minor, image, hover_image, badge, colors_json,
            sizes_json, description, material, features_json, care, included, origin, delivery_estimate,
            sku, image_position, occasions_json, is_new, is_bestseller, fit, model_info, measurements,
            active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, category=excluded.category, price_minor=excluded.price_minor,
            original_price_minor=excluded.original_price_minor, image=excluded.image, hover_image=excluded.hover_image,
            badge=excluded.badge, colors_json=excluded.colors_json, sizes_json=excluded.sizes_json,
            description=excluded.description, material=excluded.material, features_json=excluded.features_json,
            care=excluded.care, included=excluded.included, origin=excluded.origin,
            delivery_estimate=excluded.delivery_estimate, sku=excluded.sku, image_position=excluded.image_position,
            occasions_json=excluded.occasions_json, is_new=excluded.is_new, is_bestseller=excluded.is_bestseller,
            fit=excluded.fit, model_info=excluded.model_info, measurements=excluded.measurements,
            active=excluded.active, updated_at=excluded.updated_at`,
          args: [input.id, productNumber, input.name.trim(), input.category, moneyToMinor(input.price), input.originalPrice == null ? null : moneyToMinor(input.originalPrice),
            input.image, input.hoverImage, input.badge ?? null, JSON.stringify(input.colors), JSON.stringify(input.sizes), input.description,
            input.material, JSON.stringify(input.features), input.care, input.included, input.origin, input.deliveryEstimate,
            input.sku.trim(), input.imagePosition ?? null, JSON.stringify(input.occasions ?? []), input.isNew ? 1 : 0,
            input.isBestseller ? 1 : 0, input.fit ?? null, input.modelInfo ?? null, input.measurements ?? null,
            input.active === false ? 0 : 1, now, now],
        });
        await tx.execute({ sql: "DELETE FROM commerce_images WHERE product_id = ?", args: [input.id] });
        for (const [index, image] of input.gallery.entries()) {
          await tx.execute({
            sql: "INSERT INTO commerce_images (id, product_id, url, alt, position, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
            args: [randomUUID(), input.id, image.src, image.alt, image.position ?? null, index],
          });
        }
        const ids = input.variants.map((variant) => variant.id);
        for (const variant of input.variants) {
          if (!variant.id || !variant.sku || !Number.isFinite(variant.price) || !Number.isInteger(variant.inventoryQuantity) || variant.inventoryQuantity < 0) {
            throw new CommerceValidationError("Every variant needs an id, SKU, price, and non-negative inventory.");
          }
          await tx.execute({
            sql: `INSERT INTO commerce_variants (id, product_id, title, color, size, sku, price_minor, inventory_quantity, active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id, title=excluded.title,
                    color=excluded.color, size=excluded.size, sku=excluded.sku, price_minor=excluded.price_minor,
                    inventory_quantity=excluded.inventory_quantity, active=excluded.active, updated_at=excluded.updated_at`,
            args: [variant.id, input.id, variant.title, variant.color ?? null, variant.size ?? null, variant.sku,
              moneyToMinor(variant.price), variant.inventoryQuantity, variant.active === false ? 0 : 1, now, now],
          });
        }
        const placeholders = ids.map(() => "?").join(",");
        await tx.execute({
          sql: `UPDATE commerce_variants SET active = 0, updated_at = ? WHERE product_id = ? AND id NOT IN (${placeholders})`,
          args: [now, input.id, ...ids],
        });
        for (const collectionId of ["all", slug(input.category)]) {
          await tx.execute({
            sql: "INSERT OR IGNORE INTO commerce_collection_products (collection_id, product_id, sort_order) VALUES (?, ?, 9999)",
            args: [collectionId, input.id],
          });
        }
        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }
      const saved = await db.execute({ sql: "SELECT * FROM commerce_products WHERE id = ? LIMIT 1", args: [input.id] });
      return (await hydrate(saved.rows as unknown as Array<Record<string, unknown>>))[0]!;
    },

    async setProductActive(productId: string, active: boolean) {
      const db = await getClient();
      const result = await db.execute({ sql: "UPDATE commerce_products SET active = ?, updated_at = ? WHERE id = ? RETURNING id", args: [active ? 1 : 0, new Date().toISOString(), productId] });
      if (!result.rows[0]) throw new CommerceValidationError("Product not found.");
    },

    async upsertCollection(input: { id: string; title: string; description: string; productIds: string[]; active: boolean }) {
      if (!/^[a-z0-9][a-z0-9-]{1,100}$/.test(input.id) || !input.title.trim()) throw new CommerceValidationError("Collection id and title are required.");
      const db = await getClient();
      const tx = await db.transaction("write");
      const now = new Date().toISOString();
      try {
        await tx.execute({
          sql: `INSERT INTO commerce_collections (id, title, description, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, active=excluded.active, updated_at=excluded.updated_at`,
          args: [input.id, input.title.trim(), input.description.trim(), input.active ? 1 : 0, now, now],
        });
        await tx.execute({ sql: "DELETE FROM commerce_collection_products WHERE collection_id = ?", args: [input.id] });
        for (const [index, productId] of [...new Set(input.productIds)].entries()) {
          await tx.execute({
            sql: "INSERT INTO commerce_collection_products (collection_id, product_id, sort_order) VALUES (?, ?, ?)",
            args: [input.id, productId, index],
          });
        }
        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    },

    async upsertDiscount(input: Omit<CommerceDiscount, "id" | "usedCount">): Promise<CommerceDiscount> {
      const code = input.code.trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) throw new CommerceValidationError("Coupon code must be 3–40 letters, numbers, hyphens, or underscores.");
      if (!(["percentage", "fixed_amount", "free_shipping"] as DiscountType[]).includes(input.type)) throw new CommerceValidationError("Choose a valid coupon type.");
      if (!(["all", "products", "collections"] as DiscountScope[]).includes(input.scope)) throw new CommerceValidationError("Choose a valid coupon scope.");
      if (!Number.isFinite(input.minimumOrder) || input.minimumOrder < 0) throw new CommerceValidationError("Minimum order must be zero or greater.");
      if (input.usageLimit != null && (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)) throw new CommerceValidationError("Usage limit must be a positive whole number.");
      if (input.type === "percentage" && (!Number.isFinite(input.value) || input.value <= 0 || input.value > 100)) throw new CommerceValidationError("Percentage must be between 1 and 100.");
      if (input.type === "fixed_amount" && (!Number.isFinite(input.value) || input.value <= 0)) throw new CommerceValidationError("Fixed discount must be greater than zero.");
      const db = await getClient();
      const tx = await db.transaction("write");
      const now = new Date().toISOString();
      try {
        const existing = await tx.execute({ sql: "SELECT id FROM commerce_discounts WHERE code = ? LIMIT 1", args: [code] });
        const id = String(existing.rows[0]?.id ?? randomUUID());
        const storedValue = input.type === "fixed_amount" ? moneyToMinor(input.value) : input.type === "percentage" ? Math.round(input.value) : 0;
        await tx.execute({
          sql: `INSERT INTO commerce_discounts (id, code, type, value, minimum_order_minor, usage_limit, used_count, scope, active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
                ON CONFLICT(code) DO UPDATE SET type=excluded.type, value=excluded.value,
                  minimum_order_minor=excluded.minimum_order_minor, usage_limit=excluded.usage_limit,
                  scope=excluded.scope, active=excluded.active, updated_at=excluded.updated_at`,
          args: [id, code, input.type, storedValue, moneyToMinor(input.minimumOrder), input.usageLimit ?? null, input.scope, input.active ? 1 : 0, now, now],
        });
        await tx.execute({ sql: "DELETE FROM commerce_discount_products WHERE discount_id = ?", args: [id] });
        await tx.execute({ sql: "DELETE FROM commerce_discount_collections WHERE discount_id = ?", args: [id] });
        if (input.scope === "products") {
          if (!input.productIds.length) throw new CommerceValidationError("Select at least one product for this coupon.");
          for (const productId of [...new Set(input.productIds)]) await tx.execute({
            sql: "INSERT INTO commerce_discount_products (discount_id, product_id) VALUES (?, ?)", args: [id, productId],
          });
        }
        if (input.scope === "collections") {
          if (!input.collectionIds.length) throw new CommerceValidationError("Select at least one collection for this coupon.");
          for (const collectionId of [...new Set(input.collectionIds)]) await tx.execute({
            sql: "INSERT INTO commerce_discount_collections (discount_id, collection_id) VALUES (?, ?)", args: [id, collectionId],
          });
        }
        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }
      return (await this.listDiscounts()).find((discount) => discount.code === code)!;
    },

    async listDiscounts(): Promise<CommerceDiscount[]> {
      const db = await getClient();
      const [discounts, products, collections] = await Promise.all([
        db.execute("SELECT * FROM commerce_discounts ORDER BY created_at DESC"),
        db.execute("SELECT discount_id, product_id FROM commerce_discount_products"),
        db.execute("SELECT discount_id, collection_id FROM commerce_discount_collections"),
      ]);
      return discounts.rows.map((row) => ({
        id: String(row.id), code: String(row.code), type: String(row.type) as DiscountType,
        value: String(row.type) === "fixed_amount" ? moneyFromMinor(row.value) : Number(row.value),
        minimumOrder: moneyFromMinor(row.minimum_order_minor), usageLimit: row.usage_limit == null ? undefined : Number(row.usage_limit),
        usedCount: Number(row.used_count), active: bool(row.active), scope: String(row.scope) as DiscountScope,
        productIds: products.rows.filter((item) => String(item.discount_id) === String(row.id)).map((item) => String(item.product_id)),
        collectionIds: collections.rows.filter((item) => String(item.discount_id) === String(row.id)).map((item) => String(item.collection_id)),
      }));
    },

    async setInventory(variantId: string, quantity: number, actor: string) {
      if (!Number.isInteger(quantity) || quantity < 0) throw new CommerceValidationError("Inventory must be a non-negative integer.");
      const db = await getClient();
      const tx = await db.transaction("write");
      const now = new Date().toISOString();
      try {
        const current = await tx.execute({ sql: "SELECT inventory_quantity FROM commerce_variants WHERE id = ?", args: [variantId] });
        if (!current.rows[0]) throw new CommerceValidationError("Variant not found.");
        const delta = quantity - Number(current.rows[0].inventory_quantity);
        await tx.execute({ sql: "UPDATE commerce_variants SET inventory_quantity = ?, updated_at = ? WHERE id = ?", args: [quantity, now, variantId] });
        await tx.execute({
          sql: "INSERT INTO commerce_inventory_movements (id, variant_id, delta, reason, order_id, actor, created_at) VALUES (?, ?, ?, 'adjustment', NULL, ?, ?)",
          args: [randomUUID(), variantId, delta, actor, now],
        });
        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    },

    async quoteOrder(input: { lines: Array<{ variantId: string; quantity: number }>; couponCode?: string }): Promise<CheckoutQuote> {
      if (!input.lines.length || input.lines.length > 50) throw new CommerceValidationError("Cart is empty or too large.");
      const quantities = new Map<string, number>();
      for (const line of input.lines) {
        if (!line.variantId || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw new CommerceValidationError("Invalid cart line.");
        quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + line.quantity);
      }
      const db = await getClient();
      const productSubtotals = new Map<string, number>();
      let subtotal = 0;
      for (const [variantId, quantity] of quantities) {
        const result = await db.execute({
          sql: `SELECT v.product_id, v.price_minor, v.inventory_quantity
                FROM commerce_variants v JOIN commerce_products p ON p.id = v.product_id
                WHERE v.id = ? AND v.active = 1 AND p.active = 1 LIMIT 1`, args: [variantId],
        });
        const variant = result.rows[0];
        if (!variant || Number(variant.inventory_quantity) < quantity) throw new InventoryUnavailableError();
        const lineSubtotal = moneyFromMinor(variant.price_minor) * quantity;
        subtotal += lineSubtotal;
        const productId = String(variant.product_id);
        productSubtotals.set(productId, (productSubtotals.get(productId) ?? 0) + lineSubtotal);
      }
      const calculation = await calculateCheckoutQuote(db, productSubtotals, subtotal, input.couponCode);
      return {
        subtotal: calculation.subtotal,
        shipping: calculation.shipping,
        discount: calculation.discount,
        total: calculation.total,
        ...(calculation.couponCode ? { couponCode: calculation.couponCode } : {}),
      };
    },

    async createOrder(input: { userId: string; addressId: string; lines: Array<{ variantId: string; quantity: number }>; idempotencyKey: string; paymentMethod: PaymentMethod; couponCode?: string }): Promise<CommerceOrder> {
      if (!input.idempotencyKey || input.idempotencyKey.length > 100) throw new CommerceValidationError("Invalid checkout attempt.");
      if (!input.lines.length || input.lines.length > 50) throw new CommerceValidationError("Cart is empty or too large.");
      if (input.paymentMethod !== "cod" && input.paymentMethod !== "cashfree") throw new CommerceValidationError("Unsupported payment method.");
      const quantities = new Map<string, number>();
      for (const line of input.lines) {
        if (!line.variantId || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw new CommerceValidationError("Invalid cart line.");
        quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + line.quantity);
      }
      const db = await getClient();
      const existing = await findIdempotentOrder(db, input.userId, input.idempotencyKey);
      if (existing) return existing;
      const tx = await db.transaction("write");
      try {
        const address = await tx.execute({ sql: "SELECT * FROM addresses WHERE id = ? AND user_id = ? LIMIT 1", args: [input.addressId, input.userId] });
        if (!address.rows[0]) throw new CheckoutAddressError();
        const lines: CommerceOrder["items"] = [];
        const productSubtotals = new Map<string, number>();
        for (const [variantId, quantity] of quantities) {
          const result = await tx.execute({
            sql: `SELECT v.*, p.name AS product_name, p.active AS product_active
                  FROM commerce_variants v JOIN commerce_products p ON p.id = v.product_id
                  WHERE v.id = ? AND v.active = 1 AND p.active = 1 LIMIT 1`, args: [variantId],
          });
          const variant = result.rows[0];
          if (!variant) throw new InventoryUnavailableError();
          const reserved = await tx.execute({
            sql: `UPDATE commerce_variants SET inventory_quantity = inventory_quantity - ?, updated_at = ?
                  WHERE id = ? AND inventory_quantity >= ? RETURNING inventory_quantity`,
            args: [quantity, new Date().toISOString(), variantId, quantity],
          });
          if (!reserved.rows[0]) throw new InventoryUnavailableError();
          const linePrice = moneyFromMinor(variant.price_minor);
          lines.push({ variantId, name: String(variant.product_name), sku: String(variant.sku),
            color: variant.color ? String(variant.color) : undefined, size: variant.size ? String(variant.size) : undefined,
            price: linePrice, quantity });
          const productId = String(variant.product_id);
          productSubtotals.set(productId, (productSubtotals.get(productId) ?? 0) + linePrice * quantity);
        }
        const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
        const { shipping, discount, discountId, couponCode, total } = await calculateCheckoutQuote(tx, productSubtotals, subtotal, input.couponCode);
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const number = `PE-${createdAt.slice(2, 10).replaceAll("-", "")}-${id.slice(0, 6).toUpperCase()}`;
        const itemsJson = JSON.stringify(lines.map((line) => ({ name: line.name, quantity: line.quantity })));
        await tx.execute({
          sql: "INSERT INTO orders (id, user_id, number, status, total, currency, items_json, created_at) VALUES (?, ?, ?, 'pending', ?, 'INR', ?, ?)",
          args: [id, input.userId, number, total, itemsJson, createdAt],
        });
        await tx.execute({
          sql: `INSERT INTO commerce_order_details (
                  order_id, user_id, idempotency_key, address_json, subtotal_minor, shipping_minor,
                  discount_code, discount_minor, payment_method, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, input.userId, input.idempotencyKey, JSON.stringify(address.rows[0]), moneyToMinor(subtotal),
            moneyToMinor(shipping), couponCode ?? null, moneyToMinor(discount), input.paymentMethod, createdAt],
        });
        for (const line of lines) {
          await tx.execute({
            sql: `INSERT INTO commerce_order_items (id, order_id, variant_id, product_name, variant_title, sku, color, size, price_minor, quantity)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [randomUUID(), id, line.variantId, line.name, [line.color, line.size].filter(Boolean).join(" / ") || "Default", line.sku, line.color ?? null, line.size ?? null, moneyToMinor(line.price), line.quantity],
          });
          await tx.execute({
            sql: "INSERT INTO commerce_inventory_movements (id, variant_id, delta, reason, order_id, actor, created_at) VALUES (?, ?, ?, 'order', ?, ?, ?)",
            args: [randomUUID(), line.variantId, -line.quantity, id, input.userId, createdAt],
          });
        }
        if (discountId) {
          const claimed = await tx.execute({
            sql: `UPDATE commerce_discounts SET used_count = used_count + 1, updated_at = ?
                  WHERE id = ? AND active = 1 AND (usage_limit IS NULL OR used_count < usage_limit)
                  RETURNING used_count`,
            args: [createdAt, discountId],
          });
          if (!claimed.rows[0]) throw new DiscountCodeError("This coupon has reached its usage limit.");
          await tx.execute({
            sql: "INSERT INTO commerce_discount_redemptions (discount_id, order_id, user_id, amount_minor, created_at) VALUES (?, ?, ?, ?, ?)",
            args: [discountId, id, input.userId, moneyToMinor(discount), createdAt],
          });
        }
        await tx.commit();
        return (await getOrder(id))!;
      } catch (error) {
        await tx.rollback();
        const concurrent = await findIdempotentOrder(db, input.userId, input.idempotencyKey);
        if (concurrent) return concurrent;
        throw error;
      }
    },

    async listOrders(): Promise<CommerceOrder[]> {
      const db = await getClient();
      const result = await db.execute("SELECT order_id FROM commerce_order_details ORDER BY rowid DESC");
      return (await Promise.all(result.rows.map((row) => getOrder(String(row.order_id))))).filter((order): order is CommerceOrder => Boolean(order));
    },

    async updateOrderStatus(orderId: string, status: OrderStatus, actor: string) {
      const transitions: Record<OrderStatus, OrderStatus[]> = {
        pending: ["paid", "failed", "cancelled", "fulfilled"],
        paid: ["fulfilled"],
        failed: [],
        cancelled: [],
        fulfilled: [],
      };
      if (!(status in transitions)) throw new CommerceValidationError("Invalid order status.");
      const db = await getClient();
      const tx = await db.transaction("write");
      const now = new Date().toISOString();
      try {
        const current = await tx.execute({ sql: "SELECT status FROM orders WHERE id = ? LIMIT 1", args: [orderId] });
        if (!current.rows[0]) throw new CommerceValidationError("Order not found.");
        const previous = String(current.rows[0].status) as OrderStatus;
        if (!transitions[previous]?.includes(status)) throw new CommerceValidationError("Invalid order status transition.");
        if (previous === "pending" && (status === "cancelled" || status === "failed")) {
          const items = await tx.execute({ sql: "SELECT variant_id, quantity FROM commerce_order_items WHERE order_id = ?", args: [orderId] });
          for (const item of items.rows) {
            await tx.execute({
              sql: "UPDATE commerce_variants SET inventory_quantity = inventory_quantity + ?, updated_at = ? WHERE id = ?",
              args: [Number(item.quantity), now, String(item.variant_id)],
            });
            await tx.execute({
              sql: "INSERT INTO commerce_inventory_movements (id, variant_id, delta, reason, order_id, actor, created_at) VALUES (?, ?, ?, 'restock', ?, ?, ?)",
              args: [randomUUID(), String(item.variant_id), Number(item.quantity), orderId, actor, now],
            });
          }
        }
        await tx.execute({ sql: "UPDATE orders SET status = ? WHERE id = ?", args: [status, orderId] });
        await tx.execute({
          sql: "INSERT INTO commerce_inventory_movements (id, variant_id, delta, reason, order_id, actor, created_at) VALUES (?, '', 0, ?, ?, ?, ?)",
          args: [randomUUID(), `status:${status}`, orderId, actor, now],
        });
        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    },

    async close() {
      client?.close();
      client = null;
      ready = null;
    },
  };
}

export const commerceStore = createCommerceStore();
