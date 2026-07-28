"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LeadStage, LostReason } from "@/modules/leads";
import {
  filterCallerLeadStages,
  findRingingStage,
} from "@/modules/caller-workspace/presentation/lib/filterCallerLeadStages";
import { LeadClickToCallPanel } from "@/modules/leads/presentation/components/LeadClickToCallPanel";
import { LeadNoteForm } from "@/modules/leads/presentation/components/LeadNoteForm";
import { LeadStageForm } from "@/modules/leads/presentation/components/LeadStageForm";
import { changeLeadStageAction } from "@/modules/leads/presentation/controllers/changeLeadStage.action";
import { addLeadNoteAction } from "@/modules/leads/presentation/controllers/addLeadNote.action";
import type { LeadFormState } from "@/modules/leads/presentation/controllers/createLead.action";
import { FollowUpForm } from "@/modules/follow-ups/presentation/components/FollowUpForm";
import { createFollowUpAction } from "@/modules/follow-ups/presentation/controllers/createFollowUp.action";
import type { FollowUpFormState } from "@/modules/follow-ups/presentation/controllers/createFollowUp.action";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import type { CampaignDashboardLeadDetail } from "../_lib/loadCampaignDashboard";

type WorkspacePanel = "note" | "followup" | "iq" | "activity" | null;

export function CampaignLeadActionsPanel({
  lead,
  agentUserId,
  campaignId,
  stages,
  lostReasons,
  callOutcomes: _callOutcomes,
  canCall,
  canUpdate,
  canUpdateCall: _canUpdateCall,
  canCreateFollowUp,
}: {
  lead: CampaignDashboardLeadDetail;
  agentUserId: string;
  campaignId: string;
  stages: LeadStage[];
  lostReasons: LostReason[];
  callOutcomes: { id: string; name: string }[];
  canCall: boolean;
  canUpdate: boolean;
  canUpdateCall: boolean;
  canCreateFollowUp: boolean;
}) {
  void _callOutcomes;
  void _canUpdateCall;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasActed, setHasActed] = useState(false);
  const [callStarted, setCallStarted] = useState(Boolean(lead.latestCallAttemptId));
  const [skipOpen, setSkipOpen] = useState(false);
  const [panel, setPanel] = useState<WorkspacePanel>(null);
  const [fieldsExpanded, setFieldsExpanded] = useState(false);
  const [ringingPending, setRingingPending] = useState(false);

  const catalogStages = useMemo(() => excludeTestCatalogRows(stages), [stages]);
  const stageOptions = useMemo(
    () => filterCallerLeadStages(catalogStages, lead.stageId),
    [catalogStages, lead.stageId],
  );

  useEffect(() => {
    setHasActed(false);
    setCallStarted(Boolean(lead.latestCallAttemptId));
    setSkipOpen(false);
    setPanel(null);
    setFieldsExpanded(false);
    setRingingPending(false);
  }, [lead.id, lead.latestCallAttemptId]);

  const returnPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("leadId", lead.id);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams, lead.id]);

  const waHref = lead.phone
    ? `https://wa.me/${lead.phone.replace(/\D/g, "")}`
    : null;
  const smsHref = lead.phone ? `sms:${lead.phone}` : null;

  const visibleFields = fieldsExpanded
    ? lead.fieldValues
    : lead.fieldValues.slice(0, 6);

  const leadStatusUnlocked = callStarted || Boolean(lead.latestCallAttemptId);

  function markActed() {
    setHasActed(true);
  }

  async function applyRingingOnCall() {
    const ringing = findRingingStage(catalogStages);
    if (!ringing || ringing.id === lead.stageId) return;
    setRingingPending(true);
    try {
      const formData = new FormData();
      formData.set("stageId", ringing.id);
      const result = await changeLeadStageAction(lead.id, undefined, formData);
      if (!result.error) {
        router.refresh();
      }
    } finally {
      setRingingPending(false);
    }
  }

  async function handleCallStarted() {
    markActed();
    setCallStarted(true);
    await applyRingingOnCall();
  }

  function goToNextLead() {
    if (!lead.nextLeadId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("leadId", lead.nextLeadId);
    if (lead.nextLeadPage != null && lead.nextLeadPage > 1) {
      params.set("leadPage", String(lead.nextLeadPage));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    router.refresh();
  }

  function requestNextLead() {
    if (!lead.nextLeadId) return;
    if (!hasActed) {
      setSkipOpen(true);
      return;
    }
    goToNextLead();
  }

  async function stageAction(
    state: LeadFormState | undefined,
    formData: FormData,
  ): Promise<LeadFormState> {
    if (!leadStatusUnlocked) {
      return { error: "Click Call first — then you can update lead status." };
    }
    const result = await changeLeadStageAction(lead.id, state, formData);
    if (!result.error) {
      markActed();
      router.refresh();
    }
    return result;
  }

  async function noteAction(
    state: LeadFormState | undefined,
    formData: FormData,
  ): Promise<LeadFormState> {
    const result = await addLeadNoteAction(lead.id, state, formData);
    if (!result.error) {
      markActed();
      router.refresh();
    }
    return result;
  }

  async function followUpAction(
    state: FollowUpFormState | undefined,
    formData: FormData,
  ): Promise<FollowUpFormState> {
    const result = await createFollowUpAction(lead.id, state, formData);
    if (!result.error) {
      markActed();
      router.refresh();
    }
    return result;
  }

  function togglePanel(next: WorkspacePanel) {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {canCall ? (
              <div
                className="inline-flex items-center"
                onSubmitCapture={() => {
                  markActed();
                }}
              >
                <LeadClickToCallPanel
                  key={lead.id}
                  leadId={lead.id}
                  customerId={lead.customerId}
                  phone={lead.phone}
                  agentUserId={agentUserId}
                  returnPath={returnPath}
                  compact
                  onCallStarted={() => {
                    void handleCallStarted();
                  }}
                />
              </div>
            ) : null}

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => markActed()}
              >
                <Button type="button" size="sm" variant="secondary">
                  WhatsApp
                </Button>
              </a>
            ) : (
              <Button type="button" size="sm" variant="secondary" disabled>
                WhatsApp
              </Button>
            )}

            {smsHref ? (
              <a href={smsHref} onClick={() => markActed()}>
                <Button type="button" size="sm" variant="secondary">
                  SMS
                </Button>
              </a>
            ) : (
              <Button type="button" size="sm" variant="secondary" disabled>
                SMS
              </Button>
            )}

            <div className="ml-auto">
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={!lead.nextLeadId}
                onClick={requestNextLead}
              >
                Next Lead
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {canUpdate ? (
              <Button
                type="button"
                size="sm"
                variant={panel === "note" ? "primary" : "secondary"}
                onClick={() => togglePanel("note")}
              >
                Add Note
              </Button>
            ) : null}

            {canCreateFollowUp ? (
              <Button
                type="button"
                size="sm"
                variant={panel === "followup" ? "primary" : "secondary"}
                onClick={() => togglePanel("followup")}
              >
                Follow-up
              </Button>
            ) : null}

            <Button
              type="button"
              size="sm"
              variant={panel === "iq" ? "primary" : "secondary"}
              onClick={() => togglePanel("iq")}
            >
              Lead IQ
            </Button>

            <Button
              type="button"
              size="sm"
              variant={panel === "activity" ? "primary" : "secondary"}
              onClick={() => togglePanel("activity")}
            >
              Activity
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted text-xs uppercase tracking-wide">Lead information</p>
            {lead.fieldValues.length > 6 ? (
              <button
                type="button"
                className="text-accent text-xs hover:underline"
                onClick={() => setFieldsExpanded((value) => !value)}
              >
                {fieldsExpanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {visibleFields.length === 0 ? (
              <p className="text-muted col-span-2 text-sm">No additional fields.</p>
            ) : (
              visibleFields.map((field) => (
                <div key={field.key} className="rounded-md border border-border/70 px-2.5 py-2">
                  <p className="text-muted text-[11px] capitalize">{field.label}</p>
                  <p className="font-medium break-words">{field.value}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {canUpdate ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-muted text-xs uppercase tracking-wide">Lead status</p>
            <LeadStageForm
              key={`${lead.id}:${lead.stageId}:${leadStatusUnlocked ? "open" : "locked"}`}
              action={stageAction}
              currentStageId={lead.stageId}
              stages={stageOptions}
              lostReasons={excludeTestCatalogRows(lostReasons)}
              disabled={!leadStatusUnlocked || ringingPending}
              disabledHint={
                leadStatusUnlocked
                  ? undefined
                  : "Click Call first — then you can update lead status."
              }
            />
          </div>
        ) : null}

        {panel === "note" && canUpdate ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-muted text-xs uppercase tracking-wide">Add note</p>
            <LeadNoteForm action={noteAction} submitLabel="Save note" />
            <ul className="space-y-2 text-sm">
              {lead.notes.length === 0 ? (
                <li className="text-muted">No notes yet.</li>
              ) : (
                lead.notes.map((note) => (
                  <li key={note.id} className="rounded-md border border-border px-3 py-2">
                    <p>{note.body}</p>
                    <p className="text-muted mt-1 text-xs">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {panel === "followup" && canCreateFollowUp ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-muted text-xs uppercase tracking-wide">Schedule follow-up</p>
            <FollowUpForm
              action={followUpAction}
              assignees={[{ id: agentUserId, fullName: "Me" }]}
            />
            <ul className="space-y-2 text-sm">
              {lead.followUps.length === 0 ? (
                <li className="text-muted">No follow-ups.</li>
              ) : (
                lead.followUps.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                  >
                    <span>
                      {item.triggerType === "CALL_LATER" ? "Call Later" : "Follow-up"} ·{" "}
                      {item.status}
                    </span>
                    <span className="text-muted text-xs">
                      {new Date(item.scheduledFor).toLocaleString()}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {panel === "iq" ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-muted text-xs uppercase tracking-wide">Lead IQ</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted text-xs">Source</dt>
                <dd className="font-medium">{lead.sourceName}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Status</dt>
                <dd className="font-medium">{lead.stageName}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Bucket</dt>
                <dd className="font-medium">
                  {lead.stageBucket === "INITIAL"
                    ? "Fresh"
                    : lead.stageBucket === "CLOSED"
                      ? "Closed"
                      : "Active"}
                </dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Assignee</dt>
                <dd className="font-medium">{lead.assigneeName}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Notes</dt>
                <dd className="font-medium tabular-nums">{lead.notes.length}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Open follow-ups</dt>
                <dd className="font-medium tabular-nums">
                  {
                    lead.followUps.filter(
                      (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED",
                    ).length
                  }
                </dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Last call</dt>
                <dd className="font-medium">{lead.latestCallStatus ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Next action</dt>
                <dd className="font-medium">
                  {lead.nextActionAt
                    ? new Date(lead.nextActionAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="text-muted text-xs">
              Campaign {campaignId.slice(0, 8)}… · Insights from existing lead & call data (no
              separate telephony module required).
            </p>
          </div>
        ) : null}

        {panel === "activity" ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-muted text-xs uppercase tracking-wide">Activity timeline</p>
            {lead.timeline.length === 0 ? (
              <p className="text-muted text-sm">No activity yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lead.timeline.map((entry) => (
                  <li key={entry.id} className="border-b border-border pb-2 last:border-0">
                    <p className="font-medium">{entry.summary}</p>
                    <p className="text-muted text-xs">
                      {new Date(entry.at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {!canCall && !canUpdate && !canCreateFollowUp ? (
          <p className="text-muted text-sm">
            You do not have permission to call or update this lead from here.
          </p>
        ) : null}

        {!lead.nextLeadId ? (
          <p className="text-muted text-xs">End of list for this assignee.</p>
        ) : null}
      </div>

      <Dialog
        open={skipOpen}
        onClose={() => setSkipOpen(false)}
        title="Skip this lead?"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setSkipOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setSkipOpen(false);
                goToNextLead();
              }}
            >
              Skip
            </Button>
          </>
        }
      >
        <p className="text-sm">
          You have not taken any action on this lead. Do you really want to skip this lead?
        </p>
      </Dialog>
    </div>
  );
}
