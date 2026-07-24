import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  LoanAccountRepository,
  OpenLoanAccountData,
} from "../../domain/repositories/LoanAccountRepository";
import type { LoanAccount } from "../../domain/entities/LoanAccount";
import type { LoanAccountsAuditActor, LoanAccountsAuditRecord } from "../../domain/entities/LoanAccountsAuditRecord";
import { toLoanAccount, toLoanAccountsAuditRecord, toLoanStatus } from "../mappers/loanAccountsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function auditJson(account: LoanAccount): Prisma.InputJsonValue {
  return {
    id: account.id,
    originatingApplicationId: account.originatingApplicationId,
    sanctionedAmount: account.sanctionedAmount,
    loanStatusId: account.loanStatusId,
    closedAt: account.closedAt?.toISOString() ?? null,
  };
}

export class PrismaLoanAccountRepository implements LoanAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    const row = await this.prisma.loanAccount.findUnique({ where: { id } });
    return row ? toLoanAccount(row) : null;
  }

  async findByOriginatingApplicationId(applicationId: string) {
    const row = await this.prisma.loanAccount.findUnique({
      where: { originatingApplicationId: applicationId },
    });
    return row ? toLoanAccount(row) : null;
  }

  async list(organizationId: string, filter?: { customerId?: string; bankId?: string; limit?: number; offset?: number }) {
    const rows = await this.prisma.loanAccount.findMany({
      where: {
        organizationId,
        ...(filter?.customerId ? { customerId: filter.customerId } : {}),
        ...(filter?.bankId ? { bankId: filter.bankId } : {}),
      },
      orderBy: { openedAt: "desc" },
      take: filter?.limit ?? 100,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toLoanAccount);
  }

  async openWithAudit(data: OpenLoanAccountData, actor: LoanAccountsAuditActor, correlationId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.loanAccount.create({
        data: {
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
        },
      });
      const account = toLoanAccount(row);
      await tx.loanAccountAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LoanAccountOpened",
          targetType: "LoanAccount",
          targetId: account.id,
          correlationId: correlationId ?? null,
          afterState: auditJson(account),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return account;
    });
  }

  async closeWithAudit(id: string, actor: LoanAccountsAuditActor, correlationId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.loanAccount.findUniqueOrThrow({ where: { id } });
      const before = toLoanAccount(beforeRow);
      const closed = await tx.loanStatus.findFirst({
        where: { organizationId: before.organizationId, name: "Closed", isActive: true },
      });
      if (!closed) throw new Error("Closed loan status missing");
      const row = await tx.loanAccount.update({
        where: { id },
        data: { loanStatusId: closed.id, closedAt: new Date() },
      });
      const account = toLoanAccount(row);
      await tx.loanAccountAuditLog.create({
        data: {
          organizationId: account.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LoanAccountClosed",
          targetType: "LoanAccount",
          targetId: account.id,
          correlationId: correlationId ?? null,
          beforeState: auditJson(before),
          afterState: auditJson(account),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return account;
    });
  }

  async findStatusByName(organizationId: string, name: string) {
    const row = await this.prisma.loanStatus.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    return row ? toLoanStatus(row) : null;
  }

  async listStatuses(organizationId: string) {
    const rows = await this.prisma.loanStatus.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toLoanStatus);
  }

  async listAuditLog(targetId: string): Promise<LoanAccountsAuditRecord[]> {
    const rows = await this.prisma.loanAccountAuditLog.findMany({
      where: { targetId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toLoanAccountsAuditRecord);
  }
}
