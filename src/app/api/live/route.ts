import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VERSION = process.env.npm_package_version ?? process.env.APP_VERSION ?? "0.1.0";

/** Liveness — process is up (no dependency checks). */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      check: "live",
      version: VERSION,
    },
    { status: 200 },
  );
}
