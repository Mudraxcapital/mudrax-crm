// ============================================================================
// src/modules/lead-center/application/services/mapSourceToLeadCatalog.ts
// ============================================================================

import type { LeadCenterSourceCode } from "../../catalog";

/** Maps Lead Center source buckets onto seeded `leads.LeadSource` catalog names. */
export const SOURCE_CODE_TO_CATALOG_NAME: Record<LeadCenterSourceCode, string> = {
  FACEBOOK_LEAD_ADS: "Facebook Ads",
  GOOGLE_ADS: "Google Ads",
  WHATSAPP_BUSINESS: "WhatsApp Inquiry",
};

export function catalogNameForSourceCode(sourceCode: string): string {
  return (
    SOURCE_CODE_TO_CATALOG_NAME[sourceCode as LeadCenterSourceCode] ?? "Data"
  );
}
