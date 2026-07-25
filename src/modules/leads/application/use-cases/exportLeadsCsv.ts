// ============================================================================
// src/modules/leads/application/use-cases/exportLeadsCsv.ts
//
// Exportable columns come from Field Settings (isExportable) plus core ids.
// ============================================================================

import { renderCsv } from "@/shared/csv/csv";
import type { LeadRepository, ListLeadsFilter } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadFieldDefinitionRepository } from "../../domain/repositories/LeadFieldDefinitionRepository";
import { loadCatalogLookups } from "./catalogLookups";
import { toLeadDto } from "../dto/LeadDto";
import { exportableFields } from "../dto/LeadFieldDefinitionDto";
import { displayFieldValue, valuesByInternalKey } from "../services/leadFieldValues";

export function makeExportLeadsCsv(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  fieldRepository: LeadFieldDefinitionRepository,
) {
  return async function exportLeadsCsv(
    organizationId: string,
    filter?: ListLeadsFilter,
  ): Promise<{ fileName: string; contentType: string; body: string }> {
    const [leads, catalogs, fields] = await Promise.all([
      repository.list(organizationId, { ...filter, limit: filter?.limit ?? 5000 }),
      loadCatalogLookups(catalogRepository, organizationId),
      fieldRepository.listActive(organizationId),
    ]);

    const exportFields = exportableFields(fields);
    const valuesByLead = await fieldRepository.listValuesForLeads(leads.map((lead) => lead.id));

    const baseColumns = ["id", "stage", "source", "customerId", "assigneeUserId", "campaignId", "createdAt"];
    const fieldColumns = exportFields.map((field) => field.internalKey);
    const columns = [...baseColumns, ...fieldColumns];

    const rows = leads.map((lead) => {
      const dto = toLeadDto(lead, catalogs);
      const custom = valuesByInternalKey(valuesByLead.get(lead.id) ?? []);
      const row: Record<string, string> = {
        id: dto.id,
        stage: dto.currentStageName,
        source: dto.leadSourceName,
        customerId: dto.customerId,
        assigneeUserId: dto.currentAssigneeUserId ?? "",
        campaignId: dto.campaignId ?? "",
        createdAt: dto.createdAt,
      };

      for (const field of exportFields) {
        if (field.systemColumn === "fullNameSnapshot") {
          row[field.internalKey] = dto.fullNameSnapshot;
        } else if (field.systemColumn === "phoneSnapshot") {
          row[field.internalKey] = dto.phoneSnapshot ?? "";
        } else if (field.systemColumn === "emailSnapshot") {
          row[field.internalKey] = dto.emailSnapshot ?? "";
        } else {
          const match = (valuesByLead.get(lead.id) ?? []).find(
            (value) => value.internalKey === field.internalKey,
          );
          row[field.internalKey] = match ? displayFieldValue(match) : (custom[field.internalKey] ?? "");
        }
      }
      return row;
    });

    return {
      fileName: `leads-export-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: renderCsv(columns, rows),
    };
  };
}
