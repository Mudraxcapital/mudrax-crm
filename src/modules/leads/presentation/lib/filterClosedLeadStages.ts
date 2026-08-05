import type { LeadStage } from "../../domain/entities/LeadCatalogs";

/** Closed picker options: only Won and Lost (other outcomes are Lost Reasons). */
export function isWonOrLostStageName(name: string): boolean {
  const trimmed = name.trim();
  return /^won$/i.test(trimmed) || /^lost$/i.test(trimmed);
}

/**
 * Restrict Closed-bucket stages to Won / Lost for status pickers.
 * Keeps `currentStageId` so an already-closed legacy stage still displays.
 */
export function filterClosedLeadStagesForPicker(
  stages: LeadStage[],
  currentStageId?: string | null,
): LeadStage[] {
  return stages.filter((stage) => {
    if (currentStageId && stage.id === currentStageId) return true;
    if (stage.bucket !== "CLOSED") return true;
    return isWonOrLostStageName(stage.name);
  });
}
