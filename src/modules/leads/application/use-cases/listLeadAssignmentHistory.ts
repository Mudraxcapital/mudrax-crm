// ============================================================================
// src/modules/leads/application/use-cases/listLeadAssignmentHistory.ts
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import { toLeadAssignmentDto, type LeadAssignmentDto } from "../dto/LeadAssignmentDto";

export function makeListLeadAssignmentHistory(repository: LeadRepository) {
  return async function listLeadAssignmentHistory(leadId: string): Promise<LeadAssignmentDto[]> {
    const assignments = await repository.listAssignmentHistory(leadId);
    return assignments.map(toLeadAssignmentDto);
  };
}
