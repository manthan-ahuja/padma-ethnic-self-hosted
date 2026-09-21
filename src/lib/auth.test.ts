import { describe, expect, it } from "vitest";
import { authOptions } from "./auth";

describe("account authentication", () => {
  it("offers email/password login alongside Google", () => {
    expect(authOptions.providers.map((provider) => provider.id)).toContain("credentials");
  });
});
