// ============================================================================
// src/modules/organization/domain/entities/Branch.ts
//
// A physical/operational office of the Organization (organization.md,
// prisma/models/organization.prisma). Framework-free: no Prisma types leak
// past the infrastructure/mappers layer.
//
// `regionId` exists on the underlying table but is intentionally not
// surfaced here — Region is architecture documentation only in this pass
// (docs/modules/organization.md's Implementation Status); grouping Branches
// under a Region is additive future work, never a redesign of Branch itself.
// ============================================================================

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address: string | null;
  timezone: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
