// ============================================================================
// src/modules/organization/infrastructure/repositories/PrismaDepartmentRepository.ts
//
// Prisma-backed implementation of DepartmentRepository. `createWithAudit`/
// `updateWithAudit` write the Department row and its Audit Record inside one
// `$transaction`. Audit Records share `organization.organization_audit_log`
// with the rest of this module, distinguished by `targetType = "Department"`
// — see PrismaBranchRepository.ts's identical comment.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateDepartmentData,
  DepartmentRepository,
  UpdateDepartmentData,
} from "../../domain/repositories/DepartmentRepository";
import type { Department } from "../../domain/entities/Department";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../../domain/entities/OrganizationAuditRecord";
import { toDepartment } from "../mappers/departmentMapper";
import { toOrganizationAuditRecord } from "../mappers/organizationMapper";

const TARGET_TYPE_DEPARTMENT = "Department";

/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see the identical comment in PrismaOrganizationRepository.ts. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(department: Department): Prisma.InputJsonValue {
  return {
    id: department.id,
    organizationId: department.organizationId,
    name: department.name,
    code: department.code,
    isArchived: department.isArchived,
  };
}

export class PrismaDepartmentRepository implements DepartmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Department | null> {
    const row = await this.prisma.department.findUnique({ where: { id } });
    return row ? toDepartment(row) : null;
  }

  async findByCode(organizationId: string, code: string): Promise<Department | null> {
    const row = await this.prisma.department.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    return row ? toDepartment(row) : null;
  }

  async list(organizationId: string): Promise<Department[]> {
    const rows = await this.prisma.department.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return rows.map(toDepartment);
  }

  async createWithAudit(
    data: CreateDepartmentData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Department> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.department.create({ data });
      const department = toDepartment(row);

      await tx.organizationAuditLog.create({
        data: {
          organizationId: department.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DepartmentCreated",
          targetType: TARGET_TYPE_DEPARTMENT,
          targetId: department.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(department),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return department;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateDepartmentData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Department> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.department.findUniqueOrThrow({ where: { id } });
      const before = toDepartment(beforeRow);

      const afterRow = await tx.department.update({ where: { id }, data });
      const after = toDepartment(afterRow);

      await tx.organizationAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DepartmentUpdated",
          targetType: TARGET_TYPE_DEPARTMENT,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async listAuditLog(departmentId: string): Promise<OrganizationAuditRecord[]> {
    const rows = await this.prisma.organizationAuditLog.findMany({
      where: { targetType: TARGET_TYPE_DEPARTMENT, targetId: departmentId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toOrganizationAuditRecord);
  }
}
