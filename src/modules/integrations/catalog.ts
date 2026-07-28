// ============================================================================
// src/modules/integrations/catalog.ts
// ============================================================================

import { LEAD_CENTER_SOURCE_CODES, type LeadCenterSourceCode } from "@/modules/lead-center/catalog";

export interface IntegrationCatalogEntry {
  code: string;
  label: string;
  category: "inbound_leads" | "messaging";
  leadCenterSource?: LeadCenterSourceCode;
  /** Config surface is ready (connector may still be stubbed). */
  available: boolean;
  description: string;
}

/** Product surface: Facebook, Google, and WhatsApp only. */
export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    code: "facebook_lead_ads",
    label: "Facebook Lead Ads (Meta)",
    category: "inbound_leads",
    leadCenterSource: "FACEBOOK_LEAD_ADS",
    available: true,
    description:
      "Receive Meta Lead Ads form submissions via webhook into Lead Center.",
  },
  {
    code: "google_ads_lead_forms",
    label: "Google Ads Lead Forms",
    category: "inbound_leads",
    leadCenterSource: "GOOGLE_ADS",
    available: false,
    description: "Receive Google Ads lead form submissions into Lead Center.",
  },
  {
    code: "whatsapp_business",
    label: "WhatsApp Business",
    category: "messaging",
    leadCenterSource: "WHATSAPP_BUSINESS",
    available: false,
    description: "Inbound WhatsApp conversations mapped into Lead Center.",
  },
];

export const DEFAULT_FIELD_MAPPINGS: Array<{
  externalField: string;
  internalField: string;
  isRequired: boolean;
  sortOrder: number;
}> = [
  { externalField: "full_name", internalField: "full_name", isRequired: true, sortOrder: 1 },
  { externalField: "full name", internalField: "full_name", isRequired: false, sortOrder: 2 },
  { externalField: "name", internalField: "full_name", isRequired: false, sortOrder: 3 },
  { externalField: "email", internalField: "email", isRequired: false, sortOrder: 4 },
  { externalField: "phone_number", internalField: "phone", isRequired: false, sortOrder: 5 },
  { externalField: "phone", internalField: "phone", isRequired: false, sortOrder: 6 },
  { externalField: "mobile", internalField: "phone", isRequired: false, sortOrder: 7 },
  { externalField: "campaign", internalField: "campaign", isRequired: false, sortOrder: 8 },
  { externalField: "tags", internalField: "tags", isRequired: false, sortOrder: 9 },
];

export function getIntegrationCatalog(): IntegrationCatalogEntry[] {
  return INTEGRATION_CATALOG;
}

export function getCatalogEntry(code: string): IntegrationCatalogEntry | undefined {
  return INTEGRATION_CATALOG.find((entry) => entry.code === code);
}

export function listInboundLeadIntegrations(): IntegrationCatalogEntry[] {
  return INTEGRATION_CATALOG.filter(
    (entry) =>
      entry.leadCenterSource != null &&
      (LEAD_CENTER_SOURCE_CODES as readonly string[]).includes(entry.leadCenterSource),
  );
}
