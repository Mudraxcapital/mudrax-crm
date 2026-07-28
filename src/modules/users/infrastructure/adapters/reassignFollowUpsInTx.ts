// ============================================================================
// Reassign open follow-ups when a user is deleted or demoted.
// Batched to match lead reassignment patterns.
// ============================================================================

import type { Prisma } from "@prisma/client";

const BATCH_SIZE = 250;

export async function reassignFollowUpsInTx(
  tx: Prisma.TransactionClient,
  fromUserId: string,
  toUserId: string,
): Promise<number> {
  if (fromUserId === toUserId) return 0;

  let total = 0;
  let cursor: string | undefined;

  for (;;) {
    const batch = await tx.followUp.findMany({
      where: { currentAssigneeUserId: fromUserId },
      select: { id: true },
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;

    const batchIds = batch.map((row) => row.id);
    await tx.followUp.updateMany({
      where: { id: { in: batchIds } },
      data: { currentAssigneeUserId: toUserId },
    });
    total += batch.length;
    cursor = batch[batch.length - 1]?.id;
  }

  return total;
}
