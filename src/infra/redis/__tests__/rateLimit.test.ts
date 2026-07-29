import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../client", () => ({
  getRedis: vi.fn(),
}));

import { getRedis } from "../client";
import { checkRateLimit } from "../rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.mocked(getRedis).mockReset();
  });

  it("fails open when Redis is unavailable", async () => {
    vi.mocked(getRedis).mockResolvedValue(null);
    const result = await checkRateLimit({
      key: "login:test@example.com",
      limit: 2,
      windowSeconds: 60,
    });
    expect(result.allowed).toBe(true);
    expect(result.degraded).toBe(true);
  });

  it("blocks after the limit is exceeded", async () => {
    const store = new Map<string, number>();
    const redis = {
      incr: vi.fn(async (key: string) => {
        const next = (store.get(key) ?? 0) + 1;
        store.set(key, next);
        return next;
      }),
      expire: vi.fn(async () => true),
      ttl: vi.fn(async () => 45),
    };
    vi.mocked(getRedis).mockResolvedValue(redis as never);

    const first = await checkRateLimit({ key: "login:a", limit: 2, windowSeconds: 60 });
    const second = await checkRateLimit({ key: "login:a", limit: 2, windowSeconds: 60 });
    const third = await checkRateLimit({ key: "login:a", limit: 2, windowSeconds: 60 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBe(45);
    expect(third.degraded).toBe(false);
  });
});
