import { describe, expect, it } from "vitest";
import { makeCreateBank } from "../application/use-cases/createBank";
import { makeUpdateBank } from "../application/use-cases/updateBank";
import type { BankRepository } from "../domain/repositories/BankRepository";
import type { Bank } from "../domain/entities/Bank";
import type { BanksAuditRecord } from "../domain/entities/BanksAuditRecord";
import { DuplicateBankCodeError } from "../domain/errors/BankErrors";

function fakeRepo(seed: Bank[] = []): BankRepository {
  const banks = [...seed];
  const audit: BanksAuditRecord[] = [];
  return {
    async findById(id) {
      return banks.find((b) => b.id === id) ?? null;
    },
    async findByCode(organizationId, code) {
      return banks.find((b) => b.organizationId === organizationId && b.code === code) ?? null;
    },
    async findByName(organizationId, name) {
      return banks.find((b) => b.organizationId === organizationId && b.name === name) ?? null;
    },
    async list(organizationId) {
      return banks.filter((b) => b.organizationId === organizationId);
    },
    async createWithAudit(data) {
      const bank: Bank = {
        id: crypto.randomUUID(),
        organizationId: data.organizationId,
        name: data.name,
        code: data.code,
        status: data.status ?? "ONBOARDED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      banks.push(bank);
      return bank;
    },
    async updateWithAudit(id, data) {
      const idx = banks.findIndex((b) => b.id === id);
      const current = banks[idx]!;
      const updated = { ...current, ...data, updatedAt: new Date() };
      banks[idx] = updated;
      return updated;
    },
    async listAuditLog() {
      return audit;
    },
    async findBranchById() {
      return null;
    },
    async findBranchByCode() {
      return null;
    },
    async listBranches() {
      return [];
    },
    async createBranchWithAudit() {
      throw new Error("not implemented");
    },
    async updateBranchWithAudit() {
      throw new Error("not implemented");
    },
    async findPolicyById() {
      return null;
    },
    async listPolicies() {
      return [];
    },
    async findEffectivePolicy() {
      return null;
    },
    async createPolicyWithAudit() {
      throw new Error("not implemented");
    },
    async publishPolicyWithAudit() {
      throw new Error("not implemented");
    },
  };
}

describe("banks use cases", () => {
  const org = crypto.randomUUID();
  const actor = { actorType: "USER" as const, actorId: crypto.randomUUID() };

  it("creates a bank", async () => {
    const create = makeCreateBank(fakeRepo());
    const bank = await create({
      organizationId: org,
      input: { name: "Test Bank", code: "TB" },
      actor,
    });
    expect(bank.code).toBe("TB");
    expect(bank.status).toBe("ONBOARDED");
  });

  it("rejects duplicate code", async () => {
    const repo = fakeRepo([
      {
        id: crypto.randomUUID(),
        organizationId: org,
        name: "Existing",
        code: "TB",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const create = makeCreateBank(repo);
    await expect(
      create({ organizationId: org, input: { name: "Other", code: "TB" }, actor }),
    ).rejects.toBeInstanceOf(DuplicateBankCodeError);
  });

  it("updates bank status", async () => {
    const id = crypto.randomUUID();
    const repo = fakeRepo([
      {
        id,
        organizationId: org,
        name: "Existing",
        code: "TB",
        status: "ONBOARDED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const update = makeUpdateBank(repo);
    const bank = await update({
      bankId: id,
      organizationId: org,
      input: { status: "ACTIVE" },
      actor,
    });
    expect(bank.status).toBe("ACTIVE");
  });
});
