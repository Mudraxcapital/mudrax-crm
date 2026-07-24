// ============================================================================
// src/modules/leads/__tests__/fakeLeadRepository.ts
//
// In-memory LeadRepository double for use-case unit tests — see customers'
// fakeCustomerRepository.ts's identical doc comment.
// ============================================================================

import type {
  AssignLeadData,
  ChangeLeadStageData,
  CreateLeadData,
  LeadRepository,
  ListLeadsFilter,
  UpdateLeadData,
} from "../domain/repositories/LeadRepository";
import type { Lead } from "../domain/entities/Lead";
import type { LeadAssignment } from "../domain/entities/LeadAssignment";
import type { LeadAuditActor, LeadAuditRecord } from "../domain/entities/LeadAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0005-${String(nextId++).padStart(12, "0")}`;
}

export class FakeLeadRepository implements LeadRepository {
  leads = new Map<string, Lead>();
  assignments = new Map<string, LeadAssignment[]>();
  auditLog: LeadAuditRecord[] = [];

  async findById(id: string): Promise<Lead | null> {
    return this.leads.get(id) ?? null;
  }

  async list(organizationId: string, filter?: ListLeadsFilter): Promise<Lead[]> {
    let results = [...this.leads.values()].filter((lead) => lead.organizationId === organizationId);
    if (filter?.customerId)
      results = results.filter((lead) => lead.customerId === filter.customerId);
    if (filter?.currentStageId) {
      results = results.filter((lead) => lead.currentStageId === filter.currentStageId);
    }
    if (filter?.assignedToUserIds) {
      results = results.filter(
        (lead) =>
          lead.currentAssigneeUserId &&
          filter.assignedToUserIds!.includes(lead.currentAssigneeUserId),
      );
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (lead) =>
          lead.fullNameSnapshot.toLowerCase().includes(q) ||
          (lead.phoneSnapshot?.toLowerCase().includes(q) ?? false) ||
          (lead.emailSnapshot?.toLowerCase().includes(q) ?? false),
      );
    }
    return results;
  }

  async listByCustomer(customerId: string): Promise<Lead[]> {
    return [...this.leads.values()].filter((lead) => lead.customerId === customerId);
  }

  async repointCustomer(fromCustomerId: string, toCustomerId: string): Promise<number> {
    let count = 0;
    for (const [id, lead] of this.leads.entries()) {
      if (lead.customerId === fromCustomerId) {
        this.leads.set(id, { ...lead, customerId: toCustomerId, updatedAt: new Date() });
        count += 1;
      }
    }
    return count;
  }

  async count(organizationId: string, filter?: ListLeadsFilter): Promise<number> {
    return (await this.list(organizationId, filter)).length;
  }

  async countByStage(organizationId: string): Promise<{ stageId: string; count: number }[]> {
    const counts = new Map<string, number>();
    for (const lead of this.leads.values()) {
      if (lead.organizationId !== organizationId) continue;
      counts.set(lead.currentStageId, (counts.get(lead.currentStageId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([stageId, count]) => ({ stageId, count }));
  }

  async countBySource(organizationId: string): Promise<{ sourceId: string; count: number }[]> {
    const counts = new Map<string, number>();
    for (const lead of this.leads.values()) {
      if (lead.organizationId !== organizationId) continue;
      counts.set(lead.leadSourceId, (counts.get(lead.leadSourceId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([sourceId, count]) => ({ sourceId, count }));
  }

  async createWithAudit(
    data: CreateLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead> {
    const now = new Date();
    const id = makeId();
    const lead: Lead = {
      id,
      organizationId: data.organizationId,
      customerId: data.customerId,
      leadSourceId: data.leadSourceId,
      currentStageId: data.currentStageId,
      lostReasonId: null,
      campaignId: data.campaignId ?? null,
      currentAssigneeUserId: data.initialAssignment?.assignedToUserId ?? null,
      fullNameSnapshot: data.fullNameSnapshot,
      phoneSnapshot: data.phoneSnapshot ?? null,
      emailSnapshot: data.emailSnapshot ?? null,
      nextActionAt: null,
      nextActionType: null,
      wonAt: null,
      lostAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.leads.set(id, lead);

    if (data.initialAssignment) {
      this.assignments.set(id, [
        {
          id: makeId(),
          leadId: id,
          assignedToUserId: data.initialAssignment.assignedToUserId,
          assignedByUserId: data.initialAssignment.assignedByUserId,
          assignmentType: data.initialAssignment.assignmentType,
          campaignAssignmentId: null,
          assignedAt: now,
          unassignedAt: null,
        },
      ]);
    }

    this.recordAudit(actor, "LeadCreated", id, correlationId, null, { ...lead });
    return lead;
  }

  async updateWithAudit(
    id: string,
    data: UpdateLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead> {
    const existing = this.leads.get(id);
    if (!existing) throw new Error(`FakeLeadRepository: Lead ${id} not found`);
    const updated: Lead = { ...existing, ...data, updatedAt: new Date() };
    this.leads.set(id, updated);
    this.recordAudit(actor, "LeadUpdated", id, correlationId, { ...existing }, { ...updated });
    return updated;
  }

  async changeStageWithAudit(
    id: string,
    data: ChangeLeadStageData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead> {
    const existing = this.leads.get(id);
    if (!existing) throw new Error(`FakeLeadRepository: Lead ${id} not found`);
    const updated: Lead = { ...existing, ...data, updatedAt: new Date() };
    this.leads.set(id, updated);
    this.recordAudit(actor, "LeadStageChanged", id, correlationId, { ...existing }, { ...updated });
    return updated;
  }

  async assignWithAudit(
    id: string,
    data: AssignLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead> {
    const existing = this.leads.get(id);
    if (!existing) throw new Error(`FakeLeadRepository: Lead ${id} not found`);

    const history = this.assignments.get(id) ?? [];
    const now = new Date();
    for (const assignment of history) {
      if (!assignment.unassignedAt) assignment.unassignedAt = now;
    }
    history.push({
      id: makeId(),
      leadId: id,
      assignedToUserId: data.assignedToUserId,
      assignedByUserId: data.assignedByUserId,
      assignmentType: data.assignmentType,
      campaignAssignmentId: data.campaignAssignmentId ?? null,
      assignedAt: now,
      unassignedAt: null,
    });
    this.assignments.set(id, history);

    const updated: Lead = {
      ...existing,
      currentAssigneeUserId: data.assignedToUserId,
      updatedAt: now,
    };
    this.leads.set(id, updated);
    this.recordAudit(
      actor,
      data.assignmentType === "INITIAL" ? "LeadAssigned" : "LeadReassigned",
      id,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async listAssignmentHistory(leadId: string): Promise<LeadAssignment[]> {
    return this.assignments.get(leadId) ?? [];
  }

  async updateNextAction(
    leadId: string,
    nextActionAt: Date | null,
    nextActionType: string | null,
  ): Promise<void> {
    const existing = this.leads.get(leadId);
    if (!existing) return;
    this.leads.set(leadId, { ...existing, nextActionAt, nextActionType });
  }

  async listAuditLog(leadId: string): Promise<LeadAuditRecord[]> {
    return this.auditLog.filter(
      (entry) => entry.targetId === leadId && entry.targetType === "Lead",
    );
  }

  async listRecentAuditLog(organizationId: string, limit: number): Promise<LeadAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.organizationId === organizationId).slice(0, limit);
  }

  private recordAudit(
    actor: LeadAuditActor,
    action: string,
    targetId: string,
    correlationId: string | null | undefined,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null,
  ): void {
    const previous = this.auditLog[this.auditLog.length - 1];
    this.auditLog.push({
      id: makeId(),
      organizationId: (afterState?.organizationId as string) ?? "",
      occurredAt: new Date(),
      actorType: actor.actorType,
      actorId: actor.actorId,
      action,
      targetType: "Lead",
      targetId,
      correlationId: correlationId ?? null,
      beforeState,
      afterState,
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: previous?.recordHash ?? null,
    });
  }
}
