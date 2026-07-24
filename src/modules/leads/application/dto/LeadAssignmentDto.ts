// ============================================================================
// src/modules/leads/application/dto/LeadAssignmentDto.ts
// ============================================================================

import type { LeadAssignment } from "../../domain/entities/LeadAssignment";

export interface LeadAssignmentDto {
  id: string;
  leadId: string;
  assignedToUserId: string;
  assignedByUserId: string | null;
  assignmentType: LeadAssignment["assignmentType"];
  campaignAssignmentId: string | null;
  assignedAt: string;
  unassignedAt: string | null;
}

export function toLeadAssignmentDto(assignment: LeadAssignment): LeadAssignmentDto {
  return {
    id: assignment.id,
    leadId: assignment.leadId,
    assignedToUserId: assignment.assignedToUserId,
    assignedByUserId: assignment.assignedByUserId,
    assignmentType: assignment.assignmentType,
    campaignAssignmentId: assignment.campaignAssignmentId,
    assignedAt: assignment.assignedAt.toISOString(),
    unassignedAt: assignment.unassignedAt ? assignment.unassignedAt.toISOString() : null,
  };
}
