import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance — see
// organization's team.integration.test.ts's identical guard/rationale.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Customer aggregate (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createCustomer: (typeof import("@/modules/customers"))["createCustomer"];
  let updateCustomer: (typeof import("@/modules/customers"))["updateCustomer"];
  let getCustomer: (typeof import("@/modules/customers"))["getCustomer"];
  let listCustomerAuditLog: (typeof import("@/modules/customers"))["listCustomerAuditLog"];
  let DuplicateCustomerIdentifierError: (typeof import("@/modules/customers"))["DuplicateCustomerIdentifierError"];

  let organizationId: string;
  let customerId: string;
  const uniquePan = `TEST${Date.now().toString().slice(-6)}A`;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const customersModule = await import("@/modules/customers");
    prisma = dbClient.prisma;
    createCustomer = customersModule.createCustomer;
    updateCustomer = customersModule.updateCustomer;
    getCustomer = customersModule.getCustomer;
    listCustomerAuditLog = customersModule.listCustomerAuditLog;
    DuplicateCustomerIdentifierError = customersModule.DuplicateCustomerIdentifierError;

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
    if (customerId) {
      await prisma.customerAuditLog.deleteMany({
        where: { targetType: "Customer", targetId: customerId },
      });
      await prisma.customerIdentifier.deleteMany({ where: { customerId } });
      await prisma.customer.delete({ where: { id: customerId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates a Customer with a PAN identifier and records a Create Audit Record", async () => {
    const created = await createCustomer({
      organizationId,
      input: {
        fullName: "Integration Test Customer",
        identifiers: [{ type: "PAN", value: uniquePan }],
      },
      actor: { actorType: "USER", actorId: null },
    });
    customerId = created.id;

    expect(created.identityConfidence).toBe("DECLARED");

    const auditEntries = await listCustomerAuditLog(customerId);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("CustomerCreated");
    expect(auditEntries[0]?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads the Customer back via getCustomer", async () => {
    const found = await getCustomer(customerId);
    expect(found.id).toBe(customerId);
    expect(found.identifiers).toHaveLength(1);
  });

  it("updates the Customer and records a chained Update Audit Record", async () => {
    const beforeEntries = await listCustomerAuditLog(customerId);
    const createRecordHash = beforeEntries[0]?.recordHash;

    const updated = await updateCustomer({
      id: customerId,
      input: { fullName: "Integration Test Customer (renamed)" },
      actor: { actorType: "USER", actorId: null },
    });

    expect(updated.fullName).toBe("Integration Test Customer (renamed)");

    const afterEntries = await listCustomerAuditLog(customerId);
    expect(afterEntries).toHaveLength(2);
    const updateEntry = afterEntries.find((entry) => entry.action === "CustomerUpdated");
    expect(updateEntry?.previousRecordHash).toBe(createRecordHash);
  });

  it("rejects creating a second Customer with the same PAN", async () => {
    await expect(
      createCustomer({
        organizationId,
        input: {
          fullName: "Duplicate Attempt",
          identifiers: [{ type: "PAN", value: uniquePan }],
        },
        actor: { actorType: "USER", actorId: null },
      }),
    ).rejects.toBeInstanceOf(DuplicateCustomerIdentifierError);
  });
});
