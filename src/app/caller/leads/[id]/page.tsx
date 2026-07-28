import { notFound, redirect } from "next/navigation";
import { requireCallerWorkspace } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  leadCatalogs,
  LeadNotFoundError,
  listActiveLeadFields,
} from "@/modules/leads";
import { listCallOutcomes } from "@/modules/telephony";
import {
  CallerLeadAccessDeniedError,
  getCallerWorkspaceLead,
} from "@/modules/caller-workspace";
import { CallWorkspaceView } from "@/modules/caller-workspace/presentation/components/CallWorkspaceView";

export default async function CallerLeadWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requireCallerWorkspace();
  const { id } = await params;
  const query = await searchParams;
  const campaignId = typeof query.campaignId === "string" ? query.campaignId : null;

  let lead;
  try {
    lead = await getCallerWorkspaceLead({
      organizationId: authContext.organizationId,
      callerUserId: session.user.id,
      leadId: id,
      campaignId,
    });
  } catch (error) {
    if (error instanceof LeadNotFoundError) notFound();
    if (error instanceof CallerLeadAccessDeniedError) redirect("/unauthorized");
    throw error;
  }

  const [stages, lostReasons, fields, callOutcomes] = await Promise.all([
    leadCatalogs.listStages(authContext.organizationId),
    leadCatalogs.listLostReasons(authContext.organizationId),
    listActiveLeadFields(authContext.organizationId),
    listCallOutcomes(authContext.organizationId).catch(() => []),
  ]);

  return (
    <CallWorkspaceView
      lead={lead}
      agentUserId={session.user.id}
      stages={stages}
      lostReasons={lostReasons}
      fields={fields}
      callOutcomes={callOutcomes.map((outcome) => ({ id: outcome.id, name: outcome.name }))}
      assignees={[{ id: session.user.id, fullName: session.user.fullName }]}
      canCall={hasPermission(authContext, "call.initiate")}
      canUpdate={hasPermission(authContext, "lead.update")}
      canUpdateCall={hasPermission(authContext, "call.update")}
      canCreateFollowUp={hasPermission(authContext, "follow_up.create")}
      canCompleteFollowUp={hasPermission(authContext, "follow_up.complete")}
      campaignId={campaignId ?? lead.campaignId}
    />
  );
}
