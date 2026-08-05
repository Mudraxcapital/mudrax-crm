import { describe, expect, it } from "vitest";
import {
  adminAssignedPasswordRole,
  isForcedPasswordChangeAllowedPath,
  roleMaySelfServiceChangePassword,
} from "../application/services/selfServicePasswordPolicy";

describe("selfServicePasswordPolicy", () => {
  it("allows every fixed role to change their own password", () => {
    expect(roleMaySelfServiceChangePassword("Admin")).toBe(true);
    expect(roleMaySelfServiceChangePassword("Manager")).toBe(true);
    expect(roleMaySelfServiceChangePassword("Team Lead")).toBe(true);
    expect(roleMaySelfServiceChangePassword("Caller")).toBe(true);
    expect(roleMaySelfServiceChangePassword(null)).toBe(false);
  });

  it("marks Manager / Team Lead / Caller as admin-assigned password roles", () => {
    expect(adminAssignedPasswordRole("Manager")).toBe(true);
    expect(adminAssignedPasswordRole("Team Lead")).toBe(true);
    expect(adminAssignedPasswordRole("Caller")).toBe(true);
    expect(adminAssignedPasswordRole("Admin")).toBe(false);
  });

  it("allows only auth and password-change paths while forced", () => {
    expect(isForcedPasswordChangeAllowedPath("/change-password")).toBe(true);
    expect(isForcedPasswordChangeAllowedPath("/api/caller/password")).toBe(true);
    expect(isForcedPasswordChangeAllowedPath("/api/auth/session")).toBe(true);
    expect(isForcedPasswordChangeAllowedPath("/users")).toBe(false);
    expect(isForcedPasswordChangeAllowedPath("/profile")).toBe(false);
  });
});
