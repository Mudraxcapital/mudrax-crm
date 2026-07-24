// ============================================================================
// src/modules/organization/application/use-cases/createTeam.ts
//
// Creates a new Team scoped to the acting User's own Organization, optionally
// scoped to a Branch. Records an Audit Record for the creation atomically
// with the write (platform-contracts.md §4).
//
// Depends on BranchRepository (same module, sibling aggregate) to validate
// `branchId` references a real Branch in the same Organization before
// writing — the explicit `findById -> null -> typed error` check already
// established by OrganizationRepository/BranchRepository's own
// not-found handling, applied here across an aggregate boundary instead of
// relying on the database's FK constraint to reject silently.
// ============================================================================

import type { TeamRepository } from "../../domain/repositories/TeamRepository";
import type { BranchRepository } from "../../domain/repositories/BranchRepository";
import type { OrganizationAuditActor } from "../../domain/entities/OrganizationAuditRecord";
import {
  DuplicateTeamCodeError,
  InvalidBranchReferenceError,
} from "../../domain/errors/TeamErrors";
import type { CreateTeamInput } from "../validators/teamSchemas";
import { toTeamDto, type TeamDto } from "../dto/TeamDto";

export interface CreateTeamCommand {
  organizationId: string;
  input: CreateTeamInput;
  actor: OrganizationAuditActor;
  correlationId?: string | null;
}

export function makeCreateTeam(repository: TeamRepository, branchRepository: BranchRepository) {
  return async function createTeam(command: CreateTeamCommand): Promise<TeamDto> {
    const { organizationId, input, actor, correlationId } = command;

    const existing = await repository.findByCode(organizationId, input.code);
    if (existing) {
      throw new DuplicateTeamCodeError(input.code);
    }

    if (input.branchId) {
      const branch = await branchRepository.findById(input.branchId);
      if (!branch || branch.organizationId !== organizationId) {
        throw new InvalidBranchReferenceError(input.branchId);
      }
    }

    const created = await repository.createWithAudit(
      {
        organizationId,
        branchId: input.branchId ?? null,
        name: input.name,
        code: input.code,
        isArchived: input.isArchived,
      },
      actor,
      correlationId,
    );

    return toTeamDto(created);
  };
}
