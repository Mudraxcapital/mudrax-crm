// ============================================================================
// Shared lead reassignment used by LeadOwnershipPort and atomic user lifecycle TX.
// ============================================================================

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export async function reassignLeadsInTx(
  tx: Prisma.TransactionClient,
  fromUserId: string,
  toUserId: string,
  actorUserId: string | null,
  reason: "UserDeletedOrDemoted" | "UserRoleChanged",
): Promise<number> {
  if (fromUserId === toUserId) return 0;

  const leads = await tx.lead.findMany({
    where: { currentAssigneeUserId: fromUserId },
    select: { id: true, organizationId: true },
  });
  if (leads.length === 0) return 0;

  const now = new Date();
  for (const lead of leads) {
    await tx.leadAssignment.updateMany({
      where: { leadId: lead.id, unassignedAt: null },
      data: { unassignedAt: now },
    });
    await tx.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToUserId: toUserId,
        assignedByUserId: actorUserId,
        assignmentType: "MANUAL_REASSIGNMENT",
      },
    });
    await tx.lead.update({
      where: { id: lead.id },
      data: { currentAssigneeUserId: toUserId },
    });
    await tx.leadAuditLog.create({
      data: {
        id: randomUUID(),
        organizationId: lead.organizationId,
        actorType: "USER",
        actorId: actorUserId,
        action: "LeadReassigned",
        targetType: "Lead",
        targetId: lead.id,
        beforeState: { currentAssigneeUserId: fromUserId },
        afterState: { currentAssigneeUserId: toUserId, reason },
        recordHash: PLACEHOLDER_RECORD_HASH,
      },
    });
  }
  return leads.length;
}
