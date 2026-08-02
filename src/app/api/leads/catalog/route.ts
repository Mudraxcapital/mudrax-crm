// ============================================================================
// Lead disposition catalogs for clients (stages + lost reasons).
// Requires `lead.view`. Safe for Caller Workspace (/api/leads is allow-listed).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { leadCatalogs } from "@/modules/leads";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "lead.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [stagesRaw, lostReasonsRaw] = await Promise.all([
    leadCatalogs.listStages(current.authContext.organizationId),
    leadCatalogs.listLostReasons(current.authContext.organizationId),
  ]);

  const stages = excludeTestCatalogRows(stagesRaw)
    .filter((stage) => stage.isActive)
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      bucket: stage.bucket,
      sortOrder: stage.sortOrder,
      closeOutcome: stage.closeOutcome,
    }));

  const lostReasons = excludeTestCatalogRows(lostReasonsRaw).map((reason) => ({
    id: reason.id,
    name: reason.name,
  }));

  return NextResponse.json({ data: { stages, lostReasons } });
}
