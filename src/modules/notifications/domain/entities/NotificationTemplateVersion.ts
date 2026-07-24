// ============================================================================
// src/modules/notifications/domain/entities/NotificationTemplateVersion.ts
//
// Append-only Template Version child of Notification Template. Content
// edits never mutate a prior Version — they create a new one (ADR 0008).
// ============================================================================

export const TEMPLATE_VERSION_STATUSES = ["DRAFT", "PUBLISHED", "SUPERSEDED", "ARCHIVED"] as const;
export type TemplateVersionStatus = (typeof TEMPLATE_VERSION_STATUSES)[number];

export interface NotificationTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  subject: string | null;
  body: string;
  variables: Record<string, unknown> | null;
  status: TemplateVersionStatus;
  publishedAt: Date | null;
  createdAt: Date;
}
