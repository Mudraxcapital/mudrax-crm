// ============================================================================
// src/modules/organization/__tests__/fakeDepartmentRepository.ts
//
// In-memory DepartmentRepository double for use-case unit tests — see
// fakeBranchRepository.ts's identical doc comment.
// ============================================================================

import type {
  CreateDepartmentData,
  DepartmentRepository,
  UpdateDepartmentData,
} from "../domain/repositories/DepartmentRepository";
import type { Department } from "../domain/entities/Department";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../domain/entities/OrganizationAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0002-${String(nextId++).padStart(12, "0")}`;
}

export class FakeDepartmentRepository implements DepartmentRepository {
  departments = new Map<string, Department>();
  auditLog: OrganizationAuditRecord[] = [];

  async findById(id: string): Promise<Department | null> {
    return this.departments.get(id) ?? null;
  }

  async findByCode(organizationId: string, code: string): Promise<Department | null> {
    for (const department of this.departments.values()) {
      if (department.organizationId === organizationId && department.code === code) {
        return department;
      }
    }
    return null;
  }

  async list(organizationId: string): Promise<Department[]> {
    return [...this.departments.values()].filter(
      (department) => department.organizationId === organizationId,
    );
  }

  async createWithAudit(
    data: CreateDepartmentData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Department> {
    const now = new Date();
    const department: Department = {
      id: makeId(),
      organizationId: data.organizationId,
      name: data.name,
      code: data.code,
      isArchived: data.isArchived,
      createdAt: now,
      updatedAt: now,
    };
    this.departments.set(department.id, department);

    this.recordAudit({
      actor,
      action: "DepartmentCreated",
      targetId: department.id,
      correlationId,
      beforeState: null,
      afterState: { ...department },
    });

    return department;
  }

  async updateWithAudit(
    id: string,
    data: UpdateDepartmentData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Department> {
    const existing = this.departments.get(id);
    if (!existing) {
      throw new Error(`FakeDepartmentRepository: Department ${id} not found`);
    }

    const updated: Department = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.departments.set(id, updated);

    this.recordAudit({
      actor,
      action: "DepartmentUpdated",
      targetId: id,
      correlationId,
      beforeState: { ...existing },
      afterState: { ...updated },
    });

    return updated;
  }

  async listAuditLog(departmentId: string): Promise<OrganizationAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.targetId === departmentId);
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
      targetType: "Department",
      targetId: input.targetId,
      correlationId: input.correlationId ?? null,
      beforeState: input.beforeState,
      afterState: input.afterState,
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: previous?.recordHash ?? null,
    });
  }
}
