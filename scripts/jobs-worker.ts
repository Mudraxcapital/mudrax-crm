#!/usr/bin/env tsx
// ============================================================================
// Dedicated background-jobs worker process.
//
// Usage:
//   npm run jobs:worker
//
// Same codebase as the Next.js app (ADR 0001 modular monolith) — just a
// different process entrypoint for production deployments that prefer an
// isolated worker. Jobs still persist in Postgres and use advisory locks.
// ============================================================================

import { startJobsWorker, stopJobsWorker } from "../src/infra/jobs/runner";

process.env.JOBS_KEEP_ALIVE = "true";
process.env.JOBS_ENABLED = "true";

const workerId = process.env.JOBS_WORKER_ID ?? `cli-${process.pid}`;

startJobsWorker({ workerId });

const shutdown = (signal: string) => {
  console.info(JSON.stringify({ ts: new Date().toISOString(), level: "info", message: "jobs.worker.shutdown", signal }));
  stopJobsWorker();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
