// ============================================================================
// src/modules/leads/application/use-cases/getKanbanBoard.ts
//
// Lead Pipeline Kanban — columns are the Organization's active Lead Stages
// (never a hardcoded enum — leads.md).
// ============================================================================

import type { LeadRepository, ListLeadsFilter } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface KanbanColumn {
  stageId: string;
  stageName: string;
  bucket: string;
  closeOutcome: string | null;
  sortOrder: number;
  leads: LeadDto[];
}

export function makeGetKanbanBoard(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function getKanbanBoard(
    organizationId: string,
    filter?: Omit<ListLeadsFilter, "currentStageId">,
  ): Promise<KanbanColumn[]> {
    const [stages, leads, catalogs] = await Promise.all([
      catalogRepository.listStages(organizationId),
      repository.list(organizationId, { ...filter, limit: filter?.limit ?? 500 }),
      loadCatalogLookups(catalogRepository, organizationId),
    ]);

    const activeStages = stages
      .filter((stage) => stage.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return activeStages.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      bucket: stage.bucket,
      closeOutcome: stage.closeOutcome,
      sortOrder: stage.sortOrder,
      leads: leads
        .filter((lead) => lead.currentStageId === stage.id)
        .map((lead) => toLeadDto(lead, catalogs)),
    }));
  };
}
