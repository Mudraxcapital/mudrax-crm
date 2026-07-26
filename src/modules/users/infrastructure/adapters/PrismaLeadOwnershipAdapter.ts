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
