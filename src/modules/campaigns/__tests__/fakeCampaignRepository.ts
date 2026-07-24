// ============================================================================
// src/modules/campaigns/__tests__/fakeCampaignRepository.ts
//
// In-memory CampaignRepository double for use-case unit tests — see leads'
// fakeLeadRepository.ts's identical doc comment.
// ============================================================================

import type {
  CampaignRepository,
  CreateAssignmentData,
  CreateCampaignData,
  UpdateCampaignData,
} from "../domain/repositories/CampaignRepository";
import type { Campaign, CampaignStatus } from "../domain/entities/Campaign";
import type { CampaignMembership } from "../domain/entities/CampaignMembership";
import type {
  CampaignAssignment,
  CampaignAssignmentAllocation,
  CampaignAssignmentStatus,
} from "../domain/entities/CampaignAssignment";
import type {
  CampaignAuditActor,
  CampaignAuditRecord,
} from "../domain/entities/CampaignAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0009-${String(nextId++).padStart(12, "0")}`;
}

export class FakeCampaignRepository implements CampaignRepository {
  campaigns = new Map<string, Campaign>();
  memberships = new Map<string, CampaignMembership[]>();
  assignments = new Map<string, CampaignAssignment[]>();
  allocations = new Map<string, CampaignAssignmentAllocation[]>();
  auditLog: CampaignAuditRecord[] = [];

  async findById(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) ?? null;
  }

  async list(organizationId: string): Promise<Campaign[]> {
    return [...this.campaigns.values()].filter(
      (campaign) => campaign.organizationId === organizationId,
    );
  }

  async count(organizationId: string): Promise<number> {
    return (await this.list(organizationId)).length;
  }

  async createWithAudit(
    data: CreateCampaignData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign> {
    const now = new Date();
    const id = makeId();
    const campaign: Campaign = {
      id,
      organizationId: data.organizationId,
      name: data.name,
      description: data.description ?? null,
      status: "DRAFT",
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      createdByUserId: data.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };
    this.campaigns.set(id, campaign);
    this.recordAudit(
      campaign.organizationId,
      actor,
      "CampaignCreated",
      "Campaign",
      id,
      correlationId,
      null,
      { ...campaign },
    );
    return campaign;
  }

  async updateWithAudit(
    id: string,
    data: UpdateCampaignData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign> {
    const existing = this.campaigns.get(id);
    if (!existing) throw new Error(`FakeCampaignRepository: Campaign ${id} not found`);
    const updated: Campaign = { ...existing, ...data, updatedAt: new Date() };
    this.campaigns.set(id, updated);
    this.recordAudit(
      updated.organizationId,
      actor,
      "CampaignUpdated",
      "Campaign",
      id,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async changeStatusWithAudit(
    id: string,
    status: CampaignStatus,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign> {
    const existing = this.campaigns.get(id);
    if (!existing) throw new Error(`FakeCampaignRepository: Campaign ${id} not found`);
    const updated: Campaign = { ...existing, status, updatedAt: new Date() };
    this.campaigns.set(id, updated);
    this.recordAudit(
      updated.organizationId,
      actor,
      "CampaignStatusChanged",
      "Campaign",
      id,
      correlationId,
      { ...existing },
      { ...updated },
    );
    return updated;
  }

  async listMembers(campaignId: string): Promise<CampaignMembership[]> {
    return this.memberships.get(campaignId) ?? [];
  }

  async findMembership(campaignId: string, userId: string): Promise<CampaignMembership | null> {
    const members = this.memberships.get(campaignId) ?? [];
    return members.find((member) => member.userId === userId) ?? null;
  }

  async addMemberWithAudit(
    campaignId: string,
    userId: string,
    allocationWeight: number,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignMembership> {
    const members = this.memberships.get(campaignId) ?? [];
    const existingIndex = members.findIndex((member) => member.userId === userId);
    const membership: CampaignMembership = {
      campaignId,
      userId,
      allocationWeight,
      isActive: true,
      joinedAt: existingIndex >= 0 ? members[existingIndex]!.joinedAt : new Date(),
      leftAt: null,
    };
    if (existingIndex >= 0) {
      members[existingIndex] = membership;
    } else {
      members.push(membership);
    }
    this.memberships.set(campaignId, members);
    this.recordAudit(
      this.campaigns.get(campaignId)?.organizationId ?? "",
      actor,
      "CampaignMemberAdded",
      "CampaignMembership",
      campaignId,
      correlationId,
      null,
      { ...membership },
    );
    return membership;
  }

  async removeMemberWithAudit(
    campaignId: string,
    userId: string,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignMembership> {
    const members = this.memberships.get(campaignId) ?? [];
    const index = members.findIndex((member) => member.userId === userId);
    if (index < 0)
      throw new Error(`FakeCampaignRepository: Membership ${campaignId}/${userId} not found`);
    const before = members[index]!;
    const updated: CampaignMembership = { ...before, isActive: false, leftAt: new Date() };
    members[index] = updated;
    this.memberships.set(campaignId, members);
    this.recordAudit(
      this.campaigns.get(campaignId)?.organizationId ?? "",
      actor,
      "CampaignMemberRemoved",
      "CampaignMembership",
      campaignId,
      correlationId,
      { ...before },
      { ...updated },
    );
    return updated;
  }

  async createAssignmentWithAudit(
    data: CreateAssignmentData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignAssignment> {
    const now = new Date();
    const id = makeId();
    const assignment: CampaignAssignment = {
      id,
      campaignId: data.campaignId,
      initiatedByUserId: data.initiatedByUserId,
      allocationMethod: data.allocationMethod,
      targetLeadCount: data.targetLeadCount,
      status: "EXECUTING",
      executedAt: null,
      createdAt: now,
    };
    const list = this.assignments.get(data.campaignId) ?? [];
    list.push(assignment);
    this.assignments.set(data.campaignId, list);

    this.allocations.set(
      id,
      data.allocations.map((allocation) => ({
        id: makeId(),
        campaignAssignmentId: id,
        userId: allocation.userId,
        allocatedPercentage: allocation.allocatedPercentage,
        allocatedCount: allocation.allocatedCount,
      })),
    );

    this.recordAudit(
      this.campaigns.get(data.campaignId)?.organizationId ?? "",
      actor,
      "CampaignAssignmentCreated",
      "CampaignAssignment",
      id,
      correlationId,
      null,
      { ...assignment },
    );
    return assignment;
  }

  async markAssignmentExecutedWithAudit(
    id: string,
    status: Extract<CampaignAssignmentStatus, "COMPLETED" | "FAILED">,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignAssignment> {
    for (const [campaignId, list] of this.assignments.entries()) {
      const index = list.findIndex((assignment) => assignment.id === id);
      if (index >= 0) {
        const before = list[index]!;
        const updated: CampaignAssignment = { ...before, status, executedAt: new Date() };
        list[index] = updated;
        this.assignments.set(campaignId, list);
        this.recordAudit(
          this.campaigns.get(campaignId)?.organizationId ?? "",
          actor,
          "CampaignAssignmentExecuted",
          "CampaignAssignment",
          id,
          correlationId,
          { ...before },
          { ...updated },
        );
        return updated;
      }
    }
    throw new Error(`FakeCampaignRepository: CampaignAssignment ${id} not found`);
  }

  async listAssignments(campaignId: string): Promise<CampaignAssignment[]> {
    return this.assignments.get(campaignId) ?? [];
  }

  async listAssignmentAllocations(
    campaignAssignmentId: string,
  ): Promise<CampaignAssignmentAllocation[]> {
    return this.allocations.get(campaignAssignmentId) ?? [];
  }

  async listAuditLog(campaignId: string): Promise<CampaignAuditRecord[]> {
    return this.auditLog.filter(
      (entry) =>
        (entry.targetType === "Campaign" && entry.targetId === campaignId) ||
        (entry.targetType === "CampaignMembership" && entry.targetId === campaignId),
    );
  }

  async listRecentAuditLog(organizationId: string, limit: number): Promise<CampaignAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.organizationId === organizationId).slice(0, limit);
  }

  private recordAudit(
    organizationId: string,
    actor: CampaignAuditActor,
    action: string,
    targetType: string,
    targetId: string,
    correlationId: string | null | undefined,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null,
  ): void {
    const previous = this.auditLog[this.auditLog.length - 1];
    this.auditLog.push({
      id: makeId(),
      organizationId,
      occurredAt: new Date(),
      actorType: actor.actorType,
      actorId: actor.actorId,
      action,
      targetType,
      targetId,
      correlationId: correlationId ?? null,
      beforeState,
      afterState,
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: previous?.recordHash ?? null,
    });
  }
}
