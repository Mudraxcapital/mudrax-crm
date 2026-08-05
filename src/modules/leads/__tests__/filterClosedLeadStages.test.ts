import { describe, expect, it } from "vitest";
import type { LeadStage } from "../domain/entities/LeadCatalogs";
import { filterClosedLeadStagesForPicker } from "../presentation/lib/filterClosedLeadStages";

function stage(
  partial: Pick<LeadStage, "id" | "name" | "bucket"> &
    Partial<Pick<LeadStage, "closeOutcome">>,
): LeadStage {
  return {
    organizationId: "org",
    isActive: true,
    closeOutcome: null,
    sortOrder: 1,
    ...partial,
  };
}

describe("filterClosedLeadStagesForPicker", () => {
  it("keeps only Won and Lost in the Closed section", () => {
    const stages = [
      stage({ id: "fresh", name: "Fresh", bucket: "INITIAL" }),
      stage({ id: "won", name: "Won", bucket: "CLOSED", closeOutcome: "WON" }),
      stage({ id: "lost", name: "Lost", bucket: "CLOSED", closeOutcome: "LOST" }),
      stage({ id: "dup", name: "Duplicate", bucket: "CLOSED", closeOutcome: "LOST" }),
      stage({ id: "inv", name: "Invalid", bucket: "CLOSED", closeOutcome: "LOST" }),
      stage({ id: "nn", name: "No Need", bucket: "CLOSED", closeOutcome: "LOST" }),
      stage({ id: "ne", name: "Not Eligible", bucket: "CLOSED", closeOutcome: "LOST" }),
    ];

    expect(filterClosedLeadStagesForPicker(stages).map((row) => row.name)).toEqual([
      "Fresh",
      "Won",
      "Lost",
    ]);
  });

  it("keeps the current closed stage even when retired", () => {
    const stages = [
      stage({ id: "dup", name: "Duplicate", bucket: "CLOSED", closeOutcome: "LOST" }),
      stage({ id: "lost", name: "Lost", bucket: "CLOSED", closeOutcome: "LOST" }),
    ];
    expect(
      filterClosedLeadStagesForPicker(stages, "dup").map((row) => row.name),
    ).toEqual(["Duplicate", "Lost"]);
  });
});
