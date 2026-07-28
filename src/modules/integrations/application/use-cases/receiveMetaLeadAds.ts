// ============================================================================
// src/modules/integrations/application/use-cases/receiveMetaLeadAds.ts
//
// Meta Lead Ads webhook → Graph fetch → field mapping → Lead Center ingest.
// ============================================================================

import {
  extractMetaLeadgenEvents,
  fetchMetaLeadById,
  verifyMetaSignature,
  verifyMetaWebhookSubscription,
} from "@/integrations/facebook/metaLeadAdsAdapter";
import type { IntegrationsRepository } from "../../domain/repositories/IntegrationsRepository";
import {
  IntegrationAuthError,
  IntegrationCatalogError,
} from "../../domain/errors/IntegrationsErrors";
import { applyFieldMappings } from "../services/secrets";
import { resolveMetaLeadAdsConfig } from "../services/metaLeadAdsConfig";
import type { LeadIngestPort } from "./receiveInboundLead";

const CATALOG_CODE = "facebook_lead_ads";

export function makeVerifyMetaLeadAdsWebhook(repository: IntegrationsRepository) {
  return async function verifyMetaLeadAdsWebhook(input: {
    organizationId: string;
    mode: string | null;
    verifyToken: string | null;
    challenge: string | null;
  }): Promise<string> {
    const connection = await repository.findConnectionByCode(
      input.organizationId,
      CATALOG_CODE,
    );
    if (!connection || connection.status !== "ENABLED") {
      throw new IntegrationCatalogError("Facebook Lead Ads is not enabled.");
    }
    const config = resolveMetaLeadAdsConfig(connection.config);
    if (!config.verifyToken) {
      throw new IntegrationCatalogError(
        "Facebook Lead Ads verify token is not configured.",
      );
    }
    const challenge = verifyMetaWebhookSubscription({
      mode: input.mode,
      verifyToken: input.verifyToken,
      challenge: input.challenge,
      expectedVerifyToken: config.verifyToken,
    });
    if (!challenge) {
      throw new IntegrationAuthError("Meta webhook verification failed.");
    }
    return challenge;
  };
}

export function makeReceiveMetaLeadAds(
  repository: IntegrationsRepository,
  ingest: LeadIngestPort,
  fetchImpl?: typeof fetch,
) {
  return async function receiveMetaLeadAds(input: {
    organizationId: string;
    rawBody: string;
    signatureHeader: string | null;
    payload: unknown;
  }) {
    const connection = await repository.findConnectionByCode(
      input.organizationId,
      CATALOG_CODE,
    );
    if (!connection || connection.status !== "ENABLED") {
      throw new IntegrationCatalogError("Facebook Lead Ads is not enabled.");
    }

    const config = resolveMetaLeadAdsConfig(connection.config);
    if (!config.pageAccessToken) {
      throw new IntegrationCatalogError(
        "Facebook Lead Ads page access token is not configured.",
      );
    }

    if (config.appSecret) {
      const ok = verifyMetaSignature(
        input.rawBody,
        input.signatureHeader,
        config.appSecret,
      );
      if (!ok) throw new IntegrationAuthError("Invalid Meta webhook signature.");
    }

    const events = extractMetaLeadgenEvents(input.payload);
    if (events.length === 0) {
      return {
        storedCount: 0,
        duplicateCount: 0,
        invalidCount: 0,
        batchId: null as string | null,
        skipped: 0,
        processed: 0,
      };
    }

    const allowedForms = new Set(config.formIds);
    const filtered = events.filter((event) => {
      if (config.pageId && event.pageId && event.pageId !== config.pageId) {
        return false;
      }
      if (allowedForms.size > 0 && event.formId && !allowedForms.has(event.formId)) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      return {
        storedCount: 0,
        duplicateCount: 0,
        invalidCount: 0,
        batchId: null as string | null,
        skipped: events.length,
        processed: 0,
      };
    }

    let mappings = await repository.listFieldMappings(connection.id);
    if (mappings.length === 0) {
      mappings = [
        { externalField: "full_name", internalField: "full_name" },
        { externalField: "full name", internalField: "full_name" },
        { externalField: "email", internalField: "email" },
        { externalField: "phone_number", internalField: "phone" },
        { externalField: "phone", internalField: "phone" },
      ].map((row, index) => ({
        id: `meta-default-${index}`,
        connectionId: connection.id,
        organizationId: connection.organizationId,
        transform: null,
        isRequired: false,
        sortOrder: index,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...row,
      }));
    }

    const rawLeads: Array<{ rowNumber: number; raw: Record<string, unknown> }> = [];
    const errors: string[] = [];

    for (const [index, event] of filtered.entries()) {
      try {
        const fetched = await fetchMetaLeadById({
          leadgenId: event.leadgenId,
          pageAccessToken: config.pageAccessToken,
          graphVersion: config.graphVersion,
          fetchImpl,
        });
        const mapped = applyFieldMappings(fetched.raw, mappings);
        rawLeads.push({
          rowNumber: index + 1,
          raw: {
            ...mapped,
            campaign: event.formId ?? mapped.campaign,
            meta_page_id: event.pageId,
            meta_form_id: event.formId,
            meta_ad_id: event.adId,
            meta_leadgen_id: event.leadgenId,
          },
        });
      } catch (error) {
        errors.push(
          error instanceof Error
            ? `${event.leadgenId}: ${error.message}`
            : `${event.leadgenId}: fetch failed`,
        );
      }
    }

    if (rawLeads.length === 0) {
      throw new IntegrationCatalogError(
        errors[0] ?? "No Meta leads could be fetched from Graph API.",
      );
    }

    const result = await ingest.ingest({
      organizationId: connection.organizationId,
      sourceCode: "FACEBOOK_LEAD_ADS",
      rawLeads,
      connectorRef: `meta_lead_ads:${connection.id}`,
    });

    await repository.updateConnection(connection.id, {
      lastSyncedAt: new Date(),
    });

    await repository.appendAudit({
      organizationId: connection.organizationId,
      actor: { type: "SYSTEM" },
      action: "meta_lead_ads.received",
      targetType: "IntegrationConnection",
      targetId: connection.id,
      afterState: {
        ...result,
        processed: rawLeads.length,
        skipped: events.length - filtered.length,
        fetchErrors: errors,
      },
    });

    return {
      ...result,
      skipped: events.length - filtered.length + errors.length,
      processed: rawLeads.length,
    };
  };
}
