// ============================================================================
// src/modules/leads/application/use-cases/exportLeadsCsv.ts
// ============================================================================

import { renderCsv } from "@/shared/csv/csv";
import type { LeadRepository, ListLeadsFilter } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import { loadCatalogLookups } from "./catalogLookups";
import { toLeadDto } from "../dto/LeadDto";

const EXPORT_COLUMNS = [
  "id",
  "fullName",
  "phone",
  "email",
  "stage",
  "source",
  "customerId",
  "assigneeUserId",
  "campaignId",
  "createdAt",
] as const;

export function makeExportLeadsCsv(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function exportLeadsCsv(
    organizationId: string,
    filter?: ListLeadsFilter,
  ): Promise<{ fileName: string; contentType: string; body: string }> {
    const [leads, catalogs] = await Promise.all([
      repository.list(organizationId, { ...filter, limit: filter?.limit ?? 5000 }),
      loadCatalogLookups(catalogRepository, organizationId),
    ]);

    const rows = leads.map((lead) => {
      const dto = toLeadDto(lead, catalogs);
      return {
        id: dto.id,
        fullName: dto.fullNameSnapshot,
        phone: dto.phoneSnapshot,
        email: dto.emailSnapshot,
        stage: dto.currentStageName,
        source: dto.leadSourceName,
        customerId: dto.customerId,
        assigneeUserId: dto.currentAssigneeUserId,
        campaignId: dto.campaignId,
        createdAt: dto.createdAt,
      };
    });

    return {
      fileName: `leads-export-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: renderCsv([...EXPORT_COLUMNS], rows),
    };
  };
}
