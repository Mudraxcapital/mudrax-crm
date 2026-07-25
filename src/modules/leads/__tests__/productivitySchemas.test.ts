import { describe, expect, it } from "vitest";
import {
  advancedLeadSearchSchema,
  bulkAssignLeadsSchema,
  createSavedViewSchema,
  importLeadsCsvSchema,
  mergeLeadsSchema,
} from "../application/validators/productivitySchemas";

const uuid = "11111111-1111-1111-1111-111111111111";

describe("productivitySchemas", () => {
  it("accepts a saved view with optional filter fields", () => {
    const parsed = createSavedViewSchema.parse({
      name: "Hot leads",
      filterConfig: { search: "rahul", currentStageId: uuid },
      isShared: true,
    });
    expect(parsed.name).toBe("Hot leads");
    expect(parsed.filterConfig.currentStageId).toBe(uuid);
  });

  it("accepts advanced search input", () => {
    const parsed = advancedLeadSearchSchema.parse({ search: "99", limit: 25 });
    expect(parsed.search).toBe("99");
  });

  it("requires CSV text or rows for import", () => {
    expect(() =>
      importLeadsCsvSchema.parse({ leadSourceId: uuid, csvText: "" }),
    ).toThrow();
    const parsed = importLeadsCsvSchema.parse({
      leadSourceId: uuid,
      rows: [{ Name: "Rahul", Phone: "+919876543210" }],
      columnMapping: { name: "Name", phone: "Phone" },
      duplicateMatchMode: "phone_name",
      duplicateResolution: "update_existing",
      distributionStrategy: "ROUND_ROBIN",
      agentUserIds: [uuid],
    });
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.duplicateResolution).toBe("update_existing");
    expect(parsed.distributionStrategy).toBe("ROUND_ROBIN");
  });

  it("requires selectedStageIds for replace/archive strategies", () => {
    const missing = importLeadsCsvSchema.safeParse({
      leadSourceId: uuid,
      rows: [{ Name: "Rahul", Phone: "9000000000" }],
      columnMapping: { full_name: "Name", phone: "Phone" },
      duplicateResolution: "replace_selected_statuses",
    });
    expect(missing.success).toBe(false);

    const ok = importLeadsCsvSchema.parse({
      leadSourceId: uuid,
      rows: [{ Name: "Rahul", Phone: "9000000000" }],
      columnMapping: { full_name: "Name", phone: "Phone" },
      duplicateResolution: "archive_and_reimport",
      selectedStageIds: [uuid],
      duplicateMatchMode: "phone",
    });
    expect(ok.selectedStageIds).toEqual([uuid]);
    expect(ok.duplicateMatchMode).toBe("phone");
  });

  it("accepts bulk assign payload", () => {
    const parsed = bulkAssignLeadsSchema.parse({
      leadIds: [uuid],
      assignedToUserId: uuid,
    });
    expect(parsed.leadIds).toHaveLength(1);
  });

  it("rejects merging a lead into itself", () => {
    const parsed = mergeLeadsSchema.parse({
      survivingLeadId: uuid,
      mergedAwayLeadId: "22222222-2222-2222-2222-222222222222",
    });
    expect(parsed.survivingLeadId).not.toBe(parsed.mergedAwayLeadId);
  });
});
