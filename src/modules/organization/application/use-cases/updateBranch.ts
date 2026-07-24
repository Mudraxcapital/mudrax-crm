// ============================================================================
// src/modules/organization/application/use-cases/updateBranch.ts
//
// Updates an existing Branch. Records an Audit Record capturing the
// before/after snapshot atomically with the write (platform-contracts.md
// §4).
// ============================================================================

import type { BranchRepository } from "../../domain/repositories/BranchRepository";
import type { OrganizationAuditActor } from "../../domain/entities/OrganizationAuditRecord";
import { BranchNotFoundError, DuplicateBranchCodeError } from "../../domain/errors/BranchErrors";
import type { UpdateBranchInput } from "../validators/branchSchemas";
import { toBranchDto, type BranchDto } from "../dto/BranchDto";

export interface UpdateBranchCommand {
  id: string;
  input: UpdateBranchInput;
  actor: OrganizationAuditActor;
  correlationId?: string | null;
}

export function makeUpdateBranch(repository: BranchRepository) {
  return async function updateBranch(command: UpdateBranchCommand): Promise<BranchDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new BranchNotFoundError(id);
    }

    if (input.code && input.code !== existing.code) {
      const codeOwner = await repository.findByCode(existing.organizationId, input.code);
      if (codeOwner && codeOwner.id !== id) {
        throw new DuplicateBranchCodeError(input.code);
      }
    }

    const updated = await repository.updateWithAudit(id, input, actor, correlationId);

    return toBranchDto(updated);
  };
}
