import { describe, expect, it } from "vitest";
import {
  assertOwnsManagerData,
  type HierarchyScope,
} from "../domain/value-objects/HierarchyScope";

function scope(partial: Partial<HierarchyScope> & Pick<HierarchyScope, "primaryRole">): HierarchyScope {
  return {
    ownerManagerId: null,
    teamLeadId: null,
    visibleUserIds: ["self"],
    unrestricted: false,
    ...partial,
  };
}

describe("assertOwnsManagerData", () => {
  it("allows Admin unrestricted access", () => {
    expect(
      assertOwnsManagerData(scope({ primaryRole: "Admin", unrestricted: true }), "mgr-1"),
    ).toBe(true);
  });

  it("allows Direct Admin Callers only on the null manager book", () => {
    const directCaller = scope({ primaryRole: "Caller", ownerManagerId: null });
    expect(assertOwnsManagerData(directCaller, null)).toBe(true);
    expect(assertOwnsManagerData(directCaller, undefined)).toBe(true);
    expect(assertOwnsManagerData(directCaller, "mgr-1")).toBe(false);
  });

  it("allows hierarchical Callers only on their Manager book", () => {
    const caller = scope({
      primaryRole: "Caller",
      ownerManagerId: "mgr-1",
      teamLeadId: "tl-1",
    });
    expect(assertOwnsManagerData(caller, "mgr-1")).toBe(true);
    expect(assertOwnsManagerData(caller, null)).toBe(false);
    expect(assertOwnsManagerData(caller, "mgr-2")).toBe(false);
  });

  it("allows Managers only on their own book", () => {
    const manager = scope({ primaryRole: "Manager", ownerManagerId: "mgr-1" });
    expect(assertOwnsManagerData(manager, "mgr-1")).toBe(true);
    expect(assertOwnsManagerData(manager, null)).toBe(false);
  });
});
