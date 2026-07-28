// ============================================================================
// src/modules/integrations/application/services/metaLeadAdsConfig.ts
// ============================================================================

export interface MetaLeadAdsConnectionConfig {
  pageId: string;
  verifyToken: string;
  pageAccessToken: string;
  appSecret: string;
  graphVersion: string | null;
  formIds: string[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

/** Merge connection.config with optional env fallbacks (never log tokens). */
export function resolveMetaLeadAdsConfig(
  config: Record<string, unknown> | null | undefined,
): MetaLeadAdsConnectionConfig {
  return {
    pageId: asString(config?.pageId) || asString(process.env.META_PAGE_ID),
    verifyToken:
      asString(config?.verifyToken) ||
      asString(process.env.META_VERIFY_TOKEN) ||
      asString(process.env.FACEBOOK_LEAD_ADS_VERIFY_TOKEN),
    pageAccessToken:
      asString(config?.pageAccessToken) ||
      asString(process.env.META_PAGE_ACCESS_TOKEN) ||
      asString(process.env.FACEBOOK_LEAD_ADS_PAGE_ACCESS_TOKEN),
    appSecret:
      asString(config?.appSecret) ||
      asString(process.env.META_APP_SECRET) ||
      asString(process.env.FACEBOOK_LEAD_ADS_APP_SECRET),
    graphVersion: asString(config?.graphVersion) || null,
    formIds: asStringArray(config?.formIds),
  };
}

export function redactMetaLeadAdsConfigForUi(
  config: Record<string, unknown> | null | undefined,
): {
  pageId: string;
  verifyTokenSet: boolean;
  pageAccessTokenSet: boolean;
  appSecretSet: boolean;
  graphVersion: string;
  formIds: string;
} {
  const resolved = resolveMetaLeadAdsConfig(config);
  return {
    pageId: resolved.pageId,
    verifyTokenSet: Boolean(resolved.verifyToken),
    pageAccessTokenSet: Boolean(resolved.pageAccessToken),
    appSecretSet: Boolean(resolved.appSecret),
    graphVersion: resolved.graphVersion ?? "",
    formIds: resolved.formIds.join(", "),
  };
}

/** Merge form updates into existing config; blank secret fields keep previous. */
export function mergeMetaLeadAdsConfigUpdate(
  existing: Record<string, unknown> | null | undefined,
  update: {
    pageId?: string;
    verifyToken?: string;
    pageAccessToken?: string;
    appSecret?: string;
    graphVersion?: string;
    formIds?: string;
  },
): Record<string, unknown> {
  const current = { ...(existing ?? {}) };
  if (update.pageId !== undefined) current.pageId = update.pageId.trim();
  if (update.graphVersion !== undefined) {
    current.graphVersion = update.graphVersion.trim() || null;
  }
  if (update.formIds !== undefined) {
    current.formIds = update.formIds
      .split(/[,;\s]+/)
      .map((id) => id.trim())
      .filter(Boolean);
  }
  if (update.verifyToken?.trim()) current.verifyToken = update.verifyToken.trim();
  if (update.pageAccessToken?.trim()) {
    current.pageAccessToken = update.pageAccessToken.trim();
  }
  if (update.appSecret?.trim()) current.appSecret = update.appSecret.trim();
  return current;
}
