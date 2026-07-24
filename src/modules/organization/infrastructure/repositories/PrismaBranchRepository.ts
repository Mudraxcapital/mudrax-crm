// ============================================================================
// src/modules/organization/infrastructure/repositories/PrismaBranchRepository.ts
//
// Prisma-backed implementation of BranchRepository. The only repository
// implementation allowed to know about `@prisma/client` for Branch in this
// module. `createWithAudit`/`updateWithAudit` write the Branch row and its
// Audit Record inside one `$transaction` so the two never diverge.
//
// Audit Records are written to the same `organization.organization_audit_log`
// table the Organization aggregate itself uses (one append-only, hash-chained
// Audit Trail per module — platform-contracts.md §4 — not one table per
// aggregate), distinguished by `targetType = "Branch"`.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  BranchRepository,
  CreateBranchData,
  UpdateBranchData,
} from "../../domain/repositories/BranchRepository";
import type { Branch } from "../../domain/entities/Branch";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../../domain/entities/OrganizationAuditRecord";
import { toBranch } from "../mappers/branchMapper";
import { toOrganizationAuditRecord } from "../mappers/organizationMapper";

const TARGET_TYPE_BRANCH = "Branch";

/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see organizationAuditLog's identical comment in PrismaOrganizationRepository.ts. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(branch: Branch): Prisma.InputJsonValue {
  return {
    id: branch.id,
    organizationId: branch.organizationId,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    timezone: branch.timezone,
    isArchived: branch.isArchived,
  };
}

export class PrismaBranchRepository implements BranchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Branch | null> {
    const row = await this.prisma.branch.findUnique({ where: { id } });
    return row ? toBranch(row) : null;
  }

  async findByCode(organizationId: string, code: string): Promise<Branch | null> {
    const row = await this.prisma.branch.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    return row ? toBranch(row) : null;
  }

  async list(organizationId: string): Promise<Branch[]> {
    const rows = await this.prisma.branch.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return rows.map(toBranch);
  }

  async createWithAudit(
    data: CreateBranchData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Branch> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.branch.create({ data });
      const branch = toBranch(row);

      await tx.organizationAuditLog.create({
        data: {
          organizationId: branch.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "BranchCreated",
          targetType: TARGET_TYPE_BRANCH,
          targetId: branch.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(branch),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return branch;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateBranchData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Branch> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.branch.findUniqueOrThrow({ where: { id } });
      const before = toBranch(beforeRow);

      const afterRow = await tx.branch.update({ where: { id }, data });
      const after = toBranch(afterRow);

      await tx.organizationAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "BranchUpdated",
          targetType: TARGET_TYPE_BRANCH,
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

  async listAuditLog(branchId: string): Promise<OrganizationAuditRecord[]> {
    const rows = await this.prisma.organizationAuditLog.findMany({
      where: { targetType: TARGET_TYPE_BRANCH, targetId: branchId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toOrganizationAuditRecord);
  }
}
