import { NextResponse } from "next/server";
import { runJobsTick } from "@/infra/jobs/runner";

/**
 * Internal jobs tick endpoint for cron / orchestrators.
 * Protect with JOBS_CRON_SECRET (Authorization: Bearer <secret>).
 */
export async function POST(request: Request) {
  const secret = process.env.JOBS_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Jobs cron is not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runJobsTick({
    workerId: request.headers.get("x-jobs-worker-id") ?? "http-cron",
  });
  return NextResponse.json(summary);
}
