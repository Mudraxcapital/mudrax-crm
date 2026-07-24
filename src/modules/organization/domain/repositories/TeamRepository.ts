// ============================================================================
// src/modules/organization/domain/repositories/TeamRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaTeamRepository.
// ============================================================================

import type { Team } from "../entities/Team";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../entities/OrganizationAuditRecord";

export interface CreateTeamData {
  organizationId: string;
  branchId?: string | null;
  name: string;
  code: string;
  isArchived: boolean;
}

export interface UpdateTeamData {
  branchId?: string | null;
  name?: string;
  code?: string;
  isArchived?: boolean;
}

export interface TeamRepository {
  findById(id: string): Promise<Team | null>;
  findByCode(organizationId: string, code: string): Promise<Team | null>;
  list(organizationId: string): Promise<Team[]>;

  /** Creates the Team and its "created" Audit Record atomically. */
  createWithAudit(
    data: CreateTeamData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Team>;

  /** Updates the Team and its "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateTeamData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Team>;

  /** Read-only Audit Trail access, scoped to one Team (platform-contracts.md §4). */
  listAuditLog(teamId: string): Promise<OrganizationAuditRecord[]>;
}
