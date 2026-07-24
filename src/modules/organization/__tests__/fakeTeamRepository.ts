// ============================================================================
// src/modules/organization/__tests__/fakeTeamRepository.ts
//
// In-memory TeamRepository double for use-case unit tests — see
// fakeBranchRepository.ts's identical doc comment.
// ============================================================================

import type {
  CreateTeamData,
  TeamRepository,
  UpdateTeamData,
} from "../domain/repositories/TeamRepository";
import type { Team } from "../domain/entities/Team";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../domain/entities/OrganizationAuditRecord";

let nextId = 1;

function makeId(): string {
  return `00000000-0000-0000-0003-${String(nextId++).padStart(12, "0")}`;
}

export class FakeTeamRepository implements TeamRepository {
  teams = new Map<string, Team>();
  auditLog: OrganizationAuditRecord[] = [];

  async findById(id: string): Promise<Team | null> {
    return this.teams.get(id) ?? null;
  }

  async findByCode(organizationId: string, code: string): Promise<Team | null> {
    for (const team of this.teams.values()) {
      if (team.organizationId === organizationId && team.code === code) {
        return team;
      }
    }
    return null;
  }

  async list(organizationId: string): Promise<Team[]> {
    return [...this.teams.values()].filter((team) => team.organizationId === organizationId);
  }

  async createWithAudit(
    data: CreateTeamData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Team> {
    const now = new Date();
    const team: Team = {
      id: makeId(),
      organizationId: data.organizationId,
      branchId: data.branchId ?? null,
      name: data.name,
      code: data.code,
      isArchived: data.isArchived,
      createdAt: now,
      updatedAt: now,
    };
    this.teams.set(team.id, team);

    this.recordAudit({
      actor,
      action: "TeamCreated",
      targetId: team.id,
      correlationId,
      beforeState: null,
      afterState: { ...team },
    });

    return team;
  }

  async updateWithAudit(
    id: string,
    data: UpdateTeamData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Team> {
    const existing = this.teams.get(id);
    if (!existing) {
      throw new Error(`FakeTeamRepository: Team ${id} not found`);
    }

    const updated: Team = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.teams.set(id, updated);

    this.recordAudit({
      actor,
      action: "TeamUpdated",
      targetId: id,
      correlationId,
      beforeState: { ...existing },
      afterState: { ...updated },
    });

    return updated;
  }

  async listAuditLog(teamId: string): Promise<OrganizationAuditRecord[]> {
    return this.auditLog.filter((entry) => entry.targetId === teamId);
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
      targetType: "Team",
      targetId: input.targetId,
      correlationId: input.correlationId ?? null,
      beforeState: input.beforeState,
      afterState: input.afterState,
      recordHash: `fake-hash-${this.auditLog.length}`,
      previousRecordHash: previous?.recordHash ?? null,
    });
  }
}
