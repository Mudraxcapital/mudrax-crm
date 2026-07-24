// ============================================================================
// src/modules/leads/application/dto/SavedViewDto.ts
// ============================================================================

import type { LeadFilterConfig, SavedView } from "../../domain/entities/SavedView";

export interface SavedViewDto {
  id: string;
  ownerUserId: string;
  name: string;
  filterConfig: LeadFilterConfig;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toSavedViewDto(view: SavedView): SavedViewDto {
  return {
    id: view.id,
    ownerUserId: view.ownerUserId,
    name: view.name,
    filterConfig: view.filterConfig,
    isShared: view.isShared,
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
  };
}
