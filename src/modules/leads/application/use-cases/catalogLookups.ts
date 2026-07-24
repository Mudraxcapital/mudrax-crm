// ============================================================================
// src/modules/leads/application/use-cases/catalogLookups.ts
//
// Shared helper: loads the Lead Stage/Source/Lost Reason catalogs for an
// Organization into lookup Maps, for enriching LeadDto without every
// use-case re-implementing the same three list calls.
// ============================================================================

import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadCatalogLookups } from "../dto/LeadDto";

export async function loadCatalogLookups(
  repository: LeadCatalogRepository,
  organizationId: string,
): Promise<LeadCatalogLookups> {
  const [stages, sources, lostReasons] = await Promise.all([
    repository.listStages(organizationId),
    repository.listSources(organizationId),
    repository.listLostReasons(organizationId),
  ]);

  return {
    stagesById: new Map(stages.map((stage) => [stage.id, stage])),
    sourcesById: new Map(sources.map((source) => [source.id, source])),
    lostReasonsById: new Map(lostReasons.map((reason) => [reason.id, reason])),
  };
}
