import type { ListLeadsParams } from "@mudrax/api";
import type { CallerCatalog, CallerWorkspaceLead, Lead, UserListItem } from "@mudrax/types";
import { getApi } from "@/core/api";

export type { ListLeadsParams };

function toWorkspaceLead(
  lead: Lead,
  notes: { id: string; body: string; createdAt: string }[],
): CallerWorkspaceLead {
  const fieldValues: Record<string, string | undefined> = {
    full_name: lead.fullNameSnapshot,
    phone: lead.phoneSnapshot ?? undefined,
    email: lead.emailSnapshot ?? undefined,
  };
  for (const value of lead.fieldValues ?? []) {
    fieldValues[value.internalKey] = value.displayValue ?? undefined;
  }

  return {
    id: lead.id,
    fullNameSnapshot: lead.fullNameSnapshot,
    phoneSnapshot: lead.phoneSnapshot,
    emailSnapshot: lead.emailSnapshot,
    currentStageId: lead.currentStageId,
    currentStageName: lead.currentStageName,
    currentStageBucket: lead.currentStageBucket,
    leadSourceName: lead.leadSourceName,
    campaignId: lead.campaignId,
    campaignName: null,
    customerId: lead.customerId,
    nextLeadId: null,
    fieldValues,
    latestCallAttemptId: null,
    latestCallStatus: null,
    notes,
    followUps: [],
    timeline: [],
  };
}

export async function fetchLeadQueuePage(params: ListLeadsParams): Promise<{
  data: Lead[];
  meta: { limit: number; offset: number };
}> {
  return getApi().leads.list(params);
}

export async function fetchLeadCatalog(): Promise<CallerCatalog> {
  try {
    return await getApi().leads.getCatalog();
  } catch {
    // Caller-only catalog fallback when general catalog is unavailable.
  }
  try {
    const catalog = await getApi().caller.getCatalog();
    if (catalog?.stages) return catalog;
  } catch {
    // Fall through.
  }
  return { stages: [], lostReasons: [] };
}

export async function fetchWorkspaceLead(
  leadId: string,
  campaignId?: string | null,
): Promise<CallerWorkspaceLead> {
  try {
    const lead = await getApi().caller.getWorkspaceLead(leadId, { campaignId });
    if (lead && typeof lead === "object" && "id" in lead) return lead;
  } catch {
    // Fall through to public lead APIs.
  }

  const [lead, notes] = await Promise.all([
    getApi().leads.getById(leadId),
    getApi().leads.listNotes(leadId).catch(() => []),
  ]);
  return toWorkspaceLead(lead, notes);
}

export async function fetchCallerCatalog(currentStageId?: string | null): Promise<CallerCatalog> {
  try {
    const catalog = await getApi().caller.getCatalog({ currentStageId });
    if (catalog?.stages) return catalog;
  } catch {
    // Fall through to general catalog.
  }
  return fetchLeadCatalog();
}

export function addLeadNote(leadId: string, body: string) {
  return getApi().leads.addNote(leadId, body);
}

export function changeLeadStage(
  leadId: string,
  input: { stageId: string; lostReasonId?: string },
) {
  return getApi().leads.changeStage(leadId, input);
}

export async function fetchAssignableUsers(search?: string | null): Promise<UserListItem[]> {
  return getApi().users.list({
    status: "ACTIVE",
    search: search?.trim() || undefined,
  });
}

/** @deprecated Prefer fetchLeadQueuePage with campaign filters. */
export function listAssignedLeads() {
  return getApi().leads.list({ limit: 200, offset: 0 });
}
