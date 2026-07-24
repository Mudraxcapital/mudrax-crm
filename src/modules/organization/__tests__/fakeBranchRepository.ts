// ============================================================================
// src/modules/organization/__tests__/fakeBranchRepository.ts
//
// In-memory BranchRepository double for use-case unit tests — no
// Prisma/Postgres involved. Mirrors PrismaBranchRepository's atomic-write +
// audit-record behavior closely enough to exercise the use-cases' own logic
// in isolation.
// ============================================================================

import type {
  BranchRepository,
  CreateBranchData,
  UpdateBranchData,
} from "../domain/repositories/BranchRepository";
import type { Branch } from "../domain/entities/Branch";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../domain/entities/OrganizationAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0001-${String(nextId++).padStart(12, "0")}`;
}

export class FakeBranchRepository implements BranchRepository {
  branches = new Map<string, Branch>();
  auditLog: OrganizationAuditRecord[] = [];

  async findById(id: string): Promise<Branch | null> {
    return this.branches.get(id) ?? null;
  }

  async findByCode(organizationId: string, code: string): Promise<Branch | null> {
    for (const branch of this.branches.values()) {
      if (branch.organizationId === organizationId && branch.code === code) {
        return branch;
      }
    }
    return null;
  }

  async list(organizationId: string): Promise<Branch[]> {
    return [...this.branches.values()].filter((branch) => branch.organizationId === organizationId);
  }

  async createWithAudit(
    data: CreateBranchData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Branch> {
    const now = new Date();
    const branch: Branch = {
      id: makeId(),
      organizationId: data.organizationId,
      name: data.name,
      code: data.code,
      address: data.address ?? null,
      timezone: data.timezone,
      isArchived: data.isArchived,
      createdAt: now,
      updatedAt: now,
    };
    this.branches.set(branch.id, branch);

    this.recordAudit({
      actor,
      action: "BranchCreated",
      targetId: branch.id,
      correlationId,
      beforeState: null,
      afterState: { ...branch },
    });

    return branch;
  }

  async updateWithAudit(
    id: string,
    data: UpdateBranchData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Branch> {
    const existing = this.branches.get(id);
    if (!existing) {
      throw new Error(`FakeBranchRepository: Branch ${id} not found`);
    }

    const updated: Branch = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.branches.set(id, updated);

    this.recordAudit({
      actor,
      action: "BranchUpdated",
      targetId: id,
      correlationId,
      beforeState: { ...existing },
      afterState: { ...updated },
    });

    return updated;
  }

  async listAuditLog(branchId: string): Promise<OrganizationAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.targetId === branchId);
  }

  private recordAudit(input: {
    actor: OrganizationAuditActor;
    action: string;
    targetId: string;
    correlationId?: string | null;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
  }): void {
    const previous = this.auditLog[this.auditLog.length - 1];
    this.auditLog.push({
      id: makeId(),
      organizationId: (input.afterState?.organizationId as string) ?? "",
      occurredAt: new Date(),
      actorType: input.actor.actorType,
      actorId: input.actor.actorId,
      action: input.action,
      targetType: "Branch",
      targetId: input.targetId,
      correlationId: input.correlationId ?? null,
      beforeState: input.beforeState,
      afterState: input.afterState,
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: previous?.recordHash ?? null,
    });
  }
}
