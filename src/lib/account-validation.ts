import type { CustomerAddressInput } from "./customer-store";

function text(value: unknown, field: string, maxLength = 120) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${field} is too long`);
  return normalized;
}

export function parseRegistration(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Registration details are required");
  const input = value as Record<string, unknown>;
  const name = text(input.name, "Name", 80);
  const email = text(input.email, "Email", 254).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  if (password.length > 128) throw new Error("Password is too long");
  return { name, email, password };
}

export function parseAddress(value: unknown): CustomerAddressInput {
  if (!value || typeof value !== "object") throw new Error("Address details are required");
  const input = value as Record<string, unknown>;
  const phone = text(input.phone, "Phone", 24);
  if (!/^[+()\d\s-]{7,24}$/.test(phone)) throw new Error("Enter a valid phone number");
  const postalCode = text(input.postalCode, "Postal code", 16);
  if (!/^[A-Za-z0-9 -]{3,16}$/.test(postalCode)) throw new Error("Enter a valid postal code");
  return {
    ...(typeof input.id === "string" && input.id ? { id: input.id } : {}),
    label: text(input.label, "Label", 32),
    fullName: text(input.fullName, "Full name", 80),
    phone,
    address1: text(input.address1, "Address", 160),
    address2: typeof input.address2 === "string" ? input.address2.trim().slice(0, 160) : "",
    city: text(input.city, "City", 80),
    state: text(input.state, "State", 80),
    postalCode,
    country: text(input.country ?? "India", "Country", 80),
    isDefault: input.isDefault === true,
  };
}
