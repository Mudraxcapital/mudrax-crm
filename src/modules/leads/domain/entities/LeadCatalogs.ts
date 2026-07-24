// ============================================================================
// src/modules/leads/domain/entities/LeadCatalogs.ts
//
// Admin-configurable reference/catalog entities a Lead points to — never
// hardcoded enums (leads.md). Lead Stage bucket/closeOutcome classify the
// catalog's semantics ("Support all existing Lead Status values" — the
// approved schema models Lead Status as this configurable catalog, not a
// fixed enum).
// ============================================================================

export const STAGE_BUCKETS = ["INITIAL", "ACTIVE", "CLOSED"] as const;
export type StageBucket = (typeof STAGE_BUCKETS)[number];

export const CLOSE_OUTCOMES = ["WON", "LOST"] as const;
export type CloseOutcome = (typeof CLOSE_OUTCOMES)[number];

export interface LeadStage {
  id: string;
  organizationId: string;
  name: string;
  bucket: StageBucket;
  closeOutcome: CloseOutcome | null;
  sortOrder: number;
  isActive: boolean;
}

export interface LeadSource {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
}

export interface LostReason {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
}
