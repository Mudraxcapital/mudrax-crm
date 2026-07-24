// ============================================================================
// src/modules/organization/application/use-cases/updateTeam.ts
//
// Updates an existing Team. Records an Audit Record capturing the
// before/after snapshot atomically with the write (platform-contracts.md
// §4). See createTeam.ts's doc comment for the cross-aggregate `branchId`
// validation rationale.
// ============================================================================

import type { TeamRepository } from "../../domain/repositories/TeamRepository";
import type { BranchRepository } from "../../domain/repositories/BranchRepository";
import type { OrganizationAuditActor } from "../../domain/entities/OrganizationAuditRecord";
import {
  DuplicateTeamCodeError,
  InvalidBranchReferenceError,
  TeamNotFoundError,
} from "../../domain/errors/TeamErrors";
import type { UpdateTeamInput } from "../validators/teamSchemas";
import { toTeamDto, type TeamDto } from "../dto/TeamDto";

export interface UpdateTeamCommand {
  id: string;
  input: UpdateTeamInput;
  actor: OrganizationAuditActor;
  correlationId?: string | null;
}

export function makeUpdateTeam(repository: TeamRepository, branchRepository: BranchRepository) {
  return async function updateTeam(command: UpdateTeamCommand): Promise<TeamDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new TeamNotFoundError(id);
    }

    if (input.code && input.code !== existing.code) {
      const codeOwner = await repository.findByCode(existing.organizationId, input.code);
      if (codeOwner && codeOwner.id !== id) {
        throw new DuplicateTeamCodeError(input.code);
      }
    }

    if (input.branchId) {
      const branch = await branchRepository.findById(input.branchId);
      if (!branch || branch.organizationId !== existing.organizationId) {
        throw new InvalidBranchReferenceError(input.branchId);
      }
    }

    const updated = await repository.updateWithAudit(id, input, actor, correlationId);

    return toTeamDto(updated);
  };
}
