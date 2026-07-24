import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance — see
// organization.integration.test.ts's identical guard/rationale.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Department aggregate (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createDepartment: (typeof import("@/modules/organization"))["createDepartment"];
  let updateDepartment: (typeof import("@/modules/organization"))["updateDepartment"];
  let getDepartment: (typeof import("@/modules/organization"))["getDepartment"];
  let listDepartmentAuditLog: (typeof import("@/modules/organization"))["listDepartmentAuditLog"];

  const testCode = `TEST_DEPT_${Date.now()}`;
  let organizationId: string;
  let departmentId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const organizationModule = await import("@/modules/organization");
    prisma = dbClient.prisma;
    createDepartment = organizationModule.createDepartment;
    updateDepartment = organizationModule.updateDepartment;
    getDepartment = organizationModule.getDepartment;
    listDepartmentAuditLog = organizationModule.listDepartmentAuditLog;

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
    if (departmentId) {
      await prisma.organizationAuditLog.deleteMany({
        where: { targetType: "Department", targetId: departmentId },
      });
      await prisma.department.delete({ where: { id: departmentId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates a Department and records a Create Audit Record", async () => {
    const created = await createDepartment({
      organizationId,
      input: { name: "Integration Test Dept", code: testCode, isArchived: false },
      actor: { actorType: "USER", actorId: null },
    });
    departmentId = created.id;

    expect(created.code).toBe(testCode);

    const row = await prisma.department.findUnique({ where: { id: departmentId } });
    expect(row).not.toBeNull();

    const auditEntries = await listDepartmentAuditLog(departmentId);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("DepartmentCreated");
    expect(auditEntries[0]?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads the Department back via getDepartment", async () => {
    const found = await getDepartment(departmentId);
    expect(found.id).toBe(departmentId);
    expect(found.code).toBe(testCode);
  });

  it("updates the Department and records a chained Update Audit Record", async () => {
    const beforeEntries = await listDepartmentAuditLog(departmentId);
    const createRecordHash = beforeEntries[0]?.recordHash;

    const updated = await updateDepartment({
      id: departmentId,
      input: { name: "Integration Test Dept (renamed)", isArchived: true },
      actor: { actorType: "USER", actorId: null },
    });

    expect(updated.name).toBe("Integration Test Dept (renamed)");
    expect(updated.isArchived).toBe(true);

    const afterEntries = await listDepartmentAuditLog(departmentId);
    expect(afterEntries).toHaveLength(2);
    const updateEntry = afterEntries.find((entry) => entry.action === "DepartmentUpdated");
    expect(updateEntry?.previousRecordHash).toBe(createRecordHash);
  });
});
