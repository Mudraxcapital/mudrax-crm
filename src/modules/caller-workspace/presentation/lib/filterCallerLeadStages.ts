import type { LeadStage } from "@/modules/leads";
import {
  filterClosedLeadStagesForPicker,
} from "@/modules/leads/presentation/lib/filterClosedLeadStages";

/** Active stages removed from the caller disposition dropdown. */
const HIDDEN_ACTIVE_STAGE_PATTERNS = [
  /^contacted$/i,
  /^follow[-\s]?up\s+scheduled$/i,
  /^documentation\s+in\s+progress$/i,
  /^submitted\s+to\s+bank$/i,
];

/**
 * Caller / campaign workspace lead-status options:
 * - Keep Fresh + useful Active stages (Ringing, Interested, Busy, …)
 * - Drop Contacted, Follow-up Scheduled, Documentation In Progress, Submitted to Bank
 * - Closed: only Won and Lost by name (lost reasons stay on Lost)
 * - Always keep the lead's current stage so the control can display it
 */
export function filterCallerLeadStages(
  stages: LeadStage[],
  currentStageId?: string | null,
): LeadStage[] {
  const withoutHiddenActive = stages.filter((stage) => {
    if (currentStageId && stage.id === currentStageId) return true;
    if (stage.bucket === "ACTIVE") {
      return !HIDDEN_ACTIVE_STAGE_PATTERNS.some((pattern) => pattern.test(stage.name.trim()));
    }
    return true;
  });

  const filtered = filterClosedLeadStagesForPicker(withoutHiddenActive, currentStageId);
  return filtered.length > 0 ? filtered : stages;
}

export function findRingingStage(stages: LeadStage[]): LeadStage | null {
  return (
    stages.find((stage) => /^ringing$/i.test(stage.name.trim())) ??
    stages.find((stage) => /ring/i.test(stage.name)) ??
    null
  );
}
