import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance — verifies
// the full Create/Update/Read + Audit logging path through the actual
// PrismaBranchRepository and database triggers (hash-chain, append-only),
// not a fake. Skipped automatically wherever DATABASE_URL is not
// configured. See organization.integration.test.ts's identical guard.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Branch aggregate (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createBranch: (typeof import("@/modules/organization"))["createBranch"];
  let updateBranch: (typeof import("@/modules/organization"))["updateBranch"];
  let getBranch: (typeof import("@/modules/organization"))["getBranch"];
  let listBranchAuditLog: (typeof import("@/modules/organization"))["listBranchAuditLog"];

  const testCode = `TEST_BR_${Date.now()}`;
  let organizationId: string;
  let branchId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const organizationModule = await import("@/modules/organization");
    prisma = dbClient.prisma;
    createBranch = organizationModule.createBranch;
    updateBranch = organizationModule.updateBranch;
    getBranch = organizationModule.getBranch;
    listBranchAuditLog = organizationModule.listBranchAuditLog;

    // Reuse the seeded "MUDRAX" Organization if present; otherwise create a
    // disposable one so this suite never depends on seed ordering.
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
  });

  afterAll(async () => {
    if (branchId) {
      await prisma.organizationAuditLog.deleteMany({
        where: { targetType: "Branch", targetId: branchId },
      });
      await prisma.branch.delete({ where: { id: branchId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates a Branch and records a Create Audit Record", async () => {
    const created = await createBranch({
      organizationId,
      input: {
        name: "Integration Test Branch",
        code: testCode,
        timezone: "Asia/Kolkata",
        isArchived: false,
      },
      actor: { actorType: "USER", actorId: null },
    });
    branchId = created.id;

    expect(created.code).toBe(testCode);
    expect(created.organizationId).toBe(organizationId);

    const row = await prisma.branch.findUnique({ where: { id: branchId } });
    expect(row).not.toBeNull();
    expect(row?.code).toBe(testCode);

    const auditEntries = await listBranchAuditLog(branchId);
    expect(auditEntries).toHaveLength(1);
    const [entry] = auditEntries;
    expect(entry?.action).toBe("BranchCreated");
    expect(entry?.targetType).toBe("Branch");
    expect(entry?.beforeState).toBeNull();
    expect(entry?.afterState).toMatchObject({ code: testCode });
    // Tamper-evidence hash chain (platform-contracts.md §4): computed by the
    // database trigger, never by the application.
    expect(entry?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads the Branch back via getBranch", async () => {
    const found = await getBranch(branchId);
    expect(found.id).toBe(branchId);
    expect(found.code).toBe(testCode);
  });

  it("updates the Branch and records an Update Audit Record chained to the previous one", async () => {
    const beforeEntries = await listBranchAuditLog(branchId);
    const createRecordHash = beforeEntries[0]?.recordHash;

    const updated = await updateBranch({
      id: branchId,
      input: { name: "Integration Test Branch (renamed)", isArchived: true },
      actor: { actorType: "USER", actorId: null },
    });

    expect(updated.name).toBe("Integration Test Branch (renamed)");
    expect(updated.isArchived).toBe(true);

    const afterEntries = await listBranchAuditLog(branchId);
    expect(afterEntries).toHaveLength(2);

    const updateEntry = afterEntries.find((entry) => entry.action === "BranchUpdated");
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.beforeState).toMatchObject({ name: "Integration Test Branch" });
    expect(updateEntry?.afterState).toMatchObject({ name: "Integration Test Branch (renamed)" });
    expect(updateEntry?.previousRecordHash).toBe(createRecordHash);
  });
});
