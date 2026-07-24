// ============================================================================
// src/modules/organization/application/use-cases/getBranch.ts
//
// Read-only lookups for the Branch aggregate.
// ============================================================================

import type { BranchRepository } from "../../domain/repositories/BranchRepository";
import { BranchNotFoundError } from "../../domain/errors/BranchErrors";
import { toBranchDto, type BranchDto } from "../dto/BranchDto";

export function makeGetBranch(repository: BranchRepository) {
  return async function getBranch(id: string): Promise<BranchDto> {
    const branch = await repository.findById(id);
    if (!branch) {
      throw new BranchNotFoundError(id);
    }
    return toBranchDto(branch);
  };
}

export function makeListBranches(repository: BranchRepository) {
  return async function listBranches(organizationId: string): Promise<BranchDto[]> {
    const branches = await repository.list(organizationId);
    return branches.map(toBranchDto);
  };
}
