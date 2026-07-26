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
  /** True total for this stage (not capped by the card page size). */
  totalCount: number;
  leads: LeadDto[];
}

/** Max cards loaded onto the board. Counts still reflect the full stage total. */
const KANBAN_CARD_LIMIT = 10_000;

export function makeGetKanbanBoard(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function getKanbanBoard(
    organizationId: string,
    filter?: Omit<ListLeadsFilter, "currentStageId">,
  ): Promise<KanbanColumn[]> {
    const [stages, leads, catalogs, stageCounts] = await Promise.all([
      catalogRepository.listStages(organizationId),
      repository.list(organizationId, {
        ...filter,
        limit: filter?.limit ?? KANBAN_CARD_LIMIT,
      }),
      loadCatalogLookups(catalogRepository, organizationId),
      repository.countGroupedByStage(organizationId, filter),
    ]);

    const activeStages = stages
      .filter((stage) => stage.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const countByStageId = new Map(stageCounts.map((entry) => [entry.stageId, entry.count]));

    return activeStages.map((stage) => {
      const stageLeads = leads
        .filter((lead) => lead.currentStageId === stage.id)
        .map((lead) => toLeadDto(lead, catalogs));
      return {
        stageId: stage.id,
        stageName: stage.name,
        bucket: stage.bucket,
        closeOutcome: stage.closeOutcome,
        sortOrder: stage.sortOrder,
        totalCount: countByStageId.get(stage.id) ?? stageLeads.length,
        leads: stageLeads,
      };
    });
  };
}
