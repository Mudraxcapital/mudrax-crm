// ============================================================================
// src/modules/organization/application/dto/TeamDto.ts
//
// What the Team aggregate's use-cases return to the presentation layer — a
// plain, serializable shape (dates as ISO strings).
// ============================================================================

import type { Team } from "../../domain/entities/Team";

export interface TeamDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  code: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toTeamDto(team: Team): TeamDto {
  return {
    id: team.id,
    organizationId: team.organizationId,
    branchId: team.branchId,
    name: team.name,
    code: team.code,
    isArchived: team.isArchived,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}
