import { describe, expect, it } from "vitest";
import { parseAddress, parseRegistration } from "./account-validation";

describe("account input validation", () => {
  it("accepts a valid registration and rejects weak passwords", () => {
    expect(parseRegistration({ name: "Manthan", email: "M@Example.com", password: "password123" }))
      .toEqual({ name: "Manthan", email: "m@example.com", password: "password123" });
    expect(() => parseRegistration({ name: "Manthan", email: "m@example.com", password: "short" }))
      .toThrow("at least 8 characters");
  });

  it("normalizes a complete Indian address", () => {
    expect(parseAddress({
      label: " Home ", fullName: " Manthan Ahuja ", phone: "9820081628",
      address1: " 1 Heritage Lane ", address2: "", city: " Mumbai ", state: " Maharashtra ",
      postalCode: "400001", country: "India", isDefault: true,
    })).toMatchObject({ label: "Home", city: "Mumbai", postalCode: "400001", isDefault: true });
  });
});
