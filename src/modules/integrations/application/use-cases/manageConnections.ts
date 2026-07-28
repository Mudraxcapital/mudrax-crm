// ============================================================================
// src/modules/integrations/application/use-cases/manageConnections.ts
// ============================================================================

import type { IntegrationsRepository } from "../../domain/repositories/IntegrationsRepository";
import type { IntegrationsAuditActor } from "../../domain/entities/IntegrationConnection";
import {
  IntegrationCatalogError,
  IntegrationConnectionNotFoundError,
} from "../../domain/errors/IntegrationsErrors";
import { DEFAULT_FIELD_MAPPINGS, getCatalogEntry } from "../../catalog";

export function makeListConnections(repository: IntegrationsRepository) {
  return async function listConnections(organizationId: string) {
    return repository.listConnections(organizationId);
  };
}

export function makeEnableConnection(repository: IntegrationsRepository) {
  return async function enableConnection(input: {
    organizationId: string;
    catalogCode: string;
    actor: IntegrationsAuditActor;
    config?: Record<string, unknown> | null;
  }) {
    const catalog = getCatalogEntry(input.catalogCode);
    if (!catalog) throw new IntegrationCatalogError(`Unknown integration: ${input.catalogCode}`);
    if (!catalog.available) {
      throw new IntegrationCatalogError(`${catalog.label} is not available yet.`);
    }

    let connection = await repository.findConnectionByCode(
      input.organizationId,
      input.catalogCode,
    );
    if (!connection) {
      connection = await repository.createConnection({
        organizationId: input.organizationId,
        catalogCode: catalog.code,
        displayName: catalog.label,
        status: "ENABLED",
        leadCenterSource: catalog.leadCenterSource ?? null,
        config: input.config ?? null,
        createdByUserId: input.actor.id ?? null,
      });
      if (catalog.leadCenterSource) {
        await repository.replaceFieldMappings(
          connection.id,
          input.organizationId,
          DEFAULT_FIELD_MAPPINGS.map((mapping) => ({
            connectionId: connection!.id,
            organizationId: input.organizationId,
            ...mapping,
          })),
        );
      }
    } else {
      connection = await repository.updateConnection(connection.id, {
        status: "ENABLED",
        config: input.config === undefined ? undefined : input.config,
        updatedByUserId: input.actor.id ?? null,
      });
    }

    await repository.appendAudit({
      organizationId: input.organizationId,
      actor: input.actor,
      action: "connection.enabled",
      targetType: "IntegrationConnection",
      targetId: connection.id,
      afterState: { catalogCode: connection.catalogCode, status: connection.status },
    });
    return connection;
  };
}

export function makeDisableConnection(repository: IntegrationsRepository) {
  return async function disableConnection(input: {
    organizationId: string;
    connectionId: string;
    actor: IntegrationsAuditActor;
  }) {
    const connection = await repository.findConnectionById(input.connectionId);
    if (!connection || connection.organizationId !== input.organizationId) {
      throw new IntegrationConnectionNotFoundError(input.connectionId);
    }
    const updated = await repository.updateConnection(connection.id, {
      status: "DISABLED",
      updatedByUserId: input.actor.id ?? null,
    });
    await repository.appendAudit({
      organizationId: input.organizationId,
      actor: input.actor,
      action: "connection.disabled",
      targetType: "IntegrationConnection",
      targetId: connection.id,
    });
    return updated;
  };
}

export function makeSaveFieldMappings(repository: IntegrationsRepository) {
  return async function saveFieldMappings(input: {
    organizationId: string;
    connectionId: string;
    actor: IntegrationsAuditActor;
    mappings: Array<{
      externalField: string;
      internalField: string;
      isRequired?: boolean;
      sortOrder?: number;
    }>;
  }) {
    const connection = await repository.findConnectionById(input.connectionId);
    if (!connection || connection.organizationId !== input.organizationId) {
      throw new IntegrationConnectionNotFoundError(input.connectionId);
    }
    const cleaned = input.mappings
      .map((mapping, index) => ({
        connectionId: connection.id,
        organizationId: input.organizationId,
        externalField: mapping.externalField.trim(),
        internalField: mapping.internalField.trim(),
        isRequired: mapping.isRequired ?? false,
        sortOrder: mapping.sortOrder ?? index,
      }))
      .filter((mapping) => mapping.externalField && mapping.internalField);

    const saved = await repository.replaceFieldMappings(
      connection.id,
      input.organizationId,
      cleaned,
    );
    await repository.appendAudit({
      organizationId: input.organizationId,
      actor: input.actor,
      action: "connection.field_mappings_saved",
      targetType: "IntegrationConnection",
      targetId: connection.id,
      afterState: { count: saved.length },
    });
    return saved;
  };
}

export function makeUpdateConnectionConfig(repository: IntegrationsRepository) {
  return async function updateConnectionConfig(input: {
    organizationId: string;
    connectionId: string;
    actor: IntegrationsAuditActor;
    config: Record<string, unknown>;
  }) {
    const connection = await repository.findConnectionById(input.connectionId);
    if (!connection || connection.organizationId !== input.organizationId) {
      throw new IntegrationConnectionNotFoundError(input.connectionId);
    }
    const updated = await repository.updateConnection(connection.id, {
      config: input.config,
      updatedByUserId: input.actor.id ?? null,
    });
    await repository.appendAudit({
      organizationId: input.organizationId,
      actor: input.actor,
      action: "connection.config_updated",
      targetType: "IntegrationConnection",
      targetId: connection.id,
      afterState: {
        catalogCode: connection.catalogCode,
        keys: Object.keys(input.config),
      },
    });
    return updated;
  };
}

export function makeListFieldMappings(repository: IntegrationsRepository) {
  return async function listFieldMappings(connectionId: string) {
    return repository.listFieldMappings(connectionId);
  };
}
