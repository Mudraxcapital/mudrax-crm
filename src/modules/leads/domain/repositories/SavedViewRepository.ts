// ============================================================================
// src/modules/leads/domain/repositories/SavedViewRepository.ts
// ============================================================================

import type { LeadFilterConfig, SavedView } from "../entities/SavedView";

export interface CreateSavedViewData {
  ownerUserId: string;
  name: string;
  filterConfig: LeadFilterConfig;
  isShared: boolean;
}

export interface UpdateSavedViewData {
  name?: string;
  filterConfig?: LeadFilterConfig;
  isShared?: boolean;
}

export interface SavedViewRepository {
  findById(id: string): Promise<SavedView | null>;
  listForUser(ownerUserId: string): Promise<SavedView[]>;
  create(data: CreateSavedViewData): Promise<SavedView>;
  update(id: string, data: UpdateSavedViewData): Promise<SavedView>;
  delete(id: string): Promise<void>;
}
