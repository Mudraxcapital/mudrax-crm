// ============================================================================
// src/modules/integrations/infrastructure/repositories/PrismaIntegrationsRepository.ts
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import { prisma as defaultPrisma } from "@/infra/db/client";
import type {
  CreateConnectionData,
  CreateWebhookData,
  IntegrationsRepository,
  UpdateConnectionData,
  UpsertFieldMappingData,
} from "../../domain/repositories/IntegrationsRepository";
import type {
  FieldMapping,
  IntegrationConnection,
  IntegrationsAuditActor,
  WebhookEndpoint,
  WebhookEndpointStatus,
} from "../../domain/entities/IntegrationConnection";
import {
  toConnection,
  toFieldMapping,
  toJson,
  toWebhook,
} from "../mappers/integrationsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaIntegrationsRepository implements IntegrationsRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  private db(): PrismaClient {
    const client = this.prisma;
    if (
      typeof (client as unknown as { integrationConnection?: { findMany?: unknown } })
        .integrationConnection?.findMany !== "function"
    ) {
      throw new Error(
        "Prisma client is missing integrationConnection. Stop the Next.js server, run `npx prisma generate`, then start `next dev` again.",
      );
    }
    return client;
  }

  async listConnections(organizationId: string): Promise<IntegrationConnection[]> {
    const rows = await this.db().integrationConnection.findMany({
      where: { organizationId },
      orderBy: { displayName: "asc" },
    });
    return rows.map(toConnection);
  }

  async findConnectionById(id: string): Promise<IntegrationConnection | null> {
    const row = await this.db().integrationConnection.findUnique({ where: { id } });
    return row ? toConnection(row) : null;
  }

  async findConnectionByCode(organizationId: string, catalogCode: string) {
    const row = await this.db().integrationConnection.findUnique({
      where: { organizationId_catalogCode: { organizationId, catalogCode } },
    });
    return row ? toConnection(row) : null;
  }

  async createConnection(data: CreateConnectionData): Promise<IntegrationConnection> {
    const row = await this.db().integrationConnection.create({
      data: {
        organizationId: data.organizationId,
        catalogCode: data.catalogCode,
        displayName: data.displayName,
        status: data.status ?? "DISABLED",
        leadCenterSource: data.leadCenterSource ?? null,
        config: data.config ? toJson(data.config) : undefined,
        credentialsRef: data.credentialsRef ?? null,
        createdByUserId: data.createdByUserId ?? null,
      },
    });
    return toConnection(row);
  }

  async updateConnection(id: string, data: UpdateConnectionData): Promise<IntegrationConnection> {
    const row = await this.db().integrationConnection.update({
      where: { id },
      data: {
        displayName: data.displayName,
        status: data.status,
        config:
          data.config === undefined
            ? undefined
            : data.config === null
              ? PrismaNS.DbNull
              : toJson(data.config),
        credentialsRef: data.credentialsRef,
        updatedByUserId: data.updatedByUserId,
        lastSyncedAt: data.lastSyncedAt,
      },
    });
    return toConnection(row);
  }

  async listFieldMappings(connectionId: string): Promise<FieldMapping[]> {
    const rows = await this.db().fieldMapping.findMany({
      where: { connectionId },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toFieldMapping);
  }

  async replaceFieldMappings(
    connectionId: string,
    organizationId: string,
    mappings: UpsertFieldMappingData[],
  ): Promise<FieldMapping[]> {
    const db = this.db();
    await db.$transaction([
      db.fieldMapping.deleteMany({ where: { connectionId } }),
      db.fieldMapping.createMany({
        data: mappings.map((mapping) => ({
          connectionId,
          organizationId,
          externalField: mapping.externalField,
          internalField: mapping.internalField,
          transform: mapping.transform ?? null,
          isRequired: mapping.isRequired ?? false,
          sortOrder: mapping.sortOrder ?? 0,
        })),
      }),
    ]);
    return this.listFieldMappings(connectionId);
  }

  async listWebhooks(organizationId: string): Promise<WebhookEndpoint[]> {
    const rows = await this.db().webhookEndpoint.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toWebhook);
  }

  async findWebhookById(id: string): Promise<WebhookEndpoint | null> {
    const row = await this.db().webhookEndpoint.findUnique({ where: { id } });
    return row ? toWebhook(row) : null;
  }

  async findWebhookByPathToken(pathToken: string): Promise<WebhookEndpoint | null> {
    const row = await this.db().webhookEndpoint.findUnique({ where: { pathToken } });
    return row ? toWebhook(row) : null;
  }

  async createWebhook(data: CreateWebhookData): Promise<WebhookEndpoint> {
    const row = await this.db().webhookEndpoint.create({
      data: {
        organizationId: data.organizationId,
        connectionId: data.connectionId ?? null,
        name: data.name,
        pathToken: data.pathToken,
        secretHash: data.secretHash,
        secretPrefix: data.secretPrefix,
        leadCenterSource: data.leadCenterSource ?? null,
        createdByUserId: data.createdByUserId ?? null,
        status: "ACTIVE",
      },
    });
    return toWebhook(row);
  }

  async updateWebhookStatus(
    id: string,
    status: WebhookEndpointStatus,
    revokedAt?: Date | null,
  ): Promise<WebhookEndpoint> {
    const row = await this.db().webhookEndpoint.update({
      where: { id },
      data: { status, revokedAt: revokedAt === undefined ? undefined : revokedAt },
    });
    return toWebhook(row);
  }

  async recordWebhookReceive(id: string): Promise<void> {
    await this.db().webhookEndpoint.update({
      where: { id },
      data: {
        lastReceivedAt: new Date(),
        receiveCount: { increment: 1 },
      },
    });
  }

  async appendAudit(input: {
    organizationId: string;
    actor: IntegrationsAuditActor;
    action: string;
    targetType: string;
    targetId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.db().integrationsAuditLog.create({
      data: {
        organizationId: input.organizationId,
        actorType: input.actor.type,
        actorId: input.actor.id ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        beforeState: input.beforeState ? toJson(input.beforeState) : undefined,
        afterState: input.afterState ? toJson(input.afterState) : undefined,
        recordHash: PLACEHOLDER_RECORD_HASH,
      },
    });
  }
}
