// ============================================================================
// src/modules/leads/infrastructure/mappers/savedViewMapper.ts
// ============================================================================

import type { SavedView as PrismaSavedView, Prisma } from "@prisma/client";
import type { LeadFilterConfig, SavedView } from "../../domain/entities/SavedView";

function toFilterConfig(value: Prisma.JsonValue): LeadFilterConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return {
    search: typeof raw.search === "string" ? raw.search : undefined,
    currentStageId: typeof raw.currentStageId === "string" ? raw.currentStageId : undefined,
    leadSourceId: typeof raw.leadSourceId === "string" ? raw.leadSourceId : undefined,
    campaignId: typeof raw.campaignId === "string" ? raw.campaignId : undefined,
    assignedToUserId: typeof raw.assignedToUserId === "string" ? raw.assignedToUserId : undefined,
    customerId: typeof raw.customerId === "string" ? raw.customerId : undefined,
  };
}

export function toSavedView(row: PrismaSavedView): SavedView {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    filterConfig: toFilterConfig(row.filterConfig),
    isShared: row.isShared,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
