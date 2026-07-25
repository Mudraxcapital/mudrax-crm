import { describe, expect, it } from "vitest";
import {
  buildDuplicateReportCsv,
  classifyImportDuplicates,
} from "../application/use-cases/detectImportDuplicates";
import { previewLeadDistribution } from "../application/use-cases/previewLeadDistribution";

describe("classifyImportDuplicates", () => {
  const existing = [
    {
      id: "lead-1",
      customerId: "cust-1",
      fullNameSnapshot: "Rahul Sharma",
      phoneSnapshot: "+91 98765 43210",
      emailSnapshot: "rahul@example.com",
    },
  ];

  it("classifies exact phone matches", () => {
    const result = classifyImportDuplicates({
      matchMode: "phone",
      existingLeads: existing,
      rows: [
        { rowNumber: 1, name: "Rahul", phone: "9876543210", email: "" },
        { rowNumber: 2, name: "Priya", phone: "9000000000", email: "" },
      ],
    });
    expect(result.exactDuplicates).toHaveLength(1);
    expect(result.newLeads).toHaveLength(1);
    expect(result.exactDuplicates[0]?.matchReason).toBe("Phone");
  });

  it("classifies phone+name possible vs exact", () => {
    const result = classifyImportDuplicates({
      matchMode: "phone_name",
      existingLeads: existing,
      rows: [
        { rowNumber: 1, name: "Rahul Sharma", phone: "9876543210", email: "" },
        { rowNumber: 2, name: "Different Person", phone: "9876543210", email: "" },
      ],
    });
    expect(result.exactDuplicates).toHaveLength(1);
    expect(result.possibleDuplicates).toHaveLength(1);
  });

  it("builds a CSV report", () => {
    const summary = classifyImportDuplicates({
      matchMode: "email",
      existingLeads: existing,
      rows: [{ rowNumber: 1, name: "Rahul", phone: "", email: "rahul@example.com" }],
    });
    const csv = buildDuplicateReportCsv(summary);
    expect(csv).toContain("exact");
    expect(csv).toContain("rahul@example.com");
  });
});

describe("previewLeadDistribution", () => {
  const agents = [
    { userId: "a", fullName: "Rahul" },
    { userId: "b", fullName: "Priya" },
    { userId: "c", fullName: "Amit" },
  ];

  it("splits round robin evenly", () => {
    const preview = previewLeadDistribution({
      leadCount: 374,
      strategy: "ROUND_ROBIN",
      agents,
    });
    expect(preview.agents.map((agent) => agent.leadCount).sort()).toEqual([124, 125, 125]);
    expect(preview.assignments).toHaveLength(374);
  });

  it("assigns all to manual agent", () => {
    const preview = previewLeadDistribution({
      leadCount: 10,
      strategy: "MANUAL",
      agents,
      manualAssigneeUserId: "b",
    });
    expect(preview.agents.find((agent) => agent.userId === "b")?.leadCount).toBe(10);
  });
});
