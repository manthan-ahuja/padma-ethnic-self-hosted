import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCustomerStore } from "./customer-store";
import { createCommerceStore, InventoryUnavailableError } from "./commerce-store";

const stores: Array<{ close(): Promise<void> }> = [];

function databaseUrl() {
  const path = join(process.cwd(), ".data", `commerce-store-${randomUUID()}.db`);
  return `file:${path.replaceAll("\\", "/")}`;
}

async function setupCustomer(url: string, email = "buyer@example.com") {
  const customers = createCustomerStore(url);
  stores.push(customers);
  const customer = await customers.createPasswordUser({ name: "Padma Buyer", email, password: "a-long-test-password" });
  const address = await customers.saveAddress(customer.id, {
    label: "Home", fullName: "Padma Buyer", phone: "9820081628", address1: "1 Heritage Lane",
    address2: "", city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "India", isDefault: true,
  });
  return { customers, customer, address };
}

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.close()));
});

describe("self-hosted commerce store", () => {
  it("initializes one local commerce database safely across concurrent clients", async () => {
    const url = databaseUrl();
    const concurrentStores = Array.from({ length: 8 }, () => createCommerceStore(url));
    stores.push(...concurrentStores);

    const catalogs = await Promise.all(concurrentStores.map((store) => store.listProducts()));

    expect(catalogs.every((products) => products.length === 8)).toBe(true);
  });

  it("seeds a storefront-ready catalog with local variants and inventory", async () => {
    const commerce = createCommerceStore(databaseUrl());
    stores.push(commerce);

    const products = await commerce.listProducts();

    expect(products).toHaveLength(8);
    expect(products[0]).toMatchObject({ source: "commerce" });
    expect(products[0].variants?.length).toBeGreaterThan(0);
    expect(products[0].variants?.every((variant) => variant.id.startsWith(`${products[0].id}:`) && variant.inventoryQuantity === 10)).toBe(true);
    await expect(commerce.getProduct(products[0].id)).resolves.toMatchObject({ id: products[0].id });
  });

  it("creates an idempotent COD order from authoritative prices and decrements inventory once", async () => {
    const url = databaseUrl();
    const { customers, customer, address } = await setupCustomer(url);
    const commerce = createCommerceStore(url);
    stores.push(commerce);
    const product = (await commerce.listProducts())[0];
    const variant = product.variants![0];

    const first = await commerce.createOrder({
      userId: customer.id,
      addressId: address.id,
      lines: [{ variantId: variant.id, quantity: 2 }],
      idempotencyKey: "checkout-attempt-1",
      paymentMethod: "cod",
    });
    const repeated = await commerce.createOrder({
      userId: customer.id,
      addressId: address.id,
      lines: [{ variantId: variant.id, quantity: 2 }],
      idempotencyKey: "checkout-attempt-1",
      paymentMethod: "cod",
    });

    const expectedSubtotal = product.price * 2;
    const expectedTotal = expectedSubtotal + (expectedSubtotal >= 10_000 ? 0 : 199);
    expect(first).toMatchObject({ id: repeated.id, status: "pending", subtotal: expectedSubtotal, total: expectedTotal, paymentMethod: "cod" });
    expect((await commerce.getProduct(product.id))?.variants?.[0].inventoryQuantity).toBe(8);
    await expect(customers.listOrders(customer.id)).resolves.toMatchObject([{ id: first.id, total: expectedTotal }]);
  });

  it("rejects unavailable inventory without creating or partially reserving an order", async () => {
    const url = databaseUrl();
    const { customers, customer, address } = await setupCustomer(url);
    const commerce = createCommerceStore(url);
    stores.push(commerce);
    const product = (await commerce.listProducts())[0];
    const variant = product.variants![0];

    await expect(commerce.createOrder({
      userId: customer.id,
      addressId: address.id,
      lines: [{ variantId: variant.id, quantity: 11 }],
      idempotencyKey: "checkout-no-stock",
      paymentMethod: "cod",
    })).rejects.toBeInstanceOf(InventoryUnavailableError);

    expect((await commerce.getProduct(product.id))?.variants?.[0].inventoryQuantity).toBe(10);
    await expect(customers.listOrders(customer.id)).resolves.toEqual([]);
  });

  it("rejects an address owned by another customer", async () => {
    const url = databaseUrl();
    const owner = await setupCustomer(url, "owner@example.com");
    const otherStore = createCustomerStore(url);
    stores.push(otherStore);
    const other = await otherStore.createPasswordUser({ name: "Other", email: "other@example.com", password: "a-long-test-password" });
    const commerce = createCommerceStore(url);
    stores.push(commerce);
    const variant = (await commerce.listProducts())[0].variants![0];

    await expect(commerce.createOrder({
      userId: other.id,
      addressId: owner.address.id,
      lines: [{ variantId: variant.id, quantity: 1 }],
      idempotencyKey: "checkout-foreign-address",
      paymentMethod: "cod",
    })).rejects.toThrow("Address not found");
  });

  it("automatically assigns sequential product numbers and deterministic variant SKUs", async () => {
    const commerce = createCommerceStore(databaseUrl());
    stores.push(commerce);
    const template = (await commerce.listProducts())[0];

    const first = await commerce.createProduct({
      ...template,
      name: "Midnight Lotus Set",
      colors: ["Navy", "Ivory"],
      sizes: ["S", "M"],
      variants: [
        { title: "Navy / S", color: "Navy", size: "S", price: 8400, inventoryQuantity: 2 },
        { title: "Navy / M", color: "Navy", size: "M", price: 8400, inventoryQuantity: 3 },
        { title: "Ivory / S", color: "Ivory", size: "S", price: 8400, inventoryQuantity: 4 },
        { title: "Ivory / M", color: "Ivory", size: "M", price: 8400, inventoryQuantity: 5 },
      ],
    });
    const second = await commerce.createProduct({
      ...template,
      name: "Rose Garden Saree",
      colors: ["Rose"],
      sizes: ["Free Size"],
      variants: [{ title: "Rose / Free Size", color: "Rose", size: "Free Size", price: 6900, inventoryQuantity: 6 }],
    });

    expect(first).toMatchObject({ id: "midnight-lotus-set-1009", productNumber: 1009, sku: "PE-1009" });
    expect(first.variants?.map((variant) => variant.sku).sort()).toEqual([
      "PE-1009-IVORY-M", "PE-1009-IVORY-S", "PE-1009-NAVY-M", "PE-1009-NAVY-S",
    ]);
    expect(Object.fromEntries(first.variants?.map((variant) => [variant.sku, variant.inventoryQuantity]) ?? [])).toEqual({
      "PE-1009-NAVY-S": 2,
      "PE-1009-NAVY-M": 3,
      "PE-1009-IVORY-S": 4,
      "PE-1009-IVORY-M": 5,
    });
    expect(second).toMatchObject({ id: "rose-garden-saree-1010", productNumber: 1010, sku: "PE-1010" });
  });

  it("reserves unique product numbers and SKUs for concurrent product creation", async () => {
    const commerce = createCommerceStore(databaseUrl());
    stores.push(commerce);
    const template = (await commerce.listProducts())[0];
    const input = {
      ...template,
      name: "Concurrent Festive Set",
      colors: ["Wine"],
      sizes: ["M"],
      variants: [{ title: "Wine / M", color: "Wine", size: "M", price: 7500, inventoryQuantity: 3 }],
    };

    const created = await Promise.all([commerce.createProduct(input), commerce.createProduct(input)]);

    expect(created.map((product) => product.productNumber).sort()).toEqual([1009, 1010]);
    expect(new Set(created.map((product) => product.id)).size).toBe(2);
    expect(new Set(created.map((product) => product.sku)).size).toBe(2);
  });

  it("lets administrators create products and assign custom collections", async () => {
    const commerce = createCommerceStore(databaseUrl());
    stores.push(commerce);
    const template = (await commerce.listProducts())[0];
    const created = await commerce.upsertProduct({
      ...template,
      id: "admin-created-piece",
      name: "Admin Created Piece",
      sku: "PAD-ADMIN-01",
      variants: [{
        id: "admin-created-piece:indigo:m",
        title: "Indigo / M",
        color: "Indigo",
        size: "M",
        sku: "PAD-ADMIN-01-IND-M",
        price: 7200,
        inventoryQuantity: 4,
      }],
    });
    expect((await commerce.getProduct(created.id))?.name).toBe("Admin Created Piece");
    expect((await commerce.listProducts({ collectionId: "all" })).some((product) => product.id === created.id)).toBe(true);
    await commerce.upsertCollection({ id: "editor-picks", title: "Editor picks", description: "A considered edit.", productIds: [created.id], active: true });

    await expect(commerce.getProduct(created.id)).resolves.toMatchObject({ name: "Admin Created Piece", price: 7200 });
    await expect(commerce.listProducts({ collectionId: "editor-picks" })).resolves.toMatchObject([{ id: created.id }]);

    await commerce.setProductActive(created.id, false);
    await expect(commerce.getProduct(created.id)).resolves.toBeUndefined();
    await expect(commerce.getProduct(created.id, false)).resolves.toMatchObject({ id: created.id });
  });

  it("edits every catalogue field while preserving the generated product identity", async () => {
    const commerce = createCommerceStore(databaseUrl());
    stores.push(commerce);
    const template = (await commerce.listProducts())[0];
    const created = await commerce.createProduct({
      ...template,
      name: "Editable Kurta",
      colors: ["Teal"],
      sizes: ["S"],
      variants: [{ title: "Teal / S", color: "Teal", size: "S", price: 5000, inventoryQuantity: 2 }],
    });

    const updated = await commerce.updateProduct(created.id, {
      ...created,
      name: "Editable Festive Kurta",
      description: "Updated product story.",
      material: "Handwoven silk",
      gallery: [{ src: "https://example.com/updated.jpg", alt: "Updated kurta" }],
      image: "https://example.com/updated.jpg",
      hoverImage: "https://example.com/updated.jpg",
      colors: ["Teal", "Custom Copper"],
      sizes: ["M", "Custom 4XL"],
      variants: [
        { title: "Teal / M", color: "Teal", size: "M", price: 5500, inventoryQuantity: 7 },
        { title: "Custom Copper / Custom 4XL", color: "Custom Copper", size: "Custom 4XL", price: 5900, inventoryQuantity: 1 },
      ],
    });

    expect(updated).toMatchObject({
      id: created.id,
      productNumber: created.productNumber,
      sku: created.sku,
      name: "Editable Festive Kurta",
      description: "Updated product story.",
      material: "Handwoven silk",
      colors: ["Teal", "Custom Copper"],
      sizes: ["M", "Custom 4XL"],
    });
    expect(updated.variants).toHaveLength(2);
    expect(Object.fromEntries(updated.variants!.map((variant) => [variant.size, variant.inventoryQuantity]))).toEqual({ M: 7, "Custom 4XL": 1 });
  });

  it("applies an active percentage coupon once the minimum order value is met and enforces its usage limit", async () => {
    const url = databaseUrl();
    const firstBuyer = await setupCustomer(url, "coupon-one@example.com");
    const secondBuyer = await setupCustomer(url, "coupon-two@example.com");
    const commerce = createCommerceStore(url);
    stores.push(commerce);
    const product = (await commerce.listProducts())[0];
    const variant = product.variants![0];
    await commerce.upsertDiscount({
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      minimumOrder: 1000,
      usageLimit: 1,
      active: true,
      scope: "all",
      productIds: [],
      collectionIds: [],
    });

    const quote = await commerce.quoteOrder({
      lines: [{ variantId: variant.id, quantity: 1 }],
      couponCode: " welcome10 ",
    });
    const expectedDiscount = Math.round(product.price * 0.1);
    const shipping = product.price >= 10_000 ? 0 : 199;
    expect(quote).toEqual({ subtotal: product.price, shipping, discount: expectedDiscount, total: product.price - expectedDiscount + shipping, couponCode: "WELCOME10" });
    expect((await commerce.getProduct(product.id))?.variants?.[0].inventoryQuantity).toBe(10);
    expect((await commerce.listDiscounts()).find((discount) => discount.code === "WELCOME10")?.usedCount).toBe(0);

    const order = await commerce.createOrder({
      userId: firstBuyer.customer.id,
      addressId: firstBuyer.address.id,
      lines: [{ variantId: variant.id, quantity: 1 }],
      idempotencyKey: "coupon-order-one",
      paymentMethod: "cod",
      couponCode: " welcome10 ",
    });

    expect(order).toMatchObject({ couponCode: "WELCOME10", discount: expectedDiscount, total: product.price - expectedDiscount + shipping });
    await expect(commerce.createOrder({
      userId: secondBuyer.customer.id,
      addressId: secondBuyer.address.id,
      lines: [{ variantId: variant.id, quantity: 1 }],
      idempotencyKey: "coupon-order-two",
      paymentMethod: "cod",
      couponCode: "WELCOME10",
    })).rejects.toThrow("usage limit");
  });

  it("supports fixed-amount and free-shipping coupons with minimum order validation", async () => {
    const url = databaseUrl();
    const fixedBuyer = await setupCustomer(url, "fixed-coupon@example.com");
    const shippingBuyer = await setupCustomer(url, "shipping-coupon@example.com");
    const commerce = createCommerceStore(url);
    stores.push(commerce);
    const product = (await commerce.listProducts())[0];
    const variant = product.variants![0];
    await commerce.upsertDiscount({ code: "SAVE500", type: "fixed_amount", value: 500, minimumOrder: product.price + 1,
      active: true, scope: "all", productIds: [], collectionIds: [] });
    await expect(commerce.createOrder({ userId: fixedBuyer.customer.id, addressId: fixedBuyer.address.id,
      lines: [{ variantId: variant.id, quantity: 1 }], idempotencyKey: "fixed-too-low", paymentMethod: "cod", couponCode: "SAVE500" }))
      .rejects.toThrow("Minimum order value");

    await commerce.upsertDiscount({ code: "SAVE500", type: "fixed_amount", value: 500, minimumOrder: 0,
      active: true, scope: "all", productIds: [], collectionIds: [] });
    const fixedOrder = await commerce.createOrder({ userId: fixedBuyer.customer.id, addressId: fixedBuyer.address.id,
      lines: [{ variantId: variant.id, quantity: 1 }], idempotencyKey: "fixed-valid", paymentMethod: "cod", couponCode: "SAVE500" });
    expect(fixedOrder.discount).toBe(500);

    await commerce.upsertDiscount({ code: "SHIPFREE", type: "free_shipping", value: 0, minimumOrder: 0,
      active: true, scope: "all", productIds: [], collectionIds: [] });
    const shippingOrder = await commerce.createOrder({ userId: shippingBuyer.customer.id, addressId: shippingBuyer.address.id,
      lines: [{ variantId: variant.id, quantity: 1 }], idempotencyKey: "shipping-valid", paymentMethod: "cod", couponCode: "SHIPFREE" });
    expect(shippingOrder).toMatchObject({ shipping: 0, discount: 0, total: product.price });
  });

  it("restocks a cancelled order exactly once", async () => {
    const url = databaseUrl();
    const { customer, address } = await setupCustomer(url);
    const commerce = createCommerceStore(url);
    stores.push(commerce);
    const product = (await commerce.listProducts())[0];
    const variant = product.variants![0];
    const order = await commerce.createOrder({
      userId: customer.id, addressId: address.id, lines: [{ variantId: variant.id, quantity: 2 }],
      idempotencyKey: "checkout-cancel", paymentMethod: "cod",
    });

    await commerce.updateOrderStatus(order.id, "cancelled", "admin@example.com");
    expect((await commerce.getProduct(product.id))?.variants?.[0].inventoryQuantity).toBe(10);
    await expect(commerce.updateOrderStatus(order.id, "cancelled", "admin@example.com")).rejects.toThrow("Invalid order status transition");
    expect((await commerce.getProduct(product.id))?.variants?.[0].inventoryQuantity).toBe(10);
  });

  it("lets administrators update inventory and order fulfillment state", async () => {
    const url = databaseUrl();
    const { customer, address } = await setupCustomer(url);
    const commerce = createCommerceStore(url);
    stores.push(commerce);
    const product = (await commerce.listProducts())[0];
    const variant = product.variants![0];

    await commerce.setInventory(variant.id, 3, "admin@example.com");
    expect((await commerce.getProduct(product.id))?.variants?.[0].inventoryQuantity).toBe(3);

    const order = await commerce.createOrder({
      userId: customer.id,
      addressId: address.id,
      lines: [{ variantId: variant.id, quantity: 1 }],
      idempotencyKey: "checkout-admin-status",
      paymentMethod: "cod",
    });
    await commerce.updateOrderStatus(order.id, "fulfilled", "admin@example.com");

    await expect(commerce.listOrders()).resolves.toMatchObject([{ id: order.id, status: "fulfilled" }]);
  });
});
