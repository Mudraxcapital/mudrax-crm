// ============================================================================
// src/modules/lead-center/catalog.ts
//
// Stable source / status catalogs shared by the module public API and use-cases.
// Product surface: Facebook, Google Ads, and WhatsApp only.
// ============================================================================

export const LEAD_CENTER_SOURCE_CODES = [
  "FACEBOOK_LEAD_ADS",
  "GOOGLE_ADS",
  "WHATSAPP_BUSINESS",
] as const;

export type LeadCenterSourceCode = (typeof LEAD_CENTER_SOURCE_CODES)[number];

/** Import / filter scope including “all three sources”. */
export const LEAD_CENTER_IMPORT_SCOPES = ["ALL", ...LEAD_CENTER_SOURCE_CODES] as const;
export type LeadCenterImportScope = (typeof LEAD_CENTER_IMPORT_SCOPES)[number];

export const LEAD_CENTER_SOURCE_LABELS: Record<LeadCenterSourceCode, string> = {
  FACEBOOK_LEAD_ADS: "Facebook Lead Ads",
  GOOGLE_ADS: "Google Ads",
  WHATSAPP_BUSINESS: "WhatsApp Business",
};

export const LEAD_CENTER_IMPORT_SCOPE_LABELS: Record<LeadCenterImportScope, string> = {
  ALL: "All sources (Facebook, Google, WhatsApp)",
  FACEBOOK_LEAD_ADS: "Facebook Lead Ads",
  GOOGLE_ADS: "Google Ads",
  WHATSAPP_BUSINESS: "WhatsApp Business",
};

export function isLeadCenterSourceCode(value: string): value is LeadCenterSourceCode {
  return (LEAD_CENTER_SOURCE_CODES as readonly string[]).includes(value);
}

export function isLeadCenterImportScope(value: string): value is LeadCenterImportScope {
  return (LEAD_CENTER_IMPORT_SCOPES as readonly string[]).includes(value);
}

export function sourceCodesForImportScope(scope: LeadCenterImportScope): LeadCenterSourceCode[] {
  return scope === "ALL" ? [...LEAD_CENTER_SOURCE_CODES] : [scope];
}

export {
  STAGED_LEAD_STATUSES,
  type StagedLeadStatus,
} from "./domain/entities/StagedLead";
