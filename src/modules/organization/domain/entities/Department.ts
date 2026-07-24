// ============================================================================
// src/modules/organization/domain/entities/Department.ts
//
// A functional grouping such as Sales, Operations, Recovery, or HR
// (organization.md). Admin-configurable catalog — never a hardcoded enum.
// Framework-free: no Prisma types leak past the infrastructure/mappers layer.
// ============================================================================

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
