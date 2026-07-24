import { describe, expect, it } from "vitest";
import {
  createDashboardSchema,
  exportReportSchema,
  runReportSchema,
  saveReportSchema,
  toReportFilter,
} from "../application/validators/reportSchemas";

describe("reportSchemas", () => {
  it("accepts a run report payload with empty optional filters", () => {
    const parsed = runReportSchema.safeParse({
      reportType: "CUSTOMER",
      filter: {
        dateFrom: "",
        dateTo: "",
        branchId: "",
        departmentId: "",
        teamId: "",
        userId: "",
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(toReportFilter(parsed.data.filter).branchId).toBeNull();
    }
  });

  it("rejects Excel export format", () => {
    const parsed = exportReportSchema.safeParse({
      reportExecutionId: "00000000-0000-0000-0000-000000000001",
      format: "EXCEL",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts CSV and PDF export formats", () => {
    for (const format of ["CSV", "PDF"] as const) {
      const parsed = exportReportSchema.safeParse({
        reportExecutionId: "00000000-0000-0000-0000-000000000001",
        format,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("requires a saved report name", () => {
    const parsed = saveReportSchema.safeParse({
      name: " ",
      reportType: "LEAD",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts dashboard create with KPI name widgets", () => {
    const parsed = createDashboardSchema.safeParse({
      name: "Branch Ops",
      audience: "BRANCH",
      widgets: [{ visualizationType: "counter", kpiName: "Total Leads" }],
    });
    expect(parsed.success).toBe(true);
  });
});
