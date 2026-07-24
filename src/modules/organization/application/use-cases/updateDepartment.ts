// ============================================================================
// src/modules/organization/application/use-cases/updateDepartment.ts
//
// Updates an existing Department. Records an Audit Record capturing the
// before/after snapshot atomically with the write (platform-contracts.md
// §4).
// ============================================================================

import type { DepartmentRepository } from "../../domain/repositories/DepartmentRepository";
import type { OrganizationAuditActor } from "../../domain/entities/OrganizationAuditRecord";
import {
  DepartmentNotFoundError,
  DuplicateDepartmentCodeError,
} from "../../domain/errors/DepartmentErrors";
import type { UpdateDepartmentInput } from "../validators/departmentSchemas";
import { toDepartmentDto, type DepartmentDto } from "../dto/DepartmentDto";

export interface UpdateDepartmentCommand {
  id: string;
  input: UpdateDepartmentInput;
  actor: OrganizationAuditActor;
  correlationId?: string | null;
}

export function makeUpdateDepartment(repository: DepartmentRepository) {
  return async function updateDepartment(command: UpdateDepartmentCommand): Promise<DepartmentDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new DepartmentNotFoundError(id);
    }

    if (input.code && input.code !== existing.code) {
      const codeOwner = await repository.findByCode(existing.organizationId, input.code);
      if (codeOwner && codeOwner.id !== id) {
        throw new DuplicateDepartmentCodeError(input.code);
      }
    }

    const updated = await repository.updateWithAudit(id, input, actor, correlationId);

    return toDepartmentDto(updated);
  };
}
