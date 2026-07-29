// ============================================================================
// src/infra/jobs/handlers/retryFailedJobsHandler.ts
//
// Re-claims FAILED JobRun rows whose backoff window has elapsed so the
// original handler can run again under the same idempotency key.
// ============================================================================

import { listRetryableFailedJobs } from "../jobRunStore";
import { JOB_TYPES, type JobHandler } from "../types";

export const retryFailedJobsHandler: JobHandler = {
  type: JOB_TYPES.JOBS_RETRY_FAILED,
  periodic: true,
  async run(ctx) {
    // Claiming happens when the original job type is re-invoked by the
    // runner on the next tick (FAILED rows become claimable). This handler
    // only reports how many are eligible so operators can observe retries.
    const retryable = await listRetryableFailedJobs(100, ctx.now);
    const relevant = retryable.filter(
      (row) =>
        row.jobType !== JOB_TYPES.JOBS_RETRY_FAILED &&
        (!row.organizationId || row.organizationId === ctx.organizationId),
    );
    return {
      processed: relevant.length,
      details: {
        jobTypes: [...new Set(relevant.map((r) => r.jobType))],
      },
    };
  },
};
