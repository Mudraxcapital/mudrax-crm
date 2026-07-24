// ============================================================================
// src/modules/leads/application/use-cases/getLeadStatistics.ts
//
// Read-only aggregate counts backing the CRM Dashboard's "Leads by Status"
// and "Leads by Source" widgets.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import { loadCatalogLookups } from "./catalogLookups";

export interface LeadsByStageEntry {
  stageId: string;
  stageName: string;
  bucket: string;
  count: number;
}

export interface LeadsBySourceEntry {
  sourceId: string;
  sourceName: string;
  count: number;
}

export function makeGetLeadsByStage(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function getLeadsByStage(organizationId: string): Promise<LeadsByStageEntry[]> {
    const [counts, catalogs] = await Promise.all([
      repository.countByStage(organizationId),
      loadCatalogLookups(catalogRepository, organizationId),
    ]);

    return counts.map((entry) => {
      const stage = catalogs.stagesById.get(entry.stageId);
      return {
        stageId: entry.stageId,
        stageName: stage?.name ?? "Unknown",
        bucket: stage?.bucket ?? "INITIAL",
        count: entry.count,
      };
    });
  };
}

export function makeGetLeadsBySource(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function getLeadsBySource(organizationId: string): Promise<LeadsBySourceEntry[]> {
    const [counts, catalogs] = await Promise.all([
      repository.countBySource(organizationId),
      loadCatalogLookups(catalogRepository, organizationId),
    ]);

    return counts.map((entry) => {
      const source = catalogs.sourcesById.get(entry.sourceId);
      return {
        sourceId: entry.sourceId,
        sourceName: source?.name ?? "Unknown",
        count: entry.count,
      };
    });
  };
}
