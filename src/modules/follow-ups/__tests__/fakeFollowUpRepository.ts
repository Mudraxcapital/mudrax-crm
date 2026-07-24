// ============================================================================
// src/modules/follow-ups/__tests__/fakeFollowUpRepository.ts
//
// In-memory FollowUpRepository double for use-case unit tests — see leads'
// fakeLeadRepository.ts's identical doc comment.
// ============================================================================

import type {
  CompleteFollowUpData,
  CreateFollowUpData,
  FollowUpRepository,
  ListFollowUpsFilter,
  ReassignFollowUpData,
  UpdateFollowUpData,
} from "../domain/repositories/FollowUpRepository";
import type { FollowUp } from "../domain/entities/FollowUp";
import type { FollowUpReassignment } from "../domain/entities/FollowUpReassignment";
import type {
  FollowUpAuditActor,
  FollowUpAuditRecord,
} from "../domain/entities/FollowUpAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0007-${String(nextId++).padStart(12, "0")}`;
}

export class FakeFollowUpRepository implements FollowUpRepository {
  followUps = new Map<string, FollowUp>();
  reassignments = new Map<string, FollowUpReassignment[]>();
  auditLog: FollowUpAuditRecord[] = [];

  async findById(id: string): Promise<FollowUp | null> {
    return this.followUps.get(id) ?? null;
  }

  async list(organizationId: string, filter?: ListFollowUpsFilter): Promise<FollowUp[]> {
    let results = [...this.followUps.values()].filter(
      (followUp) => followUp.organizationId === organizationId,
    );
    if (filter?.leadId) results = results.filter((followUp) => followUp.leadId === filter.leadId);
    if (filter?.status) results = results.filter((followUp) => followUp.status === filter.status);
    if (filter?.assignedToUserIds) {
      results = results.filter((followUp) =>
        filter.assignedToUserIds!.includes(followUp.currentAssigneeUserId),
      );
    }
    return results;
  }

  async listByLead(leadId: string): Promise<FollowUp[]> {
    return [...this.followUps.values()].filter((followUp) => followUp.leadId === leadId);
  }

  async count(organizationId: string, filter?: ListFollowUpsFilter): Promise<number> {
    return (await this.list(organizationId, filter)).length;
  }

  async createWithAudit(
    data: CreateFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    const now = new Date();
    const id = makeId();
    const followUp: FollowUp = {
      id,
      organizationId: data.organizationId,
      leadId: data.leadId,
      triggerType: data.triggerType,
      status: "SCHEDULED",
      scheduledFor: data.scheduledFor,
      currentAssigneeUserId: data.currentAssigneeUserId,
      createdByUserId: data.createdByUserId,
      completedAt: null,
      completedByUserId: null,
      outcomeNotes: null,
      missedAt: null,
      escalatedAt: null,
      escalatedToUserId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.followUps.set(id, followUp);
    this.recordAudit(actor, "FollowUpCreated", id, correlationId, null, { ...followUp });
    return followUp;
  }

  async updateWithAudit(
    id: string,
    data: UpdateFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    const existing = this.followUps.get(id);
    if (!existing) throw new Error(`FakeFollowUpRepository: FollowUp ${id} not found`);
    const updated: FollowUp = { ...existing, ...data, updatedAt: new Date() };
    this.followUps.set(id, updated);
    this.recordAudit(actor, "FollowUpUpdated", id, correlationId, { ...existing }, { ...updated });
    return updated;
  }

  async completeWithAudit(
    id: string,
    data: CompleteFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    const existing = this.followUps.get(id);
    if (!existing) throw new Error(`FakeFollowUpRepository: FollowUp ${id} not found`);
    const updated: FollowUp = {
      ...existing,
      status: "COMPLETED",
      completedAt: new Date(),
      completedByUserId: data.completedByUserId,
      outcomeNotes: data.outcomeNotes,
      updatedAt: new Date(),
    };
    this.followUps.set(id, updated);
    this.recordAudit(
      actor,
      "FollowUpCompleted",
      id,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async reassignWithAudit(
    id: string,
    data: ReassignFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    const existing = this.followUps.get(id);
    if (!existing) throw new Error(`FakeFollowUpRepository: FollowUp ${id} not found`);

    const history = this.reassignments.get(id) ?? [];
    history.push({
      id: makeId(),
      followUpId: id,
      fromUserId: existing.currentAssigneeUserId,
      toUserId: data.toUserId,
      reassignedByUserId: data.reassignedByUserId,
      reason: data.reason,
      reassignedAt: new Date(),
    });
    this.reassignments.set(id, history);

    const updated: FollowUp = {
      ...existing,
      currentAssigneeUserId: data.toUserId,
      updatedAt: new Date(),
    };
    this.followUps.set(id, updated);
    this.recordAudit(
      actor,
      "FollowUpReassigned",
      id,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async listReassignmentHistory(followUpId: string): Promise<FollowUpReassignment[]> {
    return this.reassignments.get(followUpId) ?? [];
  }

  async listAuditLog(followUpId: string): Promise<FollowUpAuditRecord[]> {
    return this.auditLog.filter(
      (entry) => entry.targetId === followUpId && entry.targetType === "FollowUp",
    );
  }

  async listRecentAuditLog(organizationId: string, limit: number): Promise<FollowUpAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.organizationId === organizationId).slice(0, limit);
  }

  private recordAudit(
    actor: FollowUpAuditActor,
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
      targetType: "FollowUp",
      targetId,
      correlationId: correlationId ?? null,
      beforeState,
      afterState,
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: previous?.recordHash ?? null,
    });
  }
}
