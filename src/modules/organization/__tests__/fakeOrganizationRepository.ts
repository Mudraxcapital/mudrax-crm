// ============================================================================
// src/modules/organization/__tests__/fakeOrganizationRepository.ts
//
// In-memory OrganizationRepository double for use-case unit tests — no
// Prisma/Postgres involved. Mirrors PrismaOrganizationRepository's
// atomic-write + audit-record behavior closely enough to exercise the
// use-cases' own logic (duplicate-code checks, not-found handling, audit
// entry shape) in isolation.
// ============================================================================

import type {
  CreateOrganizationData,
  OrganizationRepository,
  UpdateOrganizationData,
} from "../domain/repositories/OrganizationRepository";
import type { Organization } from "../domain/entities/Organization";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../domain/entities/OrganizationAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0000-${String(nextId++).padStart(12, "0")}`;
}

export class FakeOrganizationRepository implements OrganizationRepository {
  organizations = new Map<string, Organization>();
  auditLog: OrganizationAuditRecord[] = [];

  async findById(id: string): Promise<Organization | null> {
    return this.organizations.get(id) ?? null;
  }

  async findByCode(code: string): Promise<Organization | null> {
    for (const organization of this.organizations.values()) {
      if (organization.code === code) {
        return organization;
      }
    }
    return null;
  }

  async list(): Promise<Organization[]> {
    return [...this.organizations.values()];
  }

  async createWithAudit(
    data: CreateOrganizationData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Organization> {
    const now = new Date();
    const organization: Organization = {
      id: makeId(),
      name: data.name,
      code: data.code,
      status: data.status,
      timezone: data.timezone,
      createdAt: now,
      updatedAt: now,
    };
    this.organizations.set(organization.id, organization);

    this.recordAudit({
      organizationId: organization.id,
      actor,
      action: "OrganizationCreated",
      targetId: organization.id,
      correlationId,
      beforeState: null,
      afterState: { ...organization },
    });

    return organization;
  }

  async updateWithAudit(
    id: string,
    data: UpdateOrganizationData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Organization> {
    const existing = this.organizations.get(id);
    if (!existing) {
      throw new Error(`FakeOrganizationRepository: Organization ${id} not found`);
    }

    const updated: Organization = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.organizations.set(id, updated);

    this.recordAudit({
      organizationId: id,
      actor,
      action: "OrganizationUpdated",
      targetId: id,
      correlationId,
      beforeState: { ...existing },
      afterState: { ...updated },
    });

    return updated;
  }

  async listAuditLog(organizationId: string): Promise<OrganizationAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.organizationId === organizationId);
  }

  private recordAudit(input: {
    organizationId: string;
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
      organizationId: input.organizationId,
      occurredAt: new Date(),
      actorType: input.actor.actorType,
      actorId: input.actor.actorId,
      action: input.action,
      targetType: "Organization",
      targetId: input.targetId,
      correlationId: input.correlationId ?? null,
      beforeState: input.beforeState,
      afterState: input.afterState,
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: previous?.recordHash ?? null,
    });
  }
}
