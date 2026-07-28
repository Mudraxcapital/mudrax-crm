// ============================================================================
// src/modules/leads/domain/repositories/LeadCatalogRepository.ts
//
// Read-only repository interface over the admin-configurable Lead Stage /
// Lead Source / Lost Reason catalogs (leads.md — "never a hardcoded enum").
// This module does not expose catalog management use-cases (out of scope
// for this task); the catalogs are seeded (prisma/seed/steps/04-lead-catalogs.ts)
// and consumed read-only here for validation and display.
// ============================================================================

import type { LeadSource, LeadStage, LostReason } from "../entities/LeadCatalogs";

export interface LeadCatalogRepository {
  findStageById(id: string): Promise<LeadStage | null>;
  listStages(organizationId: string): Promise<LeadStage[]>;
  /** The default Stage a newly-created Lead starts in — the active INITIAL-bucket Stage with the lowest sortOrder. */
  findDefaultStage(organizationId: string): Promise<LeadStage | null>;

  findSourceById(id: string): Promise<LeadSource | null>;
  listSources(organizationId: string): Promise<LeadSource[]>;
  /** Preferred default source for new leads / imports — active catalog row named "Data", else first active. */
  findDefaultSource(organizationId: string): Promise<LeadSource | null>;

  findLostReasonById(id: string): Promise<LostReason | null>;
  listLostReasons(organizationId: string): Promise<LostReason[]>;
}
