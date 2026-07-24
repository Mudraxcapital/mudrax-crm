// ============================================================================
// prisma/seed/steps/11-follow-ups.ts
//
// Seeds realistic demo data (requirement #5) for `follow_ups`: a handful of
// scheduled/completed Follow-ups and one Call Later against a few of the
// demo Leads seeded in 10-leads.ts.
//
// FollowUp has no natural business unique key, so its id is derived with
// `seedId()` for idempotency.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { FollowUpStatus, FollowUpTriggerType } from "@prisma/client";
import { seedId } from "../lib/determinism";
import { explain, section, summary } from "../lib/logger";
import type { LeadSeedResult } from "./10-leads";

interface FollowUpSeed {
  key: string;
  leadKey: string;
  triggerType: FollowUpTriggerType;
  status: FollowUpStatus;
  scheduledFor: Date;
  completedAt?: Date;
  outcomeNotes?: string;
}

const now = new Date();
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const FOLLOW_UPS: FollowUpSeed[] = [
  {
    key: "priya-callback",
    leadKey: "priya-patel",
    triggerType: FollowUpTriggerType.CALL_LATER,
    status: FollowUpStatus.SCHEDULED,
    scheduledFor: daysFromNow(3),
  },
  {
    key: "amit-follow-up",
    leadKey: "amit-verma",
    triggerType: FollowUpTriggerType.FOLLOW_UP,
    status: FollowUpStatus.SCHEDULED,
    scheduledFor: daysFromNow(1),
  },
  {
    key: "sneha-follow-up",
    leadKey: "sneha-reddy",
    triggerType: FollowUpTriggerType.FOLLOW_UP,
    status: FollowUpStatus.SCHEDULED,
    scheduledFor: daysFromNow(2),
  },
  {
    key: "vikram-follow-up-completed",
    leadKey: "vikram-singh",
    triggerType: FollowUpTriggerType.FOLLOW_UP,
    status: FollowUpStatus.COMPLETED,
    scheduledFor: daysFromNow(-2),
    completedAt: daysFromNow(-2),
    outcomeNotes: "Customer confirmed documents are being couriered; checklist updated.",
  },
];

export async function seedFollowUps(
  prisma: PrismaClient,
  organizationId: string,
  leads: LeadSeedResult,
  adminUserId: string,
): Promise<void> {
  section("11. Follow-ups (demo tasks)");

  explain(
    "Four Follow-up/Call Later tasks against demo Leads — three still Scheduled, one already Completed with outcome notes.",
  );

  let count = 0;
  for (const followUp of FOLLOW_UPS) {
    const leadId = leads.leadIds[followUp.leadKey];
    if (!leadId) continue;

    const id = seedId(`follow-up:${followUp.key}`);
    await prisma.followUp.upsert({
      where: { id },
      update: {
        status: followUp.status,
        scheduledFor: followUp.scheduledFor,
        completedAt: followUp.completedAt,
        outcomeNotes: followUp.outcomeNotes,
      },
      create: {
        id,
        organizationId,
        leadId,
        triggerType: followUp.triggerType,
        status: followUp.status,
        scheduledFor: followUp.scheduledFor,
        currentAssigneeUserId: adminUserId,
        createdByUserId: adminUserId,
        completedAt: followUp.completedAt,
        completedByUserId: followUp.completedAt ? adminUserId : undefined,
        outcomeNotes: followUp.outcomeNotes,
      },
    });
    count += 1;
  }

  summary("Follow-ups", count);
}
