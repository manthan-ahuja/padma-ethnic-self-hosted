import { createClient, type Client } from "@libsql/client";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import type { CartState } from "./types";

const scrypt = promisify(scryptCallback);

export class AccountLinkRequiredError extends Error {
  constructor() { super("Account linking required"); }
}

export class CartVersionConflictError extends Error {
  constructor() { super("Cart version conflict"); }
}

export class AddressOwnershipError extends Error {
  constructor() { super("Address not found"); }
}

export type CustomerUser = {
  id: string;
  name: string;
  email: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type CustomerAddressInput = Omit<CustomerAddress, "id"> & { id?: string };

export type CustomerOrder = {
  id: string;
  number: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "fulfilled";
  total: number;
  currency: string;
  createdAt: string;
  items: Array<{ name: string; quantity: number }>;
};

type PasswordUserInput = {
  name: string;
  email: string;
  password: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function passwordMatches(password: string, encoded: string) {
  const [salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function prepareFileDatabase(url: string) {
  if (!url.startsWith("file:")) return;
  const path = url.slice("file:".length);
  await mkdir(dirname(path), { recursive: true });
}

export function createCustomerStore(url = process.env.CUSTOMER_DATABASE_URL ?? "file:.data/padma.db", authToken = process.env.CUSTOMER_DATABASE_AUTH_TOKEN) {
  let client: Client | null = null;
  let ready: Promise<Client> | null = null;

  const getClient = () => {
    if (!ready) {
      ready = (async () => {
        await prepareFileDatabase(url);
        client = createClient({ url, ...(authToken ? { authToken } : {}) });
        await client.execute(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            created_at TEXT NOT NULL
          )
        `);
        const userColumns = await client.execute("PRAGMA table_info(users)");
        if (!userColumns.rows.some((row) => String(row.name) === "google_subject")) {
          await client.execute("ALTER TABLE users ADD COLUMN google_subject TEXT");
        }
        await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject_unique ON users(google_subject) WHERE google_subject IS NOT NULL");
        await client.execute(`
          CREATE TABLE IF NOT EXISTS carts (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            state_json TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 0
          )
        `);
        const cartColumns = await client.execute("PRAGMA table_info(carts)");
        if (!cartColumns.rows.some((row) => String(row.name) === "version")) {
          await client.execute("ALTER TABLE carts ADD COLUMN version INTEGER NOT NULL DEFAULT 0");
        }
        await client.execute(`
          CREATE TABLE IF NOT EXISTS addresses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            label TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            address1 TEXT NOT NULL,
            address2 TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            country TEXT NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          )
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            number TEXT NOT NULL,
            status TEXT NOT NULL,
            total REAL NOT NULL,
            currency TEXT NOT NULL,
            items_json TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        `);
        return client;
      })();
    }
    return ready;
  };

  return {
    async createPasswordUser(input: PasswordUserInput): Promise<CustomerUser> {
      const db = await getClient();
      const user = {
        id: randomUUID(),
        name: input.name.trim(),
        email: normalizeEmail(input.email),
      };
      const passwordHash = await hashPassword(input.password);
      await db.execute({
        sql: "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [user.id, user.name, user.email, passwordHash, new Date().toISOString()],
      });
      return user;
    },

    async authenticatePassword(email: string, password: string): Promise<CustomerUser | null> {
      const db = await getClient();
      const result = await db.execute({
        sql: "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
        args: [normalizeEmail(email)],
      });
      const row = result.rows[0];
      if (!row?.password_hash) {
        await scrypt(password, "padma-authentication-dummy-salt", 64);
        return null;
      }
      if (!await passwordMatches(password, String(row.password_hash))) return null;
      return { id: String(row.id), name: String(row.name), email: String(row.email) };
    },

    async upsertGoogleUser(input: { name: string; email: string; subject: string }): Promise<CustomerUser> {
      const db = await getClient();
      const email = normalizeEmail(input.email);
      const name = input.name.trim() || email.split("@")[0];
      const existingSubject = await db.execute({
        sql: "SELECT id FROM users WHERE google_subject = ? LIMIT 1",
        args: [input.subject],
      });
      const existingId = existingSubject.rows[0]?.id;
      if (existingId) {
        try {
          const updated = await db.execute({
            sql: "UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING id, name, email",
            args: [name, email, existingId],
          });
          const row = updated.rows[0];
          return { id: String(row.id), name: String(row.name), email: String(row.email) };
        } catch (error) {
          if (String(error).includes("UNIQUE")) throw new AccountLinkRequiredError();
          throw error;
        }
      }
      const result = await db.execute({
        sql: `INSERT INTO users (id, name, email, password_hash, created_at, google_subject)
              VALUES (?, ?, ?, NULL, ?, ?)
              ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                google_subject = COALESCE(users.google_subject, excluded.google_subject)
              WHERE users.password_hash IS NULL
                AND (users.google_subject IS NULL OR users.google_subject = excluded.google_subject)
              RETURNING id, name, email`,
        args: [randomUUID(), name, email, new Date().toISOString(), input.subject],
      });
      const row = result.rows[0];
      if (!row) throw new AccountLinkRequiredError();
      return { id: String(row.id), name: String(row.name), email: String(row.email) };
    },

    async findGoogleUserByEmail(email: string): Promise<CustomerUser | null> {
      const db = await getClient();
      const result = await db.execute({
        sql: "SELECT id, name, email FROM users WHERE email = ? AND password_hash IS NULL AND google_subject IS NOT NULL LIMIT 1",
        args: [normalizeEmail(email)],
      });
      const row = result.rows[0];
      return row ? { id: String(row.id), name: String(row.name), email: String(row.email) } : null;
    },

    async saveCart(userId: string, cart: CartState, expectedVersion: number): Promise<number> {
      const db = await getClient();
      const serialized = JSON.stringify(cart);
      const updatedAt = new Date().toISOString();
      const updated = await db.execute({
        sql: `UPDATE carts SET state_json = ?, updated_at = ?, version = version + 1
              WHERE user_id = ? AND version = ? RETURNING version`,
        args: [serialized, updatedAt, userId, expectedVersion],
      });
      if (updated.rows[0]) return Number(updated.rows[0].version);
      if (expectedVersion !== 0) throw new CartVersionConflictError();
      const inserted = await db.execute({
        sql: `INSERT INTO carts (user_id, state_json, updated_at, version) VALUES (?, ?, ?, 1)
              ON CONFLICT(user_id) DO NOTHING RETURNING version`,
        args: [userId, serialized, updatedAt],
      });
      if (!inserted.rows[0]) throw new CartVersionConflictError();
      return Number(inserted.rows[0].version);
    },

    async getCart(userId: string): Promise<{ cart: CartState; version: number } | null> {
      const db = await getClient();
      const result = await db.execute({
        sql: "SELECT state_json, version FROM carts WHERE user_id = ? LIMIT 1",
        args: [userId],
      });
      const value = result.rows[0]?.state_json;
      return value ? { cart: JSON.parse(String(value)) as CartState, version: Number(result.rows[0].version) } : null;
    },

    async saveAddress(userId: string, input: CustomerAddressInput): Promise<CustomerAddress> {
      const db = await getClient();
      const address: CustomerAddress = { ...input, id: input.id ?? randomUUID() };
      const statements = [{
        sql: `INSERT INTO addresses (
                id, user_id, label, full_name, phone, address1, address2, city, state,
                postal_code, country, is_default, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                label = excluded.label, full_name = excluded.full_name, phone = excluded.phone,
                address1 = excluded.address1, address2 = excluded.address2, city = excluded.city,
                state = excluded.state, postal_code = excluded.postal_code,
                country = excluded.country, is_default = excluded.is_default
              WHERE addresses.user_id = excluded.user_id
              RETURNING id`,
        args: [
          address.id, userId, address.label, address.fullName, address.phone, address.address1,
          address.address2, address.city, address.state, address.postalCode, address.country,
          address.isDefault ? 1 : 0, new Date().toISOString(),
        ],
      }];
      if (address.isDefault) {
        statements.push({
          sql: `UPDATE addresses SET is_default = 0
                WHERE user_id = ? AND id <> ?
                  AND EXISTS (SELECT 1 FROM addresses target WHERE target.id = ? AND target.user_id = ?)`,
          args: [userId, address.id, address.id, userId],
        });
      }
      const results = await db.batch(statements, "write");
      if (!results[0].rows[0]) throw new AddressOwnershipError();
      return address;
    },

    async listAddresses(userId: string): Promise<CustomerAddress[]> {
      const db = await getClient();
      const result = await db.execute({
        sql: `SELECT id, label, full_name, phone, address1, address2, city, state,
                     postal_code, country, is_default
              FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
        args: [userId],
      });
      return result.rows.map((row) => ({
        id: String(row.id), label: String(row.label), fullName: String(row.full_name),
        phone: String(row.phone), address1: String(row.address1), address2: String(row.address2),
        city: String(row.city), state: String(row.state), postalCode: String(row.postal_code),
        country: String(row.country), isDefault: Boolean(row.is_default),
      }));
    },

    async deleteAddress(userId: string, addressId: string): Promise<void> {
      const db = await getClient();
      await db.batch([
        { sql: "DELETE FROM addresses WHERE id = ? AND user_id = ?", args: [addressId, userId] },
        {
          sql: `UPDATE addresses SET is_default = 1
                WHERE id = (SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at LIMIT 1)
                  AND NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = ? AND is_default = 1)`,
          args: [userId, userId],
        },
      ], "write");
    },

    async recordOrder(userId: string, order: CustomerOrder): Promise<void> {
      const db = await getClient();
      await db.execute({
        sql: `INSERT INTO orders (id, user_id, number, status, total, currency, items_json, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET status = excluded.status, items_json = excluded.items_json
              WHERE orders.user_id = excluded.user_id`,
        args: [
          order.id, userId, order.number, order.status, order.total, order.currency,
          JSON.stringify(order.items), order.createdAt,
        ],
      });
    },

    async listOrders(userId: string): Promise<CustomerOrder[]> {
      const db = await getClient();
      const result = await db.execute({
        sql: `SELECT id, number, status, total, currency, items_json, created_at
              FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
        args: [userId],
      });
      return result.rows.map((row) => ({
        id: String(row.id), number: String(row.number),
        status: String(row.status) as CustomerOrder["status"],
        total: Number(row.total), currency: String(row.currency), createdAt: String(row.created_at),
        items: JSON.parse(String(row.items_json)) as CustomerOrder["items"],
      }));
    },

    async close() {
      client?.close();
      client = null;
      ready = null;
    },
  };
}

export const customerStore = createCustomerStore();
