// ============================================================================
// src/modules/leads/application/use-cases/getLead.ts
//
// Read-only lookups for the Lead aggregate.
// ============================================================================

import type { LeadRepository, ListLeadsFilter } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import { LeadNotFoundError } from "../../domain/errors/LeadErrors";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";

export function makeGetLead(repository: LeadRepository, catalogRepository: LeadCatalogRepository) {
  return async function getLead(id: string): Promise<LeadDto> {
    const lead = await repository.findById(id);
    if (!lead) {
      throw new LeadNotFoundError(id);
    }
    const catalogs = await loadCatalogLookups(catalogRepository, lead.organizationId);
    return toLeadDto(lead, catalogs);
  };
}

export function makeListLeads(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function listLeads(
    organizationId: string,
    filter?: ListLeadsFilter,
  ): Promise<LeadDto[]> {
    const [leads, catalogs] = await Promise.all([
      repository.list(organizationId, filter),
      loadCatalogLookups(catalogRepository, organizationId),
    ]);
    return leads.map((lead) => toLeadDto(lead, catalogs));
  };
}

export function makeListLeadsByCustomer(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  return async function listLeadsByCustomer(customerId: string): Promise<LeadDto[]> {
    const leads = await repository.listByCustomer(customerId);
    if (leads.length === 0) return [];
    const catalogs = await loadCatalogLookups(catalogRepository, leads[0]!.organizationId);
    return leads.map((lead) => toLeadDto(lead, catalogs));
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
