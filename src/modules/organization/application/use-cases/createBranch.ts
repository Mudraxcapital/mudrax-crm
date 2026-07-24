// ============================================================================
// src/modules/organization/application/use-cases/createBranch.ts
//
// Creates a new Branch scoped to the acting User's own Organization. Records
// an Audit Record for the creation atomically with the write
// (platform-contracts.md §4).
// ============================================================================

import type { BranchRepository } from "../../domain/repositories/BranchRepository";
import type { OrganizationAuditActor } from "../../domain/entities/OrganizationAuditRecord";
import { DuplicateBranchCodeError } from "../../domain/errors/BranchErrors";
import type { CreateBranchInput } from "../validators/branchSchemas";
import { toBranchDto, type BranchDto } from "../dto/BranchDto";

export interface CreateBranchCommand {
  organizationId: string;
  input: CreateBranchInput;
  actor: OrganizationAuditActor;
  correlationId?: string | null;
}

export function makeCreateBranch(repository: BranchRepository) {
  return async function createBranch(command: CreateBranchCommand): Promise<BranchDto> {
    const { organizationId, input, actor, correlationId } = command;

    const existing = await repository.findByCode(organizationId, input.code);
    if (existing) {
      throw new DuplicateBranchCodeError(input.code);
    }

    const created = await repository.createWithAudit(
      {
        organizationId,
        name: input.name,
        code: input.code,
        address: input.address ?? null,
        timezone: input.timezone,
        isArchived: input.isArchived,
      },
      actor,
      correlationId,
    );

    return toBranchDto(created);
  };
}
