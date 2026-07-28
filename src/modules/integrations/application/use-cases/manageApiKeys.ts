// ============================================================================
// src/modules/integrations/application/use-cases/manageApiKeys.ts
// ============================================================================

import type { ApiKeyPort } from "../ports/ApiKeyPort";
import type { IntegrationsRepository } from "../../domain/repositories/IntegrationsRepository";
import type { IntegrationsAuditActor } from "../../domain/entities/IntegrationConnection";
import { IntegrationCatalogError } from "../../domain/errors/IntegrationsErrors";

export function makeListApiKeys(apiKeys: ApiKeyPort) {
  return async function listApiKeys(ownerUserId: string) {
    return apiKeys.listForOrganizationOwner(ownerUserId);
  };
}

export function makeCreateApiKey(
  apiKeys: ApiKeyPort,
  repository: IntegrationsRepository,
) {
  return async function createApiKey(input: {
    organizationId: string;
    ownerUserId: string;
    name: string;
    actor: IntegrationsAuditActor;
    integrationRef?: string | null;
  }) {
    const name = input.name.trim();
    if (name.length < 2) throw new IntegrationCatalogError("API key name is required.");

    const created = await apiKeys.create({
      ownerUserId: input.ownerUserId,
      name,
      integrationRef: input.integrationRef ?? "rest_api",
      dataScope: "ORGANIZATION",
    });

    await repository.appendAudit({
      organizationId: input.organizationId,
      actor: input.actor,
      action: "api_key.created",
      targetType: "ApiKey",
      targetId: created.view.id,
      afterState: { name: created.view.name, keyPrefix: created.view.keyPrefix },
    });

    return created;
  };
}

export function makeRevokeApiKey(
  apiKeys: ApiKeyPort,
  repository: IntegrationsRepository,
) {
  return async function revokeApiKey(input: {
    organizationId: string;
    ownerUserId: string;
    apiKeyId: string;
    actor: IntegrationsAuditActor;
  }) {
    const revoked = await apiKeys.revoke(input.apiKeyId, input.ownerUserId);
    if (!revoked) throw new IntegrationCatalogError("API key not found or already revoked.");
    await repository.appendAudit({
      organizationId: input.organizationId,
      actor: input.actor,
      action: "api_key.revoked",
      targetType: "ApiKey",
      targetId: revoked.id,
    });
    return revoked;
  };
}
