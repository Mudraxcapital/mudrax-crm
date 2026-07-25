// ============================================================================
// src/modules/leads/application/use-cases/getAssigneePortfolio.ts
//
// Assigned customers / leads portfolio for an employee (caller).
// Stage buckets and names always come from CRM Lead Stage metadata.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { AssigneePortfolioDto } from "../dto/AssigneePortfolioDto";
import { toLeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface AssigneePortfolioFilter {
  campaignId?: string;
  currentStageId?: string;
  leadSourceId?: string;
  search?: string;
  /** ISO date lower bound on lead.createdAt / assigned activity. */
  dateFrom?: string;
  dateTo?: string;
  fieldFilters?: Record<string, string>;
  limit?: number;
}

function stageLooksLike(name: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(name));
}

export function makeGetAssigneePortfolio(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function getAssigneePortfolio(command: {
    organizationId: string;
    userId: string;
    filter?: AssigneePortfolioFilter;
  }): Promise<AssigneePortfolioDto> {
    const { organizationId, userId, filter } = command;
    const [leads, catalogs, stages] = await Promise.all([
      repository.list(organizationId, {
        assignedToUserIds: [userId],
        campaignId: filter?.campaignId,
        currentStageId: filter?.currentStageId,
        leadSourceId: filter?.leadSourceId,
        search: filter?.search,
        fieldFilters: filter?.fieldFilters,
        limit: filter?.limit ?? 100_000,
      }),
      loadCatalogLookups(catalogRepository, organizationId),
      catalogRepository.listStages(organizationId),
    ]);

    const fromMs = filter?.dateFrom ? new Date(filter.dateFrom).getTime() : null;
    const toMs = filter?.dateTo ? new Date(filter.dateTo).getTime() : null;

    const filtered = leads.filter((lead) => {
      const created = lead.createdAt.getTime();
      if (fromMs != null && !Number.isNaN(fromMs) && created < fromMs) return false;
      if (toMs != null && !Number.isNaN(toMs) && created > toMs) return false;
      return true;
    });

    const leadDtos = filtered.map((lead) => toLeadDto(lead, catalogs));

    const pending = leadDtos.filter((lead) => lead.currentStageBucket !== "CLOSED").length;
    const completed = leadDtos.filter((lead) => lead.currentStageBucket === "CLOSED").length;
    const won = leadDtos.filter((lead) => Boolean(lead.wonAt)).length;
    const lost = leadDtos.filter((lead) => Boolean(lead.lostAt)).length;
    const followUps = leadDtos.filter(
      (lead) =>
        Boolean(lead.nextActionAt) ||
        stageLooksLike(lead.currentStageName, [/follow/i, /callback/i]),
    ).length;
    const connected = leadDtos.filter((lead) =>
      stageLooksLike(lead.currentStageName, [
        /contact/i,
        /interest/i,
        /connect/i,
        /ring/i,
        /follow/i,
        /hot/i,
        /qualif/i,
        /won/i,
      ]),
    ).length;

    const byStage = stages
      .filter((stage) => stage.isActive)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((stage) => ({
        stageId: stage.id,
        stageName: stage.name,
        count: leadDtos.filter((lead) => lead.currentStageId === stage.id).length,
      }));

    return {
      userId,
      summary: {
        assignedLeads: leadDtos.length,
        pending,
        completed,
        connected,
        followUps,
        won,
        lost,
      },
      leads: leadDtos,
      byStage,
    };
  };
}
