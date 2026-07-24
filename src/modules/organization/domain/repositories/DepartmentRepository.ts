// ============================================================================
// src/modules/organization/domain/repositories/DepartmentRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaDepartmentRepository.
// ============================================================================

import type { Department } from "../entities/Department";
import type {
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "../entities/OrganizationAuditRecord";

export interface CreateDepartmentData {
  organizationId: string;
  name: string;
  code: string;
  isArchived: boolean;
}

export interface UpdateDepartmentData {
  name?: string;
  code?: string;
  isArchived?: boolean;
}

export interface DepartmentRepository {
  findById(id: string): Promise<Department | null>;
  findByCode(organizationId: string, code: string): Promise<Department | null>;
  list(organizationId: string): Promise<Department[]>;

  /** Creates the Department and its "created" Audit Record atomically. */
  createWithAudit(
    data: CreateDepartmentData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Department>;

  /** Updates the Department and its "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateDepartmentData,
    actor: OrganizationAuditActor,
    correlationId?: string | null,
  ): Promise<Department>;

  /** Read-only Audit Trail access, scoped to one Department (platform-contracts.md §4). */
  listAuditLog(departmentId: string): Promise<OrganizationAuditRecord[]>;
}
