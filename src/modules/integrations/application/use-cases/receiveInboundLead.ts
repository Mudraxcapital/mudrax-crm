// ============================================================================
// src/modules/integrations/application/use-cases/receiveInboundLead.ts
//
// Connector receive path → field mapping → Lead Center ingestLeads.
// ============================================================================

import {
  isLeadCenterSourceCode,
  type LeadCenterSourceCode,
} from "@/modules/lead-center/catalog";
import { getCatalogEntry } from "../../catalog";
import type { IntegrationsRepository } from "../../domain/repositories/IntegrationsRepository";
import type { ApiKeyPort } from "../ports/ApiKeyPort";
import {
  IntegrationAuthError,
  IntegrationCatalogError,
  WebhookEndpointNotFoundError,
} from "../../domain/errors/IntegrationsErrors";
import { applyFieldMappings, verifySecret } from "../services/secrets";

export interface LeadIngestPort {
  ingest(input: {
    organizationId: string;
    sourceCode: LeadCenterSourceCode;
    rawLeads: Array<{ rowNumber?: number; raw: Record<string, unknown> }>;
    connectorRef: string;
    actorUserId?: string | null;
  }): Promise<{ storedCount: number; duplicateCount: number; invalidCount: number; batchId: string }>;
}

const DEFAULT_FIELD_MAP = [
  { externalField: "name", internalField: "full_name" },
  { externalField: "full_name", internalField: "full_name" },
  { externalField: "phone", internalField: "phone" },
  { externalField: "email", internalField: "email" },
  { externalField: "campaign", internalField: "campaign" },
  { externalField: "tags", internalField: "tags" },
] as const;

/** Resolve a Lead Center source code; reject retired codes (REST_API, WEBSITE_FORMS, …). */
export function resolveLeadCenterSource(
  value: string | null | undefined,
  fallbackLabel = "Lead Center source",
): LeadCenterSourceCode {
  const code = (value ?? "").trim();
  if (!code || !isLeadCenterSourceCode(code)) {
    throw new IntegrationCatalogError(
      `${fallbackLabel} must be one of: FACEBOOK_LEAD_ADS, GOOGLE_ADS, WHATSAPP_BUSINESS.`,
    );
  }
  return code;
}

function sourceFromApiKeyRef(integrationRef: string | null | undefined): LeadCenterSourceCode | null {
  if (!integrationRef) return null;
  const entry = getCatalogEntry(integrationRef.trim());
  return entry?.leadCenterSource ?? null;
}

function extractSourceHint(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  for (const key of ["sourceCode", "source", "leadCenterSource"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function stripSourceHint(raw: Record<string, unknown>): Record<string, unknown> {
  const next = { ...raw };
  delete next.sourceCode;
  delete next.source;
  delete next.leadCenterSource;
  return next;
}

function normalizePayloadList(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body.filter((row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object" && !Array.isArray(row)),
    );
  }
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    if (Array.isArray(record.leads)) {
      return record.leads.filter((row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object" && !Array.isArray(row)),
      );
    }
    return [record];
  }
  throw new IntegrationCatalogError("Request body must be a JSON object or array of leads.");
}

export function makeReceiveWebhookLead(
  repository: IntegrationsRepository,
  ingest: LeadIngestPort,
) {
  return async function receiveWebhookLead(input: {
    pathToken: string;
    secretHeader: string | null;
    body: unknown;
  }) {
    const webhook = await repository.findWebhookByPathToken(input.pathToken);
    if (!webhook || webhook.status !== "ACTIVE") {
      throw new WebhookEndpointNotFoundError(input.pathToken);
    }
    if (!input.secretHeader || !verifySecret(input.secretHeader, webhook.secretHash)) {
      throw new IntegrationAuthError("Invalid webhook secret.");
    }

    let sourceCode = webhook.leadCenterSource;
    if ((!sourceCode || !isLeadCenterSourceCode(sourceCode)) && webhook.connectionId) {
      const connection = await repository.findConnectionById(webhook.connectionId);
      sourceCode = connection?.leadCenterSource ?? sourceCode;
    }
    const resolvedSource = resolveLeadCenterSource(
      sourceCode,
      "Webhook Lead Center source",
    );

    let mappings =
      webhook.connectionId != null
        ? await repository.listFieldMappings(webhook.connectionId)
        : [];
    if (mappings.length === 0) {
      mappings = DEFAULT_FIELD_MAP.map((row, index) => ({
        id: `default-${index}`,
        connectionId: webhook.connectionId ?? "",
        organizationId: webhook.organizationId,
        transform: null,
        isRequired: false,
        sortOrder: index,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...row,
      }));
    }

    const payloads = normalizePayloadList(input.body);
    const rawLeads = payloads.map((payload, index) => ({
      rowNumber: index + 1,
      raw: applyFieldMappings(payload, mappings),
    }));

    const result = await ingest.ingest({
      organizationId: webhook.organizationId,
      sourceCode: resolvedSource,
      rawLeads,
      connectorRef: `webhook:${webhook.id}`,
    });

    await repository.recordWebhookReceive(webhook.id);
    await repository.appendAudit({
      organizationId: webhook.organizationId,
      actor: { type: "SYSTEM" },
      action: "webhook.received",
      targetType: "WebhookEndpoint",
      targetId: webhook.id,
      afterState: result,
    });

    return result;
  };
}

export function makeReceiveRestApiLead(
  apiKeys: ApiKeyPort,
  repository: IntegrationsRepository,
  ingest: LeadIngestPort,
) {
  return async function receiveRestApiLead(input: {
    apiKeyHeader: string | null;
    body: unknown;
    organizationIdResolver: (ownerUserId: string) => Promise<string | null>;
  }) {
    if (!input.apiKeyHeader?.startsWith("Bearer ") && !input.apiKeyHeader?.startsWith("mxk_")) {
      throw new IntegrationAuthError("Missing API key (Authorization: Bearer mxk_… or raw key).");
    }
    const plaintext = input.apiKeyHeader.startsWith("Bearer ")
      ? input.apiKeyHeader.slice("Bearer ".length).trim()
      : input.apiKeyHeader.trim();

    const key = await apiKeys.findActiveByPlaintext(plaintext);
    if (!key) throw new IntegrationAuthError("Invalid or revoked API key.");

    const organizationId = await input.organizationIdResolver(key.ownerUserId);
    if (!organizationId) throw new IntegrationAuthError("API key owner has no organization.");

    const catalogRef = key.integrationRef?.trim() || null;
    const connection =
      catalogRef && getCatalogEntry(catalogRef)
        ? await repository.findConnectionByCode(organizationId, catalogRef)
        : null;
    if (connection && connection.status !== "ENABLED") {
      const label = (catalogRef && getCatalogEntry(catalogRef)?.label) || catalogRef || "Integration";
      throw new IntegrationCatalogError(`${label} integration is disabled.`);
    }

    const sourceCode = resolveLeadCenterSource(
      extractSourceHint(input.body) ??
        connection?.leadCenterSource ??
        sourceFromApiKeyRef(catalogRef),
      "REST lead source",
    );

    const mappings = connection ? await repository.listFieldMappings(connection.id) : [];
    const fieldMap = mappings.length > 0 ? mappings : [...DEFAULT_FIELD_MAP];

    const payloads = normalizePayloadList(input.body).map(stripSourceHint);
    const rawLeads = payloads.map((payload, index) => ({
      rowNumber: index + 1,
      raw: applyFieldMappings(payload, fieldMap),
    }));

    const result = await ingest.ingest({
      organizationId,
      sourceCode,
      rawLeads,
      connectorRef: `api_key:${key.id}`,
      actorUserId: key.ownerUserId,
    });

    await apiKeys.touchLastUsed(key.id);
    await repository.appendAudit({
      organizationId,
      actor: { type: "SYSTEM", id: key.ownerUserId },
      action: "rest_api.received",
      targetType: "ApiKey",
      targetId: key.id,
      afterState: result,
    });

    return result;
  };
}
