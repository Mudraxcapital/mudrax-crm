// ============================================================================
// src/modules/lead-center/infrastructure/mappers/leadCenterMapper.ts
// ============================================================================

import type {
  IngestionBatch as PrismaIngestionBatch,
  LeadCenterSourceBucket as PrismaSourceBucket,
  Prisma,
  StagedLead as PrismaStagedLead,
} from "@prisma/client";
import type { IngestionBatch, LeadCenterSourceBucket } from "../../domain/entities/IngestionBatch";
import type { StagedLead } from "../../domain/entities/StagedLead";

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asStringErrors(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
}

export function toSourceBucket(row: PrismaSourceBucket): LeadCenterSourceBucket {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toIngestionBatch(row: PrismaIngestionBatch): IngestionBatch {
  return {
    id: row.id,
    organizationId: row.organizationId,
    sourceBucketId: row.sourceBucketId,
    sourceCode: row.sourceCode,
    receivedByUserId: row.receivedByUserId,
    sourceFileName: row.sourceFileName,
    connectorRef: row.connectorRef,
    status: row.status,
    totalCount: row.totalCount,
    storedCount: row.storedCount,
    duplicateCount: row.duplicateCount,
    invalidCount: row.invalidCount,
    ownerManagerId: row.ownerManagerId,
    ownerTeamLeadId: row.ownerTeamLeadId,
    meta: row.meta ? asRecord(row.meta) : null,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

export function toStagedLead(row: PrismaStagedLead): StagedLead {
  return {
    id: row.id,
    organizationId: row.organizationId,
    ingestionBatchId: row.ingestionBatchId,
    sourceBucketId: row.sourceBucketId,
    sourceCode: row.sourceCode,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    campaignNameHint: row.campaignNameHint,
    rawPayload: asRecord(row.rawPayload),
    normalizedPayload: row.normalizedPayload ? asRecord(row.normalizedPayload) : null,
    status: row.status,
    duplicateStatus: row.duplicateStatus,
    validationStatus: row.validationStatus,
    importStatus: row.importStatus,
    matchReason: row.matchReason,
    matchedLeadId: row.matchedLeadId,
    matchedCustomerId: row.matchedCustomerId,
    validationErrors: asStringErrors(row.validationErrors),
    tags: asStringArray(row.tags),
    branchId: row.branchId,
    assignedManagerUserId: row.assignedManagerUserId,
    ownerManagerId: row.ownerManagerId,
    ownerTeamLeadId: row.ownerTeamLeadId,
    importedLeadId: row.importedLeadId,
    importedCampaignId: row.importedCampaignId,
    importedAt: row.importedAt,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
