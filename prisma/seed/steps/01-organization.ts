// ============================================================================
// prisma/seed/steps/01-organization.ts
//
// Seeds requirement #2: Organization, Branches, Departments, Teams.
// (Region is an additive, low-risk realism touch — Branch.regionId is
// already an optional column in the accepted schema, so grouping Branches
// under a Region here does not add any new shape, only data.)
//
// Every row upserts on the real unique constraint already declared in
// prisma/models/organization.prisma (organizationId + code), so re-running
// this seed updates in place instead of duplicating rows.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

export interface OrganizationSeedResult {
  organizationId: string;
  regionIds: Record<string, string>;
  branchIds: Record<string, string>;
  departmentIds: Record<string, string>;
  teamIds: Record<string, string>;
}

const REGIONS = [
  { code: "WEST", name: "West Zone" },
  { code: "NORTH", name: "North Zone" },
];

const BRANCHES = [
  {
    code: "MUM-HO",
    name: "Mumbai Head Office",
    region: "WEST",
    address: "Bandra Kurla Complex, Mumbai, Maharashtra 400051",
  },
  {
    code: "PUN-01",
    name: "Pune Branch",
    region: "WEST",
    address: "Shivaji Nagar, Pune, Maharashtra 411005",
  },
  {
    code: "DEL-01",
    name: "Delhi NCR Branch",
    region: "NORTH",
    address: "Connaught Place, New Delhi, Delhi 110001",
  },
];

const DEPARTMENTS = [
  { code: "SALES", name: "Sales" },
  { code: "OPS", name: "Operations" },
  { code: "RECOVERY", name: "Recovery" },
  { code: "HR", name: "Human Resources" },
  { code: "COMPLIANCE", name: "Compliance & Risk" },
];

const TEAMS = [
  { code: "MUM-SALES", name: "Mumbai Sales Team", branch: "MUM-HO" },
  { code: "MUM-RECOVERY", name: "Mumbai Recovery Team", branch: "MUM-HO" },
  { code: "PUN-SALES", name: "Pune Sales Team", branch: "PUN-01" },
  { code: "DEL-SALES", name: "Delhi Sales Team", branch: "DEL-01" },
];

export async function seedOrganization(prisma: PrismaClient): Promise<OrganizationSeedResult> {
  section("1. Organization, Regions, Branches, Departments, Teams");

  explain(
    "Organization 'Mudrax Capitals' (code MUDRAX) — the single canonical company scope every other bounded context's organizationId column points at (platform-contracts.md §5).",
  );
  const organization = await prisma.organization.upsert({
    where: { code: "MUDRAX" },
    update: {},
    create: { name: "Mudrax Capitals", code: "MUDRAX", status: "ACTIVE", timezone: "Asia/Kolkata" },
  });

  explain("Two Regions (West, North) grouping Branches for managerial/reporting rollups.");
  const regionIds: Record<string, string> = {};
  for (const region of REGIONS) {
    const row = await prisma.region.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: region.code } },
      update: { name: region.name },
      create: { organizationId: organization.id, code: region.code, name: region.name },
    });
    regionIds[region.code] = row.id;
  }

  explain("Three Branches — physical/operational offices, each scoped to a Region.");
  const branchIds: Record<string, string> = {};
  for (const branch of BRANCHES) {
    const row = await prisma.branch.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: branch.code } },
      update: { name: branch.name, address: branch.address, regionId: regionIds[branch.region] },
      create: {
        organizationId: organization.id,
        code: branch.code,
        name: branch.name,
        address: branch.address,
        regionId: regionIds[branch.region],
      },
    });
    branchIds[branch.code] = row.id;
  }

  explain(
    "Five Departments — the admin-configurable functional-grouping catalog (organization.md: 'never a hardcoded enum').",
  );
  const departmentIds: Record<string, string> = {};
  for (const department of DEPARTMENTS) {
    const row = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: department.code } },
      update: { name: department.name },
      create: { organizationId: organization.id, code: department.code, name: department.name },
    });
    departmentIds[department.code] = row.id;
  }

  explain(
    "Four Teams — operational groupings of Users for supervision/allocation, each scoped to a Branch.",
  );
  const teamIds: Record<string, string> = {};
  for (const team of TEAMS) {
    const row = await prisma.team.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: team.code } },
      update: { name: team.name, branchId: branchIds[team.branch] },
      create: {
        organizationId: organization.id,
        code: team.code,
        name: team.name,
        branchId: branchIds[team.branch],
      },
    });
    teamIds[team.code] = row.id;
  }

  summary("Organization", 1);
  summary("Regions", REGIONS.length);
  summary("Branches", BRANCHES.length);
  summary("Departments", DEPARTMENTS.length);
  summary("Teams", TEAMS.length);

  return { organizationId: organization.id, regionIds, branchIds, departmentIds, teamIds };
}
