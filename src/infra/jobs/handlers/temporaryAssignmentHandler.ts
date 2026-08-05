// ============================================================================
// src/infra/jobs/handlers/temporaryAssignmentHandler.ts
//
// Periodically reverts expired temporary (holiday cover) lead assignments.
// ============================================================================

import { revertExpiredTemporaryAssignments } from "@/modules/leads";
import { JOB_TYPES, type JobHandler } from "../types";

export const temporaryAssignmentExpiryHandler: JobHandler = {
  type: JOB_TYPES.LEADS_TEMPORARY_ASSIGNMENT_EXPIRY,
  periodic: true,
  async run(ctx) {
    const result = await revertExpiredTemporaryAssignments({
      organizationId: ctx.organizationId,
      asOf: ctx.now,
      actor: { actorType: "SYSTEM", actorId: null },
      correlationId: ctx.correlationId,
    });

    return {
      processed: result.revertedCount,
      details: {
        failedCount: result.failed.length,
        failed: result.failed.slice(0, 20),
      },
    };
  },
};
