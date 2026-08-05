// ============================================================================
// Pipeline board shows a focused stage set — Fresh / Ringing / Follow Up / Lost / Won.
// ============================================================================

import type { KanbanColumn } from "@/modules/leads";

/** Display order for the minimal pipeline board. */
const PIPELINE_FOCUS_STAGE_ORDER = ["fresh", "ringing", "follow up", "lost", "won"] as const;

export function filterPipelineFocusColumns(columns: KanbanColumn[]): KanbanColumn[] {
  const order = new Map<string, number>(
    PIPELINE_FOCUS_STAGE_ORDER.map((name, index) => [name, index]),
  );

  return columns
    .filter((column) => order.has(column.stageName.trim().toLowerCase()))
    .sort(
      (a, b) =>
        (order.get(a.stageName.trim().toLowerCase()) ?? 99) -
        (order.get(b.stageName.trim().toLowerCase()) ?? 99),
    );
}
