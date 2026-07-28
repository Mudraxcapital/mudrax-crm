// ============================================================================
// Lead ownership adapter — users module reads/writes lead assignee state
// only through this port when deleting or demoting employees.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import type { LeadOwnershipPort } from "../../application/ports/LeadOwnershipPort";
import { reassignLeadsInTx } from "./reassignLeadsInTx";

export class PrismaLeadOwnershipAdapter implements LeadOwnershipPort {
  constructor(private readonly prisma: PrismaClient) {}

  async countAssignedLeads(userId: string): Promise<number> {
    return this.prisma.lead.count({ where: { currentAssigneeUserId: userId } });
  }

  async countAssignedFollowUps(userId: string): Promise<number> {
    return this.prisma.followUp.count({ where: { currentAssigneeUserId: userId } });
  }

  async countAssignedLeadsByUserIds(userIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (userIds.length === 0) return counts;

    const rows = await this.prisma.lead.groupBy({
      by: ["currentAssigneeUserId"],
      where: { currentAssigneeUserId: { in: userIds } },
      _count: { _all: true },
    });

    for (const row of rows) {
      if (row.currentAssigneeUserId) {
        counts.set(row.currentAssigneeUserId, row._count._all);
      }
    }
    return counts;
  }

  async reassignLeadsFromUser(
    fromUserId: string,
    toUserId: string,
    actorUserId: string | null,
  ): Promise<number> {
    if (fromUserId === toUserId) return 0;

    return this.prisma.$transaction(async (tx) =>
      reassignLeadsInTx(tx, fromUserId, toUserId, actorUserId, "UserDeletedOrDemoted"),
    );
  }
}
