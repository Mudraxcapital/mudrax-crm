// ============================================================================
// src/modules/organization/application/use-cases/createDepartment.ts
//
// Creates a new Department scoped to the acting User's own Organization.
// Records an Audit Record for the creation atomically with the write
// (platform-contracts.md §4).
// ============================================================================

import type { DepartmentRepository } from "../../domain/repositories/DepartmentRepository";
import type { OrganizationAuditActor } from "../../domain/entities/OrganizationAuditRecord";
import { DuplicateDepartmentCodeError } from "../../domain/errors/DepartmentErrors";
import type { CreateDepartmentInput } from "../validators/departmentSchemas";
import { toDepartmentDto, type DepartmentDto } from "../dto/DepartmentDto";

export interface CreateDepartmentCommand {
  organizationId: string;
  input: CreateDepartmentInput;
  actor: OrganizationAuditActor;
  correlationId?: string | null;
}

export function makeCreateDepartment(repository: DepartmentRepository) {
  return async function createDepartment(command: CreateDepartmentCommand): Promise<DepartmentDto> {
    const { organizationId, input, actor, correlationId } = command;

    const existing = await repository.findByCode(organizationId, input.code);
    if (existing) {
      throw new DuplicateDepartmentCodeError(input.code);
    }

    const created = await repository.createWithAudit(
      {
        organizationId,
        name: input.name,
        code: input.code,
        isArchived: input.isArchived,
      },
      actor,
      correlationId,
    );

    return toDepartmentDto(created);
  };
}
