import { describe, expect, it } from "vitest";
import {
  LOGIN_LOCKOUT_THRESHOLD,
  roleSubjectToLoginLockout,
} from "@/modules/users/application/services/loginLockoutPolicy";

describe("loginLockoutPolicy", () => {
  it("uses a 5-attempt threshold", () => {
    expect(LOGIN_LOCKOUT_THRESHOLD).toBe(5);
  });

  it("applies account suspension to Manager, Team Lead, and Caller only", () => {
    expect(roleSubjectToLoginLockout("Manager")).toBe(true);
    expect(roleSubjectToLoginLockout("Team Lead")).toBe(true);
    expect(roleSubjectToLoginLockout("Caller")).toBe(true);
    // Admin uses Redis temporary cooldown (adminLoginProtection), not suspension.
    expect(roleSubjectToLoginLockout("Admin")).toBe(false);
    expect(roleSubjectToLoginLockout(null)).toBe(false);
  });
});
