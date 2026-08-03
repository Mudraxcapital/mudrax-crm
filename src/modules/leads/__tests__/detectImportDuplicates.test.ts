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
      currentStageId: "stage-ringing",
      currentStageName: "Ringing",
      stageBucket: "ACTIVE",
      stageSortOrder: 2,
      updatedAt: new Date("2026-07-25T10:34:00.000Z"),
    },
  ];

  const stages = [
    { id: "stage-fresh", name: "Fresh", sortOrder: 1, isActive: true },
    { id: "stage-ringing", name: "Ringing", sortOrder: 2, isActive: true },
    { id: "stage-lost", name: "Lost", sortOrder: 9, isActive: true },
  ];

  it("keeps the first phone in the file and marks later rows as duplicates", () => {
    const result = classifyImportDuplicates({
      matchMode: "phone",
      existingLeads: [],
      stages,
      rows: [
        { rowNumber: 1, name: "First", phone: "9876543210", email: "" },
        { rowNumber: 2, name: "Second", phone: "9876543210", email: "" },
        { rowNumber: 3, name: "Third", phone: "+91 98765 43210", email: "" },
        { rowNumber: 4, name: "Other", phone: "9000000000", email: "" },
      ],
    });
    expect(result.newLeadCount).toBe(2);
    expect(result.exactDuplicates).toHaveLength(2);
    expect(result.alreadyExisting).toBe(0);
    expect(result.inFileDuplicateCount).toBe(2);
    expect(result.exactDuplicates.every((row) => row.origin === "file")).toBe(true);
    expect(result.exactDuplicates.every((row) => row.matchReason === "Phone (duplicate in file)")).toBe(
      true,
    );
    expect(result.newLeads[0]?.rowNumber).toBe(1);
    expect(result.newLeads[1]?.rowNumber).toBe(4);
    const inFileGroup = result.statusGroups.find((group) => group.stageName === "Duplicate in Excel");
    expect(inFileGroup?.count).toBe(2);
    expect(result.statusGroups.some((group) => /unknown/i.test(group.stageName))).toBe(false);
  });

  it("classifies exact phone matches", () => {
    const result = classifyImportDuplicates({
      matchMode: "phone",
      existingLeads: existing,
      stages,
      rows: [
        { rowNumber: 1, name: "Rahul", phone: "9876543210", email: "" },
        { rowNumber: 2, name: "Priya", phone: "9000000000", email: "" },
      ],
    });
    expect(result.exactDuplicates).toHaveLength(1);
    expect(result.newLeads).toHaveLength(1);
    expect(result.exactDuplicates[0]?.matchReason).toBe("Phone");
    expect(result.exactDuplicates[0]?.origin).toBe("crm");
    expect(result.alreadyExisting).toBe(1);
    expect(result.inFileDuplicateCount).toBe(0);
    expect(result.newLeadCount).toBe(1);
    expect(result.matchLabel).toBe("Phone Number");
  });

  it("separates CRM duplicates from in-file duplicates in counts and status groups", () => {
    const result = classifyImportDuplicates({
      matchMode: "phone",
      existingLeads: existing,
      stages,
      rows: [
        { rowNumber: 1, name: "Rahul", phone: "9876543210", email: "" },
        { rowNumber: 2, name: "Copy in CRM phone", phone: "9876543210", email: "" },
        { rowNumber: 3, name: "New", phone: "9000000001", email: "" },
        { rowNumber: 4, name: "New again", phone: "9000000001", email: "" },
      ],
    });
    // Rows 1–2 match CRM; row 4 repeats row 3 inside the file only.
    expect(result.alreadyExisting).toBe(2);
    expect(result.inFileDuplicateCount).toBe(1);
    expect(result.newLeadCount).toBe(1);
    expect(result.crmDuplicates).toHaveLength(2);
    expect(result.inFileDuplicates).toHaveLength(1);
    expect(result.inFileDuplicates[0]?.rowNumber).toBe(4);
    const ringing = result.statusGroups.find((group) => group.stageId === "stage-ringing");
    const inFile = result.statusGroups.find((group) => group.stageName === "Duplicate in Excel");
    expect(ringing?.count).toBe(2);
    expect(inFile?.count).toBe(1);
  });

  it("groups duplicates by CRM lead status dynamically", () => {
    const result = classifyImportDuplicates({
      matchMode: "phone",
      existingLeads: existing,
      stages,
      rows: [{ rowNumber: 1, name: "Rahul", phone: "9876543210", email: "" }],
    });
    expect(result.statusGroups).toHaveLength(3);
    const ringing = result.statusGroups.find((group) => group.stageId === "stage-ringing");
    const fresh = result.statusGroups.find((group) => group.stageId === "stage-fresh");
    expect(ringing?.count).toBe(1);
    expect(fresh?.count).toBe(0);
    expect(ringing?.latestUpdatedAt).toBe("2026-07-25T10:34:00.000Z");
  });

  it("hides Integration Test statuses from the status picker groups", () => {
    const result = classifyImportDuplicates({
      matchMode: "phone",
      existingLeads: [
        {
          ...existing[0]!,
          currentStageId: "stage-test-fresh",
          currentStageName: "Integration Test - Fresh",
        },
      ],
      stages: [
        ...stages,
        {
          id: "stage-test-fresh",
          name: "Integration Test - Fresh",
          sortOrder: 0,
          isActive: true,
        },
      ],
      rows: [{ rowNumber: 1, name: "Rahul", phone: "9876543210", email: "" }],
    });
    expect(
      result.statusGroups.some((group) => /integration\s*test/i.test(group.stageName)),
    ).toBe(false);
    expect(result.statusGroups.map((group) => group.stageId)).toEqual([
      "stage-fresh",
      "stage-ringing",
      "stage-lost",
    ]);
  });

  it("classifies phone+name possible vs exact", () => {
    const result = classifyImportDuplicates({
      matchMode: "phone_name",
      existingLeads: existing,
      stages,
      rows: [
        { rowNumber: 1, name: "Rahul Sharma", phone: "9876543210", email: "" },
        { rowNumber: 2, name: "Different Person", phone: "9876543210", email: "" },
      ],
    });
    expect(result.exactDuplicates).toHaveLength(1);
    expect(result.possibleDuplicates).toHaveLength(1);
  });

  it("builds a CSV report including stage", () => {
    const summary = classifyImportDuplicates({
      matchMode: "email",
      existingLeads: existing,
      stages,
      rows: [{ rowNumber: 1, name: "Rahul", phone: "", email: "rahul@example.com" }],
    });
    const csv = buildDuplicateReportCsv(summary, { category: "duplicate" });
    expect(csv).toContain("exact");
    expect(csv).toContain("rahul@example.com");
    expect(csv).toContain("Ringing");
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

  it("assigns manual agent", () => {
    const preview = previewLeadDistribution({
      leadCount: 10,
      strategy: "MANUAL",
      agents,
      manualAssigneeUserId: "b",
    });
    expect(preview.agents.find((agent) => agent.userId === "b")?.leadCount).toBe(10);
  });
});
