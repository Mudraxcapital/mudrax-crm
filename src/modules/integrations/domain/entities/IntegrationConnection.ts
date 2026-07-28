// ============================================================================
// src/modules/integrations/domain/entities/IntegrationConnection.ts
// ============================================================================

export const INTEGRATION_CONNECTION_STATUSES = ["DISABLED", "ENABLED", "ERROR"] as const;
export type IntegrationConnectionStatus = (typeof INTEGRATION_CONNECTION_STATUSES)[number];

export interface IntegrationConnection {
  id: string;
  organizationId: string;
  catalogCode: string;
  displayName: string;
  status: IntegrationConnectionStatus;
  leadCenterSource: string | null;
  config: Record<string, unknown> | null;
  credentialsRef: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldMapping {
  id: string;
  connectionId: string;
  organizationId: string;
  externalField: string;
  internalField: string;
  transform: string | null;
  isRequired: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export const WEBHOOK_ENDPOINT_STATUSES = ["ACTIVE", "DISABLED", "REVOKED"] as const;
export type WebhookEndpointStatus = (typeof WEBHOOK_ENDPOINT_STATUSES)[number];

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  connectionId: string | null;
  name: string;
  pathToken: string;
  secretHash: string;
  secretPrefix: string;
  status: WebhookEndpointStatus;
  leadCenterSource: string | null;
  lastReceivedAt: Date | null;
  receiveCount: number;
  createdByUserId: string | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const INTEGRATIONS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type IntegrationsActorType = (typeof INTEGRATIONS_ACTOR_TYPES)[number];

export interface IntegrationsAuditActor {
  type: IntegrationsActorType;
  id?: string | null;
}
