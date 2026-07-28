// Public API of the `integrations` module.
//
// Configuration surface for inbound/outbound connectors. This module never
// displays or mutates leads — connectors push normalized payloads into the
// Lead Center ingestion pipeline via ports.
//
// Protocol adapters live under `src/integrations/*` (existing plugin layout).
// This module owns enablement, credentials references, field mappings, and
// webhook registration — not transport adapters.

import { prisma } from "@/infra/db/client";
import { getCompanyId } from "@/infra/company/getCompanyId";
import { ingestLeads } from "@/modules/lead-center";
import { PrismaIntegrationsRepository } from "./infrastructure/repositories/PrismaIntegrationsRepository";
import { PrismaApiKeyAdapter } from "./infrastructure/adapters/PrismaApiKeyAdapter";
import {
  makeDisableConnection,
  makeEnableConnection,
  makeListConnections,
  makeListFieldMappings,
  makeSaveFieldMappings,
  makeUpdateConnectionConfig,
} from "./application/use-cases/manageConnections";
import {
  makeCreateWebhook,
  makeListWebhooks,
  makeRevokeWebhook,
} from "./application/use-cases/manageWebhooks";
import {
  makeCreateApiKey,
  makeListApiKeys,
  makeRevokeApiKey,
} from "./application/use-cases/manageApiKeys";
import {
  makeReceiveRestApiLead,
  makeReceiveWebhookLead,
  type LeadIngestPort,
} from "./application/use-cases/receiveInboundLead";
import {
  makeReceiveMetaLeadAds,
  makeVerifyMetaLeadAdsWebhook,
} from "./application/use-cases/receiveMetaLeadAds";

export {
  INTEGRATION_CATALOG,
  DEFAULT_FIELD_MAPPINGS,
  getIntegrationCatalog,
  getCatalogEntry,
  listInboundLeadIntegrations,
  type IntegrationCatalogEntry,
} from "./catalog";

export type {
  IntegrationConnection,
  FieldMapping,
  WebhookEndpoint,
  IntegrationConnectionStatus,
  WebhookEndpointStatus,
  IntegrationsAuditActor,
} from "./domain/entities/IntegrationConnection";
export {
  INTEGRATION_CONNECTION_STATUSES,
  WEBHOOK_ENDPOINT_STATUSES,
} from "./domain/entities/IntegrationConnection";
export {
  IntegrationsError,
  IntegrationConnectionNotFoundError,
  WebhookEndpointNotFoundError,
  IntegrationCatalogError,
  IntegrationAuthError,
} from "./domain/errors/IntegrationsErrors";
export type { IntegrationApiKeyView } from "./application/ports/ApiKeyPort";
export { applyFieldMappings } from "./application/services/secrets";
export {
  redactMetaLeadAdsConfigForUi,
  mergeMetaLeadAdsConfigUpdate,
} from "./application/services/metaLeadAdsConfig";

const repository = new PrismaIntegrationsRepository(prisma);
const apiKeys = new PrismaApiKeyAdapter(prisma);

const leadIngest: LeadIngestPort = {
  async ingest(input) {
    const result = await ingestLeads({
      organizationId: input.organizationId,
      sourceCode: input.sourceCode,
      rawLeads: input.rawLeads,
      actor: { type: input.actorUserId ? "USER" : "SYSTEM", id: input.actorUserId ?? null },
      receivedByUserId: input.actorUserId ?? null,
      connectorRef: input.connectorRef,
    });
    return {
      storedCount: result.storedCount,
      duplicateCount: result.duplicateCount,
      invalidCount: result.invalidCount,
      batchId: result.batch.id,
    };
  },
};

export const listConnections = makeListConnections(repository);
export const enableConnection = makeEnableConnection(repository);
export const disableConnection = makeDisableConnection(repository);
export const listFieldMappings = makeListFieldMappings(repository);
export const saveFieldMappings = makeSaveFieldMappings(repository);
export const updateConnectionConfig = makeUpdateConnectionConfig(repository);

export const listWebhooks = makeListWebhooks(repository);
export const createWebhook = makeCreateWebhook(repository);
export const revokeWebhook = makeRevokeWebhook(repository);

export const listApiKeys = makeListApiKeys(apiKeys);
export const createApiKey = makeCreateApiKey(apiKeys, repository);
export const revokeApiKey = makeRevokeApiKey(apiKeys, repository);

export const receiveWebhookLead = makeReceiveWebhookLead(repository, leadIngest);
export const receiveRestApiLead = makeReceiveRestApiLead(apiKeys, repository, leadIngest);
export const verifyMetaLeadAdsWebhook = makeVerifyMetaLeadAdsWebhook(repository);
export const receiveMetaLeadAds = makeReceiveMetaLeadAds(repository, leadIngest);

/** Single-company scope for API-key authenticated intake. */
export async function resolveOrganizationIdForUser(userId: string): Promise<string | null> {
  void userId;
  try {
    return await getCompanyId();
  } catch {
    return null;
  }
}
