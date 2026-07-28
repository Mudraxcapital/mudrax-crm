// ============================================================================
// src/modules/integrations/infrastructure/mappers/integrationsMapper.ts
// ============================================================================

import type {
  FieldMapping as PrismaFieldMapping,
  IntegrationConnection as PrismaConnection,
  Prisma,
  WebhookEndpoint as PrismaWebhook,
} from "@prisma/client";
import type {
  FieldMapping,
  IntegrationConnection,
  WebhookEndpoint,
} from "../../domain/entities/IntegrationConnection";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function toConnection(row: PrismaConnection): IntegrationConnection {
  return {
    id: row.id,
    organizationId: row.organizationId,
    catalogCode: row.catalogCode,
    displayName: row.displayName,
    status: row.status,
    leadCenterSource: row.leadCenterSource,
    config: asRecord(row.config),
    credentialsRef: row.credentialsRef,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toFieldMapping(row: PrismaFieldMapping): FieldMapping {
  return {
    id: row.id,
    connectionId: row.connectionId,
    organizationId: row.organizationId,
    externalField: row.externalField,
    internalField: row.internalField,
    transform: row.transform,
    isRequired: row.isRequired,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toWebhook(row: PrismaWebhook): WebhookEndpoint {
  return {
    id: row.id,
    organizationId: row.organizationId,
    connectionId: row.connectionId,
    name: row.name,
    pathToken: row.pathToken,
    secretHash: row.secretHash,
    secretPrefix: row.secretPrefix,
    status: row.status,
    leadCenterSource: row.leadCenterSource,
    lastReceivedAt: row.lastReceivedAt,
    receiveCount: row.receiveCount,
    createdByUserId: row.createdByUserId,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
