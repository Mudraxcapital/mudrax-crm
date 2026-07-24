// ============================================================================
// src/modules/organization/application/use-cases/getDepartment.ts
//
// Read-only lookups for the Department aggregate.
// ============================================================================

import type { DepartmentRepository } from "../../domain/repositories/DepartmentRepository";
import { DepartmentNotFoundError } from "../../domain/errors/DepartmentErrors";
import { toDepartmentDto, type DepartmentDto } from "../dto/DepartmentDto";

export function makeGetDepartment(repository: DepartmentRepository) {
  return async function getDepartment(id: string): Promise<DepartmentDto> {
    const department = await repository.findById(id);
    if (!department) {
      throw new DepartmentNotFoundError(id);
    }
    return toDepartmentDto(department);
  };
}

export function makeListDepartments(repository: DepartmentRepository) {
  return async function listDepartments(organizationId: string): Promise<DepartmentDto[]> {
    const departments = await repository.list(organizationId);
    return departments.map(toDepartmentDto);
  };
}
