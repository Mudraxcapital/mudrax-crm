import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance — see
// organization.integration.test.ts's identical guard/rationale. Also
// exercises the cross-aggregate `branchId` reference check against a real
// Branch row.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Team aggregate (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createBranch: (typeof import("@/modules/organization"))["createBranch"];
  let createTeam: (typeof import("@/modules/organization"))["createTeam"];
  let updateTeam: (typeof import("@/modules/organization"))["updateTeam"];
  let getTeam: (typeof import("@/modules/organization"))["getTeam"];
  let listTeamAuditLog: (typeof import("@/modules/organization"))["listTeamAuditLog"];
  let InvalidBranchReferenceError: (typeof import("@/modules/organization"))["InvalidBranchReferenceError"];

  const testCode = `TEST_TEAM_${Date.now()}`;
  const branchCode = `TEST_TEAM_BR_${Date.now()}`;
  let organizationId: string;
  let branchId: string;
  let teamId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const organizationModule = await import("@/modules/organization");
    prisma = dbClient.prisma;
    createBranch = organizationModule.createBranch;
    createTeam = organizationModule.createTeam;
    updateTeam = organizationModule.updateTeam;
    getTeam = organizationModule.getTeam;
    listTeamAuditLog = organizationModule.listTeamAuditLog;
    InvalidBranchReferenceError = organizationModule.InvalidBranchReferenceError;

    const organization = await prisma.organization.upsert({
      where: { code: "MUDRAX" },
      update: {},
      create: {
        name: "Mudrax Capitals",
        code: "MUDRAX",
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
      },
    });
    organizationId = organization.id;

    const branch = await createBranch({
      organizationId,
      input: {
        name: "Integration Test Branch For Team",
        code: branchCode,
        timezone: "Asia/Kolkata",
        isArchived: false,
      },
      actor: { actorType: "USER", actorId: null },
    });
    branchId = branch.id;
  });

  afterAll(async () => {
    if (teamId) {
      await prisma.organizationAuditLog.deleteMany({
        where: { targetType: "Team", targetId: teamId },
      });
      await prisma.team.delete({ where: { id: teamId } }).catch(() => undefined);
    }
    if (branchId) {
      await prisma.organizationAuditLog.deleteMany({
        where: { targetType: "Branch", targetId: branchId },
      });
      await prisma.branch.delete({ where: { id: branchId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates a Team scoped to a real Branch and records a Create Audit Record", async () => {
    const created = await createTeam({
      organizationId,
      input: { name: "Integration Test Team", code: testCode, branchId, isArchived: false },
      actor: { actorType: "USER", actorId: null },
    });
    teamId = created.id;

    expect(created.code).toBe(testCode);
    expect(created.branchId).toBe(branchId);

    const auditEntries = await listTeamAuditLog(teamId);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("TeamCreated");
    expect(auditEntries[0]?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads the Team back via getTeam", async () => {
    const found = await getTeam(teamId);
    expect(found.id).toBe(teamId);
    expect(found.branchId).toBe(branchId);
  });

  it("updates the Team and records a chained Update Audit Record", async () => {
    const beforeEntries = await listTeamAuditLog(teamId);
    const createRecordHash = beforeEntries[0]?.recordHash;

    const updated = await updateTeam({
      id: teamId,
      input: { name: "Integration Test Team (renamed)", branchId: null },
      actor: { actorType: "USER", actorId: null },
    });

    expect(updated.name).toBe("Integration Test Team (renamed)");
    expect(updated.branchId).toBeNull();

    const afterEntries = await listTeamAuditLog(teamId);
    expect(afterEntries).toHaveLength(2);
    const updateEntry = afterEntries.find((entry) => entry.action === "TeamUpdated");
    expect(updateEntry?.previousRecordHash).toBe(createRecordHash);
  });

  it("rejects creating a Team with a non-existent branchId", async () => {
    await expect(
      createTeam({
        organizationId,
        input: {
          name: "Bad Team",
          code: `${testCode}_BAD`,
          branchId: "11111111-1111-1111-1111-111111111111",
          isArchived: false,
        },
        actor: { actorType: "USER", actorId: null },
      }),
    ).rejects.toBeInstanceOf(InvalidBranchReferenceError);
  });
});
