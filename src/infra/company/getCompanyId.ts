// ============================================================================
// src/infra/company/getCompanyId.ts
//
// Mudrax CRM is single-company. Other bounded contexts still carry an
// `organizationId` column for historical company-scope data; this helper
// resolves the one Mudrax Capitals row those modules should use.
// Users module itself does NOT store organizationId.
// ============================================================================

import { prisma } from "@/infra/db/client";

let cachedCompanyId: string | null = null;

export async function getCompanyId(): Promise<string> {
  if (cachedCompanyId) return cachedCompanyId;

  const company = await prisma.organization.findFirst({
    where: { code: "MUDRAX" },
    select: { id: true },
  });
  if (company) {
    cachedCompanyId = company.id;
    return company.id;
  }

  const fallback = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!fallback) {
    throw new Error("Company scope is not provisioned. Run database seed.");
  }
  cachedCompanyId = fallback.id;
  return fallback.id;
}

/** Test/seed helper — clears the process-local cache. */
export function resetCompanyIdCache(): void {
  cachedCompanyId = null;
}
