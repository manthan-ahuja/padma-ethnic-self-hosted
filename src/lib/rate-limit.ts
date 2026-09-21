type Entry = { count: number; resetAt: number };

export function createRateLimiter(now = Date.now) {
  const entries = new Map<string, Entry>();

  return {
    allow(key: string, limit: number, windowMs: number) {
      const currentTime = now();
      const current = entries.get(key);
      if (!current || current.resetAt <= currentTime) {
        entries.set(key, { count: 1, resetAt: currentTime + windowMs });
        return true;
      }
      if (current.count >= limit) return false;
      current.count += 1;
      if (entries.size > 5_000) {
        for (const [entryKey, entry] of entries) {
          if (entry.resetAt <= currentTime) entries.delete(entryKey);
        }
      }
      return true;
    },
  };
}

export const accountRateLimiter = createRateLimiter();

export function requestIp(headers?: Headers | Record<string, unknown>) {
  const read = (name: string) => headers instanceof Headers
    ? headers.get(name)
    : headers?.[name] ?? headers?.[name.toLowerCase()];
  const forwarded = read("x-forwarded-for");
  const value = Array.isArray(forwarded) ? forwarded[0] : String(forwarded ?? "");
  return value.split(",")[0]?.trim().slice(0, 80) || "unknown";
}
