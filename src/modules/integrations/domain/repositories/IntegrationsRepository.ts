// ============================================================================
// src/modules/integrations/domain/repositories/IntegrationsRepository.ts
// ============================================================================

import type {
  FieldMapping,
  IntegrationConnection,
  IntegrationConnectionStatus,
  IntegrationsAuditActor,
  WebhookEndpoint,
  WebhookEndpointStatus,
} from "../entities/IntegrationConnection";

export interface CreateConnectionData {
  organizationId: string;
  catalogCode: string;
  displayName: string;
  status?: IntegrationConnectionStatus;
  leadCenterSource?: string | null;
  config?: Record<string, unknown> | null;
  credentialsRef?: string | null;
  createdByUserId?: string | null;
}

export interface UpdateConnectionData {
  displayName?: string;
  status?: IntegrationConnectionStatus;
  config?: Record<string, unknown> | null;
  credentialsRef?: string | null;
  updatedByUserId?: string | null;
  lastSyncedAt?: Date | null;
}

export interface UpsertFieldMappingData {
  connectionId: string;
  organizationId: string;
  externalField: string;
  internalField: string;
  transform?: string | null;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface CreateWebhookData {
  organizationId: string;
  connectionId?: string | null;
  name: string;
  pathToken: string;
  secretHash: string;
  secretPrefix: string;
  leadCenterSource?: string | null;
  createdByUserId?: string | null;
}

export interface IntegrationsRepository {
  listConnections(organizationId: string): Promise<IntegrationConnection[]>;
  findConnectionById(id: string): Promise<IntegrationConnection | null>;
  findConnectionByCode(
    organizationId: string,
    catalogCode: string,
  ): Promise<IntegrationConnection | null>;
  createConnection(data: CreateConnectionData): Promise<IntegrationConnection>;
  updateConnection(id: string, data: UpdateConnectionData): Promise<IntegrationConnection>;

  listFieldMappings(connectionId: string): Promise<FieldMapping[]>;
  replaceFieldMappings(
    connectionId: string,
    organizationId: string,
    mappings: UpsertFieldMappingData[],
  ): Promise<FieldMapping[]>;

  listWebhooks(organizationId: string): Promise<WebhookEndpoint[]>;
  findWebhookById(id: string): Promise<WebhookEndpoint | null>;
  findWebhookByPathToken(pathToken: string): Promise<WebhookEndpoint | null>;
  createWebhook(data: CreateWebhookData): Promise<WebhookEndpoint>;
  updateWebhookStatus(
    id: string,
    status: WebhookEndpointStatus,
    revokedAt?: Date | null,
  ): Promise<WebhookEndpoint>;
  recordWebhookReceive(id: string): Promise<void>;

  appendAudit(input: {
    organizationId: string;
    actor: IntegrationsAuditActor;
    action: string;
    targetType: string;
    targetId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
  }): Promise<void>;
}
