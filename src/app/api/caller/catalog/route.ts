// ============================================================================
// Caller disposition catalogs — lead stages + lost reasons.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { isCallerWorkspaceUser } from "@/modules/rbac";
import { leadCatalogs } from "@/modules/leads";
import { filterCallerLeadStages } from "@/modules/caller-workspace/presentation/lib/filterCallerLeadStages";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!isCallerWorkspaceUser(current.authContext)) {
    return NextResponse.json({ error: "Caller workspace only." }, { status: 403 });
  }

  const url = new URL(request.url);
  const currentStageId = url.searchParams.get("currentStageId");

  const [stagesRaw, lostReasonsRaw] = await Promise.all([
    leadCatalogs.listStages(current.authContext.organizationId),
    leadCatalogs.listLostReasons(current.authContext.organizationId),
  ]);

  const stages = filterCallerLeadStages(
    excludeTestCatalogRows(stagesRaw),
    currentStageId,
  ).map((stage) => ({
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
