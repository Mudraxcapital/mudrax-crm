import type { CallerLeadStageOption } from "@mudrax/types";

/** Active stages removed from the caller disposition dropdown (web parity). */
const HIDDEN_ACTIVE_STAGE_PATTERNS = [
  /^contacted$/i,
  /^follow[-\s]?up\s+scheduled$/i,
  /^documentation\s+in\s+progress$/i,
  /^submitted\s+to\s+bank$/i,
];

/**
 * Caller / campaign workspace lead-status options (mirrors web filterCallerLeadStages).
 */
export function filterCallerLeadStages(
  stages: CallerLeadStageOption[],
  currentStageId?: string | null,
): CallerLeadStageOption[] {
  const filtered = stages.filter((stage) => {
    if (currentStageId && stage.id === currentStageId) return true;
    if (stage.bucket === "CLOSED") {
      const name = stage.name.trim();
      return /^won$/i.test(name) || /^lost$/i.test(name);
    }
    if (stage.bucket === "ACTIVE") {
      return !HIDDEN_ACTIVE_STAGE_PATTERNS.some((pattern) => pattern.test(stage.name.trim()));
    }
    return true;
  });

  return filtered.length > 0 ? filtered : stages;
}

export function findRingingStage(
  stages: CallerLeadStageOption[],
): CallerLeadStageOption | null {
  return (
    stages.find((stage) => /^ringing$/i.test(stage.name.trim())) ??
    stages.find((stage) => /ring/i.test(stage.name)) ??
    null
  );
}
