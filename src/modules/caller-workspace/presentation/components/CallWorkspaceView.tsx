"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CallerWorkspaceLeadDto } from "../../application/dto/CallerWorkspaceDto";
import type { LeadFieldDefinitionDto, LeadStage, LostReason } from "@/modules/leads";
import { filterCallerLeadStages } from "../lib/filterCallerLeadStages";
import { DynamicLeadFields } from "@/modules/leads/presentation/components/DynamicLeadFields";
import { LeadClickToCallPanel } from "@/modules/leads/presentation/components/LeadClickToCallPanel";
import { LeadNoteForm } from "@/modules/leads/presentation/components/LeadNoteForm";
import { LeadStageForm } from "@/modules/leads/presentation/components/LeadStageForm";
import { addLeadNoteAction } from "@/modules/leads/presentation/controllers/addLeadNote.action";
import { changeLeadStageAction } from "@/modules/leads/presentation/controllers/changeLeadStage.action";
import type { LeadFormState } from "@/modules/leads/presentation/controllers/createLead.action";
import { FollowUpForm } from "@/modules/follow-ups/presentation/components/FollowUpForm";
import { CompleteFollowUpForm } from "@/modules/follow-ups/presentation/components/CompleteFollowUpForm";
import { createFollowUpAction } from "@/modules/follow-ups/presentation/controllers/createFollowUp.action";
import { completeFollowUpAction } from "@/modules/follow-ups/presentation/controllers/completeFollowUp.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";

const FRESH_STAGE_LOCK_HINT =
  "Fresh leads cannot be updated here. Use the mobile app to call first — then you can change status once the lead is Ringing or another stage.";

export function CallWorkspaceView({
  lead,
  agentUserId,
  stages,
  lostReasons,
  fields,
  callOutcomes: _callOutcomes,
  assignees,
  canCall,
  canUpdate,
  canUpdateCall: _canUpdateCall,
  canCreateFollowUp,
  canCompleteFollowUp,
  campaignId,
}: {
  lead: CallerWorkspaceLeadDto;
  agentUserId: string;
  stages: LeadStage[];
  lostReasons: LostReason[];
  fields: LeadFieldDefinitionDto[];
  callOutcomes: { id: string; name: string }[];
  assignees: { id: string; fullName: string }[];
  canCall: boolean;
  canUpdate: boolean;
  canUpdateCall: boolean;
  canCreateFollowUp: boolean;
  canCompleteFollowUp: boolean;
  campaignId: string | null;
}) {
  void _callOutcomes;
  void _canUpdateCall;
  const router = useRouter();
  const qs = campaignId ? `?campaignId=${campaignId}` : "";

  const catalogStages = useMemo(() => excludeTestCatalogRows(stages), [stages]);
  const stageOptions = useMemo(
    () => filterCallerLeadStages(catalogStages, lead.currentStageId),
    [catalogStages, lead.currentStageId],
  );

  const isFreshLead = lead.currentStageBucket === "INITIAL";
  const leadStatusUnlocked = !isFreshLead;
  const boundAddNote = addLeadNoteAction.bind(null, lead.id);
  const boundCreateFollowUp = createFollowUpAction.bind(null, lead.id);
  const waHref = lead.phoneSnapshot
    ? `https://wa.me/${lead.phoneSnapshot.replace(/\D/g, "")}`
    : null;
  const smsHref = lead.phoneSnapshot ? `sms:${lead.phoneSnapshot}` : null;

  async function stageAction(
    state: LeadFormState | undefined,
    formData: FormData,
  ): Promise<LeadFormState> {
    if (!leadStatusUnlocked) {
      return { error: FRESH_STAGE_LOCK_HINT };
    }
    const result = await changeLeadStageAction(lead.id, state, formData);
    if (!result.error) router.refresh();
    return result;
  }

  return (
    <PageSection>
      <PageHeader
        title={lead.fullNameSnapshot}
        description={`${lead.currentStageName} · ${lead.leadSourceName}${lead.campaignName ? ` · ${lead.campaignName}` : ""}`}
        breadcrumbs={[
          { label: "My Leads", href: `/caller/leads${qs}` },
          { label: lead.fullNameSnapshot },
        ]}
        meta={
          <Badge tone="info" dot>
            {lead.currentStageName}
          </Badge>
        }
        actions={
          lead.nextLeadId ? (
            <Link href={`/caller/leads/${lead.nextLeadId}${qs}`}>
              <Button variant="primary">Next Lead</Button>
            </Link>
          ) : (
            <span className="text-muted text-sm">No more leads</span>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <Card>
            <CardHeader title="Lead Card" description="Customer & contact" />
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="text-muted text-xs uppercase tracking-wide">Customer</p>
                <p className="font-medium">{lead.fullNameSnapshot}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide">Phone</p>
                <p className="font-medium">{lead.phoneSnapshot ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide">Status</p>
                <p className="font-medium">{lead.currentStageName}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {canCall ? (
                  <div className="w-full">
                    <LeadClickToCallPanel
                      leadId={lead.id}
                      customerId={lead.customerId}
                      phone={lead.phoneSnapshot}
                      agentUserId={agentUserId}
                      returnPath={`/caller/leads/${lead.id}${qs}`}
                    />
                  </div>
                ) : null}
                {waHref ? (
                  <a href={waHref} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm">
                      WhatsApp
                    </Button>
                  </a>
                ) : null}
                {smsHref ? (
                  <a href={smsHref}>
                    <Button variant="secondary" size="sm">
                      SMS
                    </Button>
                  </a>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Lead Fields" description="Visible field settings" />
            <CardBody>
              <DynamicLeadFields fields={fields} values={lead.fieldValues} readOnly />
            </CardBody>
          </Card>

          {canUpdate ? (
            <Card>
              <CardHeader
                title="Lead Disposition"
                description="Ringing · Interested · Follow-up · Lost"
              />
              <CardBody>
                <LeadStageForm
                  key={`${lead.id}:${lead.currentStageId}:${leadStatusUnlocked ? "open" : "locked"}`}
                  action={stageAction}
                  stages={stageOptions}
                  lostReasons={excludeTestCatalogRows(lostReasons)}
                  currentStageId={lead.currentStageId}
                  disabled={!leadStatusUnlocked}
                  disabledHint={leadStatusUnlocked ? undefined : FRESH_STAGE_LOCK_HINT}
                />
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card>
            <CardHeader title="Notes" />
            <CardBody className="space-y-3">
              {canUpdate ? <LeadNoteForm action={boundAddNote} submitLabel="Add note" /> : null}
              <ul className="space-y-2 text-sm">
                {lead.notes.length === 0 ? (
                  <li className="text-muted">No notes yet.</li>
                ) : (
                  lead.notes.map((note) => (
                    <li key={note.id} className="rounded-lg border border-border px-3 py-2">
                      <p>{note.body}</p>
                      <p className="text-muted mt-1 text-xs">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Follow Ups" />
            <CardBody className="space-y-3">
              {canCreateFollowUp ? (
                <FollowUpForm action={boundCreateFollowUp} assignees={assignees} />
              ) : null}
              <ul className="space-y-2 text-sm">
                {lead.followUps.length === 0 ? (
                  <li className="text-muted">No follow-ups.</li>
                ) : (
                  lead.followUps.map((item) => {
                    const isOpen = item.status !== "COMPLETED" && item.status !== "CANCELLED";
                    const boundComplete = completeFollowUpAction.bind(null, lead.id, item.id);
                    return (
                      <li
                        key={item.id}
                        className="space-y-2 border-b border-border pb-2 last:border-0"
                      >
                        <div className="flex justify-between gap-2">
                          <span>{item.triggerType}</span>
                          <span className="text-muted text-xs">
                            {new Date(item.scheduledFor).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted text-xs">{item.status}</p>
                        {isOpen && canCompleteFollowUp ? (
                          <CompleteFollowUpForm action={boundComplete} />
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </CardBody>
          </Card>
        </div>

        <Card className="xl:col-span-3">
          <CardHeader title="Timeline" description="Lead activity" />
          <CardBody className="space-y-2">
            {lead.timeline.length === 0 ? (
              <p className="text-muted text-sm">No timeline events.</p>
            ) : (
              lead.timeline.map((entry) => (
                <div key={entry.id} className="border-b border-border pb-2 text-sm last:border-0">
                  <p className="font-medium">{entry.summary}</p>
                  <p className="text-muted text-xs">{new Date(entry.at).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </PageSection>
  );
}
