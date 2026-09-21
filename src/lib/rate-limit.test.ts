import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  it("blocks requests above the fixed-window limit", () => {
    let now = 1_000;
    const limiter = createRateLimiter(() => now);

    expect(limiter.allow("login:test", 2, 60_000)).toBe(true);
    expect(limiter.allow("login:test", 2, 60_000)).toBe(true);
    expect(limiter.allow("login:test", 2, 60_000)).toBe(false);
    now += 60_001;
    expect(limiter.allow("login:test", 2, 60_000)).toBe(true);
  });
});
