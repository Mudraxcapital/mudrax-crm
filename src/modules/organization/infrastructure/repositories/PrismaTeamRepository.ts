// ============================================================================
// src/modules/organization/infrastructure/repositories/PrismaTeamRepository.ts
//
// Prisma-backed implementation of TeamRepository. `createWithAudit`/
// `updateWithAudit` write the Team row and its Audit Record inside one
// `$transaction`. Audit Records share `organization.organization_audit_log`
// with the rest of this module, distinguished by `targetType = "Team"` —
// see PrismaBranchRepository.ts's identical comment.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateTeamData,
  TeamRepository,
  UpdateTeamData,
} from "../../domain/repositories/TeamRepository";
import type { Team } from "../../domain/entities/Team";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../../domain/entities/OrganizationAuditRecord";
import { toTeam } from "../mappers/teamMapper";
import { toOrganizationAuditRecord } from "../mappers/organizationMapper";

const TARGET_TYPE_TEAM = "Team";

/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see the identical comment in PrismaOrganizationRepository.ts. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(team: Team): Prisma.InputJsonValue {
  return {
    id: team.id,
    organizationId: team.organizationId,
    branchId: team.branchId,
    name: team.name,
    code: team.code,
    isArchived: team.isArchived,
  };
}

export class PrismaTeamRepository implements TeamRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Team | null> {
    const row = await this.prisma.team.findUnique({ where: { id } });
    return row ? toTeam(row) : null;
  }

  async findByCode(organizationId: string, code: string): Promise<Team | null> {
    const row = await this.prisma.team.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    return row ? toTeam(row) : null;
  }

  async list(organizationId: string): Promise<Team[]> {
    const rows = await this.prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return rows.map(toTeam);
  }

  async createWithAudit(
    data: CreateTeamData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Team> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.team.create({ data });
      const team = toTeam(row);

      await tx.organizationAuditLog.create({
        data: {
          organizationId: team.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "TeamCreated",
          targetType: TARGET_TYPE_TEAM,
          targetId: team.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(team),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return team;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateTeamData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Team> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.team.findUniqueOrThrow({ where: { id } });
      const before = toTeam(beforeRow);

      const afterRow = await tx.team.update({ where: { id }, data });
      const after = toTeam(afterRow);

      await tx.organizationAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "TeamUpdated",
          targetType: TARGET_TYPE_TEAM,
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

  async listAuditLog(teamId: string): Promise<OrganizationAuditRecord[]> {
    const rows = await this.prisma.organizationAuditLog.findMany({
      where: { targetType: TARGET_TYPE_TEAM, targetId: teamId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toOrganizationAuditRecord);
  }
}
