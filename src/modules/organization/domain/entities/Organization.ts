// ============================================================================
// src/modules/organization/domain/entities/Organization.ts
//
// The single canonical company/company-unit scope referenced by every other
// bounded context's `organizationId` (platform-contracts.md §5,
// prisma/models/organization.prisma). Framework-free: no Prisma types leak
// past the infrastructure/mappers layer.
// ============================================================================

export const ORGANIZATION_STATUSES = ["ACTIVE", "SUSPENDED"] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export interface Organization {
  id: string;
  name: string;
  code: string;
  status: OrganizationStatus;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
