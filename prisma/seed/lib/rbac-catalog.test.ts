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
  it("grants user.view / user.manage / user.delete from Team Lead upward (catalog minRole)", () => {
    for (const code of ["user.view", "user.manage", "user.delete"] as const) {
      const roles = computeRoleGrants()
        .filter((grant) => grant.permissionCode === code)
        .map((grant) => grant.role)
        .sort();
      expect(roles).toEqual(["Admin", "Manager", "Team Lead"]);
    }
  });

  it("grants user.reset_password to Admin only (system scope)", () => {
    const grants = computeRoleGrants().filter(
      (grant) => grant.permissionCode === "user.reset_password",
    );
    expect(grants).toHaveLength(1);
    expect(grants[0]?.role).toBe("Admin");
    expect(grants[0]?.scope).toBe("SYSTEM");
  });

  it("grants custom_field.manage from Manager upward", () => {
    const roles = computeRoleGrants()
      .filter((grant) => grant.permissionCode === "custom_field.manage")
      .map((grant) => grant.role)
      .sort();
    expect(roles).toEqual(["Admin", "Manager"]);
  });

  it("does not grant User Management permissions to Caller", () => {
    const callerGrants = computeRoleGrants().filter(
      (grant) =>
        grant.role === "Caller" &&
        (grant.permissionCode.startsWith("user.") ||
          grant.permissionCode === "custom_field.manage"),
    );
    expect(callerGrants).toEqual([]);
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
