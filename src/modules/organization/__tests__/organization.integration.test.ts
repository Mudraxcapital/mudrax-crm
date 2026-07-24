import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance (see
// docker-compose.yml / .env) — verifies the full Create/Update/Read +
// Audit logging path through the actual PrismaOrganizationRepository and
// database triggers (hash-chain, append-only), not a fake. Skipped
// automatically wherever DATABASE_URL is not configured (e.g. a CI job
// that only runs the framework-free unit tests).
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Organization aggregate (integration)", () => {
  // Imported lazily, inside the guarded describe block, so this file never
  // throws "DATABASE_URL is not set" (src/infra/db/client.ts) when the
  // database is unavailable and the suite is skipped.
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createOrganization: (typeof import("@/modules/organization"))["createOrganization"];
  let updateOrganization: (typeof import("@/modules/organization"))["updateOrganization"];
  let getOrganization: (typeof import("@/modules/organization"))["getOrganization"];
  let listOrganizationAuditLog: (typeof import("@/modules/organization"))["listOrganizationAuditLog"];

  const testCode = `TEST_ORG_${Date.now()}`;
  let organizationId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const organizationModule = await import("@/modules/organization");
    prisma = dbClient.prisma;
    createOrganization = organizationModule.createOrganization;
    updateOrganization = organizationModule.updateOrganization;
    getOrganization = organizationModule.getOrganization;
    listOrganizationAuditLog = organizationModule.listOrganizationAuditLog;
  });

  afterAll(async () => {
    if (organizationId) {
      await prisma.organizationAuditLog.deleteMany({ where: { organizationId } });
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates an Organization and records a Create Audit Record", async () => {
    const created = await createOrganization({
      input: {
        name: "Integration Test Org",
        code: testCode,
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
      },
      actor: { actorType: "USER", actorId: null },
    });
    organizationId = created.id;

    expect(created.code).toBe(testCode);
    expect(created.status).toBe("ACTIVE");

    const row = await prisma.organization.findUnique({ where: { id: organizationId } });
    expect(row).not.toBeNull();
    expect(row?.code).toBe(testCode);

    const auditEntries = await listOrganizationAuditLog(organizationId);
    expect(auditEntries).toHaveLength(1);
    const [entry] = auditEntries;
    expect(entry?.action).toBe("OrganizationCreated");
    expect(entry?.beforeState).toBeNull();
    expect(entry?.afterState).toMatchObject({ code: testCode });
    // Tamper-evidence hash chain (platform-contracts.md §4): computed by the
    // database trigger, never by the application.
    expect(entry?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads the Organization back via getOrganization", async () => {
    const found = await getOrganization(organizationId);
    expect(found.id).toBe(organizationId);
    expect(found.code).toBe(testCode);
  });

  it("updates the Organization and records an Update Audit Record chained to the previous one", async () => {
    const beforeEntries = await listOrganizationAuditLog(organizationId);
    const createRecordHash = beforeEntries[0]?.recordHash;

    const updated = await updateOrganization({
      id: organizationId,
      input: { name: "Integration Test Org (renamed)", status: "SUSPENDED" },
      actor: { actorType: "USER", actorId: null },
    });

    expect(updated.name).toBe("Integration Test Org (renamed)");
    expect(updated.status).toBe("SUSPENDED");

    const afterEntries = await listOrganizationAuditLog(organizationId);
    expect(afterEntries).toHaveLength(2);

    const updateEntry = afterEntries.find((entry) => entry.action === "OrganizationUpdated");
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.beforeState).toMatchObject({
      name: "Integration Test Org",
      status: "ACTIVE",
    });
    expect(updateEntry?.afterState).toMatchObject({
      name: "Integration Test Org (renamed)",
      status: "SUSPENDED",
    });
    // Hash-chain continuity: this record's previousRecordHash is the prior
    // record's recordHash (platform-contracts.md §4 tamper evidence).
    expect(updateEntry?.previousRecordHash).toBe(createRecordHash);
  });

  // NOTE: append-only enforcement (REVOKE UPDATE, DELETE ... FROM
  // application_role, migration 20260724184500) is a database-role-level
  // guarantee, not exercised here — it only takes effect once `GRANT
  // application_role TO <env-specific login role>` has been run for a given
  // environment (see prisma/migrations/README.md's operational
  // prerequisite #1), which this test suite cannot assume has happened for
  // the role in DATABASE_URL. Verified instead as a static fact about the
  // migration's SQL — see prisma/migrations/README.md's migration table.
});
