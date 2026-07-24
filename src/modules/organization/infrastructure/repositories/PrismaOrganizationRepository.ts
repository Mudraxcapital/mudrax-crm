// ============================================================================
// src/modules/organization/infrastructure/repositories/PrismaOrganizationRepository.ts
//
// Prisma-backed implementation of OrganizationRepository. The only
// repository implementation allowed to know about `@prisma/client` in this
// module. `createWithAudit`/`updateWithAudit` write the Organization row and
// its Audit Record inside one `$transaction` so the two never diverge.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateOrganizationData,
  OrganizationRepository,
  UpdateOrganizationData,
} from "../../domain/repositories/OrganizationRepository";
import type { Organization } from "../../domain/entities/Organization";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../../domain/entities/OrganizationAuditRecord";
import { toOrganization, toOrganizationAuditRecord } from "../mappers/organizationMapper";

const TARGET_TYPE_ORGANIZATION = "Organization";

/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see the two call sites below. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(organization: Organization): Prisma.InputJsonValue {
  return {
    id: organization.id,
    name: organization.name,
    code: organization.code,
    status: organization.status,
    timezone: organization.timezone,
  };
}

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Organization | null> {
    const row = await this.prisma.organization.findUnique({ where: { id } });
    return row ? toOrganization(row) : null;
  }

  async findByCode(code: string): Promise<Organization | null> {
    const row = await this.prisma.organization.findUnique({ where: { code } });
    return row ? toOrganization(row) : null;
  }

  async list(): Promise<Organization[]> {
    const rows = await this.prisma.organization.findMany({ orderBy: { name: "asc" } });
    return rows.map(toOrganization);
  }

  async createWithAudit(
    data: CreateOrganizationData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Organization> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.organization.create({ data });
      const organization = toOrganization(row);

      await tx.organizationAuditLog.create({
        data: {
          organizationId: organization.id,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "OrganizationCreated",
          targetType: TARGET_TYPE_ORGANIZATION,
          targetId: organization.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(organization),
          // Overwritten unconditionally by the organization_audit_log_hash_chain_biu
          // BEFORE INSERT trigger (migration 20260724184500) — the application
          // never computes this itself, but Prisma's generated type still
          // requires a value for this NOT NULL column.
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return organization;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateOrganizationData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Organization> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.organization.findUniqueOrThrow({ where: { id } });
      const before = toOrganization(beforeRow);

      const afterRow = await tx.organization.update({ where: { id }, data });
      const after = toOrganization(afterRow);

      await tx.organizationAuditLog.create({
        data: {
          organizationId: after.id,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "OrganizationUpdated",
          targetType: TARGET_TYPE_ORGANIZATION,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          // See the identical comment in createWithAudit above.
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async listAuditLog(organizationId: string): Promise<OrganizationAuditRecord[]> {
    const rows = await this.prisma.organizationAuditLog.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toOrganizationAuditRecord);
  }
}
