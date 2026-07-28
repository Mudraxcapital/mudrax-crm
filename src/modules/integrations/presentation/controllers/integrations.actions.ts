"use server";

// ============================================================================
// src/modules/integrations/presentation/controllers/integrations.actions.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import { isCallerWorkspaceUser } from "@/modules/rbac";
import {
  createApiKey,
  createWebhook,
  disableConnection,
  enableConnection,
  IntegrationCatalogError,
  listConnections,
  mergeMetaLeadAdsConfigUpdate,
  revokeApiKey,
  revokeWebhook,
  saveFieldMappings,
  updateConnectionConfig,
} from "@/modules/integrations";

export interface IntegrationsActionState {
  error?: string;
  success?: string;
  plaintextSecret?: string;
  plaintextKey?: string;
  webhookPath?: string;
}

async function requireManage() {
  const current = await requirePermission("integration.manage");
  if (isCallerWorkspaceUser(current.authContext)) {
    throw new IntegrationCatalogError("Callers cannot configure integrations.");
  }
  return current;
}

export async function enableConnectionAction(
  _prev: IntegrationsActionState | undefined,
  formData: FormData,
): Promise<IntegrationsActionState> {
  try {
    const { session, authContext } = await requireManage();
    const catalogCode = String(formData.get("catalogCode") ?? "").trim();
    await enableConnection({
      organizationId: authContext.organizationId,
      catalogCode,
      actor: { type: "USER", id: session.user.id },
    });
    revalidatePath("/integrations");
    return { success: `Enabled ${catalogCode}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enable failed." };
  }
}

export async function disableConnectionAction(
  _prev: IntegrationsActionState | undefined,
  formData: FormData,
): Promise<IntegrationsActionState> {
  try {
    const { session, authContext } = await requireManage();
    const connectionId = String(formData.get("connectionId") ?? "").trim();
    await disableConnection({
      organizationId: authContext.organizationId,
      connectionId,
      actor: { type: "USER", id: session.user.id },
    });
    revalidatePath("/integrations");
    return { success: "Connection disabled." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Disable failed." };
  }
}

export async function saveMappingsAction(
  _prev: IntegrationsActionState | undefined,
  formData: FormData,
): Promise<IntegrationsActionState> {
  try {
    const { session, authContext } = await requireManage();
    const connectionId = String(formData.get("connectionId") ?? "").trim();
    const raw = String(formData.get("mappingsJson") ?? "[]");
    const parsed = JSON.parse(raw) as Array<{
      externalField: string;
      internalField: string;
      isRequired?: boolean;
    }>;
    await saveFieldMappings({
      organizationId: authContext.organizationId,
      connectionId,
      actor: { type: "USER", id: session.user.id },
      mappings: parsed,
    });
    revalidatePath("/integrations");
    return { success: "Field mappings saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Save mappings failed." };
  }
}

export async function saveMetaAdsConfigAction(
  _prev: IntegrationsActionState | undefined,
  formData: FormData,
): Promise<IntegrationsActionState> {
  try {
    const { session, authContext } = await requireManage();
    const connectionId = String(formData.get("connectionId") ?? "").trim();
    const connections = await listConnections(authContext.organizationId);
    const connection = connections.find((row) => row.id === connectionId);
    if (!connection || connection.catalogCode !== "facebook_lead_ads") {
      return { error: "Facebook Lead Ads connection not found." };
    }

    const nextConfig = mergeMetaLeadAdsConfigUpdate(connection.config, {
      pageId: String(formData.get("pageId") ?? ""),
      verifyToken: String(formData.get("verifyToken") ?? ""),
      pageAccessToken: String(formData.get("pageAccessToken") ?? ""),
      appSecret: String(formData.get("appSecret") ?? ""),
      graphVersion: String(formData.get("graphVersion") ?? ""),
      formIds: String(formData.get("formIds") ?? ""),
    });

    const resolvedVerify = String(nextConfig.verifyToken ?? "").trim();
    const resolvedToken = String(nextConfig.pageAccessToken ?? "").trim();
    if (!resolvedVerify) {
      return { error: "Verify token is required for Meta webhook subscription." };
    }
    if (!resolvedToken) {
      return { error: "Page access token is required to fetch leads from Meta." };
    }

    await updateConnectionConfig({
      organizationId: authContext.organizationId,
      connectionId,
      actor: { type: "USER", id: session.user.id },
      config: nextConfig,
    });
    revalidatePath("/integrations");
    return { success: "Meta Ads settings saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Save Meta config failed." };
  }
}

export async function createWebhookAction(
  _prev: IntegrationsActionState | undefined,
  formData: FormData,
): Promise<IntegrationsActionState> {
  try {
    const { session, authContext } = await requireManage();
    const result = await createWebhook({
      organizationId: authContext.organizationId,
      name: String(formData.get("name") ?? "").trim(),
      connectionId: String(formData.get("connectionId") ?? "").trim() || null,
      leadCenterSource:
        String(formData.get("leadCenterSource") ?? "").trim() || "FACEBOOK_LEAD_ADS",
      actor: { type: "USER", id: session.user.id },
    });
    revalidatePath("/integrations");
    return {
      success: "Webhook created. Copy the secret now — it will not be shown again.",
      plaintextSecret: result.plaintextSecret,
      webhookPath: result.path,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Create webhook failed." };
  }
}

export async function revokeWebhookAction(
  _prev: IntegrationsActionState | undefined,
  formData: FormData,
): Promise<IntegrationsActionState> {
  try {
    const { session, authContext } = await requireManage();
    await revokeWebhook({
      organizationId: authContext.organizationId,
      webhookId: String(formData.get("webhookId") ?? "").trim(),
      actor: { type: "USER", id: session.user.id },
    });
    revalidatePath("/integrations");
    return { success: "Webhook revoked." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Revoke webhook failed." };
  }
}

export async function createApiKeyAction(
  _prev: IntegrationsActionState | undefined,
  formData: FormData,
): Promise<IntegrationsActionState> {
  try {
    const { session, authContext } = await requireManage();
    const created = await createApiKey({
      organizationId: authContext.organizationId,
      ownerUserId: session.user.id,
      name: String(formData.get("name") ?? "").trim(),
      integrationRef: String(formData.get("integrationRef") ?? "rest_api").trim() || "rest_api",
      actor: { type: "USER", id: session.user.id },
    });
    revalidatePath("/integrations");
    return {
      success: "API key created. Copy it now — it will not be shown again.",
      plaintextKey: created.plaintextKey,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Create API key failed." };
  }
}

export async function revokeApiKeyAction(
  _prev: IntegrationsActionState | undefined,
  formData: FormData,
): Promise<IntegrationsActionState> {
  try {
    const { session, authContext } = await requireManage();
    await revokeApiKey({
      organizationId: authContext.organizationId,
      ownerUserId: session.user.id,
      apiKeyId: String(formData.get("apiKeyId") ?? "").trim(),
      actor: { type: "USER", id: session.user.id },
    });
    revalidatePath("/integrations");
    return { success: "API key revoked." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Revoke API key failed." };
  }
}
