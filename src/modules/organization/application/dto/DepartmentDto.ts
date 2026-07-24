// ============================================================================
// src/modules/organization/application/dto/DepartmentDto.ts
//
// What the Department aggregate's use-cases return to the presentation
// layer — a plain, serializable shape (dates as ISO strings).
// ============================================================================

import type { Department } from "../../domain/entities/Department";

export interface DepartmentDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toDepartmentDto(department: Department): DepartmentDto {
  return {
    id: department.id,
    organizationId: department.organizationId,
    name: department.name,
    code: department.code,
    isArchived: department.isArchived,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  };
}
