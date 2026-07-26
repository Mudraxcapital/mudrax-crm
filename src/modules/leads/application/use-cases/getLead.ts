// ============================================================================
// src/modules/leads/application/use-cases/getLead.ts
//
// Read-only lookups for the Lead aggregate.
// ============================================================================

import type { LeadRepository, ListLeadsFilter } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadFieldDefinitionRepository } from "../../domain/repositories/LeadFieldDefinitionRepository";
import { LeadNotFoundError } from "../../domain/errors/LeadErrors";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { toLeadFieldValueDto } from "../dto/LeadFieldDefinitionDto";
import { loadCatalogLookups } from "./catalogLookups";

export function makeGetLead(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  fieldRepository: LeadFieldDefinitionRepository,
) {
  return async function getLead(id: string): Promise<LeadDto> {
    const lead = await repository.findById(id);
    if (!lead) {
      throw new LeadNotFoundError(id);
    }
    const [catalogs, fieldValues] = await Promise.all([
      loadCatalogLookups(catalogRepository, lead.organizationId),
      fieldRepository.listValuesForLead(lead.id),
    ]);
    return {
      ...toLeadDto(lead, catalogs),
      fieldValues: fieldValues.map(toLeadFieldValueDto),
    };
  };
}

/**
 * Batch Lead load for bulk authorization. Skips custom field values (not needed
 * for ownership checks) to keep memory and query cost low.
 */
export function makeGetLeadsByIds(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function getLeadsByIds(ids: string[]): Promise<LeadDto[]> {
    if (ids.length === 0) return [];
    const leads = await repository.findByIds(ids);
    if (leads.length === 0) return [];
    const catalogs = await loadCatalogLookups(catalogRepository, leads[0]!.organizationId);
    return leads.map((lead) => toLeadDto(lead, catalogs));
  };
}

export function makeListLeads(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  fieldRepository?: LeadFieldDefinitionRepository,
) {
  return async function listLeads(
    organizationId: string,
    filter?: ListLeadsFilter,
  ): Promise<LeadDto[]> {
    const [leads, catalogs] = await Promise.all([
      repository.list(organizationId, filter),
      loadCatalogLookups(catalogRepository, organizationId),
    ]);
    const valuesByLead =
      fieldRepository && leads.length > 0
        ? await fieldRepository.listValuesForLeads(leads.map((lead) => lead.id))
        : new Map();
    return leads.map((lead) => ({
      ...toLeadDto(lead, catalogs),
      fieldValues: (valuesByLead.get(lead.id) ?? []).map(toLeadFieldValueDto),
    }));
  };
}

export function makeListLeadsByCustomer(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  fieldRepository?: LeadFieldDefinitionRepository,
) {
  return async function listLeadsByCustomer(customerId: string): Promise<LeadDto[]> {
    const leads = await repository.listByCustomer(customerId);
    if (leads.length === 0) return [];
    const catalogs = await loadCatalogLookups(catalogRepository, leads[0]!.organizationId);
    const valuesByLead = fieldRepository
      ? await fieldRepository.listValuesForLeads(leads.map((lead) => lead.id))
      : new Map();
    return leads.map((lead) => ({
      ...toLeadDto(lead, catalogs),
      fieldValues: (valuesByLead.get(lead.id) ?? []).map(toLeadFieldValueDto),
    }));
  };
}

export function makeCountLeads(repository: LeadRepository) {
  return async function countLeads(
    organizationId: string,
    filter?: ListLeadsFilter,
  ): Promise<number> {
    return repository.count(organizationId, filter);
  };
}
