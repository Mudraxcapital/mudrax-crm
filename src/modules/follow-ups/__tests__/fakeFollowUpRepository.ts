// ============================================================================
// src/modules/follow-ups/__tests__/fakeFollowUpRepository.ts
//
// In-memory FollowUpRepository double for use-case unit tests — see leads'
// fakeLeadRepository.ts's identical doc comment.
// ============================================================================

import type {
  CompleteFollowUpData,
  CreateFollowUpData,
  EscalateFollowUpData,
  FollowUpRepository,
  ListDueFollowUpsFilter,
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
    if (filter?.leadIds?.length) {
      const allowed = new Set(filter.leadIds);
      results = results.filter((followUp) => allowed.has(followUp.leadId));
    }
    if (filter?.status) results = results.filter((followUp) => followUp.status === filter.status);
    if (filter?.assignedToUserIds) {
      results = results.filter((followUp) =>
        filter.assignedToUserIds!.includes(followUp.currentAssigneeUserId),
      );
    }
    if (filter?.scheduledFrom) {
      results = results.filter((followUp) => followUp.scheduledFor >= filter.scheduledFrom!);
    }
    if (filter?.scheduledTo) {
      results = results.filter((followUp) => followUp.scheduledFor <= filter.scheduledTo!);
    }
    const limit = filter?.limit;
    if (typeof limit === "number") {
      results = results.slice(filter?.offset ?? 0, (filter?.offset ?? 0) + limit);
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

  async markDueWithAudit(
    id: string,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    const existing = this.followUps.get(id);
    if (!existing) throw new Error(`FakeFollowUpRepository: FollowUp ${id} not found`);
    if (existing.status === "DUE") return existing;
    if (existing.status !== "SCHEDULED") return existing;
    const updated: FollowUp = { ...existing, status: "DUE", updatedAt: new Date() };
    this.followUps.set(id, updated);
    this.recordAudit(actor, "FollowUpMarkedDue", id, correlationId, { ...existing }, { ...updated });
    return updated;
  }

  async markMissedWithAudit(
    id: string,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
    missedAt?: Date,
  ): Promise<FollowUp> {
    const existing = this.followUps.get(id);
    if (!existing) throw new Error(`FakeFollowUpRepository: FollowUp ${id} not found`);
    if (
      existing.status === "MISSED" ||
      existing.status === "ESCALATED" ||
      existing.status === "COMPLETED" ||
      existing.status === "CANCELLED"
    ) {
      return existing;
    }
    const updated: FollowUp = {
      ...existing,
      status: "MISSED",
      missedAt: missedAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.followUps.set(id, updated);
    this.recordAudit(
      actor,
      "FollowUpMarkedMissed",
      id,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async escalateWithAudit(
    id: string,
    data: EscalateFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
    escalatedAt?: Date,
  ): Promise<FollowUp> {
    const existing = this.followUps.get(id);
    if (!existing) throw new Error(`FakeFollowUpRepository: FollowUp ${id} not found`);
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") return existing;
    const updated: FollowUp = {
      ...existing,
      status: data.markEscalated === false ? existing.status : "ESCALATED",
      escalatedAt: escalatedAt ?? new Date(),
      escalatedToUserId: data.escalatedToUserId,
      currentAssigneeUserId: data.reassignToEscalatedUser
        ? data.escalatedToUserId
        : existing.currentAssigneeUserId,
      updatedAt: new Date(),
    };
    this.followUps.set(id, updated);
    this.recordAudit(actor, "FollowUpEscalated", id, correlationId, { ...existing }, { ...updated });
    return updated;
  }

  async listDueCandidates(
    organizationId: string,
    filter: ListDueFollowUpsFilter,
  ): Promise<FollowUp[]> {
    let results = [...this.followUps.values()].filter(
      (followUp) =>
        followUp.organizationId === organizationId && followUp.scheduledFor <= filter.dueBy,
    );
    if (filter.statuses?.length) {
      results = results.filter((followUp) => filter.statuses!.includes(followUp.status));
    } else {
      results = results.filter((followUp) =>
        ["SCHEDULED", "DUE", "MISSED", "ESCALATED"].includes(followUp.status),
      );
    }
    if (filter.triggerType) {
      results = results.filter((followUp) => followUp.triggerType === filter.triggerType);
    }
    if (filter.notEscalated) {
      results = results.filter((followUp) => followUp.escalatedAt === null);
    }
    results.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
    return results.slice(0, filter.limit ?? 100);
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
