// Public API of the `organization` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaOrganizationRepository } from "./infrastructure/repositories/PrismaOrganizationRepository";
import { PrismaBranchRepository } from "./infrastructure/repositories/PrismaBranchRepository";
import { PrismaDepartmentRepository } from "./infrastructure/repositories/PrismaDepartmentRepository";
import { PrismaTeamRepository } from "./infrastructure/repositories/PrismaTeamRepository";
import { makeCreateOrganization } from "./application/use-cases/createOrganization";
import { makeUpdateOrganization } from "./application/use-cases/updateOrganization";
import {
  makeGetOrganization,
  makeListOrganizations,
} from "./application/use-cases/getOrganization";
import { makeListOrganizationAuditLog } from "./application/use-cases/listOrganizationAuditLog";
import { makeCreateBranch } from "./application/use-cases/createBranch";
import { makeUpdateBranch } from "./application/use-cases/updateBranch";
import { makeGetBranch, makeListBranches } from "./application/use-cases/getBranch";
import { makeListBranchAuditLog } from "./application/use-cases/listBranchAuditLog";
import { makeCreateDepartment } from "./application/use-cases/createDepartment";
import { makeUpdateDepartment } from "./application/use-cases/updateDepartment";
import { makeGetDepartment, makeListDepartments } from "./application/use-cases/getDepartment";
import { makeListDepartmentAuditLog } from "./application/use-cases/listDepartmentAuditLog";
import { makeCreateTeam } from "./application/use-cases/createTeam";
import { makeUpdateTeam } from "./application/use-cases/updateTeam";
import { makeGetTeam, makeListTeams } from "./application/use-cases/getTeam";
import { makeListTeamAuditLog } from "./application/use-cases/listTeamAuditLog";

export type { Organization, OrganizationStatus } from "./domain/entities/Organization";
export { ORGANIZATION_STATUSES } from "./domain/entities/Organization";
export type { Branch } from "./domain/entities/Branch";
export type { Department } from "./domain/entities/Department";
export type { Team } from "./domain/entities/Team";
export type {
  OrganizationActorType,
  OrganizationAuditActor,
  OrganizationAuditRecord,
} from "./domain/entities/OrganizationAuditRecord";
export { ORGANIZATION_ACTOR_TYPES } from "./domain/entities/OrganizationAuditRecord";
export {
  OrganizationNotFoundError,
  DuplicateOrganizationCodeError,
} from "./domain/errors/OrganizationErrors";
export { BranchNotFoundError, DuplicateBranchCodeError } from "./domain/errors/BranchErrors";
export {
  DepartmentNotFoundError,
  DuplicateDepartmentCodeError,
} from "./domain/errors/DepartmentErrors";
export {
  TeamNotFoundError,
  DuplicateTeamCodeError,
  InvalidBranchReferenceError,
} from "./domain/errors/TeamErrors";
export type { OrganizationDto } from "./application/dto/OrganizationDto";
export type { BranchDto } from "./application/dto/BranchDto";
export type { DepartmentDto } from "./application/dto/DepartmentDto";
export type { TeamDto } from "./application/dto/TeamDto";
export {
  createOrganizationSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from "./application/validators/organizationSchemas";
export {
  createBranchSchema,
  updateBranchSchema,
  type CreateBranchInput,
  type UpdateBranchInput,
} from "./application/validators/branchSchemas";
export {
  createDepartmentSchema,
  updateDepartmentSchema,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from "./application/validators/departmentSchemas";
export {
  createTeamSchema,
  updateTeamSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
} from "./application/validators/teamSchemas";
export type { CreateOrganizationCommand } from "./application/use-cases/createOrganization";
export type { UpdateOrganizationCommand } from "./application/use-cases/updateOrganization";
export type { CreateBranchCommand } from "./application/use-cases/createBranch";
export type { UpdateBranchCommand } from "./application/use-cases/updateBranch";
export type { CreateDepartmentCommand } from "./application/use-cases/createDepartment";
export type { UpdateDepartmentCommand } from "./application/use-cases/updateDepartment";
export type { CreateTeamCommand } from "./application/use-cases/createTeam";
export type { UpdateTeamCommand } from "./application/use-cases/updateTeam";

const organizationRepository = new PrismaOrganizationRepository(prisma);
const branchRepository = new PrismaBranchRepository(prisma);
const departmentRepository = new PrismaDepartmentRepository(prisma);
const teamRepository = new PrismaTeamRepository(prisma);

export const createOrganization = makeCreateOrganization(organizationRepository);
export const updateOrganization = makeUpdateOrganization(organizationRepository);
export const getOrganization = makeGetOrganization(organizationRepository);
export const listOrganizations = makeListOrganizations(organizationRepository);
export const listOrganizationAuditLog = makeListOrganizationAuditLog(organizationRepository);

export const createBranch = makeCreateBranch(branchRepository);
export const updateBranch = makeUpdateBranch(branchRepository);
export const getBranch = makeGetBranch(branchRepository);
export const listBranches = makeListBranches(branchRepository);
export const listBranchAuditLog = makeListBranchAuditLog(branchRepository);

export const createDepartment = makeCreateDepartment(departmentRepository);
export const updateDepartment = makeUpdateDepartment(departmentRepository);
export const getDepartment = makeGetDepartment(departmentRepository);
export const listDepartments = makeListDepartments(departmentRepository);
export const listDepartmentAuditLog = makeListDepartmentAuditLog(departmentRepository);

export const createTeam = makeCreateTeam(teamRepository, branchRepository);
export const updateTeam = makeUpdateTeam(teamRepository, branchRepository);
export const getTeam = makeGetTeam(teamRepository);
export const listTeams = makeListTeams(teamRepository);
export const listTeamAuditLog = makeListTeamAuditLog(teamRepository);
