// ============================================================================
// src/modules/organization/infrastructure/mappers/organizationMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated `Organization`/`OrganizationAuditLog`
// shapes.
// ============================================================================

import type {
  Organization as PrismaOrganization,
  OrganizationAuditLog as PrismaOrganizationAuditLog,
} from "@prisma/client";
import type { Organization } from "../../domain/entities/Organization";
import type { OrganizationAuditRecord } from "../../domain/entities/OrganizationAuditRecord";

export function toOrganization(row: PrismaOrganization): Organization {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    timezone: row.timezone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toOrganizationAuditRecord(
  row: PrismaOrganizationAuditLog,
): OrganizationAuditRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    occurredAt: row.occurredAt,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: (row.beforeState as Record<string, unknown> | null) ?? null,
    afterState: (row.afterState as Record<string, unknown> | null) ?? null,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}
