// ============================================================================
// src/modules/notifications/application/use-cases/ensureSystemTemplates.ts
//
// Idempotently provisions the IN_APP templates used by background jobs
// (follow-up reminders / escalations). Safe to call on every worker tick.
// ============================================================================

import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";

export const SYSTEM_TEMPLATE_CODES = {
  FOLLOW_UP_REMINDER: "system.follow_up.reminder",
  FOLLOW_UP_ESCALATION_TL: "system.follow_up.escalation_team_lead",
  FOLLOW_UP_ESCALATION_MANAGER: "system.follow_up.escalation_manager",
  FOLLOW_UP_ESCALATION_ADMIN: "system.follow_up.escalation_admin",
} as const;

export type SystemTemplateCode =
  (typeof SYSTEM_TEMPLATE_CODES)[keyof typeof SYSTEM_TEMPLATE_CODES];

const SYSTEM_ACTOR: NotificationsAuditActor = { actorType: "SYSTEM", actorId: null };

const TEMPLATE_SPECS: Array<{
  code: SystemTemplateCode;
  subject: string;
  body: string;
}> = [
  {
    code: SYSTEM_TEMPLATE_CODES.FOLLOW_UP_REMINDER,
    subject: "Follow-up is due",
    body: "A customer follow-up is due ({{scheduledFor}}). Please complete it.",
  },
  {
    code: SYSTEM_TEMPLATE_CODES.FOLLOW_UP_ESCALATION_TL,
    subject: "Follow-up needs Team Lead attention",
    body: "The Caller did not complete this follow-up by the next day (scheduled {{scheduledFor}}).",
  },
  {
    code: SYSTEM_TEMPLATE_CODES.FOLLOW_UP_ESCALATION_MANAGER,
    subject: "Follow-up needs Manager attention",
    body: "The Team Lead did not complete this follow-up by the next day (scheduled {{scheduledFor}}).",
  },
  {
    code: SYSTEM_TEMPLATE_CODES.FOLLOW_UP_ESCALATION_ADMIN,
    subject: "Follow-up needs Manager attention",
    body: "The Team Lead did not complete this follow-up by the next day (scheduled {{scheduledFor}}).",
  },
];

export function makeEnsureSystemNotificationTemplates(
  templateRepository: NotificationTemplateRepository,
) {
  return async function ensureSystemNotificationTemplates(
    organizationId: string,
  ): Promise<Record<SystemTemplateCode, string>> {
    const ids = {} as Record<SystemTemplateCode, string>;

    for (const spec of TEMPLATE_SPECS) {
      const existing = await templateRepository.findByCode(organizationId, spec.code);
      if (existing) {
        if (existing.status !== "ACTIVE") {
          await templateRepository.updateWithAudit(
            existing.id,
            { status: "ACTIVE" },
            SYSTEM_ACTOR,
            null,
          );
        }
        const published = await templateRepository.findLatestPublishedVersion(existing.id);
        if (!published) {
          const version = await templateRepository.createVersionWithAudit(
            {
              templateId: existing.id,
              subject: spec.subject,
              body: spec.body,
            },
            SYSTEM_ACTOR,
            null,
          );
          await templateRepository.publishVersionWithAudit(version.id, SYSTEM_ACTOR, null);
        }
        ids[spec.code] = existing.id;
        continue;
      }

      const { template, version } = await templateRepository.createWithAudit(
        {
          organizationId,
          code: spec.code,
          channelType: "IN_APP",
          status: "ACTIVE",
          subject: spec.subject,
          body: spec.body,
        },
        SYSTEM_ACTOR,
        null,
      );
      await templateRepository.publishVersionWithAudit(version.id, SYSTEM_ACTOR, null);
      ids[spec.code] = template.id;
    }

    return ids;
  };
}

export type EnsureSystemNotificationTemplates = ReturnType<
  typeof makeEnsureSystemNotificationTemplates
>;
