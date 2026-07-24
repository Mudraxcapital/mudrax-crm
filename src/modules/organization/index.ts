// Public API of the `organization` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaOrganizationRepository } from "./infrastructure/repositories/PrismaOrganizationRepository";
import { makeCreateOrganization } from "./application/use-cases/createOrganization";
import { makeUpdateOrganization } from "./application/use-cases/updateOrganization";
import {
  makeGetOrganization,
  makeListOrganizations,
} from "./application/use-cases/getOrganization";
import { makeListOrganizationAuditLog } from "./application/use-cases/listOrganizationAuditLog";

export type { Organization, OrganizationStatus } from "./domain/entities/Organization";
export { ORGANIZATION_STATUSES } from "./domain/entities/Organization";
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
export type { OrganizationDto } from "./application/dto/OrganizationDto";
export {
  createOrganizationSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from "./application/validators/organizationSchemas";
export type { CreateOrganizationCommand } from "./application/use-cases/createOrganization";
export type { UpdateOrganizationCommand } from "./application/use-cases/updateOrganization";

const organizationRepository = new PrismaOrganizationRepository(prisma);

export const createOrganization = makeCreateOrganization(organizationRepository);
export const updateOrganization = makeUpdateOrganization(organizationRepository);
export const getOrganization = makeGetOrganization(organizationRepository);
export const listOrganizations = makeListOrganizations(organizationRepository);
export const listOrganizationAuditLog = makeListOrganizationAuditLog(organizationRepository);
