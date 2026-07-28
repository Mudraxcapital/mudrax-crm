// ============================================================================
// Shared lead reassignment used by LeadOwnershipPort and atomic user lifecycle TX.
// Batched for large assignee volumes (avoids per-lead round trips).
// ============================================================================

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";
const BATCH_SIZE = 250;

export async function reassignLeadsInTx(
  tx: Prisma.TransactionClient,
  fromUserId: string,
  toUserId: string,
  actorUserId: string | null,
  reason: "UserDeletedOrDemoted" | "UserRoleChanged",
): Promise<number> {
  if (fromUserId === toUserId) return 0;

  const now = new Date();
  let total = 0;
  let cursor: string | undefined;

  for (;;) {
    const leads = await tx.lead.findMany({
      where: { currentAssigneeUserId: fromUserId },
      select: { id: true, organizationId: true },
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (leads.length === 0) break;

    const batchIds = leads.map((lead) => lead.id);

    await tx.leadAssignment.updateMany({
      where: { leadId: { in: batchIds }, unassignedAt: null },
      data: { unassignedAt: now },
    });

    await tx.leadAssignment.createMany({
      data: batchIds.map((leadId) => ({
        leadId,
        assignedToUserId: toUserId,
        assignedByUserId: actorUserId,
        assignmentType: "MANUAL_REASSIGNMENT" as const,
      })),
    });

    await tx.lead.updateMany({
      where: { id: { in: batchIds } },
      data: { currentAssigneeUserId: toUserId },
    });

    await tx.leadAuditLog.createMany({
      data: leads.map((lead) => ({
        id: randomUUID(),
        organizationId: lead.organizationId,
        actorType: "USER" as const,
        actorId: actorUserId,
        action: "LeadReassigned",
        targetType: "Lead",
        targetId: lead.id,
        beforeState: { currentAssigneeUserId: fromUserId },
        afterState: { currentAssigneeUserId: toUserId, reason },
        recordHash: PLACEHOLDER_RECORD_HASH,
      })),
    });

    total += leads.length;
    cursor = leads[leads.length - 1]?.id;
  }

  return total;
}
