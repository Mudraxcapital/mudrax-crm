import { describe, expect, it } from "vitest";
import { PERMISSION_CATALOG, computeRoleGrants, ROLE_DEFINITIONS } from "./rbac-catalog";

describe("fixed roles", () => {
  it("defines exactly four fixed roles", () => {
    expect(ROLE_DEFINITIONS.map((r) => r.name).sort()).toEqual(
      ["Admin", "Caller", "Manager", "Team Lead"].sort(),
    );
  });
});

describe("user management permissions", () => {
  it("restricts user.view to Manager and Admin (not Team Lead or Caller)", () => {
    const roles = computeRoleGrants()
      .filter((grant) => grant.permissionCode === "user.view")
      .map((grant) => grant.role)
      .sort();
    expect(roles).toEqual(["Admin", "Manager"]);
  });

  it("grants user.delete and user.reset_password to Admin only", () => {
    for (const code of ["user.delete", "user.reset_password"] as const) {
      const grants = computeRoleGrants().filter((grant) => grant.permissionCode === code);
      expect(grants).toHaveLength(1);
      expect(grants[0]?.role).toBe("Admin");
      expect(grants[0]?.scope).toBe("SYSTEM");
    }
  });

  it("does not expose organization.* product permissions", () => {
    const orgCodes = PERMISSION_CATALOG.filter((p) => p.module === "organization").map(
      (p) => p.code,
    );
    expect(orgCodes).toEqual([]);
  });

  it("does not expose role.manage — roles are fixed in code", () => {
    expect(PERMISSION_CATALOG.find((p) => p.code === "role.manage")).toBeUndefined();
  });
});
