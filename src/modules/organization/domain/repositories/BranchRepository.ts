// ============================================================================
// src/modules/organization/domain/repositories/BranchRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaBranchRepository.
//
// `createWithAudit`/`updateWithAudit` persist the Branch write and its Audit
// Record as one atomic unit of work (platform-contracts.md §1's Outbox
// Pattern principle, applied at the audit-record level — see
// OrganizationRepository.ts's identical doc comment for the Organization
// aggregate).
// ============================================================================

import type { Branch } from "../entities/Branch";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../entities/OrganizationAuditRecord";

export interface CreateBranchData {
  organizationId: string;
  name: string;
  code: string;
  address?: string | null;
  timezone: string;
  isArchived: boolean;
}

export interface UpdateBranchData {
  name?: string;
  code?: string;
  address?: string | null;
  timezone?: string;
  isArchived?: boolean;
}

export interface BranchRepository {
  findById(id: string): Promise<Branch | null>;
  findByCode(organizationId: string, code: string): Promise<Branch | null>;
  list(organizationId: string): Promise<Branch[]>;

  /** Creates the Branch and its "created" Audit Record atomically. */
  createWithAudit(
    data: CreateBranchData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Branch>;

  /** Updates the Branch and its "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateBranchData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Branch>;

  /** Read-only Audit Trail access, scoped to one Branch (platform-contracts.md §4). */
  listAuditLog(branchId: string): Promise<OrganizationAuditRecord[]>;
}
