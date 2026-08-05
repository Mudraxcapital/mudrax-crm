import { describe, expect, it } from "vitest";
import { getAdminLoginProtectionConfig } from "../application/services/adminLoginProtection";

describe("adminLoginProtection config", () => {
  it("uses secure defaults for Admin rate limit and cooldown", () => {
    const config = getAdminLoginProtectionConfig();
    expect(config.rateLimit).toBe(5);
    expect(config.rateWindowSeconds).toBe(60);
    expect(config.failThreshold).toBe(10);
    expect(config.cooldownSeconds).toBe(900);
  });
});
