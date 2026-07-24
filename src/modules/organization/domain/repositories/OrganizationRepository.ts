// ============================================================================
// src/modules/organization/domain/repositories/OrganizationRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaOrganizationRepository.
//
// `createWithAudit`/`updateWithAudit` persist the Organization write and its
// Audit Record as one atomic unit of work (platform-contracts.md §1's
// Outbox Pattern principle — "an aggregate's own state change and the
// recording of the event/fact describing that change happen as one atomic
// unit" — applied here at the audit-record level since this task does not
// build the full Event Platform/Outbox relay).
// ============================================================================

import type { Organization, OrganizationStatus } from "../entities/Organization";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../entities/OrganizationAuditRecord";

export interface CreateOrganizationData {
  name: string;
  code: string;
  status: OrganizationStatus;
  timezone: string;
}

export interface UpdateOrganizationData {
  name?: string;
  code?: string;
  status?: OrganizationStatus;
  timezone?: string;
}

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findByCode(code: string): Promise<Organization | null>;
  list(): Promise<Organization[]>;

  /** Creates the Organization and its "created" Audit Record atomically. */
  createWithAudit(
    data: CreateOrganizationData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Organization>;

  /** Updates the Organization and its "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateOrganizationData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Organization>;

  /** Read-only Audit Trail access (platform-contracts.md §4: "even Admin/System gets read-only access"). */
  listAuditLog(organizationId: string): Promise<OrganizationAuditRecord[]>;
}
