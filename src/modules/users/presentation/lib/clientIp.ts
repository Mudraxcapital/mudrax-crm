import { headers } from "next/headers";

/** Best-effort client IP from proxy headers (audit trails). */
export async function clientIp(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
