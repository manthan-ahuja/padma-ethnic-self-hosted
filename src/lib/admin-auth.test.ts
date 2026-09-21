import { describe, expect, it } from "vitest";
import { isAdminEmail, isAdminIdentity } from "./admin-auth";

describe("admin authorization", () => {
  it("matches normalized emails from the server-only allowlist", () => {
    expect(isAdminEmail(" Owner@Example.com ", "owner@example.com,staff@example.com")).toBe(true);
    expect(isAdminEmail("buyer@example.com", "owner@example.com,staff@example.com")).toBe(false);
    expect(isAdminEmail(undefined, "owner@example.com")).toBe(false);
  });

  it("requires a verified Google identity for allowlisted administration", () => {
    expect(isAdminIdentity("owner@example.com", "google", "owner@example.com")).toBe(true);
    expect(isAdminIdentity("owner@example.com", "credentials", "owner@example.com")).toBe(false);
    expect(isAdminIdentity("owner@example.com", undefined, "owner@example.com")).toBe(false);
  });
});
