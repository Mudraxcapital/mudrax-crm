import { describe, expect, it } from "vitest";
import {
  callerReportsToLabel,
  isDirectAdminCaller,
} from "../application/services/callerReporting";

describe("callerReporting", () => {
  it("detects Direct Admin Callers", () => {
    expect(
      isDirectAdminCaller({ roleName: "Caller", assignedTeamLeadId: null }),
    ).toBe(true);
    expect(
      isDirectAdminCaller({ roleName: "Caller", assignedTeamLeadId: "tl1" }),
    ).toBe(false);
    expect(
      isDirectAdminCaller({ roleName: "Manager", assignedTeamLeadId: null }),
    ).toBe(false);
  });

  it("labels reporting line for freelancers vs Team Lead Callers", () => {
    expect(callerReportsToLabel(null)).toBe("Direct Admin");
    expect(callerReportsToLabel("")).toBe("Direct Admin");
    expect(callerReportsToLabel("Priya Lead")).toBe("Priya Lead");
  });
});
