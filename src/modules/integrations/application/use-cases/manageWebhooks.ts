// ============================================================================
// src/modules/integrations/application/use-cases/manageWebhooks.ts
// ============================================================================

import type { IntegrationsRepository } from "../../domain/repositories/IntegrationsRepository";
import type { IntegrationsAuditActor } from "../../domain/entities/IntegrationConnection";
import {
  IntegrationCatalogError,
  WebhookEndpointNotFoundError,
} from "../../domain/errors/IntegrationsErrors";
import { generateToken, hashSecret, secretPrefix } from "../services/secrets";
import { resolveLeadCenterSource } from "./receiveInboundLead";

export function makeListWebhooks(repository: IntegrationsRepository) {
  return async function listWebhooks(organizationId: string) {
    return repository.listWebhooks(organizationId);
  };
}

export function makeCreateWebhook(repository: IntegrationsRepository) {
  return async function createWebhook(input: {
    organizationId: string;
    name: string;
    actor: IntegrationsAuditActor;
    connectionId?: string | null;
    leadCenterSource?: string | null;
  }) {
    const name = input.name.trim();
    if (name.length < 2) throw new IntegrationCatalogError("Webhook name is required.");

    let leadCenterSource = input.leadCenterSource?.trim() || null;
    if (input.connectionId) {
      const connection = await repository.findConnectionById(input.connectionId);
      if (!connection || connection.organizationId !== input.organizationId) {
        throw new IntegrationCatalogError("Integration connection not found.");
      }
      if (!leadCenterSource) {
        leadCenterSource = connection.leadCenterSource;
      }
    }

    // Product surface: Facebook / Google / WhatsApp only (Facebook is the available default).
    const resolvedSource = resolveLeadCenterSource(
      leadCenterSource ?? "FACEBOOK_LEAD_ADS",
      "Webhook Lead Center source",
    );

    const pathToken = generateToken(18);
    const plaintextSecret = `whsec_${generateToken(24)}`;
    const webhook = await repository.createWebhook({
      organizationId: input.organizationId,
      connectionId: input.connectionId ?? null,
      name,
      pathToken,
      secretHash: hashSecret(plaintextSecret),
      secretPrefix: secretPrefix(plaintextSecret),
      leadCenterSource: resolvedSource,
      createdByUserId: input.actor.id ?? null,
    });

    await repository.appendAudit({
      organizationId: input.organizationId,
      actor: input.actor,
      action: "webhook.created",
      targetType: "WebhookEndpoint",
      targetId: webhook.id,
      afterState: { name: webhook.name, pathToken: webhook.pathToken },
    });

    return {
      webhook,
      plaintextSecret,
      /** Relative ingest path — host is added by the UI. */
      path: `/api/integrations/webhooks/${webhook.pathToken}`,
    };
  };
}

export function makeRevokeWebhook(repository: IntegrationsRepository) {
  return async function revokeWebhook(input: {
    organizationId: string;
    webhookId: string;
    actor: IntegrationsAuditActor;
  }) {
    const webhook = await repository.findWebhookById(input.webhookId);
    if (!webhook || webhook.organizationId !== input.organizationId) {
      throw new WebhookEndpointNotFoundError(input.webhookId);
    }
    const updated = await repository.updateWebhookStatus(webhook.id, "REVOKED", new Date());
    await repository.appendAudit({
      organizationId: input.organizationId,
      actor: input.actor,
      action: "webhook.revoked",
      targetType: "WebhookEndpoint",
      targetId: webhook.id,
    });
    return updated;
  };
}
