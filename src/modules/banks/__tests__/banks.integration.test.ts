import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Banks module (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createBank: (typeof import("@/modules/banks"))["createBank"];
  let updateBank: (typeof import("@/modules/banks"))["updateBank"];
  let createBankBranch: (typeof import("@/modules/banks"))["createBankBranch"];
  let createCommissionPolicy: (typeof import("@/modules/banks"))["createCommissionPolicy"];
  let publishCommissionPolicy: (typeof import("@/modules/banks"))["publishCommissionPolicy"];
  let listBanks: (typeof import("@/modules/banks"))["listBanks"];

  let organizationId: string;
  let userId: string;
  let bankId: string;

  beforeAll(async () => {
    const db = await import("@/infra/db/client");
    const banks = await import("@/modules/banks");
    prisma = db.prisma;
    createBank = banks.createBank;
    updateBank = banks.updateBank;
    createBankBranch = banks.createBankBranch;
    createCommissionPolicy = banks.createCommissionPolicy;
    publishCommissionPolicy = banks.publishCommissionPolicy;
    listBanks = banks.listBanks;

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

    const suffix = Date.now().toString().slice(-6);
    const user = await prisma.user.create({
      data: {
        organizationId,
        employeeCode: `INTBNK${suffix}`,
        fullName: "Integration Banks User",
        email: `int-banks-${suffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (bankId) {
      await prisma.commissionPolicyVersion.deleteMany({ where: { bankId } }).catch(() => undefined);
      await prisma.bankBranch.deleteMany({ where: { bankId } }).catch(() => undefined);
      await prisma.bankAuditLog.deleteMany({ where: { targetId: bankId } }).catch(() => undefined);
      await prisma.bank.delete({ where: { id: bankId } }).catch(() => undefined);
    }
  });

  it("creates, lists, updates bank and publishes commission policy", async () => {
    const actor = { actorType: "USER" as const, actorId: userId };
    const suffix = Date.now().toString().slice(-4);
    const bank = await createBank({
      organizationId,
      input: { name: `Integration Bank ${suffix}`, code: `IB${suffix}` },
      actor,
    });
    bankId = bank.id;

    const listed = await listBanks(organizationId);
    expect(listed.some((b) => b.id === bankId)).toBe(true);

    const updated = await updateBank({
      bankId,
      organizationId,
      input: { status: "ACTIVE" },
      actor,
    });
    expect(updated.status).toBe("ACTIVE");

    const branch = await createBankBranch({
      bankId,
      organizationId,
      input: { name: "Main Branch", code: `BR${suffix}` },
      actor,
    });
    expect(branch.status).toBe("ADDED");

    const policy = await createCommissionPolicy({
      bankId,
      organizationId,
      input: { ratePercent: 1.5, clawbackWindowDays: 90 },
      actor,
    });
    expect(policy.status).toBe("DRAFTED");

    const published = await publishCommissionPolicy({
      policyId: policy.id,
      organizationId,
      actor,
    });
    expect(published.status).toBe("EFFECTIVE");
  });
});
