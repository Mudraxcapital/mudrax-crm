// ============================================================================
// src/modules/reports/domain/entities/ReportType.ts
// ============================================================================

export const REPORT_TYPES = [
  "CUSTOMER",
  "LEAD",
  "CAMPAIGN",
  "TELEPHONY",
  "DOCUMENT",
  "NOTIFICATION",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  CUSTOMER: "Customer Report",
  LEAD: "Lead Report",
  CAMPAIGN: "Campaign Report",
  TELEPHONY: "Telephony Report",
  DOCUMENT: "Documents Report",
  NOTIFICATION: "Notifications Report",
};
