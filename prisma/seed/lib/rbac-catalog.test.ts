import { describe, expect, it } from "vitest";
import { computeRoleGrants, PERMISSION_CATALOG } from "./rbac-catalog";

describe("organization.manage permission", () => {
  it("is declared in the Permission catalog as an Admin-only, System-scope grant", () => {
    const permission = PERMISSION_CATALOG.find((p) => p.code === "organization.manage");

    expect(permission).toBeDefined();
    expect(permission?.minRole).toBe("Admin");
    expect(permission?.systemOnly).toBe(true);
  });

  it("grants organization.manage to Admin at SYSTEM scope only, per RBAC enforcement", () => {
    const grants = computeRoleGrants().filter(
      (grant) => grant.permissionCode === "organization.manage",
    );

    expect(grants).toHaveLength(1);
    const [grant] = grants;
    expect(grant?.role).toBe("Admin");
    expect(grant?.scope).toBe("SYSTEM");
  });

  it("does not grant organization.manage to Caller, Team Leader, or Manager", () => {
    const grants = computeRoleGrants().filter(
      (grant) => grant.permissionCode === "organization.manage",
    );
    const roles = grants.map((grant) => grant.role);

    expect(roles).not.toContain("Caller");
    expect(roles).not.toContain("Team Leader");
    expect(roles).not.toContain("Manager");
  });
});

describe("organization.view permission", () => {
  it("remains available starting at Caller (read-only structure visibility)", () => {
    const permission = PERMISSION_CATALOG.find((p) => p.code === "organization.view");
    expect(permission?.minRole).toBe("Caller");

    const grants = computeRoleGrants().filter(
      (grant) => grant.permissionCode === "organization.view",
    );
    expect(grants.map((grant) => grant.role).sort()).toEqual(
      ["Admin", "Caller", "Manager", "Team Leader"].sort(),
    );
  });
});
