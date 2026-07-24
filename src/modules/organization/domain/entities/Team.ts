// ============================================================================
// src/modules/organization/domain/entities/Team.ts
//
// An operational grouping of Users for supervision, allocation, and
// reporting (organization.md), optionally scoped to a Branch. Framework-free:
// no Prisma types leak past the infrastructure/mappers layer.
// ============================================================================

export interface Team {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  code: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
