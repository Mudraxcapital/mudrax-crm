// ============================================================================
// src/modules/organization/application/dto/OrganizationDto.ts
//
// What the Organization aggregate's use-cases return to the presentation
// layer (Server Actions, Route Handlers, Server Components) — a plain,
// serializable shape (dates as ISO strings) safe to cross the
// server/client boundary and to JSON-encode in an API response.
// ============================================================================

import type { Organization } from "../../domain/entities/Organization";

export interface OrganizationDto {
  id: string;
  name: string;
  code: string;
  status: Organization["status"];
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export function toOrganizationDto(organization: Organization): OrganizationDto {
  return {
    id: organization.id,
    name: organization.name,
    code: organization.code,
    status: organization.status,
    timezone: organization.timezone,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}
