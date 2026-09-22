import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createCustomerStore } from "./customer-store";

describe("customer store", () => {
  it("does not create an account when an unknown customer attempts to log in", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      await expect(store.authenticatePassword("new@example.com", "a-long-test-password")).resolves.toBeNull();
      await expect(store.createPasswordUser({ name: "New Customer", email: "new@example.com", password: "a-long-test-password" })).resolves.toMatchObject({ email: "new@example.com" });
    } finally {
      await store.close();
    }
  });

  it("creates a password account that can authenticate", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      const created = await store.createPasswordUser({
        name: "Manthan Ahuja",
        email: "Manthan@Example.com",
        password: "a-long-test-password",
      });
      const authenticated = await store.authenticatePassword("manthan@example.com", "a-long-test-password");

      expect(created.email).toBe("manthan@example.com");
      expect(authenticated).toMatchObject({ id: created.id, name: "Manthan Ahuja" });
    } finally {
      await store.close();
    }
  });

  it("persists a cart for its owner", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      const customer = await store.upsertGoogleUser({ name: "Manthan", email: "cart@example.com", subject: "google-cart" });
      const cart = { items: [], itemCount: 0, subtotal: 0 };
      await expect(store.saveCart(customer.id, cart, 0)).resolves.toBe(1);

      await expect(store.getCart(customer.id)).resolves.toEqual({ cart, version: 1 });
      await expect(store.saveCart(customer.id, cart, 0)).rejects.toThrow("Cart version conflict");
    } finally {
      await store.close();
    }
  });

  it("maintains one default address through customer address changes", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      const customer = await store.upsertGoogleUser({ name: "Manthan", email: "address@example.com", subject: "google-address" });
      const home = await store.saveAddress(customer.id, {
        label: "Home", fullName: "Manthan Ahuja", phone: "9820081628",
        address1: "1 Heritage Lane", address2: "", city: "Mumbai", state: "Maharashtra",
        postalCode: "400001", country: "India", isDefault: true,
      });
      const work = await store.saveAddress(customer.id, {
        label: "Work", fullName: "Manthan Ahuja", phone: "9820081628",
        address1: "2 Studio Road", address2: "", city: "Mumbai", state: "Maharashtra",
        postalCode: "400002", country: "India", isDefault: true,
      });

      const addresses = await store.listAddresses(customer.id);
      expect(addresses).toHaveLength(2);
      expect(addresses.find((address) => address.id === home.id)?.isDefault).toBe(false);
      expect(addresses.find((address) => address.id === work.id)?.isDefault).toBe(true);
      await store.deleteAddress(customer.id, work.id);
      await expect(store.listAddresses(customer.id)).resolves.toHaveLength(1);
    } finally {
      await store.close();
    }
  });

  it("rejects a foreign address id without clearing the caller's default", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      const customer = await store.upsertGoogleUser({ name: "Customer", email: "address-owner@example.com", subject: "google-address-owner" });
      const other = await store.upsertGoogleUser({ name: "Other", email: "address-other@example.com", subject: "google-address-other" });
      const own = await store.saveAddress(customer.id, {
        label: "Home", fullName: "Customer", phone: "9820081628", address1: "1 Own Lane",
        address2: "", city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "India", isDefault: true,
      });
      const foreign = await store.saveAddress(other.id, {
        label: "Other", fullName: "Other", phone: "9820081628", address1: "2 Other Lane",
        address2: "", city: "Mumbai", state: "Maharashtra", postalCode: "400002", country: "India", isDefault: true,
      });

      await expect(store.saveAddress(customer.id, {
        id: foreign.id, label: "Stolen", fullName: "Customer", phone: "9820081628", address1: "3 Bad Lane",
        address2: "", city: "Mumbai", state: "Maharashtra", postalCode: "400003", country: "India", isDefault: true,
      })).rejects.toThrow("Address not found");
      await expect(store.listAddresses(customer.id)).resolves.toMatchObject([{ id: own.id, isDefault: true }]);
    } finally {
      await store.close();
    }
  });

  it("lists only the authenticated customer's orders", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      const customer = await store.upsertGoogleUser({ name: "Manthan", email: "orders@example.com", subject: "google-orders" });
      const other = await store.upsertGoogleUser({ name: "Other", email: "other@example.com", subject: "google-other" });
      await store.recordOrder(customer.id, {
        id: "order-1", number: "PE-1001", status: "paid", total: 4990, currency: "INR",
        createdAt: "2026-09-20T10:00:00.000Z", items: [{ name: "Silk Saree", quantity: 1 }],
      });
      await store.recordOrder(other.id, {
        id: "order-2", number: "PE-1002", status: "paid", total: 2990, currency: "INR",
        createdAt: "2026-09-20T11:00:00.000Z", items: [],
      });

      await expect(store.listOrders(customer.id)).resolves.toMatchObject([{ id: "order-1", number: "PE-1001" }]);
    } finally {
      await store.close();
    }
  });

  it("does not link Google to an unverified password account with the same email", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      await store.createPasswordUser({ name: "Victim", email: "victim@example.com", password: "attacker-password" });
      await expect(store.upsertGoogleUser({
        name: "Victim", email: "victim@example.com", subject: "real-google-subject",
      })).rejects.toThrow("Account linking required");
    } finally {
      await store.close();
    }
  });

  it("keeps the same Google customer when the provider email changes", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      const first = await store.upsertGoogleUser({ name: "Manthan", email: "old@example.com", subject: "google-stable-subject" });
      const second = await store.upsertGoogleUser({ name: "Manthan Ahuja", email: "new@example.com", subject: "google-stable-subject" });

      expect(second).toMatchObject({ id: first.id, name: "Manthan Ahuja", email: "new@example.com" });
    } finally {
      await store.close();
    }
  });

  it("reuses the same customer for repeated Google sign-ins", async () => {
    const databasePath = join(process.cwd(), ".data", `customer-store-${randomUUID()}.db`);
    const store = createCustomerStore(`file:${databasePath.replaceAll("\\", "/")}`);

    try {
      const first = await store.upsertGoogleUser({ name: "Manthan", email: "manthan@example.com", subject: "google-manthan" });
      const second = await store.upsertGoogleUser({ name: "Manthan Ahuja", email: "Manthan@example.com", subject: "google-manthan" });

      expect(second).toMatchObject({ id: first.id, name: "Manthan Ahuja", email: "manthan@example.com" });
    } finally {
      await store.close();
    }
  });
});
