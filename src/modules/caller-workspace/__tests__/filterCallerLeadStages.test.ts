import { describe, expect, it } from "vitest";
import type { LeadStage } from "@/modules/leads";
import {
  filterCallerLeadStages,
  findRingingStage,
} from "../presentation/lib/filterCallerLeadStages";

function stage(
  partial: Pick<LeadStage, "id" | "name" | "bucket"> &
    Partial<Pick<LeadStage, "closeOutcome" | "sortOrder">>,
): LeadStage {
  return {
    organizationId: "org",
    isActive: true,
    closeOutcome: null,
    sortOrder: partial.sortOrder ?? 1,
    ...partial,
  };
}

describe("filterCallerLeadStages", () => {
  const stages: LeadStage[] = [
    stage({ id: "fresh", name: "Fresh", bucket: "INITIAL", sortOrder: 1 }),
    stage({ id: "ringing", name: "Ringing", bucket: "ACTIVE", sortOrder: 2 }),
    stage({ id: "interested", name: "Interested", bucket: "ACTIVE", sortOrder: 3 }),
    stage({ id: "contacted", name: "Contacted", bucket: "ACTIVE", sortOrder: 4 }),
    stage({
      id: "fus",
      name: "Follow-up Scheduled",
      bucket: "ACTIVE",
      sortOrder: 5,
    }),
    stage({
      id: "docs",
      name: "Documentation In Progress",
      bucket: "ACTIVE",
      sortOrder: 6,
    }),
    stage({
      id: "bank",
      name: "Submitted to Bank",
      bucket: "ACTIVE",
      sortOrder: 7,
    }),
    stage({
      id: "won",
      name: "Won",
      bucket: "CLOSED",
      closeOutcome: "WON",
      sortOrder: 20,
    }),
    stage({
      id: "lost",
      name: "Lost",
      bucket: "CLOSED",
      closeOutcome: "LOST",
      sortOrder: 21,
    }),
    stage({
      id: "dup",
      name: "Duplicate",
      bucket: "CLOSED",
      closeOutcome: "LOST",
      sortOrder: 22,
    }),
  ];

  it("removes contacted/docs/bank stages and closed extras except won/lost", () => {
    const names = filterCallerLeadStages(stages).map((row) => row.name);
    expect(names).toEqual(["Fresh", "Ringing", "Interested", "Won", "Lost"]);
  });

  it("keeps the current stage even when it would otherwise be hidden", () => {
    const names = filterCallerLeadStages(stages, "contacted").map((row) => row.name);
    expect(names).toContain("Contacted");
  });

  it("finds ringing stage", () => {
    expect(findRingingStage(stages)?.id).toBe("ringing");
  });
});
