import { describe, expect, it } from "vitest";
import { formatAccountNumber } from "../domain/entities/LoanAccount";
import { makeOpenLoanAccount } from "../application/use-cases/openLoanAccount";
import type { LoanAccountRepository } from "../domain/repositories/LoanAccountRepository";
import type { LoanAccount, LoanStatus } from "../domain/entities/LoanAccount";
import { LoanAccountAlreadyExistsError } from "../domain/errors/LoanAccountErrors";

function fakeRepo(): LoanAccountRepository {
  const accounts: LoanAccount[] = [];
  const active: LoanStatus = {
    id: crypto.randomUUID(),
    organizationId: "org",
    name: "Active",
    isTerminal: false,
    sortOrder: 1,
    isActive: true,
  };
  return {
    async findById(id) {
      return accounts.find((a) => a.id === id) ?? null;
    },
    async findByOriginatingApplicationId(applicationId) {
      return accounts.find((a) => a.originatingApplicationId === applicationId) ?? null;
    },
    async list() {
      return accounts;
    },
    async openWithAudit(data) {
      const account: LoanAccount = {
        id: crypto.randomUUID(),
        organizationId: data.organizationId,
        originatingApplicationId: data.originatingApplicationId,
        customerId: data.customerId,
        bankId: data.bankId,
        bankBranchId: data.bankBranchId ?? null,
        loanProductId: data.loanProductId,
        loanStatusId: data.loanStatusId,
        sanctionedAmount: data.sanctionedAmount,
        interestRateSnapshot: data.interestRateSnapshot,
        tenureMonthsSnapshot: data.tenureMonthsSnapshot,
        openedAt: new Date(),
        closedAt: null,
        supersededByLoanApplicationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      accounts.push(account);
      return account;
    },
    async closeWithAudit() {
      throw new Error("unused");
    },
    async findStatusByName(_org, name) {
      return name === "Active" ? { ...active, organizationId: _org } : null;
    },
    async listStatuses() {
      return [active];
    },
    async listAuditLog() {
      return [];
    },
  };
}

describe("loan accounts", () => {
  it("formats account numbers", () => {
    expect(formatAccountNumber("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe("LA-AAAAAAAABBBB");
  });

  it("opens an account once per application", async () => {
    const repo = fakeRepo();
    const open = makeOpenLoanAccount(repo);
    const org = crypto.randomUUID();
    const applicationId = crypto.randomUUID();
    const actor = { actorType: "USER" as const, actorId: crypto.randomUUID() };
    const first = await open({
      organizationId: org,
      input: {
        originatingApplicationId: applicationId,
        customerId: crypto.randomUUID(),
        bankId: crypto.randomUUID(),
        loanProductId: crypto.randomUUID(),
        sanctionedAmount: "100000",
        interestRateSnapshot: "10.5",
        tenureMonthsSnapshot: 36,
      },
      actor,
    });
    expect(first.isActive).toBe(true);
    await expect(
      open({
        organizationId: org,
        input: {
          originatingApplicationId: applicationId,
          customerId: first.customerId,
          bankId: first.bankId,
          loanProductId: first.loanProductId,
          sanctionedAmount: "100000",
          interestRateSnapshot: "10.5",
          tenureMonthsSnapshot: 36,
        },
        actor,
      }),
    ).rejects.toBeInstanceOf(LoanAccountAlreadyExistsError);
  });
});
