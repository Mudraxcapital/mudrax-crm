// ============================================================================
// src/modules/organization/application/use-cases/getTeam.ts
//
// Read-only lookups for the Team aggregate.
// ============================================================================

import type { TeamRepository } from "../../domain/repositories/TeamRepository";
import { TeamNotFoundError } from "../../domain/errors/TeamErrors";
import { toTeamDto, type TeamDto } from "../dto/TeamDto";

export function makeGetTeam(repository: TeamRepository) {
  return async function getTeam(id: string): Promise<TeamDto> {
    const team = await repository.findById(id);
    if (!team) {
      throw new TeamNotFoundError(id);
    }
    return toTeamDto(team);
  };
}

export function makeListTeams(repository: TeamRepository) {
  return async function listTeams(organizationId: string): Promise<TeamDto[]> {
    const teams = await repository.list(organizationId);
    return teams.map(toTeamDto);
  };
}
